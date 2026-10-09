import type { Concern } from "../types/cases.ts";
import type { Outcome, Priority } from "./priority.ts";

// The clinician playbook: ONE recommended next action for each concern and priority. Pre-written, never generated, and editable by a
// clinician (the admin's clinical settings can override it under the key "playbook"; these are the draft defaults).
//
// The action buttons and the fixed outcomes below are the only things a professional can record. No free text goes into the audit trail.

type Pair = { en: string; hi: string };
export type PlaybookEntry = { button: Pair; guidance: Pair; kind: "call" | "book_session" | "monitor" };

const call = (button: Pair, guidance: Pair): PlaybookEntry => ({ kind: "call", button, guidance });
const CALL_NOW: Pair = { en: "Call & log outcome", hi: "कॉल करें और नतीजा दर्ज करें" };
const CALL_TODAY: Pair = { en: "Call today", hi: "आज कॉल करें" };
const CALL_24: Pair = { en: "Call within 24 h", hi: "24 घंटे में कॉल करें" };
const BOOK: Pair = { en: "Book a session", hi: "सत्र बुक करें" };
const MONITOR: Pair = { en: "Check at the next review", hi: "अगली समीक्षा में देखें" };

/** The default for any concern that has no entry of its own. */
const DEFAULT: Record<Priority, PlaybookEntry> = {
  P1: call(CALL_NOW, { en: "Call now, find out how she is, and make sure she gets care today.", hi: "अभी कॉल करें, उनका हाल पूछें और पक्का करें कि आज उन्हें इलाज मिले।" }),
  P2: call(CALL_TODAY, { en: "Call today and agree the next step with her.", hi: "आज कॉल करें और उनके साथ अगला कदम तय करें।" }),
  P3: call(CALL_24, { en: "Call within 24 hours and ask how she is doing.", hi: "24 घंटे में कॉल करें और हाल पूछें।" }),
  P4: { kind: "monitor", button: MONITOR, guidance: { en: "Nothing is open. Look at it again at the next routine check.", hi: "कुछ खुला नहीं है। अगली नियमित जाँच में दोबारा देखें।" } },
};

const SPECIFIC: Partial<Record<Concern, Partial<Record<Priority, PlaybookEntry>>>> = {
  HYPERTENSIVE: {
    P1: call(CALL_NOW, { en: "Call now, direct her to hospital today, and confirm she is going.", hi: "अभी कॉल करें, उन्हें आज अस्पताल जाने को कहें और पक्का करें कि वे जा रही हैं।" }),
    P2: call(CALL_TODAY, { en: "Call today, ask about headache and vision, and arrange a blood pressure check within 24 hours.", hi: "आज कॉल करें, सिरदर्द और नज़र के बारे में पूछें और 24 घंटे में बीपी जाँच तय करें।" }),
    P3: call(CALL_24, { en: "Call within 24 hours and ask her to repeat her blood pressure reading.", hi: "24 घंटे में कॉल करें और उनसे बीपी दोबारा नापने को कहें।" }),
  },
  HAEMORRHAGE: {
    P1: call(CALL_NOW, { en: "Call now. Heavy bleeding needs hospital today: confirm she is on her way.", hi: "अभी कॉल करें। भारी रक्तस्राव में आज अस्पताल ज़रूरी है: पक्का करें कि वे जा रही हैं।" }),
  },
  INFECTION: {
    P1: call(CALL_NOW, { en: "Call now and arrange for her to be seen today.", hi: "अभी कॉल करें और आज ही डॉक्टर को दिखाने का इंतज़ाम करें।" }),
    P2: call(CALL_TODAY, { en: "Call today about fever, wound and breast symptoms, and book a review.", hi: "आज बुखार, घाव और स्तन के लक्षणों के बारे में कॉल करें और समीक्षा तय करें।" }),
  },
  CLOT_RISK: {
    P1: call(CALL_NOW, { en: "Call now. Chest pain or breathlessness needs emergency care: confirm she is going.", hi: "अभी कॉल करें। सीने में दर्द या साँस की तकलीफ़ में आपातकालीन इलाज चाहिए: पक्का करें कि वे जा रही हैं।" }),
  },
  MOOD: {
    P1: call(CALL_NOW, { en: "Call now, ask how she is feeling, and follow the crisis protocol if she is unsafe.", hi: "अभी कॉल करें, पूछें कि वे कैसा महसूस कर रही हैं और असुरक्षित होने पर संकट प्रोटोकॉल अपनाएँ।" }),
    P2: call(CALL_TODAY, { en: "Call within 24 hours and offer a session.", hi: "24 घंटे में कॉल करें और सत्र का प्रस्ताव दें।" }),
    P3: { kind: "book_session", button: BOOK, guidance: { en: "Offer her a session this week.", hi: "इस हफ़्ते उन्हें सत्र का प्रस्ताव दें।" } },
  },
  SELF_HARM: {
    P1: call(CALL_NOW, { en: "Call now and follow the crisis protocol. Do not wait for a callback window.", hi: "अभी कॉल करें और संकट प्रोटोकॉल अपनाएँ। कॉलबैक की समय-सीमा का इंतज़ार न करें।" }),
    P2: call(CALL_TODAY, { en: "Call today, check she is safe and has support, and keep following up.", hi: "आज कॉल करें, देखें कि वे सुरक्षित हैं और उनके साथ कोई है, और फ़ॉलो-अप जारी रखें।" }),
  },
  NEWBORN: {
    P1: call(CALL_NOW, { en: "Call now. A danger sign in a newborn needs the baby seen today.", hi: "अभी कॉल करें। नवजात में ख़तरे के संकेत पर आज ही बच्चे को दिखाना ज़रूरी है।" }),
    P2: call(CALL_TODAY, { en: "Call today about feeding, jaundice and wet nappies.", hi: "आज दूध पिलाने, पीलिया और गीले नैपी के बारे में कॉल करें।" }),
  },
};

export function recommended(concern: Concern, priority: Priority): PlaybookEntry {
  return SPECIFIC[concern]?.[priority] ?? DEFAULT[priority];
}

/** A clinician's overrides from clinical settings win over these defaults. Shape: { HYPERTENSIVE: { P1: { button, guidance } } } */
export function withOverrides(concern: Concern, priority: Priority, overrides: unknown): PlaybookEntry {
  const base = recommended(concern, priority);
  const o = (overrides as Record<string, Record<string, { button?: Pair; guidance?: Pair; kind?: PlaybookEntry["kind"] }>> | null | undefined)?.[concern]?.[priority];
  if (!o) return base;
  return { kind: o.kind ?? base.kind, button: o.button ?? base.button, guidance: o.guidance ?? base.guidance };
}

// ---------- the action types and the fixed outcome choices ----------
export type ActionType = "call" | "book_session" | "refer" | "family_message" | "monitor" | "resolve" | "acknowledge" | "take_over";

/** Which outcomes can be recorded for which action. Fixed choices only. */
export const OUTCOMES_FOR: Record<"call" | "book_session" | "refer" | "monitor" | "resolve", Outcome[]> = {
  call: ["reached_hospital", "reached_ok", "not_reached"],
  book_session: ["session_booked"],
  refer: ["referred"],
  monitor: ["monitoring"],
  resolve: ["resolved_seen"],
};

export const OUTCOME_LABEL: Record<Outcome, Pair> = {
  reached_hospital: { en: "Reached her, she is going to hospital", hi: "बात हुई, वे अस्पताल जा रही हैं" },
  reached_ok: { en: "Reached her, advice given and she is comfortable", hi: "बात हुई, सलाह दी और वे ठीक हैं" },
  not_reached: { en: "Could not reach her", hi: "बात नहीं हो पाई" },
  session_booked: { en: "Session booked", hi: "सत्र बुक किया गया" },
  referred: { en: "Referred to a specialist", hi: "विशेषज्ञ के पास भेजा गया" },
  family_informed: { en: "Family member informed", hi: "परिवार के सदस्य को बताया गया" },
  monitoring: { en: "Keeping an eye on it", hi: "नज़र रखी जा रही है" },
  resolved_seen: { en: "Resolved: seen by a doctor", hi: "सुलझा: डॉक्टर ने देखा" },
};

/** Why a case is being monitored instead of acted on: a fixed list, because a free-text reason could leak something clinical. */
export const MONITOR_REASONS = ["improving", "waiting_scheduled", "under_care_elsewhere"] as const;
export const MONITOR_REASON_LABEL: Record<(typeof MONITOR_REASONS)[number], Pair> = {
  improving: { en: "She is improving", hi: "उनकी हालत सुधर रही है" },
  waiting_scheduled: { en: "Waiting for a scheduled check", hi: "तय जाँच का इंतज़ार" },
  under_care_elsewhere: { en: "Under care elsewhere", hi: "कहीं और इलाज चल रहा है" },
};

/** The sentence written to the audit trail, in plain words. No scores, no free text. */
export function auditSentence(type: ActionType, outcome: Outcome | null, detail: { reason?: string; familyName?: string } = {}): string {
  switch (type) {
    case "call":
      return outcome === "not_reached" ? "Tried to call her: could not reach her" : outcome === "reached_hospital" ? "Called her: reached her, she is going to hospital" : "Called her: reached her, advice given";
    case "book_session": return "Booked a session for her";
    case "refer": return "Referred her to a specialist";
    case "family_message": return `Sent ${detail.familyName ?? "a family member"} a 'please call' message`;
    case "monitor": return `Chose to keep watching${detail.reason && detail.reason in MONITOR_REASON_LABEL ? `: ${MONITOR_REASON_LABEL[detail.reason as keyof typeof MONITOR_REASON_LABEL].en.toLowerCase()}` : ""}`;
    case "resolve": return "Marked a case as resolved: seen by a doctor";
    case "acknowledge": return "Acknowledged a case";
    default: return "Took over a case";
  }
}

// ---------- messages to family: fixed, neutral wording, nothing clinical ----------
export type TemplateId = "please_call" | "help_get_care" | "check_in";
export const FAMILY_TEMPLATES: Record<TemplateId, { en: (name: string) => string; hi: (name: string) => string }> = {
  please_call: { en: (n) => `Please call ${n} and check on her today`, hi: (n) => `कृपया ${n} को कॉल करें और आज उनका हाल पूछें` },
  help_get_care: { en: (n) => `${n} may need help getting to a doctor today. Please call her.`, hi: (n) => `${n} को आज डॉक्टर तक पहुँचने में मदद चाहिए हो सकती है। कृपया उन्हें कॉल करें।` },
  check_in: { en: (n) => `Please check in on ${n} this evening`, hi: (n) => `कृपया आज शाम ${n} का हाल पूछें` },
};
