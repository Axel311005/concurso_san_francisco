import type { SessionStatus } from "@prisma/client";

const transitions: Record<SessionStatus, SessionStatus[]> = {
  lobby: ["question_live", "tiebreaker", "finished"],
  question_live: ["team_answering", "lobby", "show_scores"],
  team_answering: ["judging", "question_live", "team_answering"],
  judging: ["show_scores", "team_answering"],
  show_scores: ["question_live", "lobby", "tiebreaker", "finished"],
  tiebreaker: ["question_live", "team_answering"],
  finished: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function canBuzz(
  status: SessionStatus,
  buzzEnabled: boolean,
  attemptedCurrent: boolean,
): boolean {
  return (
    buzzEnabled &&
    status === "question_live" &&
    !attemptedCurrent
  );
}

export function canWildcard(
  status: SessionStatus,
  usoComodin: boolean,
): boolean {
  return status === "team_answering" && !usoComodin;
}
