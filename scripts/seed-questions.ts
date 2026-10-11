import "dotenv/config";
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { upsertQuestionsFromJson } from "../lib/domain/importQuestions";

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(
    process.cwd(),
    "data/preguntas-liga-saber-franciscano-2026.import.json",
  );
  const text = await readFile(filePath, "utf-8");
  const raw = JSON.parse(text) as unknown;
  const result = await upsertQuestionsFromJson(prisma, raw);
  console.log(`Importadas: ${result.imported}`);
  if (result.errors.length) {
    console.error("Errores:", result.errors);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
