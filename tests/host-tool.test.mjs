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

function pngMetadata(buffer) {
  let offset = 8
  let dpi
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    if (type === 'pHYs' && buffer.readUInt8(offset + 16) === 1) dpi = Math.round(buffer.readUInt32BE(offset + 8) * 0.0254)
    if (type === 'IEND') break
    offset += 12 + length
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), dpi }
}

function textCount(svg) {
  return (svg.match(/<text/g) ?? []).length
}

function run(tool, args, cwd) {
  return tool.execute(args, {
    signal: new AbortController().signal,
    agent: { session: { header: { cwd } } },
    callId: 'test', name: 'geogebra_draw', arguments: {}, token: {},
  })
}

test('geogebra_draw exports the requested display size and embed metadata', { timeout: 180_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-test-'))
  try {
    const plugin = collectPlugin()
    const skill = plugin.skills.get('geogebra-pic')
    assert.ok(skill)
    assert.match(skill.content, /geogebra_draw/)
    const tool = plugin.tools.get('geogebra_draw')
    assert.ok(tool)
    const value = await run(tool, {
      commands: [
        'F_1=(-3,0)', 'F_2=(3,0)', 'c=Ellipse(F_1,F_2,5)',
        'formula=Text("x^{2}/25+y^{2}/16=1",(-5,4),false,true)',
        'caption=Text("point P on the ellipse",(-5,-3))',
        'SetFontSize(formula,24)',
        'SetFontSize(caption,16)',
      ],
      basename: 'ellipse-tool-test', formats: ['png', 'svg', 'ggb'], output_dir: '', chrome_path: '',
      x_min: -6, x_max: 6, y_min: -4, y_max: 4,
    }, cwd)
    assert.deepEqual(value.objects, ['F_1', 'F_2', 'c', 'formula', 'caption'])
    assert.equal(value.files.length, 3)
    assert.deepEqual(value.display, { width: 800, height: 600 })
    assert.deepEqual(value.png, { width: 800, height: 600, dpi: 96 })
    assert.equal(value.minFontPx, 16)
    assert.equal(value.minLegibleWidth, 600)
    const svg = await readFile(join(cwd, 'ellipse-tool-test.svg'), 'utf8')
    assert.match(svg, /^\s*<svg[\s>]/i)
    assert.match(svg, /viewBox="0 0 800 600"/u)
    assert.match(svg, /width="800" height="600"/u)
    assert.equal(pngMetadata(await readFile(join(cwd, 'ellipse-tool-test.png'))).width, 800)
    const ggb = await readFile(join(cwd, 'ellipse-tool-test.ggb'))
    const xml = strFromU8(unzipSync(ggb)['geogebra.xml'])
    assert.match(xml, /<element type="text" label="formula">[\s\S]*?<font serif="false" sizeM="1\.5"/u)
    // GeoGebra omits <font> at the default 16 px, so the GGB must be patched to persist it.
    assert.match(xml, /<element type="text" label="caption">[\s\S]*?<font serif="false" sizeM="1"/u)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('geogebra_draw scales the raster while keeping the embed size', { timeout: 180_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-scale-'))
  try {
    const tool = collectPlugin().tools.get('geogebra_draw')
    assert.ok(tool)
    const value = await run(tool, {
      commands: ['f(x)=x^2/4'],
      basename: 'parabola', formats: ['png', 'svg'], output_dir: '', chrome_path: '',
      width: 1200, height: 800, png_scale: 2, x_min: -6, x_max: 6, y_min: -2, y_max: 8,
    }, cwd)
    assert.deepEqual(value.display, { width: 1200, height: 800 })
    assert.deepEqual(value.png, { width: 2400, height: 1600, dpi: 192 })
    const png = pngMetadata(await readFile(join(cwd, 'parabola.png')))
    assert.deepEqual({ width: png.width, height: png.height, dpi: png.dpi }, { width: 2400, height: 1600, dpi: 192 })
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('axis tick numbers stay off by default and return with a coarser interval', { timeout: 240_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-axis-'))
  try {
    const tool = collectPlugin().tools.get('geogebra_draw')
    assert.ok(tool)
    const base = {
      commands: ['f(x)=x^2/4'], formats: ['svg'], output_dir: '', chrome_path: '',
      width: 800, height: 600, x_min: -6, x_max: 6, y_min: -2, y_max: 8,
    }
    const hidden = await run(tool, { ...base, basename: 'axis-hidden' }, cwd)
    assert.equal(textCount(await readFile(join(cwd, 'axis-hidden.svg'), 'utf8')), 0)
    const shown = await run(tool, { ...base, basename: 'axis-shown', axis_numbers: true }, cwd)
    const shownCount = textCount(await readFile(join(cwd, 'axis-shown.svg'), 'utf8'))
    assert.ok(shownCount > 0, 'enabling axis_numbers must draw tick numbers')
    const coarse = await run(tool, { ...base, basename: 'axis-coarse', axis_numbers: true, axis_step: 5 }, cwd)
    const coarseCount = textCount(await readFile(join(cwd, 'axis-coarse.svg'), 'utf8'))
    assert.ok(coarseCount < shownCount, `axis_step 5 must reduce labels (${coarseCount} < ${shownCount})`)
    assert.ok(shown.files.length === 1 && coarse.files.length === 1)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('geogebra_draw rejects text below the embed floor and invalid figure options', { timeout: 60_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-reject-'))
  try {
    const tool = collectPlugin().tools.get('geogebra_draw')
    assert.ok(tool)
    await assert.rejects(
      run(tool, {
        commands: ['formula=Text("x^{2}",(0,0))', 'SetFontSize(formula,10)'],
        basename: 'tiny', formats: ['png'], output_dir: '', chrome_path: '',
      }, cwd),
      /SetFontSize requires a text label and a pixel size from 12 to 48/u,
    )
    await assert.rejects(
      run(tool, { commands: ['f(x)=x'], basename: 'bad', output_dir: '', chrome_path: '', axis_step: 0 }, cwd),
      /axis_step must be a positive number up to 1000/u,
    )
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
