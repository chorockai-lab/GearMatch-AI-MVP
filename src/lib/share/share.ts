// Saving / sharing a generated card PNG. Results are reported exactly as they happened:
//   share    → "shared" (the system share sheet completed) · "cancelled" (user closed it — not an error) · "failed"
//   download → "started" (the browser was asked to download — NOT proof the image reached the photo library) · "failed"
//   longpress→ "guide_shown" (in-app browsers: we can only show the image and explain long-press saving)
import { detectBrowser } from "@/lib/qa/browser";

export type CardKind = "runner" | "stats";
export type ShareMethod = "create" | "share" | "download" | "longpress";
export type ShareResult = "shared" | "cancelled" | "failed" | "started" | "guide_shown";

/** KakaoTalk and other app WebViews: downloads usually go nowhere, so we show the image for long-press instead. */
export function isInAppBrowser(ua: string): boolean {
  const kind = detectBrowser(ua);
  return kind === "kakaotalk-inapp" || kind === "other-inapp";
}

export function canShareFile(file: File): boolean {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function shareFile(file: File): Promise<"shared" | "cancelled" | "failed"> {
  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError" ? "cancelled" : "failed";
  }
}

export function startDownload(blob: Blob, filename: string): "started" | "failed" {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "started";
  } catch {
    return "failed";
  }
}

/** gearmatch-runner-card-20261015.png */
export function cardFilename(card: CardKind, date = new Date()): string {
  const d = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `gearmatch-${card}-card-${d}.png`;
}
