import { TeamPanel } from "@/components/team/TeamPanel";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ code: string; teamId: string }>;
}) {
  const { code, teamId } = await params;
  return <TeamPanel code={code.toUpperCase()} teamId={teamId} />;
}
