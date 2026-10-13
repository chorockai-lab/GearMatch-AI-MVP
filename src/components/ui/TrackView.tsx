"use client";
import { useTrackOnce } from "@/lib/events/useTrackOnce";
import type { EventName } from "@/lib/events/track";

/** Drop-in view event for server-rendered pages (renders nothing). */
export function TrackView({ name }: { name: EventName }) {
  useTrackOnce(name);
  return null;
}
