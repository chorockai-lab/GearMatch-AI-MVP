"use client";
// "이미지 저장" (Issue #16, save UX v2): renders the on-screen card (by id) into a 3× PNG with a small GEARMATCH mark
// and saves it the way this browser really can:
//   • iPhone (Safari / Chrome, not in-app) → system share sheet (its "이미지 저장" puts it in Photos).
//     Safari only opens the sheet right after a tap, so on iPhone the PNG is prepared in the background while the
//     card is on screen; if it is not ready or the sheet is refused, we fall back to the preview + long-press.
//   • Android Chrome and other browsers → immediate download (generated on tap; no background work).
//   • KakaoTalk / other in-app browsers → preview + long-press saving (downloads usually go nowhere there).
// Completion we cannot observe is never shown as success. Nothing is sent to a server.
import { useCallback, useEffect, useRef, useState } from "react";
import { isQaSession, track } from "@/lib/events/track";
import { paintInto } from "@/lib/share/paint";
import { canShareFile, cardFilename, isInAppBrowser, saveTarget, shareFile, startDownload, type CardKind, type ShareMethod, type ShareResult } from "@/lib/share/share";
import { PrimaryButton } from "@/components/onboarding/Flow";
import { CloseIcon, SaveIcon } from "@/components/ui/icons";

const SCALE = 3;
const WIDTH = 390; // design width (UI handoff) — the image is the same on every phone
const BG = "#0a0a0a"; // --color-gm-bg
const TIMEOUT_MS = 15_000;
const PREPARE_DELAY_MS = 700; // let the page settle before the background render (iPhone only)

interface CardImage {
  blob: Blob;
  file: File;
}
interface Sheet {
  url: string; // data URL — long-press saving works most reliably with it
  file: File;
  shareable: boolean; // in-app browsers that support the share sheet keep their 공유하기 button
  note: string;
}

/** Two animation frames for layout — with a timer fallback, since browsers pause frames in hidden pages. */
const nextFrame = () =>
  Promise.race([new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))), new Promise((r) => setTimeout(r, 120))]);

/** Which step of the image pipeline is running and since when — for the QA diagnosis of a failure. */
interface Trace {
  stage: string;
  t0: number;
  steps: string[];
}
const newTrace = (): Trace => ({ stage: "start", t0: performance.now(), steps: [] });
const mark = (t: Trace, stage: string) => {
  t.stage = stage;
  t.steps.push(`${stage}@${Math.round(performance.now() - t.t0)}`);
};

/** One line for QA: failing step, elapsed time, error type and message. URLs / data URIs are cut out; nothing personal is in it. */
function diagnose(e: unknown, t: Trace): string {
  const name = e instanceof Error ? e.name : typeof e;
  const msg = (e instanceof Error ? e.message : String(e)).replace(/(data:|blob:|https?:\/\/|\/)[^\s)"']*/g, "[url]").slice(0, 120);
  return `${t.stage} · ${Math.round(performance.now() - t.t0)}ms · ${name}: ${msg} · ${t.steps.join(" ")}`;
}

/** Never leave the user waiting: after TIMEOUT_MS the attempt fails. */
const withTimeout = <T,>(p: Promise<T>, t: Trace) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out at ${t.stage}`)), TIMEOUT_MS))]);

/** Offscreen copy of the card at the design width + the GEARMATCH (and DEMO DATA) mark below it. */
function buildFrame(card: CardKind, demo: boolean) {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.className = "bg-gm-bg text-gm-tx";
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px`;
  const slot = document.createElement("div");
  if (card === "stats") slot.className = "px-6 pt-6";
  const footer = document.createElement("div");
  footer.className = "flex items-center gap-2.5 px-6 pt-5 pb-5";
  const brand = document.createElement("span");
  brand.className = "font-[family-name:var(--font-bc)] text-[13px] font-extrabold tracking-[0.22em] text-gm-g2";
  brand.textContent = "GEARMATCH";
  footer.append(brand);
  if (demo) {
    const badge = document.createElement("span");
    badge.className = "border border-gm-line3 px-1.5 py-px font-[family-name:var(--font-bl)] text-[10px] font-bold tracking-[0.12em] text-gm-g1";
    badge.textContent = "DEMO DATA";
    footer.append(badge);
  }
  host.append(slot, footer);
  return { host, slot };
}

async function renderCard(targetId: string, card: CardKind, demo: boolean, t: Trace): Promise<CardImage> {
  mark(t, "clone");
  const target = document.getElementById(targetId);
  if (!target) throw new Error("card not found");
  const { host, slot } = buildFrame(card, demo);
  const clone = target.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.style.margin = "0"; // the image frame sets the spacing, not the card's on-page margin
  slot.append(clone);
  document.body.append(host);
  try {
    mark(t, "fonts.ready");
    await document.fonts.ready;
    mark(t, "img.decode");
    await Promise.all(Array.from(host.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined)));
    mark(t, "frame");
    await nextFrame();
    mark(t, "canvas");
    const r = host.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(r.width * SCALE);
    canvas.height = Math.round(r.height * SCALE);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, r.width, r.height);
    await paintInto(ctx, host, 0, 0, (s) => mark(t, s));
    mark(t, `toBlob ${canvas.width}x${canvas.height}`);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
    mark(t, "done");
    return { blob, file: new File([blob], cardFilename(card), { type: "image/png" }) };
  } finally {
    host.remove();
  }
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });

const MSG = {
  creating: "이미지를 만드는 중이에요…",
  createFailed: "이미지를 만들지 못했어요. 다시 눌러 주세요.",
  downloadStarted: "다운로드를 시작했어요. 다운로드 폴더나 갤러리에서 확인해 주세요.",
  downloadFailed: "다운로드하지 못했어요. 다시 눌러 주세요.",
  shared: "공유 창에서 선택한 작업을 마쳤어요. 사진 앱에 저장됐는지는 사진 앱에서 확인해 주세요.",
  longPress: "이미지를 길게 눌러 저장하세요.",
  inAppNote: "앱 안의 브라우저에서는 다운로드가 되지 않을 수 있어요.",
  shareFallbackNote: "공유 창을 열지 못했어요. 이미지를 길게 눌러 '사진에 저장'을 선택하세요.",
};

export function CardShare({ targetId, card, demo = false }: { targetId: string; card: CardKind; demo?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sheetCreating, setSheetCreating] = useState(false);
  const [sheetError, setSheetError] = useState(false);
  const [diag, setDiag] = useState<string | null>(null); // QA sessions only: why the last image attempt failed
  const prepared = useRef<CardImage | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const report = useCallback((method: ShareMethod, result: ShareResult) => track("card_share_result", { card, method, result }), [card]);
  const create = useCallback(async () => {
    const t = newTrace();
    try {
      return await withTimeout(renderCard(targetId, card, demo, t), t);
    } catch (e) {
      const d = diagnose(e, t);
      console.warn("[card image]", d);
      setDiag(isQaSession() ? d : null);
      throw e;
    }
  }, [targetId, card, demo]);

  // iPhone only: keep a ready-made PNG of the card as it is now, so the share sheet can open right on the tap.
  useEffect(() => {
    if (saveTarget(navigator.userAgent) !== "share") return;
    const target = document.getElementById(targetId);
    if (!target) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const schedule = () => {
      prepared.current = null;
      clearTimeout(timer);
      timer = setTimeout(() => {
        create().then(
          (img) => alive && (prepared.current = img),
          () => undefined, // the tap will try again and report a failure if it happens then
        );
      }, PREPARE_DELAY_MS);
    };
    schedule();
    const mo = new MutationObserver(schedule); // card content changed → the prepared image is stale
    mo.observe(target, { subtree: true, childList: true, characterData: true, attributes: true });
    return () => {
      alive = false;
      clearTimeout(timer);
      mo.disconnect();
    };
  }, [targetId, create]);

  const openSheet = useCallback(async (img: CardImage, note: string, inApp: boolean) => {
    setSheet({ url: await blobToDataUrl(img.blob), file: img.file, shareable: inApp && canShareFile(img.file), note });
    report("longpress", "guide_shown");
  }, [report]);

  const closeSheet = useCallback(() => {
    setSheet(null);
    setSheetCreating(false);
    setSheetError(false);
  }, []);

  /** In-app browsers: open the preview right away and fill it once the image is ready. */
  const openInApp = useCallback(async () => {
    setSheetError(false);
    setDiag(null);
    setSheetCreating(true);
    setSheet({ url: "", file: new File([], ""), shareable: false, note: MSG.inAppNote });
    try {
      const img = await create();
      track("card_image_create", { card });
      await openSheet(img, MSG.inAppNote, true);
    } catch {
      setSheetError(true);
      report("create", "failed");
    } finally {
      setSheetCreating(false);
    }
  }, [create, card, openSheet, report]);

  async function onSave() {
    if (busy) return;
    setStatus(null);
    if (isInAppBrowser(navigator.userAgent)) return void openInApp();

    let img = prepared.current;
    if (!img) {
      setBusy(true);
      setDiag(null);
      try {
        img = await create();
      } catch {
        report("create", "failed");
        setStatus(MSG.createFailed);
        return;
      } finally {
        setBusy(false);
      }
    }
    track("card_image_create", { card });

    if (saveTarget(navigator.userAgent) === "share" && canShareFile(img.file)) {
      const result = await shareFile(img.file);
      report("share", result);
      if (result === "shared") setStatus(MSG.shared);
      else if (result === "failed") await openSheet(img, MSG.shareFallbackNote, false); // e.g. the tap "expired" while rendering
      return; // cancelled: not an error, nothing to say
    }
    const result = startDownload(img.blob, img.file.name);
    report("download", result);
    setStatus(result === "started" ? MSG.downloadStarted : MSG.downloadFailed);
  }

  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet, closeSheet]);

  async function onSheetShare() {
    if (!sheet) return;
    const result = await shareFile(sheet.file);
    report("share", result);
    if (result === "shared") setStatus(MSG.shared);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={busy}
        aria-busy={busy}
        className="flex h-[50px] w-full items-center justify-between border border-gm-line3 px-5 text-[16px] font-bold disabled:text-gm-g1"
      >
        {busy ? MSG.creating : "이미지 저장"}
        <SaveIcon />
      </button>
      {status && (
        <p role="status" className="mt-2 mb-0 text-[14px] leading-[21px] break-keep text-gm-g1">
          {status}
        </p>
      )}
      {diag && !sheet && <QaDiag text={diag} />}

      {sheet && (
        <div role="dialog" aria-modal="true" aria-label="카드 이미지 저장" className="fixed inset-0 z-[60] overflow-y-auto bg-gm-bg">
          <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-8">
            <div className="flex h-14 items-center justify-between">
              <span className="font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.14em] text-gm-g1">IMAGE PREVIEW</span>
              <button ref={closeBtn} type="button" onClick={closeSheet} aria-label="닫기" className="-mr-3 grid size-11 place-items-center">
                <CloseIcon />
              </button>
            </div>

            {sheetCreating && (
              <p className="mt-10 text-center text-[15px] text-gm-g1" role="status">
                {MSG.creating}
              </p>
            )}

            {sheetError && (
              <div role="alert" className="mt-10 border-t border-gm-line py-[18px]">
                <p className="m-0 text-[17px] font-bold">이미지를 만들지 못했어요.</p>
                <p className="mt-1 mb-0 text-[15px] text-gm-g1">잠시 후 다시 시도해 주세요.</p>
                <button type="button" onClick={() => void openInApp()} className="mt-5 flex h-[46px] w-[140px] items-center justify-center border border-gm-line3 text-[16px] font-bold">
                  다시 시도
                </button>
                {diag && <QaDiag text={diag} />}
              </div>
            )}

            {!sheetCreating && !sheetError && sheet.url && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sheet.url} alt="저장할 카드 이미지 미리보기" className="block h-auto w-full border border-gm-line" />
                <p className="mt-4 mb-0 border border-gm-line3 px-4 py-3 text-[15px] leading-[22px] font-semibold">
                  {MSG.longPress}
                  <span className="mt-1 block text-[13px] font-normal text-gm-g1">{sheet.note}</span>
                </p>
                {sheet.shareable && (
                  <div className="mt-5">
                    <PrimaryButton onClick={() => void onSheetShare()}>공유하기</PrimaryButton>
                  </div>
                )}
                {status && (
                  <p role="status" className="mt-4 mb-0 text-[14px] leading-[21px] text-gm-g1">
                    {status}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** QA sessions (`?qa=1`) only: the failure diagnosis, selectable so a tester can copy it. */
function QaDiag({ text }: { text: string }) {
  return <p className="mt-2 mb-0 font-mono text-[11px] leading-4 break-all text-gm-g2 select-all">QA · {text}</p>;
}
