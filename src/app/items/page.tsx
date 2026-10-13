import { Placeholder } from "@/components/ui/Placeholder";
import { TrackView } from "@/components/ui/TrackView";

export default function Page() {
  return (
    <>
      <TrackView name="items_view" />
      <Placeholder title="ITEMS" step="STEP 4" note="Runners Like You · 유사 러너 집계 · Product Detail · Saved" tab="items" />
    </>
  );
}
