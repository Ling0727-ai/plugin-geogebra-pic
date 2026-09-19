import assert from 'node:assert/strict'
import test from 'node:test'
import { buildChartCommands, describeFit } from '../src/host/chart.ts'

test('buildChartCommands names objects deterministically and orders commands', () => {
  const result = buildChartCommands({ series: [{ points: [[0, 1], [1, 3], [2, 2]], fit: 'linear' }] })
  assert.deepEqual(result.commands, [
    'L_1={(0,1),(1,3),(2,2)}',
    'line_1=Polyline(L_1)',
    'pts_1=Sequence(Element(L_1,k),k,1,Length(L_1))',
    'fit_1=FitLine(L_1)',
  ])
  assert.deepEqual(result.dataObjects, ['L_1', 'line_1', 'pts_1', 'fit_1'])
})

test('buildChartCommands honours style and fit families', () => {
  const points = [[0, 1], [1, 4], [2, 9], [3, 16]]
  const lineOnly = buildChartCommands({ series: [{ points, style: 'line' }] })
  assert.ok(lineOnly.commands.includes('line_1=Polyline(L_1)'))
  assert.ok(!lineOnly.commands.some(command => command.startsWith('pts_1=')))

  const pointsOnly = buildChartCommands({ series: [{ points, style: 'points' }] })
  assert.ok(pointsOnly.commands.some(command => command.startsWith('pts_1=')))
  assert.ok(!pointsOnly.commands.some(command => command.startsWith('line_1=')))

  const families = [
    ['poly2', 'FitPoly(L_1,2)'], ['poly3', 'FitPoly(L_1,3)'], ['poly4', 'FitPoly(L_1,4)'],
    ['exp', 'FitExp(L_1)'], ['log', 'FitLog(L_1)'], ['pow', 'FitPow(L_1)'], ['sin', 'FitSin(L_1)'],
  ]
  const domainSafe = {
    poly2: points, poly3: points, poly4: points,
    exp: [[0, 1], [1, 2], [2, 4]], log: [[1, 0], [2, 1], [3, 2]], pow: [[1, 1], [2, 4], [3, 9]],
    sin: [[0, 0], [1, 1], [2, 0]],
  }
  for (const [model, expected] of families) {
    const built = buildChartCommands({ series: [{ points: domainSafe[model], fit: model }] })
    assert.ok(built.commands.includes(`fit_1=${expected}`), `${model} must emit ${expected}`)
  }
})

test('buildChartCommands styles each series it was given a colour for', () => {
  const result = buildChartCommands({
    series: [
      { points: [[0, 1], [1, 2]], color: '#c00000', fit: 'linear' },
      { points: [[0, 3], [1, 4]], color: '#0a0' },
    ],
  })
  assert.ok(result.commands.includes('SetColor(line_1,0.753,0,0)'))
  assert.ok(result.commands.includes('SetColor(pts_1,0.753,0,0)'))
  assert.ok(result.commands.includes('SetColor(fit_1,0.753,0,0)'))
  assert.ok(result.commands.includes('SetLineThickness(line_1,5)'))
  assert.ok(result.commands.includes('SetPointSize(pts_1,4)'))
  assert.ok(result.commands.includes('SetColor(line_2,0,0.667,0)'))
  // The hidden source list is coloured as well, so showing it later in the editor stays consistent.
  assert.ok(result.commands.includes('SetColor(L_1,0.753,0,0)'))
})

test('buildChartCommands scales colours into the 0..1 range GeoGebra commands expect', () => {
  // SetColor clamps values above 1, so 0..255 bytes would paint every object white.
  const result = buildChartCommands({ series: [{ points: [[0, 1], [1, 2]], color: '#1f77b4' }] })
  assert.ok(result.commands.includes('SetColor(line_1,0.122,0.467,0.706)'))
  for (const command of result.commands.filter(entry => entry.startsWith('SetColor'))) {
    for (const channel of command.replace(/^SetColor\([^,]+,/u, '').replace(/\)$/u, '').split(',')) {
      const value = Number(channel)
      assert.ok(value >= 0 && value <= 1, `${command} must stay within 0..1`)
    }
  }
})

test('buildChartCommands leaves colours alone when none is requested', () => {
  const result = buildChartCommands({ series: [{ points: [[0, 1], [1, 2]] }] })
  assert.ok(!result.commands.some(command => command.startsWith('SetColor')))
})

test('buildChartCommands pads the data range and reserves caption space', () => {
  const plain = buildChartCommands({ series: [{ points: [[0, 0], [10, 20]] }] })
  assert.equal(plain.xMin, -0.8)
  assert.equal(plain.xMax, 10.8)
  assert.equal(plain.yMin, -1.6)
  assert.equal(plain.yMax, 21.6)

  const withMargin = buildChartCommands({ series: [{ points: [[0, 0], [10, 20]] }], margin: 0.5 })
  assert.equal(withMargin.xMin, -5)
  assert.equal(withMargin.xMax, 15)

  const withCaption = buildChartCommands({ series: [{ points: [[0, 0], [10, 20]] }], captionSpace: 3 })
  assert.equal(withCaption.yMin, -4.6)
  assert.equal(withCaption.yMax, 21.6)
})

test('buildChartCommands expands a degenerate range so min < max always holds', () => {
  const vertical = buildChartCommands({ series: [{ points: [[2, 0], [2, 5]] }] })
  assert.ok(vertical.xMin < vertical.xMax, `${vertical.xMin} < ${vertical.xMax}`)
  assert.equal(vertical.xMin, 1.5)
  assert.equal(vertical.xMax, 2.5)

  const single = buildChartCommands({ series: [{ points: [[3, 3], [3, 3]] }] })
  assert.ok(single.xMin < single.xMax && single.yMin < single.yMax)
  for (const value of [single.xMin, single.xMax, single.yMin, single.yMax]) assert.ok(Number.isFinite(value))
})

test('buildChartCommands writes compact exponential-free coordinates', () => {
  const result = buildChartCommands({ series: [{ points: [[0.1 + 0.2, 1e-7], [1e21, 2.5e-9]] }] })
  assert.equal(result.commands[0], 'L_1={(0.3,0.0000001),(1000000000000000000000,0.0000000025)}')
})

test('buildChartCommands rejects malformed input with a pointed message', () => {
  assert.throws(() => buildChartCommands({ series: [] }), /at least one series/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, 1]] }] }), /at least 2 points/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, 1], [1, Number.NaN]] }] }), /non-finite y coordinate/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, 1], [Number.POSITIVE_INFINITY, 2]] }] }), /non-finite x coordinate/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, 1], [1, 2, 3]] }] }), /must be a \[x, y\] pair/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, 1], [1, 2]], style: 'dots' }] }), /unknown style/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, 1], [1, 2]], fit: 'gauss' }] }), /unknown fit/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, 1], [1, 2]] }], margin: 2 }), /margin must be/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, 1], [1, 2]] }], captionSpace: -1 }), /captionSpace must be/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[-1, 1], [2, 4]], fit: 'log' }] }), /requires positive x/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, -1], [1, 4]], fit: 'exp' }] }), /requires positive y/u)
  assert.throws(() => buildChartCommands({ series: [{ points: [[0, 1], [1, -4]], fit: 'pow' }] }), /requires positive y/u)
})

test('describeFit derives a readable formula by least squares', () => {
  assert.equal(describeFit('linear', [[0, 1], [1, 3], [2, 5]]), 'y = 2x + 1')
  assert.equal(describeFit('linear', [[0, 2], [1, 4], [2, 6]]), 'y = 2x + 2')
  assert.equal(describeFit('poly2', [[0, 1], [1, 4], [2, 9], [3, 16]]), 'y = x^2 + 2x + 1')
  assert.match(String(describeFit('exp', [[0, 1], [1, Math.E], [2, Math.E ** 2]])), /^y = .*e\^\(x\)$/u)
  assert.equal(describeFit('sin', [[0, 0], [1, 1], [2, 0]]), null)
  assert.equal(describeFit('linear', [[1, 5], [1, 9]]), null)
  assert.equal(describeFit('poly3', [[0, 1], [1, 2]]), null)
  assert.equal(describeFit('exp', [[0, -1], [1, 2]]), null)
})
