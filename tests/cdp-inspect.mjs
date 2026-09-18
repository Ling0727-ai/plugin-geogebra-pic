const port = process.env.CDP_PORT ?? '9223'
const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json())
const target = targets.find(candidate => candidate.type === 'page')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let id = 0
const pending = new Map()
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.id === undefined) return
  const waiter = pending.get(message.id)
  if (!waiter) return
  pending.delete(message.id)
  waiter.resolve(message.result)
})
function command(method, params = {}) {
  const requestId = ++id
  socket.send(JSON.stringify({ id: requestId, method, params }))
  return new Promise(resolve => pending.set(requestId, { resolve }))
}
const expression = `({
  title: document.title,
  text: document.body.innerText.slice(0, 5000),
  buttons: [...document.querySelectorAll('button')].map((button, index) => ({ index, text: button.innerText, title: button.title, aria: button.getAttribute('aria-label'), disabled: button.disabled, html: button.getAttribute('aria-label') === '发送消息' ? button.outerHTML.slice(0, 700) : undefined })),
  pluginStyles: [...document.querySelectorAll('style[data-plugin]')].map(style => style.dataset.plugin),
  scripts: [...document.scripts].map(script => script.src).filter(Boolean),
  sessionMatches: [...document.querySelectorAll('*')]
    .filter(node => node.children.length === 0 && (node.textContent || '').includes('https://geogebra.github.io/docs/referenc'))
    .map(node => ({ tag: node.tagName, role: node.getAttribute('role'), html: node.parentElement?.outerHTML.slice(0, 1000) })),
  editables: [...document.querySelectorAll('textarea,input,[contenteditable=true]')]
    .map(node => ({ tag: node.tagName, placeholder: node.getAttribute('placeholder'), aria: node.getAttribute('aria-label'), role: node.getAttribute('role'), html: node.outerHTML.slice(0, 500) })),
  workspaceMatches: [...document.querySelectorAll('*')]
    .filter(node => node.children.length === 0 && node.textContent?.trim() === 'geogebra-pic')
    .map(node => ({ tag: node.tagName, html: node.parentElement?.parentElement?.outerHTML.slice(0, 1500) })),
  url: location.href,
})`
const result = await command('Runtime.evaluate', { expression, returnByValue: true })
console.log(JSON.stringify(result.result.value, null, 2))
socket.close()
