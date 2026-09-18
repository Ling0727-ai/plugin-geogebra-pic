import { writeFile } from 'node:fs/promises'

const debuggerPort = process.env.CDP_PORT ?? '9223'
const output = process.env.SCREENSHOT ?? 'live-test.png'
const targets = await fetch(`http://127.0.0.1:${debuggerPort}/json`).then(response => response.json())
const target = targets.find(candidate => candidate.type === 'page')
if (!target) throw new Error('No Chrome page target found')

const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let nextId = 0
const pending = new Map()
const consoleMessages = []
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.id !== undefined) {
    const waiter = pending.get(message.id)
    if (waiter) {
      pending.delete(message.id)
      if (message.error) waiter.reject(new Error(message.error.message))
      else waiter.resolve(message.result)
    }
  }
  if (message.method === 'Runtime.consoleAPICalled') {
    consoleMessages.push({
      type: message.params.type,
      text: message.params.args.map(argument => argument.value ?? argument.description ?? '').join(' '),
    })
  }
  if (message.method === 'Runtime.exceptionThrown') {
    consoleMessages.push({ type: 'exception', text: message.params.exceptionDetails.text })
  }
})

function command(method, params = {}) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function waitFor(expression, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evaluate(expression)
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  throw new Error(`Timed out waiting for: ${expression}`)
}

await command('Runtime.enable')
await command('Page.enable')
await command('Page.reload', { ignoreCache: true })
await new Promise(resolve => setTimeout(resolve, 1000))
await waitFor("document.readyState === 'complete'")
const hasAction = await evaluate("[...document.querySelectorAll('button')].some(button => (button.textContent || '').includes('几何画板') || button.title === '打开几何画板')")
if (!hasAction) {
  await evaluate(`(() => {
    const title = [...document.querySelectorAll('*')]
      .find(node => node.children.length === 0 && (node.textContent || '').includes('https://geogebra.github.io/docs/referenc'))
    const row = title?.closest('[role=treeitem]')
    if (!row) return false
    row.click()
    return true
  })()`)
}
await waitFor("[...document.querySelectorAll('button')].some(button => (button.textContent || '').includes('几何画板') || button.title === '打开几何画板')")

const before = await evaluate(`({
  title: document.title,
  geometryButtons: [...document.querySelectorAll('button')]
    .filter(button => (button.textContent || '').includes('几何画板') || (button.title || '').includes('几何画板'))
    .map(button => ({ text: button.textContent.trim(), title: button.title }))
})`)

await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')]
    .find(candidate => (candidate.textContent || '').includes('几何画板') || candidate.title === '打开几何画板')
  button.click()
  return true
})()`)

await waitFor("document.querySelector('[data-geogebra-workspace]') !== null")
await waitFor("document.querySelector('[data-geogebra-workspace] [data-status=ready]') !== null", 60000)

const inputInfo = await waitFor(`(() => {
  const root = document.querySelector('[data-geogebra-workspace]')
  const input = root && [...root.querySelectorAll('input')].find(candidate => (candidate.placeholder || '').includes('GeoGebra') || (candidate.placeholder || '').includes('输入命令'))
  return input ? { placeholder: input.placeholder } : null
})()`)

await evaluate(`(() => {
  const root = document.querySelector('[data-geogebra-workspace]')
  const input = [...root.querySelectorAll('input')].find(candidate => (candidate.placeholder || '').includes('GeoGebra') || (candidate.placeholder || '').includes('输入命令'))
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(input, 'f(x) = sin(x)')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.closest('form').requestSubmit()
  return true
})()`)

await waitFor(`(() => {
  const names = window.ggbApplet?.getAllObjectNames?.() || []
  return names.includes('f')
})()`, 15000)

const result = await evaluate(`(() => {
  const root = document.querySelector('[data-geogebra-workspace]')
  const rect = root.getBoundingClientRect()
  const canvas = root.querySelector('canvas')
  const canvasRect = canvas?.getBoundingClientRect()
  return {
    root: { width: Math.round(rect.width), height: Math.round(rect.height) },
    status: root.querySelector('[data-status]')?.getAttribute('data-status'),
    canvasCount: root.querySelectorAll('canvas').length,
    canvas: canvasRect ? { width: Math.round(canvasRect.width), height: Math.round(canvasRect.height) } : null,
    objectNames: window.ggbApplet?.getAllObjectNames?.() || [],
    commandValue: [...root.querySelectorAll('input')].find(candidate => (candidate.placeholder || '').includes('GeoGebra') || (candidate.placeholder || '').includes('输入命令'))?.value,
    visibleText: root.innerText.slice(0, 1200),
  }
})()`)

const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
await writeFile(output, Buffer.from(screenshot.data, 'base64'))

const failures = consoleMessages.filter(message => message.type === 'error' || message.type === 'exception')
console.log(JSON.stringify({ before, inputInfo, result, consoleFailures: failures, screenshot: output }, null, 2))
if (result.status !== 'ready' || result.canvasCount < 1 || !result.objectNames.includes('f') || result.root.width < 300 || result.root.height < 300) {
  process.exitCode = 1
}
socket.close()
