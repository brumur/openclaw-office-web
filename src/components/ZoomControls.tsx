import { useEffect, useRef, useState } from 'react';

import {
  ZOOM_LEVEL_FADE_DELAY_MS,
  ZOOM_LEVEL_FADE_DURATION_SEC,
  ZOOM_LEVEL_HIDE_DELAY_MS,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../constants.js';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const btnBase: React.CSSProperties = {
  width: 32,
  height: 32,
  padding: 0,
  background: 'rgba(15, 15, 25, 0.7)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: 'rgba(255, 255, 255, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s ease, color 0.15s ease',
};

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const [hovered, setHovered] = useState<'minus' | 'plus' | null>(null);
  const [showLevel, setShowLevel] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevZoomRef = useRef(zoom);

  const minDisabled = zoom <= ZOOM_MIN;
  const maxDisabled = zoom >= ZOOM_MAX;

  // Show zoom level briefly when zoom changes
  useEffect(() => {
    if (zoom === prevZoomRef.current) return;
    prevZoomRef.current = zoom;

    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    setShowLevel(true);
    setFadeOut(false);

    // Start fade after delay
    fadeTimerRef.current = setTimeout(() => {
      setFadeOut(true);
    }, ZOOM_LEVEL_FADE_DELAY_MS);

    // Hide completely after delay
    timerRef.current = setTimeout(() => {
      setShowLevel(false);
      setFadeOut(false);
    }, ZOOM_LEVEL_HIDE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [zoom]);

  return (
    <>
      {/* Zoom level indicator — bottom-right, above buttons */}
      {showLevel && (
        <div
          style={{
            position: 'absolute',
            bottom: 86,
            right: 16,
            zIndex: 'var(--pixel-controls-z)',
            background: 'rgba(15, 15, 25, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: '3px 10px',
            fontSize: '13px',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.7)',
            userSelect: 'none',
            opacity: fadeOut ? 0 : 1,
            transition: `opacity ${ZOOM_LEVEL_FADE_DURATION_SEC}s ease-out`,
            pointerEvents: 'none',
          }}
        >
          {zoom}×
        </div>
      )}

      {/* Compact round buttons — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 'var(--pixel-controls-z)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <button
          onClick={() => onZoomChange(zoom + 1)}
          disabled={maxDisabled}
          onMouseEnter={() => setHovered('plus')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'plus' && !maxDisabled ? 'rgba(90, 140, 255, 0.3)' : btnBase.background,
            color:
              hovered === 'plus' && !maxDisabled ? '#fff' : btnBase.color,
            cursor: maxDisabled ? 'default' : 'pointer',
            opacity: maxDisabled ? 0.3 : 1,
          }}
          title="Zoom in (Ctrl+Scroll)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={() => onZoomChange(zoom - 1)}
          disabled={minDisabled}
          onMouseEnter={() => setHovered('minus')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'minus' && !minDisabled ? 'rgba(90, 140, 255, 0.3)' : btnBase.background,
            color:
              hovered === 'minus' && !minDisabled ? '#fff' : btnBase.color,
            cursor: minDisabled ? 'default' : 'pointer',
            opacity: minDisabled ? 0.3 : 1,
          }}
          title="Zoom out (Ctrl+Scroll)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </>
  );
}
