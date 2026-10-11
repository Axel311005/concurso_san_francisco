export function Ranking({
  ranking,
  highlightTeamId,
}: {
  ranking: { teamId: string; nombre: string; totalPuntos: number }[];
  highlightTeamId?: string;
}) {
  return (
    <ol className="space-y-2">
      {ranking.map((t, i) => (
        <li
          key={t.teamId}
          className={`flex items-center justify-between rounded-lg px-4 py-3 ${
            t.teamId === highlightTeamId
              ? "bg-amber-100 ring-2 ring-amber-500"
              : "bg-stone-50"
          }`}
        >
          <span className="font-medium">
            <span className="mr-2 text-stone-500">{i + 1}.</span>
            {t.nombre}
          </span>
          <span className="text-xl font-bold tabular-nums">{t.totalPuntos}</span>
        </li>
      ))}
    </ol>
  );
}
