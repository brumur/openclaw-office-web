interface IconProps {
  size?: number;
  color?: string;
}

export function OfficeIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Pixel grid / building */}
      <rect x="2" y="4" width="16" height="14" rx="0" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="5" y="7" width="4" height="4" fill={color} />
      <rect x="11" y="7" width="4" height="4" fill={color} />
      <rect x="7" y="13" width="6" height="5" fill={color} />
    </svg>
  );
}

export function DashboardIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Cards grid */}
      <rect x="2" y="2" width="7" height="7" rx="0" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="11" y="2" width="7" height="7" rx="0" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="2" y="11" width="7" height="7" rx="0" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="11" y="11" width="7" height="7" rx="0" stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function ChatIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Chat bubble */}
      <path
        d="M3 3h14v10H7l-4 4V3z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="miter"
      />
      <line x1="6" y1="7" x2="14" y2="7" stroke={color} strokeWidth="1.5" />
      <line x1="6" y1="10" x2="11" y2="10" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function SettingsIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Gear */}
      <circle cx="10" cy="10" r="3" stroke={color} strokeWidth="1.5" />
      <path
        d="M10 1v3M10 16v3M1 10h3M16 10h3M3.5 3.5l2 2M14.5 14.5l2 2M16.5 3.5l-2 2M5.5 14.5l-2 2"
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function LayoutIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Pencil / edit */}
      <path
        d="M13 2l5 5-10 10H3v-5L13 2z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="miter"
      />
      <line x1="10" y1="5" x2="15" y2="10" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function CollapseIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Chevron left */}
      <path d="M12 4l-6 6 6 6" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="miter" />
    </svg>
  );
}

export function ExpandIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Chevron right */}
      <path d="M8 4l6 6-6 6" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="miter" />
    </svg>
  );
}

export function MenuIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Hamburger */}
      <line x1="3" y1="5" x2="17" y2="5" stroke={color} strokeWidth="1.5" />
      <line x1="3" y1="10" x2="17" y2="10" stroke={color} strokeWidth="1.5" />
      <line x1="3" y1="15" x2="17" y2="15" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
