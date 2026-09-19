import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { strFromU8, unzipSync } from 'fflate'
import { apply } from '../lib/index.js'
import { clusterSvgTexts, parseSvgObstaclePoints, parseSvgTextNodes } from '../src/host/labels.ts'

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
    await assert.rejects(
      run(tool, { series: [{ points: [[0, 1]] }], basename: 'bad-chart', output_dir: '', chrome_path: '' }, cwd),
      /at least 2 points/u,
    )
    await assert.rejects(
      run(tool, { basename: 'neither', output_dir: '', chrome_path: '' }, cwd),
      /Provide either commands or series/u,
    )
    await assert.rejects(
      run(tool, { commands: ['f(x)=x'], series: [{ points: [[0, 1], [1, 2]] }], basename: 'both', output_dir: '', chrome_path: '' }, cwd),
      /not both/u,
    )
    // Either the parameter enum or the tool's own validation rejects it.
    await assert.rejects(
      run(tool, { commands: ['f(x)=x'], basename: 'labels', output_dir: '', chrome_path: '', label_placement: 'clever' }, cwd),
      /label_placement/u,
    )
    await assert.rejects(
      run(tool, { commands: ['f(x)=x'], basename: 'font', output_dir: '', chrome_path: '', label_font_px: 8 }, cwd),
      /label_font_px must be an integer from 12 to 48/u,
    )
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('axis labels, units, and the label font size reach the export', { timeout: 180_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-axis-label-'))
  try {
    const tool = collectPlugin().tools.get('geogebra_draw')
    assert.ok(tool)
    const value = await run(tool, {
      commands: ['f(x)=x^2/4'], basename: 'axis-labelled', formats: ['png', 'svg', 'ggb'], output_dir: '', chrome_path: '',
      width: 800, height: 600, x_min: -6, x_max: 6, y_min: -2, y_max: 8,
      axis_numbers: true, axis_step: 2, x_label: 't / s', y_label: 'v / (m/s)', x_unit: 's', y_unit: 'm/s',
      label_font_px: 20,
    }, cwd)
    assert.equal(value.labelFontPx, 20)
    const svg = await readFile(join(cwd, 'axis-labelled.svg'), 'utf8')
    assert.match(svg, /t \/ s/u)
    assert.match(svg, /v \/ \(m\/s\)/u)
    // A per-tick unit suffix is appended to every number, which is why axis labels are preferred.
    assert.match(svg, />2s</u)
    assert.match(svg, />2m\/s</u)
    const xml = strFromU8(unzipSync(await readFile(join(cwd, 'axis-labelled.ggb')))['geogebra.xml'])
    assert.match(xml, /<axis id="0"[^>]*label="t \/ s"[^>]*unitLabel="s"/u)
    assert.match(xml, /<axis id="1"[^>]*label="v \/ \(m\/s\)"[^>]*unitLabel="m\/s"/u)
    assert.match(xml, /<font size="20"\/>/u)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('smart label placement lifts labels off the geometry it would otherwise cross', { timeout: 300_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-labels-'))
  try {
    const tool = collectPlugin().tools.get('geogebra_draw')
    assert.ok(tool)
    const names = ['A', 'B', 'C', 'D', 'E', 's']
    // Every point sits on the line and the segment, so GeoGebra's own labels land on top of them.
    const commands = [
      'f(x)=x/2',
      'A=(-4,-2)', 'B=(-1,-0.5)', 'C=(0,0)', 'D=(2,1)', 'E=(4,2)',
      's=Segment(A,E)',
      'ShowLabel(A,true)', 'ShowLabel(B,true)', 'ShowLabel(C,true)', 'ShowLabel(D,true)', 'ShowLabel(E,true)', 'ShowLabel(s,true)',
      'SetColor(s,0.6,0.6,0.6)',
    ]
    const base = {
      commands, formats: ['svg'], output_dir: '', chrome_path: '',
      width: 800, height: 600, x_min: -6, x_max: 6, y_min: -4, y_max: 4,
    }
    const defaulted = await run(tool, { ...base, basename: 'labels-default', label_placement: 'default' }, cwd)
    const smart = await run(tool, { ...base, basename: 'labels-smart' }, cwd)

    const conflicts = svg => {
      const nodes = parseSvgTextNodes(svg)
      const clusters = clusterSvgTexts(nodes, nodes.map(node => node.content.length * node.size * 0.6))
      const obstacles = parseSvgObstaclePoints(svg)
      let total = 0
      for (const name of names) {
        const cluster = clusters.find(candidate => candidate.content.replace(/\s/gu, '').toLowerCase() === name.toLowerCase())
        assert.ok(cluster, `label ${name} must be rendered`)
        total += obstacles.filter(point => point.x >= cluster.box.left && point.x <= cluster.box.right
          && point.y >= cluster.box.top && point.y <= cluster.box.bottom).length
      }
      return total
    }

    const before = conflicts(await readFile(join(cwd, 'labels-default.svg'), 'utf8'))
    const after = conflicts(await readFile(join(cwd, 'labels-smart.svg'), 'utf8'))
    assert.ok(before > 0, `GeoGebra's own placement must actually overlap the line (got ${before})`)
    assert.equal(after, 0, `smart placement must clear the geometry (${before} -> ${after})`)

    // Style commands that create no object must not fail the call any more.
    assert.deepEqual(defaulted.objects, smart.objects.filter(object => !object.startsWith('dshLead')))
    assert.equal(smart.labelConflicts, 0)
    assert.ok(smart.labels.some(label => label.dx !== 0 || label.dy !== 0), 'labels must be reported as moved')
    assert.ok(smart.labels.every(label => label.conflictsBefore >= 0 && label.conflicts === 0))
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('coincident points get separated labels with leader lines', { timeout: 240_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-dense-'))
  try {
    const tool = collectPlugin().tools.get('geogebra_draw')
    assert.ok(tool)
    const value = await run(tool, {
      commands: [
        'c=Circle((0,0),2)',
        'A=Point(c)', 'B=Point(c)', 'C=Point(c)', 'D=Point(c)',
        'ShowLabel(A,true)', 'ShowLabel(B,true)', 'ShowLabel(C,true)', 'ShowLabel(D,true)',
      ],
      basename: 'dense', formats: ['png', 'svg'], output_dir: '', chrome_path: '',
      width: 800, height: 600, x_min: -3, x_max: 3, y_min: -2.2, y_max: 2.2,
    }, cwd)
    const offsets = value.labels.map(label => `${label.dx},${label.dy}`)
    assert.equal(new Set(offsets).size, offsets.length, `coincident labels must not share a position: ${offsets.join(' | ')}`)
    assert.equal(value.labelConflicts, 0)
    const leaders = value.objects.filter(object => /^dshLead_/u.test(object))
    assert.ok(leaders.length >= 1, `displaced labels need a leader line, got ${value.objects.join(', ')}`)
    const svg = await readFile(join(cwd, 'dense.svg'), 'utf8')
    assert.match(svg, /rgb\(140,140,140\)|rgb\(0\.55,0\.55,0\.55\)/u)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('series mode builds a chart with fits, annotations, and automatic bounds', { timeout: 240_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-chart-'))
  try {
    const tool = collectPlugin().tools.get('geogebra_draw')
    assert.ok(tool)
    const value = await run(tool, {
      series: [
        { name: 'run 1', points: [[0, 0], [1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8]], fit: 'linear' },
        { name: 'run 2', points: [[0, 0.2], [1, 1.1], [2, 1.9], [3, 3.2], [4, 4.1]], style: 'points', fit: 'poly2' },
      ],
      x_label: 't / s', y_label: 'v / (m/s)',
      title: '匀加速直线运动', caption: '图 1 速度随时间的变化',
      axis_numbers: true, axis_step: 1, label_font_px: 18,
      basename: 'chart', formats: ['png', 'svg', 'ggb'], output_dir: '', chrome_path: '',
    }, cwd)
    for (const name of ['L_1', 'line_1', 'pts_1', 'fit_1', 'L_2', 'pts_2', 'fit_2', 'dshTitle', 'dshCaption']) {
      assert.ok(value.objects.includes(name), `${name} must exist, got ${value.objects.join(', ')}`)
    }
    assert.equal(value.labelFontPx, 18)
    assert.ok(value.view.xMin < 0 && value.view.xMax > 4, JSON.stringify(value.view))
    assert.ok(value.view.yMax > 7.8, JSON.stringify(value.view))
    // The caption band is reserved below the data.
    assert.ok(value.view.yMin < 0, JSON.stringify(value.view))
    const svg = await readFile(join(cwd, 'chart.svg'), 'utf8')
    for (const needle of ['t / s', 'v / (m/s)', '匀加速直线运动', '图 1 速度随时间的变化']) {
      assert.ok(svg.includes(needle), `chart must contain "${needle}"`)
    }
    // Series colours are scaled into the 0..1 range GeoGebra's SetColor command expects.
    const xml = strFromU8(unzipSync(await readFile(join(cwd, 'chart.ggb')))['geogebra.xml'])
    assert.match(xml, /<element type="polyline" label="line_1">/u)
    assert.match(xml, /<element type="function" label="fit_2">/u)
    // sizeM is a multiple of the GUI font, so a 24 px title at label_font_px 18 must persist as
    // 24/18 and still render at 24 px; a hard-coded /16 multiplier used to break this combination.
    assert.match(xml, /<font size="18"\/>/u)
    const gui = Number(/<font size="(\d+)"\/>/u.exec(xml)?.[1])
    for (const [label, pixels] of [['dshTitle', 24], ['dshCaption', 16]]) {
      const element = new RegExp(`<element type="text" label="${label}">[\\s\\S]*?</element>`, 'u').exec(xml)?.[0]
      assert.ok(element, `${label} must be persisted`)
      const sizeM = /<font[^>]*sizeM="([\d.]+)"/u.exec(element)?.[1]
      const effective = sizeM === undefined ? gui : Number(sizeM) * gui
      assert.ok(Math.abs(effective - pixels) < 0.51, `${label} must render at ${pixels} px, got ${effective}`)
    }
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('a genuinely bad command still fails the whole call', { timeout: 120_000 }, async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'geogebra-tool-bad-'))
  try {
    const tool = collectPlugin().tools.get('geogebra_draw')
    assert.ok(tool)
    await assert.rejects(
      run(tool, { commands: ['A=(0,0)', 'NotACommand(1,2)'], basename: 'bad', formats: ['png'], output_dir: '', chrome_path: '' }, cwd),
      /GeoGebra rejected 1 command\(s\): NotACommand\(1,2\)/u,
    )
    await assert.rejects(
      run(tool, { commands: ['A=(0,0)', 'B=('], basename: 'bad2', formats: ['png'], output_dir: '', chrome_path: '' }, cwd),
      /GeoGebra rejected 1 command\(s\): B=\(/u,
    )
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
