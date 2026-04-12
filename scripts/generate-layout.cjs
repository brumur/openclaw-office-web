#!/usr/bin/env node
/**
 * Generate a rich default office layout with multiple rooms,
 * walls, and furniture — filling the entire grid.
 */

const COLS = 28;
const ROWS = 18;
const VOID = 255;
const WALL = 0;
const F1 = 1;  // Tile floor
const F2 = 2;  // Floor 2
const F7 = 7;  // Wood floor
const F9 = 9;  // Stone/carpet floor

// Color presets
const WALL_COLOR = { h: 214, s: 30, b: -100, c: -55 };
const WOOD_COLOR = { h: 25, s: 48, b: -43, c: -88 };
const BLUE_COLOR = { h: 209, s: 39, b: -25, c: -80 };
const GRAY_COLOR = { h: 209, s: 0, b: -16, c: -8 };
const GREEN_COLOR = { h: 140, s: 30, b: -30, c: -60 };
const WARM_COLOR = { h: 15, s: 40, b: -35, c: -70 };

// Initialize grid with VOID
const tiles = new Array(ROWS * COLS).fill(VOID);
const tileColors = new Array(ROWS * COLS).fill(null);

function setTile(r, c, type, color) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  tiles[r * COLS + c] = type;
  tileColors[r * COLS + c] = color;
}

function fillRect(r1, c1, r2, c2, type, color) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      setTile(r, c, type, color);
    }
  }
}

// ═══════════════════════════════════════════
// ROOM LAYOUT (28 × 18)
// ═══════════════════════════════════════════
//
// Row 0:    WALLS (top border)
// Row 1-7:  TOP ROOMS
//   Cols 0-9:   Manager's Office (wood)
//   Cols 10:     Wall partition
//   Cols 11-18:  Main Workspace (blue tile)
//   Cols 19:     Wall partition
//   Cols 20-27:  Dev Area (wood)
// Row 8:    WALLS with doorways
// Row 9-16: BOTTOM ROOMS
//   Cols 0-9:   Lounge (warm carpet)
//   Cols 10:     Wall partition
//   Cols 11-18:  Conference Room (blue tile)
//   Cols 19:     Wall partition
//   Cols 20-27:  Break Room (gray stone)
// Row 17:   WALLS (bottom border)

// Top border
fillRect(0, 0, 0, COLS - 1, WALL, WALL_COLOR);

// Bottom border
fillRect(ROWS - 1, 0, ROWS - 1, COLS - 1, WALL, WALL_COLOR);

// Left border
for (let r = 0; r < ROWS; r++) setTile(r, 0, WALL, WALL_COLOR);

// Right border
for (let r = 0; r < ROWS; r++) setTile(r, COLS - 1, WALL, WALL_COLOR);

// Middle horizontal wall (row 8)
fillRect(8, 0, 8, COLS - 1, WALL, WALL_COLOR);

// Vertical partition at col 10
for (let r = 0; r < ROWS; r++) setTile(r, 10, WALL, WALL_COLOR);

// Vertical partition at col 19
for (let r = 0; r < ROWS; r++) setTile(r, 19, WALL, WALL_COLOR);

// ── Top-left: Manager's Office (cols 1-9, rows 1-7) — wood ──
fillRect(1, 1, 7, 9, F7, WOOD_COLOR);

// ── Top-center: Main Workspace (cols 11-18, rows 1-7) — blue tile ──
fillRect(1, 11, 7, 18, F1, BLUE_COLOR);

// ── Top-right: Dev Area (cols 20-26, rows 1-7) — wood ──
fillRect(1, 20, 7, 26, F7, WOOD_COLOR);

// ── Bottom-left: Lounge (cols 1-9, rows 9-16) — warm carpet ──
fillRect(9, 1, 16, 9, F9, WARM_COLOR);

// ── Bottom-center: Conference Room (cols 11-18, rows 9-16) — blue tile ──
fillRect(9, 11, 16, 18, F1, BLUE_COLOR);

// ── Bottom-right: Break Room (cols 20-26, rows 9-16) — tile floor ──
fillRect(9, 20, 16, 26, F2, GRAY_COLOR);

// ── DOORWAYS (floor tiles in wall positions) ──

// Top → Bottom doorways (in row 8)
setTile(8, 5, F7, WOOD_COLOR);     // Manager → Lounge
setTile(8, 14, F1, BLUE_COLOR);    // Workspace → Conference
setTile(8, 15, F1, BLUE_COLOR);    // Workspace → Conference (double door)
setTile(8, 23, F2, GRAY_COLOR);    // Dev → Break room

// Left ↔ Center doorways (in col 10)
setTile(4, 10, F7, WOOD_COLOR);    // Manager → Workspace
setTile(12, 10, F9, WARM_COLOR);   // Lounge → Conference

// Center ↔ Right doorways (in col 19)
setTile(4, 19, F7, WOOD_COLOR);    // Workspace → Dev
setTile(12, 19, F2, GRAY_COLOR);   // Conference → Break room

// ═══════════════════════════════════════════
// FURNITURE
// ═══════════════════════════════════════════

let fIdx = 0;
function uid() {
  return `f-default-${++fIdx}`;
}

const furniture = [];
function place(type, col, row, color) {
  const item = { uid: uid(), type, col, row };
  if (color) item.color = color;
  furniture.push(item);
}

// ── Manager's Office (top-left) ──
place('DESK_FRONT', 3, 1);           // Desk against top wall
place('PC_FRONT_OFF', 4, 1);         // PC on desk
place('CUSHIONED_BENCH', 3, 3);      // Chair
place('DOUBLE_BOOKSHELF', 1, 0);     // Bookshelf left wall
place('PLANT', 8, 0);                // Plant corner
place('CLOCK', 6, 0);                // Clock on wall
place('SMALL_PAINTING', 4, 0);       // Painting on top wall (not overlapping bookshelf)
place('COFFEE', 7, 5);               // Coffee on side table
place('SMALL_TABLE_FRONT', 7, 4);    // Side table
place('BIN', 1, 7);                  // Bin

// ── Main Workspace (top-center) ──
// Desk cluster 1 (left side)
place('DESK_FRONT', 11, 1);
place('PC_FRONT_OFF', 12, 1);
place('CUSHIONED_BENCH', 11, 3);
place('DESK_FRONT', 13, 1);
place('PC_FRONT_OFF', 14, 1);
place('CUSHIONED_BENCH', 13, 3);

// Desk cluster 2 (right side)
place('DESK_FRONT', 15, 1);
place('PC_FRONT_OFF', 16, 1);
place('CUSHIONED_BENCH', 15, 3);
place('DESK_FRONT', 17, 1);
place('PC_FRONT_OFF', 18, 1);
place('CUSHIONED_BENCH', 17, 3);

// Side desks
place('SMALL_TABLE_SIDE', 11, 5);
place('SMALL_TABLE_SIDE', 11, 7);
place('WOODEN_CHAIR_SIDE', 12, 5);
place('WOODEN_CHAIR_SIDE', 12, 7);

place('HANGING_PLANT', 14, 0);
place('HANGING_PLANT', 18, 0);
place('PLANT_2', 11, 0);

// ── Dev Area (top-right) ──
place('TABLE_FRONT', 22, 1);
place('PC_SIDE', 22, 3);
place('WOODEN_CHAIR_SIDE', 21, 3);
place('PC_SIDE', 22, 5);
place('WOODEN_CHAIR_SIDE', 21, 5);
place('PC_SIDE:left', 24, 3);
place('WOODEN_CHAIR_SIDE:left', 25, 3);
place('PC_SIDE:left', 24, 5);
place('WOODEN_CHAIR_SIDE:left', 25, 5);
place('DOUBLE_BOOKSHELF', 20, 0);
place('PLANT', 26, 0);
place('LARGE_PAINTING', 24, 0);
place('BIN', 20, 7);

// ── Lounge (bottom-left) ──
place('SOFA_FRONT', 3, 10);
place('SOFA_BACK', 3, 13);
place('SOFA_SIDE', 2, 11);
place('SOFA_SIDE:left', 5, 11);
place('COFFEE_TABLE', 3, 11);
place('COFFEE', 3, 12);
place('PLANT_2', 1, 9);
place('PLANT', 8, 9);
place('HANGING_PLANT', 2, 8);        // On wall, away from doorway at col 5
place('SMALL_PAINTING_2', 7, 8);     // On wall, away from doorway at col 5
place('SMALL_TABLE_FRONT', 7, 14);
place('COFFEE', 7, 15);

// ── Conference Room (bottom-center) ──
place('TABLE_FRONT', 13, 11);
place('WOODEN_CHAIR_SIDE', 12, 12);
place('WOODEN_CHAIR_SIDE', 12, 14);
place('WOODEN_CHAIR_SIDE:left', 16, 12);
place('WOODEN_CHAIR_SIDE:left', 16, 14);
place('CUSHIONED_BENCH', 13, 10);
place('CUSHIONED_BENCH', 15, 10);
place('WHITEBOARD', 12, 8);          // On wall, away from doorways at 14-15
place('PLANT', 11, 9);               // Inside room, not on wall
place('PLANT_2', 18, 9);             // Inside room, not on wall
place('SMALL_PAINTING', 17, 8);      // On wall, away from doorways

// ── Break Room (bottom-right) ──
place('SMALL_TABLE_FRONT', 22, 12);
place('WOODEN_CHAIR_SIDE', 21, 13);
place('WOODEN_CHAIR_SIDE:left', 24, 13);
place('SMALL_TABLE_FRONT', 22, 14);
place('WOODEN_CHAIR_SIDE', 21, 15);
place('WOODEN_CHAIR_SIDE:left', 24, 15);
place('DOUBLE_BOOKSHELF', 21, 8);    // On wall, not overlapping with hanging plant
place('PLANT', 26, 9);               // Inside room, not on wall
place('HANGING_PLANT', 25, 8);       // On wall, separate from bookshelf
place('BIN', 26, 16);
place('COFFEE', 22, 13);
place('COFFEE', 22, 15);

// ═══════════════════════════════════════════

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 2,
  tiles,
  tileColors,
  furniture,
};

const fs = require('fs');
const path = require('path');
const outPath = path.join(__dirname, '..', 'public', 'assets', 'default-layout-1.json');
fs.writeFileSync(outPath, JSON.stringify(layout, null, 2));
console.log(`✓ Generated layout: ${COLS}×${ROWS}, ${furniture.length} furniture items`);
console.log(`  Written to: ${outPath}`);
