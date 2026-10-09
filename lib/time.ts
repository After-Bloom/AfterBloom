// One place for turning a time into words. Always Asia/Kolkata, so the server (which runs in UTC) and every phone show the same clock,
// and the summary sentences never say "2:40 am" when the nurse's wall clock says "8:10 am".
const TZ = "Asia/Kolkata";
const tag = (lang: "en" | "hi") => (lang === "hi" ? "hi-IN" : "en-IN");

/** "7:10 pm" */
export const formatClock = (iso: string, lang: "en" | "hi" = "en") =>
  new Intl.DateTimeFormat(tag(lang), { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

/** "10 Oct, 7:10 pm" */
export const formatTime = (iso: string, lang: "en" | "hi" = "en") =>
  new Intl.DateTimeFormat(tag(lang), { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

/** "10 Oct" */
export const formatDay = (iso: string, lang: "en" | "hi" = "en") =>
  new Intl.DateTimeFormat(tag(lang), { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(iso));

/** The calendar day in Kolkata, for grouping a timeline by day. */
export const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
