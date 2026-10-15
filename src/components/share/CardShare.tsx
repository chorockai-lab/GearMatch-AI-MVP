"use client";
// "이미지 저장·공유" (Issue #16): renders the on-screen card (by id) into a 3× PNG with a small GEARMATCH mark,
// shows a preview, then offers what this browser really supports — system share sheet, download, or (in-app
// browsers) long-press saving. Only what is on the card goes into the image; nothing is sent to a server.
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/events/track";
import { paintInto } from "@/lib/share/paint";
import { canShareFile, cardFilename, isInAppBrowser, shareFile, startDownload, type CardKind, type ShareMethod, type ShareResult } from "@/lib/share/share";
import { PrimaryButton } from "@/components/onboarding/Flow";
import { CloseIcon, SaveIcon } from "@/components/ui/icons";

const SCALE = 3;
const WIDTH = 390; // design width (UI handoff) — the image is the same on every phone
const BG = "#0a0a0a"; // --color-gm-bg

interface Ready {
  blob: Blob;
  file: File;
  url: string; // object URL, or a data URL in in-app browsers (long-press saving works more reliably)
  shareable: boolean;
  inApp: boolean;
}

const TIMEOUT_MS = 15_000;

/** Two animation frames for layout — with a timer fallback, since browsers pause frames in hidden pages. */
const nextFrame = () =>
  Promise.race([new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))), new Promise((r) => setTimeout(r, 120))]);

/** Never leave the user on "만드는 중": after TIMEOUT_MS the attempt fails and the retry block is shown. */
const withTimeout = <T,>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), TIMEOUT_MS))]);

async function renderCard(target: HTMLElement, host: HTMLElement, slot: HTMLElement): Promise<Blob> {
  const clone = target.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.style.margin = "0"; // the image frame sets the spacing, not the card's on-page margin
  slot.replaceChildren(clone);
  await document.fonts.ready;
  await Promise.all(Array.from(host.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined)));
  await nextFrame();
  const r = host.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(r.width * SCALE);
  canvas.height = Math.round(r.height * SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, r.width, r.height);
  await paintInto(ctx, host);
  slot.replaceChildren();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });

export function CardShare({ targetId, card, demo = false }: { targetId: string; card: CardKind; demo?: boolean }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"creating" | "ready" | "error">("creating");
  const [ready, setReady] = useState<Ready | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const report = useCallback((method: ShareMethod, result: ShareResult) => track("card_share_result", { card, method, result }), [card]);

  const create = useCallback(async () => {
    setPhase("creating");
    setStatus(null);
    try {
      const target = document.getElementById(targetId);
      if (!target || !host.current || !slot.current) throw new Error("card not found");
      const blob = await withTimeout(renderCard(target, host.current, slot.current));
      const inApp = isInAppBrowser(navigator.userAgent);
      const file = new File([blob], cardFilename(card), { type: "image/png" });
      const url = inApp ? await blobToDataUrl(blob) : URL.createObjectURL(blob);
      setReady({ blob, file, url, shareable: canShareFile(file), inApp });
      setPhase("ready");
      track("card_image_create", { card });
      if (inApp) report("longpress", "guide_shown");
    } catch (e) {
      console.warn("[card image]", e instanceof Error ? e.message : e); // diagnostics only; the user sees the retry block
      setPhase("error");
      report("create", "failed");
    }
  }, [targetId, card, report]);

  const close = useCallback(() => {
    setOpen(false);
    setReady((r) => {
      if (r?.url.startsWith("blob:")) URL.revokeObjectURL(r.url);
      return null;
    });
  }, []);

  // start rendering once the offscreen host is mounted
  useEffect(() => {
    if (open) void create();
  }, [open, create]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  async function onShare() {
    if (!ready) return;
    const result = await shareFile(ready.file);
    report("share", result);
    setStatus(
      result === "shared"
        ? "공유를 완료했어요."
        : result === "failed"
          ? ready.inApp
            ? "공유하지 못했어요. 이미지를 길게 눌러 저장해 주세요."
            : "공유하지 못했어요. 이미지 저장을 이용해 주세요."
          : null, // cancelled: not an error
    );
  }

  function onDownload() {
    if (!ready) return;
    const result = startDownload(ready.blob, ready.file.name);
    report("download", result);
    setStatus(
      result === "started"
        ? "다운로드를 시작했어요. 사진 앱에 저장됐는지는 기기에서 확인해 주세요."
        : "다운로드하지 못했어요. 이미지를 길게 눌러 저장해 주세요.",
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[50px] w-full items-center justify-between border border-gm-line3 px-5 text-[16px] font-bold"
      >
        이미지 저장·공유
        <SaveIcon />
      </button>

      {open && (
        <>
          {/* offscreen copy of the card at the design width, painted into the PNG */}
          <div ref={host} aria-hidden="true" className="bg-gm-bg text-gm-tx" style={{ position: "fixed", left: -10000, top: 0, width: WIDTH }}>
            <div ref={slot} className={card === "stats" ? "px-6 pt-6" : undefined} />
            <div className="flex items-center gap-2.5 px-6 pt-5 pb-5">
              <span className="font-[family-name:var(--font-bc)] text-[13px] font-extrabold tracking-[0.22em] text-gm-g2">GEARMATCH</span>
              {demo && (
                <span className="border border-gm-line3 px-1.5 py-px font-[family-name:var(--font-bl)] text-[10px] font-bold tracking-[0.12em] text-gm-g1">
                  DEMO DATA
                </span>
              )}
            </div>
          </div>

          <div
            role="dialog"
            aria-modal="true"
            aria-label="카드 이미지 저장·공유"
            className="fixed inset-0 z-[60] overflow-y-auto bg-gm-bg"
          >
            <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-8">
              <div className="flex h-14 items-center justify-between">
                <span className="font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.14em] text-gm-g1">IMAGE PREVIEW</span>
                <button ref={closeBtn} type="button" onClick={close} aria-label="닫기" className="-mr-3 grid size-11 place-items-center">
                  <CloseIcon />
                </button>
              </div>

              {phase === "creating" && <p className="mt-10 text-center text-[15px] text-gm-g1" role="status">이미지를 만드는 중이에요…</p>}

              {phase === "error" && (
                <div role="alert" className="mt-10 border-t border-gm-line py-[18px]">
                  <p className="m-0 text-[17px] font-bold">이미지를 만들지 못했어요.</p>
                  <p className="mt-1 mb-0 text-[15px] text-gm-g1">잠시 후 다시 시도해 주세요.</p>
                  <button type="button" onClick={() => void create()} className="mt-5 flex h-[46px] w-[140px] items-center justify-center border border-gm-line3 text-[16px] font-bold">
                    다시 시도
                  </button>
                </div>
              )}

              {phase === "ready" && ready && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ready.url} alt="저장할 카드 이미지 미리보기" className="block h-auto w-full border border-gm-line" />
                  <p className="mt-3 mb-0 text-[14px] leading-[21px] text-gm-g1">이미지에 들어갈 내용을 확인한 뒤 공유하거나 저장하세요.</p>

                  {ready.inApp && (
                    <p className="mt-4 mb-0 border border-gm-line3 px-4 py-3 text-[15px] leading-[22px] font-semibold">
                      이미지를 길게 눌러 저장하세요.
                      <span className="mt-1 block text-[13px] font-normal text-gm-g1">앱 안의 브라우저에서는 다운로드가 되지 않을 수 있어요.</span>
                    </p>
                  )}

                  <div className="mt-5 flex flex-col gap-3">
                    {ready.shareable && <PrimaryButton onClick={() => void onShare()}>공유하기</PrimaryButton>}
                    {!ready.inApp && (
                      <button type="button" onClick={onDownload} className="flex h-[50px] w-full items-center justify-between border border-gm-line3 px-5 text-[16px] font-bold">
                        이미지 저장
                        <SaveIcon />
                      </button>
                    )}
                  </div>
                  {status && (
                    <p role="status" className="mt-4 mb-0 text-[14px] leading-[21px] text-gm-g1">
                      {status}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
