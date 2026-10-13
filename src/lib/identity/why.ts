// WHY evidence for Identity Reveal — spec §4.4 / §5.
//  • Only answers the user actually picked are ever used (the quoted text is the option text itself).
//  • Primary evidence: picked options whose primary type is the result animal.
//    Highest-weight questions first (Q3 5 → Q2/Q4 4 → Q1/Q5 3, ties by question order), max 3.
//  • If fewer than 2, add picked options whose secondary type is the result animal (up to 2 in total).
//  • Never padded beyond that — fewer items is correct when the evidence is thin.
//  • Display order = question order. Deterministic for the same answers.
import type { AnimalId } from "./animals";
import { QUESTIONS, type AnswerCode, type QuestionId } from "./questions";
import type { Answers } from "./scoring";

export const WHY_MAX = 3;
export const WHY_MIN_TARGET = 2;

export interface WhyItem {
  questionId: QuestionId;
  code: AnswerCode;
  text: string;
  basis: "primary" | "secondary";
}

export function buildWhy(answers: Answers, animal: AnimalId): WhyItem[] {
  const picked = QUESTIONS.map((q, order) => {
    const opt = q.options.find((o) => o.code === answers[q.id]);
    if (!opt) throw new Error(`Unknown answer ${q.id}-${answers[q.id]}`);
    return { q, opt, order };
  });
  const byWeight = (a: (typeof picked)[number], b: (typeof picked)[number]) =>
    b.q.primaryPoints - a.q.primaryPoints || a.order - b.order;

  const chosen: ((typeof picked)[number] & { basis: WhyItem["basis"] })[] = picked
    .filter((p) => p.opt.primary === animal)
    .sort(byWeight)
    .slice(0, WHY_MAX)
    .map((p) => ({ ...p, basis: "primary" as const }));

  if (chosen.length < WHY_MIN_TARGET) {
    const extra = picked
      .filter((p) => p.opt.secondary === animal)
      .sort(byWeight)
      .slice(0, WHY_MIN_TARGET - chosen.length)
      .map((p) => ({ ...p, basis: "secondary" as const }));
    chosen.push(...extra);
  }

  return chosen
    .sort((a, b) => a.order - b.order)
    .map(({ q, opt, basis }) => ({ questionId: q.id, code: opt.code, text: opt.text, basis }));
}
