import type { AttemptOutcome, SessionStatus } from "@prisma/client";

export type JudgeScoreScale = "continuous" | "steps_0_5_10";

export type SessionConfig = {
  judgeScoreScale: JudgeScoreScale;
  wildcardMaxPercent: number;
  timerSeconds: number;
  judgeTimeoutSeconds?: number;
  buzzEnabled: boolean;
};

export const defaultSessionConfig = (): SessionConfig => ({
  judgeScoreScale: "steps_0_5_10",
  wildcardMaxPercent: 50,
  timerSeconds: 10,
  judgeTimeoutSeconds: 120,
  buzzEnabled: true,
});

export type SyncRole = "display" | "team" | "moderator" | "judge";

export type TeamSync = {
  id: string;
  nombre: string;
  miembros: string[];
  ordenTurno: number;
  totalPuntos: number;
  attemptedCurrentQuestion: boolean;
  isAnswering: boolean;
};

/** Respuesta ligera cuando `since` ya está al día (menos carga en Neon). */
export type SessionSyncMinimal = {
  revision: number;
  changed: false;
  code: string;
  status: SessionStatus;
  timerEndsAt: string | null;
};

export type SessionSyncPayload = {
  revision: number;
  changed: boolean;
  code: string;
  status: SessionStatus;
  config: SessionConfig;
  timerEndsAt: string | null;
  timerSeconds: number;
  teams: TeamSync[];
  ranking: { teamId: string; nombre: string; totalPuntos: number }[];
  currentQuestion: {
    sessionQuestionId: string;
    texto: string;
    categoria: string;
    puntosBase: number;
    respuestaOficial?: string;
  } | null;
  activeAttempt: {
    id: string;
    teamId: string;
    teamNombre: string;
    usoComodin: boolean;
    maxPoints: number;
    outcome: AttemptOutcome;
    judgeScoresSubmitted: number;
    judgeCount: number;
    respondedByName: string | null;
  } | null;
  buzzes: { teamId: string; teamNombre: string; createdAt: string }[];
  tiebreakerTeamIds: string[];
  lastAttemptPoints: number | null;
};
