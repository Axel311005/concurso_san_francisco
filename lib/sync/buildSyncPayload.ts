import type { Session } from "@prisma/client";
import { maxPointsForAttempt } from "@/lib/domain/scoring";
import {
  parseSessionConfig,
  parseTiebreakerIds,
} from "@/lib/session-helpers";
import { prisma } from "@/lib/prisma";
import type {
  SessionSyncMinimal,
  SessionSyncPayload,
  SyncRole,
} from "@/lib/types";

export function buildSyncMinimal(session: Session): SessionSyncMinimal {
  return {
    revision: session.revision,
    changed: false,
    code: session.code,
    status: session.status,
    timerEndsAt: session.timerEndsAt?.toISOString() ?? null,
  };
}

export async function buildSyncPayload(
  session: Session,
  role: SyncRole,
  since: number,
  teamId?: string,
): Promise<SessionSyncPayload | SessionSyncMinimal> {
  if (since > 0 && since >= session.revision) {
    return buildSyncMinimal(session);
  }

  const changed = true;
  const config = parseSessionConfig(session);
  const tiebreakerTeamIds = parseTiebreakerIds(session);

  const loaded = await prisma.session.findUnique({
    where: { id: session.id },
    include: {
      teams: { orderBy: { ordenTurno: "asc" } },
      judges: true,
    },
  });

  const teams = loaded?.teams ?? [];
  const judges = loaded?.judges ?? [];

  const currentSq = session.currentSessionQuestionId
    ? await prisma.sessionQuestion.findUnique({
        where: { id: session.currentSessionQuestionId },
        include: {
          question: true,
          attempts: { select: { teamId: true } },
        },
      })
    : null;

  const attemptedSet = new Set(
    currentSq?.attempts.map((a) => a.teamId) ?? [],
  );

  const activeAttempt = session.activeAttemptId
    ? await prisma.attempt.findUnique({
        where: { id: session.activeAttemptId },
        include: {
          team: true,
          scores: true,
          sessionQuestion: { include: { question: true } },
        },
      })
    : null;

  const buzzes =
    currentSq && session.status === "question_live"
      ? await prisma.buzz.findMany({
          where: {
            sessionId: session.id,
            sessionQuestionId: currentSq.id,
          },
          include: { team: true },
          orderBy: { createdAt: "asc" },
          take: 20,
        })
      : [];

  const showOfficial =
    role === "moderator" || role === "judge";

  const ranking = [...teams]
    .sort((a, b) => b.totalPuntos - a.totalPuntos || a.ordenTurno - b.ordenTurno)
    .map((t) => ({
      teamId: t.id,
      nombre: t.nombre,
      totalPuntos: t.totalPuntos,
    }));

  const miembrosOf = (m: unknown): string[] =>
    Array.isArray(m) ? m.filter((x): x is string => typeof x === "string") : [];

  return {
    revision: session.revision,
    changed,
    code: session.code,
    status: session.status,
    config,
    timerEndsAt: session.timerEndsAt?.toISOString() ?? null,
    timerSeconds: config.timerSeconds,
    teams: teams.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      miembros: miembrosOf(t.miembros),
      ordenTurno: t.ordenTurno,
      totalPuntos: t.totalPuntos,
      attemptedCurrentQuestion: attemptedSet.has(t.id),
      isAnswering: activeAttempt?.teamId === t.id,
    })),
    ranking,
    currentQuestion: currentSq
      ? {
          sessionQuestionId: currentSq.id,
          texto: currentSq.question.texto,
          categoria: currentSq.question.categoria,
          puntosBase: currentSq.question.puntosBase,
          ...(showOfficial
            ? { respuestaOficial: currentSq.question.respuestaOficial }
            : {}),
        }
      : null,
    activeAttempt: activeAttempt
      ? {
          id: activeAttempt.id,
          teamId: activeAttempt.teamId,
          teamNombre: activeAttempt.team.nombre,
          usoComodin: activeAttempt.usoComodin,
          maxPoints: maxPointsForAttempt(
            activeAttempt.sessionQuestion.question.puntosBase,
            activeAttempt.usoComodin,
            config.wildcardMaxPercent,
          ),
          outcome: activeAttempt.outcome,
          judgeScoresSubmitted: activeAttempt.scores.length,
          judgeCount: judges.length,
          respondedByName: activeAttempt.respondedByName,
        }
      : null,
    buzzes: buzzes.map((b) => ({
      teamId: b.teamId,
      teamNombre: b.team.nombre,
      createdAt: b.createdAt.toISOString(),
    })),
    tiebreakerTeamIds,
    lastAttemptPoints:
      session.status === "show_scores" && activeAttempt?.puntosFinales != null
        ? activeAttempt.puntosFinales
        : null,
  };
}

export async function loadSessionByCode(code: string) {
  return prisma.session.findUnique({
    where: { code: code.toUpperCase() },
  });
}
