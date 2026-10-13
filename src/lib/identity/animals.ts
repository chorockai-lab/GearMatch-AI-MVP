// 8 animal types — source: GearMatch_AI_v2.0_Animal_Identity_MVP_Spec (2026-10-12) §2.
// Asset file ids are the lowercase form of the type id (char-che-base.png etc.).

export const ANIMAL_IDS = ["HAM", "CHE", "HOR", "GOA", "FOX", "WOL", "OTT", "CAT"] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

export interface AnimalDef {
  id: AnimalId;
  assetId: string; // lowercase, matches /public/assets/char/char-{assetId}-{pose}.png
  nameEn: string; // shown as "{nameEn} RUNNER"
  nameKo: string;
  internalType: string; // spec §2 내부 유형
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  HAM: { id: "HAM", assetId: "ham", nameEn: "HAMSTER", nameKo: "햄스터", internalType: "ROUTINE" },
  CHE: { id: "CHE", assetId: "che", nameEn: "CHEETAH", nameKo: "치타", internalType: "RECORD" },
  HOR: { id: "HOR", assetId: "hor", nameEn: "HORSE", nameKo: "말", internalType: "DISTANCE" },
  GOA: { id: "GOA", assetId: "goa", nameEn: "MOUNTAIN GOAT", nameKo: "산악염소", internalType: "MILESTONE" },
  FOX: { id: "FOX", assetId: "fox", nameEn: "FOX", nameKo: "여우", internalType: "EXPLORE" },
  WOL: { id: "WOL", assetId: "wol", nameEn: "WOLF", nameKo: "늑대", internalType: "TOGETHER" },
  OTT: { id: "OTT", assetId: "ott", nameEn: "OTTER", nameKo: "수달", internalType: "RESET" },
  CAT: { id: "CAT", assetId: "cat", nameEn: "CAT", nameKo: "고양이", internalType: "SPONTANEOUS" },
};

export function isAnimalId(v: unknown): v is AnimalId {
  return typeof v === "string" && (ANIMAL_IDS as readonly string[]).includes(v);
}
