import React, { useState, useRef, useEffect } from 'react';
import {
  type DiagramState,
  type ERShape,
  type ERLine,
  type ShapeType,
  type AnchorId,
  type Point,
  SHAPE_STYLE_CONSTANTS,
  getShapeAnchors,
  computeLinePoints,
  computeLineLabelPositions,
  normalizeGeneralizationText,
  duplicateSelection,
  insertBendPointAtClick,
} from '../utils/erModel.ts';

interface DiagramCanvasProps {
  state: DiagramState;
  selectedShapeIds: string[];
  selectedLineIds: string[];
  onSelect: (shapeIds: string[], lineIds: string[]) => void;
  activeTool: 'select' | 'connect-straight' | 'connect-orthogonal';
  setActiveTool: (tool: 'select' | 'connect-straight' | 'connect-orthogonal') => void;
  zoom: number;
  pan: Point;
  setPan: React.Dispatch<React.SetStateAction<Point>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  onCommitState: (next: DiagramState) => void;
  onLiveStateChange: (next: DiagramState) => void;
}

const VISIBLE_ANCHORS: Exclude<AnchorId, 'auto'>[] = [
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
  'top-left',
];

interface InlineEditState {
  kind: 'shape' | 'line-start' | 'line-middle' | 'line-end';
  id: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isGeneralization?: boolean;
}

type DragSession =
  | {
      type: 'pan';
      startMouse: Point;
      startPan: Point;
    }
  | {
      type: 'move-shapes';
      startMouse: Point;
      initialState: DiagramState;
      movingIds: Set<string>;
      isCtrlDuplicate: boolean;
      duplicatedState?: DiagramState;
      duplicatedShapeIds?: string[];
      duplicatedLineIds?: string[];
      hasMoved: boolean;
    }
  | {
      type: 'resize-shape';
      shapeId: string;
      handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
      startMouse: Point;
      initialShape: ERShape;
      initialState: DiagramState;
    }
  | {
      type: 'connect';
      sourceId: string;
      sourceAnchor: AnchorId;
      startPt: Point;
      currentPt: Point;
      lineType: 'straight' | 'orthogonal';
    }
  | {
      type: 'move-control-point';
      lineId: string;
      pointIndex: number;
      baseState: DiagramState;
      hasMoved: boolean;
    }
  | {
      type: 'move-ortho-segment';
      lineId: string;
      isHorizontalFirst: boolean;
      initialState: DiagramState;
    }
  | {
      type: 'move-line-label';
      lineId: string;
      part: 'start' | 'middle' | 'end';
      startMouse: Point;
      initialOffset: Point;
      initialState: DiagramState;
    }
  | {
      type: 'marquee';
      startWorld: Point;
      currentWorld: Point;
    };

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  state,
  selectedShapeIds,
  selectedLineIds,
  onSelect,
  activeTool,
  setActiveTool,
  zoom,
  pan,
  setPan,
  setZoom,
  onCommitState,
  onLiveStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [dragContext, setDragContext] = useState<DragSession | null>(null);

  // Keep synchronous refs so active drag & wheel handlers never read stale state
  const stateRef = useRef(state);
  stateRef.current = state;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const dragRef = useRef<DragSession | null>(null);
  dragRef.current = dragContext;

  const screenToWorld = (clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - panRef.current.y) / zoomRef.current,
    };
  };

  // Prevent browser page zoom on Ctrl+Wheel anywhere in the window, and zoom only the canvas workspace
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Calculate cursor position relative to canvas container (or center if cursor is on sidebars)
        const isInsideCanvas =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        const focalScreenX = isInsideCanvas
          ? e.clientX - rect.left
          : rect.width / 2;
        const focalScreenY = isInsideCanvas
          ? e.clientY - rect.top
          : rect.height / 2;

        const oldZoom = zoomRef.current;
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.max(
          0.3,
          Math.min(2.5, Number((oldZoom * factor).toFixed(2)))
        );

        const worldX = (focalScreenX - panRef.current.x) / oldZoom;
        const worldY = (focalScreenY - panRef.current.y) / oldZoom;

        const nextPan = {
          x: Math.round(focalScreenX - worldX * newZoom),
          y: Math.round(focalScreenY - worldY * newZoom),
        };

        setZoom(newZoom);
        setPan(nextPan);
      } else if (
        containerRef.current &&
        containerRef.current.contains(e.target as Node)
      ) {
        e.preventDefault();
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, [setPan, setZoom]);

  // Commit inline editing
  const commitInlineEdit = () => {
    if (!inlineEdit) return;
    const { kind, id, value } = inlineEdit;
    if (kind === 'shape') {
      const nextShapes = state.shapes.map((s) => {
        if (s.id !== id) return s;
        const cleaned =
          s.type === 'generalization'
            ? normalizeGeneralizationText(value)
            : value;
        return { ...s, text: cleaned };
      });
      onCommitState({ ...state, shapes: nextShapes });
    } else {
      const nextLines = state.lines.map((l) => {
        if (l.id !== id) return l;
        if (kind === 'line-start') return { ...l, startLabel: value };
        if (kind === 'line-middle') return { ...l, middleLabel: value };
        if (kind === 'line-end') return { ...l, endLabel: value };
        return l;
      });
      onCommitState({ ...state, lines: nextLines });
    }
    setInlineEdit(null);
  };

  // Mouse Move / Up handlers on window during active drag
  useEffect(() => {
    if (!dragContext) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentDrag = dragRef.current;
      if (!currentDrag) return;
      const worldPt = screenToWorld(e.clientX, e.clientY);

      if (currentDrag.type === 'pan') {
        const dx = e.clientX - currentDrag.startMouse.x;
        const dy = e.clientY - currentDrag.startMouse.y;
        setPan({
          x: currentDrag.startPan.x + dx,
          y: currentDrag.startPan.y + dy,
        });
        return;
      }

      if (currentDrag.type === 'move-shapes') {
        const dx = (e.clientX - currentDrag.startMouse.x) / zoomRef.current;
        const dy = (e.clientY - currentDrag.startMouse.y) / zoomRef.current;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && !currentDrag.hasMoved) return;

        if (!currentDrag.hasMoved) {
          currentDrag.hasMoved = true;
          // If Ctrl+Dragging, create the duplicate subgraph on first movement
          if (currentDrag.isCtrlDuplicate && !currentDrag.duplicatedState) {
            const sourceIds = Array.from(currentDrag.movingIds);
            const { nextState, newShapeIds, newLineIds } = duplicateSelection(
              currentDrag.initialState,
              sourceIds,
              { x: 0, y: 0 }
            );
            currentDrag.duplicatedState = nextState;
            currentDrag.duplicatedShapeIds = newShapeIds;
            currentDrag.duplicatedLineIds = newLineIds;
            currentDrag.movingIds = new Set(newShapeIds);
            onSelect(newShapeIds, newLineIds);
          }
        }

        const baseState = currentDrag.duplicatedState ?? currentDrag.initialState;
        const nextShapes = baseState.shapes.map((s) =>
          currentDrag.movingIds.has(s.id)
            ? { ...s, x: Math.round(s.x + dx), y: Math.round(s.y + dy) }
            : s
        );

        // Also offset any control points of internal duplicated lines
        const movingLineSet = new Set(currentDrag.duplicatedLineIds ?? []);
        const nextLines = baseState.lines.map((l) =>
          movingLineSet.has(l.id) ||
          (currentDrag.movingIds.has(l.sourceId) &&
            currentDrag.movingIds.has(l.targetId))
            ? {
                ...l,
                controlPoints: l.controlPoints.map((cp) => ({
                  x: Math.round(cp.x + dx),
                  y: Math.round(cp.y + dy),
                })),
              }
            : l
        );

        onLiveStateChange({ shapes: nextShapes, lines: nextLines });
        return;
      }

      if (currentDrag.type === 'resize-shape') {
        const dx = (e.clientX - currentDrag.startMouse.x) / zoomRef.current;
        const dy = (e.clientY - currentDrag.startMouse.y) / zoomRef.current;
        const init = currentDrag.initialShape;
        let { x, y, width, height } = init;
        const minW = init.type === 'generalization' ? 36 : 50;
        const minH = init.type === 'generalization' ? 36 : 34;

        if (currentDrag.handle.includes('e')) {
          width = Math.max(minW, Math.round(init.width + dx));
        }
        if (currentDrag.handle.includes('s')) {
          height = Math.max(minH, Math.round(init.height + dy));
        }
        if (currentDrag.handle.includes('w')) {
          const possibleW = Math.round(init.width - dx);
          if (possibleW >= minW) {
            width = possibleW;
            x = Math.round(init.x + dx);
          }
        }
        if (currentDrag.handle.includes('n')) {
          const possibleH = Math.round(init.height - dy);
          if (possibleH >= minH) {
            height = possibleH;
            y = Math.round(init.y + dy);
          }
        }

        if (init.type === 'generalization') {
          const size = Math.max(width, height);
          width = size;
          height = size;
        }

        const nextShapes = currentDrag.initialState.shapes.map((s) =>
          s.id === currentDrag.shapeId ? { ...s, x, y, width, height } : s
        );
        onLiveStateChange({ ...currentDrag.initialState, shapes: nextShapes });
        return;
      }

      if (currentDrag.type === 'connect') {
        setDragContext({
          ...currentDrag,
          currentPt: worldPt,
        });
        return;
      }

      if (currentDrag.type === 'move-control-point') {
        currentDrag.hasMoved = true;
        const nextLines = currentDrag.baseState.lines.map((l) => {
          if (l.id !== currentDrag.lineId) return l;
          const nextPts = [...l.controlPoints];
          nextPts[currentDrag.pointIndex] = {
            x: Math.round(worldPt.x),
            y: Math.round(worldPt.y),
          };
          return { ...l, controlPoints: nextPts };
        });
        onLiveStateChange({ ...currentDrag.baseState, lines: nextLines });
        return;
      }

      if (currentDrag.type === 'move-ortho-segment') {
        const nextLines = currentDrag.initialState.lines.map((l) => {
          if (l.id !== currentDrag.lineId) return l;
          return {
            ...l,
            orthogonalManualOffset: Math.round(
              currentDrag.isHorizontalFirst ? worldPt.x : worldPt.y
            ),
          };
        });
        onLiveStateChange({ ...currentDrag.initialState, lines: nextLines });
        return;
      }

      if (currentDrag.type === 'move-line-label') {
        const dx = Math.round((e.clientX - currentDrag.startMouse.x) / zoomRef.current);
        const dy = Math.round((e.clientY - currentDrag.startMouse.y) / zoomRef.current);
        const newOffset = {
          x: currentDrag.initialOffset.x + dx,
          y: currentDrag.initialOffset.y + dy,
        };
        const nextLines = currentDrag.initialState.lines.map((l) => {
          if (l.id !== currentDrag.lineId) return l;
          if (currentDrag.part === 'start') {
            return { ...l, startLabelOffset: newOffset };
          }
          if (currentDrag.part === 'middle') {
            return { ...l, middleLabelOffset: newOffset };
          }
          return { ...l, endLabelOffset: newOffset };
        });
        onLiveStateChange({ ...currentDrag.initialState, lines: nextLines });
        return;
      }

      if (currentDrag.type === 'marquee') {
        setDragContext({
          ...currentDrag,
          currentWorld: worldPt,
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const currentDrag = dragRef.current;
      if (!currentDrag) return;

      if (currentDrag.type === 'move-shapes') {
        if (currentDrag.hasMoved) {
          onCommitState(stateRef.current);
        }
      } else if (
        currentDrag.type === 'resize-shape' ||
        currentDrag.type === 'move-control-point' ||
        currentDrag.type === 'move-ortho-segment' ||
        currentDrag.type === 'move-line-label'
      ) {
        onCommitState(stateRef.current);
      } else if (currentDrag.type === 'connect') {
        const worldPt = screenToWorld(e.clientX, e.clientY);
        const connectableShapes = stateRef.current.shapes.filter(
          (s) => s.type !== 'frame' && s.type !== 'text'
        );
        let hitShape: ERShape | null = null;
        let hitAnchor: AnchorId = 'auto';

        for (let i = connectableShapes.length - 1; i >= 0; i--) {
          const s = connectableShapes[i];
          const anchors = getShapeAnchors(s);
          for (const [aId, aPt] of Object.entries(anchors)) {
            if (Math.hypot(worldPt.x - aPt.x, worldPt.y - aPt.y) <= 16) {
              hitShape = s;
              hitAnchor = aId as AnchorId;
              break;
            }
          }
          if (hitShape) break;

          if (
            worldPt.x >= s.x - 8 &&
            worldPt.x <= s.x + s.width + 8 &&
            worldPt.y >= s.y - 8 &&
            worldPt.y <= s.y + s.height + 8
          ) {
            hitShape = s;
            hitAnchor = 'auto';
            break;
          }
        }

        if (
          hitShape &&
          (hitShape.id !== currentDrag.sourceId ||
            hitAnchor !== currentDrag.sourceAnchor)
        ) {
          const newLine: ERLine = {
            id: `line_${Math.random().toString(36).slice(2, 9)}`,
            sourceId: currentDrag.sourceId,
            targetId: hitShape.id,
            sourceAnchor: currentDrag.sourceAnchor,
            targetAnchor: hitAnchor,
            lineType: currentDrag.lineType,
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
          onCommitState({
            ...stateRef.current,
            lines: [...stateRef.current.lines, newLine],
          });
          onSelect([], [newLine.id]);
          if (activeTool !== 'select') {
            setActiveTool('select');
          }
        }
      } else if (currentDrag.type === 'marquee') {
        const x1 = Math.min(currentDrag.startWorld.x, currentDrag.currentWorld.x);
        const y1 = Math.min(currentDrag.startWorld.y, currentDrag.currentWorld.y);
        const x2 = Math.max(currentDrag.startWorld.x, currentDrag.currentWorld.x);
        const y2 = Math.max(currentDrag.startWorld.y, currentDrag.currentWorld.y);

        if (x2 - x1 > 6 || y2 - y1 > 6) {
          const hitShapes = stateRef.current.shapes
            .filter(
              (s) =>
                s.type !== 'frame' &&
                s.x + s.width >= x1 &&
                s.x <= x2 &&
                s.y + s.height >= y1 &&
                s.y <= y2
            )
            .map((s) => s.id);

          const shapeMap = new Map(stateRef.current.shapes.map((s) => [s.id, s]));
          const hitLines = stateRef.current.lines
            .filter((l) => {
              const src = shapeMap.get(l.sourceId);
              const tgt = shapeMap.get(l.targetId);
              if (!src || !tgt) return false;
              const pts = computeLinePoints(l, src, tgt);
              return pts.some((p) => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2);
            })
            .map((l) => l.id);

          onSelect(hitShapes, hitLines);
        }
      }

      setDragContext(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [Boolean(dragContext), activeTool]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rawType = e.dataTransfer.getData('application/er-shape-type') as ShapeType;
    if (!rawType) return;

    const worldPt = screenToWorld(e.clientX, e.clientY);
    const defaults = SHAPE_STYLE_CONSTANTS[rawType];
    const defaultLabels: Record<ShapeType, string> = {
      entity: 'entity',
      relationship: 'relates',
      attribute: 'attribute',
      generalization: 'd',
      text: 'Plain text annotation',
      frame: `Frame ${state.shapes.filter((s) => s.type === 'frame').length + 1}`,
    };

    const newShape: ERShape = {
      id: `${rawType}_${Math.random().toString(36).slice(2, 9)}`,
      type: rawType,
      x: Math.round(worldPt.x - defaults.defaultWidth / 2),
      y: Math.round(worldPt.y - defaults.defaultHeight / 2),
      width: defaults.defaultWidth,
      height: defaults.defaultHeight,
      text: defaultLabels[rawType],
      fontSize: defaults.defaultFontSize,
      isDouble: false,
      isUnderline: false,
      isBold: false,
      frameColor: '#3B82F6',
    };

    onCommitState({
      ...state,
      shapes:
        rawType === 'frame'
          ? [newShape, ...state.shapes]
          : [...state.shapes, newShape],
    });
    onSelect([newShape.id], []);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (inlineEdit) {
      commitInlineEdit();
    }
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setDragContext({
        type: 'pan',
        startMouse: { x: e.clientX, y: e.clientY },
        startPan: pan,
      });
      return;
    }

    if (
      e.target === e.currentTarget ||
      (e.target as Element).getAttribute('data-canvas-bg') === 'true'
    ) {
      const worldPt = screenToWorld(e.clientX, e.clientY);
      onSelect([], []);
      setDragContext({
        type: 'marquee',
        startWorld: worldPt,
        currentWorld: worldPt,
      });
    }
  };

  const startShapeMove = (e: React.MouseEvent, shape: ERShape) => {
    e.stopPropagation();
    if (inlineEdit) commitInlineEdit();

    // Frames require double-click to select/unlock before they can be dragged!
    if (shape.type === 'frame' && !selectedShapeIds.includes(shape.id)) {
      const worldPt = screenToWorld(e.clientX, e.clientY);
      onSelect([], []);
      setDragContext({
        type: 'marquee',
        startWorld: worldPt,
        currentWorld: worldPt,
      });
      return;
    }

    // If user is in Connect mode and clicks a shape body, start connection from 'auto'
    if (
      (activeTool === 'connect-straight' || activeTool === 'connect-orthogonal') &&
      shape.type !== 'frame' &&
      shape.type !== 'text'
    ) {
      const worldPt = screenToWorld(e.clientX, e.clientY);
      setDragContext({
        type: 'connect',
        sourceId: shape.id,
        sourceAnchor: 'auto',
        startPt: {
          x: shape.x + shape.width / 2,
          y: shape.y + shape.height / 2,
        },
        currentPt: worldPt,
        lineType: activeTool === 'connect-orthogonal' ? 'orthogonal' : 'straight',
      });
      return;
    }

    const isCtrlDuplicate = e.ctrlKey || e.metaKey;

    let nextSelectedShapes = [...selectedShapeIds];
    if (e.shiftKey) {
      if (nextSelectedShapes.includes(shape.id)) {
        nextSelectedShapes = nextSelectedShapes.filter((id) => id !== shape.id);
      } else {
        nextSelectedShapes.push(shape.id);
      }
      onSelect(nextSelectedShapes, selectedLineIds);
    } else if (!nextSelectedShapes.includes(shape.id)) {
      nextSelectedShapes = [shape.id];
      onSelect(nextSelectedShapes, []);
    }

    const movingIds = new Set<string>(nextSelectedShapes);

    // If dragging an unlocked Frame, also move shapes enclosed inside it
    for (const id of nextSelectedShapes) {
      const f = state.shapes.find((s) => s.id === id && s.type === 'frame');
      if (f) {
        for (const child of state.shapes) {
          if (
            child.id !== f.id &&
            child.x >= f.x &&
            child.y >= f.y &&
            child.x + child.width <= f.x + f.width &&
            child.y + child.height <= f.y + f.height
          ) {
            movingIds.add(child.id);
          }
        }
      }
    }

    setDragContext({
      type: 'move-shapes',
      startMouse: { x: e.clientX, y: e.clientY },
      initialState: state,
      movingIds,
      isCtrlDuplicate,
      hasMoved: false,
    });
  };

  const handleShapeDoubleClick = (e: React.MouseEvent, shape: ERShape) => {
    e.stopPropagation();
    // Double-clicking a Frame body/border selects & unlocks the frame for moving/resizing
    if (shape.type === 'frame') {
      onSelect([shape.id], []);
      return;
    }

    setInlineEdit({
      kind: 'shape',
      id: shape.id,
      value: shape.text,
      x: shape.x,
      y: shape.y,
      width: Math.max(70, shape.width),
      height: Math.max(40, shape.height),
      isGeneralization: shape.type === 'generalization',
    });
  };

  const handleFrameTitleDoubleClick = (e: React.MouseEvent, frame: ERShape) => {
    e.stopPropagation();
    onSelect([frame.id], []);
    setInlineEdit({
      kind: 'shape',
      id: frame.id,
      value: frame.text,
      x: frame.x + 12,
      y: frame.y - 16,
      width: Math.max(180, frame.width * 0.45),
      height: 28,
    });
  };

  const shapeMap = new Map<string, ERShape>();
  for (const s of state.shapes) {
    shapeMap.set(s.id, s);
  }

  const frames = state.shapes.filter((s) => s.type === 'frame');
  const foregroundShapes = state.shapes.filter((s) => s.type !== 'frame');

  const renderArrowheadSvg = (
    tip: Point,
    angleRad: number,
    style: ERLine['endArrow']
  ) => {
    if (style === 'none') return null;
    const deg = (angleRad * 180) / Math.PI;
    const size = 11;

    if (style === 'arrow') {
      return (
        <polygon
          points={`0,0 ${-size},${-size * 0.52} ${-size * 0.78},0 ${-size},${size * 0.52}`}
          fill="#111827"
          transform={`translate(${tip.x}, ${tip.y}) rotate(${deg})`}
        />
      );
    }
    if (style === 'triangle') {
      return (
        <polygon
          points={`0,0 ${-size},${-size * 0.55} ${-size},${size * 0.55}`}
          fill="#FFFFFF"
          stroke="#111827"
          strokeWidth={1.5}
          transform={`translate(${tip.x}, ${tip.y}) rotate(${deg})`}
        />
      );
    }
    if (style === 'open') {
      return (
        <polyline
          points={`${-size},${-size * 0.52} 0,0 ${-size},${size * 0.52}`}
          fill="none"
          stroke="#111827"
          strokeWidth={1.6}
          transform={`translate(${tip.x}, ${tip.y}) rotate(${deg})`}
        />
      );
    }
    if (style === 'circle') {
      return (
        <circle
          cx={-5}
          cy={0}
          r={4.5}
          fill="#FFFFFF"
          stroke="#111827"
          strokeWidth={1.5}
          transform={`translate(${tip.x}, ${tip.y}) rotate(${deg})`}
        />
      );
    }
    return null;
  };

  return (
    <main
      ref={containerRef}
      data-testid="er-diagram-canvas"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleCanvasMouseDown}
      className="relative flex-1 h-full bg-[#F8FAFC] overflow-hidden cursor-default"
      style={{
        backgroundImage:
          'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* World Space SVG & Interactive Overlay */}
      <svg data-canvas-bg="true" className="w-full h-full block">
        <g
          data-canvas-bg="true"
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
        >
          {/* 1. Bottom Layer: Frames (Require Double-Click to Select/Unlock) */}
          {frames.map((frame) => {
            const isSelected = selectedShapeIds.includes(frame.id);
            const borderColor = frame.frameColor || '#64748B';
            return (
              <g
                key={frame.id}
                data-shape-id={frame.id}
                data-shape-type="frame"
                data-frame-unlocked={isSelected ? 'true' : 'false'}
                onMouseDown={(e) => startShapeMove(e, frame)}
                onDoubleClick={(e) => handleShapeDoubleClick(e, frame)}
                className={isSelected ? 'cursor-move' : 'cursor-default'}
              >
                <rect
                  x={frame.x}
                  y={frame.y}
                  width={frame.width}
                  height={frame.height}
                  rx={8}
                  fill="rgba(241, 245, 249, 0.55)"
                  stroke={isSelected ? '#2563EB' : borderColor}
                  strokeWidth={isSelected ? 2.4 : 1.5}
                  strokeDasharray="7 4"
                />
                {/* Frame Title Tab (Double-click to edit title or unlock) */}
                <g
                  onDoubleClick={(e) => handleFrameTitleDoubleClick(e, frame)}
                  className="cursor-pointer"
                >
                  <rect
                    x={frame.x + 12}
                    y={frame.y - 13}
                    width={Math.max(110, (frame.text?.length || 8) * 7.8 + 24)}
                    height={25}
                    rx={5}
                    fill="#F8FAFC"
                    stroke={isSelected ? '#2563EB' : borderColor}
                    strokeWidth={1.3}
                  />
                  <text
                    x={frame.x + 22}
                    y={frame.y}
                    dominantBaseline="central"
                    fill="#1E293B"
                    fontSize={frame.fontSize}
                    fontWeight={600}
                  >
                    {frame.text || 'Frame'}
                  </text>
                </g>
              </g>
            );
          })}

          {/* 2. Middle Layer: Connection Lines */}
          {state.lines.map((line) => {
            const source = shapeMap.get(line.sourceId);
            const target = shapeMap.get(line.targetId);
            if (!source || !target) return null;

            const pts = computeLinePoints(line, source, target);
            if (pts.length < 2) return null;

            const pointsAttr = pts.map((p) => `${p.x},${p.y}`).join(' ');
            const isSelected = selectedLineIds.includes(line.id);
            const isHovered = hoveredLineId === line.id;

            const labelPos = computeLineLabelPositions(pts, line.labelPlacement, {
              start: line.startLabelOffset,
              middle: line.middleLabelOffset,
              end: line.endLabelOffset,
            });

            const startArrowAngle = Math.atan2(
              pts[0].y - pts[1].y,
              pts[0].x - pts[1].x
            );
            const endArrowAngle = Math.atan2(
              pts[pts.length - 1].y - pts[pts.length - 2].y,
              pts[pts.length - 1].x - pts[pts.length - 2].x
            );

            const dx = Math.abs(pts[pts.length - 1].x - pts[0].x);
            const dy = Math.abs(pts[pts.length - 1].y - pts[0].y);
            const isHorizontalFirst =
              line.sourceAnchor === 'left' ||
              line.sourceAnchor === 'right' ||
              line.sourceAnchor === 'left-top' ||
              line.sourceAnchor === 'left-bottom' ||
              line.sourceAnchor === 'right-top' ||
              line.sourceAnchor === 'right-bottom' ||
              (line.sourceAnchor === 'auto' && dx >= dy);

            return (
              <g
                key={line.id}
                data-line-id={line.id}
                onMouseEnter={() => setHoveredLineId(line.id)}
                onMouseLeave={() =>
                  setHoveredLineId((prev) => (prev === line.id ? null : prev))
                }
              >
                {/* Wide Invisible Hit Area for Selection, Alt+Click Bending & Double-Click */}
                <polyline
                  points={pointsAttr}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={18}
                  className="cursor-pointer"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    // Alt+Click directly on a straight line bends it at that segment!
                    if (e.altKey && line.lineType === 'straight') {
                      const worldPt = screenToWorld(e.clientX, e.clientY);
                      const { updatedLine, insertedIndex } =
                        insertBendPointAtClick(line, source, target, worldPt, false);
                      const updatedState: DiagramState = {
                        ...state,
                        lines: state.lines.map((l) =>
                          l.id === line.id ? updatedLine : l
                        ),
                      };
                      onSelect([], [line.id]);
                      onLiveStateChange(updatedState);
                      setDragContext({
                        type: 'move-control-point',
                        lineId: line.id,
                        pointIndex: insertedIndex,
                        baseState: updatedState,
                        hasMoved: false,
                      });
                      return;
                    }

                    if (e.shiftKey) {
                      const next = selectedLineIds.includes(line.id)
                        ? selectedLineIds.filter((id) => id !== line.id)
                        : [...selectedLineIds, line.id];
                      onSelect(selectedShapeIds, next);
                    } else {
                      onSelect([], [line.id]);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const worldPt = screenToWorld(e.clientX, e.clientY);
                    const dStart = Math.hypot(
                      worldPt.x - labelPos.start.x,
                      worldPt.y - labelPos.start.y
                    );
                    const dMid = Math.hypot(
                      worldPt.x - labelPos.middle.x,
                      worldPt.y - labelPos.middle.y
                    );
                    const dEnd = Math.hypot(
                      worldPt.x - labelPos.end.x,
                      worldPt.y - labelPos.end.y
                    );

                    if (dStart < dMid && dStart < dEnd) {
                      setInlineEdit({
                        kind: 'line-start',
                        id: line.id,
                        value: line.startLabel,
                        x: labelPos.start.x - 45,
                        y: labelPos.start.y - 16,
                        width: 90,
                        height: 32,
                      });
                    } else if (dEnd < dMid && dEnd < dStart) {
                      setInlineEdit({
                        kind: 'line-end',
                        id: line.id,
                        value: line.endLabel,
                        x: labelPos.end.x - 45,
                        y: labelPos.end.y - 16,
                        width: 90,
                        height: 32,
                      });
                    } else {
                      setInlineEdit({
                        kind: 'line-middle',
                        id: line.id,
                        value: line.middleLabel,
                        x: labelPos.middle.x - 60,
                        y: labelPos.middle.y - 16,
                        width: 120,
                        height: 32,
                      });
                    }
                  }}
                />

                {/* Selection Glow */}
                {isSelected && (
                  <polyline
                    points={pointsAttr}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth={line.isDouble ? 9 : 6}
                    strokeOpacity={0.28}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none"
                  />
                )}

                {/* Visible Line (Single or Double Lined) */}
                {line.isDouble ? (
                  <>
                    <polyline
                      points={pointsAttr}
                      fill="none"
                      stroke={isSelected ? '#1D4ED8' : '#111827'}
                      strokeWidth={5.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none"
                    />
                    <polyline
                      points={pointsAttr}
                      fill="none"
                      stroke="#F8FAFC"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none"
                    />
                  </>
                ) : (
                  <polyline
                    points={pointsAttr}
                    fill="none"
                    stroke={isSelected ? '#1D4ED8' : '#111827'}
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none"
                  />
                )}

                {/* Arrowheads */}
                {renderArrowheadSvg(pts[0], startArrowAngle, line.startArrow)}
                {renderArrowheadSvg(
                  pts[pts.length - 1],
                  endArrowAngle,
                  line.endArrow
                )}

                {/* Line Labels (Start Cardinality, Middle Role, End Cardinality) */}
                {(
                  [
                    {
                      part: 'start' as const,
                      text: line.startLabel,
                      pos: labelPos.start,
                      offset: line.startLabelOffset ?? { x: 0, y: 0 },
                      placeholder: '+Start',
                    },
                    {
                      part: 'middle' as const,
                      text: line.middleLabel,
                      pos: !line.middleLabel.trim()
                        ? { x: labelPos.middle.x, y: labelPos.middle.y - 18 }
                        : labelPos.middle,
                      offset: line.middleLabelOffset ?? { x: 0, y: 0 },
                      placeholder: '+Role',
                    },
                    {
                      part: 'end' as const,
                      text: line.endLabel,
                      pos: labelPos.end,
                      offset: line.endLabelOffset ?? { x: 0, y: 0 },
                      placeholder: '+End',
                    },
                  ]
                ).map(({ part, text, pos, offset, placeholder }) => {
                  const hasText = text.trim().length > 0;
                  if (!hasText && !isSelected) return null;

                  const displayStr = hasText ? text : placeholder;
                  const estWidth = Math.max(
                    22,
                    displayStr.length * (line.fontSize * 0.62) + 10
                  );
                  const estHeight = line.fontSize + 8;

                  return (
                    <g
                      key={part}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSelect([], [line.id]);
                        setDragContext({
                          type: 'move-line-label',
                          lineId: line.id,
                          part,
                          startMouse: { x: e.clientX, y: e.clientY },
                          initialOffset: offset,
                          initialState: state,
                        });
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setInlineEdit({
                          kind:
                            part === 'start'
                              ? 'line-start'
                              : part === 'middle'
                                ? 'line-middle'
                                : 'line-end',
                          id: line.id,
                          value: text,
                          x: pos.x - 52,
                          y: pos.y - 16,
                          width: 104,
                          height: 32,
                        });
                      }}
                    >
                      {(line.labelPlacement === 'on-line' || !hasText) && (
                        <rect
                          x={-estWidth / 2}
                          y={-estHeight / 2}
                          width={estWidth}
                          height={estHeight}
                          rx={4}
                          fill={hasText ? '#F8FAFC' : '#EFF6FF'}
                          stroke={
                            !hasText
                              ? '#93C5FD'
                              : isSelected
                                ? '#BFDBFE'
                                : 'none'
                          }
                          strokeWidth={1}
                        />
                      )}
                      <text
                        x={0}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={hasText ? '#0F172A' : '#2563EB'}
                        fontSize={hasText ? line.fontSize : 10}
                        fontWeight={line.isBold ? 700 : 500}
                        textDecoration={line.isUnderline ? 'underline' : 'none'}
                      >
                        {displayStr}
                      </text>
                    </g>
                  );
                })}

                {/* Interactive Segment Midpoints & Control Points for Straight Lines */}
                {line.lineType === 'straight' && (
                  <>
                    {/* Segment Midpoint Handles (Drag or Alt+Click to bend line) */}
                    {!(
                      dragContext?.type === 'move-control-point' &&
                      dragContext.lineId === line.id
                    ) &&
                      pts.slice(0, -1).map((p1, segIdx) => {
                        const p2 = pts[segIdx + 1];
                        const mx = Math.round((p1.x + p2.x) / 2);
                        const my = Math.round((p1.y + p2.y) / 2);
                        const isProminent = isSelected || isHovered;
                        return (
                          <g
                            key={`mid_${segIdx}`}
                            className="cursor-move"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              onSelect([], [line.id]);
                              const initialBendPt = { x: mx, y: my };
                              const nextControlPoints = [...line.controlPoints];
                              nextControlPoints.splice(segIdx, 0, initialBendPt);
                              const updatedState: DiagramState = {
                                ...state,
                                lines: state.lines.map((l) =>
                                  l.id === line.id
                                    ? { ...l, controlPoints: nextControlPoints }
                                    : l
                                ),
                              };
                              onLiveStateChange(updatedState);
                              setDragContext({
                                type: 'move-control-point',
                                lineId: line.id,
                                pointIndex: segIdx,
                                baseState: updatedState,
                                hasMoved: false,
                              });
                            }}
                          >
                            {/* Generous invisible hit area so midpoint is easy to grab */}
                            <circle
                              cx={mx}
                              cy={my}
                              r={12}
                              fill="transparent"
                            />
                            <circle
                              data-testid={`line-midpoint-${line.id}-${segIdx}`}
                              cx={mx}
                              cy={my}
                              r={isProminent ? 6 : 4.5}
                              fill="#2563EB"
                              fillOpacity={isProminent ? 1 : 0.75}
                              stroke="#FFFFFF"
                              strokeWidth={1.8}
                            >
                              <title>Drag midpoint to bend line</title>
                            </circle>
                          </g>
                        );
                      })}

                    {/* Existing User Control Points (Drag to move, Alt+Click or Double-click to delete) */}
                    {line.controlPoints.map((cp, cpIdx) => (
                      <polygon
                        key={`cp_${cpIdx}`}
                        data-testid={`line-control-point-${line.id}-${cpIdx}`}
                        points={`${cp.x},${cp.y - 7} ${cp.x + 7},${cp.y} ${cp.x},${cp.y + 7} ${cp.x - 7},${cp.y}`}
                        fill="#F59E0B"
                        stroke="#FFFFFF"
                        strokeWidth={1.6}
                        className="cursor-move"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (e.altKey) {
                            // Alt+Clicking an existing bend point removes it
                            const nextControlPoints = line.controlPoints.filter(
                              (_, idx) => idx !== cpIdx
                            );
                            onCommitState({
                              ...state,
                              lines: state.lines.map((l) =>
                                l.id === line.id
                                  ? { ...l, controlPoints: nextControlPoints }
                                  : l
                              ),
                            });
                            return;
                          }
                          onSelect([], [line.id]);
                          setDragContext({
                            type: 'move-control-point',
                            lineId: line.id,
                            pointIndex: cpIdx,
                            baseState: state,
                            hasMoved: false,
                          });
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          const nextControlPoints = line.controlPoints.filter(
                            (_, idx) => idx !== cpIdx
                          );
                          onCommitState({
                            ...state,
                            lines: state.lines.map((l) =>
                              l.id === line.id
                                ? { ...l, controlPoints: nextControlPoints }
                                : l
                            ),
                          });
                        }}
                      >
                        <title>Drag to adjust bend (Double-click or Alt+Click to remove)</title>
                      </polygon>
                    ))}
                  </>
                )}

                {/* Orthogonal Middle Segment Handle */}
                {isSelected && line.lineType === 'orthogonal' && pts.length === 4 && (
                  <rect
                    x={(pts[1].x + pts[2].x) / 2 - 6}
                    y={(pts[1].y + pts[2].y) / 2 - 6}
                    width={12}
                    height={12}
                    rx={3}
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                    className={
                      isHorizontalFirst ? 'cursor-ew-resize' : 'cursor-ns-resize'
                    }
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragContext({
                        type: 'move-ortho-segment',
                        lineId: line.id,
                        isHorizontalFirst,
                        initialState: state,
                      });
                    }}
                  >
                    <title>Drag to adjust orthogonal segment</title>
                  </rect>
                )}
              </g>
            );
          })}

          {/* Active Connection Preview Line */}
          {dragContext?.type === 'connect' && (
            <line
              x1={dragContext.startPt.x}
              y1={dragContext.startPt.y}
              x2={dragContext.currentPt.x}
              y2={dragContext.currentPt.y}
              stroke="#2563EB"
              strokeWidth={2}
              strokeDasharray="5 4"
              className="pointer-events-none"
            />
          )}

          {/* 3. Top Layer: ER Shapes (Entity, Relationship, Attribute, Generalization, Text) */}
          {foregroundShapes.map((shape) => {
            const isSelected = selectedShapeIds.includes(shape.id);
            const isHovered = hoveredShapeId === shape.id;
            const cx = shape.x + shape.width / 2;
            const cy = shape.y + shape.height / 2;
            const showAnchors =
              shape.type !== 'text' &&
              (isSelected ||
                isHovered ||
                activeTool === 'connect-straight' ||
                activeTool === 'connect-orthogonal' ||
                dragContext?.type === 'connect');

            const anchors = getShapeAnchors(shape);
            const linesOfText = (shape.text || '').split('\n');
            const lineHeight = shape.fontSize * 1.25;
            const textStartY =
              cy - ((linesOfText.length - 1) * lineHeight) / 2;

            return (
              <g
                key={shape.id}
                data-shape-id={shape.id}
                data-shape-type={shape.type}
                onMouseEnter={() => setHoveredShapeId(shape.id)}
                onMouseLeave={() =>
                  setHoveredShapeId((prev) => (prev === shape.id ? null : prev))
                }
                onMouseDown={(e) => startShapeMove(e, shape)}
                onDoubleClick={(e) => handleShapeDoubleClick(e, shape)}
                className="cursor-move"
              >
                {/* Entity: Dark-Red Rectangle with Black Text */}
                {shape.type === 'entity' && (
                  <>
                    <rect
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      fill={SHAPE_STYLE_CONSTANTS.entity.fill}
                      stroke={
                        isSelected
                          ? '#2563EB'
                          : SHAPE_STYLE_CONSTANTS.entity.stroke
                      }
                      strokeWidth={isSelected ? 2.2 : 1.5}
                    />
                    {shape.isDouble && (
                      <rect
                        x={shape.x + 5}
                        y={shape.y + 5}
                        width={Math.max(4, shape.width - 10)}
                        height={Math.max(4, shape.height - 10)}
                        fill="none"
                        stroke={SHAPE_STYLE_CONSTANTS.entity.stroke}
                        strokeWidth={1.5}
                      />
                    )}
                  </>
                )}

                {/* Relationship: Green Rhombus with White Text */}
                {shape.type === 'relationship' && (
                  <>
                    <polygon
                      points={`${cx},${shape.y} ${shape.x + shape.width},${cy} ${cx},${shape.y + shape.height} ${shape.x},${cy}`}
                      fill={SHAPE_STYLE_CONSTANTS.relationship.fill}
                      stroke={
                        isSelected
                          ? '#2563EB'
                          : SHAPE_STYLE_CONSTANTS.relationship.stroke
                      }
                      strokeWidth={isSelected ? 2.2 : 1.5}
                    />
                    {shape.isDouble && (
                      <polygon
                        points={`${cx},${shape.y + 6} ${shape.x + shape.width - 8.5},${cy} ${cx},${shape.y + shape.height - 6} ${shape.x + 8.5},${cy}`}
                        fill="none"
                        stroke="#143304"
                        strokeWidth={1.4}
                      />
                    )}
                  </>
                )}

                {/* Attribute: Light-Yellow Oval with Black Text */}
                {shape.type === 'attribute' && (
                  <>
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={shape.width / 2}
                      ry={shape.height / 2}
                      fill={SHAPE_STYLE_CONSTANTS.attribute.fill}
                      stroke={
                        isSelected
                          ? '#2563EB'
                          : SHAPE_STYLE_CONSTANTS.attribute.stroke
                      }
                      strokeWidth={isSelected ? 2.2 : 1.4}
                      strokeDasharray={shape.isDerived ? '5 4' : undefined}
                    />
                    {shape.isDouble && (
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx={Math.max(2, shape.width / 2 - 4.5)}
                        ry={Math.max(2, shape.height / 2 - 4.5)}
                        fill="none"
                        stroke={SHAPE_STYLE_CONSTANTS.attribute.stroke}
                        strokeWidth={1.3}
                        strokeDasharray={shape.isDerived ? '5 4' : undefined}
                      />
                    )}
                  </>
                )}

                {/* Generalization: Blue Circle with White Text ("", "d", or "o") */}
                {shape.type === 'generalization' && (
                  <>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={Math.min(shape.width, shape.height) / 2}
                      fill={SHAPE_STYLE_CONSTANTS.generalization.fill}
                      stroke={
                        isSelected
                          ? '#1E40AF'
                          : SHAPE_STYLE_CONSTANTS.generalization.stroke
                      }
                      strokeWidth={isSelected ? 2.4 : 1.5}
                    />
                    {shape.isDouble && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={Math.max(2, Math.min(shape.width, shape.height) / 2 - 4)}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth={1.3}
                      />
                    )}
                  </>
                )}

                {/* Plain Text Annotation */}
                {shape.type === 'text' && (
                  <rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    rx={4}
                    fill={isSelected ? 'rgba(239, 246, 255, 0.5)' : 'transparent'}
                    stroke={isSelected ? '#3B82F6' : isHovered ? '#CBD5E1' : 'transparent'}
                    strokeWidth={1.2}
                    strokeDasharray="4 3"
                  />
                )}

                {/* Shape Text Label */}
                {inlineEdit?.id !== shape.id &&
                  linesOfText.map((lineStr, idx) => {
                    const yPos = textStartY + idx * lineHeight;
                    const textColor =
                      SHAPE_STYLE_CONSTANTS[shape.type].textColor;
                    const isLeftAlign = shape.type === 'text';
                    return (
                      <text
                        key={idx}
                        x={isLeftAlign ? shape.x + 8 : cx}
                        y={yPos}
                        textAnchor={isLeftAlign ? 'start' : 'middle'}
                        dominantBaseline="central"
                        fill={textColor}
                        fontSize={shape.fontSize}
                        fontWeight={shape.isBold ? 700 : 500}
                        textDecoration={
                          shape.isUnderline ? 'underline' : 'none'
                        }
                        className="pointer-events-none select-none"
                      >
                        {lineStr}
                      </text>
                    );
                  })}

                {/* Perimeter Anchor Points for Connecting Lines */}
                {showAnchors &&
                  VISIBLE_ANCHORS.map((anchorKey) => {
                    const pt = anchors[anchorKey];
                    return (
                      <circle
                        key={anchorKey}
                        cx={pt.x}
                        cy={pt.y}
                        r={4.5}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={1.8}
                        className="cursor-crosshair hover:fill-blue-600 transition-colors"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDragContext({
                            type: 'connect',
                            sourceId: shape.id,
                            sourceAnchor: anchorKey,
                            startPt: pt,
                            currentPt: pt,
                            lineType:
                              activeTool === 'connect-orthogonal'
                                ? 'orthogonal'
                                : 'straight',
                          });
                        }}
                      >
                        <title>Drag to connect from {anchorKey} anchor</title>
                      </circle>
                    );
                  })}
              </g>
            );
          })}

          {/* 4. Selection Bounding Box & Resize Handles for Selected Single Shape / Frame */}
          {selectedShapeIds.length === 1 &&
            (() => {
              const selShape = shapeMap.get(selectedShapeIds[0]);
              if (!selShape) return null;
              const { x, y, width: w, height: h } = selShape;
              const handles: {
                id: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
                hx: number;
                hy: number;
                cursor: string;
              }[] = [
                { id: 'nw', hx: x, hy: y, cursor: 'cursor-nwse-resize' },
                { id: 'n', hx: x + w / 2, hy: y, cursor: 'cursor-ns-resize' },
                { id: 'ne', hx: x + w, hy: y, cursor: 'cursor-nesw-resize' },
                { id: 'e', hx: x + w, hy: y + h / 2, cursor: 'cursor-ew-resize' },
                { id: 'se', hx: x + w, hy: y + h, cursor: 'cursor-nwse-resize' },
                { id: 's', hx: x + w / 2, hy: y + h, cursor: 'cursor-ns-resize' },
                { id: 'sw', hx: x, hy: y + h, cursor: 'cursor-nesw-resize' },
                { id: 'w', hx: x, hy: y + h / 2, cursor: 'cursor-ew-resize' },
              ];

              return (
                <g>
                  <rect
                    x={x - 2}
                    y={y - 2}
                    width={w + 4}
                    height={h + 4}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={1.2}
                    strokeDasharray="3 3"
                    className="pointer-events-none"
                  />
                  {handles.map((hItem) => (
                    <rect
                      key={hItem.id}
                      x={hItem.hx - 4}
                      y={hItem.hy - 4}
                      width={8}
                      height={8}
                      rx={1.5}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth={1.2}
                      className={hItem.cursor}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragContext({
                          type: 'resize-shape',
                          shapeId: selShape.id,
                          handle: hItem.id,
                          startMouse: { x: e.clientX, y: e.clientY },
                          initialShape: selShape,
                          initialState: state,
                        });
                      }}
                    />
                  ))}
                </g>
              );
            })()}

          {/* Marquee Selection Box */}
          {dragContext?.type === 'marquee' && (
            <rect
              x={Math.min(dragContext.startWorld.x, dragContext.currentWorld.x)}
              y={Math.min(dragContext.startWorld.y, dragContext.currentWorld.y)}
              width={Math.abs(dragContext.currentWorld.x - dragContext.startWorld.x)}
              height={Math.abs(dragContext.currentWorld.y - dragContext.startWorld.y)}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="#2563EB"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              className="pointer-events-none"
            />
          )}
        </g>
      </svg>

      {/* Inline Text Editor Overlay (on Double-Click of Shape, Frame Title, or Line) */}
      {inlineEdit && (
        <div
          style={{
            position: 'absolute',
            left: `${pan.x + inlineEdit.x * zoom}px`,
            top: `${pan.y + inlineEdit.y * zoom}px`,
            width: `${Math.max(96, inlineEdit.width * zoom)}px`,
            minHeight: `${Math.max(34, inlineEdit.height * zoom)}px`,
          }}
          className="z-30 flex items-center justify-center"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {inlineEdit.isGeneralization ? (
            <div className="bg-white border-2 border-blue-600 rounded-lg shadow-lg p-1 flex items-center gap-1">
              {(['', 'd', 'o'] as const).map((val) => (
                <button
                  key={val || 'blank'}
                  type="button"
                  onClick={() => {
                    const nextShapes = state.shapes.map((s) =>
                      s.id === inlineEdit.id ? { ...s, text: val } : s
                    );
                    onCommitState({ ...state, shapes: nextShapes });
                    setInlineEdit(null);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded ${
                    inlineEdit.value === val
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {val === '' ? 'Blank' : val}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              autoFocus
              aria-label="Inline Element Text Editor"
              value={inlineEdit.value}
              onChange={(e) =>
                setInlineEdit({ ...inlineEdit, value: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  commitInlineEdit();
                } else if (e.key === 'Escape') {
                  setInlineEdit(null);
                }
              }}
              onBlur={commitInlineEdit}
              className="w-full h-full px-2 py-1 text-center text-sm font-medium text-slate-900 bg-white/95 border-2 border-blue-600 rounded-md shadow-md focus:outline-none resize-none"
            />
          )}
        </div>
      )}

      {/* Empty Canvas State Overlay */}
      {state.shapes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 border border-slate-200 rounded-xl p-6 max-w-md text-center space-y-2 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-800">
              Blank ER Modeling Page
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Drag or click <strong>Entity</strong>, <strong>Relationship</strong>, <strong>Attribute</strong>, <strong>Generalization</strong>, <strong>Plain Text</strong>, or <strong>Frame</strong> from the left palette to start building your diagram.
            </p>
          </div>
        </div>
      )}
    </main>
  );
};
