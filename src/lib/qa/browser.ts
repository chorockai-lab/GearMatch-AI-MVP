// QA only: names the browser a tester is in (for the re-visit / KakaoTalk checks in docs/QA_REVISIT.md).
// Storage is never shared between these — each one is a separate anonymous user unless an account is linked.

export type BrowserKind = "kakaotalk-inapp" | "other-inapp" | "ios-safari" | "ios-chrome" | "android-chrome" | "samsung-internet" | "desktop" | "other";

export const BROWSER_LABEL: Record<BrowserKind, string> = {
  "kakaotalk-inapp": "카카오톡 인앱 브라우저",
  "other-inapp": "다른 앱의 인앱 브라우저",
  "ios-safari": "iPhone Safari",
  "ios-chrome": "iPhone Chrome",
  "android-chrome": "Android Chrome",
  "samsung-internet": "삼성 인터넷",
  desktop: "PC 브라우저",
  other: "기타 브라우저",
};

export function detectBrowser(ua: string): BrowserKind {
  const ios = /iPhone|iPad|iPod/.test(ua);
  const android = /Android/.test(ua);
  if (/KAKAOTALK/i.test(ua)) return "kakaotalk-inapp";
  if (/FBAN|FBAV|Instagram|NAVER\(inapp|Line\/|; wv\)/.test(ua)) return "other-inapp";
  if (ios && /CriOS/.test(ua)) return "ios-chrome";
  if (ios && /Safari/.test(ua) && !/FxiOS|EdgiOS/.test(ua)) return "ios-safari";
  if (android && /SamsungBrowser/.test(ua)) return "samsung-internet";
  if (android && /Chrome\//.test(ua)) return "android-chrome";
  if (!ios && !android && /Mozilla/.test(ua)) return "desktop";
  return "other";
}
