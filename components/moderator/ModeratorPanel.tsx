"use client";

import { useState, useTransition } from "react";
import {
  activateWildcard,
  advanceFromScores,
  assignFirstBuzz,
  assignTeamAndStart,
  closeForJudging,
  closeQuestion,
  endSession,
  launchQuestion,
  launchTiebreakerQuestion,
  markTimeout,
  markWrong,
  startTiebreaker,
  voidLastAttempt,
} from "@/lib/actions/moderator";
import { useSessionSync } from "@/hooks/useSessionSync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ranking } from "@/components/Ranking";
import { StatusBadge } from "@/components/StatusBadge";
import { Timer } from "@/components/Timer";
import { ReconnectBanner } from "@/components/ReconnectBanner";

type Sq = {
  id: string;
  orden: number;
  cerrada: boolean;
  question: {
    texto: string;
    categoria: string;
    puntosBase: number;
    esDesempate: boolean;
  };
};

export function ModeratorPanel({
  code,
  sessionQuestions,
}: {
  code: string;
  sessionQuestions: Sq[];
}) {
  const { state, reconnecting, refresh } = useSessionSync({
    code,
    role: "moderator",
    intervalMs: 2000,
  });
  const [pending, startTransition] = useTransition();
  const [confirmVoid, setConfirmVoid] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) alert(r.error);
      refresh();
    });
  };

  if (!state) {
    return (
      <div className="p-8 text-center text-stone-600">Cargando sesión…</div>
    );
  }

  const openQuestions = sessionQuestions.filter((q) => !q.cerrada);

  return (
    <div className="min-h-screen bg-background">
      <ReconnectBanner show={reconnecting} />
      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <header className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold">Moderador — {code}</h1>
            <StatusBadge status={state.status} />
          </header>

          {state.currentQuestion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-stone-500">
                  {state.currentQuestion.categoria} · {state.currentQuestion.puntosBase} pts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg">{state.currentQuestion.texto}</p>
                {state.currentQuestion.respuestaOficial && (
                  <div className="rounded-lg bg-amber-50 p-3 text-sm">
                    <p className="font-semibold text-amber-900">Respuesta oficial</p>
                    <p>{state.currentQuestion.respuestaOficial}</p>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <Timer
                    endsAt={state.timerEndsAt}
                    seconds={state.timerSeconds}
                  />
                  {state.activeAttempt && (
                    <span className="text-sm">
                      Responde: <strong>{state.activeAttempt.teamNombre}</strong>
                      {state.activeAttempt.usoComodin && " (comodín)"}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Equipos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {state.teams.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <span className="font-medium">{t.nombre}</span>
                    {t.attemptedCurrentQuestion && (
                      <span className="ml-2 text-xs text-stone-500">
                        ya respondió
                      </span>
                    )}
                    {t.isAnswering && (
                      <span className="ml-2 text-xs font-semibold text-amber-700">
                        en turno
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={
                      pending ||
                      !state.currentQuestion ||
                      t.attemptedCurrentQuestion ||
                      state.status === "team_answering"
                    }
                    onClick={() =>
                      run(() => assignTeamAndStart(code, t.id))
                    }
                  >
                    Asignar
                  </Button>
                </div>
              ))}
              {state.buzzes.length > 0 && (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(() => assignFirstBuzz(code))}
                >
                  Primer buzz: {state.buzzes[0].teamNombre}
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {state.status === "team_answering" && (
              <>
                <Button
                  disabled={pending}
                  onClick={() => run(() => closeForJudging(code))}
                >
                  Cerrar para jurados
                </Button>
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(() => activateWildcard(code))}
                >
                  Comodín
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => run(() => markWrong(code))}
                >
                  Incorrecto
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => markTimeout(code))}
                >
                  Tiempo agotado
                </Button>
              </>
            )}
            {state.status === "show_scores" && (
              <>
                <p className="w-full text-lg font-semibold">
                  Puntos del intento: {state.lastAttemptPoints ?? "—"}
                </p>
                <Button
                  disabled={pending}
                  onClick={() => run(() => advanceFromScores(code))}
                >
                  Continuar
                </Button>
              </>
            )}
            {state.status === "lobby" && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => run(() => startTiebreaker(code))}
              >
                Iniciar desempate
              </Button>
            )}
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run(() => closeQuestion(code))}
            >
              Cerrar pregunta
            </Button>
            {!confirmVoid ? (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmVoid(true)}
              >
                Anular intento
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  run(() => voidLastAttempt(code));
                  setConfirmVoid(false);
                }}
              >
                Confirmar anular
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => endSession(code))}
            >
              Finalizar concurso
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preguntas</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[50vh] space-y-2 overflow-y-auto">
              {openQuestions.map((sq) => (
                <Button
                  key={sq.id}
                  variant={
                    state.currentQuestion?.sessionQuestionId === sq.id
                      ? "default"
                      : "outline"
                  }
                  className="h-auto w-full justify-start whitespace-normal py-2 text-left text-sm"
                  disabled={pending}
                  onClick={() => {
                    const fn =
                      state.status === "tiebreaker"
                        ? () => launchTiebreakerQuestion(code, sq.id)
                        : () => launchQuestion(code, sq.id);
                    run(fn);
                  }}
                >
                  <span className="line-clamp-2">
                    {sq.orden + 1}. {sq.question.texto}
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <Ranking ranking={state.ranking} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
