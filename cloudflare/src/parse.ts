import type { Draw, Tier } from "../../lib/types";
import { identifyPdf, parseResultText, validateDraw } from "../../lib/resultText";
import { lotteryByCode } from "../../lib/schedule";

const AMOUNT_TIERS: [Tier, RegExp][] = [
  ["first", /1st\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
  ["consolation", /Cons\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
  ["second", /2nd\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
  ["third", /3rd\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
  ["fourth", /4th\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
  ["fifth", /5th\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
  ["sixth", /6th\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
  ["seventh", /7th\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
  ["eighth", /8th\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
  ["ninth", /9th\s*Prize\s*-?\s*Rs\s*:?\s*(\d+)/i],
];

export function parsePdfText(text: string): { draw?: Draw; problems: string[] } {
  const id = identifyPdf(text);
  if (!id) return { problems: ["Could not read the draw name, number and date from this PDF."] };
  const lot = lotteryByCode(id.code);
  const drawNo = `${id.code}-${id.no}`;
  const draw = parseResultText(text, {
    code: id.code,
    name: lot?.name ?? id.code,
    drawNo,
    date: id.date,
  });
  const amounts: Partial<Record<Tier, number>> = {};
  for (const [tier, re] of AMOUNT_TIERS) {
    const m = text.match(re);
    if (m) amounts[tier] = Number(m[1]);
  }
  draw.amounts = amounts;
  draw.source = "official_pdf";
  draw.sourceStatus = "matched";
  draw.verified = true;
  return { draw, problems: validateDraw(draw) };
}

