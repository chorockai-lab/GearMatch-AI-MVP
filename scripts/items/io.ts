// Table readers for ITEMS imports: .xlsx (first row = header) and .csv (RFC 4180, UTF-8, BOM ok).
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import type { Row } from "./validate";

function parseCsv(textIn: string): string[][] {
  const t = textIn.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const toObjects = (table: unknown[][]): Row[] => {
  const [header, ...body] = table;
  const keys = (header ?? []).map((h) => String(h ?? "").trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? null])));
};

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v == null) return null;
  if (typeof v === "object") {
    if ("result" in v) return (v as ExcelJS.CellFormulaValue).result ?? null;
    if ("text" in v) return (v as ExcelJS.CellHyperlinkValue).text;
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("");
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return v;
}

export async function readWorkbookSheets(path: string): Promise<Map<string, Row[]>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const sheets = new Map<string, Row[]>();
  wb.eachSheet((ws) => {
    const table: unknown[][] = [];
    ws.eachRow({ includeEmpty: false }, (r) => {
      const values = (r.values as ExcelJS.CellValue[]).slice(1).map(cellValue);
      if (values.some((x) => x != null && String(x).trim() !== "")) table.push(values);
    });
    sheets.set(ws.name, toObjects(table));
  });
  return sheets;
}

/** Rows of a CSV file, or of the first (or named) sheet of an .xlsx file. */
export async function readTable(path: string, sheet?: string): Promise<Row[]> {
  if (/\.xlsx$/i.test(path)) {
    const sheets = await readWorkbookSheets(path);
    const rows = sheet ? sheets.get(sheet) : [...sheets.values()][0];
    if (!rows) throw new Error(`sheet "${sheet}" not found in ${path}`);
    return rows;
  }
  return toObjects(parseCsv(readFileSync(path, "utf8")));
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}
