import { useCallback, useEffect, useRef, useState } from 'react';

import { agentColor } from './agentColors.js';
import { DebugView } from './components/DebugView.js';
import { ZoomControls } from './components/ZoomControls.js';
import { PULSE_ANIMATION_DURATION_SEC } from './constants.js';
import { useEditorActions } from './hooks/useEditorActions.js';
import { useEditorKeyboard } from './hooks/useEditorKeyboard.js';
import { useExtensionMessages } from './hooks/useExtensionMessages.js';
import { OfficeCanvas } from './office/components/OfficeCanvas.js';
import { ToolOverlay } from './office/components/ToolOverlay.js';
import { EditorState } from './office/editor/editorState.js';
import { EditorToolbar } from './office/editor/EditorToolbar.js';
import { OfficeState } from './office/engine/officeState.js';
import { isRotatable } from './office/layout/furnitureCatalog.js';
import { EditTool } from './office/types.js';
import { isBrowserRuntime } from './runtime.js';
import { vscode } from './vscodeApi.js';

import { AgentLabels } from './components/AgentLabels.js';
import { CameraIndicator } from './components/CameraIndicator.js';
import { ChatView } from './components/ChatView.js';
import { DashboardView } from './components/DashboardView.js';
import { LoginScreen } from './components/LoginScreen.js';
import { AppShell, useNavLayout } from './components/navigation/AppShell.js';
import { useIsMobile } from './hooks/useIsMobile.js';

// Game state lives outside React — updated imperatively by message handlers
const officeStateRef = { current: null as OfficeState | null };
const editorState = new EditorState();

function getOfficeState(): OfficeState {
  if (!officeStateRef.current) {
    officeStateRef.current = new OfficeState();
  }
  return officeStateRef.current;
}


export type ChatMessage = { role: 'user' | 'assistant'; text: string; streaming?: boolean };
export type WsStatus = 'connecting' | 'connected' | 'disconnected';
export type ActiveView = 'office' | 'dashboard' | 'chat';

const CHAT_STORAGE_KEY = 'pixel-office-chat-v2';

function loadStoredMessages(): Record<number, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ChatMessage[]>;
    const result: Record<number, ChatMessage[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      result[Number(k)] = v.map((m) => ({ ...m, streaming: false }));
    }
    return result;
  } catch {
    return {};
  }
}

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/auth/check', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setIsAuthenticated(!!data.ok);
        setAuthChecked(true);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setAuthChecked(true);
      });
  }, []);

  const [messagesByAgent, setMessagesByAgent] = useState<Record<number, ChatMessage[]>>(loadStoredMessages);
  const [selectedChatAgentId, setSelectedChatAgentId] = useState<number | null>(null);
  const [unreadByAgent, setUnreadByAgent] = useState<Record<number, number>>({});
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [activeView, setActiveView] = useState<ActiveView>('office');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('pixel-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const isMobile = useIsMobile();
  const { sidebarWidth, bottomOffset, physicalSidebarWidth } = useNavLayout(isMobile, sidebarCollapsed, activeView);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('pixel-sidebar-collapsed', String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Keep a ref so the message handler always sees the current selected agent
  const selectedChatAgentIdRef = useRef(selectedChatAgentId);
  useEffect(() => { selectedChatAgentIdRef.current = selectedChatAgentId; }, [selectedChatAgentId]);

  // Tracks which agents have had their first agentOutput after (re)connect.
  // On first output, we clear old assistant messages to prevent OpenClaw replay duplicates
  // while keeping user messages intact.
  const replayHandledRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const allStreaming = Object.values(messagesByAgent).some((msgs) => msgs.some((m) => m.streaming));
    if (allStreaming) return; // don't save mid-stream
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messagesByAgent));
    } catch { /* quota exceeded, ignore */ }
  }, [messagesByAgent]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg?.type === 'agentOutput') {
        const agentId: number = msg.id ?? 1;
        setMessagesByAgent((prev) => {
          const agentMsgs = prev[agentId] ?? [];
          // First output after (re)connect: clear old assistant messages to prevent
          // OpenClaw history replay from duplicating what's already in localStorage.
          // User messages are kept so they survive reconnects.
          if (!replayHandledRef.current.has(agentId)) {
            replayHandledRef.current.add(agentId);
            const userMsgs = agentMsgs.filter((m) => m.role === 'user');
            return { ...prev, [agentId]: [...userMsgs, { role: 'assistant' as const, text: msg.text, streaming: true }] };
          }
          const last = agentMsgs[agentMsgs.length - 1];
          const updated = (last?.role === 'assistant' && last.streaming)
            // OpenClaw sends cumulative text per event — replace, don't append
            ? [...agentMsgs.slice(0, -1), { ...last, text: msg.text }]
            : [...agentMsgs, { role: 'assistant' as const, text: msg.text, streaming: true }];
          return { ...prev, [agentId]: updated };
        });
        // Increment unread counter if this agent is not the one currently in focus
        if (agentId !== selectedChatAgentIdRef.current) {
          setUnreadByAgent((prev) => ({ ...prev, [agentId]: (prev[agentId] ?? 0) + 1 }));
        }
      }
      if (msg?.type === 'wsConnectionStatus') {
        setWsStatus(msg.status as WsStatus);
        // Reset replay tracking on disconnect so next connect re-deduplicates
        if (msg.status === 'disconnected' || msg.status === 'connecting') {
          replayHandledRef.current.clear();
        }
      }
      if (msg?.type === 'agentStatus' && msg.status === 'idle') {
        const agentId: number = msg.id ?? 1;
        setMessagesByAgent((prev) => {
          const agentMsgs = prev[agentId] ?? [];
          const last = agentMsgs[agentMsgs.length - 1];
          if (!last?.streaming) return prev;
          return { ...prev, [agentId]: [...agentMsgs.slice(0, -1), { ...last, streaming: false }] };
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleSendInput = (text: string) => {
    if (selectedChatAgentId === null) return;
    setMessagesByAgent((prev) => {
      const agentMsgs = prev[selectedChatAgentId] ?? [];
      return { ...prev, [selectedChatAgentId]: [...agentMsgs, { role: 'user', text }] };
    });
    window.postMessage({ type: 'sendInput', text, agentId: selectedChatAgentId }, '*');
  };

  const handleClearHistory = () => {
    if (selectedChatAgentId === null) return;
    setMessagesByAgent((prev) => ({ ...prev, [selectedChatAgentId]: [] }));
    try {
      const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) ?? '{}');
      delete stored[selectedChatAgentId];
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
    } catch { /* ignore */ }
  };

  // Browser runtime (dev or static dist): dispatch mock messages after the
  // useExtensionMessages listener has been registered.
  useEffect(() => {
    if (isBrowserRuntime) {
      void import('./browserMock.js').then(({ dispatchMockMessages }) => dispatchMockMessages());
    }
  }, []);

  const editor = useEditorActions(getOfficeState, editorState);

  const isEditDirty = useCallback(
    () => editor.isEditMode && editor.isDirty,
    [editor.isEditMode, editor.isDirty],
  );

  const {
    agents,
    selectedAgent,
    agentTools,
    agentStatuses,
    subagentTools,
    subagentCharacters,
    layoutReady,
    layoutWasReset,
    loadedAssets,
    alwaysShowLabels,
  } = useExtensionMessages(getOfficeState, editor.setLastSavedLayout, isEditDirty);

  // Show migration notice once layout reset is detected
  const [migrationNoticeDismissed, setMigrationNoticeDismissed] = useState(false);
  const showMigrationNotice = layoutWasReset && !migrationNoticeDismissed;

  const [isDebugMode, setIsDebugMode] = useState(false);
  const [alwaysShowOverlay, setAlwaysShowOverlay] = useState(false);

  // Sync alwaysShowOverlay from persisted settings
  useEffect(() => {
    setAlwaysShowOverlay(alwaysShowLabels);
  }, [alwaysShowLabels]);

  const handleToggleDebugMode = useCallback(() => setIsDebugMode((prev) => !prev), []);
  const handleToggleAlwaysShowOverlay = useCallback(() => {
    setAlwaysShowOverlay((prev) => {
      const newVal = !prev;
      vscode.postMessage({ type: 'setAlwaysShowLabels', enabled: newVal });
      return newVal;
    });
  }, []);

  const handleSelectAgent = useCallback((id: number) => {
    vscode.postMessage({ type: 'focusAgent', id });
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  const [editorTickForKeyboard, setEditorTickForKeyboard] = useState(0);
  useEditorKeyboard(
    editor.isEditMode,
    editorState,
    editor.handleDeleteSelected,
    editor.handleRotateSelected,
    editor.handleToggleState,
    editor.handleUndo,
    editor.handleRedo,
    useCallback(() => setEditorTickForKeyboard((n) => n + 1), []),
    editor.handleToggleEditMode,
  );

  const handleCloseAgent = useCallback((id: number) => {
    vscode.postMessage({ type: 'closeAgent', id });
  }, []);

  const handleSelectChatAgent = useCallback((id: number) => {
    setSelectedChatAgentId(id);
    setUnreadByAgent((prev) => ({ ...prev, [id]: 0 }));
    setActiveView('chat');
  }, []);

  const handleDeselectAgent = useCallback(() => {
    setSelectedChatAgentId(null);
  }, []);

  const handleClick = useCallback((agentId: number) => {
    // If clicked agent is a sub-agent, focus the parent's terminal instead
    const os = getOfficeState();
    const meta = os.subagentMeta.get(agentId);
    const focusId = meta ? meta.parentAgentId : agentId;
    vscode.postMessage({ type: 'focusAgent', id: focusId });
    handleSelectChatAgent(focusId);
  }, [handleSelectChatAgent]);

  const officeState = getOfficeState();

  // Force dependency on editorTickForKeyboard to propagate keyboard-triggered re-renders
  void editorTickForKeyboard;

  // Show "Press R to rotate" hint when a rotatable item is selected or being placed
  const showRotateHint =
    editor.isEditMode &&
    (() => {
      if (editorState.selectedFurnitureUid) {
        const item = officeState
          .getLayout()
          .furniture.find((f) => f.uid === editorState.selectedFurnitureUid);
        if (item && isRotatable(item.type)) return true;
      }
      if (
        editorState.activeTool === EditTool.FURNITURE_PLACE &&
        isRotatable(editorState.selectedFurnitureType)
      ) {
        return true;
      }
      return false;
    })();

  if (!layoutReady) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--vscode-foreground)',
        }}
      >
        Loading...
      </div>
    );
  }

  // Build agent tab descriptors for the chat tab bar
  const agentTabs = agents.map((id) => {
    const ch = officeState.characters.get(id);
    return {
      id,
      name: ch?.folderName ?? `Agent #${id}`,
      color: agentColor(id),
      unread: unreadByAgent[id] ?? 0,
    };
  });

  if (!authChecked) return null; // Brief flash while checking session
  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes pixel-agents-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pixel-agents-pulse { animation: pixel-agents-pulse ${PULSE_ANIMATION_DURATION_SEC}s ease-in-out infinite; }
        .pixel-agents-migration-btn:hover { filter: brightness(0.8); }
        .pixel-chat-scroll::-webkit-scrollbar { width: 4px; }
        .pixel-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .pixel-chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .pixel-chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
      `}</style>

      {/* Dashboard view — alternative to office */}
      {activeView === 'dashboard' && (
        <DashboardView
          officeState={officeState}
          agents={agents}
          agentStatuses={agentStatuses}
          agentTools={agentTools}
          messagesByAgent={messagesByAgent}
          onOpenChat={handleSelectChatAgent}
          sidebarWidth={sidebarWidth}
          bottomOffset={bottomOffset}
        />
      )}

      {/* Game area — always full size, chat overlays on top */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: activeView === 'office' ? undefined : 'none' }}>
        <OfficeCanvas
          officeState={officeState}
          onClick={handleClick}
          onDeselect={handleDeselectAgent}
          isEditMode={editor.isEditMode}
          editorState={editorState}
          onEditorTileAction={editor.handleEditorTileAction}
          onEditorEraseAction={editor.handleEditorEraseAction}
          onEditorSelectionChange={editor.handleEditorSelectionChange}
          onDeleteSelected={editor.handleDeleteSelected}
          onRotateSelected={editor.handleRotateSelected}
          onDragMove={editor.handleDragMove}
          editorTick={editor.editorTick}
          zoom={editor.zoom}
          onZoomChange={editor.handleZoomChange}
          panRef={editor.panRef}
        />

        {!isDebugMode && <ZoomControls zoom={editor.zoom} onZoomChange={editor.handleZoomChange} />}

        {/* Vignette overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--pixel-vignette)',
            pointerEvents: 'none',
            zIndex: 40,
          }}
        />

        {/* Edit Layout FAB — only when NOT in edit mode, office view */}
        {!editor.isEditMode && !isDebugMode && (
          <button
            onClick={editor.handleToggleEditMode}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 51,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              background: 'rgba(15,15,25,0.6)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
            title="Editar layout do escritório"
          >
            <svg width={13} height={13} viewBox="0 0 20 20" fill="none">
              <path d="M14 2.5l3.5 3.5-9 9H5v-3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <line x1="11.5" y1="5" x2="15" y2="8.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Edit Layout
          </button>
        )}

        {showRotateHint && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 49,
              background: 'var(--pixel-hint-bg)',
              color: '#fff',
              fontSize: '13px',
              fontFamily: 'system-ui, sans-serif',
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid var(--pixel-accent)',
              boxShadow: 'var(--pixel-shadow)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Press R to rotate
          </div>
        )}

        {/* EditorToolbar is rendered at root level below — not here */}
        <CameraIndicator status={wsStatus} />

        {!isDebugMode && (
          <AgentLabels
            officeState={officeState}
            agents={agents}
            agentStatuses={agentStatuses}
            containerRef={containerRef}
            zoom={editor.zoom}
            panRef={editor.panRef}
            subagentCharacters={subagentCharacters}
            selectedChatAgentId={selectedChatAgentId ?? undefined}
          />
        )}

        {!isDebugMode && (
          <ToolOverlay
            officeState={officeState}
            agents={agents}
            agentTools={agentTools}
            subagentCharacters={subagentCharacters}
            containerRef={containerRef}
            zoom={editor.zoom}
            panRef={editor.panRef}
            onCloseAgent={handleCloseAgent}
            alwaysShowOverlay={alwaysShowOverlay}
          />
        )}

        {isDebugMode && (
          <DebugView
            agents={agents}
            selectedAgent={selectedAgent}
            agentTools={agentTools}
            agentStatuses={agentStatuses}
            subagentTools={subagentTools}
            onSelectAgent={handleSelectAgent}
          />
        )}
      </div>

      {/* Editor panel — outside canvas container so canvas stays fully interactive */}
      {activeView === 'office' && editor.isEditMode &&
        (() => {
          const selUid = editorState.selectedFurnitureUid;
          const selColor = selUid
            ? (officeState.getLayout().furniture.find((f) => f.uid === selUid)?.color ?? null)
            : null;
          return (
            <EditorToolbar
              activeTool={editorState.activeTool}
              selectedTileType={editorState.selectedTileType}
              selectedFurnitureType={editorState.selectedFurnitureType}
              selectedFurnitureUid={selUid}
              selectedFurnitureColor={selColor}
              floorColor={editorState.floorColor}
              wallColor={editorState.wallColor}
              selectedWallSet={editorState.selectedWallSet}
              onToolChange={editor.handleToolChange}
              onTileTypeChange={editor.handleTileTypeChange}
              onFloorColorChange={editor.handleFloorColorChange}
              onWallColorChange={editor.handleWallColorChange}
              onWallSetChange={editor.handleWallSetChange}
              onSelectedFurnitureColorChange={editor.handleSelectedFurnitureColorChange}
              onFurnitureTypeChange={editor.handleFurnitureTypeChange}
              loadedAssets={loadedAssets}
              sidebarWidth={physicalSidebarWidth}
              isDirty={editor.isDirty}
              canUndo={editorState.undoStack.length > 0}
              canRedo={editorState.redoStack.length > 0}
              onUndo={editor.handleUndo}
              onRedo={editor.handleRedo}
              onSave={editor.handleSave}
              onReset={editor.handleReset}
              onClose={editor.handleToggleEditMode}
            />
          );
        })()}

      {/* Navigation — sidebar (desktop) or tab bar (mobile) */}
      <AppShell
        activeView={activeView}
        onSetActiveView={setActiveView}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        isEditMode={editor.isEditMode}
        onToggleEditMode={editor.handleToggleEditMode}
        onOpenChat={() => setActiveView('chat')}
        unreadCount={activeView === 'chat' ? 0 : Object.values(unreadByAgent).reduce((a, b) => a + b, 0)}
        onLogout={async () => {
          await fetch('/api/logout', { method: 'POST', credentials: 'include' });
          setIsAuthenticated(false);
        }}
        isDebugMode={isDebugMode}
        onToggleDebugMode={handleToggleDebugMode}
        alwaysShowOverlay={alwaysShowOverlay}
        onToggleAlwaysShowOverlay={handleToggleAlwaysShowOverlay}
        onClearHistory={handleClearHistory}
      />

      {/* Chat view — full screen */}
      {activeView === 'chat' && (
        <ChatView
          messagesByAgent={messagesByAgent}
          agentTabs={agentTabs}
          selectedChatAgentId={selectedChatAgentId}
          onSelectAgent={handleSelectChatAgent}
          onSend={handleSendInput}
          wsStatus={wsStatus}
          sidebarWidth={sidebarWidth}
          bottomOffset={bottomOffset}
        />
      )}

      {showMigrationNotice && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setMigrationNoticeDismissed(true)}
        >
          <div
            style={{
              background: 'var(--pixel-bg)',
              border: '2px solid var(--pixel-border)',
              borderRadius: 0,
              padding: '24px 32px',
              maxWidth: 620,
              boxShadow: 'var(--pixel-shadow)',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '40px', marginBottom: 12, color: 'var(--pixel-accent)' }}>
              We owe you an apology!
            </div>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text)', margin: '0 0 12px 0' }}>
              We've just migrated to fully open-source assets, all built from scratch with love.
              Unfortunately, this means your previous layout had to be reset.
            </p>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text)', margin: '0 0 12px 0' }}>
              We're really sorry about that.
            </p>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text)', margin: '0 0 12px 0' }}>
              The good news? This was a one-time thing, and it paves the way for some genuinely
              exciting updates ahead.
            </p>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text-dim)', margin: '0 0 20px 0' }}>
              Stay tuned, and thanks for using Pixel Agents!
            </p>
            <button
              className="pixel-agents-migration-btn"
              style={{
                padding: '6px 24px 8px',
                fontSize: '30px',
                background: 'var(--pixel-accent)',
                color: '#fff',
                border: '2px solid var(--pixel-accent)',
                borderRadius: 0,
                cursor: 'pointer',
                boxShadow: 'var(--pixel-shadow)',
              }}
              onClick={() => setMigrationNoticeDismissed(true)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
