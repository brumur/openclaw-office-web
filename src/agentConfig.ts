/**
 * Static registry of all expected agents.
 * These always appear on the Dashboard — online agents show live status,
 * offline ones show as "Offline".
 *
 * `folderName` must match the OpenClaw agent folder name (case-insensitive).
 *
 * Agents connected to OpenClaw but NOT in this list are hidden from the Dashboard.
 */

/** Tile-coordinate bounding box for a room zone. */
export interface Zone {
  colMin: number;
  colMax: number;
  rowMin: number;
  rowMax: number;
}

// Room zones for the default 28×18 layout
const ZONE = {
  managerOffice:  { colMin: 1,  colMax: 9,  rowMin: 1, rowMax: 7  },
  mainWorkspace:  { colMin: 11, colMax: 18, rowMin: 1, rowMax: 7  },
  devArea:        { colMin: 20, colMax: 26, rowMin: 1, rowMax: 7  },
  lounge:         { colMin: 1,  colMax: 9,  rowMin: 9, rowMax: 16 },
  conferenceRoom: { colMin: 11, colMax: 18, rowMin: 9, rowMax: 16 },
  breakRoom:      { colMin: 20, colMax: 26, rowMin: 9, rowMax: 16 },
} as const;

export interface AgentDef {
  name: string;        // Display name
  folderName: string;  // OpenClaw folder name to match against
  color: string;       // Card accent color
  zone?: Zone;         // Preferred room zone for seat assignment
}

export const CONFIGURED_AGENTS: AgentDef[] = [
  { name: 'Jarvis',            folderName: 'jarvis',            color: '#5a8cff', zone: ZONE.mainWorkspace  },
  { name: 'Dev',               folderName: 'dev',               color: '#4ade80', zone: ZONE.managerOffice  },
  { name: 'Infra',             folderName: 'infra',             color: '#fb923c', zone: ZONE.managerOffice  },
  { name: 'support-agent',     folderName: 'support-agent',     color: '#a78bfa', zone: ZONE.conferenceRoom },
  { name: 'qa-tester',         folderName: 'qa-tester',         color: '#38bdf8', zone: ZONE.breakRoom      },
  { name: 'data-custodian',    folderName: 'data-custodian',    color: '#f472b6', zone: ZONE.conferenceRoom },
  { name: 'service-ops',       folderName: 'service-ops',       color: '#34d399', zone: ZONE.mainWorkspace  },
  { name: 'analytics',         folderName: 'analytics',         color: '#fbbf24', zone: ZONE.devArea        },
  { name: 'security-watchdog', folderName: 'security-watchdog', color: '#f87171', zone: ZONE.lounge         },
  { name: 'change-manager',    folderName: 'change-manager',    color: '#e879f9', zone: ZONE.conferenceRoom },
];
