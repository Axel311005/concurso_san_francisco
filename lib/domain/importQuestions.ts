import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import {
  parseQuestionsJson,
  type QuestionImportItem,
} from "@/lib/validators/questionImport";

export function hashQuestionText(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

export function mapImportItem(item: QuestionImportItem) {
  return {
    texto: item.text,
    respuestaOficial: item.modelAnswer,
    categoria: item.category,
    puntosBase: item.basePoints,
    esDesempate: item.isTiebreaker,
    textoHash: hashQuestionText(item.text),
  };
}

export async function upsertQuestionsFromJson(
  prisma: PrismaClient,
  raw: unknown,
): Promise<{ imported: number; errors: string[] }> {
  const parsed = parseQuestionsJson(raw);
  if (!parsed.success) {
    return { imported: 0, errors: [parsed.error] };
  }
  const errors: string[] = [];
  let imported = 0;
  for (const item of parsed.data) {
    try {
      const data = mapImportItem(item);
      await prisma.question.upsert({
        where: { textoHash: data.textoHash },
        create: data,
        update: {
          texto: data.texto,
          respuestaOficial: data.respuestaOficial,
          categoria: data.categoria,
          puntosBase: data.puntosBase,
          esDesempate: data.esDesempate,
        },
      });
      imported++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Error desconocido");
    }
  }
  return { imported, errors };
}
