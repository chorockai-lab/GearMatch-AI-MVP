"use client";
import { useEffect, useRef } from "react";
import { track, trackAppOpen, type EventName } from "./track";

/** Fires a view event once per mount (and app_open once per browser session). */
export function useTrackOnce(name: EventName, props?: Record<string, string | number | boolean | null>, enabled = true) {
  const sent = useRef(false);
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    if (!enabled || sent.current) return;
    sent.current = true;
    trackAppOpen();
    track(name, JSON.parse(key));
  }, [name, key, enabled]);
}
