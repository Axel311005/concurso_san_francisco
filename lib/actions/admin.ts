"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { upsertQuestionsFromJson } from "@/lib/domain/importQuestions";
import { prisma } from "@/lib/prisma";
import { defaultSessionConfig } from "@/lib/types";
import {
  createSessionSchema,
  judgeInputSchema,
  teamInputSchema,
} from "@/lib/validators/session";
import { readFile } from "fs/promises";
import path from "path";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function importQuestionsFromFile(
  jsonText: string,
): Promise<ActionResult<{ imported: number; errors: string[] }>> {
  try {
    const raw = JSON.parse(jsonText) as unknown;
    const result = await upsertQuestionsFromJson(prisma, raw);
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "JSON inválido",
    };
  }
}

export async function importQuestionsFromRepo(): Promise<
  ActionResult<{ imported: number; errors: string[] }>
> {
  try {
    const filePath = path.join(
      process.cwd(),
      "data/preguntas-liga-saber-franciscano-2026.import.json",
    );
    const text = await readFile(filePath, "utf-8");
    return importQuestionsFromFile(text);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo leer el archivo",
    };
  }
}

export async function createSession(
  code: string,
): Promise<ActionResult<{ sessionId: string; code: string }>> {
  const parsed = createSessionSchema.safeParse({ code });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Código inválido" };
  }
  const upper = parsed.data.code.toUpperCase();
  try {
    const questions = await prisma.question.findMany({ orderBy: { createdAt: "asc" } });
    if (questions.length === 0) {
      return { ok: false, error: "Importa preguntas antes de crear la sesión" };
    }
    const session = await prisma.session.create({
      data: {
        code: upper,
        config: defaultSessionConfig(),
        sessionQuestions: {
          create: questions.map((q, i) => ({
            questionId: q.id,
            orden: i,
          })),
        },
      },
    });
    revalidatePath("/admin");
    return { ok: true, data: { sessionId: session.id, code: session.code } };
  } catch {
    return { ok: false, error: "El código ya existe o hubo un error" };
  }
}

export async function addTeam(
  sessionId: string,
  input: { nombre: string; miembros: string[]; ordenTurno: number },
): Promise<ActionResult<{ teamId: string }>> {
  const parsed = teamInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos de equipo inválidos" };
  }
  try {
    const team = await prisma.team.create({
      data: {
        sessionId,
        nombre: parsed.data.nombre,
        miembros: parsed.data.miembros,
        ordenTurno: parsed.data.ordenTurno,
      },
    });
    await prisma.session.update({
      where: { id: sessionId },
      data: { revision: { increment: 1 } },
    });
    return { ok: true, data: { teamId: team.id } };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2024" || e.code === "P1001" || e.code === "P1008") {
        return {
          ok: false,
          error:
            "Conexión a la base de datos ocupada. Cierra pestañas de jurado/tablero, reinicia `npm run dev` y vuelve a intentar.",
        };
      }
      return {
        ok: false,
        error: `No se pudo guardar el equipo (${e.code}). Intenta de nuevo.`,
      };
    }
    return {
      ok: false,
      error: "Error inesperado al guardar el equipo.",
    };
  }
}

export async function addJudge(
  sessionId: string,
  input: { label: string; pin: string },
): Promise<ActionResult<{ judgeId: string }>> {
  const parsed = judgeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos de jurado inválidos" };
  }
  const pinHash = await bcrypt.hash(parsed.data.pin, 10);
  const judge = await prisma.judge.create({
    data: {
      sessionId,
      label: parsed.data.label,
      pinHash,
    },
  });
  await prisma.session.update({
    where: { id: sessionId },
    data: { revision: { increment: 1 } },
  });
  return { ok: true, data: { judgeId: judge.id } };
}

export async function getAdminSessions() {
  return prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teams: { orderBy: { ordenTurno: "asc" } },
      judges: { orderBy: { label: "asc" } },
      _count: { select: { sessionQuestions: true } },
    },
  });
}

export async function getQuestionCount() {
  return prisma.question.count();
}
