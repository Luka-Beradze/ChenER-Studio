import React from 'react';
import { type ShapeType } from '../utils/erModel.ts';
import {
  Plus,
  MousePointer,
  GitCommitHorizontal,
  CornerDownRight,
  Type,
} from 'lucide-react';

interface LeftPaletteProps {
  activeTool: 'select' | 'connect-straight' | 'connect-orthogonal';
  setActiveTool: (tool: 'select' | 'connect-straight' | 'connect-orthogonal') => void;
  onAddShape: (type: ShapeType) => void;
  isSimpleUI?: boolean;
  isDarkMode?: boolean;
}

export const LeftPalette: React.FC<LeftPaletteProps> = ({
  activeTool,
  setActiveTool,
  onAddShape,
  isSimpleUI = false,
  isDarkMode = false,
}) => {
  const handleDragStart = (e: React.DragEvent, type: ShapeType) => {
    e.dataTransfer.setData('application/er-shape-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (isSimpleUI) {
    const toolBtnClass = (isActive: boolean) =>
      `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
        isActive
          ? isDarkMode
            ? 'bg-blue-600 text-white shadow-xs'
            : 'bg-slate-900 text-white shadow-xs'
          : isDarkMode
            ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
      }`;

    const shapeBtnClass = `w-11 h-11 rounded-lg border flex items-center justify-center transition-all cursor-grab active:cursor-grabbing ${
      isDarkMode
        ? 'border-slate-700 bg-slate-800/70 hover:bg-slate-800 hover:border-slate-600'
        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300'
    }`;

    return (
      <aside
        aria-label="Diagram Elements Palette"
        className={`w-16 shrink-0 border-r flex flex-col items-center py-3 gap-3 h-full select-none z-10 overflow-y-auto transition-colors ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Icon-Only Interaction Tools */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            aria-label="Select & Move (V)"
            title="Select & Move (V)"
            className={toolBtnClass(activeTool === 'select')}
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('connect-straight')}
            aria-label="Connect Straight Line (L)"
            title="Connect Straight Line (L)"
            className={toolBtnClass(activeTool === 'connect-straight')}
          >
            <GitCommitHorizontal className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('connect-orthogonal')}
            aria-label="Connect Orthogonal Line (O)"
            title="Connect Orthogonal Line (O)"
            className={toolBtnClass(activeTool === 'connect-orthogonal')}
          >
            <CornerDownRight className="w-4 h-4" />
          </button>
        </div>

        <hr
          className={`w-9 ${
            isDarkMode ? 'border-slate-800' : 'border-slate-200'
          }`}
        />

        {/* Small Unlabeled ER Shapes */}
        <div className="flex flex-col items-center gap-2">
          {/* 1. Entity: Small dark-red rectangle */}
          <button
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, 'entity')}
            onClick={() => onAddShape('entity')}
            aria-label="Add Entity"
            title="Entity (Drag or Click)"
            className={shapeBtnClass}
          >
            <svg width="28" height="18" viewBox="0 0 28 18">
              <rect
                x="2"
                y="2"
                width="24"
                height="14"
                fill="#C80032"
                stroke="#5C0016"
                strokeWidth="1.5"
              />
            </svg>
          </button>

          {/* 2. Relationship: Small green rhombus */}
          <button
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, 'relationship')}
            onClick={() => onAddShape('relationship')}
            aria-label="Add Relationship"
            title="Relationship (Drag or Click)"
            className={shapeBtnClass}
          >
            <svg width="28" height="20" viewBox="0 0 28 20">
              <polygon
                points="14,2 26,10 14,18 2,10"
                fill="#4C9F1A"
                stroke="#245209"
                strokeWidth="1.5"
              />
            </svg>
          </button>

          {/* 3. Attribute: Small light-yellow oval */}
          <button
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, 'attribute')}
            onClick={() => onAddShape('attribute')}
            aria-label="Add Attribute"
            title="Attribute (Drag or Click)"
            className={shapeBtnClass}
          >
            <svg width="28" height="18" viewBox="0 0 28 18">
              <ellipse
                cx="14"
                cy="9"
                rx="12"
                ry="7"
                fill="#FFFF99"
                stroke="#262626"
                strokeWidth="1.4"
              />
            </svg>
          </button>

          {/* 4. Generalization: Small blue circle */}
          <button
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, 'generalization')}
            onClick={() => onAddShape('generalization')}
            aria-label="Add Generalization"
            title="Generalization (Drag or Click)"
            className={shapeBtnClass}
          >
            <svg width="22" height="22" viewBox="0 0 22 22">
              <circle
                cx="11"
                cy="11"
                r="8.5"
                fill="#2563EB"
                stroke="#1E3A8A"
                strokeWidth="1.5"
              />
            </svg>
          </button>

          {/* 5. Plain Text: Icon only */}
          <button
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, 'text')}
            onClick={() => onAddShape('text')}
            aria-label="Add Plain Text"
            title="Plain Text (Drag or Click)"
            className={shapeBtnClass}
          >
            <Type
              className={`w-4 h-4 ${
                isDarkMode ? 'text-slate-200' : 'text-slate-700'
              }`}
            />
          </button>

          {/* 6. Frame: Small dashed frame shape */}
          <button
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, 'frame')}
            onClick={() => onAddShape('frame')}
            aria-label="Add Frame"
            title="Frame (Drag or Click)"
            className={shapeBtnClass}
          >
            <svg width="26" height="20" viewBox="0 0 26 20">
              <rect
                x="2"
                y="4"
                width="22"
                height="14"
                rx="2"
                fill="none"
                stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                strokeWidth="1.4"
                strokeDasharray="3 2"
              />
              <rect
                x="4"
                y="1.5"
                width="10"
                height="4"
                rx="1"
                fill={isDarkMode ? '#334155' : '#E2E8F0'}
                stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                strokeWidth="1"
              />
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Diagram Elements Palette"
      className={`w-64 shrink-0 border-r flex flex-col h-full select-none z-10 overflow-y-auto transition-colors ${
        isDarkMode
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <div className="p-4 space-y-5">
        {/* Interaction Mode Section */}
        <div>
          <h2
            className={`text-xs font-semibold tracking-tight mb-2.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Cursor & Connection Tool
          </h2>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTool === 'select'
                  ? isDarkMode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-900 text-white shadow-xs'
                  : isDarkMode
                    ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-800 border border-slate-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <MousePointer className="w-3.5 h-3.5" />
                Select & Move
              </span>
              <kbd className="text-[10px] font-mono opacity-75">V</kbd>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('connect-straight')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTool === 'connect-straight'
                  ? isDarkMode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-900 text-white shadow-xs'
                  : isDarkMode
                    ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-800 border border-slate-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <GitCommitHorizontal className="w-3.5 h-3.5" />
                Connect Straight Line
              </span>
              <kbd className="text-[10px] font-mono opacity-75">L</kbd>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('connect-orthogonal')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTool === 'connect-orthogonal'
                  ? isDarkMode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-900 text-white shadow-xs'
                  : isDarkMode
                    ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-800 border border-slate-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <CornerDownRight className="w-3.5 h-3.5" />
                Connect Orthogonal Line
              </span>
              <kbd className="text-[10px] font-mono opacity-75">O</kbd>
            </button>
          </div>
        </div>

        <hr className={isDarkMode ? 'border-slate-800' : 'border-slate-200'} />

        {/* ER Shapes Palette (Drag & Drop or Click) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2
              className={`text-xs font-semibold tracking-tight ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              ER Elements (Drag or Click)
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Entity: Dark-red rectangle with black text */}
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, 'entity')}
              onClick={() => onAddShape('entity')}
              aria-label="Add Entity"
              className={`group flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              <svg width="84" height="40" viewBox="0 0 84 40" className="mb-1.5 overflow-visible">
                <rect
                  x="6"
                  y="5"
                  width="72"
                  height="30"
                  fill="#C80032"
                  stroke="#5C0016"
                  strokeWidth="1.5"
                />
                <text
                  x="42"
                  y="20"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#000000"
                  fontSize="11"
                  fontWeight="600"
                >
                  Entity
                </text>
              </svg>
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Entity <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>

            {/* 2. Relationship: Green rhombus with white text */}
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, 'relationship')}
              onClick={() => onAddShape('relationship')}
              aria-label="Add Relationship"
              className={`group flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              <svg width="84" height="40" viewBox="0 0 84 40" className="mb-1.5 overflow-visible">
                <polygon
                  points="42,2 80,20 42,38 4,20"
                  fill="#4C9F1A"
                  stroke="#245209"
                  strokeWidth="1.5"
                />
                <text
                  x="42"
                  y="20"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="600"
                >
                  Relates
                </text>
              </svg>
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Relationship <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>

            {/* 3. Attribute: Light-yellow oval with black text */}
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, 'attribute')}
              onClick={() => onAddShape('attribute')}
              aria-label="Add Attribute"
              className={`group flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              <svg width="84" height="40" viewBox="0 0 84 40" className="mb-1.5 overflow-visible">
                <ellipse
                  cx="42"
                  cy="20"
                  rx="36"
                  ry="15"
                  fill="#FFFF99"
                  stroke="#262626"
                  strokeWidth="1.4"
                />
                <text
                  x="42"
                  y="20"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#000000"
                  fontSize="10.5"
                  fontWeight="500"
                  textDecoration="underline"
                >
                  attr_id
                </text>
              </svg>
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Attribute <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>

            {/* 4. Generalization: Blue circle with white text ("", "d", or "o") */}
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, 'generalization')}
              onClick={() => onAddShape('generalization')}
              aria-label="Add Generalization"
              className={`group flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              <svg width="84" height="40" viewBox="0 0 84 40" className="mb-1.5 overflow-visible">
                <circle
                  cx="42"
                  cy="20"
                  r="16"
                  fill="#2563EB"
                  stroke="#1E3A8A"
                  strokeWidth="1.5"
                />
                <text
                  x="42"
                  y="20"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#FFFFFF"
                  fontSize="12"
                  fontWeight="700"
                >
                  d / o
                </text>
              </svg>
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Generalization <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>

            {/* 5. Plain Text Annotation */}
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, 'text')}
              onClick={() => onAddShape('text')}
              aria-label="Add Plain Text"
              className={`group flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              <div className="h-[40px] flex items-center justify-center mb-1.5">
                <span
                  className={`text-sm font-semibold border-b border-dashed px-1.5 ${
                    isDarkMode
                      ? 'text-slate-200 border-slate-500'
                      : 'text-slate-800 border-slate-400'
                  }`}
                >
                  Abc Text
                </span>
              </div>
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Plain Text <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>

            {/* 6. Distinguishable Frame */}
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, 'frame')}
              onClick={() => onAddShape('frame')}
              aria-label="Add Frame"
              className={`group flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              <svg width="84" height="40" viewBox="0 0 84 40" className="mb-1.5 overflow-visible">
                <rect
                  x="8"
                  y="7"
                  width="68"
                  height="28"
                  rx="4"
                  fill={isDarkMode ? '#1E293B' : '#F1F5F9'}
                  stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                  strokeWidth="1.4"
                  strokeDasharray="4 2"
                />
                <rect
                  x="12"
                  y="3"
                  width="32"
                  height="9"
                  rx="2"
                  fill={isDarkMode ? '#334155' : '#E2E8F0'}
                  stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                  strokeWidth="1"
                />
              </svg>
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Frame <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>
          </div>
        </div>

        <hr className={isDarkMode ? 'border-slate-800' : 'border-slate-200'} />

        {/* Keyboard Shortcuts Reference */}
        <div className="space-y-2">
          <h2
            className={`text-xs font-semibold tracking-tight ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Keyboard Shortcuts
          </h2>
          <div
            className={`space-y-1.5 text-xs ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {[
              { label: 'Double line / outline', key: 'D', isKbd: true },
              { label: 'Underline text (Key)', key: 'U', isKbd: true },
              { label: 'Bold text', key: 'B', isKbd: true },
              { label: 'Duplicate selected', key: 'Ctrl+Drag', isKbd: false },
              { label: 'Bend line segment', key: 'Alt+Click', isKbd: false },
              { label: 'Select / move frame', key: 'Double-Click', isKbd: false },
              { label: 'Undo / Redo', key: 'Ctrl+Z / Y', isKbd: false },
              { label: 'Delete selected', key: 'Del', isKbd: true },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-0.5"
              >
                <span>{item.label}</span>
                {item.isKbd ? (
                  <kbd
                    className={`px-1.5 py-0.5 text-[11px] font-mono rounded border ${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-200 border-slate-700'
                        : 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    {item.key}
                  </kbd>
                ) : (
                  <span
                    className={`text-[11px] font-mono ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {item.key}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
