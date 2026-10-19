/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  type DiagramState,
  type DiagramPage,
  type ERShape,
  type ERLine,
  type ShapeType,
  type Point,
  createShape,
  applyShortcutKey,
  createHistoryState,
  pushHistory,
  undoHistory,
  redoHistory,
  getDiagramBounds,
} from './utils/erModel.ts';
import {
  exportDiagramAsPng,
  copyDiagramPngToClipboard,
  exportDiagramAsPdf,
} from './utils/exportDiagram.ts';
import { TopBar } from './components/TopBar.tsx';
import { LeftPalette } from './components/LeftPalette.tsx';
import { DiagramCanvas } from './components/DiagramCanvas.tsx';
import { InspectorPanel } from './components/InspectorPanel.tsx';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'chener_studio_workbook_v1';
const UI_PREFS_KEY = 'chener_studio_ui_prefs_v1';

function createBlankPage(name: string): DiagramPage {
  return {
    id: `page_${Math.random().toString(36).slice(2, 9)}`,
    name,
    history: createHistoryState({ shapes: [], lines: [] }),
    zoom: 1,
    pan: { x: 0, y: 0 },
  };
}

interface SavedWorkbook {
  pages: DiagramPage[];
  activePageId: string;
  isSimpleUI: boolean;
  isDarkMode: boolean;
}

function loadInitialWorkbook(): SavedWorkbook {
  let fallbackSimpleUI = false;
  let fallbackDarkMode = false;
  try {
    const legacyPrefs = localStorage.getItem(UI_PREFS_KEY);
    if (legacyPrefs) {
      const parsedPrefs = JSON.parse(legacyPrefs);
      fallbackSimpleUI = Boolean(parsedPrefs.isSimpleUI);
      fallbackDarkMode = Boolean(parsedPrefs.isDarkMode);
    }
  } catch {
    // Ignore storage read errors
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed.pages) &&
        parsed.pages.length > 0 &&
        typeof parsed.activePageId === 'string'
      ) {
        return {
          pages: parsed.pages,
          activePageId: parsed.activePageId,
          isSimpleUI:
            typeof parsed.isSimpleUI === 'boolean'
              ? parsed.isSimpleUI
              : fallbackSimpleUI,
          isDarkMode:
            typeof parsed.isDarkMode === 'boolean'
              ? parsed.isDarkMode
              : fallbackDarkMode,
        };
      }
    }
  } catch {
    // Fallback to fresh Page 1
  }
  const firstPage = createBlankPage('Page 1');
  return {
    pages: [firstPage],
    activePageId: firstPage.id,
    isSimpleUI: fallbackSimpleUI,
    isDarkMode: fallbackDarkMode,
  };
}

export default function App() {
  const [workbook, setWorkbook] = useState<SavedWorkbook>(loadInitialWorkbook);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<
    'select' | 'connect-straight' | 'connect-orthogonal'
  >('select');
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<
    'none' | 'palette' | 'inspector'
  >('none');
  const [pageIdPendingDelete, setPageIdPendingDelete] = useState<string | null>(
    null
  );

  const { isSimpleUI, isDarkMode } = workbook;

  // Persist workbook (pages + Simple UI + Dark Mode state) to localStorage automatically
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workbook));
      localStorage.setItem(
        UI_PREFS_KEY,
        JSON.stringify({
          isSimpleUI: workbook.isSimpleUI,
          isDarkMode: workbook.isDarkMode,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [workbook]);

  const activePage =
    workbook.pages.find((p) => p.id === workbook.activePageId) ??
    workbook.pages[0];

  const currentState = activePage.history.present;
  const zoom = activePage.zoom;
  const pan = activePage.pan;

  const updateActivePage = useCallback(
    (updater: (page: DiagramPage) => DiagramPage) => {
      setWorkbook((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === prev.activePageId ? updater(p) : p
        ),
      }));
    },
    []
  );

  const setZoom: React.Dispatch<React.SetStateAction<number>> = useCallback(
    (valOrUpdater) => {
      updateActivePage((page) => ({
        ...page,
        zoom:
          typeof valOrUpdater === 'function'
            ? valOrUpdater(page.zoom)
            : valOrUpdater,
      }));
    },
    [updateActivePage]
  );

  const setPan: React.Dispatch<React.SetStateAction<Point>> = useCallback(
    (valOrUpdater) => {
      updateActivePage((page) => ({
        ...page,
        pan:
          typeof valOrUpdater === 'function'
            ? valOrUpdater(page.pan)
            : valOrUpdater,
      }));
    },
    [updateActivePage]
  );

  const fitDiagramToViewport = useCallback(
    (targetState: DiagramState) => {
      if (targetState.shapes.length === 0) {
        updateActivePage((p) => ({ ...p, zoom: 1, pan: { x: 0, y: 0 } }));
        return;
      }
      const bounds = getDiagramBounds(targetState, 32);
      const isDesktop = window.innerWidth >= 1024;
      const sidebarsWidth = isSimpleUI ? 64 + 240 : 256 + 288;
      const availW = Math.max(
        320,
        window.innerWidth - (isDesktop ? sidebarsWidth : 16)
      );
      const availH = Math.max(300, window.innerHeight - 64);

      const scaleX = availW / bounds.width;
      const scaleY = availH / bounds.height;
      const nextZoom = Math.max(
        0.32,
        Math.min(1.15, Number(Math.min(scaleX, scaleY).toFixed(2)))
      );

      const nextPanX = Math.round(
        (availW - bounds.width * nextZoom) / 2 - bounds.x * nextZoom
      );
      const nextPanY = Math.round(
        (availH - bounds.height * nextZoom) / 2 - bounds.y * nextZoom
      );

      updateActivePage((p) => ({
        ...p,
        zoom: nextZoom,
        pan: { x: nextPanX, y: nextPanY },
      }));
    },
    [updateActivePage, isSimpleUI]
  );

  const showStatusMessage = (msg: string) => {
    setExportStatus(msg);
    setTimeout(() => {
      setExportStatus((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  // Commit a discrete state transition to Undo/Redo history of active page
  const handleCommitState = useCallback(
    (nextState: DiagramState) => {
      updateActivePage((page) => ({
        ...page,
        history: pushHistory(page.history, nextState),
      }));
    },
    [updateActivePage]
  );

  // Update live state during dragging without flooding history stack
  const handleLiveStateChange = useCallback(
    (liveState: DiagramState) => {
      updateActivePage((page) => ({
        ...page,
        history: {
          ...page.history,
          present: liveState,
        },
      }));
    },
    [updateActivePage]
  );

  const handleUndo = useCallback(() => {
    updateActivePage((page) => ({
      ...page,
      history: undoHistory(page.history),
    }));
  }, [updateActivePage]);

  const handleRedo = useCallback(() => {
    updateActivePage((page) => ({
      ...page,
      history: redoHistory(page.history),
    }));
  }, [updateActivePage]);

  const handleToggleShortcut = useCallback(
    (key: 'd' | 'u' | 'b') => {
      updateActivePage((page) => {
        const next = applyShortcutKey(
          page.history.present,
          selectedShapeIds,
          selectedLineIds,
          key
        );
        return {
          ...page,
          history: pushHistory(page.history, next),
        };
      });
    },
    [selectedShapeIds, selectedLineIds, updateActivePage]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedShapeIds.length === 0 && selectedLineIds.length === 0) return;
    const shapeSet = new Set(selectedShapeIds);
    const lineSet = new Set(selectedLineIds);

    updateActivePage((page) => {
      const nextShapes = page.history.present.shapes.filter(
        (s) => !shapeSet.has(s.id)
      );
      const nextLines = page.history.present.lines.filter(
        (l) =>
          !lineSet.has(l.id) &&
          !shapeSet.has(l.sourceId) &&
          !shapeSet.has(l.targetId)
      );
      return {
        ...page,
        history: pushHistory(page.history, {
          shapes: nextShapes,
          lines: nextLines,
        }),
      };
    });
    setSelectedShapeIds([]);
    setSelectedLineIds([]);
  }, [selectedShapeIds, selectedLineIds, updateActivePage]);

  // Multi-Page Management Handlers
  const handleSelectPage = (pageId: string) => {
    setWorkbook((prev) => ({
      ...prev,
      activePageId: pageId,
    }));
    setSelectedShapeIds([]);
    setSelectedLineIds([]);
  };

  const handleCreatePage = () => {
    setWorkbook((prev) => {
      const existingNames = new Set(prev.pages.map((p) => p.name));
      let idx = prev.pages.length + 1;
      while (existingNames.has(`Page ${idx}`)) {
        idx++;
      }
      const newPage = createBlankPage(`Page ${idx}`);
      return {
        ...prev,
        pages: [...prev.pages, newPage],
        activePageId: newPage.id,
      };
    });
    setSelectedShapeIds([]);
    setSelectedLineIds([]);
    showStatusMessage('Created new page');
  };

  const handleRenamePage = (pageId: string, newName: string) => {
    setWorkbook((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.id === pageId ? { ...p, name: newName } : p
      ),
    }));
    showStatusMessage(`Renamed to "${newName}"`);
  };

  const handleConfirmDeletePage = () => {
    if (!pageIdPendingDelete) return;
    setWorkbook((prev) => {
      const remaining = prev.pages.filter((p) => p.id !== pageIdPendingDelete);
      if (remaining.length === 0) {
        const freshPage = createBlankPage('Page 1');
        return {
          ...prev,
          pages: [freshPage],
          activePageId: freshPage.id,
        };
      }
      const nextActiveId =
        prev.activePageId === pageIdPendingDelete
          ? remaining[remaining.length - 1].id
          : prev.activePageId;
      return {
        ...prev,
        pages: remaining,
        activePageId: nextActiveId,
      };
    });
    setPageIdPendingDelete(null);
    setSelectedShapeIds([]);
    setSelectedLineIds([]);
    showStatusMessage('Deleted page');
  };

  // Global keyboard shortcuts (Ctrl+Z, Ctrl+Y, D, U, B, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isEditingInput) return;

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (isMod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (!isMod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleToggleShortcut('d');
        return;
      }

      if (!isMod && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleToggleShortcut('u');
        return;
      }

      if (!isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleShortcut('b');
        return;
      }

      if (!isMod && e.key.toLowerCase() === 'v') {
        setActiveTool('select');
        return;
      }

      if (!isMod && e.key.toLowerCase() === 'l') {
        setActiveTool('connect-straight');
        return;
      }

      if (!isMod && e.key.toLowerCase() === 'o') {
        setActiveTool('connect-orthogonal');
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleToggleShortcut, handleDeleteSelected]);

  // Add shape from Left Palette click
  const handleAddShape = (type: ShapeType) => {
    const offsetCount = currentState.shapes.length % 7;
    const centerWorldX = Math.round((440 - pan.x) / zoom + offsetCount * 28);
    const centerWorldY = Math.round((300 - pan.y) / zoom + offsetCount * 28);

    const newShape = createShape(type, centerWorldX, centerWorldY, {
      text:
        type === 'frame'
          ? `Frame ${currentState.shapes.filter((s) => s.type === 'frame').length + 1}`
          : undefined,
    });

    const nextShapes =
      type === 'frame'
        ? [newShape, ...currentState.shapes]
        : [...currentState.shapes, newShape];

    handleCommitState({
      ...currentState,
      shapes: nextShapes,
    });
    if (type === 'frame') {
      setSelectedShapeIds([]);
    } else {
      setSelectedShapeIds([newShape.id]);
    }
    setSelectedLineIds([]);
    setMobilePanel('none');
  };

  const handleUpdateShape = (id: string, patch: Partial<ERShape>) => {
    const nextShapes = currentState.shapes.map((s) =>
      s.id === id ? { ...s, ...patch } : s
    );
    handleCommitState({ ...currentState, shapes: nextShapes });
  };

  const handleUpdateLine = (id: string, patch: Partial<ERLine>) => {
    const nextLines = currentState.lines.map((l) =>
      l.id === id ? { ...l, ...patch } : l
    );
    handleCommitState({ ...currentState, lines: nextLines });
  };

  const selectedShapes = currentState.shapes.filter((s) =>
    selectedShapeIds.includes(s.id)
  );
  const selectedLines = currentState.lines.filter((l) =>
    selectedLineIds.includes(l.id)
  );
  const allFrames = currentState.shapes.filter((s) => s.type === 'frame');
  const pagePendingDeleteObj = workbook.pages.find(
    (p) => p.id === pageIdPendingDelete
  );

  return (
    <div
      className={`flex flex-col w-screen h-screen overflow-hidden ${
        isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
      }`}
    >
      <TopBar
        pages={workbook.pages}
        activePageId={activePage.id}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        onRenamePage={handleRenamePage}
        onRequestDeletePage={(id) => setPageIdPendingDelete(id)}
        canUndo={activePage.history.past.length > 0}
        canRedo={activePage.history.future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomIn={() =>
          setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))
        }
        onZoomOut={() =>
          setZoom((z) => Math.max(0.3, Number((z - 0.1).toFixed(2))))
        }
        onResetView={() => fitDiagramToViewport(currentState)}
        selectedCount={selectedShapeIds.length + selectedLineIds.length}
        onToggleDouble={() => handleToggleShortcut('d')}
        onToggleUnderline={() => handleToggleShortcut('u')}
        onToggleBold={() => handleToggleShortcut('b')}
        onDeleteSelected={handleDeleteSelected}
        onExportPng={async () => {
          const safePage = activePage.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
          await exportDiagramAsPng(currentState, `${safePage || 'diagram'}.png`);
          showStatusMessage('Exported PNG');
        }}
        onCopyPng={async () => {
          const ok = await copyDiagramPngToClipboard(currentState);
          showStatusMessage(
            ok ? 'Copied PNG to clipboard' : 'Rendered PNG ready'
          );
        }}
        onExportPdf={async () => {
          const safePage = activePage.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
          await exportDiagramAsPdf(currentState, `${safePage || 'diagram'}.pdf`);
          showStatusMessage('Exported PDF');
        }}
        exportStatus={exportStatus}
        mobilePanel={mobilePanel}
        setMobilePanel={setMobilePanel}
        isSimpleUI={isSimpleUI}
        onToggleSimpleUI={() =>
          setWorkbook((prev) => ({ ...prev, isSimpleUI: !prev.isSimpleUI }))
        }
        isDarkMode={isDarkMode}
        onToggleDarkMode={() =>
          setWorkbook((prev) => ({ ...prev, isDarkMode: !prev.isDarkMode }))
        }
      />

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Left Palette: always visible on lg+, drawer on mobile */}
        <div
          className={`${
            mobilePanel === 'palette'
              ? 'absolute inset-y-0 left-0 z-30 shadow-xl'
              : 'hidden'
          } lg:relative lg:block h-full`}
        >
          <LeftPalette
            activeTool={activeTool}
            setActiveTool={(t) => {
              setActiveTool(t);
              setMobilePanel('none');
            }}
            onAddShape={handleAddShape}
            isSimpleUI={isSimpleUI}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Working Viewplane: strictly light paper appearance unaffected by dark mode */}
        <DiagramCanvas
          state={currentState}
          selectedShapeIds={selectedShapeIds}
          selectedLineIds={selectedLineIds}
          onSelect={(sIds, lIds) => {
            setSelectedShapeIds(sIds);
            setSelectedLineIds(lIds);
          }}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          zoom={zoom}
          pan={pan}
          setPan={setPan}
          setZoom={setZoom}
          onCommitState={handleCommitState}
          onLiveStateChange={handleLiveStateChange}
        />

        {/* Right Inspector: always visible on lg+, drawer on mobile */}
        <div
          className={`${
            mobilePanel === 'inspector'
              ? 'absolute inset-y-0 right-0 z-30 shadow-xl'
              : 'hidden'
          } lg:relative lg:block h-full`}
        >
          <InspectorPanel
            selectedShapes={selectedShapes}
            selectedLines={selectedLines}
            allFrames={allFrames}
            onUpdateShape={handleUpdateShape}
            onUpdateLine={handleUpdateLine}
            onToggleDouble={() => handleToggleShortcut('d')}
            onToggleUnderline={() => handleToggleShortcut('u')}
            onToggleBold={() => handleToggleShortcut('b')}
            onDeleteSelected={handleDeleteSelected}
            onExportFramePng={async (frameId, title) => {
              const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              await exportDiagramAsPng(currentState, `${safeName}.png`, {
                targetFrameId: frameId,
              });
              showStatusMessage(`Exported ${title} PNG`);
            }}
            onExportFramePdf={async (frameId, title) => {
              const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              await exportDiagramAsPdf(currentState, `${safeName}.pdf`, {
                targetFrameId: frameId,
              });
              showStatusMessage(`Exported ${title} PDF`);
            }}
            isSimpleUI={isSimpleUI}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Delete Page Confirmation Dialog */}
      {pagePendingDeleteObj && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Page"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div
            className={`rounded-xl border shadow-lg max-w-sm w-full p-5 space-y-4 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isDarkMode
                    ? 'bg-rose-950/70 text-rose-400'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2
                  className={`text-sm font-semibold ${
                    isDarkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Delete &ldquo;{pagePendingDeleteObj.name}&rdquo;?
                </h2>
                <p
                  className={`text-xs leading-relaxed ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Are you sure you want to delete this diagram page? All shapes
                  and connections on this page will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPageIdPendingDelete(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isDarkMode
                    ? 'text-slate-300 bg-slate-800 hover:bg-slate-700'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePage}
                className="px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
