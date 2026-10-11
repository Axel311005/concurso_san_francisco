import { z } from "zod";

export const questionImportItemSchema = z.object({
  text: z.string().min(1),
  modelAnswer: z.string().min(1),
  category: z.string().min(1),
  basePoints: z.number().int().positive(),
  isTiebreaker: z.boolean().default(false),
});

export type QuestionImportItem = z.infer<typeof questionImportItemSchema>;

const fileSchema = z.union([
  z.array(questionImportItemSchema),
  z.object({ questions: z.array(questionImportItemSchema) }),
]);

export function parseQuestionsJson(raw: unknown):
  | { success: true; data: QuestionImportItem[] }
  | { success: false; error: string } {
  const result = fileSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  const data = Array.isArray(result.data)
    ? result.data
    : result.data.questions;
  return { success: true, data };
}
