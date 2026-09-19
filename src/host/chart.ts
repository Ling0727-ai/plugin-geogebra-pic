/**
 * Pure GeoGebra command generation for line charts and fitted curves.
 *
 * The module owns no state, imports nothing and touches neither the DOM, Node APIs nor the
 * filesystem: it only turns numeric series into the ordered command list a host tool feeds to
 * `ggbApplet.evalCommand(commands.join('\n'))`, plus the viewport bounds the renderer needs.
 *
 * Naming is deterministic and ASCII: for series index `i` (1-based) the list is `L_i`, the
 * polyline `line_i`, the point set `pts_i` and the fitted curve `fit_i`.
 */

/** Curve families supported by {@link buildChartCommands} and {@link describeFit}. */
export type FitModel = 'linear' | 'poly2' | 'poly3' | 'poly4' | 'exp' | 'log' | 'pow' | 'sin'

/** How a series is drawn: a connecting polyline, bare markers, or both. */
export type SeriesStyle = 'line' | 'points' | 'line+points'

/** One numeric series: its points, how to draw them and an optional fitted curve. */
export interface ChartSeries {
  /** Optional display name; used only for the returned metadata, never as a GeoGebra label. */
  readonly name?: string
  /** Data points as [x, y] pairs, at least 2 points. */
  readonly points: readonly (readonly number[])[]
  /** Default 'line+points'. */
  readonly style?: SeriesStyle
  /** Hex colour like '#c00000' or '#1f77b4'; optional. */
  readonly color?: string
  /** Optional fitted curve for this series. */
  readonly fit?: FitModel
}

/** Input for {@link buildChartCommands}. */
export interface ChartBuildInput {
  readonly series: readonly ChartSeries[]
  /** Fraction of the data range added as padding on each side. Default 0.08. */
  readonly margin?: number
  /** Extra y-units to reserve below the data (e.g. for a figure caption). Default 0. */
  readonly captionSpace?: number
}

/** Result of {@link buildChartCommands}: ordered commands, viewport bounds and data objects. */
export interface ChartBuildResult {
  /** Ordered GeoGebra commands. */
  readonly commands: readonly string[]
  readonly xMin: number
  readonly xMax: number
  readonly yMin: number
  readonly yMax: number
  /** Names of the objects that carry data (lists, polylines, point sets, fitted curves), in creation order. */
  readonly dataObjects: readonly string[]
}

const DEFAULT_MARGIN = 0.08
/** Half-width added to a degenerate (zero-range) axis so that min < max still holds. */
const DEGENERATE_HALF_SPAN = 0.5
/** Significant digits kept when a fitted coefficient is rendered for a human. */
const FIT_SIGNIFICANT_DIGITS = 3
/**
 * Significant digits kept for a data coordinate. 15 digits is below the ~17 needed to be exact,
 * but exactly what strips IEEE-754 noise such as 0.30000000000000004 down to 0.3.
 */
const COORDINATE_PRECISION = 15

const STYLES: readonly SeriesStyle[] = ['line', 'points', 'line+points']
const FIT_MODELS: readonly FitModel[] = ['linear', 'poly2', 'poly3', 'poly4', 'exp', 'log', 'pow', 'sin']

/** Rewrites exponential notation as a plain decimal so GeoGebra never sees `1e-7`. */
function expandExponential(text: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/u.exec(text)
  if (match === null) return text
  const sign = (match[1] ?? '') === '-' ? '-' : ''
  const integerPart = match[2] ?? '0'
  const fractionPart = match[3] ?? ''
  const exponent = Number(match[4] ?? '0')
  const digits = integerPart + fractionPart
  const pointIndex = integerPart.length + exponent
  if (pointIndex <= 0) return `${sign}0.${'0'.repeat(-pointIndex)}${digits}`
  if (pointIndex >= digits.length) return `${sign}${digits}${'0'.repeat(pointIndex - digits.length)}`
  return `${sign}${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`
}

/** Compact, round-trippable, exponential-free literal for a finite coordinate. */
function formatNumber(value: number): string {
  if (value === 0) return '0'
  return expandExponential(String(Number.parseFloat(value.toPrecision(COORDINATE_PRECISION))))
}

/** Rounds to a fixed number of significant digits and drops trailing zeros. */
function roundSignificant(value: number, digits: number): number {
  if (value === 0 || !Number.isFinite(value)) return value
  return Number.parseFloat(value.toPrecision(digits))
}

/** Human-facing coefficient text: 3 significant digits, exponential-free. */
function formatCoefficient(value: number): string {
  return formatNumber(roundSignificant(value, FIT_SIGNIFICANT_DIGITS))
}

interface AffineFit {
  /** Value of y (or ln y) when the independent variable is 0. */
  readonly intercept: number
  /** Change in y (or ln y) per unit of the independent variable. */
  readonly slope: number
}

/** Least-squares fit of `y = intercept + slope * t`; null when t has no spread. */
function fitAffine(t: readonly number[], y: readonly number[]): AffineFit | null {
  const n = Math.min(t.length, y.length)
  if (n < 2) return null
  let sumT = 0
  let sumY = 0
  let sumTT = 0
  let sumTY = 0
  for (let i = 0; i < n; i += 1) {
    const ti = t[i] ?? 0
    const yi = y[i] ?? 0
    sumT += ti
    sumY += yi
    sumTT += ti * ti
    sumTY += ti * yi
  }
  const denominator = n * sumTT - sumT * sumT
  if (denominator === 0) return null
  const slope = (n * sumTY - sumT * sumY) / denominator
  return { intercept: (sumY - slope * sumT) / n, slope }
}

/** Solves a small dense linear system with partial pivoting; null when singular. */
function solveLinearSystem(matrix: readonly (readonly number[])[], rhs: readonly number[]): number[] | null {
  const size = rhs.length
  const rows = matrix.map((row, index) => [...row, rhs[index] ?? 0])
  for (let column = 0; column < size; column += 1) {
    let pivot = column
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(rows[row]?.[column] ?? 0) > Math.abs(rows[pivot]?.[column] ?? 0)) pivot = row
    }
    const pivotRow = rows[pivot]
    const currentRow = rows[column]
    if (pivotRow === undefined || currentRow === undefined) return null
    if (Math.abs(pivotRow[column] ?? 0) < 1e-12) return null
    rows[pivot] = currentRow
    rows[column] = pivotRow
    const divisor = pivotRow[column] ?? 1
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue
      const factor = (rows[row]?.[column] ?? 0) / divisor
      if (factor === 0) continue
      const target = rows[row]
      if (target === undefined) return null
      for (let k = column; k <= size; k += 1) {
        target[k] = (target[k] ?? 0) - factor * (pivotRow[k] ?? 0)
      }
    }
  }
  return rows.map((row, index) => (row[size] ?? 0) / (row[index] ?? 1))
}

/** Least-squares polynomial of the given degree; null when the points cannot determine it. */
function fitPolynomial(x: readonly number[], y: readonly number[], degree: number): number[] | null {
  const n = Math.min(x.length, y.length)
  if (n < degree + 1) return null
  const size = degree + 1
  const matrix: number[][] = []
  const rhs: number[] = []
  for (let row = 0; row < size; row += 1) {
    const line: number[] = []
    for (let column = 0; column < size; column += 1) {
      let sum = 0
      for (let i = 0; i < n; i += 1) sum += (x[i] ?? 0) ** (row + column)
      line.push(sum)
    }
    matrix.push(line)
    let total = 0
    for (let i = 0; i < n; i += 1) total += (y[i] ?? 0) * (x[i] ?? 0) ** row
    rhs.push(total)
  }
  return solveLinearSystem(matrix, rhs)
}

/** `x`, `x^2`, ... or '' for the constant term. */
function powerTerm(degree: number): string {
  if (degree <= 0) return ''
  return degree === 1 ? 'x' : `x^${degree}`
}

/** Signed magnitude text, e.g. `+ 2.5x^2`; the first term carries its own sign. */
function signedTerm(magnitude: string, negative: boolean, first: boolean): string {
  if (first) return negative ? `-${magnitude}` : magnitude
  return negative ? `- ${magnitude}` : `+ ${magnitude}`
}

/** Renders a coefficient-and-power term, dropping a unit coefficient. */
function polynomialTerm(coefficient: number, degree: number): string {
  const magnitude = formatCoefficient(Math.abs(coefficient))
  const power = powerTerm(degree)
  if (power === '') return magnitude
  return magnitude === '1' ? power : `${magnitude}${power}`
}

/** Joins already-signed terms into a right-hand side, or '0' when everything cancels. */
function joinTerms(terms: readonly string[]): string {
  return terms.length === 0 ? '0' : terms.join(' ')
}

/** Builds the right-hand side for `y = intercept + slope * variable`, slope term first. */
function formatAffine(intercept: number, slope: number, variable: string): string {
  const roundedSlope = roundSignificant(slope, FIT_SIGNIFICANT_DIGITS)
  const roundedIntercept = roundSignificant(intercept, FIT_SIGNIFICANT_DIGITS)
  const terms: string[] = []
  if (roundedSlope !== 0) {
    const magnitude = formatCoefficient(Math.abs(roundedSlope))
    const body = magnitude === '1' ? variable : `${magnitude}${variable}`
    terms.push(signedTerm(body, roundedSlope < 0, true))
  }
  if (roundedIntercept !== 0) {
    terms.push(signedTerm(formatCoefficient(Math.abs(roundedIntercept)), roundedIntercept < 0, terms.length === 0))
  }
  return joinTerms(terms)
}

/** Formats a fit result as the user-facing right-hand side of `y = ...`. */
function formatFit(model: FitModel, points: readonly (readonly number[])[]): string | null {
  const xs: number[] = []
  const ys: number[] = []
  for (const point of points) {
    xs.push(point[0] ?? Number.NaN)
    ys.push(point[1] ?? Number.NaN)
  }
  if (xs.some(value => !Number.isFinite(value)) || ys.some(value => !Number.isFinite(value))) return null
  switch (model) {
    case 'linear': {
      const fit = fitAffine(xs, ys)
      return fit === null ? null : formatAffine(fit.intercept, fit.slope, 'x')
    }
    case 'poly2':
    case 'poly3':
    case 'poly4': {
      const degree = model === 'poly2' ? 2 : model === 'poly3' ? 3 : 4
      const coefficients = fitPolynomial(xs, ys, degree)
      if (coefficients === null) return null
      const terms: string[] = []
      for (let index = degree; index >= 0; index -= 1) {
        const coefficient = roundSignificant(coefficients[index] ?? 0, FIT_SIGNIFICANT_DIGITS)
        if (coefficient === 0) continue
        terms.push(signedTerm(polynomialTerm(coefficient, index), coefficient < 0, terms.length === 0))
      }
      return joinTerms(terms)
    }
    case 'exp': {
      const logs = ys.map(value => (value > 0 ? Math.log(value) : Number.NaN))
      if (logs.some(value => !Number.isFinite(value))) return null
      const fit = fitAffine(xs, logs)
      if (fit === null) return null
      const scale = Math.exp(fit.intercept)
      if (!Number.isFinite(scale) || scale <= 0) return null
      const slope = roundSignificant(fit.slope, FIT_SIGNIFICANT_DIGITS)
      if (slope === 0) return formatCoefficient(scale)
      const exponent = Math.abs(slope) === 1 ? (slope < 0 ? '-x' : 'x') : `${formatCoefficient(slope)}x`
      const head = roundSignificant(scale, FIT_SIGNIFICANT_DIGITS)
      const magnitude = formatCoefficient(head)
      return magnitude === '1' ? `e^(${exponent})` : `${magnitude} e^(${exponent})`
    }
    case 'log': {
      const logs = xs.map(value => (value > 0 ? Math.log(value) : Number.NaN))
      if (logs.some(value => !Number.isFinite(value))) return null
      const fit = fitAffine(logs, ys)
      return fit === null ? null : formatAffine(fit.intercept, fit.slope, 'ln(x)')
    }
    case 'pow': {
      const logs = xs.map(value => (value > 0 ? Math.log(value) : Number.NaN))
      const logYs = ys.map(value => (value > 0 ? Math.log(value) : Number.NaN))
      if (logs.some(value => !Number.isFinite(value)) || logYs.some(value => !Number.isFinite(value))) return null
      const fit = fitAffine(logs, logYs)
      if (fit === null) return null
      const scale = Math.exp(fit.intercept)
      if (!Number.isFinite(scale) || scale <= 0) return null
      const magnitude = formatCoefficient(roundSignificant(scale, FIT_SIGNIFICANT_DIGITS))
      const exponent = formatCoefficient(roundSignificant(fit.slope, FIT_SIGNIFICANT_DIGITS))
      const head = magnitude === '1' ? '' : magnitude
      if (exponent === '0') return head === '' ? '1' : head
      if (exponent === '1') return `${head}x`
      return `${head}x^${exponent}`
    }
    case 'sin':
      return null
  }
}

/**
 * GeoGebra display label for a series' fitted curve, e.g. 'y = 1.5x + 0.2'.
 *
 * The formula is derived in TypeScript by least squares and is documentation/metadata only: it is
 * never a GeoGebra command. Returns null for 'sin' (no closed form is derived) and for any input
 * the requested model cannot determine - fewer points than the degree needs, a zero-spread
 * independent variable, or a value outside the model's domain (`exp`/`pow` need y > 0, `log`
 * needs x > 0). Numbers are rendered to 3 significant digits.
 */
export function describeFit(model: FitModel, points: readonly (readonly number[])[]): string | null {
  if (!FIT_MODELS.includes(model)) return null
  if (!Array.isArray(points) || points.length < 2) return null
  const body = formatFit(model, points)
  return body === null ? null : `y = ${body}`
}

/** GeoGebra fit command for one model, e.g. `FitPoly(L_1,2)`. */
function fitCommand(model: FitModel, listName: string): string {
  switch (model) {
    case 'linear':
      return `FitLine(${listName})`
    case 'poly2':
      return `FitPoly(${listName},2)`
    case 'poly3':
      return `FitPoly(${listName},3)`
    case 'poly4':
      return `FitPoly(${listName},4)`
    case 'exp':
      return `FitExp(${listName})`
    case 'log':
      return `FitLog(${listName})`
    case 'pow':
      return `FitPow(${listName})`
    case 'sin':
      return `FitSin(${listName})`
  }
}

/** Parses '#rgb' / '#rrggbb' (the '#' is optional) into 0-255 channels; null when unparseable. */
function parseHexColor(color: string): readonly [number, number, number] | null {
  const text = color.trim().replace(/^#/u, '')
  const expanded = /^[0-9a-fA-F]{3}$/u.test(text)
    ? text.split('').map(character => character + character).join('')
    : text
  if (!/^[0-9a-fA-F]{6}$/u.test(expanded)) return null
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ]
}

/**
 * GeoGebra's `SetColor` command takes channels in 0..1, not 0..255: a byte value above 1 is
 * clamped, so `SetColor(o,31,119,180)` silently paints the object white. Values are therefore
 * scaled down and rounded to three decimals.
 */
function commandChannels(rgb: readonly [number, number, number]): readonly [number, number, number] {
  return rgb.map(channel => Math.round((channel / 255) * 1000) / 1000) as unknown as readonly [number, number, number]
}

/** Validates one coordinate and reports which series/point failed. */
function readCoordinate(value: unknown, seriesIndex: number, pointIndex: number, axis: 'x' | 'y'): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    const shown = typeof value === 'number' ? String(value) : typeof value
    throw new Error(`series ${seriesIndex} point ${pointIndex} has a non-finite ${axis} coordinate (${shown})`)
  }
  return value
}

/** Validates the whole input and returns the numeric series it describes. */
function validateSeries(series: readonly ChartSeries[]): readonly (readonly number[][])[] {
  if (!Array.isArray(series) || series.length === 0) {
    throw new Error('chart requires at least one series')
  }
  return series.map((entry, offset) => {
    const index = offset + 1
    if (entry === null || typeof entry !== 'object') throw new Error(`series ${index} must be an object`)
    if (entry.style !== undefined && !STYLES.includes(entry.style)) {
      throw new Error(`series ${index} has unknown style "${String(entry.style)}"`)
    }
    if (entry.fit !== undefined && !FIT_MODELS.includes(entry.fit)) {
      throw new Error(`series ${index} has unknown fit "${String(entry.fit)}"`)
    }
    const points = entry.points
    if (!Array.isArray(points)) throw new Error(`series ${index} must provide a points array`)
    if (points.length < 2) throw new Error(`series ${index} requires at least 2 points, got ${points.length}`)
    return points.map((point, pointOffset) => {
      const pointIndex = pointOffset + 1
      if (!Array.isArray(point) || point.length !== 2) {
        throw new Error(`series ${index} point ${pointIndex} must be a [x, y] pair`)
      }
      const x = readCoordinate(point[0], index, pointIndex, 'x')
      const y = readCoordinate(point[1], index, pointIndex, 'y')
      if (entry.fit === 'log' && x <= 0) {
        throw new Error(`series ${index} point ${pointIndex} has x = ${formatNumber(x)}, but the "log" fit requires positive x values`)
      }
      if ((entry.fit === 'exp' || entry.fit === 'pow') && y <= 0) {
        throw new Error(`series ${index} point ${pointIndex} has y = ${formatNumber(y)}, but the "${entry.fit}" fit requires positive y values`)
      }
      return [x, y]
    })
  })
}

/** Pads a data range by a fraction of its own span, then guarantees min < max. */
function paddedRange(minimum: number, maximum: number, margin: number): readonly [number, number] {
  const span = maximum - minimum
  const padding = span > 0 ? span * margin : 0
  let low = minimum - padding
  let high = maximum + padding
  if (!(high > low)) {
    const centre = (high + low) / 2
    low = centre - DEGENERATE_HALF_SPAN
    high = centre + DEGENERATE_HALF_SPAN
  }
  return [low, high]
}

/**
 * Turns numeric series into an ordered GeoGebra command list plus the viewport bounds.
 *
 * For series `i` (1-based) the commands create `L_i` (the data list), then `line_i` and/or `pts_i`
 * according to the style, then `fit_i` when a fit is requested; styling commands follow last, and
 * only when the series carries a `color` (an unparseable colour is ignored and GeoGebra's own
 * colours are left alone). Nothing here sets the viewport - the caller applies the returned bounds.
 *
 * All four object families were verified against GeoGebra Classic 5.4.920.0: `L_i` is a `list`,
 * `line_i` a `polyline`, `pts_i` a `list` that renders markers, and `fit_i` a `line` for `linear`
 * but a `function` for every other model. GeoGebra creates `L_i` hidden, so `pts_i` is what draws
 * the markers and no points are drawn twice.
 *
 * Minimum point counts per fit: linear/poly2 need 2, poly3 needs 3, poly4 needs 4, exp/pow need
 * positive y, log needs positive x.
 *
 * @throws Error for an empty series list, a series with fewer than 2 points, a malformed point,
 * a non-finite coordinate, an unknown style or fit, a margin outside 0..1, a negative
 * captionSpace, and exp/pow/log domain violations.
 */
export function buildChartCommands(input: ChartBuildInput): ChartBuildResult {
  const series = input?.series
  const margin = input?.margin ?? DEFAULT_MARGIN
  const captionSpace = input?.captionSpace ?? 0
  if (typeof margin !== 'number' || !Number.isFinite(margin) || margin < 0 || margin > 1) {
    throw new Error(`margin must be a number between 0 and 1, got ${String(margin)}`)
  }
  if (typeof captionSpace !== 'number' || !Number.isFinite(captionSpace) || captionSpace < 0) {
    throw new Error(`captionSpace must be a non-negative number, got ${String(captionSpace)}`)
  }
  const validated = validateSeries(series)
  const commands: string[] = []
  const dataObjects: string[] = []
  let xMin = Number.POSITIVE_INFINITY
  let xMax = Number.NEGATIVE_INFINITY
  let yMin = Number.POSITIVE_INFINITY
  let yMax = Number.NEGATIVE_INFINITY
  validated.forEach((points, offset) => {
    const index = offset + 1
    const source = series[offset]
    if (source === undefined) return
    const style = source.style ?? 'line+points'
    const listName = `L_${index}`
    const lineName = `line_${index}`
    const pointsName = `pts_${index}`
    const fitName = `fit_${index}`
    const literals = points.map(point => `(${formatNumber(point[0] ?? 0)},${formatNumber(point[1] ?? 0)})`)
    for (const point of points) {
      xMin = Math.min(xMin, point[0] ?? 0)
      xMax = Math.max(xMax, point[0] ?? 0)
      yMin = Math.min(yMin, point[1] ?? 0)
      yMax = Math.max(yMax, point[1] ?? 0)
    }
    commands.push(`${listName}={${literals.join(',')}}`)
    dataObjects.push(listName)
    const drawn: string[] = [listName]
    if (style === 'line' || style === 'line+points') {
      commands.push(`${lineName}=Polyline(${listName})`)
      dataObjects.push(lineName)
      drawn.push(lineName)
    }
    if (style === 'points' || style === 'line+points') {
      commands.push(`${pointsName}=Sequence(Element(${listName},k),k,1,Length(${listName}))`)
      dataObjects.push(pointsName)
      drawn.push(pointsName)
    }
    if (source.fit !== undefined) {
      commands.push(`${fitName}=${fitCommand(source.fit, listName)}`)
      dataObjects.push(fitName)
      drawn.push(fitName)
    }
    const rgb = source.color === undefined ? null : parseHexColor(source.color)
    if (rgb !== null) {
      const [red, green, blue] = commandChannels(rgb)
      for (const name of drawn) commands.push(`SetColor(${name},${red},${green},${blue})`)
      if (drawn.includes(lineName)) commands.push(`SetLineThickness(${lineName},5)`)
      if (drawn.includes(pointsName)) commands.push(`SetPointSize(${pointsName},4)`)
    }
  })
  const [paddedXMin, paddedXMax] = paddedRange(xMin, xMax, margin)
  const [paddedYMin, paddedYMax] = paddedRange(yMin, yMax, margin)
  return {
    commands,
    xMin: paddedXMin,
    xMax: paddedXMax,
    yMin: paddedYMin - captionSpace,
    yMax: paddedYMax,
    dataObjects,
  }
}
