export type ShapeType =
  | 'entity'
  | 'relationship'
  | 'attribute'
  | 'generalization'
  | 'text'
  | 'frame';

export type GeneralizationValue = '' | 'd' | 'o';

export type AnchorId =
  | 'auto'
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'right-top'
  | 'right-bottom'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'left-top'
  | 'left-bottom';

export type LineType = 'straight' | 'orthogonal';

export type ArrowHeadStyle = 'none' | 'arrow' | 'open' | 'triangle' | 'circle';

export type LabelPlacement = 'above' | 'below' | 'on-line';

export interface Point {
  x: number;
  y: number;
}

export interface ERShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  isDouble: boolean;
  isUnderline: boolean;
  isBold: boolean;
  isDerived?: boolean; // optional dashed border for derived attributes
  frameColor?: string; // subtle accent color for frames
}

export interface ERLine {
  id: string;
  sourceId: string;
  targetId: string;
  sourceAnchor: AnchorId;
  targetAnchor: AnchorId;
  lineType: LineType;
  controlPoints: Point[]; // explicit user bend points for straight lines
  orthogonalRatio: number; // 0.1 to 0.9 position of middle segment for orthogonal lines
  orthogonalManualOffset?: number; // absolute coordinate override for middle segment
  isDouble: boolean;
  startLabel: string; // cardinality at source end
  middleLabel: string; // role in the middle
  endLabel: string; // cardinality at target end
  labelPlacement: LabelPlacement;
  startLabelOffset?: Point;
  middleLabelOffset?: Point;
  endLabelOffset?: Point;
  fontSize: number;
  isBold: boolean;
  isUnderline: boolean;
  startArrow: ArrowHeadStyle;
  endArrow: ArrowHeadStyle;
}

export interface DiagramState {
  shapes: ERShape[];
  lines: ERLine[];
}

export interface HistoryState {
  past: DiagramState[];
  present: DiagramState;
  future: DiagramState[];
}

export interface DiagramPage {
  id: string;
  name: string;
  history: HistoryState;
  zoom: number;
  pan: Point;
}

export const SHAPE_STYLE_CONSTANTS = {
  entity: {
    fill: '#C80032', // Dark-red rectangle
    stroke: '#5C0016',
    textColor: '#000000', // Black text
    defaultWidth: 132,
    defaultHeight: 60,
    defaultFontSize: 16,
  },
  relationship: {
    fill: '#4C9F1A', // Green rhombus
    stroke: '#245209',
    textColor: '#FFFFFF', // White text
    defaultWidth: 140,
    defaultHeight: 82,
    defaultFontSize: 14,
  },
  attribute: {
    fill: '#FFFF99', // Light-yellow oval
    stroke: '#262626',
    textColor: '#000000', // Black text
    defaultWidth: 128,
    defaultHeight: 54,
    defaultFontSize: 15,
  },
  generalization: {
    fill: '#2563EB', // Blue circle
    stroke: '#1E3A8A',
    textColor: '#FFFFFF', // White text
    defaultWidth: 50,
    defaultHeight: 50,
    defaultFontSize: 16,
  },
  text: {
    fill: 'transparent',
    stroke: 'transparent',
    textColor: '#0F172A',
    defaultWidth: 180,
    defaultHeight: 44,
    defaultFontSize: 16,
  },
  frame: {
    fill: 'rgba(241, 245, 249, 0.45)',
    stroke: '#64748B',
    textColor: '#1E293B',
    defaultWidth: 520,
    defaultHeight: 360,
    defaultFontSize: 14,
  },
} as const;

export function normalizeGeneralizationText(raw: string): GeneralizationValue {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'd' || trimmed === 'disjoint') return 'd';
  if (trimmed === 'o' || trimmed === 'overlap' || trimmed === 'overlapping') return 'o';
  return '';
}

export function createShape(
  type: ShapeType,
  x: number,
  y: number,
  overrides: Partial<ERShape> = {}
): ERShape {
  const defaults = SHAPE_STYLE_CONSTANTS[type];
  const defaultTextMap: Record<ShapeType, string> = {
    entity: 'entity',
    relationship: 'relates',
    attribute: 'attribute',
    generalization: 'd',
    text: 'Note or annotation text',
    frame: 'Frame 1 — Subsystem',
  };

  const width = overrides.width ?? defaults.defaultWidth;
  const height = overrides.height ?? defaults.defaultHeight;

  return {
    id: overrides.id ?? `${type}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    x: Math.round(x - width / 2),
    y: Math.round(y - height / 2),
    width,
    height,
    text:
      type === 'generalization'
        ? normalizeGeneralizationText(overrides.text ?? defaultTextMap[type])
        : (overrides.text ?? defaultTextMap[type]),
    fontSize: overrides.fontSize ?? defaults.defaultFontSize,
    isDouble: overrides.isDouble ?? false,
    isUnderline: overrides.isUnderline ?? false,
    isBold: overrides.isBold ?? false,
    isDerived: overrides.isDerived ?? false,
    frameColor: overrides.frameColor ?? '#3B82F6',
  };
}

export function getShapeCenter(shape: ERShape): Point {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2,
  };
}

/**
 * Returns all explicit interactive anchor positions around a shape's perimeter.
 */
export function getShapeAnchors(shape: ERShape): Record<Exclude<AnchorId, 'auto'>, Point> {
  const { x, y, width: w, height: h, type } = shape;
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (type === 'relationship') {
    const top = { x: cx, y };
    const right = { x: x + w, y: cy };
    const bottom = { x: cx, y: y + h };
    const left = { x, y: cy };
    return {
      top,
      right,
      bottom,
      left,
      'top-left': { x: (top.x + left.x) / 2, y: (top.y + left.y) / 2 },
      'top-right': { x: (top.x + right.x) / 2, y: (top.y + right.y) / 2 },
      'bottom-right': { x: (bottom.x + right.x) / 2, y: (bottom.y + right.y) / 2 },
      'bottom-left': { x: (bottom.x + left.x) / 2, y: (bottom.y + left.y) / 2 },
      'left-top': { x: left.x * 0.75 + top.x * 0.25, y: left.y * 0.75 + top.y * 0.25 },
      'left-bottom': { x: left.x * 0.75 + bottom.x * 0.25, y: left.y * 0.75 + bottom.y * 0.25 },
      'right-top': { x: right.x * 0.75 + top.x * 0.25, y: right.y * 0.75 + top.y * 0.25 },
      'right-bottom': { x: right.x * 0.75 + bottom.x * 0.25, y: right.y * 0.75 + bottom.y * 0.25 },
    };
  }

  if (type === 'attribute' || type === 'generalization') {
    const rx = w / 2;
    const ry = h / 2;
    const ptAtAngle = (deg: number): Point => {
      const rad = (deg * Math.PI) / 180;
      return {
        x: cx + rx * Math.cos(rad),
        y: cy + ry * Math.sin(rad),
      };
    };
    return {
      top: ptAtAngle(-90),
      'top-right': ptAtAngle(-45),
      'right-top': ptAtAngle(-22.5),
      right: ptAtAngle(0),
      'right-bottom': ptAtAngle(22.5),
      'bottom-right': ptAtAngle(45),
      bottom: ptAtAngle(90),
      'bottom-left': ptAtAngle(135),
      'left-bottom': ptAtAngle(157.5),
      left: ptAtAngle(180),
      'left-top': ptAtAngle(-157.5),
      'top-left': ptAtAngle(-135),
    };
  }

  // Default Rectangle (Entity, Text, Frame)
  return {
    top: { x: cx, y },
    'top-left': { x: x + w * 0.25, y },
    'top-right': { x: x + w * 0.75, y },
    right: { x: x + w, y: cy },
    'right-top': { x: x + w, y: y + h * 0.25 },
    'right-bottom': { x: x + w, y: y + h * 0.75 },
    bottom: { x: cx, y: y + h },
    'bottom-left': { x: x + w * 0.25, y: y + h },
    'bottom-right': { x: x + w * 0.75, y: y + h },
    left: { x, y: cy },
    'left-top': { x, y: y + h * 0.25 },
    'left-bottom': { x, y: y + h * 0.75 },
  };
}

/**
 * Computes the exact intersection point on the perimeter of a shape
 * along a ray from the shape's center toward `targetPoint`.
 */
export function getPerimeterIntersection(shape: ERShape, targetPoint: Point): Point {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const dx = targetPoint.x - cx;
  const dy = targetPoint.y - cy;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: cx, y: shape.y };
  }

  const rx = Math.max(1, shape.width / 2);
  const ry = Math.max(1, shape.height / 2);

  if (shape.type === 'attribute' || shape.type === 'generalization') {
    const scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    return {
      x: cx + dx * scale,
      y: cy + dy * scale,
    };
  }

  if (shape.type === 'relationship') {
    const denom = Math.abs(dx) / rx + Math.abs(dy) / ry;
    const t = denom > 0 ? 1 / denom : 1;
    return {
      x: cx + dx * t,
      y: cy + dy * t,
    };
  }

  const tx = Math.abs(dx) > 0.0001 ? rx / Math.abs(dx) : Infinity;
  const ty = Math.abs(dy) > 0.0001 ? ry / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return {
    x: cx + dx * t,
    y: cy + dy * t,
  };
}

export function resolveAnchorPoint(
  shape: ERShape,
  anchor: AnchorId,
  referencePoint: Point
): Point {
  if (anchor === 'auto') {
    return getPerimeterIntersection(shape, referencePoint);
  }
  const anchors = getShapeAnchors(shape);
  return anchors[anchor] ?? getPerimeterIntersection(shape, referencePoint);
}

/**
 * Computes the ordered polyline vertices for a line connecting two shapes.
 */
export function computeLinePoints(
  line: ERLine,
  sourceShape: ERShape,
  targetShape: ERShape
): Point[] {
  const sourceCenter = getShapeCenter(sourceShape);
  const targetCenter = getShapeCenter(targetShape);

  if (line.lineType === 'straight') {
    const firstRef =
      line.controlPoints.length > 0 ? line.controlPoints[0] : targetCenter;
    const lastRef =
      line.controlPoints.length > 0
        ? line.controlPoints[line.controlPoints.length - 1]
        : sourceCenter;

    const startPt = resolveAnchorPoint(sourceShape, line.sourceAnchor, firstRef);
    const endPt = resolveAnchorPoint(targetShape, line.targetAnchor, lastRef);

    return [startPt, ...line.controlPoints, endPt];
  }

  // Orthogonal routing with adjustable middle segment
  const startPt = resolveAnchorPoint(sourceShape, line.sourceAnchor, targetCenter);
  const endPt = resolveAnchorPoint(targetShape, line.targetAnchor, sourceCenter);

  const dx = Math.abs(endPt.x - startPt.x);
  const dy = Math.abs(endPt.y - startPt.y);
  const ratio = Math.max(0.05, Math.min(0.95, line.orthogonalRatio ?? 0.5));

  const isHorizontalFirst =
    line.sourceAnchor === 'left' ||
    line.sourceAnchor === 'right' ||
    line.sourceAnchor === 'left-top' ||
    line.sourceAnchor === 'left-bottom' ||
    line.sourceAnchor === 'right-top' ||
    line.sourceAnchor === 'right-bottom' ||
    (line.sourceAnchor === 'auto' && dx >= dy);

  if (isHorizontalFirst) {
    const midX =
      line.orthogonalManualOffset !== undefined
        ? line.orthogonalManualOffset
        : startPt.x + (endPt.x - startPt.x) * ratio;
    return [
      startPt,
      { x: midX, y: startPt.y },
      { x: midX, y: endPt.y },
      endPt,
    ];
  } else {
    const midY =
      line.orthogonalManualOffset !== undefined
        ? line.orthogonalManualOffset
        : startPt.y + (endPt.y - startPt.y) * ratio;
    return [
      startPt,
      { x: startPt.x, y: midY },
      { x: endPt.x, y: midY },
      endPt,
    ];
  }
}

/**
 * Finds the closest segment on a straight line to `clickPt` and inserts a bend control point.
 * Used when Alt+clicking on a line or clicking/dragging a segment midpoint handle.
 */
export function insertBendPointAtClick(
  line: ERLine,
  sourceShape: ERShape,
  targetShape: ERShape,
  clickPt: Point,
  snapToSegmentMidpoint = false
): { updatedLine: ERLine; insertedIndex: number; point: Point } {
  const pts = computeLinePoints(
    { ...line, lineType: 'straight' },
    sourceShape,
    targetShape
  );

  let bestSegIdx = 0;
  let bestDist = Infinity;
  let bestPoint: Point = clickPt;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    let t = 0.5;
    if (lenSq > 0.0001) {
      t = ((clickPt.x - a.x) * abx + (clickPt.y - a.y) * aby) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const proj = { x: a.x + abx * t, y: a.y + aby * t };
    const dist = Math.hypot(clickPt.x - proj.x, clickPt.y - proj.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestSegIdx = i;
      bestPoint = snapToSegmentMidpoint
        ? { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) }
        : { x: Math.round(clickPt.x), y: Math.round(clickPt.y) };
    }
  }

  const nextControlPoints = [...line.controlPoints];
  nextControlPoints.splice(bestSegIdx, 0, bestPoint);

  return {
    updatedLine: {
      ...line,
      lineType: 'straight',
      controlPoints: nextControlPoints,
    },
    insertedIndex: bestSegIdx,
    point: bestPoint,
  };
}

/**
 * Duplicates the given selected shapes and any lines whose source and target
 * both belong to the duplicated shape set.
 */
export function duplicateSelection(
  state: DiagramState,
  selectedShapeIds: string[],
  offset: Point = { x: 0, y: 0 }
): {
  nextState: DiagramState;
  newShapeIds: string[];
  newLineIds: string[];
} {
  const selectedSet = new Set(selectedShapeIds);
  if (selectedSet.size === 0) {
    return { nextState: state, newShapeIds: [], newLineIds: [] };
  }

  const idMap = new Map<string, string>();
  const clonedShapes: ERShape[] = [];
  const newShapeIds: string[] = [];

  for (const s of state.shapes) {
    if (!selectedSet.has(s.id)) continue;
    const newId = `${s.type}_${Math.random().toString(36).slice(2, 9)}`;
    idMap.set(s.id, newId);
    newShapeIds.push(newId);
    clonedShapes.push({
      ...s,
      id: newId,
      x: Math.round(s.x + offset.x),
      y: Math.round(s.y + offset.y),
    });
  }

  const clonedLines: ERLine[] = [];
  const newLineIds: string[] = [];

  for (const l of state.lines) {
    const newSourceId = idMap.get(l.sourceId);
    const newTargetId = idMap.get(l.targetId);
    if (newSourceId && newTargetId) {
      const newLineId = `line_${Math.random().toString(36).slice(2, 9)}`;
      newLineIds.push(newLineId);
      clonedLines.push({
        ...l,
        id: newLineId,
        sourceId: newSourceId,
        targetId: newTargetId,
        controlPoints: l.controlPoints.map((cp) => ({
          x: Math.round(cp.x + offset.x),
          y: Math.round(cp.y + offset.y),
        })),
      });
    }
  }

  return {
    nextState: {
      shapes: [...state.shapes, ...clonedShapes],
      lines: [...state.lines, ...clonedLines],
    },
    newShapeIds,
    newLineIds,
  };
}

/**
 * Computes positions for start cardinality, middle role, and end cardinality labels
 * so they sit cleanly above, below, or on the line without awkward collisions.
 */
export function computeLineLabelPositions(
  points: Point[],
  placement: LabelPlacement,
  offsets?: {
    start?: Point;
    middle?: Point;
    end?: Point;
  }
): {
  start: Point;
  middle: Point;
  end: Point;
  startAngle: number;
  endAngle: number;
} {
  if (points.length < 2) {
    const zero = { x: 0, y: 0 };
    return { start: zero, middle: zero, end: zero, startAngle: 0, endAngle: 0 };
  }

  const normalOffsetDistance =
    placement === 'on-line' ? 0 : placement === 'above' ? -15 : 15;

  const getOffsetPointAlongSegment = (
    p1: Point,
    p2: Point,
    t: number,
    perpDist: number
  ): Point => {
    const bx = p1.x + (p2.x - p1.x) * t;
    const by = p1.y + (p2.y - p1.y) * t;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    if (Math.abs(dx) < 1) {
      nx = 1;
      ny = 0;
    }
    return {
      x: bx + nx * perpDist,
      y: by + ny * perpDist,
    };
  };

  const s0 = points[0];
  const s1 = points[1];
  const firstLen = Math.hypot(s1.x - s0.x, s1.y - s0.y) || 1;
  const startT = Math.min(0.42, Math.max(0.18, 28 / firstLen));
  const rawStart = getOffsetPointAlongSegment(s0, s1, startT, normalOffsetDistance);

  const e1 = points[points.length - 2];
  const e2 = points[points.length - 1];
  const lastLen = Math.hypot(e2.x - e1.x, e2.y - e1.y) || 1;
  const endT = 1 - Math.min(0.42, Math.max(0.18, 28 / lastLen));
  const rawEnd = getOffsetPointAlongSegment(e1, e2, endT, normalOffsetDistance);

  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLens.push(l);
    totalLen += l;
  }

  let halfDist = totalLen / 2;
  let midSegIdx = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (halfDist <= segLens[i] || i === segLens.length - 1) {
      midSegIdx = i;
      break;
    }
    halfDist -= segLens[i];
  }
  const midSegLen = segLens[midSegIdx] || 1;
  const midT = Math.max(0, Math.min(1, halfDist / midSegLen));
  const rawMiddle = getOffsetPointAlongSegment(
    points[midSegIdx],
    points[midSegIdx + 1],
    midT,
    normalOffsetDistance
  );

  return {
    start: {
      x: rawStart.x + (offsets?.start?.x ?? 0),
      y: rawStart.y + (offsets?.start?.y ?? 0),
    },
    middle: {
      x: rawMiddle.x + (offsets?.middle?.x ?? 0),
      y: rawMiddle.y + (offsets?.middle?.y ?? 0),
    },
    end: {
      x: rawEnd.x + (offsets?.end?.x ?? 0),
      y: rawEnd.y + (offsets?.end?.y ?? 0),
    },
    startAngle: Math.atan2(s1.y - s0.y, s1.x - s0.x),
    endAngle: Math.atan2(e2.y - e1.y, e2.x - e1.x),
  };
}

/**
 * Applies keyboard shortcut transformations ('d', 'u', 'b') to the currently selected shapes and lines.
 */
export function applyShortcutKey(
  state: DiagramState,
  selectedShapeIds: string[],
  selectedLineIds: string[],
  key: 'd' | 'u' | 'b'
): DiagramState {
  if (selectedShapeIds.length === 0 && selectedLineIds.length === 0) {
    return state;
  }

  const shapeSet = new Set(selectedShapeIds);
  const lineSet = new Set(selectedLineIds);

  if (key === 'd') {
    const selectedShapes = state.shapes.filter(
      (s) => shapeSet.has(s.id) && s.type !== 'frame' && s.type !== 'text'
    );
    const selectedLines = state.lines.filter((l) => lineSet.has(l.id));
    const allDouble =
      [...selectedShapes.map((s) => s.isDouble), ...selectedLines.map((l) => l.isDouble)].every(
        Boolean
      ) && selectedShapes.length + selectedLines.length > 0;
    const nextValue = !allDouble;

    return {
      shapes: state.shapes.map((s) =>
        shapeSet.has(s.id) && s.type !== 'frame' && s.type !== 'text'
          ? { ...s, isDouble: nextValue }
          : s
      ),
      lines: state.lines.map((l) =>
        lineSet.has(l.id) ? { ...l, isDouble: nextValue } : l
      ),
    };
  }

  if (key === 'u') {
    const selectedShapes = state.shapes.filter((s) => shapeSet.has(s.id));
    const selectedLines = state.lines.filter((l) => lineSet.has(l.id));
    const allUnderline =
      [
        ...selectedShapes.map((s) => s.isUnderline),
        ...selectedLines.map((l) => l.isUnderline),
      ].every(Boolean) && selectedShapes.length + selectedLines.length > 0;
    const nextValue = !allUnderline;

    return {
      shapes: state.shapes.map((s) =>
        shapeSet.has(s.id) ? { ...s, isUnderline: nextValue } : s
      ),
      lines: state.lines.map((l) =>
        lineSet.has(l.id) ? { ...l, isUnderline: nextValue } : l
      ),
    };
  }

  if (key === 'b') {
    const selectedShapes = state.shapes.filter((s) => shapeSet.has(s.id));
    const selectedLines = state.lines.filter((l) => lineSet.has(l.id));
    const allBold =
      [...selectedShapes.map((s) => s.isBold), ...selectedLines.map((l) => l.isBold)].every(
        Boolean
      ) && selectedShapes.length + selectedLines.length > 0;
    const nextValue = !allBold;

    return {
      shapes: state.shapes.map((s) =>
        shapeSet.has(s.id) ? { ...s, isBold: nextValue } : s
      ),
      lines: state.lines.map((l) =>
        lineSet.has(l.id) ? { ...l, isBold: nextValue } : l
      ),
    };
  }

  return state;
}

/**
 * Pure Undo/Redo History functions
 */
export function createHistoryState(initial: DiagramState): HistoryState {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function pushHistory(history: HistoryState, next: DiagramState): HistoryState {
  if (history.present === next) return history;
  const nextPast = [...history.past, history.present].slice(-50);
  return {
    past: nextPast,
    present: next,
    future: [],
  };
}

export function undoHistory(history: HistoryState): HistoryState {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, history.past.length - 1);
  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistory(history: HistoryState): HistoryState {
  if (history.future.length === 0) return history;
  const next = history.future[0];
  const newFuture = history.future.slice(1);
  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
  };
}

/**
 * Computes the bounding box of a diagram (or subset of shapes/frames) with padding.
 */
export function getDiagramBounds(
  state: DiagramState,
  padding = 48,
  targetFrameId?: string
): { x: number; y: number; width: number; height: number } {
  if (targetFrameId) {
    const frame = state.shapes.find((s) => s.id === targetFrameId && s.type === 'frame');
    if (frame) {
      return {
        x: frame.x - 12,
        y: frame.y - 12,
        width: frame.width + 24,
        height: frame.height + 24,
      };
    }
  }

  if (state.shapes.length === 0) {
    return { x: 0, y: 0, width: 1000, height: 700 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of state.shapes) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.width);
    maxY = Math.max(maxY, s.y + s.height);
  }

  for (const l of state.lines) {
    for (const cp of l.controlPoints) {
      minX = Math.min(minX, cp.x - 20);
      minY = Math.min(minY, cp.y - 20);
      maxX = Math.max(maxX, cp.x + 20);
      maxY = Math.max(maxY, cp.y + 20);
    }
  }

  return {
    x: Math.floor(minX - padding),
    y: Math.floor(minY - padding),
    width: Math.max(400, Math.ceil(maxX - minX + padding * 2)),
    height: Math.max(300, Math.ceil(maxY - minY + padding * 2)),
  };
}
