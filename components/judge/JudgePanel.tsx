"use client";

import { useEffect, useState, useTransition } from "react";
import { authenticateJudge, submitJudgeScore } from "@/lib/actions/judge";
import { useSessionSync } from "@/hooks/useSessionSync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ReconnectBanner } from "@/components/ReconnectBanner";

const STORAGE_KEY = "liga-judge";

export function JudgePanel({ code }: { code: string }) {
  const [hydrated, setHydrated] = useState(false);
  const [judgeId, setJudgeId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [pin, setPin] = useState("");
  const [pending, startTransition] = useTransition();
  const { state, reconnecting, refresh } = useSessionSync({
    code,
    role: "judge",
    intervalMs: 2500,
    enabled: hydrated && !!judgeId,
  });

  useEffect(() => {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}-${code}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { judgeId: string; label: string };
        setJudgeId(parsed.judgeId);
        setLabel(parsed.label);
      } catch {
        sessionStorage.removeItem(`${STORAGE_KEY}-${code}`);
      }
    }
    setHydrated(true);
  }, [code]);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await authenticateJudge(code, pin);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      sessionStorage.setItem(
        `${STORAGE_KEY}-${code}`,
        JSON.stringify(r.data),
      );
      setJudgeId(r.data.judgeId);
      setLabel(r.data.label);
    });
  };

  const submit = (points: number) => {
    if (!judgeId || !state?.activeAttempt) return;
    startTransition(async () => {
      const r = await submitJudgeScore(
        state.activeAttempt!.id,
        judgeId,
        points,
      );
      if (!r.ok) alert(r.error);
      refresh();
    });
  };

  if (!hydrated || !judgeId) {
    return (
      <div className="mx-auto max-w-md p-4">
        <Card>
          <CardHeader>
            <CardTitle>Jurado — {code}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={login} className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                placeholder="PIN"
                className="min-h-[44px] w-full rounded-lg border px-3 text-lg"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                autoComplete="off"
              />
              <Button
                type="submit"
                className="w-full"
                disabled={pending || !hydrated}
                loading={pending}
              >
                {hydrated ? "Entrar" : "Cargando…"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!state) {
    return <div className="p-8 text-center">Cargando…</div>;
  }

  const attempt = state.activeAttempt;
  const maxPts = attempt?.maxPoints ?? 0;
  const submitted =
    attempt &&
    attempt.judgeScoresSubmitted >= attempt.judgeCount &&
    state.status === "show_scores";
  const waiting =
    attempt &&
    state.status === "judging" &&
    attempt.judgeScoresSubmitted < attempt.judgeCount;

  const stepButtons =
    state.config.judgeScoreScale === "steps_0_5_10"
      ? [0, 5, 10].filter((p) => p <= maxPts)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <ReconnectBanner show={reconnecting} />
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <header className="flex items-center justify-between">
          <span className="font-bold">{label}</span>
          <StatusBadge status={state.status} />
        </header>

        {state.currentQuestion && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-stone-500">
                {state.currentQuestion.categoria}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg">{state.currentQuestion.texto}</p>
              {state.currentQuestion.respuestaOficial && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm">
                  <p className="font-semibold">Respuesta oficial</p>
                  <p>{state.currentQuestion.respuestaOficial}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {attempt && state.status === "judging" && (
          <Card>
            <CardContent className="space-y-4 pt-4">
              <p>
                Equipo: <strong>{attempt.teamNombre}</strong>
                {attempt.usoComodin && (
                  <span className="block text-sm text-amber-800">
                    Comodín — tope {maxPts} pts
                  </span>
                )}
              </p>
              <p className="text-sm text-stone-600">
                Tope: {maxPts} puntos
              </p>
              {stepButtons ? (
                <div className="grid grid-cols-3 gap-2">
                  {stepButtons.map((p) => (
                    <Button
                      key={p}
                      size="lg"
                      className="min-h-[56px] text-xl"
                      disabled={pending}
                      onClick={() => submit(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: maxPts + 1 }, (_, i) => i).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      disabled={pending}
                      onClick={() => submit(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {waiting && (
          <p className="text-center text-stone-600" role="status">
            Esperando a los demás jurados…
          </p>
        )}

        {!attempt && state.status !== "judging" && (
          <p className="text-center text-stone-500">
            Esperando intento del moderador
          </p>
        )}

        {submitted && (
          <p className="text-center font-medium text-green-700">
            Puntuación registrada
          </p>
        )}
      </div>
    </div>
  );
}
