import { JudgePanel } from "@/components/judge/JudgePanel";

export default async function JudgePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <JudgePanel code={code.toUpperCase()} />;
}
