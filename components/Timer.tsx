"use client";

import { useEffect, useState } from "react";

export function Timer({
  endsAt,
  seconds,
  large,
}: {
  endsAt: string | null;
  seconds: number;
  large?: boolean;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(seconds);
      return;
    }
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt, seconds]);

  const urgent = remaining <= 3 && endsAt;
  return (
    <div
      className={`tabular-nums font-bold ${
        large ? "text-6xl md:text-8xl" : "text-3xl"
      } ${urgent ? "text-red-600" : "text-amber-800"}`}
      aria-live="polite"
      aria-label={`Tiempo restante: ${remaining} segundos`}
    >
      {endsAt ? remaining : "—"}
    </div>
  );
}
