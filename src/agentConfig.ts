/**
 * Static registry of all expected agents.
 * These always appear on the Dashboard — online agents show live status,
 * offline ones show as "Offline".
 *
 * `folderName` must match the OpenClaw agent folder name (case-insensitive).
 *
 * Agents connected to OpenClaw but NOT in this list are hidden from the Dashboard.
 */

export interface AgentDef {
  name: string;        // Display name
  folderName: string;  // OpenClaw folder name to match against
  color: string;       // Card accent color
}

export const CONFIGURED_AGENTS: AgentDef[] = [
  { name: 'Jarvis',          folderName: 'jarvis',          color: '#5a8cff' },
  { name: 'Dev',             folderName: 'dev',             color: '#4ade80' },
  { name: 'Infra',           folderName: 'infra',           color: '#fb923c' },
  { name: 'support-agent',   folderName: 'support-agent',   color: '#a78bfa' },
  { name: 'qa-tester',       folderName: 'qa-tester',       color: '#38bdf8' },
  { name: 'data-custodian',  folderName: 'data-custodian',  color: '#f472b6' },
  { name: 'service-ops',     folderName: 'service-ops',     color: '#34d399' },
  { name: 'analytics',       folderName: 'analytics',       color: '#fbbf24' },
  { name: 'security-watchdog', folderName: 'security-watchdog', color: '#f87171' },
];
