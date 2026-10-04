import { Level, SYMPTOMS, Symptom, bySymptomId } from "./symptoms";
import { COMBOS, FOLLOWUPS, FollowUp } from "./symptoms-extra";

export type CrisisKind = "selfharm" | "medical" | "psychosis";

const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").trim();

// ---------- Step 1: red-flag check (no AI) ----------
const SELF_HARM = /why bother (living|going on|being here)|better off without me|no reason to (keep going|live|go on)|see any reason to (keep going|live)|ending things|end things|just vanish|bojh hoon|nobody would miss me|tired of me|better off if i (was|were) (gone|dead)|no point (in )?(living|going on)|do not want to (be here|live)|don t want to (be here|live)|wish i (was|were) (dead|gone)|wish i could disappear|can t go on|cannot go on|end it all|jeene ka mann nahi|jeena nahi chahti|main nahi rahi to|sab meri wajah se pareshan|खुद को नुकसान|खुद को मार|मरना चाहती|जीना नहीं|आत्महत्या|मर जाना चाहती|बच्चे को नुकसान|khud ko nuksan|khud ko (maar|khatam)|suicid|kill myself|end my life|want to die|wanna die|marna chahti|marna hai|jeena nahi|hurt myself|harm myself|harm my ?self|aatmahatya|मरना चाहती|खुद को नुकसान|आत्महत्या|hurt (the |my )?baby|harm (the |my )?baby|baby ko (nuksan|maar)|throw (the |my )?baby/;
const PSYCHOSIS = /आवाज़ें सुन|आवाजें सुन|आवाज़ सुन|बच्चा मेरा नहीं|कई दिनों से सोई नहीं|hearing voices|seeing things|awaaz(en)? sun|awaz sun|not (my|mine) baby|baby (meri|mera) nahi|bachcha (meri|mera) nahi|haven t slept (for )?days|din se (so nahi|nahi so)|confused and scared/;
const MEDICAL_RED: [RegExp, string][] = [
  [/बहुत खून|ज्यादा खून|ज़्यादा खून|खून के थक्के/, "Heavy bleeding"],
  [/दौरा|दौरे|झटके|बेहोश/, "Fits or fainting"],
  [/(सिर|सर).*(धुंधल|धुँधल)|(धुंधल|धुँधल).*(सिर|सर)/, "Severe headache with blurred vision"],
  [/सीने में दर्द|सांस नहीं|साँस नहीं|सांस लेने में तकलीफ|सांस फूल/, "Chest pain or breathlessness"],
  [/(पिंडली).*(सूजन|दर्द)/, "Painful swollen calf"],
  [/\bcollaps|passed out|blacked out|went black|lost consciousness|not responding|unresponsive/, "Fits or fainting"],
  [/shaking and (jerking|twitching)|body is jerking|jerking all over|jhatke aa rahe|body akad/, "Fits or fainting"],
  [/chest (feels |is |was )?(crushed|crushing|squeezed|very tight)|crushing chest|seena bhaari/, "Chest pain or breathlessness"],
  [/pooling|soaked (through|the bed|my clothes)|bleeding (a lot|heavily|badly)|khoon rukne ka naam nahi|khoon band nahi/, "Heavy bleeding"],
  [/head (is |feels )?(splitting|exploding)|(splitting|worst|unbearable|terrible) headache|headache (is |was )?(splitting|unbearable)/, "Very severe headache"],
  [/(leg|pair|pindli).*(red|hot|laal|garam).*(painful|swollen|dard|sujan)|one leg.*(swollen|painful|sooj|dard)/, "Painful swollen calf"],
  [/(baby|newborn|bachch?a).*(freezing|ice cold|very cold|bahut thanda)/, "Danger sign in the baby"],
  [/(baby|newborn|bachch?a).*(limp|floppy|unresponsive|hard to wake|will not wake|not waking|uthta nahi)/, "Danger sign in the baby"],
  [/(baby|newborn|bachch?a).*(green|hara|hari).*(vomit|ulti|liquid)|(vomit|ulti).*(green|hara|hari)/, "Danger sign in the baby"],
  [/(baby|newborn|bachch?a|belly button|navel|naal|naabhi).*(pus|leaking pus|discharge|badbu).*(red|laal)|(baby|naal|naabhi).*(pus)/, "Spreading redness or pus at the cord"],
  [/(baby|newborn|bachch?a).*(yellow|peela|peeli).*(feet|foot|palms?|soles?|legs?|talwe|hatheli|pair)/, "Yellow palms or soles in the baby"],
  [/(baby|newborn|bachch?a).*cr(y|ies).*(weak|thin|feeble)|(baby|newborn|bachch?a).*(weak|thin|kamzor|feeble).*(cry|rona|roya)|(baby|newborn).*(gasping|grunting)/, "Danger sign in the baby"],
  [/(shaking|shivering|trembling).*(hot|fever|burning)|burning (hot|up)/, "Fever with chills or foul-smelling discharge"],
  [/(baby|newborn|bachch?a).*(breath|saans).*(quick|fast|rapid|tez)|(baby|newborn).*(burning up|very hot|feels hot|has a fever|is feverish|bukhar)/, "Danger sign in the baby"],
  [/blood (is |was )?(running|pouring|gushing|dripping|flowing)|bleeding through|khoon beh|khoon gir raha|khoon tapak|bahut khoon|zyada khoon|heavy bleeding|soak(ed|ing)? (a |one |my )?pad|large clots?|big clots?|khoon ke thakke|बहुत खून|ज्यादा खून/, "Heavy bleeding"],
  [/daura|\bfits?\b|seizure|convuls|behosh|faint|unconscious|बेहोश|दौरा/, "Fits or fainting"],
  [/(sar|head|headache|sir).*(dhundh|blur|dikh|vision|nazar|cannot see|can not see|can t see|cant see|double vision|flashing)|(dhundh|blur).*(sar|head|sir)/, "Severe headache with blurred vision"],
  [/chest pain|seene mein dard|saans (nahi|lene mein)|breathless|cant breathe|can t breathe|cannot breathe|can not breathe|unable to breathe|difficulty breathing|trouble breathing|short of breath|gasping|saans lene mein dikkat|सीने में दर्द|सांस/, "Chest pain or breathlessness"],
  [/(fever|bukhar).*(chill|kaanp|thand)|foul|badbu|badboo|smelly discharge/, "Fever with chills or foul-smelling discharge"],
  [/(calf|pindli).*(swol|sujan|pain|dard)|(swol|sujan).*(calf|pindli)/, "Painful swollen calf"],
  [/baby.*(not feeding|doodh nahi|not drinking|blue|neela|limp)|baby.*(breath|saans).*(fast|tez)/, "Danger sign in the baby"],
];

export type RedFlag = { kind: CrisisKind; reason: string; negated?: boolean } | null;

// "no heavy bleeding" should not raise the alarm outright, but must never be silently ignored:
// a negated medical flag comes back with negated=true so the app asks "just checking?" first.
// Self-harm language is never exempted by negation.
const NEG_BEFORE = /\b(no|not|never|without|dont have|don t have|do not have|nahi|nahin|nhi|bina|koi)\b/;
const NEG_AFTER = /^\s*(nahi|nahin|nhi|hai nahi|he nahi)\b/;
function isNegated(t: string, idx: number, len: number) {
  const before = t.slice(Math.max(0, idx - 28), idx).trim().split(" ").slice(-3).join(" ");
  return NEG_BEFORE.test(before) || NEG_AFTER.test(t.slice(idx + len, idx + len + 14));
}

export function redFlagCheck(text: string): RedFlag {
  const t = norm(text);
  if (SELF_HARM.test(t) || SELF_HARM.test(text.toLowerCase())) return { kind: "selfharm", reason: "Thoughts of self-harm" };
  const ps = PSYCHOSIS.exec(t);
  if (ps) return { kind: "psychosis", reason: "Possible postpartum psychosis warning signs", negated: isNegated(t, ps.index, ps[0].length) };
  for (const [re, reason] of MEDICAL_RED) {
    const m = re.exec(t);
    if (m) return { kind: "medical", reason, negated: isNegated(t, m.index, m[0].length) };
  }
  return null;
}
export const hasSelfHarmLanguage = (text: string) => SELF_HARM.test(norm(text)) || SELF_HARM.test(text.toLowerCase());

// ---------- Step 2: symptom matching (spelling-tolerant; embeddings are the production upgrade) ----------
function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
const sim = (a: string, b: string) => (a === b ? 1 : 1 - lev(a, b) / Math.max(a.length, b.length));
const STOP = new Set(["my", "is", "a", "the", "i", "have", "has", "am", "me", "hai", "mein", "ho", "raha", "rahi", "ka", "ki", "ke", "and", "aur", "to", "of", "with", "very", "feeling", "some"]);

function phraseScore(phrase: string, text: string, tokens: string[]) {
  if (text.includes(phrase)) return 1;
  const pt = phrase.split(" ").filter((w) => !STOP.has(w));
  if (!pt.length) return 0;
  let sum = 0;
  for (const w of pt) {
    let best = 0;
    for (const t of tokens) best = Math.max(best, w.length <= 3 && t !== w ? 0 : sim(w, t));
    sum += best >= 0.75 ? best : 0;
  }
  return (sum / pt.length) * 0.97;
}

export type Match = { symptom: Symptom; score: number };
export function matchSymptoms(input: string, who?: "mother" | "baby"): { auto: Match[]; maybe: Match[] } {
  const text = norm(input);
  const tokens = text.split(" ").filter((t) => t && !STOP.has(t));
  const all: Match[] = SYMPTOMS.filter((s) => s.id !== "self_harm" && (!who || s.who === who)).map((symptom) => ({
    symptom,
    score: Math.max(...symptom.keywords.map((k) => phraseScore(norm(k), text, tokens))),
  })).filter((m) => m.score > 0.55);
  all.sort((a, b) => b.score - a.score);
  const auto = all.filter((m) => m.score >= 0.88);
  const maybe = auto.length ? [] : all.filter((m) => m.score >= 0.6).slice(0, 4);
  return { auto, maybe };
}

// ---------- Step 3: triage table lookup - the most severe colour wins ----------
const RANK: Record<Level, number> = { GREEN: 0, AMBER: 1, RED: 2 };
export function worst(levels: Level[]): Level {
  return levels.reduce<Level>((w, l) => (RANK[l] > RANK[w] ? l : w), "GREEN");
}
export const triage = (symptoms: Symptom[]) => worst(symptoms.map((s) => s.level));

// ---------- Daily check-in danger signs go through the same table ----------
export type DangerAnswers = { bleeding: boolean; fever: boolean; headache: "none" | "alone" | "vision"; wound: boolean; breathing: boolean };
export function triageCheckin(d: DangerAnswers, bp?: { sys: number; dia: number }): { level: Level; reasons: string[] } {
  const reasons: string[] = [];
  let level: Level = "GREEN";
  const up = (l: Level, why: string) => { level = worst([level, l]); reasons.push(why); };
  if (d.bleeding) up("RED", "Heavy bleeding or large clots");
  if (d.breathing) up("RED", "Chest pain or trouble breathing");
  if (d.headache === "vision") up("RED", "Headache with vision changes");
  if (bp && (bp.sys >= 160 || bp.dia >= 110)) up("RED", `Blood pressure ${bp.sys}/${bp.dia}`);
  if (d.fever) up("AMBER", "Fever");
  if (d.headache === "alone") up("AMBER", "Headache");
  if (d.wound) up("AMBER", "Wound redness or discharge");
  if (bp && (level as Level) !== "RED" && (bp.sys >= 140 || bp.dia >= 90)) up("AMBER", `Raised blood pressure ${bp.sys}/${bp.dia}`);
  return { level, reasons };
}

// ---------- Explicit negation of plain symptoms ("no fever, but headache") ----------
// Deliberately narrow: "no sleep" and "no appetite" ARE symptoms, so only nouns that are never a symptom when absent are stripped.
const NEG_STRIP = /\b(?:no|without|never had|dont have|don t have|do not have)\s+(?:\w+\s+)?(?:fever|bleeding|pain|headache|swelling|discharge|chills|clots|vomiting|cough)\b/gi;
const NEG_STRIP_HI = /\b(?:bukhar|khoon|dard|sujan|ulti|khansi)\s+(?:nahi|nahin|nhi)\s+(?:hai|hain|he)\b/gi;
export const stripNegated = (text: string) => text.replace(NEG_STRIP, " ").replace(NEG_STRIP_HI, " ");

// ---------- Numbers she mentions: temperature, pads, breaths a minute, blood pressure ----------
// These are rule-based, so they are treated as high-confidence matches.
const WORDNUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, ek: 1, do: 2, teen: 3, char: 4 };
export function extractNumeric(text: string, who: "mother" | "baby"): Symptom[] {
  const t = text.toLowerCase();
  const out = new Set<string>();

  const bp = t.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\b/);
  if (who === "mother" && bp) {
    const sys = +bp[1], dia = +bp[2];
    if (sys >= 70 && sys <= 260 && dia >= 40 && dia <= 160) out.add(sys >= 160 || dia >= 110 ? "high_bp" : sys >= 140 || dia >= 90 ? "bp_raised" : "");
  }

  if (/(temp|fever|bukhar|thermometer|degree|°|reading|garam)/.test(t)) {
    const m = t.match(/\b(\d{2,3}(?:\.\d)?)\s*(?:°|degrees?|deg)?\s*(f|c|fahrenheit|celsius)?\b/);
    if (m) {
      let v = +m[1];
      const unit = m[2]?.[0] ?? (v >= 90 ? "f" : "c");
      if (unit === "f" && v >= 90 && v <= 110) v = (v - 32) * 5 / 9;
      if (v >= 33 && v <= 43) {
        if (who === "baby") { if (v >= 37.5) out.add("b_fever"); else if (v < 35.5) out.add("b_temp"); }
        else if (v >= 38) out.add("fever");
      }
    }
  }

  const pads = t.match(/\b(\d+|one|two|three|four|ek|do|teen|char)\s*(?:full\s*)?(?:pads?|napkins?)\b[^.]*?\b(?:hour|hr|ghanta|ghante|ghant)/);
  if (who === "mother" && pads && (WORDNUM[pads[1]] ?? +pads[1]) >= 1) out.add("heavy_bleeding");

  const br = t.match(/\b(\d{2,3})\s*(?:breaths?|saans)\b/) ?? t.match(/\bbreath(?:ing)?\s*(?:rate\s*)?(?:is\s*)?(\d{2,3})\b/);
  if (who === "baby" && br && +br[1] >= 60 && +br[1] <= 150) out.add("b_fast_breathing");

  return [...out].filter(Boolean).map((id) => bySymptomId(id));
}

// ---------- Follow-up questions, then the final level ----------
export type FuItem = { symptomId: string; fu: FollowUp };
export function followUpsFor(picked: Symptom[], max = 3): FuItem[] {
  if (triage(picked) === "RED") return []; // already an emergency: no more questions
  const seen = new Set<string>(), out: FuItem[] = [];
  for (const s of [...picked].sort((a, b) => RANK[b.level] - RANK[a.level])) {
    for (const f of FOLLOWUPS[s.id] ?? []) {
      if (seen.has(f.q)) continue;
      seen.add(f.q);
      out.push({ symptomId: s.id, fu: f });
    }
  }
  return out.slice(0, max);
}

/** Follow-ups and combinations can only RAISE the level, never lower it. */
export function resolveCase(picked: Symptom[], asked: FuItem[], answers: number[]) {
  const symptoms = [...picked];
  let level = triage(picked);
  let crisis: CrisisKind | undefined;
  asked.forEach((it, i) => {
    if (answers[i] === -2) { level = worst([level, "AMBER"]); return; } // "I am not sure" is treated cautiously
    const e = it.fu.options[answers[i]]?.effect;
    if (!e) return;
    if (e.add) { const s = bySymptomId(e.add); if (s && !symptoms.some((x) => x.id === s.id)) symptoms.push(s); }
    if (e.level) level = worst([level, e.level]);
    if (e.crisis) { crisis = e.crisis; level = "RED"; }
  });
  level = worst([level, ...symptoms.map((s) => s.level)]);
  const reasons: string[] = [];
  for (const c of COMBOS) if (c.all.every((id) => symptoms.some((s) => s.id === id))) { level = worst([level, c.level]); reasons.push(c.why); }
  return { symptoms, level, reasons, crisis };
}
