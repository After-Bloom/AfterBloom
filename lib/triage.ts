import { Level, SYMPTOMS, Symptom } from "./symptoms";

export type CrisisKind = "selfharm" | "medical" | "psychosis";

const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").trim();

// ---------- Step 1: red-flag check (no AI) ----------
const SELF_HARM = /खुद को नुकसान|खुद को मार|मरना चाहती|जीना नहीं|आत्महत्या|मर जाना चाहती|बच्चे को नुकसान|khud ko nuksan|khud ko (maar|khatam)|suicid|kill myself|end my life|want to die|wanna die|marna chahti|marna hai|jeena nahi|hurt myself|harm myself|harm my ?self|aatmahatya|मरना चाहती|खुद को नुकसान|आत्महत्या|hurt (the |my )?baby|harm (the |my )?baby|baby ko (nuksan|maar)|throw (the |my )?baby/;
const PSYCHOSIS = /आवाज़ें सुन|आवाजें सुन|आवाज़ सुन|बच्चा मेरा नहीं|कई दिनों से सोई नहीं|hearing voices|seeing things|awaaz(en)? sun|awaz sun|not (my|mine) baby|baby (meri|mera) nahi|bachcha (meri|mera) nahi|haven t slept (for )?days|din se (so nahi|nahi so)|confused and scared/;
const MEDICAL_RED: [RegExp, string][] = [
  [/बहुत खून|ज्यादा खून|ज़्यादा खून|खून के थक्के/, "Heavy bleeding"],
  [/दौरा|दौरे|झटके|बेहोश/, "Fits or fainting"],
  [/(सिर|सर).*(धुंधल|धुँधल)|(धुंधल|धुँधल).*(सिर|सर)/, "Severe headache with blurred vision"],
  [/सीने में दर्द|सांस नहीं|साँस नहीं|सांस लेने में तकलीफ|सांस फूल/, "Chest pain or breathlessness"],
  [/(पिंडली).*(सूजन|दर्द)/, "Painful swollen calf"],
  [/bahut khoon|zyada khoon|heavy bleeding|soak(ed|ing)? (a |one |my )?pad|large clots?|big clots?|khoon ke thakke|बहुत खून|ज्यादा खून/, "Heavy bleeding"],
  [/daura|\bfits?\b|seizure|convuls|behosh|faint|unconscious|बेहोश|दौरा/, "Fits or fainting"],
  [/(sar|head|headache|sir).*(dhundh|blur|dikh|vision|nazar)|(dhundh|blur).*(sar|head|sir)/, "Severe headache with blurred vision"],
  [/chest pain|seene mein dard|saans (nahi|lene mein)|breathless|cant breathe|can t breathe|सीने में दर्द|सांस/, "Chest pain or breathlessness"],
  [/(fever|bukhar).*(chill|kaanp|thand)|foul|badbu|badboo|smelly discharge/, "Fever with chills or foul-smelling discharge"],
  [/(calf|pindli).*(swol|sujan|pain|dard)|(swol|sujan).*(calf|pindli)/, "Painful swollen calf"],
  [/baby.*(not feeding|doodh nahi|not drinking|blue|neela|limp)|baby.*(breath|saans).*(fast|tez)/, "Danger sign in the baby"],
];

export type RedFlag = { kind: CrisisKind; reason: string } | null;
export function redFlagCheck(text: string): RedFlag {
  const t = norm(text);
  if (SELF_HARM.test(t) || SELF_HARM.test(text.toLowerCase())) return { kind: "selfharm", reason: "Thoughts of self-harm" };
  if (PSYCHOSIS.test(t)) return { kind: "psychosis", reason: "Possible postpartum psychosis warning signs" };
  for (const [re, reason] of MEDICAL_RED) if (re.test(t)) return { kind: "medical", reason };
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
export function matchSymptoms(input: string): { auto: Match[]; maybe: Match[] } {
  const text = norm(input);
  const tokens = text.split(" ").filter((t) => t && !STOP.has(t));
  const all: Match[] = SYMPTOMS.map((symptom) => ({
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
