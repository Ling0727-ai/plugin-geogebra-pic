import { writeFile } from 'node:fs/promises'

const port = process.env.CDP_PORT ?? '9223'
const screenshotPath = process.env.SCREENSHOT ?? 'conic-ellipse.png'
const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json())
const target = targets.find(candidate => candidate.type === 'page')
if (!target) throw new Error('No Chrome page target')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let nextId = 0
const pending = new Map()
const failures = []
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
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    failures.push(message.params.args.map(argument => argument.value ?? argument.description ?? '').join(' '))
  }
  if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.text)
})
function command(method, params = {}) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
  return response.result.value
}
async function waitFor(expression, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evaluate(expression)
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  throw new Error(`Timed out waiting for ${expression}`)
}

await command('Runtime.enable')
await command('Page.enable')
await waitFor("document.readyState === 'complete'")
const hasAction = await evaluate("[...document.querySelectorAll('button')].some(button => button.title === '打开几何画板')")
if (!hasAction) {
  await evaluate(`(() => {
    const node = [...document.querySelectorAll('*')].find(item => item.children.length === 0 && (item.textContent || '').includes('https://geogebra.github.io/docs/referenc'))
    node?.closest('[role=treeitem]')?.click()
    return true
  })()`)
}
await waitFor("[...document.querySelectorAll('button')].some(button => button.title === '打开几何画板')")
await evaluate("[...document.querySelectorAll('button')].find(button => button.title === '打开几何画板').click()")
await waitFor("document.querySelector('[data-geogebra-workspace] [data-status=ready]') !== null")

const construction = await evaluate(`(() => {
  const api = window.ggbApplet
  api.newConstruction()
  const ok = api.evalCommand([
    'F_1 = (-3, 0)',
    'F_2 = (3, 0)',
    'c = Ellipse(F_1, F_2, 5)',
    'A = (0, 4)',
    's_1 = Segment(A, F_1)',
    's_2 = Segment(A, F_2)',
    'd_1 = Distance(A, F_1)',
    'd_2 = Distance(A, F_2)',
    'sum = d_1 + d_2',
    'note = Text("AF₁ + AF₂ = " + sum, (-5.6, 3.45))'
  ].join('\\n'))
  api.setCoordSystem(-6, 6, -4, 4)
  api.setColor('c', 25, 135, 120)
  api.setLineThickness('c', 7)
  api.setColor('F_1', 234, 88, 12)
  api.setColor('F_2', 234, 88, 12)
  api.setColor('A', 37, 99, 235)
  api.setPointSize('F_1', 6)
  api.setPointSize('F_2', 6)
  api.setPointSize('A', 7)
  api.setColor('s_1', 37, 99, 235)
  api.setColor('s_2', 37, 99, 235)
  api.setLineStyle('s_1', 1)
  api.setLineStyle('s_2', 1)
  api.setLineThickness('s_1', 4)
  api.setLineThickness('s_2', 4)
  api.setLabelVisible('F_1', true)
  api.setLabelVisible('F_2', true)
  api.setLabelVisible('A', true)
  api.setLabelVisible('c', false)
  api.setVisible('d_1', false)
  api.setVisible('d_2', false)
  api.setVisible('sum', false)
  api.setUndoPoint()
  return { ok, objects: api.getAllObjectNames(), sum: api.getValue('sum') }
})()`)
await new Promise(resolve => setTimeout(resolve, 1500))
const view = await evaluate(`(() => {
  const root = document.querySelector('[data-geogebra-workspace]')
  const canvas = root.querySelector('canvas')
  const rect = canvas.getBoundingClientRect()
  return { status: root.querySelector('[data-status]')?.dataset.status, canvas: { width: Math.round(rect.width), height: Math.round(rect.height) } }
})()`)
const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
await writeFile(screenshotPath, Buffer.from(shot.data, 'base64'))
console.log(JSON.stringify({ construction, view, consoleFailures: failures, screenshot: screenshotPath }, null, 2))
if (construction.ok === false || Math.abs(construction.sum - 10) > 1e-8 || !construction.objects.includes('c') || failures.length > 0) process.exitCode = 1
socket.close()
