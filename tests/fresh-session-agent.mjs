import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

const port = process.env.CDP_PORT ?? '9225'
const screenshot = process.env.SCREENSHOT ?? 'fresh-session-agent.png'
const prompt = '请先加载 geogebra-pic skill，然后必须调用 geogebra_draw（不要使用 pwsh、浏览器自动化或临时脚本）画一条焦点 F=(0,2)、准线 y=-2 的抛物线，并标出焦点和准线。basename 使用 fresh-session-parabola，导出 png、svg、ggb，最后调用 present 交付三个文件。'
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
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
  return response.result.value
}
async function waitFor(expression, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evaluate(expression)
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${expression}`)
}
await command('Runtime.enable')
await command('Page.enable')
await waitFor("document.querySelector('[data-composer-input=true]') !== null")
const needsWorkspace = await evaluate("[...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === '选择工作区' && !button.textContent.includes('geogebra-pic'))")
if (needsWorkspace) {
  await evaluate(`(() => {
    const selector = [...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === '选择工作区')
    selector?.click(); return Boolean(selector)
  })()`)
  await waitFor("[...document.querySelectorAll('[role=option],[role=menuitem],button')].some(node => node.textContent?.trim() === 'geogebra-pic')")
  await evaluate(`(() => {
    const choice = [...document.querySelectorAll('[role=option],[role=menuitem],button')]
      .find(node => node.textContent?.trim() === 'geogebra-pic')
    choice?.click(); return Boolean(choice)
  })()`)
  await waitFor("[...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === '选择工作区' && button.textContent.includes('geogebra-pic'))")
}
const existingDraft = await evaluate("document.querySelector('[data-composer-input=true]').innerText")
if (!existingDraft.includes('geogebra_draw')) {
  await evaluate("document.querySelector('[data-composer-input=true]').focus(); true")
  await command('Input.insertText', { text: prompt })
  await waitFor("document.querySelector('[data-composer-input=true]').innerText.includes('geogebra_draw')")
}
const sendPoint = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === '发送消息')
  const rect = button.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
})()`)
await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: sendPoint.x, y: sendPoint.y, button: 'left', clickCount: 1 })
await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: sendPoint.x, y: sendPoint.y, button: 'left', clickCount: 1 })
await waitFor("document.querySelector('[data-composer-input=true]').innerText.trim().length === 0", 10_000)
await waitFor("document.body.innerText.includes('fresh-session-parabola.ggb')", 240_000)
await waitFor("[...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === '发送消息')", 240_000)
await new Promise(resolve => setTimeout(resolve, 1000))
const state = await evaluate(`({
  title: document.title,
  text: document.body.innerText.slice(-8000),
  hasSkillCall: document.body.innerText.includes('geogebra-pic'),
  hasDrawCall: document.body.innerText.includes('geogebra_draw') || document.body.innerText.includes('Draw with GeoGebra'),
  hasPresented: document.body.innerText.includes('fresh-session-parabola.ggb'),
})`)
const image = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
await writeFile(screenshot, Buffer.from(image.data, 'base64'))
const expected = ['fresh-session-parabola.png', 'fresh-session-parabola.svg', 'fresh-session-parabola.ggb']
const files = Object.fromEntries(expected.map(name => [name, existsSync(name)]))
console.log(JSON.stringify({ state, files, screenshot }, null, 2))
if (!state.hasSkillCall || !state.hasDrawCall || !state.hasPresented || Object.values(files).some(value => !value)) process.exitCode = 1
socket.close()
