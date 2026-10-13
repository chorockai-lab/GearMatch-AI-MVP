import { notFound } from "next/navigation";
import { RunnerTest } from "@/components/onboarding/RunnerTest";

export function generateStaticParams() {
  return ["1", "2", "3", "4", "5"].map((n) => ({ n }));
}

export default async function RunnerTestPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1 || num > 5) notFound();
  // key: fresh component state per question (no carried-over selection between screens)
  return <RunnerTest key={num} n={num} />;
}
