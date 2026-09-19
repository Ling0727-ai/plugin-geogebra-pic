/**
 * Collision-aware label placement for exported GeoGebra figures.
 *
 * GeoGebra draws automatic point/segment labels at a fixed offset from their object, so a label
 * regularly sits on top of a curve, an axis, or a neighbouring label. The Apps API exposes no
 * label-offset call, but the `<labelOffset x y>` construction property is a pixel delta applied to
 * the default position, which `evalXML` accepts.
 *
 * This module is deliberately pure: it parses the exported SVG and decides offsets. The renderer
 * only measures text (canvas `measureText`) and applies the result, which keeps the interesting
 * logic unit-testable without a browser.
 */

export interface SvgTextNode {
  readonly content: string
  readonly x: number
  readonly y: number
  readonly size: number
}

export interface Point {
  readonly x: number
  readonly y: number
}

export interface Box {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

/** A text run in the SVG together with its measured width. */
export interface TextCluster {
  readonly content: string
  readonly x: number
  readonly y: number
  readonly size: number
  readonly width: number
  readonly box: Box
}

/** One automatic label that the renderer wants to place. */
export interface LabelRequest {
  readonly name: string
  readonly text: string
  readonly fontPx: number
  /** Screen position of the labelled object itself, in px. */
  readonly anchorX: number
  readonly anchorY: number
}

export interface LabelPlacement {
  readonly name: string
  /** Pixel delta to hand to `<labelOffset>`. */
  readonly dx: number
  readonly dy: number
  /** True when the label was moved far enough that it needs a leader line. */
  readonly displaced: boolean
  /** Obstacle hits that remain at the chosen position; 0 means a clean placement. */
  readonly conflicts: number
  /** Remaining conflicts when the label was left untouched, for diagnostics. */
  readonly conflictsBefore: number
  readonly box: Box
  /** Endpoint of the leader line on the label side, when the label is displaced. */
  readonly leader: Point
}

export interface LayoutOptions {
  readonly labels: readonly LabelRequest[]
  readonly clusters: readonly TextCluster[]
  readonly obstacles: readonly Point[]
  /** Boxes of text that is not an automatic label: axis numbers, axis labels, authored text. */
  readonly reservedBoxes: readonly Box[]
  readonly frame: { readonly width: number; readonly height: number; readonly inset?: number }
  /** Required clearance between a label box and any obstacle, in px. */
  readonly clearance?: number
  /** Displacement beyond which a leader line is drawn, in px. */
  readonly leaderThreshold?: number
  /** Radius around the anchor whose obstacles belong to the label's own marker. */
  readonly ownRadius?: number
}

export interface LayoutResult {
  readonly placements: readonly LabelPlacement[]
  /** Total obstacle conflicts that remain after placement. */
  readonly conflicts: number
}

const DEFAULT_CLEARANCE = 2
const DEFAULT_LEADER_THRESHOLD = 14
const DEFAULT_OWN_RADIUS = 7
/** Label box geometry relative to the text anchor (baseline, left edge). */
const ASCENT_RATIO = 0.8
const DESCENT_RATIO = 0.3
const GRID_CELL = 12

function textBox(x: number, y: number, size: number, width: number): Box {
  return { left: x, top: y - size * ASCENT_RATIO, right: x + width, bottom: y + size * DESCENT_RATIO }
}

function boxHeight(fontPx: number): number {
  return fontPx * (ASCENT_RATIO + DESCENT_RATIO)
}

function decodeEntities(value: string): string {
  return value
    .replace(/<[^>]*>/gu, '')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&nbsp;/gu, ' ')
    .replace(/&#(\d+);/gu, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/gu, '&')
    .trim()
}

/**
 * Text nodes of an exported SVG. GeoGebra splits a subscripted label such as `P_1` into a base
 * run and a smaller run, so callers must cluster the result before matching it to an object.
 */
export function parseSvgTextNodes(svg: string): SvgTextNode[] {
  const nodes: SvgTextNode[] = []
  for (const match of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gu)) {
    const attributes = match[1] ?? ''
    const content = decodeEntities(match[2] ?? '')
    const x = Number(/(?:^|\s)x="([-\d.]+)"/u.exec(attributes)?.[1])
    const y = Number(/(?:^|\s)y="([-\d.]+)"/u.exec(attributes)?.[1])
    const size = Number(/font-size="([\d.]+)px"/u.exec(attributes)?.[1])
    if (content.length === 0 || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size)) continue
    nodes.push({ content, x, y, size })
  }
  return nodes
}

/** Parameter count of each SVG path command, used to walk `d` data without mis-pairing numbers. */
const PATH_ARITY: Readonly<Record<string, number>> = {
  m: 2, l: 2, t: 2, h: 1, v: 1, c: 6, s: 4, q: 4, a: 7, z: 0,
}

/**
 * Sample the drawn geometry of an exported SVG into a point cloud. GeoGebra emits every curve,
 * axis, and point marker as a `<path>`, so the cloud is a complete obstacle set for clearance
 * checks. The `<defs>` block holds the clip rectangle and is skipped.
 */
export function parseSvgObstaclePoints(svg: string): Point[] {
  const withoutDefs = svg.replace(/<defs\b[\s\S]*?<\/defs>/gu, '')
  const points: Point[] = []
  for (const match of withoutDefs.matchAll(/<path\b[^>]*\bd="([^"]*)"/gu)) {
    const data = match[1] ?? ''
    const tokens = data.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gu)
    if (tokens === null) continue
    let index = 0
    let command = 'm'
    let cursor: Point = { x: 0, y: 0 }
    let start: Point = { x: 0, y: 0 }
    const emit = (point: Point): void => { points.push(point); cursor = point }
    while (index < tokens.length) {
      const token = tokens[index] ?? ''
      if (/[a-zA-Z]/u.test(token)) {
        command = token
        index += 1
        if (command.toLowerCase() === 'z') { cursor = start; continue }
      }
      const arity = PATH_ARITY[command.toLowerCase()]
      if (arity === undefined) break
      const values: number[] = []
      for (let step = 0; step < arity && index < tokens.length; step += 1) {
        const value = Number(tokens[index])
        if (!Number.isFinite(value)) break
        values.push(value)
        index += 1
      }
      if (values.length < arity) break
      const lower = command.toLowerCase()
      const relative = command === lower
      const base = relative ? cursor : { x: 0, y: 0 }
      if (lower === 'h') emit({ x: base.x + (values[0] ?? 0), y: cursor.y })
      else if (lower === 'v') emit({ x: cursor.x, y: base.y + (values[0] ?? 0) })
      else if (lower === 'c' || lower === 's' || lower === 'q' || lower === 'a') {
        // Control points are conservative extra obstacles; only the endpoint is a vertex.
        for (let step = 0; step + 1 < values.length; step += 2) {
          points.push({ x: base.x + (values[step] ?? 0), y: base.y + (values[step + 1] ?? 0) })
        }
        const endX = base.x + (values[values.length - 2] ?? 0)
        const endY = base.y + (values[values.length - 1] ?? 0)
        emit({ x: endX, y: endY })
        if (lower === 'a') emit({ x: endX, y: endY })
      } else {
        emit({ x: base.x + (values[0] ?? 0), y: base.y + (values[1] ?? 0) })
        if (lower === 'm') start = cursor
      }
    }
  }
  return points
}

/** Group adjacent text runs (a base run plus its subscript) into one visual label. */
export function clusterSvgTexts(nodes: readonly SvgTextNode[], widths: readonly number[]): TextCluster[] {
  const entries = nodes.map((node, index) => ({
    node,
    width: widths[index] ?? Math.max(node.size, node.content.length * node.size * 0.55),
  }))
  const clusters: Array<{ parts: typeof entries; box: Box }> = []
  for (const entry of entries) {
    const box = textBox(entry.node.x, entry.node.y, entry.node.size, entry.width)
    const host = clusters.find(candidate => {
      const verticalOverlap = Math.min(candidate.box.bottom, box.bottom) - Math.max(candidate.box.top, box.top)
      if (verticalOverlap <= 0) return false
      const gap = Math.max(candidate.box.left, box.left) - Math.min(candidate.box.right, box.right)
      if (gap > Math.max(candidate.box.bottom - candidate.box.top, box.bottom - box.top) * 0.6) return false
      // Only a smaller run (a subscript such as the `1` of `P_1`) joins its base run. Two runs of
      // equal size are separate labels even when they overlap, which is the dense-point case where
      // several objects sit on top of each other and each still needs its own label.
      const sizes = candidate.parts.map(part => part.node.size).concat(entry.node.size)
      return Math.min(...sizes) <= Math.max(...sizes) * 0.85
    })
    if (host === undefined) {
      clusters.push({ parts: [entry], box })
      continue
    }
    host.parts.push(entry)
    host.box = {
      left: Math.min(host.box.left, box.left),
      top: Math.min(host.box.top, box.top),
      right: Math.max(host.box.right, box.right),
      bottom: Math.max(host.box.bottom, box.bottom),
    }
  }
  return clusters.map(cluster => {
    const ordered = [...cluster.parts].sort((a, b) => a.node.x - b.node.x || b.node.size - a.node.size)
    const base = ordered[0] ?? cluster.parts[0]
    if (base === undefined) throw new Error('empty text cluster')
    return {
      content: ordered.map(part => part.node.content).join(''),
      x: base.node.x,
      y: base.node.y,
      size: base.node.size,
      width: cluster.box.right - cluster.box.left,
      box: cluster.box,
    }
  })
}

/** Normalize a label for comparison: GeoGebra renders `P_1` as `P` + subscript `1`. */
export function normalizeLabelText(value: string): string {
  return value
    .replace(/[\s_]/gu, '')
    .replace(/[\u2012-\u2015\u2212]/gu, '-')
    .replace(/[()]/gu, '')
    .toLowerCase()
}

interface MatchedLabel {
  readonly request: LabelRequest
  readonly cluster: TextCluster
}

/**
 * A label rendered as several equally sized runs that were not merged into one cluster (for example
 * a long caption-mode string). Returns the runs whose concatenation equals the wanted text.
 */
function findTextSequence(clusters: readonly TextCluster[], wanted: string): TextCluster[] | null {
  const ordered = [...clusters].sort((a, b) => a.x - b.x || a.y - b.y)
  for (let start = 0; start < ordered.length; start += 1) {
    let text = ''
    const picked: TextCluster[] = []
    for (let index = start; index < ordered.length; index += 1) {
      const cluster = ordered[index]
      if (cluster === undefined) break
      const previous = picked[picked.length - 1]
      if (previous !== undefined) {
        const gap = cluster.box.left - previous.box.right
        const tolerance = Math.max(cluster.size, previous.size) * 0.6
        if (gap > tolerance || Math.abs(cluster.y - previous.y) > tolerance) break
      }
      picked.push(cluster)
      text += normalizeLabelText(cluster.content)
      if (text === wanted) return picked
      if (!wanted.startsWith(text)) break
    }
  }
  return null
}

/** Union of several runs, presented as one label for the layout. */
function mergeClusters(clusters: readonly TextCluster[]): TextCluster {
  const first = clusters[0]
  if (first === undefined) throw new Error('cannot merge an empty run list')
  const box = clusters.reduce<Box>((union, cluster) => ({
    left: Math.min(union.left, cluster.box.left),
    top: Math.min(union.top, cluster.box.top),
    right: Math.max(union.right, cluster.box.right),
    bottom: Math.max(union.bottom, cluster.box.bottom),
  }), first.box)
  return {
    content: clusters.map(cluster => cluster.content).join(''),
    x: first.x,
    y: first.y,
    size: first.size,
    width: box.right - box.left,
    box,
  }
}

/**
 * Pair each requested label with its rendered text run: prefer an exact text match (as one run or
 * as a sequence of adjacent runs), then fall back to the run closest to the object. Labels with no
 * plausible run are left alone.
 */
export function matchLabels(
  labels: readonly LabelRequest[],
  clusters: readonly TextCluster[],
): { matched: MatchedLabel[]; unmatched: LabelRequest[] } {
  const taken = new Set<TextCluster>()
  const matched: MatchedLabel[] = []
  const unmatched: LabelRequest[] = []
  for (const request of labels) {
    const wanted = normalizeLabelText(request.text)
    const candidates = clusters.filter(cluster => !taken.has(cluster))
    const distance = (cluster: TextCluster): number => Math.hypot(cluster.x - request.anchorX, cluster.y - request.anchorY)
    const exact = candidates
      .filter(cluster => normalizeLabelText(cluster.content) === wanted)
      .sort((a, b) => distance(a) - distance(b))[0]
    let cluster = exact
    if (cluster === undefined) {
      const sequence = findTextSequence(candidates, wanted)
      if (sequence !== null) {
        cluster = mergeClusters(sequence)
        for (const part of sequence) taken.add(part)
      }
    }
    if (cluster === undefined) {
      cluster = candidates
        .filter(candidate => distance(candidate) <= 48 + request.fontPx * 2)
        .sort((a, b) => distance(a) - distance(b))[0]
    }
    if (cluster === undefined) {
      unmatched.push(request)
      continue
    }
    taken.add(cluster)
    matched.push({ request, cluster })
  }
  return { matched, unmatched }
}

class ObstacleGrid {
  private readonly cells = new Map<string, Point[]>()
  constructor(points: readonly Point[]) {
    for (const point of points) {
      const key = `${Math.floor(point.x / GRID_CELL)}:${Math.floor(point.y / GRID_CELL)}`
      const bucket = this.cells.get(key)
      if (bucket === undefined) this.cells.set(key, [point])
      else bucket.push(point)
    }
  }

  /** Number of obstacle points inside the box expanded by `clearance` on every side. */
  count(box: Box, clearance: number): number {
    const left = Math.floor((box.left - clearance) / GRID_CELL)
    const right = Math.floor((box.right + clearance) / GRID_CELL)
    const top = Math.floor((box.top - clearance) / GRID_CELL)
    const bottom = Math.floor((box.bottom + clearance) / GRID_CELL)
    let hits = 0
    for (let cellX = left; cellX <= right; cellX += 1) {
      for (let cellY = top; cellY <= bottom; cellY += 1) {
        const bucket = this.cells.get(`${cellX}:${cellY}`)
        if (bucket === undefined) continue
        for (const point of bucket) {
          if (point.x >= box.left - clearance && point.x <= box.right + clearance
            && point.y >= box.top - clearance && point.y <= box.bottom + clearance) hits += 1
        }
      }
    }
    return hits
  }
}

function overlaps(a: Box, b: Box, pad = 0): boolean {
  return a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad
}

function intersectionArea(a: Box, b: Box): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return width > 0 && height > 0 ? width * height : 0
}

function translate(box: Box, dx: number, dy: number): Box {
  return { left: box.left + dx, top: box.top + dy, right: box.right + dx, bottom: box.bottom + dy }
}

/** Candidate translations: the default position first, then a ring of directions at growing radii. */
function candidateOffsets(fontPx: number): Array<{ dx: number; dy: number }> {
  const offsets: Array<{ dx: number; dy: number }> = [{ dx: 0, dy: 0 }]
  const radii = [fontPx * 0.75, fontPx * 1.5, fontPx * 2.5, fontPx * 4]
  for (const radius of radii) {
    const step = Math.round(radius)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]] as const) {
      offsets.push({ dx: dx * step, dy: dy * step })
    }
  }
  return offsets
}

/**
 * Choose a collision-free pixel offset for every label. Placement is greedy, most-constrained
 * label first, and later labels treat earlier labels' boxes as obstacles so two labels never
 * overlap.
 */
export function placeLabels(options: LayoutOptions): LayoutResult {
  const clearance = options.clearance ?? DEFAULT_CLEARANCE
  const leaderThreshold = options.leaderThreshold ?? DEFAULT_LEADER_THRESHOLD
  const ownRadius = options.ownRadius ?? DEFAULT_OWN_RADIUS
  const inset = options.frame.inset ?? 2
  const frame: Box = {
    left: inset, top: inset, right: options.frame.width - inset, bottom: options.frame.height - inset,
  }
  const { matched, unmatched } = matchLabels(options.labels, options.clusters)
  // Text that is not one of the labels being placed (axis numbers, axis labels, authored Text
  // objects, and labels of objects this engine cannot anchor) still has to stay clear.
  const matchedClusters = new Set(matched.map(entry => entry.cluster))
  const reserved: Box[] = [
    ...options.reservedBoxes,
    ...options.clusters.filter(cluster => !matchedClusters.has(cluster)).map(cluster => cluster.box),
  ]

  interface Pending {
    readonly request: LabelRequest
    readonly cluster: TextCluster
    readonly box: Box
    readonly own: ObstacleGrid
    readonly conflictsBefore: number
  }

  const pending: Pending[] = matched.map(({ request, cluster }) => {
    const box = textBox(cluster.x, cluster.y, request.fontPx, cluster.width)
    const ownPoints = options.obstacles.filter(point =>
      Math.hypot(point.x - request.anchorX, point.y - request.anchorY) > ownRadius)
    const own = new ObstacleGrid(ownPoints)
    return { request, cluster, box, own, conflictsBefore: own.count(box, clearance) }
  })
  pending.sort((a, b) => b.conflictsBefore - a.conflictsBefore)

  const placements: LabelPlacement[] = []
  const occupied: Box[] = []
  let remaining = 0

  const score = (candidate: Pending, dx: number, dy: number): { penalty: number; hits: number } => {
    const box = translate(candidate.box, dx, dy)
    const hits = candidate.own.count(box, clearance)
    let penalty = hits * 4
    const overflow = Math.max(0, frame.left - box.left) + Math.max(0, box.right - frame.right)
      + Math.max(0, frame.top - box.top) + Math.max(0, box.bottom - frame.bottom)
    penalty += overflow * 25
    for (const reservedBox of reserved) {
      if (overlaps(box, reservedBox, clearance)) penalty += 60 + intersectionArea(box, reservedBox) * 0.5
    }
    for (const other of occupied) {
      if (overlaps(box, other, clearance)) penalty += 400 + intersectionArea(box, other)
    }
    // Never cover the object's own marker.
    const marker = textBox(candidate.request.anchorX, candidate.request.anchorY, candidate.request.fontPx, 0)
    if (overlaps(box, marker, 1)) penalty += 120
    penalty += Math.hypot(dx, dy) * 0.6
    return { penalty, hits }
  }

  for (const candidate of pending) {
    let best = score(candidate, 0, 0)
    let bestOffset = { dx: 0, dy: 0 }
    if (best.penalty > 0) {
      for (const offset of candidateOffsets(candidate.request.fontPx)) {
        if (offset.dx === 0 && offset.dy === 0) continue
        const current = score(candidate, offset.dx, offset.dy)
        if (current.penalty < best.penalty - 1e-9) {
          best = current
          bestOffset = offset
        }
      }
    }
    const box = translate(candidate.box, bestOffset.dx, bestOffset.dy)
    occupied.push(box)
    remaining += best.hits
    const displacement = Math.hypot(bestOffset.dx, bestOffset.dy)
    placements.push({
      name: candidate.request.name,
      dx: bestOffset.dx,
      dy: bestOffset.dy,
      displaced: displacement >= leaderThreshold,
      conflicts: best.hits,
      conflictsBefore: candidate.conflictsBefore,
      box,
      leader: leaderAnchor(box, candidate.request.anchorX, candidate.request.anchorY),
    })
  }

  for (const request of unmatched) {
    const height = boxHeight(request.fontPx)
    const box: Box = {
      left: request.anchorX, top: request.anchorY - height, right: request.anchorX, bottom: request.anchorY,
    }
    placements.push({
      name: request.name, dx: 0, dy: 0, displaced: false, conflicts: 0, conflictsBefore: 0, box,
      leader: { x: request.anchorX, y: request.anchorY },
    })
  }

  return { placements, conflicts: remaining }
}

/** Point on the label box boundary closest to the object, so a leader line stops at the text. */
function leaderAnchor(box: Box, anchorX: number, anchorY: number): Point {
  return {
    x: Math.min(Math.max(anchorX, box.left), box.right),
    y: Math.min(Math.max(anchorY, box.top), box.bottom),
  }
}

/** Box of a text run, exported for tests and for reserving space around authored text. */
export function svgTextBox(node: SvgTextNode, width: number): Box {
  return textBox(node.x, node.y, node.size, width)
}
