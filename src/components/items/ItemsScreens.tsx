"use client";
// Page shells for ITEMS: onboarding guard + the user's own match profile (never the animal type).
import { AppFrame, BottomNav } from "@/components/ui/AppChrome";
import { FlowLoading } from "@/components/onboarding/Flow";
import { useRequireOnboarding } from "@/lib/onboarding/useRequireOnboarding";
import type { MatchProfile, Range } from "@/lib/items/types";
import { ItemsMain } from "./ItemsMain";
import { ProductDetail } from "./ProductDetail";
import { SavedItems } from "./SavedItems";

function useMatchProfile(): { me: MatchProfile | null; error: unknown; reload: () => void } {
  const { state, ready, error, reload } = useRequireOnboarding();
  if (!state || !ready) return { me: null, error, reload };
  const p = state.profile;
  return { me: { height_cm: p.height_cm, weight_kg: p.weight_kg, shoe_size_mm: p.shoe_size_mm, typical_run_distance: p.typical_run_distance }, error, reload };
}

export function ItemsScreen({ range }: { range: Range }) {
  const { me, error, reload } = useMatchProfile();
  if (!me) return <FlowLoading error={error} onRetry={reload} />;
  return (
    <AppFrame>
      <ItemsMain range={range} me={me} />
      <BottomNav active="items" />
    </AppFrame>
  );
}

export function ProductScreen({ id, range, from }: { id: string; range: Range; from: string }) {
  const { me, error, reload } = useMatchProfile();
  if (!me) return <FlowLoading error={error} onRetry={reload} />;
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-gm-bg">
      <ProductDetail id={id} range={range} from={from} me={me} />
    </div>
  );
}

export function SavedScreen() {
  const { me, error, reload } = useMatchProfile();
  if (!me) return <FlowLoading error={error} onRetry={reload} />;
  return (
    <AppFrame>
      <SavedItems />
      <BottomNav active="items" />
    </AppFrame>
  );
}
