"use server";

import bcrypt from "bcryptjs";
import { finalizeAttemptIfComplete } from "@/lib/actions/game-core";
import { maxPointsForAttempt, clampPoints } from "@/lib/domain/scoring";
import { prisma } from "@/lib/prisma";
import { parseSessionConfig } from "@/lib/session-helpers";
import { judgePinSchema, scoreSubmitSchema } from "@/lib/validators/session";
import type { ActionResult } from "@/lib/actions/admin";

export async function authenticateJudge(
  code: string,
  pin: string,
): Promise<ActionResult<{ judgeId: string; label: string }>> {
  const parsed = judgePinSchema.safeParse({ code, pin });
  if (!parsed.success) {
    return { ok: false, error: "PIN inválido" };
  }
  const session = await prisma.session.findUnique({
    where: { code: parsed.data.code.toUpperCase() },
    include: { judges: true },
  });
  if (!session) return { ok: false, error: "Sesión no encontrada" };

  for (const judge of session.judges) {
    if (await bcrypt.compare(parsed.data.pin, judge.pinHash)) {
      return { ok: true, data: { judgeId: judge.id, label: judge.label } };
    }
  }
  return { ok: false, error: "PIN incorrecto" };
}

export async function submitJudgeScore(
  attemptId: string,
  judgeId: string,
  points: number,
): Promise<ActionResult> {
  const parsed = scoreSubmitSchema.safeParse({ attemptId, judgeId, points });
  if (!parsed.success) {
    return { ok: false, error: "Puntaje inválido" };
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      sessionQuestion: { include: { question: true, session: true } },
      scores: true,
    },
  });
  if (!attempt) return { ok: false, error: "Intento no encontrado" };

  const session = attempt.sessionQuestion.session;
  const config = parseSessionConfig(session);
  const maxPts = maxPointsForAttempt(
    attempt.sessionQuestion.question.puntosBase,
    attempt.usoComodin,
    config.wildcardMaxPercent,
  );
  const clamped = clampPoints(parsed.data.points, maxPts);

  const existing = await prisma.judgeScore.findUnique({
    where: {
      attemptId_judgeId: { attemptId, judgeId },
    },
  });
  if (existing) {
    await prisma.judgeScore.update({
      where: { id: existing.id },
      data: { points: clamped },
    });
  } else {
    await prisma.judgeScore.create({
      data: { attemptId, judgeId, points: clamped },
    });
  }

  await finalizeAttemptIfComplete(session, attemptId);
  await prisma.session.update({
    where: { id: session.id },
    data: { revision: { increment: 1 } },
  });

  return { ok: true, data: undefined };
}
