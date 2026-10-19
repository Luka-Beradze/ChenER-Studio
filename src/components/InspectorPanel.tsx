import React from 'react';
import {
  type ERShape,
  type ERLine,
  type GeneralizationValue,
  type ArrowHeadStyle,
  type LabelPlacement,
  type AnchorId,
  normalizeGeneralizationText,
} from '../utils/erModel.ts';
import {
  Sliders,
  Trash2,
  Download,
  FileText,
  RotateCcw,
  Bold,
  Underline,
  Equal,
} from 'lucide-react';

interface InspectorPanelProps {
  selectedShapes: ERShape[];
  selectedLines: ERLine[];
  allFrames: ERShape[];
  onUpdateShape: (id: string, patch: Partial<ERShape>) => void;
  onUpdateLine: (id: string, patch: Partial<ERLine>) => void;
  onToggleDouble: () => void;
  onToggleUnderline: () => void;
  onToggleBold: () => void;
  onDeleteSelected: () => void;
  onExportFramePng: (frameId: string, frameTitle: string) => void;
  onExportFramePdf: (frameId: string, frameTitle: string) => void;
  isSimpleUI?: boolean;
  isDarkMode?: boolean;
}

const CARDINALITY_PRESETS = ['1', 'N', 'M', '(0,1)', '(1,1)', '(0,*)', '(1,*)'];

const ARROW_OPTIONS: { value: ArrowHeadStyle; label: string }[] = [
  { value: 'none', label: 'None (Standard ER)' },
  { value: 'arrow', label: 'Filled Arrow' },
  { value: 'open', label: 'Open Arrow' },
  { value: 'triangle', label: 'Hollow Triangle' },
  { value: 'circle', label: 'Circle' },
];

const ANCHOR_OPTIONS: { value: AnchorId; label: string }[] = [
  { value: 'auto', label: 'Auto Perimeter' },
  { value: 'top', label: 'Top Center' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'right', label: 'Right Center' },
  { value: 'right-top', label: 'Right Upper' },
  { value: 'right-bottom', label: 'Right Lower' },
  { value: 'bottom', label: 'Bottom Center' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'left', label: 'Left Center' },
  { value: 'left-top', label: 'Left Upper' },
  { value: 'left-bottom', label: 'Left Lower' },
];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedShapes,
  selectedLines,
  allFrames,
  onUpdateShape,
  onUpdateLine,
  onToggleDouble,
  onToggleUnderline,
  onToggleBold,
  onDeleteSelected,
  onExportFramePng,
  onExportFramePdf,
  isSimpleUI = false,
  isDarkMode = false,
}) => {
  const singleShape =
    selectedShapes.length === 1 && selectedLines.length === 0
      ? selectedShapes[0]
      : null;
  const singleLine =
    selectedLines.length === 1 && selectedShapes.length === 0
      ? selectedLines[0]
      : null;
  const totalSelected = selectedShapes.length + selectedLines.length;

  const inputClass = `w-full px-2 py-1.5 rounded-md border focus:outline-none ${
    isDarkMode
      ? 'border-slate-700 bg-slate-800 text-slate-100 focus:border-blue-500'
      : 'border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10'
  }`;

  const toggleBtnClass = (isActive: boolean) =>
    `px-2.5 py-2 rounded-lg font-medium border flex items-center justify-center transition-colors whitespace-nowrap ${
      isActive
        ? isDarkMode
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-slate-900 text-white border-slate-900'
        : isDarkMode
          ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
    }`;

  const segGroupClass = `grid gap-1 p-1 rounded-lg ${
    isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
  }`;

  const segItemClass = (isActive: boolean) =>
    `py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
      isActive
        ? isDarkMode
          ? 'bg-slate-700 text-white shadow-xs'
          : 'bg-white text-slate-900 shadow-xs'
        : isDarkMode
          ? 'text-slate-400 hover:text-slate-100'
          : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <aside
      aria-label="Properties Inspector"
      className={`${
        isSimpleUI ? 'w-60' : 'w-72'
      } shrink-0 border-l flex flex-col h-full select-none z-10 overflow-y-auto transition-colors ${
        isDarkMode
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <div
        className={`p-3.5 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Sliders
            className={`w-4 h-4 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          />
          {!isSimpleUI && (
            <h2
              className={`text-xs font-semibold tracking-tight ${
                isDarkMode ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              Inspector & Properties
            </h2>
          )}
        </div>
        {totalSelected > 0 && (
          <span
            className={`text-xs font-mono tabular-nums ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {isSimpleUI ? `${totalSelected}` : `${totalSelected} selected`}
          </span>
        )}
      </div>

      {/* Empty Selection State */}
      {totalSelected === 0 && (
        <div
          className={`p-4 space-y-5 text-xs ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <div
            className={`p-3.5 rounded-lg border space-y-2 ${
              isDarkMode
                ? 'bg-slate-800/60 border-slate-700/80'
                : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <p
              className={`font-semibold ${
                isDarkMode ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              No Element Selected
            </p>
            {!isSimpleUI && (
              <p
                className={`leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Click any shape or line on the canvas to customize its text,
                cardinalities, roles, font size, double-line status, or
                arrowheads.
              </p>
            )}
          </div>

          {allFrames.length > 0 && (
            <div className="space-y-2.5">
              <h3
                className={`text-xs font-semibold ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {isSimpleUI
                  ? `Frames (${allFrames.length})`
                  : `Canvas Frames (${allFrames.length})`}
              </h3>
              <div className="space-y-2">
                {allFrames.map((frame) => (
                  <div
                    key={frame.id}
                    className={`p-2.5 rounded-lg border space-y-2 ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-800/50'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div
                      className={`font-medium truncate ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {frame.text || 'Untitled Frame'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onExportFramePng(frame.id, frame.text || 'frame')
                        }
                        title="Export Frame as PNG"
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium border rounded transition-colors whitespace-nowrap ${
                          isDarkMode
                            ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Download className="w-3 h-3" />
                        {!isSimpleUI && 'PNG'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onExportFramePdf(frame.id, frame.text || 'frame')
                        }
                        title="Export Frame as PDF"
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                          isDarkMode
                            ? 'bg-blue-600 text-white hover:bg-blue-500'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        {!isSimpleUI && 'PDF'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single Shape Selected */}
      {singleShape && (
        <div className="p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span
              className={`font-semibold capitalize ${
                isDarkMode ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              {isSimpleUI
                ? singleShape.type
                : `${singleShape.type} Properties`}
            </span>
            <button
              type="button"
              onClick={onDeleteSelected}
              title="Delete Selected"
              aria-label="Delete Selected"
              className="flex items-center gap-1 text-rose-500 hover:text-rose-400 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {!isSimpleUI && 'Delete'}
            </button>
          </div>

          {/* Label / Generalization Value */}
          {singleShape.type === 'generalization' ? (
            <div className="space-y-1.5">
              {!isSimpleUI && (
                <label
                  className={`block font-medium ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Generalization Constraint
                </label>
              )}
              <div className={`${segGroupClass} grid-cols-3`}>
                {(['', 'd', 'o'] as GeneralizationValue[]).map((val) => (
                  <button
                    key={val || 'blank'}
                    type="button"
                    onClick={() => onUpdateShape(singleShape.id, { text: val })}
                    className={segItemClass(
                      normalizeGeneralizationText(singleShape.text) === val
                    )}
                  >
                    {val === ''
                      ? 'Blank'
                      : isSimpleUI
                        ? val
                        : val === 'd'
                          ? '"d" Disjoint'
                          : '"o" Overlap'}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label
                htmlFor="inspector-shape-text"
                className={`block font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {singleShape.type === 'frame' ? 'Frame Title' : 'Element Label'}
              </label>
              <textarea
                id="inspector-shape-text"
                rows={singleShape.type === 'text' ? 3 : 2}
                value={singleShape.text}
                onChange={(e) =>
                  onUpdateShape(singleShape.id, { text: e.target.value })
                }
                className={inputClass}
              />
            </div>
          )}

          {/* Style Toggles: Double (D), Underline (U), Bold (B) */}
          <div className="space-y-1.5">
            {!isSimpleUI && (
              <span
                className={`block font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Notation & Typography
              </span>
            )}
            <div className="grid grid-cols-3 gap-1.5">
              {singleShape.type !== 'frame' && singleShape.type !== 'text' && (
                <button
                  type="button"
                  onClick={onToggleDouble}
                  title="Double Outline (Key: D)"
                  aria-label="Double (D)"
                  className={toggleBtnClass(singleShape.isDouble)}
                >
                  {isSimpleUI ? <Equal className="w-3.5 h-3.5" /> : 'Double (D)'}
                </button>
              )}
              <button
                type="button"
                onClick={onToggleUnderline}
                title="Underline / Key (Key: U)"
                aria-label="Key (U)"
                className={`${toggleBtnClass(singleShape.isUnderline)} underline`}
              >
                {isSimpleUI ? <Underline className="w-3.5 h-3.5" /> : 'Key (U)'}
              </button>
              <button
                type="button"
                onClick={onToggleBold}
                title="Bold Text (Key: B)"
                aria-label="Bold (B)"
                className={`${toggleBtnClass(singleShape.isBold)} font-bold`}
              >
                {isSimpleUI ? <Bold className="w-3.5 h-3.5" /> : 'Bold (B)'}
              </button>
            </div>
          </div>

          {singleShape.type === 'attribute' && (
            <div className="flex items-center justify-between pt-1">
              <span
                className={`font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Derived Attribute (Dashed)
              </span>
              <input
                type="checkbox"
                aria-label="Derived Attribute (Dashed)"
                checked={Boolean(singleShape.isDerived)}
                onChange={(e) =>
                  onUpdateShape(singleShape.id, { isDerived: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Font Size & Dimensions */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <label
                htmlFor="shape-font-size"
                className={`block text-[11px] font-medium mb-1 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Font (px)
              </label>
              <input
                id="shape-font-size"
                type="number"
                min={10}
                max={42}
                value={singleShape.fontSize}
                onChange={(e) =>
                  onUpdateShape(singleShape.id, {
                    fontSize: Math.max(
                      10,
                      Math.min(42, Number(e.target.value) || 14)
                    ),
                  })
                }
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label
                htmlFor="shape-width"
                className={`block text-[11px] font-medium mb-1 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Width
              </label>
              <input
                id="shape-width"
                type="number"
                min={40}
                max={1600}
                value={Math.round(singleShape.width)}
                onChange={(e) =>
                  onUpdateShape(singleShape.id, {
                    width: Math.max(40, Number(e.target.value) || 100),
                  })
                }
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label
                htmlFor="shape-height"
                className={`block text-[11px] font-medium mb-1 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Height
              </label>
              <input
                id="shape-height"
                type="number"
                min={32}
                max={1400}
                value={Math.round(singleShape.height)}
                onChange={(e) =>
                  onUpdateShape(singleShape.id, {
                    height: Math.max(32, Number(e.target.value) || 60),
                  })
                }
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
          </div>

          {/* Frame-specific Controls */}
          {singleShape.type === 'frame' && (
            <div
              className={`pt-3 border-t space-y-3 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="space-y-1.5">
                <span
                  className={`block font-medium ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Frame Border Accent
                </span>
                <div className="flex items-center gap-2">
                  {[
                    '#475569',
                    '#2563EB',
                    '#10B981',
                    '#D97706',
                    '#E11D48',
                    '#7C3AED',
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Set frame color ${color}`}
                      onClick={() =>
                        onUpdateShape(singleShape.id, { frameColor: color })
                      }
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        singleShape.frameColor === color
                          ? isDarkMode
                            ? 'scale-110 border-white'
                            : 'scale-110 border-slate-900'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                {!isSimpleUI && (
                  <span
                    className={`block font-medium ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Export Only This Frame
                  </span>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onExportFramePng(
                        singleShape.id,
                        singleShape.text || 'frame'
                      )
                    }
                    title="Export Frame PNG"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {!isSimpleUI && 'Frame PNG'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onExportFramePdf(
                        singleShape.id,
                        singleShape.text || 'frame'
                      )
                    }
                    title="Export Frame PDF"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {!isSimpleUI && 'Frame PDF'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single Line Selected */}
      {singleLine && (
        <div className="p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span
              className={`font-semibold ${
                isDarkMode ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              {isSimpleUI ? 'Line' : 'Connection Line Properties'}
            </span>
            <button
              type="button"
              onClick={onDeleteSelected}
              title="Delete Line"
              aria-label="Delete Line"
              className="flex items-center gap-1 text-rose-500 hover:text-rose-400 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {!isSimpleUI && 'Delete'}
            </button>
          </div>

          {/* Cardinalities & Role Input */}
          <div
            className={`space-y-3 p-3 rounded-lg border ${
              isDarkMode
                ? 'bg-slate-800/60 border-slate-700/80'
                : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div>
              <label
                htmlFor="line-start-label"
                className={`block font-medium mb-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {isSimpleUI ? 'Start' : 'Start Cardinality (Source End)'}
              </label>
              <input
                id="line-start-label"
                type="text"
                placeholder="e.g. 1, N, (0,*)"
                value={singleLine.startLabel}
                onChange={(e) =>
                  onUpdateLine(singleLine.id, { startLabel: e.target.value })
                }
                className={inputClass}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {CARDINALITY_PRESETS.map((preset) => (
                  <button
                    key={`start_${preset}`}
                    type="button"
                    onClick={() =>
                      onUpdateLine(singleLine.id, { startLabel: preset })
                    }
                    className={`px-1.5 py-0.5 text-[10px] font-mono border rounded ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 hover:bg-slate-700 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="line-middle-label"
                className={`block font-medium mb-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {isSimpleUI ? 'Role' : 'Middle Text (Role Assignment)'}
              </label>
              <input
                id="line-middle-label"
                type="text"
                placeholder="e.g. recruiter, child, follower"
                value={singleLine.middleLabel}
                onChange={(e) =>
                  onUpdateLine(singleLine.id, { middleLabel: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="line-end-label"
                className={`block font-medium mb-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {isSimpleUI ? 'End' : 'End Cardinality (Target End)'}
              </label>
              <input
                id="line-end-label"
                type="text"
                placeholder="e.g. N, 1, (1,1)"
                value={singleLine.endLabel}
                onChange={(e) =>
                  onUpdateLine(singleLine.id, { endLabel: e.target.value })
                }
                className={inputClass}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {CARDINALITY_PRESETS.map((preset) => (
                  <button
                    key={`end_${preset}`}
                    type="button"
                    onClick={() =>
                      onUpdateLine(singleLine.id, { endLabel: preset })
                    }
                    className={`px-1.5 py-0.5 text-[10px] font-mono border rounded ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 hover:bg-slate-700 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Label Placement (Above / On-Line with Background / Below) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span
                className={`font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {isSimpleUI ? 'Placement' : 'Line Text Placement'}
              </span>
              {(singleLine.startLabelOffset ||
                singleLine.middleLabelOffset ||
                singleLine.endLabelOffset) && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLine(singleLine.id, {
                      startLabelOffset: undefined,
                      middleLabelOffset: undefined,
                      endLabelOffset: undefined,
                    })
                  }
                  title="Reset Label Offset"
                  className={`text-[11px] flex items-center gap-1 ${
                    isDarkMode
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  {!isSimpleUI && 'Reset Drag'}
                </button>
              )}
            </div>
            <div className={`${segGroupClass} grid-cols-3`}>
              {(
                [
                  { id: 'above', label: 'Above' },
                  { id: 'on-line', label: isSimpleUI ? 'On Line' : 'On Line (BG)' },
                  { id: 'below', label: 'Below' },
                ] as { id: LabelPlacement; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onUpdateLine(singleLine.id, { labelPlacement: opt.id })
                  }
                  className={segItemClass(singleLine.labelPlacement === opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Path Style: Straight vs Orthogonal */}
          <div className="space-y-2">
            {!isSimpleUI && (
              <span
                className={`block font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Line Routing & Segments
              </span>
            )}
            <div className={`${segGroupClass} grid-cols-2`}>
              <button
                type="button"
                onClick={() =>
                  onUpdateLine(singleLine.id, { lineType: 'straight' })
                }
                className={segItemClass(singleLine.lineType === 'straight')}
              >
                {isSimpleUI ? 'Straight' : 'Straight / Bendable'}
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateLine(singleLine.id, { lineType: 'orthogonal' })
                }
                className={segItemClass(singleLine.lineType === 'orthogonal')}
              >
                {isSimpleUI ? 'Orthogonal' : 'Orthogonal (90°)'}
              </button>
            </div>

            {singleLine.lineType === 'straight' &&
              singleLine.controlPoints.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLine(singleLine.id, { controlPoints: [] })
                  }
                  title="Remove all bend control points"
                  className={`w-full py-1.5 px-2.5 text-xs font-medium border rounded-md flex items-center justify-center gap-1.5 ${
                    isDarkMode
                      ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700'
                      : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  {!isSimpleUI &&
                    `Straighten (${singleLine.controlPoints.length} control pts)`}
                </button>
              )}
          </div>

          {/* Double Line (D), Bold (B), Underline (U) & Font Size */}
          <div className="space-y-2">
            {!isSimpleUI && (
              <span
                className={`block font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Participation & Text Style
              </span>
            )}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={onToggleDouble}
                title="Double Line (Key: D)"
                aria-label="Double (D)"
                className={toggleBtnClass(singleLine.isDouble)}
              >
                {isSimpleUI ? <Equal className="w-3.5 h-3.5" /> : 'Double (D)'}
              </button>
              <button
                type="button"
                onClick={onToggleBold}
                title="Bold Text (Key: B)"
                aria-label="Bold (B)"
                className={`${toggleBtnClass(singleLine.isBold)} font-bold`}
              >
                {isSimpleUI ? <Bold className="w-3.5 h-3.5" /> : 'Bold (B)'}
              </button>
              <button
                type="button"
                onClick={onToggleUnderline}
                title="Underline Text (Key: U)"
                aria-label="Key (U)"
                className={`${toggleBtnClass(singleLine.isUnderline)} underline`}
              >
                {isSimpleUI ? <Underline className="w-3.5 h-3.5" /> : 'Key (U)'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label
                htmlFor="line-font-size"
                className={`font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {isSimpleUI ? 'Font (px)' : 'Label Font Size (px)'}
              </label>
              <input
                id="line-font-size"
                type="number"
                min={9}
                max={32}
                value={singleLine.fontSize}
                onChange={(e) =>
                  onUpdateLine(singleLine.id, {
                    fontSize: Math.max(
                      9,
                      Math.min(32, Number(e.target.value) || 13)
                    ),
                  })
                }
                className={`w-20 px-2 py-1 rounded-md border font-mono tabular-nums ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-100'
                    : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Customizable Arrowhead Styles */}
          <div
            className={`space-y-2 pt-2 border-t ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <span
              className={`block font-medium ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Arrowhead Styles
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="line-start-arrow"
                  className={`block text-[11px] mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Start Arrow
                </label>
                <select
                  id="line-start-arrow"
                  value={singleLine.startArrow}
                  onChange={(e) =>
                    onUpdateLine(singleLine.id, {
                      startArrow: e.target.value as ArrowHeadStyle,
                    })
                  }
                  className={inputClass}
                >
                  {ARROW_OPTIONS.map((a) => (
                    <option key={`start_${a.value}`} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="line-end-arrow"
                  className={`block text-[11px] mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  End Arrow
                </label>
                <select
                  id="line-end-arrow"
                  value={singleLine.endArrow}
                  onChange={(e) =>
                    onUpdateLine(singleLine.id, {
                      endArrow: e.target.value as ArrowHeadStyle,
                    })
                  }
                  className={inputClass}
                >
                  {ARROW_OPTIONS.map((a) => (
                    <option key={`end_${a.value}`} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Anchor Attachment Override */}
          <div
            className={`space-y-2 pt-2 border-t ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <span
              className={`block font-medium ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Anchor Attachment Points
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="line-source-anchor"
                  className={`block text-[11px] mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Source Anchor
                </label>
                <select
                  id="line-source-anchor"
                  value={singleLine.sourceAnchor}
                  onChange={(e) =>
                    onUpdateLine(singleLine.id, {
                      sourceAnchor: e.target.value as AnchorId,
                    })
                  }
                  className={inputClass}
                >
                  {ANCHOR_OPTIONS.map((a) => (
                    <option key={`src_${a.value}`} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="line-target-anchor"
                  className={`block text-[11px] mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Target Anchor
                </label>
                <select
                  id="line-target-anchor"
                  value={singleLine.targetAnchor}
                  onChange={(e) =>
                    onUpdateLine(singleLine.id, {
                      targetAnchor: e.target.value as AnchorId,
                    })
                  }
                  className={inputClass}
                >
                  {ANCHOR_OPTIONS.map((a) => (
                    <option key={`tgt_${a.value}`} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Selection State */}
      {totalSelected > 1 && (
        <div className="p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span
              className={`font-semibold ${
                isDarkMode ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              {isSimpleUI
                ? `${totalSelected} Selected`
                : `Multiple Selected (${totalSelected})`}
            </span>
            <button
              type="button"
              onClick={onDeleteSelected}
              title="Delete All Selected"
              aria-label="Delete All"
              className="flex items-center gap-1 text-rose-500 hover:text-rose-400 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {!isSimpleUI && 'Delete All'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={onToggleDouble}
              title="Double (D)"
              aria-label="Double (D)"
              className={toggleBtnClass(false)}
            >
              {isSimpleUI ? <Equal className="w-3.5 h-3.5" /> : 'Double (D)'}
            </button>
            <button
              type="button"
              onClick={onToggleUnderline}
              title="Underline (U)"
              aria-label="Underline (U)"
              className={`${toggleBtnClass(false)} underline`}
            >
              {isSimpleUI ? (
                <Underline className="w-3.5 h-3.5" />
              ) : (
                'Underline (U)'
              )}
            </button>
            <button
              type="button"
              onClick={onToggleBold}
              title="Bold (B)"
              aria-label="Bold (B)"
              className={`${toggleBtnClass(false)} font-bold`}
            >
              {isSimpleUI ? <Bold className="w-3.5 h-3.5" /> : 'Bold (B)'}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
