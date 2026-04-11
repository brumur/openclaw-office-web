interface IconProps {
  size?: number;
  color?: string;
}

export function OfficeIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Office building */}
      <rect x="2" y="5" width="16" height="13" rx="1" stroke={color} strokeWidth="1.4" />
      <path d="M2 8h16" stroke={color} strokeWidth="1.4" />
      <rect x="5" y="10.5" width="3" height="3" rx="0.5" stroke={color} strokeWidth="1.2" />
      <rect x="12" y="10.5" width="3" height="3" rx="0.5" stroke={color} strokeWidth="1.2" />
      <rect x="8.5" y="13" width="3" height="5" rx="0.5" stroke={color} strokeWidth="1.2" />
      <path d="M8.5 5V2.5L10 1.5L11.5 2.5V5" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function DashboardIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Responsive grid cards */}
      <rect x="2" y="2" width="7.5" height="7.5" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="10.5" y="2" width="7.5" height="7.5" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="2" y="10.5" width="7.5" height="7.5" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="10.5" y="10.5" width="7.5" height="7.5" rx="1.5" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

export function ChatIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Chat bubble with tail */}
      <path
        d="M3 2.5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H7l-4 4V3.5a1 1 0 0 1 1-1z"
        stroke={color} strokeWidth="1.4" strokeLinejoin="round"
      />
      <line x1="6.5" y1="7" x2="13.5" y2="7" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="6.5" y1="10" x2="11" y2="10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ size = 20, color = 'currentColor' }: IconProps) {
  // Proper 6-tooth gear
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M8.5 3.2 L11.5 3.2 L11.1 4.9 L13.9 6.5 L15.2 5.3 L16.7 7.8 L14.9 8.4 L14.9 11.6 L16.7 12.2 L15.2 14.7 L13.9 13.5 L11.1 15.1 L11.5 16.8 L8.5 16.8 L8.9 15.1 L6.1 13.5 L4.8 14.7 L3.3 12.2 L5.1 11.6 L5.1 8.4 L3.3 7.8 L4.8 5.3 L6.1 6.5 L8.9 4.9 Z"
        stroke={color} strokeWidth="1.3" strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.4" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}

export function LayoutIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Pencil */}
      <path
        d="M14 2.5l3.5 3.5-9 9H5v-3.5z"
        stroke={color} strokeWidth="1.4" strokeLinejoin="round"
      />
      <line x1="11.5" y1="5" x2="15" y2="8.5" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}

export function CollapseIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M12.5 4l-5.5 6 5.5 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExpandIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M7.5 4l5.5 6-5.5 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoutIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Door frame */}
      <path d="M8 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Arrow out */}
      <path d="M13 7l4 3-4 3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="17" y1="10" x2="8" y2="10" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function MenuIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <line x1="3" y1="5" x2="17" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="10" x2="17" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="15" x2="17" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
