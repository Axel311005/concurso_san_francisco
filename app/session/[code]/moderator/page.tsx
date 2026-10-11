import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ModeratorPanel } from "@/components/moderator/ModeratorPanel";
import { getModeratorData } from "@/lib/actions/moderator";

async function ModeratorPageContent({ code }: { code: string }) {
  const session = await getModeratorData(code);
  if (!session) notFound();

  return (
    <ModeratorPanel
      code={session.code}
      sessionQuestions={session.sessionQuestions}
    />
  );
}

export default async function ModeratorPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando moderador…</div>}>
      <ModeratorPageContent code={code} />
    </Suspense>
  );
}
