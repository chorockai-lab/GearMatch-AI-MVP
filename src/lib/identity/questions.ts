// Runner Test — 5 questions × 5 single-choice answers.
// Source: Animal Identity MVP Spec §3 (wording copied as-is; do not edit without a spec change).
import type { AnimalId } from "./animals";

export type QuestionId = "Q1" | "Q2" | "Q3" | "Q4" | "Q5";
export type AnswerCode = "A" | "B" | "C" | "D" | "E";

export interface AnswerOption {
  code: AnswerCode;
  text: string;
  primary: AnimalId;
  secondary: AnimalId | null;
}

export interface Question {
  id: QuestionId;
  axis: "WHY" | "HOW_BEFORE" | "HOW_DURING" | "HOW_AFTER" | "GOAL";
  title: string;
  primaryPoints: number;
  secondaryPoints: number;
  options: AnswerOption[];
}

export const QUESTIONS: Question[] = [
  {
    id: "Q1", axis: "WHY", primaryPoints: 3, secondaryPoints: 1,
    title: "달리기를 시작하거나 계속하게 만드는 마음에 가장 가까운 것은?",
    options: [
      { code: "A", text: "정한 날에는 한 번 달리고 싶어요.", primary: "HAM", secondary: "GOA" },
      { code: "B", text: "머리가 복잡할 때 기분을 바꾸고 싶어요.", primary: "OTT", secondary: null },
      { code: "C", text: "누군가와 같이 움직이는 게 재밌어요.", primary: "WOL", secondary: "OTT" },
      { code: "D", text: "해보고 싶은 도전이 생겼어요.", primary: "GOA", secondary: "CHE" },
      { code: "E", text: "그냥 갑자기 달리고 싶은 순간이 와요.", primary: "CAT", secondary: null },
    ],
  },
  {
    id: "Q2", axis: "HOW_BEFORE", primaryPoints: 4, secondaryPoints: 1,
    title: "달리러 나간다면, 준비하는 내 모습에 가장 가까운 것은?",
    options: [
      { code: "A", text: "늘 하던 시간, 익숙한 방식으로 준비해요.", primary: "HAM", secondary: null },
      { code: "B", text: "오늘 해보고 싶은 목표부터 정해요.", primary: "GOA", secondary: "CHE" },
      { code: "C", text: "오늘은 다른 길로 가볼까, 코스를 찾아봐요.", primary: "FOX", secondary: null },
      { code: "D", text: "오늘의 목표 페이스나 기록부터 확인해요.", primary: "CHE", secondary: "GOA" },
      { code: "E", text: "계획은 딱히 없어요. 신발부터 신고 나가죠.", primary: "CAT", secondary: null },
    ],
  },
  {
    id: "Q3", axis: "HOW_DURING", primaryPoints: 5, secondaryPoints: 1,
    title: "달리는 동안 가장 즐거울 것 같은 순간은?",
    options: [
      { code: "A", text: "시계를 보고 조금 더 빠르게 달려 보는 순간.", primary: "CHE", secondary: "GOA" },
      { code: "B", text: "내 호흡과 리듬으로 한참 달리고 있는 순간.", primary: "HOR", secondary: "HAM" },
      { code: "C", text: "처음 보는 길이나 풍경을 발견하는 순간.", primary: "FOX", secondary: "CAT" },
      { code: "D", text: "옆 사람과 발맞춰 달리며 웃는 순간.", primary: "WOL", secondary: "OTT" },
      { code: "E", text: "복잡한 생각이 사라지고 기분이 가벼워지는 순간.", primary: "OTT", secondary: null },
    ],
  },
  {
    id: "Q4", axis: "HOW_AFTER", primaryPoints: 4, secondaryPoints: 1,
    title: "러닝이 끝났을 때 가장 뿌듯할 것 같은 순간은?",
    options: [
      { code: "A", text: "오늘도 달리기를 해냈다는 사실 자체.", primary: "HAM", secondary: "GOA" },
      { code: "B", text: "페이스나 개인 기록이 조금 좋아진 걸 볼 때.", primary: "CHE", secondary: "GOA" },
      { code: "C", text: "예상보다 오래, 멀리 달렸다는 걸 알았을 때.", primary: "HOR", secondary: null },
      { code: "D", text: "오늘 해보려던 목표를 결국 해냈을 때.", primary: "GOA", secondary: null },
      { code: "E", text: "나가기 전보다 마음이 한결 가벼워졌을 때.", primary: "OTT", secondary: null },
    ],
  },
  {
    id: "Q5", axis: "GOAL", primaryPoints: 3, secondaryPoints: 1,
    title: "앞으로 러닝하면서 가장 해보고 싶은 건?",
    options: [
      { code: "A", text: "가보지 않은 길과 동네를 달려보기.", primary: "FOX", secondary: null },
      { code: "B", text: "함께 달리는 즐거운 날을 더 많이 만들기.", primary: "WOL", secondary: "OTT" },
      { code: "C", text: "내 페이스대로 오래 달리는 시간을 조금씩 늘리기.", primary: "HOR", secondary: "HAM" },
      { code: "D", text: "첫 5km·10km·대회 등 정한 목표를 완수하기.", primary: "GOA", secondary: "HOR" },
      { code: "E", text: "부담 없이, 뛰고 싶은 날 자유롭게 달리기.", primary: "CAT", secondary: null },
    ],
  },
];

export const TEST_SCHEMA_VERSION = "animal-v2.0.0";
export const SCORING_VERSION = "animal-score-0.1";
