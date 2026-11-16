import type { Dfa, LoopFinding } from '../../../core/models/compile-result';
import { flowOrder } from './dfa-order';

export type DiagramLoop = 'valid' | 'infinite' | null;

export interface DiagramNode {
  state: string;
  x: number;
  y: number;
  isStart: boolean;
  isAccept: boolean;
  loop: DiagramLoop;
}

export interface DiagramEdge {
  from: string;
  to: string;
  /** Every symbol that moves `from` to `to`, in flow order. */
  symbols: string[];
  /** `symbols` joined with ", ". */
  label: string;
  /** SVG path data, ending at the circle border of `to`. */
  path: string;
  labelX: number;
  labelY: number;
  loop: DiagramLoop;
}

export interface DfaDiagram {
  width: number;
  height: number;
  /** Radius of every state circle. */
  radius: number;
  /** Short arrow pointing at the start state from the left; null when the DFA has no states. */
  entry: { x1: number; y1: number; x2: number; y2: number } | null;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

const RADIUS = 22;
const ROW_GAP = 76;
const MIN_COLUMN_GAP = 110;
/** Estimated width of a monospace character at 12px, and the padding around a label. */
const CHAR_WIDTH = 7;
const LABEL_PADDING = 16;
/** Free space between a label and the circles it sits between. */
const LABEL_CLEARANCE = 24;
const ENTRY_LENGTH = 30;
const MARGIN_LEFT = RADIUS + ENTRY_LENGTH + 10;
const MARGIN_RIGHT = RADIUS + 16;
const MARGIN_Y = 12;
const SELF_LOOP_HEIGHT = 26;
/** Distance from the circles to the first lane used by curves above or below the diagram, and between lanes. */
const LANE_BASE = 52;
const LANE_STEP = 20;
const SIDE_BOW = 40;
const SIDE_BOW_STEP = 14;
const COS60 = 0.5;
const SIN60 = Math.sqrt(3) / 2;
const SIN45 = Math.SQRT1_2;

const round = (value: number): number => Math.round(value * 10) / 10;

type Direction = 'self' | 'forward' | 'up' | 'down' | 'left' | 'right';

interface RawEdge {
  from: string;
  to: string;
  symbols: string[];
  direction: Direction;
  /** Distance in layers (or rows for same-layer edges). */
  span: number;
  lane: number;
}

/** Breadth-first depth from the start state; states the start cannot reach go in one extra, final layer. */
function layersOf(dfa: Dfa, states: readonly string[]): Map<string, number> {
  const depth = new Map<string, number>();
  if (states.includes(dfa.start_state)) {
    depth.set(dfa.start_state, 0);
    const queue = [dfa.start_state];
    for (let state = queue.shift(); state !== undefined; state = queue.shift()) {
      for (const target of Object.values(dfa.transitions[state] ?? {})) {
        if (depth.has(target)) continue;
        depth.set(target, (depth.get(state) ?? 0) + 1);
        queue.push(target);
      }
    }
  }
  const last = Math.max(-1, ...depth.values());
  for (const state of states) if (!depth.has(state)) depth.set(state, last + 1);
  return depth;
}

/** Transitions that share a source and a target become one edge. */
function mergeTransitions(dfa: Dfa, order: { states: string[]; alphabet: string[] }): { from: string; to: string; symbols: string[] }[] {
  const merged = new Map<string, { from: string; to: string; symbols: string[] }>();
  for (const from of order.states) {
    const outgoing = dfa.transitions[from] ?? {};
    for (const symbol of order.alphabet) {
      const to = outgoing[symbol];
      if (to === undefined) continue;
      const key = `${from}\u0000${to}`;
      const edge = merged.get(key) ?? { from, to, symbols: [] };
      edge.symbols.push(symbol);
      merged.set(key, edge);
    }
  }
  return [...merged.values()];
}

/** Infinite loops win over valid ones. Any other type is still a loop and is drawn as a valid one. */
function loopKind(findings: readonly LoopFinding[], test: (finding: LoopFinding) => boolean): DiagramLoop {
  const matching = findings.filter(test);
  if (matching.length === 0) return null;
  return matching.some((finding) => finding.type === 'INFINITE_LOOP_TRAP') ? 'infinite' : 'valid';
}

/**
 * Lays a DFA out as a state diagram: one column per breadth-first layer, left to right, with straight arrows between
 * adjacent layers and curves for everything else. Pure: the result carries all the coordinates a template needs.
 */
export function dfaDiagram(dfa: Dfa, loops: readonly LoopFinding[]): DfaDiagram {
  const order = flowOrder(dfa);
  if (order.states.length === 0) {
    return { width: 0, height: 0, radius: RADIUS, entry: null, nodes: [], edges: [] };
  }

  const layerOf = layersOf(dfa, order.states);
  const layerCount = Math.max(...layerOf.values()) + 1;
  const columns: string[][] = Array.from({ length: layerCount }, () => []);
  for (const state of order.states) columns[layerOf.get(state) ?? 0].push(state);
  const rowOf = new Map<string, number>();
  columns.forEach((column) => column.forEach((state, row) => rowOf.set(state, row)));

  const raw: RawEdge[] = mergeTransitions(dfa, order).map((edge) => {
    const fromLayer = layerOf.get(edge.from) ?? 0;
    const toLayer = layerOf.get(edge.to) ?? 0;
    let direction: Direction;
    let span = Math.abs(toLayer - fromLayer);
    if (edge.from === edge.to) direction = 'self';
    else if (toLayer === fromLayer + 1) direction = 'forward';
    else if (toLayer > fromLayer) direction = 'down';
    else if (toLayer < fromLayer) direction = 'up';
    else {
      const rows = (rowOf.get(edge.to) ?? 0) - (rowOf.get(edge.from) ?? 0);
      direction = rows > 0 ? 'right' : 'left';
      span = Math.abs(rows);
    }
    return { ...edge, direction, span, lane: 0 };
  });

  // Curves above or below the diagram take one lane each, the shortest closest to the nodes.
  let upLanes = 0;
  let downLanes = 0;
  for (const direction of ['up', 'down'] as const) {
    raw
      .filter((edge) => edge.direction === direction)
      .sort((a, b) => a.span - b.span)
      .forEach((edge, lane) => {
        edge.lane = lane;
        if (direction === 'up') upLanes = lane + 1;
        else downLanes = lane + 1;
      });
  }
  const sideBow = (edge: RawEdge) => SIDE_BOW + SIDE_BOW_STEP * (edge.span - 1);
  const leftBow = Math.max(0, ...raw.filter((edge) => edge.direction === 'left').map(sideBow));
  const rightBow = Math.max(0, ...raw.filter((edge) => edge.direction === 'right').map(sideBow));

  // The column gap must fit the longest label of an arrow drawn between adjacent columns.
  const longestLabel = Math.max(
    0,
    ...raw.filter((edge) => edge.direction === 'forward').map((edge) => edge.symbols.join(', ').length),
  );
  const columnGap = Math.max(MIN_COLUMN_GAP, 2 * RADIUS + LABEL_CLEARANCE + longestLabel * CHAR_WIDTH + LABEL_PADDING);

  const hasSelfLoop = raw.some((edge) => edge.direction === 'self');
  const topRoom = Math.max(
    MARGIN_Y,
    hasSelfLoop ? SELF_LOOP_HEIGHT + 24 : 0,
    upLanes > 0 ? LANE_BASE + (upLanes - 1) * LANE_STEP + 10 : 0,
  );
  const bottomRoom = Math.max(MARGIN_Y, downLanes > 0 ? LANE_BASE + (downLanes - 1) * LANE_STEP + 10 : 0);
  const tallest = Math.max(...columns.map((column) => column.length));
  const bandHeight = (tallest - 1) * ROW_GAP;
  const nodeTop = topRoom + RADIUS;
  const nodeBottom = nodeTop + bandHeight;

  const originX = MARGIN_LEFT + leftBow;
  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((column, layer) => {
    const offset = (bandHeight - (column.length - 1) * ROW_GAP) / 2;
    column.forEach((state, row) => {
      positions.set(state, { x: originX + layer * columnGap, y: nodeTop + offset + row * ROW_GAP });
    });
  });

  const inLoop = (state: string) => loopKind(loops, (finding) => finding.dfa_states.includes(state));
  const nodes: DiagramNode[] = order.states.map((state) => ({
    state,
    ...(positions.get(state) as { x: number; y: number }),
    isStart: state === dfa.start_state,
    isAccept: dfa.accept_states.includes(state),
    loop: inLoop(state),
  }));

  const edges: DiagramEdge[] = raw.map((edge) => {
    const a = positions.get(edge.from) as { x: number; y: number };
    const b = positions.get(edge.to) as { x: number; y: number };
    const geometry = geometryOf(edge, a, b, { nodeTop, nodeBottom });
    const label = edge.symbols.join(', ');
    return {
      from: edge.from,
      to: edge.to,
      symbols: edge.symbols,
      label,
      ...geometry,
      loop: loopKind(
        loops,
        (finding) =>
          finding.dfa_states.includes(edge.from) &&
          finding.dfa_states.includes(edge.to) &&
          edge.symbols.some((symbol) => finding.activities.includes(symbol)),
      ),
    };
  });

  const start = positions.get(dfa.start_state);
  return {
    width: round(originX + (layerCount - 1) * columnGap + MARGIN_RIGHT + rightBow),
    height: round(nodeBottom + RADIUS + bottomRoom),
    radius: RADIUS,
    entry: start ? { x1: round(start.x - RADIUS - ENTRY_LENGTH), y1: start.y, x2: round(start.x - RADIUS), y2: start.y } : null,
    nodes,
    edges,
  };
}

type Point = { x: number; y: number };

function geometryOf(
  edge: RawEdge,
  a: Point,
  b: Point,
  band: { nodeTop: number; nodeBottom: number },
): { path: string; labelX: number; labelY: number } {
  const fmt = (p: Point) => `${round(p.x)} ${round(p.y)}`;
  const cubic = (p0: Point, c1: Point, c2: Point, p1: Point) => `M ${fmt(p0)} C ${fmt(c1)}, ${fmt(c2)}, ${fmt(p1)}`;
  const onCircle = (center: Point, dx: number, dy: number): Point => ({ x: center.x + RADIUS * dx, y: center.y + RADIUS * dy });

  switch (edge.direction) {
    case 'forward': {
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / length;
      const uy = (b.y - a.y) / length;
      const p0 = { x: a.x + ux * RADIUS, y: a.y + uy * RADIUS };
      const p1 = { x: b.x - ux * RADIUS, y: b.y - uy * RADIUS };
      return { path: `M ${fmt(p0)} L ${fmt(p1)}`, labelX: round((p0.x + p1.x) / 2), labelY: round((p0.y + p1.y) / 2) };
    }
    case 'self': {
      const p0 = onCircle(a, -COS60, -SIN60);
      const p1 = onCircle(a, COS60, -SIN60);
      const reach = (SELF_LOOP_HEIGHT * 4) / 3;
      const c1 = { x: a.x - 24, y: p0.y - reach };
      const c2 = { x: a.x + 24, y: p1.y - reach };
      return { path: cubic(p0, c1, c2, p1), labelX: round(a.x), labelY: round(p0.y - SELF_LOOP_HEIGHT - 9) };
    }
    case 'up':
    case 'down': {
      const sign = edge.direction === 'up' ? -1 : 1;
      const rightwards = b.x > a.x;
      const p0 = onCircle(a, rightwards ? COS60 : -COS60, sign * SIN60);
      const p1 = onCircle(b, rightwards ? -COS60 : COS60, sign * SIN60);
      const lane = edge.direction === 'up' ? band.nodeTop - LANE_BASE - edge.lane * LANE_STEP : band.nodeBottom + LANE_BASE + edge.lane * LANE_STEP;
      const c1 = { x: p0.x, y: lane };
      const c2 = { x: p1.x, y: lane };
      return { path: cubic(p0, c1, c2, p1), labelX: round((p0.x + p1.x) / 2), labelY: round(0.125 * (p0.y + p1.y) + 0.75 * lane) };
    }
    default: {
      // Same layer: bow to the right when the arrow goes down the column, to the left when it goes up.
      const side = edge.direction === 'right' ? 1 : -1;
      const vertical = edge.direction === 'right' ? SIN45 : -SIN45;
      const p0 = onCircle(a, side * SIN45, vertical);
      const p1 = onCircle(b, side * SIN45, -vertical);
      const bow = SIDE_BOW + SIDE_BOW_STEP * (edge.span - 1);
      const c1 = { x: p0.x + side * bow, y: p0.y };
      const c2 = { x: p1.x + side * bow, y: p1.y };
      return { path: cubic(p0, c1, c2, p1), labelX: round(p0.x + side * 0.75 * bow), labelY: round((p0.y + p1.y) / 2) };
    }
  }
}
