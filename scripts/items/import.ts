// ITEMS import: validate products / sample runners / runner shoes and write
//   --sql  <file>  SQL to paste into the Supabase SQL Editor (products + non-DEMO runners)
//   --json <file>  local DEMO dataset for NEXT_PUBLIC_ITEMS_DEMO=1 (may contain DEMO runners)
// Inputs:
//   --products <Product DB .xlsx>   (sheets 01_Product_Master · 02_Recommendation_Attrs · 08_Product_Images)
//   --runners <.csv|.xlsx>          (data/templates/seed_runners.csv columns)
//   --runner-shoes <.csv|.xlsx>     (data/templates/seed_runner_shoes.csv columns)
// Exit code 1 when any row is invalid — nothing is written then.
// Run: npm run items:import -- --products "<path>.xlsx" --runners data/demo/seed_runners.csv --runner-shoes data/demo/seed_runner_shoes.csv --json public/demo-data/items-demo.json
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readTable, readWorkbookSheets } from "./io";
import { productsFromWorkbook, productsSql, runnerShoesFromRows, runnersFromRows, runnersSql, toAppProduct, type CatalogProduct, type Issue } from "./validate";
import type { ItemsDataset, SeedRunner, SeedRunnerShoe } from "../../src/lib/items/types";

export async function loadProducts(path: string): Promise<{ products: CatalogProduct[]; issues: Issue[] }> {
  const sheets = await readWorkbookSheets(path);
  const master = sheets.get("01_Product_Master");
  if (!master) throw new Error(`"01_Product_Master" sheet not found in ${path}`);
  return productsFromWorkbook(master, sheets.get("02_Recommendation_Attrs") ?? [], sheets.get("08_Product_Images") ?? []);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function write(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

async function main() {
  const productsPath = arg("products");
  if (!productsPath) {
    console.log("usage: npm run items:import -- --products <xlsx> [--runners <csv|xlsx>] [--runner-shoes <csv|xlsx>] [--sql <out.sql>] [--json <out.json>]");
    process.exit(2);
  }
  const issues: Issue[] = [];
  const { products, issues: pIssues } = await loadProducts(productsPath);
  issues.push(...pIssues);

  let runners: SeedRunner[] = [];
  let shoes: SeedRunnerShoe[] = [];
  if (arg("runners")) {
    const r = runnersFromRows(await readTable(arg("runners")!));
    runners = r.runners;
    issues.push(...r.issues);
  }
  if (arg("runner-shoes")) {
    const s = runnerShoesFromRows(await readTable(arg("runner-shoes")!), new Set(runners.map((r) => r.id)), new Set(products.map((p) => p.id)));
    shoes = s.shoes;
    issues.push(...s.issues);
  }

  const active = products.filter((p) => p.active).length;
  const demo = runners.filter((r) => r.data_source === "demo").length;
  console.log(`products: ${products.length} (shown in app: ${active}, hidden: ${products.length - active}, approved images: ${products.filter((p) => p.image_approved).length})`);
  console.log(`sample runners: ${runners.length} (DEMO: ${demo}) · runner shoes: ${shoes.length}`);
  if (issues.length) {
    console.log(`\n${issues.length} problem(s) — nothing written:`);
    for (const i of issues.slice(0, 50)) console.log(`  ${i.sheet} row ${i.row} · ${i.field}: ${i.message}`);
    process.exit(1);
  }

  const sqlOut = arg("sql");
  if (sqlOut) {
    if (demo > 0) {
      console.log("\nDEMO runners are local-only: SQL is written for products only (no runners / runner shoes).");
      write(sqlOut, `-- GearMatch ITEMS import (products only) · generated ${new Date().toISOString()}\nbegin;\n${productsSql(products)}\ncommit;\n`);
    } else {
      write(sqlOut, `-- GearMatch ITEMS import · generated ${new Date().toISOString()}\nbegin;\n${productsSql(products)}\n\n${runnersSql(runners, shoes)}\ncommit;\n`);
    }
    console.log(`SQL → ${sqlOut}`);
  }
  const jsonOut = arg("json");
  if (jsonOut) {
    const dataset: ItemsDataset = {
      products: products.filter((p) => p.active).map(toAppProduct),
      runners,
      runner_shoes: shoes,
    };
    write(jsonOut, JSON.stringify(dataset));
    console.log(`local dataset → ${jsonOut}`);
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/items/import.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
