import { RunningMainView } from "@/components/running/RunningMainView";
import { isAnimalId } from "@/lib/identity/animals";
import { demoRunningData } from "@/lib/demo/running-demo";
import type { CardState } from "@/lib/running/types";

const STATES: CardState[] = ["first", "base", "run", "milestone"];

// STEP 1: DEMO data only (Supabase is connected in STEP 3).
// Preview any state/animal: /running?state=run&animal=FOX
export default async function RunningPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const state = STATES.includes(sp.state as CardState) ? (sp.state as CardState) : "base";
  const animal = isAnimalId(sp.animal) ? sp.animal : "CHE";
  const { data, today } = demoRunningData(state, animal);
  return <RunningMainView data={data} today={today} />;
}
