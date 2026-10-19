import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHAPE_STYLE_CONSTANTS,
  createShape,
  normalizeGeneralizationText,
  getPerimeterIntersection,
  computeLinePoints,
  computeLineLabelPositions,
  applyShortcutKey,
  createHistoryState,
  pushHistory,
  undoHistory,
  redoHistory,
  duplicateSelection,
  insertBendPointAtClick,
  type DiagramState,
  type ERLine,
} from './erModel.ts';

test('shape color and text rules match Chen ER specification', () => {
  assert.equal(SHAPE_STYLE_CONSTANTS.entity.fill, '#C80032');
  assert.equal(SHAPE_STYLE_CONSTANTS.entity.textColor, '#000000');

  assert.equal(SHAPE_STYLE_CONSTANTS.relationship.fill, '#4C9F1A');
  assert.equal(SHAPE_STYLE_CONSTANTS.relationship.textColor, '#FFFFFF');

  assert.equal(SHAPE_STYLE_CONSTANTS.attribute.fill, '#FFFF99');
  assert.equal(SHAPE_STYLE_CONSTANTS.attribute.textColor, '#000000');

  assert.equal(SHAPE_STYLE_CONSTANTS.generalization.fill, '#2563EB');
  assert.equal(SHAPE_STYLE_CONSTANTS.generalization.textColor, '#FFFFFF');
});

test('generalization text normalizes strictly to blank, d, or o', () => {
  assert.equal(normalizeGeneralizationText('d'), 'd');
  assert.equal(normalizeGeneralizationText('D'), 'd');
  assert.equal(normalizeGeneralizationText('disjoint'), 'd');
  assert.equal(normalizeGeneralizationText('o'), 'o');
  assert.equal(normalizeGeneralizationText('O'), 'o');
  assert.equal(normalizeGeneralizationText('overlapping'), 'o');
  assert.equal(normalizeGeneralizationText(''), '');
  assert.equal(normalizeGeneralizationText('xyz'), '');
});

test('perimeter intersection computes exact boundary points for entity, rhombus, and oval', () => {
  const entity = createShape('entity', 200, 200, { width: 120, height: 60 });
  const rightHit = getPerimeterIntersection(entity, { x: 400, y: 200 });
  assert.equal(Math.round(rightHit.x), 260);
  assert.equal(Math.round(rightHit.y), 200);

  const rel = createShape('relationship', 200, 200, { width: 140, height: 80 });
  const topHit = getPerimeterIntersection(rel, { x: 200, y: 20 });
  assert.equal(Math.round(topHit.x), 200);
  assert.equal(Math.round(topHit.y), 160);

  const attr = createShape('attribute', 200, 200, { width: 100, height: 50 });
  const leftHit = getPerimeterIntersection(attr, { x: 10, y: 200 });
  assert.equal(Math.round(leftHit.x), 150);
  assert.equal(Math.round(leftHit.y), 200);
});

test('straight and orthogonal lines compute expected vertices and label offsets', () => {
  const s1 = createShape('entity', 100, 200, { id: 'e1', width: 100, height: 60 });
  const s2 = createShape('relationship', 400, 200, { id: 'r1', width: 120, height: 80 });

  const straightLine: ERLine = {
    id: 'l1',
    sourceId: 'e1',
    targetId: 'r1',
    sourceAnchor: 'right',
    targetAnchor: 'left',
    lineType: 'straight',
    controlPoints: [{ x: 250, y: 150 }],
    orthogonalRatio: 0.5,
    isDouble: false,
    startLabel: '1',
    middleLabel: 'manages',
    endLabel: 'N',
    labelPlacement: 'above',
    fontSize: 14,
    isBold: false,
    isUnderline: false,
    startArrow: 'none',
    endArrow: 'none',
  };

  const pts = computeLinePoints(straightLine, s1, s2);
  assert.equal(pts.length, 3);
  assert.deepEqual(pts[1], { x: 250, y: 150 });

  const labelsAbove = computeLineLabelPositions(pts, 'above');
  const labelsOnLine = computeLineLabelPositions(pts, 'on-line');
  assert.ok(labelsAbove.middle.y < labelsOnLine.middle.y);

  const orthoLine: ERLine = {
    ...straightLine,
    lineType: 'orthogonal',
    controlPoints: [],
    orthogonalRatio: 0.5,
  };
  const orthoPts = computeLinePoints(orthoLine, s1, s2);
  assert.equal(orthoPts.length, 4);
  assert.equal(orthoPts[1].x, orthoPts[2].x);
});

test('insertBendPointAtClick inserts a bend control point at the closest segment midpoint or click', () => {
  const s1 = createShape('entity', 100, 200, { id: 'e1', width: 100, height: 60 });
  const s2 = createShape('relationship', 400, 200, { id: 'r1', width: 120, height: 80 });
  const line: ERLine = {
    id: 'l1',
    sourceId: 'e1',
    targetId: 'r1',
    sourceAnchor: 'right',
    targetAnchor: 'left',
    lineType: 'straight',
    controlPoints: [],
    orthogonalRatio: 0.5,
    isDouble: false,
    startLabel: '',
    middleLabel: '',
    endLabel: '',
    labelPlacement: 'on-line',
    fontSize: 13,
    isBold: false,
    isUnderline: false,
    startArrow: 'none',
    endArrow: 'none',
  };

  const { updatedLine, insertedIndex, point } = insertBendPointAtClick(
    line,
    s1,
    s2,
    { x: 245, y: 200 },
    true
  );

  assert.equal(insertedIndex, 0);
  assert.equal(updatedLine.controlPoints.length, 1);
  // s1 right edge is x=150, s2 left edge is x=340 -> midpoint is x=245, y=200
  assert.deepEqual(point, { x: 245, y: 200 });
});

test('duplicateSelection clones selected shapes and internal connecting lines with offset', () => {
  const e1 = createShape('entity', 100, 100, { id: 'e1', text: 'Customer' });
  const a1 = createShape('attribute', 250, 100, { id: 'a1', text: 'cid', isUnderline: true });
  const e2 = createShape('entity', 500, 100, { id: 'e2', text: 'Unselected' });

  const lInternal: ERLine = {
    id: 'l_int',
    sourceId: 'e1',
    targetId: 'a1',
    sourceAnchor: 'right',
    targetAnchor: 'left',
    lineType: 'straight',
    controlPoints: [{ x: 175, y: 90 }],
    orthogonalRatio: 0.5,
    isDouble: true,
    startLabel: '1',
    middleLabel: '',
    endLabel: '',
    labelPlacement: 'on-line',
    fontSize: 13,
    isBold: false,
    isUnderline: false,
    startArrow: 'none',
    endArrow: 'none',
  };

  const lExternal: ERLine = {
    ...lInternal,
    id: 'l_ext',
    sourceId: 'e1',
    targetId: 'e2',
  };

  const initialState: DiagramState = {
    shapes: [e1, a1, e2],
    lines: [lInternal, lExternal],
  };

  const { nextState, newShapeIds, newLineIds } = duplicateSelection(
    initialState,
    ['e1', 'a1'],
    { x: 50, y: 80 }
  );

  assert.equal(newShapeIds.length, 2);
  assert.equal(newLineIds.length, 1); // Only lInternal is duplicated
  assert.equal(nextState.shapes.length, 5);
  assert.equal(nextState.lines.length, 3);

  const dupLine = nextState.lines.find((l) => l.id === newLineIds[0])!;
  assert.deepEqual(dupLine.controlPoints[0], { x: 225, y: 170 });
  assert.ok(newShapeIds.includes(dupLine.sourceId));
  assert.ok(newShapeIds.includes(dupLine.targetId));
});

test('shortcut keys d, u, and b toggle double-line, underline, and bold', () => {
  const e1 = createShape('entity', 100, 100, { id: 'e1' });
  const a1 = createShape('attribute', 250, 100, { id: 'a1' });
  const l1: ERLine = {
    id: 'l1',
    sourceId: 'e1',
    targetId: 'a1',
    sourceAnchor: 'auto',
    targetAnchor: 'auto',
    lineType: 'straight',
    controlPoints: [],
    orthogonalRatio: 0.5,
    isDouble: false,
    startLabel: '',
    middleLabel: '',
    endLabel: '',
    labelPlacement: 'above',
    fontSize: 13,
    isBold: false,
    isUnderline: false,
    startArrow: 'none',
    endArrow: 'none',
  };

  let state: DiagramState = { shapes: [e1, a1], lines: [l1] };

  state = applyShortcutKey(state, ['e1'], ['l1'], 'd');
  assert.equal(state.shapes.find((s) => s.id === 'e1')?.isDouble, true);
  assert.equal(state.lines[0].isDouble, true);

  state = applyShortcutKey(state, ['a1'], [], 'u');
  assert.equal(state.shapes.find((s) => s.id === 'a1')?.isUnderline, true);

  state = applyShortcutKey(state, ['a1'], [], 'b');
  assert.equal(state.shapes.find((s) => s.id === 'a1')?.isBold, true);
});

test('undo and redo history stacks preserve and restore states', () => {
  const initial: DiagramState = { shapes: [], lines: [] };
  const second: DiagramState = {
    shapes: [createShape('entity', 100, 100, { id: 'e1', text: 'User' })],
    lines: [],
  };
  const third: DiagramState = {
    shapes: [
      createShape('entity', 100, 100, { id: 'e1', text: 'User' }),
      createShape('attribute', 240, 100, { id: 'a1', text: 'UID', isUnderline: true }),
    ],
    lines: [],
  };

  let history = createHistoryState(initial);
  history = pushHistory(history, second);
  history = pushHistory(history, third);

  assert.equal(history.present.shapes.length, 2);

  history = undoHistory(history);
  assert.equal(history.present.shapes.length, 1);
  assert.equal(history.present.shapes[0].text, 'User');

  history = undoHistory(history);
  assert.equal(history.present.shapes.length, 0);

  history = redoHistory(history);
  assert.equal(history.present.shapes.length, 1);

  history = redoHistory(history);
  assert.equal(history.present.shapes.length, 2);
});
