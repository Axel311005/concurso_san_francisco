"use server";

import { revalidatePath } from "next/cache";
import { detectFirstPlaceTie } from "@/lib/domain/tiebreaker";
import { nextEligibleTeamId } from "@/lib/domain/eligibility";
import { prisma } from "@/lib/prisma";
import {
  markAttemptFailed,
  passTurnAfterFailure,
} from "@/lib/actions/game-core";
import {
  parseSessionConfig,
  parseTiebreakerIds,
} from "@/lib/session-helpers";
import type { ActionResult } from "@/lib/actions/admin";

async function getSession(code: string) {
  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!session) throw new Error("Sesión no encontrada");
  return session;
}

export async function launchQuestion(
  code: string,
  sessionQuestionId: string,
): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    const sq = await prisma.sessionQuestion.findFirst({
      where: { id: sessionQuestionId, sessionId: session.id },
    });
    if (!sq) return { ok: false, error: "Pregunta no encontrada" };

    await prisma.buzz.deleteMany({
      where: { sessionId: session.id, sessionQuestionId: sq.id },
    });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        status: "question_live",
        currentSessionQuestionId: sq.id,
        activeAttemptId: null,
        timerEndsAt: null,
        revision: { increment: 1 },
      },
    });
    revalidatePath(`/session/${code}/moderator`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function assignTeamAndStart(
  code: string,
  teamId: string,
): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    if (!session.currentSessionQuestionId) {
      return { ok: false, error: "No hay pregunta activa" };
    }
    const sqId = session.currentSessionQuestionId;
    const existing = await prisma.attempt.findUnique({
      where: {
        sessionQuestionId_teamId: {
          sessionQuestionId: sqId,
          teamId,
        },
      },
    });
    if (existing) {
      return { ok: false, error: "Este equipo ya intentó esta pregunta" };
    }

    const config = parseSessionConfig(session);
    const attempt = await prisma.attempt.create({
      data: {
        sessionQuestionId: sqId,
        teamId,
        startedAt: new Date(),
      },
    });
    const timerEndsAt = new Date(Date.now() + config.timerSeconds * 1000);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        status: "team_answering",
        activeAttemptId: attempt.id,
        timerEndsAt,
        revision: { increment: 1 },
      },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function assignFirstBuzz(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    if (!session.currentSessionQuestionId) {
      return { ok: false, error: "No hay pregunta activa" };
    }
    const buzz = await prisma.buzz.findFirst({
      where: {
        sessionId: session.id,
        sessionQuestionId: session.currentSessionQuestionId,
      },
      orderBy: { createdAt: "asc" },
    });
    if (!buzz) return { ok: false, error: "No hay buzzes" };
    return assignTeamAndStart(code, buzz.teamId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function activateWildcard(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    if (!session.activeAttemptId) {
      return { ok: false, error: "No hay intento activo" };
    }
    const attempt = await prisma.attempt.findUnique({
      where: { id: session.activeAttemptId },
    });
    if (!attempt || attempt.usoComodin) {
      return { ok: false, error: "Comodín no disponible" };
    }
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { usoComodin: true },
    });
    await prisma.session.update({
      where: { id: session.id },
      data: { revision: { increment: 1 } },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function closeForJudging(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    if (!session.activeAttemptId) {
      return { ok: false, error: "No hay intento activo" };
    }
    await prisma.session.update({
      where: { id: session.id },
      data: {
        status: "judging",
        timerEndsAt: null,
        revision: { increment: 1 },
      },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function markWrong(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    await markAttemptFailed(session, "wrong");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function markTimeout(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    await markAttemptFailed(session, "timeout");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function advanceFromScores(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    await prisma.session.update({
      where: { id: session.id },
      data: {
        status: "lobby",
        activeAttemptId: null,
        revision: { increment: 1 },
      },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function closeQuestion(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    if (!session.currentSessionQuestionId) {
      return { ok: false, error: "No hay pregunta activa" };
    }
    await prisma.sessionQuestion.update({
      where: { id: session.currentSessionQuestionId },
      data: { cerrada: true },
    });
    await prisma.session.update({
      where: { id: session.id },
      data: {
        status: "lobby",
        currentSessionQuestionId: null,
        activeAttemptId: null,
        timerEndsAt: null,
        revision: { increment: 1 },
      },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function voidLastAttempt(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    if (!session.currentSessionQuestionId || !session.activeAttemptId) {
      return { ok: false, error: "No hay intento para anular" };
    }
    const attempt = await prisma.attempt.findUnique({
      where: { id: session.activeAttemptId },
      include: { scores: true },
    });
    if (!attempt) return { ok: false, error: "Intento no encontrado" };

    if (attempt.outcome === "scored" && attempt.puntosFinales) {
      await prisma.team.update({
        where: { id: attempt.teamId },
        data: { totalPuntos: { decrement: attempt.puntosFinales } },
      });
    }
    await prisma.judgeScore.deleteMany({ where: { attemptId: attempt.id } });
    await prisma.attempt.delete({ where: { id: attempt.id } });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        status: "question_live",
        activeAttemptId: null,
        timerEndsAt: null,
        revision: { increment: 1 },
      },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function startTiebreaker(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    const teams = await prisma.team.findMany({ where: { sessionId: session.id } });
    const { tied, teamIds } = detectFirstPlaceTie(
      teams.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        totalPuntos: t.totalPuntos,
      })),
    );
    if (!tied) {
      return { ok: false, error: "No hay empate en el primer lugar" };
    }
    await prisma.session.update({
      where: { id: session.id },
      data: {
        status: "tiebreaker",
        tiebreakerTeamIds: teamIds,
        revision: { increment: 1 },
      },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function launchTiebreakerQuestion(
  code: string,
  sessionQuestionId: string,
): Promise<ActionResult> {
  const r = await launchQuestion(code, sessionQuestionId);
  if (!r.ok) return r;
  const session = await getSession(code);
  await prisma.session.update({
    where: { id: session.id },
    data: { status: "tiebreaker", revision: { increment: 1 } },
  });
  return { ok: true, data: undefined };
}

export async function endSession(code: string): Promise<ActionResult> {
  try {
    const session = await getSession(code);
    await prisma.session.update({
      where: { id: session.id },
      data: { status: "finished", revision: { increment: 1 } },
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getModeratorData(code: string) {
  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      sessionQuestions: {
        include: { question: true },
        orderBy: { orden: "asc" },
      },
      teams: { orderBy: { ordenTurno: "asc" } },
    },
  });
  return session;
}

export async function getNextEligiblePreview(code: string) {
  const session = await getSession(code);
  if (!session.currentSessionQuestionId) return null;
  const teams = await prisma.team.findMany({
    where: { sessionId: session.id },
    orderBy: { ordenTurno: "asc" },
  });
  const attempts = await prisma.attempt.findMany({
    where: { sessionQuestionId: session.currentSessionQuestionId },
  });
  const attempted = new Set(attempts.map((a) => a.teamId));
  const tieIds = parseTiebreakerIds(session);
  const activeId = session.activeAttemptId
    ? (
        await prisma.attempt.findUnique({
          where: { id: session.activeAttemptId },
        })
      )?.teamId
    : undefined;
  const nextId = nextEligibleTeamId(
    teams,
    attempted,
    tieIds.length ? tieIds : null,
    activeId,
  );
  return teams.find((t) => t.id === nextId)?.nombre ?? null;
}
