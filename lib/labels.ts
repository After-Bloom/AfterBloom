import type { Concern, RelationDetail, RoutingResult, Severity, Signal, SignalSource } from "./types/cases.ts";
import { CONCERN_WINDOW_HOURS, CORROBORATE_HOURS, REPEAT_HOURS } from "./signals/config.ts";
import { formatClock } from "./time.ts";

// Every word the grouping screens show lives here, in English with Hindi alongside. The code names (HYPERTENSIVE, DUPLICATE,
// POSSIBLY_RELATED ...) never reach a screen. Hindi is a draft for a clinician and a native speaker to review.
export type Lang = "en" | "hi";
type Pair = { en: string; hi: string };
const pick = (p: Pair, lang: Lang) => p[lang];

export const CONCERN_LABEL: Record<Concern, Pair> = {
  HYPERTENSIVE: { en: "Blood pressure", hi: "ब्लड प्रेशर" },
  HAEMORRHAGE: { en: "Bleeding", hi: "रक्तस्राव" },
  INFECTION: { en: "Infection", hi: "संक्रमण" },
  CLOT_RISK: { en: "Clot risk", hi: "खून का थक्का" },
  MOOD: { en: "Mood", hi: "मन की स्थिति" },
  SELF_HARM: { en: "Safety", hi: "सुरक्षा" },
  NEWBORN: { en: "Baby", hi: "शिशु" },
  ENGAGEMENT: { en: "Follow-up", hi: "फ़ॉलो-अप" },
  GENERAL: { en: "General recovery", hi: "सामान्य रिकवरी" },
};
export const concernLabel = (c: Concern, lang: Lang = "en") => pick(CONCERN_LABEL[c], lang);

/** Severity is always shown as an icon, a word and a colour (never colour alone). */
export const SEVERITY_LABEL: Record<Severity, Pair> = {
  red: { en: "Red", hi: "लाल" },
  amber: { en: "Amber", hi: "अंबर" },
  info: { en: "Info", hi: "सूचना" },
};
export const severityLabel = (s: Severity, lang: Lang = "en") => pick(SEVERITY_LABEL[s], lang);

export const SOURCE_LABEL: Record<SignalSource, Pair> = {
  symptom_checker: { en: "Symptom checker", hi: "लक्षण जाँच" },
  checkin: { en: "Check-in", hi: "चेक-इन" },
  bp_trend: { en: "BP trend", hi: "बीपी का रुझान" },
  epds: { en: "Mood screen", hi: "मूड स्क्रीनिंग" },
  care_loop: { en: "Care follow-up", hi: "देखभाल फ़ॉलो-अप" },
  callback: { en: "Callback", hi: "कॉलबैक" },
  circle_post: { en: "Circle message", hi: "सर्कल संदेश" },
  partner_screen: { en: "Family screening", hi: "परिवार की स्क्रीनिंग" },
};
export const sourceLabel = (s: SignalSource, lang: Lang = "en") => pick(SOURCE_LABEL[s], lang);
/** "in the check-in", "in the symptom checker": for the sentence "Also reported in ..." */
const SOURCE_IN: Record<SignalSource, Pair> = {
  symptom_checker: { en: "the symptom checker", hi: "लक्षण जाँच में" },
  checkin: { en: "the check-in", hi: "चेक-इन में" },
  bp_trend: { en: "the BP trend", hi: "बीपी रुझान में" },
  epds: { en: "the mood screen", hi: "मूड स्क्रीनिंग में" },
  care_loop: { en: "the care follow-up", hi: "देखभाल फ़ॉलो-अप में" },
  callback: { en: "a callback", hi: "कॉलबैक में" },
  circle_post: { en: "a circle message", hi: "सर्कल संदेश में" },
  partner_screen: { en: "the family screening", hi: "परिवार की स्क्रीनिंग में" },
};

// ---------- what a signal is called ----------
const CODE_LABEL: Record<string, Pair> = {
  bp_raised: { en: "Raised blood pressure", hi: "बढ़ा हुआ ब्लड प्रेशर" },
  high_bp: { en: "Very high blood pressure", hi: "बहुत ज़्यादा ब्लड प्रेशर" },
  bp_rising: { en: "Blood pressure rising over several readings", hi: "कई रीडिंग में बढ़ता ब्लड प्रेशर" },
  headache_severe: { en: "Very severe headache", hi: "बहुत तेज़ सिरदर्द" },
  epds_possible: { en: "Mood screen: possible", hi: "मूड स्क्रीनिंग: संभावित" },
  epds_probable: { en: "Mood screen: probable", hi: "मूड स्क्रीनिंग: अधिक संभावना" },
  epds_q10: { en: "Mood screen: thoughts of self-harm", hi: "मूड स्क्रीनिंग: खुद को नुकसान के विचार" },
  self_harm: { en: "Thoughts of self-harm", hi: "खुद को नुकसान के विचार" },
  selfharm_wording: { en: "Worrying words in a circle message", hi: "सर्कल संदेश में चिंताजनक शब्द" },
  psychosis_signs: { en: "Possible postpartum psychosis warning signs", hi: "प्रसवोत्तर मनोविकृति के संभावित संकेत" },
  loop_no_reply: { en: "No reply to the follow-up question", hi: "फ़ॉलो-अप सवाल का जवाब नहीं" },
  loop_worse: { en: "Says she feels worse", hi: "कहती हैं कि तबीयत और बिगड़ी है" },
  loop_cant_reach: { en: "Cannot get to care", hi: "इलाज तक नहीं पहुँच पा रहीं" },
  callback_overdue: { en: "Callback overdue", hi: "कॉलबैक में देरी" },
  partner_concerns: { en: "Family noticed changes", hi: "परिवार ने बदलाव देखे" },
  symptom_unspecified: { en: "Symptom reported", hi: "लक्षण बताया गया" },
  red_flag: { en: "Emergency warning sign", hi: "आपातकालीन चेतावनी संकेत" },
  b_danger: { en: "Danger sign in the baby", hi: "शिशु में ख़तरे का संकेत" },
};

/** The title of one signal. `symptom` is the symptom table's own wording (English, Hindi) for codes that are symptom ids. */
export function signalTitle(s: Pick<Signal, "code" | "value">, lang: Lang = "en", symptom?: { label: string; hi?: string }): string {
  const known = CODE_LABEL[s.code];
  const base = known ? pick(known, lang) : symptom ? (lang === "hi" && symptom.hi ? symptom.hi : symptom.label) : s.code.replace(/_/g, " ");
  const v = s.value as { sys?: number; dia?: number; total?: number } | null;
  if (v?.sys && v?.dia) return `${base} ${v.sys}/${v.dia}`;
  if (typeof v?.total === "number") return `${base} (${v.total}/30)`;
  return base;
}

// ---------- how it relates to earlier alerts ----------
/** The short chip: "Repeat x2", "Follow-up of 7:10 pm alert", "Also reported in check-in", "Same concern: Blood pressure", ... */
export function relationLabel(sig: Pick<Signal, "relation" | "linkStatus" | "relationDetail" | "concern">, lang: Lang = "en"): string {
  const d: RelationDetail = sig.relationDetail;
  if (sig.linkStatus === "unlinked") return lang === "hi" ? "अलग किया गया" : "Unlinked";
  switch (sig.relation) {
    case "FOLLOW_UP": return lang === "hi" ? `${d.ofAt ? formatClock(d.ofAt, lang) : ""} के अलर्ट का फ़ॉलो-अप` : `Follow-up of ${d.ofAt ? formatClock(d.ofAt) : "earlier"} alert`;
    case "DUPLICATE": return lang === "hi" ? `दोहराव x${d.count ?? 2}` : `Repeat x${d.count ?? 2}`;
    case "CORROBORATES": return lang === "hi" ? `${d.ofSource ? SOURCE_IN[d.ofSource].hi : "दूसरी जगह"} भी बताया गया` : `Also reported in ${d.ofSource ? sourceLabel(d.ofSource).toLowerCase() : "another source"}`;
    case "RELATED": return lang === "hi" ? `वही चिंता: ${concernLabel(sig.concern, lang)}` : `Same concern: ${concernLabel(sig.concern).toLowerCase()}`;
    case "POSSIBLY_RELATED":
      if (sig.linkStatus === "confirmed") return lang === "hi" ? "पुष्टि की गई" : "Confirmed link";
      return lang === "hi" ? "संभवतः जुड़ा हुआ: पुष्टि करें?" : "Possibly related: confirm?";
    default: return lang === "hi" ? "नई चिंता" : "New concern";
  }
}

const hours = (h: number, lang: Lang) => (h >= 48 && h % 24 === 0 ? (lang === "hi" ? `${h / 24} दिन` : `${h / 24} days`) : lang === "hi" ? `${h} घंटे` : `${h} hours`);

/** The "Why linked" line: the rule that fired, in plain words, with the real times. */
export function whyLinked(sig: Pick<Signal, "relation" | "linkStatus" | "relationDetail" | "concern" | "code" | "value">, lang: Lang = "en", ofTitle?: string): string {
  const d = sig.relationDetail;
  const at = d.ofAt ? formatClock(d.ofAt, lang) : "";
  const hi = lang === "hi";
  if (sig.linkStatus === "unlinked") return hi ? "एक चिकित्सक ने इसे बाकी अलर्ट से अलग कर दिया।" : "A clinician separated this from the other alerts.";
  switch (sig.relation) {
    case "FOLLOW_UP": return hi ? `यह ${at} के अलर्ट की वजह से बना है${ofTitle ? ` (${ofTitle})` : ""}।` : `This exists because of the ${at} alert${ofTitle ? ` (${ofTitle})` : ""}.`;
    case "DUPLICATE": return hi ? `वही संकेत, उसी स्रोत से, ${hours(REPEAT_HOURS, lang)} के भीतर (पिछली बार ${at})।` : `Same sign from the same source within ${hours(REPEAT_HOURS, lang)} (last at ${at}).`;
    case "CORROBORATES": return hi ? `वही संकेत, दूसरे स्रोत से, ${hours(CORROBORATE_HOURS, lang)} के भीतर (${at})।` : `Same sign from a different source within ${hours(CORROBORATE_HOURS, lang)} (at ${at}).`;
    case "RELATED": return hi ? `वही चिंता (${concernLabel(sig.concern, lang)}) पिछले ${hours(d.windowHours ?? CONCERN_WINDOW_HOURS[sig.concern], lang)} में पहले भी आई थी (${at})।` : `${concernLabel(sig.concern)} was already raised in the last ${hours(d.windowHours ?? CONCERN_WINDOW_HOURS[sig.concern], lang)} (at ${at}).`;
    case "POSSIBLY_RELATED":
      if (sig.linkStatus === "confirmed") return hi ? "एक चिकित्सक ने पुष्टि की कि ये एक ही समस्या के हिस्से हैं।" : "A clinician confirmed these belong together.";
      return hi ? `${d.otherConcern ? concernLabel(d.otherConcern, lang) : "दूसरी चिंता"} के साथ मिल सकता है (${at})। जोड़ने से पहले चिकित्सक की पुष्टि चाहिए।` : `Can go with ${d.otherConcern ? concernLabel(d.otherConcern).toLowerCase() : "another concern"} seen at ${at}. It is only linked once a clinician confirms.`;
    default: return hi ? `इस चिंता का पिछले ${hours(CONCERN_WINDOW_HOURS[sig.concern], lang)} में कोई अलर्ट नहीं था।` : `No earlier alert for this concern in the last ${hours(CONCERN_WINDOW_HOURS[sig.concern], lang)}.`;
  }
}

/** Why the care team was or was not pinged for this alert. */
export function notifyLabel(sig: Pick<Signal, "notified" | "relationDetail">, lang: Lang = "en"): string {
  const hi = lang === "hi";
  if (!sig.notified) return hi ? "टीम को दोबारा सूचित नहीं किया गया (पहले से ज्ञात)" : "Held back: the care team already knew";
  switch (sig.relationDetail.notify) {
    case "severity_rise": return hi ? "गंभीरता बढ़ी, इसलिए टीम को बताया गया" : "Care team told: it got more serious";
    case "self_harm": return hi ? "सुरक्षा का मामला, इसलिए हमेशा सूचित" : "Care team told: safety alerts are always sent";
    case "forced": return hi ? "टीम को बताया गया: कोई जवाब नहीं आया" : "Care team told: no reply came";
    default: return hi ? "नई चिंता, इसलिए टीम को बताया गया" : "Care team told: new concern";
  }
}

// ---------- continuity of care ----------
/** The reason line on a card: "Returning patient: 2 sessions with Dr Rao", "New patient: assigned to the least busy (Dr Sen)" ... */
export function routingReason(r: RoutingResult, lang: Lang = "en"): { chip: string; reason: string; tone: "ok" | "info" | "warn" } {
  const hi = lang === "hi";
  switch (r.kind) {
    case "returning": return {
      chip: hi ? "पहले से जानी-पहचानी मरीज़" : "Returning patient", tone: "ok",
      reason: hi ? `${r.sessions} सत्र ${r.proName} के साथ` : `${r.sessions} ${r.sessions === 1 ? "session" : "sessions"} with ${r.proName}`,
    };
    case "preferred": return { chip: hi ? "उनकी चुनी हुई डॉक्टर" : "Her chosen doctor", tone: "ok", reason: hi ? `${r.proName} को उन्होंने चुना है` : `She chose ${r.proName}` };
    case "new": return {
      chip: hi ? "नई मरीज़" : "New patient", tone: "info",
      reason: r.note === "preferred_off_duty" ? (hi ? `उनकी डॉक्टर अभी ड्यूटी पर नहीं हैं: ${r.proName} को सौंपा` : `Her doctor is off duty: assigned to ${r.proName}`) : (hi ? `सबसे कम व्यस्त (${r.proName}) को सौंपा` : `Assigned to the least busy (${r.proName})`),
    };
    case "on_call": return { chip: hi ? "सभी व्यस्त" : "All at capacity", tone: "warn", reason: hi ? `ऑन-कॉल ${r.proName}` : `On-call ${r.proName}` };
    default: return { chip: hi ? "अभी असाइन नहीं" : "Not assigned", tone: "warn", reason: hi ? "सभी जुड़े पेशेवरों को बताया गया" : "Everyone matched with her is told" };
  }
}

export const SPECIALTY_LABEL: Record<string, Pair> = {
  psychologist: { en: "Psychologist", hi: "मनोवैज्ञानिक" },
  gynaecologist: { en: "Gynaecologist", hi: "स्त्री रोग विशेषज्ञ" },
  paediatrician: { en: "Paediatrician", hi: "शिशु रोग विशेषज्ञ" },
  lactation: { en: "Lactation consultant", hi: "स्तनपान सलाहकार" },
};
