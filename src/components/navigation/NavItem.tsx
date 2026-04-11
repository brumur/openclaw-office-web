import { useState } from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  collapsed?: boolean;
  badge?: number;
  onClick: () => void;
}

export function NavItem({
  icon,
  label,
  isActive = false,
  collapsed = false,
  badge,
  onClick,
}: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 12,
    padding: collapsed ? '10px 0' : '10px 16px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    cursor: 'pointer',
    color: isActive ? 'var(--pixel-accent)' : hovered ? 'var(--pixel-text)' : 'var(--pixel-text-dim)',
    background: isActive
      ? 'rgba(90, 140, 255, 0.1)'
      : hovered
        ? 'rgba(255, 255, 255, 0.04)'
        : 'transparent',
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    borderLeft: isActive ? '3px solid var(--pixel-accent)' : '3px solid transparent',
    transition: 'background 0.15s, color 0.15s',
    position: 'relative',
    width: '100%',
    borderRadius: 0,
    fontFamily: 'inherit',
    fontSize: '18px',
    textAlign: 'left',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: 4,
    right: collapsed ? 4 : 12,
    background: '#f87171',
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    borderRadius: '50%',
    minWidth: 16,
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
    lineHeight: 1,
  };

  return (
    <button
      style={itemStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? label : undefined}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      {!collapsed && <span>{label}</span>}
      {badge != null && badge > 0 && (
        <span style={badgeStyle}>{badge > 99 ? '99+' : badge}</span>
      )}
    </button>
  );
}
