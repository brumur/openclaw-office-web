import { Fragment, useEffect, useState } from 'react';

import { agentColor } from '../agentColors.js';
import { CONFIGURED_AGENTS } from '../agentConfig.js';
import type { SubagentCharacter } from '../hooks/useExtensionMessages.js';
import type { OfficeState } from '../office/engine/officeState.js';
import { CharacterState, TILE_SIZE } from '../office/types.js';

/** Set of known agent folderNames (lowercase) — these don't show sessionKey */
const KNOWN_FOLDERS = new Set(CONFIGURED_AGENTS.map((a) => a.folderName.toLowerCase()));

const CHAR_W = 16; // sprite width in game pixels
const CHAR_H = 32; // sprite height in game pixels

interface AgentLabelsProps {
  officeState: OfficeState;
  agents: number[];
  agentStatuses: Record<number, string>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
  subagentCharacters: SubagentCharacter[];
  selectedChatAgentId?: number;
}

export function AgentLabels({
  officeState,
  agents,
  agentStatuses,
  containerRef,
  zoom,
  panRef,
  subagentCharacters,
  selectedChatAgentId,
}: AgentLabelsProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setTick((n) => n + 1);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const el = containerRef.current;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  // Compute device pixel offset (same math as renderFrame, including pan)
  const canvasW = Math.round(rect.width * dpr);
  const canvasH = Math.round(rect.height * dpr);
  const layout = officeState.getLayout();
  const mapW = layout.cols * TILE_SIZE * zoom;
  const mapH = layout.rows * TILE_SIZE * zoom;
  const deviceOffsetX = Math.floor((canvasW - mapW) / 2) + Math.round(panRef.current.x);
  const deviceOffsetY = Math.floor((canvasH - mapH) / 2) + Math.round(panRef.current.y);

  // Build sub-agent label lookup
  const subLabelMap = new Map<number, string>();
  for (const sub of subagentCharacters) {
    subLabelMap.set(sub.id, sub.label);
  }

  // All character IDs to render labels for (regular agents + sub-agents + offline placeholders)
  const offlineIds = [...officeState.offlinePlaceholders.values()];
  const allIds = [...agents, ...subagentCharacters.map((s) => s.id), ...offlineIds];

  return (
    <>
      {allIds.map((id) => {
        const ch = officeState.characters.get(id);
        if (!ch) return null;

        // Character position: device pixels → CSS pixels (follow sitting offset)
        const sittingOffset = ch.state === CharacterState.TYPE ? 6 : 0;
        const screenX = (deviceOffsetX + ch.x * zoom) / dpr;
        const screenY = (deviceOffsetY + (ch.y + sittingOffset - 24) * zoom) / dpr;

        const status = agentStatuses[id];
        const isWaiting = status === 'waiting';
        const isActive = ch.isActive;
        const isSub = ch.isSubagent;
        const isOffline = ch.isOffline === true;

        const color = agentColor(id);
        let dotColor = 'transparent';
        if (isWaiting) {
          dotColor = '#facc15';
        } else if (isActive) {
          dotColor = color;
        }

        const labelText = subLabelMap.get(id) || ch.folderName || `Agent #${id}`;
        const isKnownAgent = KNOWN_FOLDERS.has((ch.folderName ?? '').toLowerCase());
        const sessionKeyText = !ch.isSubagent && !isKnownAgent ? ch.sessionKey : undefined;

        // Selected chat agent ring
        // ch.y is the bottom-center anchor (same as renderer: drawY = offsetY + ch.y*zoom - height)
        const isChatSelected = !isSub && selectedChatAgentId === id;
        const charScreenY = (deviceOffsetY + (ch.y + sittingOffset - CHAR_H) * zoom) / dpr;
        const charW = (CHAR_W * zoom) / dpr;
        const charH = (CHAR_H * zoom) / dpr;
        const ringPad = 3;

        return (
          <Fragment key={id}>
            {isChatSelected && (
              <div
                style={{
                  position: 'absolute',
                  left: screenX - charW / 2 - ringPad,
                  top: charScreenY - ringPad,
                  width: charW + ringPad * 2,
                  height: charH + ringPad * 2,
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 6px 1px ${color}88, inset 0 0 4px 0 ${color}44`,
                  borderRadius: 2,
                  pointerEvents: 'none',
                  zIndex: 35,
                }}
              />
            )}
          <div
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY - 16,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 40,
            }}
          >
            {dotColor !== 'transparent' && (
              <span
                className={isActive && !isWaiting ? 'pixel-agents-pulse' : undefined}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: dotColor,
                  marginBottom: 2,
                }}
              />
            )}
            <span
              style={{
                fontSize: isSub ? '16px' : '18px',
                fontStyle: isSub ? 'italic' : undefined,
                color: isOffline ? 'var(--pixel-text-dim)' : 'var(--pixel-text)',
                opacity: isOffline ? 0.5 : 1,
                background: 'rgba(30,30,46,0.7)',
                padding: '1px 4px',
                borderRadius: 2,
                whiteSpace: 'nowrap',
                maxWidth: isSub ? 120 : undefined,
                overflow: isSub ? 'hidden' : undefined,
                textOverflow: isSub ? 'ellipsis' : undefined,
              }}
            >
              {labelText}
            </span>
            {sessionKeyText && (
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--pixel-text-dim)',
                  background: 'rgba(30,30,46,0.7)',
                  padding: '0px 4px',
                  borderRadius: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                {sessionKeyText}
              </span>
            )}
          </div>
          </Fragment>
        );
      })}
    </>
  );
}
