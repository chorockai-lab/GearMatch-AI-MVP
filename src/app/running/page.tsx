import { RunningMainView } from "@/components/running/RunningMainView";
import { RunningFromOnboarding } from "@/components/running/RunningFromOnboarding";
import { isAnimalId } from "@/lib/identity/animals";
import { demoRunningData } from "@/lib/demo/running-demo";
import type { CardState } from "@/lib/running/types";

const STATES: CardState[] = ["first", "base", "run", "milestone"];

// /running            → the user's own Runner (onboarding result, stored temporarily in this browser)
// /running?state=run&animal=FOX → DEMO preview of any state/animal (QA; shows the DEMO DATA marker)
export default async function RunningPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  if (sp.state === undefined && sp.animal === undefined) return <RunningFromOnboarding />;
  const state = STATES.includes(sp.state as CardState) ? (sp.state as CardState) : "base";
  const animal = isAnimalId(sp.animal) ? sp.animal : "CHE";
  const { data, today } = demoRunningData(state, animal);
  return <RunningMainView data={data} today={today} />;
}
