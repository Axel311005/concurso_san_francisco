-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('lobby', 'question_live', 'team_answering', 'judging', 'show_scores', 'tiebreaker', 'finished');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('pending', 'scored', 'wrong', 'timeout');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "respuestaOficial" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "puntosBase" INTEGER NOT NULL,
    "esDesempate" BOOLEAN NOT NULL DEFAULT false,
    "textoHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'lobby',
    "config" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "currentSessionQuestionId" TEXT,
    "activeAttemptId" TEXT,
    "timerEndsAt" TIMESTAMP(3),
    "tiebreakerTeamIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "miembros" JSONB NOT NULL,
    "ordenTurno" INTEGER NOT NULL,
    "totalPuntos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Judge" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,

    CONSTRAINT "Judge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "cerrada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SessionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "sessionQuestionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "usoComodin" BOOLEAN NOT NULL DEFAULT false,
    "respondedByName" TEXT,
    "outcome" "AttemptOutcome" NOT NULL DEFAULT 'pending',
    "puntosFinales" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeScore" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "JudgeScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buzz" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionQuestionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Buzz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_textoHash_key" ON "Question"("textoHash");

-- CreateIndex
CREATE UNIQUE INDEX "Session_code_key" ON "Session"("code");

-- CreateIndex
CREATE INDEX "Team_sessionId_idx" ON "Team"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Judge_sessionId_label_key" ON "Judge"("sessionId", "label");

-- CreateIndex
CREATE INDEX "SessionQuestion_sessionId_idx" ON "SessionQuestion"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionQuestion_sessionId_questionId_key" ON "SessionQuestion"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_sessionQuestionId_teamId_key" ON "Attempt"("sessionQuestionId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeScore_attemptId_judgeId_key" ON "JudgeScore"("attemptId", "judgeId");

-- CreateIndex
CREATE INDEX "Buzz_sessionId_sessionQuestionId_idx" ON "Buzz"("sessionId", "sessionQuestionId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Judge" ADD CONSTRAINT "Judge_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionQuestion" ADD CONSTRAINT "SessionQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionQuestion" ADD CONSTRAINT "SessionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_sessionQuestionId_fkey" FOREIGN KEY ("sessionQuestionId") REFERENCES "SessionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeScore" ADD CONSTRAINT "JudgeScore_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeScore" ADD CONSTRAINT "JudgeScore_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buzz" ADD CONSTRAINT "Buzz_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buzz" ADD CONSTRAINT "Buzz_sessionQuestionId_fkey" FOREIGN KEY ("sessionQuestionId") REFERENCES "SessionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buzz" ADD CONSTRAINT "Buzz_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
