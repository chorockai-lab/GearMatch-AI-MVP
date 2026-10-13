import { ProductScreen } from "@/components/items/ItemsScreens";

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <ProductScreen id={decodeURIComponent(id)} range={sp.range === "wide" ? "wide" : "base"} from={sp.from === "saved" ? "saved" : "items"} />;
}
