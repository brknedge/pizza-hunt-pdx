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

/** Returns [openMinutes, closeMinutes] where minutes are minutes since midnight,
 *  or null if the string is "Closed" / unparseable. Close may be ≤ open if the
 *  venue closes after midnight; in that case we add 24h to close. */
const parseRange = (raw: string): [number, number] | null => {
  if (!raw) return null;
  const s = normalizeDash(raw).trim();
  if (/^closed$/i.test(s)) return null;
  const parts = s.split("-").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const endMeridiemMatch = parts[1].match(/(AM|PM)\s*$/i);
  const endMeridiem = (endMeridiemMatch?.[1].toUpperCase() as "AM" | "PM" | undefined) ?? null;
  const startMeridiemMatch = parts[0].match(/(AM|PM)\s*$/i);
  const startMeridiem = (startMeridiemMatch?.[1].toUpperCase() as "AM" | "PM" | undefined) ?? null;

  const open = parseTimeToken(parts[0], startMeridiem ?? endMeridiem);
  const close = parseTimeToken(parts[1], endMeridiem);
  if (open == null || close == null) return null;
  // Past-midnight close (e.g. "11 AM – 1 AM")
  const adjustedClose = close <= open ? close + 24 * 60 : close;
  return [open, adjustedClose];
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

  // Check today's window first
  const today = parseRange(hours[todayName] ?? "");
  if (today) {
    const [open, close] = today;
    if (nowMinutes >= open && nowMinutes < close) return "open";
  }

  // Also check yesterday's range in case it spans past midnight (e.g. closes 1 AM)
  const yesterday = parseRange(hours[yesterdayName] ?? "");
  if (yesterday) {
    const [, close] = yesterday;
    if (close > 24 * 60 && nowMinutes < close - 24 * 60) return "open";
  }

  // We had hours for today but not currently in-window → closed
  if (hours[todayName]) return "closed";
  // No data for today at all
  return "unknown";
};
