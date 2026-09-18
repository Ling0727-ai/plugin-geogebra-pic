const port = process.env.CDP_PORT ?? '9223'
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
  if (!api) throw new Error('GeoGebra API unavailable')
  const svg = await new Promise(resolve => api.exportSVG(resolve))
  const ggb = await new Promise(resolve => api.getBase64(resolve))
  const png = api.getPNGBase64(1, false, 96)
  return {
    svgStartsWithTag: /^\\s*<svg[\\s>]/i.test(svg),
    svgLength: svg.length,
    svgHasPath: /<(path|polyline|line|circle|ellipse)\\b/i.test(svg),
    ggbBase64Length: ggb.length,
    pngBase64Length: png.length,
    objects: api.getAllObjectNames(),
  }
})()`
const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
console.log(JSON.stringify(response.result.value, null, 2))
const value = response.result.value
if (!value.svgStartsWithTag || !value.svgHasPath || value.ggbBase64Length < 100 || value.pngBase64Length < 100) process.exitCode = 1
socket.close()
