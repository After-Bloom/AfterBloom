// Personal lines for Ask Bloom answers. Still no AI: each line is prewritten, with small blanks filled from her profile.
// A personal line is ADDED above the answer. It never replaces the answer and never removes the "When to see a doctor" box.
import type { RiskKey } from "../risk.ts";

export type Profile = { role: "mother" | "family" | string; delivery: "Normal" | "C-section" | string; day: number; babyName?: string; risk: Partial<Record<RiskKey, boolean>> };

export type Variant = {
  topic: string;
  when: { delivery?: "Normal" | "C-section"; minDay?: number; maxDay?: number; risk?: RiskKey; role?: "mother" | "family" };
  line: string; hi_line: string;   // blanks: {day}, {week}, {baby}
};

/** Draft lines for clinician review. The first matching line for a topic wins, so put the most specific first. */
export const VARIANTS: Variant[] = [
  { topic: "exercise", when: { delivery: "C-section", maxDay: 41 }, line: "You are on day {day} after a C-section. Gentle walking is good now; wait for your 6-week check before lifting or exercise that strains your tummy.", hi_line: "सी-सेक्शन के बाद आज आपका दिन {day} है। अभी हल्का टहलना अच्छा है; भारी सामान उठाने या पेट पर ज़ोर वाले व्यायाम से पहले 6 हफ़्ते की जाँच तक रुकें।" },
  { topic: "exercise", when: { delivery: "Normal", maxDay: 41 }, line: "You are on day {day} after your delivery. Short walks and gentle pelvic floor exercises are usually fine now if you feel well.", hi_line: "डिलीवरी के बाद आज आपका दिन {day} है। अगर आप ठीक महसूस कर रही हैं तो छोटी सैर और हल्के पेल्विक फ़्लोर व्यायाम आमतौर पर ठीक हैं।" },
  { topic: "lochia", when: { maxDay: 14 }, line: "You are on day {day}. In the first two weeks bleeding is usually red or pink and slowly getting lighter.", hi_line: "आज आपका दिन {day} है। पहले दो हफ़्तों में खून आमतौर पर लाल या गुलाबी होता है और धीरे-धीरे कम होता जाता है।" },
  { topic: "lochia", when: { minDay: 15, maxDay: 42 }, line: "You are in week {week}. By now bleeding is usually pale and light. Fresh red bleeding again is a reason to call your doctor.", hi_line: "यह आपका हफ़्ता {week} है। अब तक खून आमतौर पर हल्का और कम हो जाता है। फिर से लाल खून आए तो डॉक्टर को फ़ोन करें।" },
  { topic: "csection_wound", when: { delivery: "C-section", maxDay: 14 }, line: "Your wound is {day} days old. Redness that spreads, pus or a wound that opens needs a doctor today.", hi_line: "आपका घाव {day} दिन पुराना है। फैलती लाली, मवाद या घाव खुलना हो तो आज ही डॉक्टर को दिखाएँ।" },
  { topic: "intimacy", when: { risk: "htn" }, line: "Because you had high blood pressure in pregnancy, ask your doctor which family planning method is right for you.", hi_line: "गर्भावस्था में आपका ब्लड प्रेशर ज़्यादा था, इसलिए डॉक्टर से पूछें कि आपके लिए कौन-सा परिवार नियोजन तरीका सही है।" },
  { topic: "b_vaccines", when: { maxDay: 41 }, line: "{baby} is {day} days old. The next routine vaccines are usually due at 6 weeks.", hi_line: "{baby} {day} दिन का है। अगले नियमित टीके आमतौर पर 6 हफ़्ते पर लगते हैं।" },
  { topic: "f_help", when: { role: "family", maxDay: 14 }, line: "She is on day {day}. The first two weeks are the hardest: taking one night feed lets her sleep 4 to 5 hours in a row.", hi_line: "आज उसका दिन {day} है। पहले दो हफ़्ते सबसे कठिन होते हैं: एक रात की फ़ीड आप लें तो वह लगातार 4-5 घंटे सो सकती है।" },
];

const fits = (v: Variant, p: Profile) =>
  (!v.when.delivery || v.when.delivery === p.delivery) &&
  (v.when.minDay === undefined || p.day >= v.when.minDay) &&
  (v.when.maxDay === undefined || p.day <= v.when.maxDay) &&
  (!v.when.risk || !!p.risk[v.when.risk]) &&
  (!v.when.role || v.when.role === p.role);

/** The personal line for this topic, or null. Blanks are filled from her profile only. */
export function personalLine(topicId: string, p: Profile | null, lang: "en" | "hi"): string | null {
  if (!p || p.day < 0 || p.day > 365) return null;
  const v = VARIANTS.find((x) => x.topic === topicId && fits(x, p));
  if (!v) return null;
  const fill = (s: string) => s.replace(/\{day\}/g, String(p.day)).replace(/\{week\}/g, String(Math.floor(p.day / 7) + 1)).replace(/\{baby\}/g, p.babyName || (lang === "hi" ? "आपका बच्चा" : "Your baby"));
  return fill(lang === "hi" ? v.hi_line : v.line);
}
