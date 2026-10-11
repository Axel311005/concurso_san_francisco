"use client";

import { useTransition } from "react";
import { submitBuzz } from "@/lib/actions/team";
import { useSessionSync } from "@/hooks/useSessionSync";
import { canBuzz } from "@/lib/domain/sessionState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReconnectBanner } from "@/components/ReconnectBanner";

export function TeamPanel({
  code,
  teamId,
}: {
  code: string;
  teamId: string;
}) {
  const { state, reconnecting, refresh } = useSessionSync({
    code,
    role: "team",
    teamId,
    intervalMs: 2500,
  });
  const [pending, startTransition] = useTransition();

  const team = state?.teams.find((t) => t.id === teamId);

  const buzzOk =
    state &&
    team &&
    canBuzz(
      state.status,
      state.config.buzzEnabled,
      team.attemptedCurrentQuestion,
    );

  const onBuzz = () => {
    startTransition(async () => {
      const r = await submitBuzz(code, teamId);
      if (!r.ok) alert(r.error);
      refresh();
    });
  };

  if (!state || !team) {
    return <div className="p-8 text-center">Cargando…</div>;
  }

  let message = "En espera";
  if (team.isAnswering) message = "¡Tu equipo responde!";
  else if (team.attemptedCurrentQuestion) message = "Ya respondiste esta pregunta";
  else if (state.status === "question_live") message = "Puedes hacer buzz";

  return (
    <div className="min-h-screen bg-background">
      <ReconnectBanner show={reconnecting} />
      <div className="mx-auto max-w-md space-y-6 p-4">
        <header className="text-center">
          <h1 className="text-2xl font-bold">{team.nombre}</h1>
          <p className="text-stone-600">Sala {code}</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">{message}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.currentQuestion && (
              <p className="text-center text-sm text-stone-600">
                Pregunta en curso — {state.currentQuestion.puntosBase} pts
              </p>
            )}
            <Button
              size="lg"
              className="min-h-[120px] w-full text-3xl shadow-lg shadow-primary/30"
              disabled={!buzzOk || pending}
              onClick={onBuzz}
              aria-label="Buzz"
            >
              BUZZ
            </Button>
            <p className="text-center text-xs text-stone-500">
              {team.totalPuntos} puntos totales
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
