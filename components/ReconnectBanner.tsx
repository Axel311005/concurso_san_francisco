export function ReconnectBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white"
      role="status"
    >
      Reconectando…
    </div>
  );
}
