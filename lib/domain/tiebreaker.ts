export type RankedTeam = { id: string; nombre: string; totalPuntos: number };

export function detectFirstPlaceTie(teams: RankedTeam[]): {
  tied: boolean;
  teamIds: string[];
} {
  if (teams.length < 2) return { tied: false, teamIds: [] };
  const sorted = [...teams].sort((a, b) => b.totalPuntos - a.totalPuntos);
  const top = sorted[0].totalPuntos;
  const tiedTeams = sorted.filter((t) => t.totalPuntos === top);
  if (tiedTeams.length < 2 || top === 0) {
    return { tied: false, teamIds: [] };
  }
  return { tied: true, teamIds: tiedTeams.map((t) => t.id) };
}
