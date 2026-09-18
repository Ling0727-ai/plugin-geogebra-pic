import { writeFile } from 'node:fs/promises'

const port = process.env.CDP_PORT ?? '9223'
const prefix = process.env.OUTPUT_PREFIX ?? 'conic-ellipse'
const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json())
const target = targets.find(candidate => candidate.type === 'page')
if (!target) throw new Error('No page target')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let nextId = 0
const pending = new Map()
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.id === undefined) return
  const waiter = pending.get(message.id)
  if (!waiter) return
  pending.delete(message.id)
  if (message.error) waiter.reject(new Error(message.error.message))
  else waiter.resolve(message.result)
})
function command(method, params = {}) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}
const expression = `(async () => {
  const api = window.ggbApplet
  const svg = await new Promise(resolve => api.exportSVG(resolve))
  const ggb = await new Promise(resolve => api.getBase64(resolve))
  const png = api.getPNGBase64(2, false, 180)
  return { svg, ggb, png, objects: api.getAllObjectNames() }
})()`
const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
const { svg, ggb, png, objects } = response.result.value
await Promise.all([
  writeFile(`${prefix}.svg`, svg, 'utf8'),
  writeFile(`${prefix}.ggb`, Buffer.from(ggb, 'base64')),
  writeFile(`${prefix}-export.png`, Buffer.from(png, 'base64')),
])
console.log(JSON.stringify({ objects, svgBytes: Buffer.byteLength(svg), ggbBytes: Buffer.from(ggb, 'base64').length, pngBytes: Buffer.from(png, 'base64').length }, null, 2))
socket.close()
