import React, { useState, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Copy,
  FileText,
  Trash2,
  FilePlus2,
  PanelLeft,
  Sliders,
  Pencil,
  Check,
  X,
  Layers,
  Sun,
  Moon,
  Minimize2,
  Bold,
  Underline,
  Equal,
} from 'lucide-react';
import { type DiagramPage } from '../utils/erModel.ts';

interface TopBarProps {
  pages: DiagramPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => void;
  onRenamePage: (pageId: string, newName: string) => void;
  onRequestDeletePage: (pageId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  selectedCount: number;
  onToggleDouble: () => void;
  onToggleUnderline: () => void;
  onToggleBold: () => void;
  onDeleteSelected: () => void;
  onExportPng: () => void;
  onCopyPng: () => void;
  onExportPdf: () => void;
  exportStatus: string | null;
  mobilePanel: 'none' | 'palette' | 'inspector';
  setMobilePanel: React.Dispatch<React.SetStateAction<'none' | 'palette' | 'inspector'>>;
  isSimpleUI: boolean;
  onToggleSimpleUI: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onCreatePage,
  onRenamePage,
  onRequestDeletePage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  selectedCount,
  onToggleDouble,
  onToggleUnderline,
  onToggleBold,
  onDeleteSelected,
  onExportPng,
  onCopyPng,
  onExportPdf,
  exportStatus,
  mobilePanel,
  setMobilePanel,
  isSimpleUI,
  onToggleSimpleUI,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(activePage?.name ?? 'Page 1');

  useEffect(() => {
    if (activePage) {
      setRenameDraft(activePage.name);
      setIsRenaming(false);
    }
  }, [activePageId, activePage?.name]);

  const commitRename = () => {
    const trimmed = renameDraft.trim();
    if (activePage && trimmed.length > 0) {
      onRenamePage(activePage.id, trimmed);
    } else if (activePage) {
      setRenameDraft(activePage.name);
    }
    setIsRenaming(false);
  };

  const groupBg = isDarkMode
    ? 'bg-slate-800/90 border-slate-700'
    : 'bg-slate-100/80 border-slate-200/70';

  const groupBtn = isDarkMode
    ? 'text-slate-200 hover:bg-slate-700'
    : 'text-slate-700 hover:bg-white';

  const actionBtn = isDarkMode
    ? 'text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700'
    : 'text-slate-700 bg-slate-100 hover:bg-slate-200/80';

  return (
    <header
      className={`relative h-13 border-b px-2 sm:px-3 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-20 transition-colors ${
        isDarkMode
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Zone 1: Brand Title & Multi-Page Workbook Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
        {/* Mobile Drawer Toggle for Palette */}
        <button
          type="button"
          onClick={() =>
            setMobilePanel((prev) => (prev === 'palette' ? 'none' : 'palette'))
          }
          aria-label="Toggle Elements Palette"
          className={`lg:hidden p-1.5 rounded-md border transition-colors ${
            mobilePanel === 'palette'
              ? 'bg-blue-600 text-white border-blue-600'
              : isDarkMode
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {!isSimpleUI && (
          <>
            <span
              className={`text-xs sm:text-base font-bold tracking-tight whitespace-nowrap shrink-0 ${
                isDarkMode ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              ChenER Studio
            </span>
            <div
              className={`hidden sm:block h-4 w-px shrink-0 ${
                isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            />
          </>
        )}

        {/* Page Dropdown, Rename, Delete, and New Page */}
        <div className="flex items-center gap-1 min-w-0">
          <Layers
            className={`hidden sm:block w-3.5 h-3.5 shrink-0 mr-0.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          />

          {isRenaming ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                aria-label="Page Name Input"
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === 'Escape') {
                    setRenameDraft(activePage?.name ?? 'Page 1');
                    setIsRenaming(false);
                  }
                }}
                className={`text-xs font-medium border border-blue-500 rounded-md px-2 py-1 w-28 sm:w-36 focus:outline-none ${
                  isDarkMode
                    ? 'bg-slate-800 text-slate-100'
                    : 'bg-white text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={commitRename}
                aria-label="Save Page Name"
                title="Save Page Name"
                className={`p-1 rounded-md transition-colors ${
                  isDarkMode
                    ? 'text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/70'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenameDraft(activePage?.name ?? 'Page 1');
                  setIsRenaming(false);
                }}
                aria-label="Cancel Rename"
                title="Cancel Rename"
                className={`p-1 rounded-md transition-colors ${
                  isDarkMode
                    ? 'text-slate-400 hover:bg-slate-800'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <label htmlFor="page-select" className="sr-only">
                Select Diagram Page
              </label>
              <select
                id="page-select"
                aria-label="Select Diagram Page"
                value={activePageId}
                onChange={(e) => onSelectPage(e.target.value)}
                className={`text-xs font-medium border rounded-md px-1.5 sm:px-2 py-1 max-w-[78px] sm:max-w-[145px] truncate focus:outline-none ${
                  isDarkMode
                    ? 'text-slate-100 bg-slate-800 border-slate-700 hover:border-slate-600'
                    : 'text-slate-800 bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setRenameDraft(activePage?.name ?? 'Page 1');
                  setIsRenaming(true);
                }}
                aria-label="Rename Page"
                title="Rename Current Page"
                className={`p-1 rounded-md transition-colors shrink-0 ${
                  isDarkMode
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => activePage && onRequestDeletePage(activePage.id)}
                aria-label="Delete Page"
                title="Delete Current Page"
                className={`p-1 rounded-md transition-colors shrink-0 ${
                  isDarkMode
                    ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/50'
                    : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onCreatePage}
            aria-label="New Page"
            title="Create New Diagram Page"
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${actionBtn}`}
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            {!isSimpleUI && <span className="hidden sm:inline">New Page</span>}
          </button>
        </div>
      </div>

      {/* Zone 2: History, Formatting Shortcuts & Viewport Controls (Desktop) */}
      <div className="hidden xl:flex items-center gap-1.5 shrink-0">
        {/* Undo / Redo */}
        <div className={`flex items-center p-0.5 rounded-lg border ${groupBg}`}>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md disabled:opacity-40 disabled:pointer-events-none transition-all whitespace-nowrap shrink-0 ${groupBtn}`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            {!isSimpleUI && <span>Undo</span>}
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo (Ctrl+Y)"
            title="Redo (Ctrl+Y)"
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md disabled:opacity-40 disabled:pointer-events-none transition-all whitespace-nowrap shrink-0 ${groupBtn}`}
          >
            <Redo2 className="w-3.5 h-3.5" />
            {!isSimpleUI && <span>Redo</span>}
          </button>
        </div>

        {/* Quick Style Toggles (D, U, B, Delete) */}
        <div className={`flex items-center p-0.5 rounded-lg border ${groupBg}`}>
          <button
            type="button"
            onClick={onToggleDouble}
            disabled={selectedCount === 0}
            aria-label="Toggle Double Line or Double Outline (Shortcut D)"
            title="Toggle Double Line / Outline (Key: D)"
            className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md disabled:opacity-40 disabled:pointer-events-none transition-all whitespace-nowrap shrink-0 ${groupBtn}`}
          >
            {isSimpleUI ? (
              <Equal className="w-3.5 h-3.5" />
            ) : (
              <span>Double (D)</span>
            )}
          </button>
          <button
            type="button"
            onClick={onToggleUnderline}
            disabled={selectedCount === 0}
            aria-label="Toggle Underline Text (Shortcut U)"
            title="Toggle Underline for Key Attribute (Key: U)"
            className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold underline rounded-md disabled:opacity-40 disabled:pointer-events-none transition-all whitespace-nowrap shrink-0 ${groupBtn}`}
          >
            {isSimpleUI ? (
              <Underline className="w-3.5 h-3.5" />
            ) : (
              <span>Underline (U)</span>
            )}
          </button>
          <button
            type="button"
            onClick={onToggleBold}
            disabled={selectedCount === 0}
            aria-label="Toggle Bold Text (Shortcut B)"
            title="Toggle Bold Text (Key: B)"
            className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md disabled:opacity-40 disabled:pointer-events-none transition-all whitespace-nowrap shrink-0 ${groupBtn}`}
          >
            {isSimpleUI ? (
              <Bold className="w-3.5 h-3.5" />
            ) : (
              <span>Bold (B)</span>
            )}
          </button>
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            aria-label="Delete Selected"
            title="Delete Selected (Key: Delete)"
            className={`px-2 py-1 text-xs font-medium rounded-md disabled:opacity-40 disabled:pointer-events-none transition-all whitespace-nowrap shrink-0 ${
              isDarkMode
                ? 'text-rose-400 hover:bg-slate-700'
                : 'text-rose-600 hover:bg-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className={`flex items-center p-0.5 rounded-lg border ${groupBg}`}>
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Zoom Out"
            title="Zoom Out"
            className={`p-1 rounded-md transition-colors ${groupBtn}`}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetView}
            aria-label="Fit to View"
            title="Reset / Fit Zoom"
            className={`px-1.5 py-1 text-xs font-mono rounded-md transition-colors tabular-nums ${groupBtn}`}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Zoom In"
            title="Zoom In"
            className={`p-1 rounded-md transition-colors ${groupBtn}`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetView}
            aria-label="Center View"
            title="Fit & Center Diagram"
            className={`p-1 rounded-md transition-colors ${groupBtn}`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone 3: UI Mode Switch, Dark Mode Switch, Export & Copy Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Toggle Simpler / Compact UI */}
        <button
          type="button"
          onClick={onToggleSimpleUI}
          aria-label="Toggle Simpler UI"
          aria-pressed={isSimpleUI}
          title={
            isSimpleUI
              ? 'Switch to Standard Labeled UI'
              : 'Switch to Simpler Icon-Only UI'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 text-white shadow-xs ${
            isSimpleUI
              ? 'bg-blue-700 hover:bg-blue-600 ring-2 ring-blue-400/60'
              : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          <Minimize2 className="w-3.5 h-3.5" />
          {!isSimpleUI && <span>Simple UI</span>}
        </button>

        {/* Toggle Dark Mode (UI Chrome Only — Working Viewplane Unaffected) */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label="Toggle Dark Mode"
          aria-pressed={isDarkMode}
          title={
            isDarkMode
              ? 'Switch UI to Light Mode'
              : 'Switch UI to Dark Mode (Working canvas stays light)'
          }
          className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${actionBtn}`}
        >
          {isDarkMode ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
          {!isSimpleUI && (
            <span className="hidden md:inline">
              {isDarkMode ? 'Light' : 'Dark'}
            </span>
          )}
        </button>

        <div
          className={`hidden sm:block h-4 w-px shrink-0 ${
            isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
          }`}
        />

        <button
          type="button"
          onClick={onCopyPng}
          aria-label="Copy PNG"
          title="Copy PNG to Clipboard"
          className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${actionBtn}`}
        >
          <Copy className="w-3.5 h-3.5" />
          {!isSimpleUI && <span>Copy PNG</span>}
        </button>

        <button
          type="button"
          onClick={onExportPng}
          aria-label="Export PNG"
          title="Export PNG"
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${actionBtn}`}
        >
          <Download className="w-3.5 h-3.5" />
          {!isSimpleUI && <span className="hidden sm:inline">Export PNG</span>}
        </button>

        <button
          type="button"
          onClick={onExportPdf}
          aria-label="Export PDF"
          title="Export PDF"
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            isDarkMode
              ? 'text-white bg-blue-600 hover:bg-blue-500'
              : 'text-white bg-slate-900 hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          {!isSimpleUI && <span className="hidden sm:inline">Export PDF</span>}
        </button>

        {/* Mobile Drawer Toggle for Inspector */}
        <button
          type="button"
          onClick={() =>
            setMobilePanel((prev) =>
              prev === 'inspector' ? 'none' : 'inspector'
            )
          }
          aria-label="Toggle Properties Inspector"
          className={`lg:hidden p-1.5 rounded-md border transition-colors ${
            mobilePanel === 'inspector'
              ? 'bg-blue-600 text-white border-blue-600'
              : isDarkMode
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* Non-Disruptive Floating Toast for Status Feedback */}
      {exportStatus && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 z-50 text-xs font-medium text-white bg-slate-900/95 px-3.5 py-1.5 rounded-lg shadow-md whitespace-nowrap"
        >
          {exportStatus}
        </div>
      )}
    </header>
  );
};
