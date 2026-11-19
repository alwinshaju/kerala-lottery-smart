import type { Draw } from "../../lib/types";
import { lotteryForWeekday, nowIST } from "../../lib/schedule";
import { summarizeHistory } from "./historyIdeas";

export const REMINDER_HOUR = 9;
const MIN_DRAWS = 5;

export interface Reminder {
  title: string;
  body: string;
  fireAt: Date;
  code: string;
}

/** The next 9:00 AM (India time) reminder: today's lottery and its most frequent
 * past ending. It is a statistic from past draws, not a prediction. */
export function buildReminder(draws: Draw[], now = new Date()): Reminder {
  const ist = nowIST(now);
  const target = new Date(ist);
  target.setHours(REMINDER_HOUR, 0, 0, 0);
  if (ist.getTime() >= target.getTime()) target.setDate(target.getDate() + 1);
  const lottery = lotteryForWeekday(target.getDay());
  const own = summarizeHistory(draws.filter((d) => d.code === lottery.code));
  const summary = own.drawCount >= MIN_DRAWS ? own : summarizeHistory(draws);
  const top = summary.drawCount >= MIN_DRAWS ? summary.endings[0] : undefined;
  const pick = top
    ? `Hot pick ending ${top.ending}, seen in ${top.drawCount} of ${summary.drawCount} past draws. `
    : "";
  return {
    title: `Today's lottery: ${lottery.name}`,
    body: `${pick}Draw is at 3 PM. Don't forget your ticket if you play. Every number has equal odds.`,
    fireAt: new Date(target.getTime() - (now.getTimezoneOffset() + 330) * 60000),
    code: lottery.code,
  };
}
