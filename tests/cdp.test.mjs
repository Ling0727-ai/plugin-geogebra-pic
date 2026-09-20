/**
 * Regression coverage for the CDP settlement guarantee.
 *
 * The renderer runs under `@deepseek-ai/dsh-tool-call-timeout-policy`, which aborts `exec.signal`
 * at the tool budget but still awaits the tool promise. A CDP request that never settles therefore
 * freezes the tool call permanently instead of reporting `TOOL_TIMEOUT` — the "plugin hangs"
 * report. These tests use a stand-in socket so every settlement path is exercised in milliseconds.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { CdpClient, CDP_CALL_TIMEOUT_MS, CDP_CLOSE_TIMEOUT_MS, abortError } from '../src/host/cdp.ts'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** A WebSocket stand-in that records writes and can be torn down on demand. */
function fakeSocket() {
  const listeners = new Map()
  const sent = []
  const socket = {
    sent,
    refuse: false,
    send(data) {
      if (socket.refuse) throw new Error('socket is closed')
      sent.push(JSON.parse(data))
    },
    close() { socket.emit('close', {}) },
    addEventListener(type, listener) {
      const bucket = listeners.get(type) ?? []
      bucket.push(listener)
      listeners.set(type, bucket)
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) ?? []).filter(entry => entry !== listener))
    },
    emit(type, event = {}) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event)
    },
  }
  return socket
}

/** Settle-or-fail-fast helper: a promise that never settles reports `hung` instead of stalling. */
async function outcome(promise, watchdogMs = 1_000) {
  return Promise.race([
    promise.then(value => ({ state: 'resolved', value }), error => ({ state: 'rejected', error })),
    sleep(watchdogMs).then(() => ({ state: 'hung' })),
  ])
}

function client(socket, signal = new AbortController().signal) {
  return CdpClient.fromSocket(socket, signal)
}

test('resolves the reply that matches the request id', async () => {
  const socket = fakeSocket()
  const call = client(socket).call('Runtime.evaluate')
  assert.equal(socket.sent.length, 1)
  assert.equal(socket.sent[0].method, 'Runtime.evaluate')
  socket.emit('message', { data: JSON.stringify({ id: socket.sent[0].id, result: { value: 42 } }) })
  assert.deepEqual(await call, { value: 42 })
})

test('ignores malformed frames and replies to unknown ids', async () => {
  const socket = fakeSocket()
  const call = client(socket).call('Page.enable')
  socket.emit('message', { data: 'not json' })
  socket.emit('message', { data: JSON.stringify({ method: 'Page.loadEventFired' }) })
  socket.emit('message', { data: JSON.stringify({ id: 9_999, result: {} }) })
  assert.deepEqual(await outcome(call, 50), { state: 'hung' })
  socket.emit('message', { data: JSON.stringify({ id: socket.sent[0].id, result: { ok: true } }) })
  assert.deepEqual(await call, { ok: true })
})

test('rejects an in-flight call when the socket closes', async () => {
  const socket = fakeSocket()
  const call = client(socket).call('Runtime.evaluate')
  socket.emit('close', {})
  const settled = await outcome(call)
  assert.equal(settled.state, 'rejected')
  assert.match(settled.error.message, /connection closed/u)
})

test('rejects an in-flight call when the socket errors', async () => {
  const socket = fakeSocket()
  const call = client(socket).call('Runtime.evaluate')
  socket.emit('error', {})
  const settled = await outcome(call)
  assert.equal(settled.state, 'rejected')
  assert.match(settled.error.message, /connection failed/u)
})

test('rejects an in-flight call when the render signal aborts', async () => {
  const controller = new AbortController()
  const socket = fakeSocket()
  const call = client(socket, controller.signal).call('Runtime.evaluate')
  controller.abort()
  const settled = await outcome(call)
  assert.equal(settled.state, 'rejected')
  assert.equal(settled.error.name, 'AbortError')
})

test('reports the abort reason when the signal carries one', async () => {
  const controller = new AbortController()
  const reason = new Error('tool call timed out after 120000ms')
  const socket = fakeSocket()
  const call = client(socket, controller.signal).call('Runtime.evaluate')
  controller.abort(reason)
  const settled = await outcome(call)
  assert.equal(settled.state, 'rejected')
  assert.equal(settled.error, reason)
})

test('fails later calls immediately once the connection is gone', async () => {
  const socket = fakeSocket()
  const cdp = client(socket)
  socket.emit('close', {})
  const settled = await outcome(cdp.call('Runtime.evaluate'))
  assert.equal(settled.state, 'rejected')
  assert.match(settled.error.message, /connection closed/u)
  assert.equal(socket.sent.length, 0, 'a dead connection must not receive new commands')
})

test('times a call out instead of waiting forever', async () => {
  const socket = fakeSocket()
  const settled = await outcome(client(socket).call('Runtime.evaluate', {}, 40))
  assert.equal(settled.state, 'rejected')
  assert.match(settled.error.message, /timed out after 40ms: Runtime\.evaluate/u)
})

test('rejects the call when the socket refuses the write', async () => {
  const socket = fakeSocket()
  socket.refuse = true
  const settled = await outcome(client(socket).call('Runtime.evaluate'))
  assert.equal(settled.state, 'rejected')
  assert.match(settled.error.message, /socket is closed/u)
})

test('rejects on a page exception from evaluate', async () => {
  const socket = fakeSocket()
  const cdp = client(socket)
  const call = cdp.evaluate('window.__dsh.run([])')
  socket.emit('message', {
    data: JSON.stringify({
      id: socket.sent[0].id,
      result: { exceptionDetails: { text: 'Uncaught', exception: { description: 'Error: GeoGebra rejected A=(0,0)' } } },
    }),
  })
  const settled = await outcome(call)
  assert.equal(settled.state, 'rejected')
  assert.match(settled.error.message, /GeoGebra rejected A=\(0,0\)/u)
})

test('rejects on a protocol error from evaluate', async () => {
  const socket = fakeSocket()
  const call = client(socket).evaluate('1 + 1')
  socket.emit('message', { data: JSON.stringify({ id: socket.sent[0].id, error: { message: 'Cannot find context' } }) })
  const settled = await outcome(call)
  assert.equal(settled.state, 'rejected')
  assert.match(settled.error.message, /Cannot find context/u)
})

test('removes its abort listener when closed', async () => {
  const controller = new AbortController()
  const socket = fakeSocket()
  const cdp = client(socket, controller.signal)
  cdp.close()
  controller.abort()
  assert.equal(socket.sent.length, 0)
})

test('keeps teardown well inside the tool-call budget', () => {
  assert.ok(CDP_CLOSE_TIMEOUT_MS <= 5_000, 'Browser.close must be best-effort, not a second budget')
  assert.ok(CDP_CALL_TIMEOUT_MS < 120_000, 'a single command must not be able to consume the whole tool budget')
})

test('abortError falls back to an AbortError without a reason', () => {
  const error = abortError(undefined)
  assert.equal(error.name, 'AbortError')
  assert.match(error.message, /cancelled/u)
})
