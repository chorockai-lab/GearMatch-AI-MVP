// Runner Profile / Current Shoe choice lists.
// Sources: UI handoff profile-step1/2 · my-profile (experience, interest distance),
// prototype v1.2 PROFILE_MAP (runs per week, weekly distance),
// typical run distance: user decision 2026-10-13 (no prior document).

export interface Choice {
  value: string;
  label: string;
}

export const EXPERIENCE: Choice[] = [
  { value: "STARTING", label: "이제 시작하려고 해요" },
  { value: "LT_3M", label: "3개월 미만" },
  { value: "M3_12", label: "3개월~1년" },
  { value: "Y1_3", label: "1~3년" },
  { value: "GTE_3Y", label: "3년 이상" },
];

export const RUNS_PER_WEEK: Choice[] = [
  { value: "LTE_1", label: "주 1회 이하" },
  { value: "W1_2", label: "주 1~2회" },
  { value: "W3_4", label: "주 3~4회" },
  { value: "GTE_5", label: "주 5회 이상" },
];

export const TYPICAL_RUN_DISTANCE: Choice[] = [
  { value: "LT_3", label: "3km 미만" },
  { value: "D3_5", label: "3~5km" },
  { value: "D5_10", label: "5~10km" },
  { value: "GTE_10", label: "10km 이상" },
];

export const WEEKLY_DISTANCE: Choice[] = [
  { value: "LT_5", label: "5km 미만" },
  { value: "D5_15", label: "5~15km" },
  { value: "D15_30", label: "15~30km" },
  { value: "GTE_30", label: "30km 이상" },
  { value: "UNKNOWN", label: "잘 모르겠어요" },
];

export const INTEREST_DISTANCE: Choice[] = [
  { value: "5K", label: "5K" },
  { value: "10K", label: "10K" },
  { value: "HALF", label: "HALF" },
  { value: "FULL", label: "FULL" },
];
export const INTEREST_NONE: Choice = { value: "NONE", label: "특별히 없음" };

/** Optional body inputs — integers, plausible ranges (no approved spec; used only to reject typos). */
export const BODY_RANGES = {
  height_cm: { min: 100, max: 230, unit: "CM", label: "키" },
  weight_kg: { min: 25, max: 200, unit: "KG", label: "체중" },
  shoe_size_mm: { min: 200, max: 330, unit: "MM", label: "발 사이즈" },
} as const;

/** POPULAR list shown on Current Shoe (UI handoff current-shoe.png). Not a product catalogue. */
export const POPULAR_SHOES = [
  { brand: "NIKE", model: "Pegasus 42", label: "Nike Pegasus 42" },
  { brand: "ADIDAS", model: "Adizero EVO SL", label: "Adidas Adizero EVO SL" },
  { brand: "ASICS", model: "Novablast 6", label: "Asics Novablast 6" },
  { brand: "HOKA", model: "Bondi 9", label: "Hoka Bondi 9" },
  { brand: "NEW BALANCE", model: "FuelCell Rebel v5", label: "New Balance FuelCell Rebel v5" },
  { brand: "BROOKS", model: "Ghost 18", label: "Brooks Ghost 18" },
] as const;

export const SHOE_UNKNOWN_LABEL = "모델명 모름";

export const labelOf = (list: Choice[], value: string | null) => list.find((c) => c.value === value)?.label ?? null;
