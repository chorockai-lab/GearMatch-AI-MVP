// What the ITEMS screens may say for an items_match() result (docs/ITEMS_COLD_START.md).
// Kept separate from the components so the rules are unit-tested (scripts/test-items.ts):
//   • numbers (counts, shares, ranks, bars, run data) only for REAL runners
//   • DEMO-based examples are labelled "예시 데이터" with the disclaimer, never as recommendations or statistics
//   • the wide range is announced whenever it was used
import type { ItemsMatch, MatchStatus } from "./types";

export const EXAMPLE_HEADING = "나와 비슷한 조건에서 살펴볼 러닝화";
export const EXAMPLE_NOTICE = "한국인 신체 통계를 참고해 구성한 가상 러너 기반의 예시입니다. 실제 러너의 착용 기록이나 추천 결과는 아닙니다.";
export const EXAMPLE_BADGE = "예시 데이터";
export const WIDE_NOTICE = "조금 더 넓은 조건에서 찾았어요.";
export const BROWSE_NOTICE = "아직 비슷한 조건의 러너 정보가 충분하지 않아요.";
export const BROWSE_HEADING = "러닝화 둘러보기";

export interface MatchView {
  kind: MatchStatus;
  showNumbers: boolean; // runner counts, shares, ranks, share bars, run data
  wideNotice: boolean;
  groupLabel: string | null; // the strip above the list; null = no group strip
  badge: string | null;
  heading: string;
  notice: string | null;
  needsProfile: boolean; // ask for height / weight / foot size / usual distance (browse still shown)
}

export function matchView(r: ItemsMatch): MatchView {
  const wide = r.range === "wide";
  if (r.status === "real")
    return {
      kind: "real", showNumbers: true, wideNotice: wide, groupLabel: wide ? "WIDER RUNNER GROUP" : "SIMILAR RUNNER GROUP",
      badge: null, heading: wide ? "넓힌 그룹의 선택" : "비슷한 러너들의 선택", notice: null, needsProfile: false,
    };
  if (r.status === "example")
    return { kind: "example", showNumbers: false, wideNotice: wide, groupLabel: "EXAMPLE SHOES", badge: EXAMPLE_BADGE, heading: EXAMPLE_HEADING, notice: EXAMPLE_NOTICE, needsProfile: false };
  return {
    kind: "browse", showNumbers: false, wideNotice: false, groupLabel: null, badge: null, heading: BROWSE_HEADING,
    notice: r.profile_complete ? BROWSE_NOTICE : null, needsProfile: !r.profile_complete,
  };
}

/** Product detail "RUNNERS LIKE YOU" block for one product. */
export type DetailView =
  | { kind: "real"; runners: number; x: number; share: number; wide: boolean } // real group; x may be 0
  | { kind: "example"; included: boolean } // DEMO-based example list — no numbers
  | { kind: "none"; needsProfile: boolean }; // browse

export function detailView(r: ItemsMatch, productId: string): DetailView {
  if (r.status === "real") {
    const item = r.items.find((i) => i.product_id === productId);
    const x = item?.runners ?? 0;
    return { kind: "real", runners: r.runners ?? 0, x, share: r.runners ? x / r.runners : 0, wide: r.range === "wide" };
  }
  if (r.status === "example") return { kind: "example", included: r.items.some((i) => i.product_id === productId) };
  return { kind: "none", needsProfile: !r.profile_complete };
}
