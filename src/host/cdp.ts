/**
 * Chrome DevTools Protocol client with a settlement guarantee.
 *
 * The renderer must never leave a promise pending. `@deepseek-ai/dsh-tool-call-timeout-policy`
 * aborts `exec.signal` when the tool budget elapses but still awaits the tool promise, so a
 * single unsettled CDP request turns a slow render into a permanently frozen tool call rather
 * than a `TOOL_TIMEOUT` error. Every {@link CdpClient.call} therefore settles on exactly one of:
 * a matching reply, a socket `close`, a socket `error`, an abort of the render signal, a refused
 * write, or its own deadline.
 *
 * @module
 */

/** Deadline for an ordinary protocol command; a healthy applet answers in milliseconds. */
export const CDP_CALL_TIMEOUT_MS = 30_000
/**
 * Deadline for `Browser.close`. Teardown is best-effort and must never outlive the render it
 * closes, so it gets a much shorter budget than a command whose result the caller needs.
 */
export const CDP_CLOSE_TIMEOUT_MS = 3_000

/** How one in-flight request is settled. */
interface RpcWaiter {
  resolve(value: unknown): void
  reject(error: Error): void
}

/** The subset of a CDP reply this client reads. */
interface RpcMessage {
  readonly id?: number
  readonly result?: unknown
  readonly error?: { readonly message?: string }
}

/**
 * The error every cancellation path reports. The caller's abort reason wins when it is an
 * `Error`, because a deadline signal carries a structured reason (for example `TOOL_TIMEOUT`)
 * that a caller can route on.
 *
 * @param reason - `AbortSignal.reason`, when available.
 * @returns the error to reject the pending work with.
 */
export function abortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason
  const error = new Error('GeoGebra rendering was cancelled')
  error.name = 'AbortError'
  return error
}

export class CdpClient {
  private nextId = 0
  private readonly pending = new Map<number, RpcWaiter>()
  /** Set once the connection is unusable; later calls fail immediately instead of hanging. */
  private failure: Error | undefined
  private readonly socket: WebSocket
  private readonly signal: AbortSignal
  private readonly onAbort: () => void

  private constructor(socket: WebSocket, signal: AbortSignal) {
    this.socket = socket
    this.signal = signal
    this.onAbort = (): void => { this.fail(abortError(signal.reason)) }
    socket.addEventListener('message', (event) => { this.receive(String(event.data)) })
    socket.addEventListener('close', () => { this.fail(new Error('Chrome DevTools connection closed')) })
    socket.addEventListener('error', () => { this.fail(new Error('Chrome DevTools connection failed')) })
    signal.addEventListener('abort', this.onAbort, { once: true })
  }

  /**
   * Wrap a socket that is already open. Split out from {@link CdpClient.connect} so the
   * settlement paths can be tested without launching Chrome.
   *
   * @param socket - an open DevTools WebSocket, or a stand-in with the same surface.
   * @param signal - the render signal; aborting it fails every in-flight and later call.
   * @returns the client bound to that socket.
   */
  static fromSocket(socket: WebSocket, signal: AbortSignal): CdpClient {
    return new CdpClient(socket, signal)
  }

  /**
   * Open a DevTools WebSocket and resolve once it is usable.
   *
   * @param url - the `webSocketDebuggerUrl` of a page target.
   * @param signal - the render signal; aborting it abandons the handshake.
   * @returns the connected client.
   */
  static async connect(url: string, signal: AbortSignal): Promise<CdpClient> {
    if (signal.aborted) throw abortError(signal.reason)
    const socket = new WebSocket(url)
    await new Promise<void>((resolve, reject) => {
      const settle = (action: () => void): void => {
        socket.removeEventListener('open', onOpen)
        socket.removeEventListener('error', onError)
        signal.removeEventListener('abort', onAbort)
        action()
      }
      const onOpen = (): void => { settle(resolve) }
      const onError = (): void => { settle(() => { reject(new Error('Could not connect to Chrome DevTools')) }) }
      const onAbort = (): void => {
        settle(() => {
          try { socket.close() } catch { /* the handshake socket is already gone */ }
          reject(abortError(signal.reason))
        })
      }
      socket.addEventListener('open', onOpen, { once: true })
      socket.addEventListener('error', onError, { once: true })
      signal.addEventListener('abort', onAbort, { once: true })
    })
    return new CdpClient(socket, signal)
  }

  /**
   * Send one command and settle when its reply arrives, the connection ends, the render is
   * cancelled, or `timeoutMs` elapses.
   *
   * @param method - CDP method name, for example `Runtime.evaluate`.
   * @param params - CDP parameters.
   * @param timeoutMs - deadline for this command only.
   * @returns the command result.
   */
  call<T>(method: string, params: Record<string, unknown> = {}, timeoutMs = CDP_CALL_TIMEOUT_MS): Promise<T> {
    if (this.failure !== undefined) return Promise.reject(this.failure)
    const id = ++this.nextId
    let timer: ReturnType<typeof setTimeout> | undefined
    const reply = new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Chrome DevTools call timed out after ${timeoutMs}ms: ${method}`))
      }, timeoutMs)
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value as T) },
        reject: (error) => { clearTimeout(timer); reject(error) },
      })
    })
    try {
      this.socket.send(JSON.stringify({ id, method, params }))
    } catch (error) {
      // A socket that refuses the write will never answer it; fail the request now instead of
      // waiting for a reply that cannot arrive.
      this.fail(error instanceof Error ? error : new Error(String(error)))
    }
    return reply
  }

  /**
   * Evaluate an expression in the page and return its value by value.
   *
   * @param expression - page expression; promises are awaited page-side.
   * @param timeoutMs - deadline for this evaluation.
   * @returns the evaluated value.
   */
  async evaluate<T>(expression: string, timeoutMs = CDP_CALL_TIMEOUT_MS): Promise<T> {
    const response = await this.call<{
      result: { value?: T }
      exceptionDetails?: { text?: string; exception?: { description?: string } }
    }>('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    }, timeoutMs)
    if (response.exceptionDetails !== undefined) {
      // The description carries the actual page error; text is often just "Uncaught".
      const description = response.exceptionDetails.exception?.description ?? response.exceptionDetails.text
      throw new Error(description ?? 'GeoGebra evaluation failed')
    }
    return response.result.value as T
  }

  /** Drop the abort listener and close the socket. Safe to call more than once. */
  close(): void {
    this.signal.removeEventListener('abort', this.onAbort)
    try { this.socket.close() } catch { /* already closed */ }
  }

  /** Reject every in-flight request and remember why later calls must fail immediately. */
  private fail(error: Error): void {
    this.failure ??= error
    const waiters = [...this.pending.values()]
    this.pending.clear()
    for (const waiter of waiters) waiter.reject(error)
  }

  /** Settle the request a reply belongs to; unrelated and malformed messages are ignored. */
  private receive(data: string): void {
    let message: RpcMessage
    try {
      message = JSON.parse(data) as RpcMessage
    } catch {
      return
    }
    if (typeof message.id !== 'number') return
    const waiter = this.pending.get(message.id)
    if (waiter === undefined) return
    this.pending.delete(message.id)
    if (message.error !== undefined) waiter.reject(new Error(message.error.message ?? 'Chrome DevTools error'))
    else waiter.resolve(message.result)
  }
}
