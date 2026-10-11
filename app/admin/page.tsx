import { Suspense } from "react";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { getAdminSessions, getQuestionCount } from "@/lib/actions/admin";

async function AdminPageContent() {
  const [sessions, questionCount] = await Promise.all([
    getAdminSessions(),
    getQuestionCount(),
  ]);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return (
    <AdminPanel
      sessions={sessions.map((s) => ({
        id: s.id,
        code: s.code,
        teams: s.teams,
        judges: s.judges,
      }))}
      questionCount={questionCount}
      baseUrl={baseUrl}
    />
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-stone-600">Cargando administración…</div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
