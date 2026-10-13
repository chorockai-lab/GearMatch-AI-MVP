// Run records data access. Screens talk ONLY to `runsRepository`.
//   server: Supabase `runs` table (RLS: own rows only). A run counts as saved only after the insert succeeds.
//   local : this browser's localStorage — TEMPORARY, never described as a server save.
// Pace is never stored; it is derived from distance + time (format.ts).
import { STORAGE_MODE } from "@/lib/config";
import { ensureUserId, getSupabase } from "@/lib/supabase/client";
import type { RunRecord } from "./types";

export interface RunInput {
  runDate: string; // local calendar date "YYYY-MM-DD"
  distanceKm: number;
  durationSec: number;
  shoe: string | null; // snapshot — not changed later when the current shoe changes
}

export interface RunsRepository {
  readonly kind: "server" | "local-temporary";
  /** newest first: run_date desc, then latest saved first */
  list(): Promise<RunRecord[]>;
  get(id: string): Promise<RunRecord | null>;
  create(input: RunInput): Promise<RunRecord>;
  update(id: string, input: RunInput): Promise<RunRecord>;
  remove(id: string): Promise<void>;
}

export const sortRuns = (runs: RunRecord[]) =>
  runs.slice().sort((a, b) => b.runDate.localeCompare(a.runDate) || b.createdAt.localeCompare(a.createdAt));

// ── server ──────────────────────────────────────────────────────────────────

interface RunRow {
  id: string;
  run_date: string;
  distance_km: number | string;
  duration_sec: number;
  shoe_label: string | null;
  created_at: string;
}

const fromRow = (r: RunRow): RunRecord => ({
  id: r.id,
  runDate: r.run_date,
  distanceKm: Number(r.distance_km),
  durationSec: r.duration_sec,
  shoe: r.shoe_label,
  createdAt: r.created_at,
});
const toRow = (i: RunInput) => ({ run_date: i.runDate, distance_km: i.distanceKm, duration_sec: i.durationSec, shoe_label: i.shoe });
const COLS = "id, run_date, distance_km, duration_sec, shoe_label, created_at";

function db() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  return sb;
}

export const serverRunsRepository: RunsRepository = {
  kind: "server",
  async list() {
    await ensureUserId();
    const { data, error } = await db().from("runs").select(COLS).order("run_date", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return (data as RunRow[]).map(fromRow);
  },
  async get(id) {
    await ensureUserId();
    const { data, error } = await db().from("runs").select(COLS).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as RunRow) : null;
  },
  async create(input) {
    await ensureUserId();
    const { data, error } = await db().from("runs").insert(toRow(input)).select(COLS).single();
    if (error) throw error;
    return fromRow(data as RunRow);
  },
  async update(id, input) {
    await ensureUserId();
    const { data, error } = await db().from("runs").update(toRow(input)).eq("id", id).select(COLS).single();
    if (error) throw error;
    return fromRow(data as RunRow);
  },
  async remove(id) {
    await ensureUserId();
    const { data, error } = await db().from("runs").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("run not found");
  },
};

// ── local (temporary) ───────────────────────────────────────────────────────

const KEY = "gearmatch.runs.v1";
let memory: RunRecord[] = [];
let storageWorks = true;

function readLocal(): RunRecord[] {
  if (!storageWorks) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as RunRecord[]) : [];
  } catch {
    storageWorks = false;
    return memory;
  }
}

function writeLocal(runs: RunRecord[]) {
  memory = runs;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(runs));
  } catch {
    storageWorks = false;
  }
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const localRunsRepository: RunsRepository = {
  kind: "local-temporary",
  async list() {
    return sortRuns(readLocal());
  },
  async get(id) {
    return readLocal().find((r) => r.id === id) ?? null;
  },
  async create(input) {
    const run: RunRecord = { id: newId(), ...input, createdAt: new Date().toISOString() };
    writeLocal([...readLocal(), run]);
    return run;
  },
  async update(id, input) {
    const runs = readLocal();
    const i = runs.findIndex((r) => r.id === id);
    if (i < 0) throw new Error("run not found");
    const run = { ...runs[i], ...input }; // id and createdAt are kept
    runs[i] = run;
    writeLocal(runs);
    return run;
  },
  async remove(id) {
    const runs = readLocal();
    if (!runs.some((r) => r.id === id)) throw new Error("run not found");
    writeLocal(runs.filter((r) => r.id !== id));
  },
};

export const runsRepository: RunsRepository = STORAGE_MODE === "server" ? serverRunsRepository : localRunsRepository;
