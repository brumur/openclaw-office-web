// Canonical color identity for each agent.
// Residents (1-4) have fixed, distinct colors.
// Dynamic agents get a color derived from their id.

const RESIDENT_COLORS: Record<number, string> = {
  1: '#5a8cff', // Jarvis  — blue
  2: '#f472b6', // data-custodian — pink
  3: '#4ade80', // Dev     — green
  4: '#fb923c', // Infra   — orange
};

const DYNAMIC_PALETTE = ['#a78bfa', '#38bdf8', '#fbbf24', '#34d399', '#f87171'];

export function agentColor(agentId: number): string {
  return RESIDENT_COLORS[agentId] ??
    DYNAMIC_PALETTE[(agentId - 5) % DYNAMIC_PALETTE.length];
}
