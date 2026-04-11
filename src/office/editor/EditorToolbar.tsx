import { useCallback, useEffect, useRef, useState } from 'react';

import { getColorizedSprite } from '../colorize.js';
import { getColorizedFloorSprite, getFloorPatternCount, hasFloorSprites } from '../floorTiles.js';
import type { FurnitureCategory, LoadedAssetData } from '../layout/furnitureCatalog.js';
import {
  buildDynamicCatalog,
  getActiveCategories,
  getCatalogByCategory,
} from '../layout/furnitureCatalog.js';
import { getCachedSprite } from '../sprites/spriteCache.js';
import type { FloorColor, TileType as TileTypeVal } from '../types.js';
import { EditTool } from '../types.js';
import { getWallSetCount, getWallSetPreviewSprite } from '../wallTiles.js';

const PANEL_WIDTH = 220;
const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface EditorToolbarProps {
  activeTool: EditTool;
  selectedTileType: TileTypeVal;
  selectedFurnitureType: string;
  selectedFurnitureUid: string | null;
  selectedFurnitureColor: FloorColor | null;
  floorColor: FloorColor;
  wallColor: FloorColor;
  selectedWallSet: number;
  onToolChange: (tool: EditTool) => void;
  onTileTypeChange: (type: TileTypeVal) => void;
  onFloorColorChange: (color: FloorColor) => void;
  onWallColorChange: (color: FloorColor) => void;
  onWallSetChange: (setIndex: number) => void;
  onSelectedFurnitureColorChange: (color: FloorColor | null) => void;
  onFurnitureTypeChange: (type: string) => void;
  loadedAssets?: LoadedAssetData;
  // Action bar (folded in from EditActionBar)
  sidebarWidth?: number;
  isDirty?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onReset?: () => void;
  onClose?: () => void;
}

/** Render a floor pattern preview */
function FloorPatternPreview({
  patternIndex, color, selected, onClick,
}: {
  patternIndex: number; color: FloorColor; selected: boolean; onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 32;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = size; canvas.height = size;
    ctx.imageSmoothingEnabled = false;
    if (!hasFloorSprites()) { ctx.fillStyle = '#444'; ctx.fillRect(0, 0, size, size); return; }
    const sprite = getColorizedFloorSprite(patternIndex, color);
    ctx.drawImage(getCachedSprite(sprite, 2), 0, 0);
  }, [patternIndex, color]);

  return (
    <button
      onClick={onClick}
      title={`Floor ${patternIndex}`}
      style={{
        width: size, height: size, padding: 0, flexShrink: 0, cursor: 'pointer',
        border: selected ? '2px solid #5a8cff' : '2px solid rgba(255,255,255,0.1)',
        borderRadius: 4, overflow: 'hidden', background: '#1e1e2e',
      }}
    >
      <canvas ref={canvasRef} style={{ width: size, height: size, display: 'block' }} />
    </button>
  );
}

/** Render a wall set preview */
function WallSetPreview({
  setIndex, color, selected, onClick,
}: {
  setIndex: number; color: FloorColor; selected: boolean; onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = 32; const h = 64;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = w; canvas.height = h;
    ctx.imageSmoothingEnabled = false;
    const sprite = getWallSetPreviewSprite(setIndex);
    if (!sprite) { ctx.fillStyle = '#444'; ctx.fillRect(0, 0, w, h); return; }
    const cacheKey = `wall-preview-${setIndex}-${color.h}-${color.s}-${color.b}-${color.c}`;
    const colorized = getColorizedSprite(cacheKey, sprite, { ...color, colorize: true });
    ctx.drawImage(getCachedSprite(colorized, 2), 0, 0);
  }, [setIndex, color]);

  return (
    <button
      onClick={onClick}
      title={`Wall ${setIndex + 1}`}
      style={{
        width: w, height: h, padding: 0, flexShrink: 0, cursor: 'pointer',
        border: selected ? '2px solid #5a8cff' : '2px solid rgba(255,255,255,0.1)',
        borderRadius: 4, overflow: 'hidden', background: '#1e1e2e',
      }}
    >
      <canvas ref={canvasRef} style={{ width: w, height: h, display: 'block' }} />
    </button>
  );
}

/** Compact horizontal slider */
function ColorSlider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 14, fontFamily: FONT, flexShrink: 0 }}>{label}</span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, height: 3, accentColor: '#5a8cff' }}
      />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 32, textAlign: 'right', fontFamily: FONT, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

const DEFAULT_FURNITURE_COLOR: FloorColor = { h: 0, s: 0, b: 0, c: 0 };

const toolItems = [
  { tool: EditTool.TILE_PAINT,      label: 'Floor',     desc: 'Pintar piso' },
  { tool: EditTool.WALL_PAINT,      label: 'Wall',      desc: 'Pintar paredes' },
  { tool: EditTool.ERASE,           label: 'Erase',     desc: 'Apagar tiles' },
  { tool: EditTool.FURNITURE_PLACE, label: 'Furniture', desc: 'Adicionar móveis' },
];

export function EditorToolbar({
  activeTool,
  selectedTileType,
  selectedFurnitureType,
  selectedFurnitureUid,
  selectedFurnitureColor,
  floorColor,
  wallColor,
  selectedWallSet,
  onToolChange,
  onTileTypeChange,
  onFloorColorChange,
  onWallColorChange,
  onWallSetChange,
  onSelectedFurnitureColorChange,
  onFurnitureTypeChange,
  loadedAssets,
  sidebarWidth = 0,
  isDirty = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onSave,
  onReset,
  onClose,
}: EditorToolbarProps) {
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('desks');
  const [showColor, setShowColor] = useState(false);
  const [showWallColor, setShowWallColor] = useState(false);
  const [showFurnitureColor, setShowFurnitureColor] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (loadedAssets) {
      try {
        buildDynamicCatalog(loadedAssets);
        const cats = getActiveCategories();
        if (cats.length > 0 && cats[0]) setActiveCategory(cats[0].id);
      } catch { /* ignore */ }
    }
  }, [loadedAssets]);

  const handleColorChange = useCallback(
    (key: keyof FloorColor, value: number) => onFloorColorChange({ ...floorColor, [key]: value }),
    [floorColor, onFloorColorChange],
  );
  const handleWallColorChange = useCallback(
    (key: keyof FloorColor, value: number) => onWallColorChange({ ...wallColor, [key]: value }),
    [wallColor, onWallColorChange],
  );
  const effectiveColor = selectedFurnitureColor ?? DEFAULT_FURNITURE_COLOR;
  const handleSelFurnColorChange = useCallback(
    (key: keyof FloorColor, value: number) => onSelectedFurnitureColorChange({ ...effectiveColor, [key]: value }),
    [effectiveColor, onSelectedFurnitureColorChange],
  );

  const isFloorActive = activeTool === EditTool.TILE_PAINT || activeTool === EditTool.EYEDROPPER;
  const isWallActive = activeTool === EditTool.WALL_PAINT;
  const isEraseActive = activeTool === EditTool.ERASE;
  const isFurnitureActive = activeTool === EditTool.FURNITURE_PLACE || activeTool === EditTool.FURNITURE_PICK;

  const categoryItems = getCatalogByCategory(activeCategory);
  const floorPatterns = Array.from({ length: getFloorPatternCount() }, (_, i) => i + 1);
  const thumbSize = 36;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: sidebarWidth,
      bottom: 0,
      width: PANEL_WIDTH,
      zIndex: 52,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(15, 15, 25, 0.96)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      fontFamily: FONT,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.02em' }}>
          Layout Editor
        </span>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1,
          }} title="Fechar editor">✕</button>
        )}
      </div>

      {/* Action row: Undo / Redo / Save / Reset */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        {[
          { label: 'Undo', disabled: !canUndo, action: onUndo },
          { label: 'Redo', disabled: !canRedo, action: onRedo },
          { label: 'Save', disabled: !isDirty, action: onSave, accent: true },
        ].map(({ label, disabled, action, accent }) => (
          <button key={label} onClick={disabled ? undefined : action} style={{
            flex: 1, padding: '5px 0', fontSize: 12, fontFamily: FONT, fontWeight: 500,
            background: accent && !disabled ? 'rgba(90,140,255,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${accent && !disabled ? 'rgba(90,140,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 6, cursor: disabled ? 'default' : 'pointer',
            color: disabled ? 'rgba(255,255,255,0.2)' : accent ? '#7aa3ff' : 'rgba(255,255,255,0.6)',
            transition: 'background 0.15s',
          }}>{label}</button>
        ))}
        {!confirmReset ? (
          <button onClick={isDirty ? () => setConfirmReset(true) : undefined} style={{
            flex: 1, padding: '5px 0', fontSize: 12, fontFamily: FONT, fontWeight: 500,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, cursor: isDirty ? 'pointer' : 'default',
            color: isDirty ? 'rgba(248,113,113,0.8)' : 'rgba(255,255,255,0.2)',
          }}>Reset</button>
        ) : (
          <div style={{ flex: 1, display: 'flex', gap: 4 }}>
            <button onClick={() => { setConfirmReset(false); onReset?.(); }} style={{
              flex: 1, padding: '5px 0', fontSize: 11, fontFamily: FONT,
              background: 'rgba(220,50,50,0.3)', border: '1px solid rgba(220,50,50,0.5)',
              borderRadius: 6, cursor: 'pointer', color: '#f87171',
            }}>OK</button>
            <button onClick={() => setConfirmReset(false)} style={{
              flex: 1, padding: '5px 0', fontSize: 11, fontFamily: FONT,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
            }}>✕</button>
          </div>
        )}
      </div>

      {/* Tool nav items */}
      <div style={{ flexShrink: 0, paddingTop: 4, paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {toolItems.map(({ tool, label, desc }) => {
          const isActive = tool === EditTool.TILE_PAINT
            ? isFloorActive
            : tool === EditTool.WALL_PAINT
            ? isWallActive
            : tool === EditTool.ERASE
            ? isEraseActive
            : isFurnitureActive;
          return (
            <button key={tool} onClick={() => onToolChange(tool)} title={desc} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '8px 16px', background: 'none', border: 'none',
              borderLeft: `3px solid ${isActive ? '#5a8cff' : 'transparent'}`,
              cursor: 'pointer', fontFamily: FONT,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              textAlign: 'left',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: isActive ? '#5a8cff' : 'rgba(255,255,255,0.2)',
              }} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Sub-panel — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Floor sub-panel */}
        {isFloorActive && (
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowColor(v => !v)} style={{
                flex: 1, padding: '5px 0', fontSize: 12, fontFamily: FONT,
                background: showColor ? 'rgba(90,140,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${showColor ? 'rgba(90,140,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 6, cursor: 'pointer', color: showColor ? '#7aa3ff' : 'rgba(255,255,255,0.5)',
              }}>Color</button>
              <button onClick={() => onToolChange(EditTool.EYEDROPPER)} style={{
                flex: 1, padding: '5px 0', fontSize: 12, fontFamily: FONT,
                background: activeTool === EditTool.EYEDROPPER ? 'rgba(90,140,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeTool === EditTool.EYEDROPPER ? 'rgba(90,140,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 6, cursor: 'pointer',
                color: activeTool === EditTool.EYEDROPPER ? '#7aa3ff' : 'rgba(255,255,255,0.5)',
              }}>Pick</button>
            </div>
            {showColor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                <ColorSlider label="H" value={floorColor.h} min={0} max={360} onChange={v => handleColorChange('h', v)} />
                <ColorSlider label="S" value={floorColor.s} min={0} max={100} onChange={v => handleColorChange('s', v)} />
                <ColorSlider label="B" value={floorColor.b} min={-100} max={100} onChange={v => handleColorChange('b', v)} />
                <ColorSlider label="C" value={floorColor.c} min={-100} max={100} onChange={v => handleColorChange('c', v)} />
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {floorPatterns.map(patIdx => (
                <FloorPatternPreview key={patIdx} patternIndex={patIdx} color={floorColor}
                  selected={selectedTileType === patIdx} onClick={() => onTileTypeChange(patIdx as TileTypeVal)} />
              ))}
            </div>
          </>
        )}

        {/* Wall sub-panel */}
        {isWallActive && (
          <>
            <button onClick={() => setShowWallColor(v => !v)} style={{
              width: '100%', padding: '5px 0', fontSize: 12, fontFamily: FONT,
              background: showWallColor ? 'rgba(90,140,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showWallColor ? 'rgba(90,140,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6, cursor: 'pointer', color: showWallColor ? '#7aa3ff' : 'rgba(255,255,255,0.5)',
            }}>Color</button>
            {showWallColor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                <ColorSlider label="H" value={wallColor.h} min={0} max={360} onChange={v => handleWallColorChange('h', v)} />
                <ColorSlider label="S" value={wallColor.s} min={0} max={100} onChange={v => handleWallColorChange('s', v)} />
                <ColorSlider label="B" value={wallColor.b} min={-100} max={100} onChange={v => handleWallColorChange('b', v)} />
                <ColorSlider label="C" value={wallColor.c} min={-100} max={100} onChange={v => handleWallColorChange('c', v)} />
              </div>
            )}
            {getWallSetCount() > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Array.from({ length: getWallSetCount() }, (_, i) => (
                  <WallSetPreview key={i} setIndex={i} color={wallColor}
                    selected={selectedWallSet === i} onClick={() => onWallSetChange(i)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Erase sub-panel */}
        {isEraseActive && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: FONT, margin: 0 }}>
            Clique em tiles para apagá-los.
          </p>
        )}

        {/* Furniture sub-panel */}
        {isFurnitureActive && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {getActiveCategories().map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                  padding: '4px 10px', fontSize: 11, fontFamily: FONT,
                  background: activeCategory === cat.id ? 'rgba(90,140,255,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${activeCategory === cat.id ? 'rgba(90,140,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 20, cursor: 'pointer',
                  color: activeCategory === cat.id ? '#7aa3ff' : 'rgba(255,255,255,0.45)',
                  fontWeight: activeCategory === cat.id ? 600 : 400,
                }}>{cat.label}</button>
              ))}
              <button onClick={() => onToolChange(EditTool.FURNITURE_PICK)} style={{
                padding: '4px 10px', fontSize: 11, fontFamily: FONT,
                background: activeTool === EditTool.FURNITURE_PICK ? 'rgba(90,140,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeTool === EditTool.FURNITURE_PICK ? 'rgba(90,140,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 20, cursor: 'pointer',
                color: activeTool === EditTool.FURNITURE_PICK ? '#7aa3ff' : 'rgba(255,255,255,0.45)',
              }}>Pick</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {categoryItems.map(entry => {
                const cached = getCachedSprite(entry.sprite, 2);
                const isSelected = selectedFurnitureType === entry.type;
                return (
                  <button key={entry.type} onClick={() => onFurnitureTypeChange(entry.type)} title={entry.label} style={{
                    width: thumbSize, height: thumbSize, padding: 0, flexShrink: 0,
                    background: '#1e1e2e', cursor: 'pointer',
                    border: isSelected ? '2px solid #5a8cff' : '2px solid rgba(255,255,255,0.1)',
                    borderRadius: 4, overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <canvas ref={el => {
                      if (!el) return;
                      const ctx = el.getContext('2d');
                      if (!ctx) return;
                      const scale = Math.min(thumbSize / cached.width, thumbSize / cached.height) * 0.85;
                      el.width = thumbSize; el.height = thumbSize;
                      ctx.imageSmoothingEnabled = false;
                      ctx.clearRect(0, 0, thumbSize, thumbSize);
                      const dw = cached.width * scale; const dh = cached.height * scale;
                      ctx.drawImage(cached, (thumbSize - dw) / 2, (thumbSize - dh) / 2, dw, dh);
                    }} style={{ width: thumbSize, height: thumbSize }} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Selected furniture color */}
        {selectedFurnitureUid && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Selected furniture
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowFurnitureColor(v => !v)} style={{
                flex: 1, padding: '5px 0', fontSize: 12, fontFamily: FONT,
                background: showFurnitureColor ? 'rgba(90,140,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${showFurnitureColor ? 'rgba(90,140,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 6, cursor: 'pointer', color: showFurnitureColor ? '#7aa3ff' : 'rgba(255,255,255,0.5)',
              }}>Color</button>
              {selectedFurnitureColor && (
                <button onClick={() => onSelectedFurnitureColorChange(null)} style={{
                  flex: 1, padding: '5px 0', fontSize: 12, fontFamily: FONT,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                }}>Clear</button>
              )}
            </div>
            {showFurnitureColor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                {effectiveColor.colorize ? (
                  <>
                    <ColorSlider label="H" value={effectiveColor.h} min={0} max={360} onChange={v => handleSelFurnColorChange('h', v)} />
                    <ColorSlider label="S" value={effectiveColor.s} min={0} max={100} onChange={v => handleSelFurnColorChange('s', v)} />
                  </>
                ) : (
                  <>
                    <ColorSlider label="H" value={effectiveColor.h} min={-180} max={180} onChange={v => handleSelFurnColorChange('h', v)} />
                    <ColorSlider label="S" value={effectiveColor.s} min={-100} max={100} onChange={v => handleSelFurnColorChange('s', v)} />
                  </>
                )}
                <ColorSlider label="B" value={effectiveColor.b} min={-100} max={100} onChange={v => handleSelFurnColorChange('b', v)} />
                <ColorSlider label="C" value={effectiveColor.c} min={-100} max={100} onChange={v => handleSelFurnColorChange('c', v)} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: FONT }}>
                  <input type="checkbox" checked={!!effectiveColor.colorize}
                    onChange={e => onSelectedFurnitureColorChange({ ...effectiveColor, colorize: e.target.checked || undefined })}
                    style={{ accentColor: '#5a8cff' }}
                  />
                  Colorize
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
