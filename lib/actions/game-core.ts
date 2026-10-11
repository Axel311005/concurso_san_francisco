import type { Attempt, Session } from "@prisma/client";
import { averageJudgeScores, maxPointsForAttempt } from "@/lib/domain/scoring";
import { nextEligibleTeamId } from "@/lib/domain/eligibility";
import { prisma } from "@/lib/prisma";
import {
  bumpRevision,
  parseSessionConfig,
  parseTiebreakerIds,
} from "@/lib/session-helpers";

export async function finalizeAttemptIfComplete(
  session: Session,
  attemptId: string,
): Promise<Session> {
  const judges = await prisma.judge.findMany({
    where: { sessionId: session.id },
  });
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      scores: true,
      sessionQuestion: { include: { question: true } },
      team: true,
    },
  });
  if (!attempt || attempt.outcome !== "pending") return session;

  if (attempt.scores.length < judges.length) {
    return prisma.session.update({
      where: { id: session.id },
      data: { status: "judging", revision: { increment: 1 } },
    });
  }

  const config = parseSessionConfig(session);
  const maxPts = maxPointsForAttempt(
    attempt.sessionQuestion.question.puntosBase,
    attempt.usoComodin,
    config.wildcardMaxPercent,
  );
  const avg = averageJudgeScores(attempt.scores.map((s) => s.points));
  const finalPoints = Math.min(avg, maxPts);
  const outcome = finalPoints > 0 ? "scored" : "wrong";

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      outcome,
      puntosFinales: finalPoints,
      endedAt: new Date(),
    },
  });

  if (outcome === "scored") {
    await prisma.team.update({
      where: { id: attempt.teamId },
      data: { totalPuntos: { increment: finalPoints } },
    });
    return prisma.session.update({
      where: { id: session.id },
      data: {
        status: "show_scores",
        timerEndsAt: null,
        revision: { increment: 1 },
      },
    });
  }

  return await passTurnAfterFailure(session, attempt);
}

export async function passTurnAfterFailure(
  session: Session,
  failedAttempt: Attempt,
): Promise<Session> {
  const teams = await prisma.team.findMany({
    where: { sessionId: session.id },
    orderBy: { ordenTurno: "asc" },
  });
  const attempts = await prisma.attempt.findMany({
    where: { sessionQuestionId: failedAttempt.sessionQuestionId },
  });
  const attempted = new Set(attempts.map((a) => a.teamId));
  const tieIds = parseTiebreakerIds(session);
  const nextId = nextEligibleTeamId(
    teams,
    attempted,
    tieIds.length ? tieIds : null,
    failedAttempt.teamId,
  );

  await prisma.attempt.update({
    where: { id: failedAttempt.id },
    data: {
      outcome: failedAttempt.outcome === "pending" ? "wrong" : failedAttempt.outcome,
      puntosFinales: 0,
      endedAt: new Date(),
    },
  });

  if (!nextId) {
    return prisma.session.update({
      where: { id: session.id },
      data: {
        status: "show_scores",
        activeAttemptId: null,
        timerEndsAt: null,
        revision: { increment: 1 },
      },
    });
  }

  const config = parseSessionConfig(session);
  const newAttempt = await prisma.attempt.create({
    data: {
      sessionQuestionId: failedAttempt.sessionQuestionId,
      teamId: nextId,
      startedAt: new Date(),
    },
  });

  const timerEndsAt = new Date(Date.now() + config.timerSeconds * 1000);

  return prisma.session.update({
    where: { id: session.id },
    data: {
      status: "team_answering",
      activeAttemptId: newAttempt.id,
      timerEndsAt,
      revision: { increment: 1 },
    },
  });
}

export async function markAttemptFailed(
  session: Session,
  outcome: "wrong" | "timeout",
): Promise<Session> {
  if (!session.activeAttemptId) {
    throw new Error("No hay intento activo");
  }
  const attempt = await prisma.attempt.findUnique({
    where: { id: session.activeAttemptId },
  });
  if (!attempt) throw new Error("Intento no encontrado");

  await prisma.attempt.update({
    where: { id: attempt.id },
    data: { outcome, puntosFinales: 0, endedAt: new Date() },
  });

  return passTurnAfterFailure(session, { ...attempt, outcome });
}

export { bumpRevision };
