"use server";

import { prisma } from "@/lib/prisma";
import { parseSessionConfig } from "@/lib/session-helpers";
import type { ActionResult } from "@/lib/actions/admin";

export async function submitBuzz(
  code: string,
  teamId: string,
): Promise<ActionResult> {
  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!session || !session.currentSessionQuestionId) {
    return { ok: false, error: "No hay pregunta activa" };
  }
  const config = parseSessionConfig(session);
  if (!config.buzzEnabled || session.status !== "question_live") {
    return { ok: false, error: "Buzz no disponible" };
  }

  const existing = await prisma.attempt.findUnique({
    where: {
      sessionQuestionId_teamId: {
        sessionQuestionId: session.currentSessionQuestionId,
        teamId,
      },
    },
  });
  if (existing) {
    return { ok: false, error: "Ya respondiste esta pregunta" };
  }

  const priorBuzz = await prisma.buzz.findFirst({
    where: {
      sessionId: session.id,
      sessionQuestionId: session.currentSessionQuestionId,
      teamId,
    },
  });
  if (priorBuzz) {
    return { ok: true, data: undefined };
  }

  await prisma.buzz.create({
    data: {
      sessionId: session.id,
      sessionQuestionId: session.currentSessionQuestionId,
      teamId,
    },
  });
  await prisma.session.update({
    where: { id: session.id },
    data: { revision: { increment: 1 } },
  });
  return { ok: true, data: undefined };
}
