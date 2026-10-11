export function maxPointsForAttempt(
  basePoints: number,
  usoComodin: boolean,
  wildcardMaxPercent: number,
): number {
  if (!usoComodin) return basePoints;
  return Math.floor((basePoints * wildcardMaxPercent) / 100);
}

export function averageJudgeScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round(sum / scores.length);
}

export function clampPoints(points: number, max: number): number {
  return Math.min(Math.max(0, points), max);
}
