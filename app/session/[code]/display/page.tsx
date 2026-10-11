import { DisplayBoard } from "@/components/display/DisplayBoard";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <DisplayBoard code={code.toUpperCase()} />;
}
