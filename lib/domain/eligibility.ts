export type TeamRow = {
  id: string;
  ordenTurno: number;
};

export function eligibleTeamIds(
  teams: TeamRow[],
  attemptedTeamIds: Set<string>,
  tiebreakerTeamIds: string[] | null,
): string[] {
  const ordered = [...teams].sort((a, b) => a.ordenTurno - b.ordenTurno);
  return ordered
    .filter((t) => {
      if (attemptedTeamIds.has(t.id)) return false;
      if (tiebreakerTeamIds && tiebreakerTeamIds.length > 0) {
        return tiebreakerTeamIds.includes(t.id);
      }
      return true;
    })
    .map((t) => t.id);
}

export function nextEligibleTeamId(
  teams: TeamRow[],
  attemptedTeamIds: Set<string>,
  tiebreakerTeamIds: string[] | null,
  afterTeamId?: string,
): string | null {
  const eligible = eligibleTeamIds(teams, attemptedTeamIds, tiebreakerTeamIds);
  if (eligible.length === 0) return null;
  if (!afterTeamId) return eligible[0];
  const idx = eligible.indexOf(afterTeamId);
  if (idx >= 0 && idx + 1 < eligible.length) return eligible[idx + 1];
  if (idx === -1) return eligible[0];
  return null;
}
