// Parse Google-style hours strings like:
//   "11:00 AM – 10:00 PM"
//   "12:00 – 9:00 PM"   (start inherits end's AM/PM)
//   "Closed"
// and decide whether the venue is currently open.

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// Normalize various dash characters to ASCII "-"
const normalizeDash = (s: string) => s.replace(/[\u2010-\u2015\u2212]/g, "-");

const parseTimeToken = (raw: string, fallbackMeridiem: "AM" | "PM" | null): number | null => {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = (m[3]?.toUpperCase() as "AM" | "PM" | undefined) ?? fallbackMeridiem;
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const parseSingleRange = (raw: string): [number, number] | null => {
  const s = normalizeDash(raw).replace(/\u2009|\u202f/g, " ").trim();
  if (!s || /^closed$/i.test(s)) return null;
  const parts = s.split("-").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const endMeridiemMatch = parts[1].match(/(AM|PM)\s*$/i);
  const endMeridiem = (endMeridiemMatch?.[1].toUpperCase() as "AM" | "PM" | undefined) ?? null;
  const startMeridiemMatch = parts[0].match(/(AM|PM)\s*$/i);
  const startMeridiem = (startMeridiemMatch?.[1].toUpperCase() as "AM" | "PM" | undefined) ?? null;

  const open = parseTimeToken(parts[0], startMeridiem ?? endMeridiem);
  const close = parseTimeToken(parts[1], endMeridiem);
  if (open == null || close == null) return null;
  const adjustedClose = close <= open ? close + 24 * 60 : close;
  return [open, adjustedClose];
};

/** Returns array of [open, close] ranges. Supports comma-separated ranges
 *  like "11:30 AM – 2:00 PM, 4:00 – 8:00 PM". */
const parseRanges = (raw: string): Array<[number, number]> => {
  if (!raw) return [];
  const s = normalizeDash(raw).replace(/\u2009|\u202f/g, " ").trim();
  if (/^closed$/i.test(s)) return [];
  return s
    .split(",")
    .map((seg) => parseSingleRange(seg))
    .filter((r): r is [number, number] => r !== null);
};

export type OpenStatus = "open" | "closed" | "unknown";

/** Determine current open/closed status for a venue given its hours map. */
export const getOpenStatus = (
  hours: Record<string, string> | null | undefined,
  now: Date = new Date(),
): OpenStatus => {
  if (!hours) return "unknown";
  const todayName = DAY_NAMES[now.getDay()];
  const yesterdayName = DAY_NAMES[(now.getDay() + 6) % 7];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Check today's windows first
  const todayRanges = parseRanges(hours[todayName] ?? "");
  for (const [open, close] of todayRanges) {
    if (nowMinutes >= open && nowMinutes < close) return "open";
  }

  // Also check yesterday's ranges in case any spans past midnight
  const yesterdayRanges = parseRanges(hours[yesterdayName] ?? "");
  for (const [, close] of yesterdayRanges) {
    if (close > 24 * 60 && nowMinutes < close - 24 * 60) return "open";
  }

  // We had hours for today but not currently in-window → closed
  if (hours[todayName] && !/^closed$/i.test(hours[todayName].trim())) return "closed";
  if (hours[todayName]) return "closed";
  // No data for today at all
  return "unknown";
};
