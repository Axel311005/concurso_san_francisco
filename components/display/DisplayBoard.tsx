"use client";

import { useSessionSync } from "@/hooks/useSessionSync";
import { Ranking } from "@/components/Ranking";
import { StatusBadge } from "@/components/StatusBadge";
import { Timer } from "@/components/Timer";
import { ReconnectBanner } from "@/components/ReconnectBanner";

export function DisplayBoard({ code }: { code: string }) {
  const { state, reconnecting } = useSessionSync({
    code,
    role: "display",
    intervalMs: 2000,
  });

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-800 text-white">
      <ReconnectBanner show={reconnecting} />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-6 md:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Liga del Saber Franciscana 2026
          </h1>
          <div className="flex items-center gap-4">
            <StatusBadge status={state.status} />
            <span className="text-stone-400">Sala {code}</span>
          </div>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            {state.currentQuestion ? (
              <>
                <p className="text-sm uppercase tracking-wider text-amber-400">
                  {state.currentQuestion.categoria} ·{" "}
                  {state.currentQuestion.puntosBase} puntos
                </p>
                <p className="text-3xl font-semibold leading-snug md:text-5xl">
                  {state.currentQuestion.texto}
                </p>
              </>
            ) : (
              <p className="text-3xl text-stone-400">En espera del moderador</p>
            )}

            {state.activeAttempt && (
              <p className="text-2xl text-amber-200">
                Responde: {state.activeAttempt.teamNombre}
                {state.activeAttempt.usoComodin ? " (comodín)" : ""}
              </p>
            )}

            <div className="flex justify-center py-4">
              <Timer
                endsAt={state.timerEndsAt}
                seconds={state.timerSeconds}
                large
              />
            </div>

            {state.status === "show_scores" && state.lastAttemptPoints != null && (
              <p className="text-center text-4xl font-bold text-green-400">
                +{state.lastAttemptPoints} puntos
              </p>
            )}
          </section>

          <aside>
            <h2 className="mb-4 text-xl font-semibold">Ranking</h2>
            <div className="[&_li]:bg-stone-800 [&_li]:text-white [&_span]:text-stone-300">
              <Ranking
                ranking={state.ranking}
                highlightTeamId={state.activeAttempt?.teamId}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
