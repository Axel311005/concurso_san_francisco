import type { SessionStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

const labels: Record<SessionStatus, string> = {
  lobby: "Lobby",
  question_live: "Pregunta en vivo",
  team_answering: "Respondiendo",
  judging: "Calificando",
  show_scores: "Puntuación",
  tiebreaker: "Desempate",
  finished: "Finalizado",
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary",
      )}
    >
      {labels[status]}
    </span>
  );
}
