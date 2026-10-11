import type { Session } from "@prisma/client";
import { defaultSessionConfig, type SessionConfig } from "@/lib/types";

export function parseSessionConfig(session: Session): SessionConfig {
  const raw = session.config as Partial<SessionConfig> | null;
  const defaults = defaultSessionConfig();
  return {
    judgeScoreScale: raw?.judgeScoreScale ?? defaults.judgeScoreScale,
    wildcardMaxPercent: raw?.wildcardMaxPercent ?? defaults.wildcardMaxPercent,
    timerSeconds: raw?.timerSeconds ?? defaults.timerSeconds,
    judgeTimeoutSeconds: raw?.judgeTimeoutSeconds ?? defaults.judgeTimeoutSeconds,
    buzzEnabled: raw?.buzzEnabled ?? defaults.buzzEnabled,
  };
}

export function parseTiebreakerIds(session: Session): string[] {
  const raw = session.tiebreakerTeamIds;
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export async function bumpRevision(sessionId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.session.update({
    where: { id: sessionId },
    data: { revision: { increment: 1 } },
  });
}
