/** Build six-digit ticket numbers from the user's own ideas. */
export interface CustomIdea {
  /** Digits the number must start with (0–5 digits). */
  start?: string;
  /** Digits the number must end with, e.g. a birthday "1508" (0–6 digits). */
  ending?: string;
  /** Digits that must appear somewhere in the number, e.g. "73". */
  lucky?: string;
  count?: number;
}

export function customIdeaError(idea: CustomIdea): string | null {
  const start = idea.start ?? "",
    ending = idea.ending ?? "",
    lucky = idea.lucky ?? "";
  if (!/^\d*$/.test(start + ending + lucky)) return "Use digits only.";
  if (start.length + ending.length > 6)
    return "Starting and ending digits together can be at most 6 digits.";
  if (start.length + ending.length === 6 && lucky)
    return "Your number is already complete. Clear the lucky digits or shorten it.";
  const free = 6 - start.length - ending.length;
  const missing = [...new Set(lucky)].filter(
    (d) => !(start + ending).includes(d),
  );
  if (missing.length > free)
    return `Only ${free} free place${free === 1 ? "" : "s"} left for your lucky digits.`;
  return null;
}

const digit = () => String(Math.floor(Math.random() * 10));

export function makeCustomNumbers(idea: CustomIdea): string[] {
  if (customIdeaError(idea)) return [];
  const start = idea.start ?? "",
    ending = idea.ending ?? "",
    count = idea.count ?? 3;
  const lucky = [...new Set(idea.lucky ?? "")];
  const free = 6 - start.length - ending.length;
  if (free === 0) return [start + ending];
  const out = new Set<string>();
  // The free middle has at most 10^free distinct values.
  const max = Math.min(count, 10 ** free);
  for (let guard = 0; out.size < max && guard < 5000; guard++) {
    const middle = Array.from({ length: free }, digit);
    // Put missing lucky digits into random free places.
    const missing = lucky.filter((d) => !(start + ending).includes(d));
    const places = [...middle.keys()].sort(() => Math.random() - 0.5);
    missing.forEach((d, i) => (middle[places[i]] = d));
    out.add(start + middle.join("") + ending);
  }
  return [...out];
}
