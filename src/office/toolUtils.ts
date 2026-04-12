/** Map status prefixes back to tool names for animation selection */
export const STATUS_TO_TOOL: Record<string, string> = {
  Reading: 'Read',
  Searching: 'Grep',
  Globbing: 'Glob',
  Fetching: 'WebFetch',
  'Searching web': 'WebSearch',
  Writing: 'Write',
  Editing: 'Edit',
  Running: 'Bash',
  Task: 'Task',
};

export function extractToolName(status: string): string | null {
  for (const [prefix, tool] of Object.entries(STATUS_TO_TOOL)) {
    if (status.startsWith(prefix)) return tool;
  }
  const first = status.split(/[\s:]/)[0];
  return first || null;
}

import { DEFAULT_COLS, DEFAULT_ROWS, TILE_SIZE, ZOOM_MAX, ZOOM_MIN } from '../constants.js';

/**
 * Compute a default zoom level that auto-fits the map to ~85% of the viewport.
 * Falls back to a sensible DPR-based minimum on very small screens.
 */
export function defaultZoom(): number {
  const dpr = window.devicePixelRatio || 1;
  const canvasW = window.innerWidth * dpr;
  const canvasH = window.innerHeight * dpr;
  const mapW = DEFAULT_COLS * TILE_SIZE;
  const mapH = DEFAULT_ROWS * TILE_SIZE;
  const fitZoom = Math.floor(Math.min((canvasW * 0.85) / mapW, (canvasH * 0.85) / mapH));
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, fitZoom));
}
