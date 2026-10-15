// /dev/session — QA re-visit check (docs/QA_REVISIT.md). Available locally and on Vercel Preview only:
// a Production build answers 404 (VERCEL_ENV is set by Vercel at build and run time; unset locally).
import { notFound } from "next/navigation";
import { SessionCheck } from "./SessionCheck";

export default function DevSession() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <SessionCheck />;
}
