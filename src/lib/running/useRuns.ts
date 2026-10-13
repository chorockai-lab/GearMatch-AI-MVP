"use client";
import { useCallback, useEffect, useState } from "react";
import { runsRepository } from "./repository";
import type { RunRecord } from "./types";

/** All saved runs (newest first). `runs` is null while loading; `error` set on failure; `reload` retries. */
export function useRuns() {
  const [runs, setRuns] = useState<RunRecord[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    runsRepository.list().then(
      (r) => alive && setRuns(r),
      (e) => alive && setError(e ?? new Error("load failed")),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);
  const reload = useCallback(() => {
    setError(null);
    setRuns(null);
    setAttempt((n) => n + 1);
  }, []);
  return { runs, error, reload, repo: runsRepository };
}

/** One run by id. `run` is undefined while loading, null when not found. */
export function useRun(id: string) {
  const [run, setRun] = useState<RunRecord | null | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    runsRepository.get(id).then(
      (r) => alive && setRun(r),
      (e) => alive && setError(e ?? new Error("load failed")),
    );
    return () => {
      alive = false;
    };
  }, [id, attempt]);
  const reload = useCallback(() => {
    setError(null);
    setRun(undefined);
    setAttempt((n) => n + 1);
  }, []);
  return { run, error, reload, repo: runsRepository };
}
