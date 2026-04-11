// Canonical color identity for each agent.
// Residents (1-4) have fixed, distinct colors.
// Dynamic agents get a color derived from their id.

const RESIDENT_COLORS: Record<number, string> = {
  1: '#5a8cff', // Jarvis  — blue
  2: '#f472b6', // (unused)         — pink
  3: '#4ade80', // Dev     — green
  4: '#fb923c', // Infra          — orange
  5: '#a78bfa', // support-agent  — purple
  6: '#38bdf8', // qa-tester       — sky blue
  7: '#f472b6', // data-custodian  — pink
  8: '#34d399', // service-ops     — emerald
  9: '#fbbf24', // analytics          — amber
  10: '#f87171', // security-watchdog — red
  11: '#e879f9', // change-manager    — fuchsia
};

const DYNAMIC_PALETTE = ['#a78bfa', '#38bdf8', '#fbbf24', '#34d399', '#f87171'];

export function agentColor(agentId: number): string {
  return RESIDENT_COLORS[agentId] ??
    DYNAMIC_PALETTE[(agentId - 5) % DYNAMIC_PALETTE.length];
}
