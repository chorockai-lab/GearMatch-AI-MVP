import { ItemsScreen } from "@/components/items/ItemsScreens";

// ITEMS — Runners Like You. ?range=wide only after the user chose "조건이 가까운 러너까지 보기".
export default async function ItemsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <ItemsScreen key={String(sp.range)} range={sp.range === "wide" ? "wide" : "base"} />;
}
