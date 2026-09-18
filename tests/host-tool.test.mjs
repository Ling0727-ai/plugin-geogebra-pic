import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { strFromU8, unzipSync } from 'fflate'
import { apply } from '../lib/index.js'

function collectPlugin() {
  const tools = new Map()
  const skills = new Map()
  apply({
    tools: { register(definition) { tools.set(definition.name, definition); return () => {} } },
    skills: { register(definition) { skills.set(definition.name, definition); return () => {} } },
  })
  return { tools, skills }
}

test('geogebra_draw renders PNG SVG and editable GGB without a UI tab', { timeout: 120_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-test-'))
  try {
    const plugin = collectPlugin()
    const skill = plugin.skills.get('geogebra-pic')
    assert.ok(skill)
    assert.match(skill.content, /geogebra_draw/)
    const tool = plugin.tools.get('geogebra_draw')
    assert.ok(tool)
    const controller = new AbortController()
    const value = await tool.execute({
      commands: [
        'F_1=(-3,0)', 'F_2=(3,0)', 'c=Ellipse(F_1,F_2,5)',
        'formula=Text("x^{2}/25+y^{2}/16=1",(-5,4),false,true)',
        'SetFontSize(formula,24)',
      ],
      basename: 'ellipse-tool-test', formats: ['png', 'svg', 'ggb'], output_dir: '', chrome_path: '',
      x_min: -6, x_max: 6, y_min: -4, y_max: 4,
    }, {
      signal: controller.signal,
      agent: { session: { header: { cwd } } },
      callId: 'test', name: 'geogebra_draw', arguments: {}, token: {},
    })
    assert.deepEqual(value.objects, ['F_1', 'F_2', 'c', 'formula'])
    assert.equal(value.files.length, 3)
    const svg = await readFile(join(cwd, 'ellipse-tool-test.svg'), 'utf8')
    assert.match(svg, /^\s*<svg[\s>]/i)
    assert.ok((await readFile(join(cwd, 'ellipse-tool-test.png'))).length > 1_000)
    const ggb = await readFile(join(cwd, 'ellipse-tool-test.ggb'))
    assert.ok(ggb.length > 1_000)
    const xml = strFromU8(unzipSync(ggb)['geogebra.xml'])
    assert.match(xml, /<element type="text" label="formula">[\s\S]*?<font serif="false" sizeM="1\.5"/u)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
