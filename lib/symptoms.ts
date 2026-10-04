// Triage table. In production this lives in the database so a clinician can edit it.
// PLACEHOLDER: pending sign-off by the team's clinical advisor (see "To Confirm Before Submission").
import { AREA_LABELS, AREA_OF, COMBOS, EXTRA, EXTRA_KEYWORDS, FOLLOWUPS } from "./symptoms-extra";
import { HI } from "./hi";

export type Level = "RED" | "AMBER" | "GREEN";
export type Symptom = {
  id: string;
  label: string;
  who: "mother" | "baby";
  level: Level;
  keywords: string[]; // English, Hindi (romanised) and Hinglish
  tip?: string; // prewritten self-care text (GREEN)
  hi?: string; // Hindi label
  tipHi?: string; // Hindi tip
  area?: string; // body-area group for tap-first browsing
};

const S = (id: string, label: string, who: "mother" | "baby", level: Level, keywords: string[], tip?: string): Symptom => ({ id, label, who, level, keywords, tip });

export const SYMPTOMS: Symptom[] = [
  // ---------- Mother: RED ----------
  S("heavy_bleeding", "Heavy bleeding (soaking a pad within an hour)", "mother", "RED", ["heavy bleeding", "soaking pad", "bahut khoon", "zyada khoon", "bleeding bahut"]),
  S("clots", "Large blood clots", "mother", "RED", ["large clots", "big clots", "khoon ke thakke", "clots passing"]),
  S("fits", "Fits or seizure", "mother", "RED", ["fits", "seizure", "daura", "convulsion"]),
  S("fainting", "Fainting or blacking out", "mother", "RED", ["fainting", "fainted", "behosh", "blackout", "chakkar gir"]),
  S("headache_vision", "Severe headache with blurred vision", "mother", "RED", ["severe headache blurred vision", "sar dard dhundhla", "headache vision blurry"]),
  S("chest_pain", "Chest pain", "mother", "RED", ["chest pain", "seene mein dard", "chest tightness"]),
  S("breathless", "Breathlessness", "mother", "RED", ["breathless", "cant breathe", "saans nahi", "saans phoolna", "difficulty breathing"]),
  S("fever_chills", "Fever with chills", "mother", "RED", ["fever chills", "bukhar kaanp", "bukhar thand lagna", "shivering fever"]),
  S("foul_discharge", "Foul-smelling discharge", "mother", "RED", ["foul smelling discharge", "badbu discharge", "smelly discharge", "badboo"]),
  S("calf_swelling", "Painful swollen calf on one side", "mother", "RED", ["swollen calf", "calf pain", "pindli mein sujan", "pindli dard"]),
  S("self_harm", "Thoughts of harming myself or the baby", "mother", "RED", ["harm myself", "khud ko nuksan", "want to die", "marna chahti", "hurt baby"]),
  S("high_bp", "Very high blood pressure reading", "mother", "RED", ["high blood pressure", "bp high", "bp zyada"]),
  // ---------- Mother: AMBER ----------
  S("fever", "Fever", "mother", "AMBER", ["fever", "bukhar", "temperature high", "garam badan"]),
  S("breast_red", "Painful red breast", "mother", "AMBER", ["painful red breast", "breast red", "breast lump hot", "stan mein dard", "stan laal", "mastitis"]),
  S("urine_burn", "Burning while passing urine", "mother", "AMBER", ["burning urine", "burning urination", "peshab mein jalan", "urine jalan"]),
  S("wound_infection", "Wound redness or discharge", "mother", "AMBER", ["wound red", "stitches pus", "stitches discharge", "stitches hurting", "tanke mein dard", "tanke laal", "scar discharge", "stitches pain"]),
  S("low_mood", "Persistent low mood", "mother", "AMBER", ["low mood", "feeling very sad", "udaas", "rona aa raha", "crying all day", "depressed"]),
  S("anxiety", "Persistent anxiety or worry", "mother", "AMBER", ["anxious", "anxiety", "bahut tension", "ghabrahat", "panic"]),
  S("no_sleep", "Not sleeping even when baby sleeps", "mother", "AMBER", ["cannot sleep", "not sleeping", "neend nahi aa rahi", "insomnia"]),
  S("cant_eat", "Unable to eat", "mother", "AMBER", ["cannot eat", "no appetite", "bhookh nahi", "khana nahi kha"]),
  S("severe_pain", "Severe pain that is getting worse", "mother", "AMBER", ["severe pain", "pain getting worse", "bahut dard badh raha"]),
  S("leaking_urine", "Cannot control urine", "mother", "AMBER", ["leaking urine", "urine leak", "peshab nikal jata"]),
  S("breast_engorged", "Hard, engorged breasts", "mother", "AMBER", ["engorged breasts", "breast hard", "stan sakht", "milk blocked"]),
  S("hair_loss_heavy", "Sudden heavy hair fall with weakness", "mother", "AMBER", ["heavy hair fall weakness", "bal jhad rahe kamzori"]),
  // ---------- Mother: GREEN ----------
  S("afterpains", "Mild afterpains / cramps", "mother", "GREEN", ["cramps", "afterpains", "mild cramps", "pet mein halka dard", "pet dard halka"], "Mild cramps are common while the womb shrinks. A warm compress and rest help. Feeding often brings them on."),
  S("light_bleeding", "Light bleeding that is reducing", "mother", "GREEN", ["light bleeding", "spotting", "halka khoon", "bleeding kam ho rahi"], "Bleeding (lochia) can last up to 6 weeks and should slowly get lighter. Watch for it getting heavier."),
  S("tired", "Tiredness", "mother", "GREEN", ["very tired", "tired", "thakan", "thaki hui", "exhausted", "weakness"], "Tiredness is very common. Sleep when the baby sleeps, accept help, drink water and eat regular meals."),
  S("tearful", "Brief tearfulness (first 2 weeks)", "mother", "GREEN", ["tearful", "crying a little", "thoda rona", "mood swings", "baby blues", "emotional"], "Baby blues affect many mothers in the first two weeks. Talk to someone you trust. If it lasts longer, tell us."),
  S("back_pain", "Mild back or body ache", "mother", "GREEN", ["back pain", "body ache", "kamar dard", "body pain halka"], "Support your back while feeding and avoid lifting heavy things. Gentle walking helps."),
  S("constipation", "Constipation", "mother", "GREEN", ["constipation", "kabz", "hard stool"], "Drink plenty of water, eat fibre (fruit, vegetables, dalia) and walk a little each day."),
  S("sore_nipples", "Sore nipples", "mother", "GREEN", ["sore nipples", "nipple pain", "nipple dard"], "A good latch matters most. Ask your ANM or a lactation consultant to check the latch."),
  S("hair_fall", "Hair fall", "mother", "GREEN", ["hair fall", "hair loss", "bal jhadna", "baal gir rahe"], "Hair fall 2 to 4 months after birth is a normal hormone change and settles by itself."),
  S("night_sweats", "Night sweats", "mother", "GREEN", ["night sweats", "sweating at night", "raat ko pasina"], "Night sweats happen as hormones settle. Keep water by the bed and wear light clothes."),
  // ---------- Baby: RED ----------
  S("b_not_feeding", "Baby is not feeding", "baby", "RED", ["baby not feeding", "baby not drinking", "baby doodh nahi", "baby refusing feed", "baby not feeding well"]),
  S("b_convulsion", "Baby has convulsions", "baby", "RED", ["baby convulsion", "baby fits", "baby ko daura"]),
  S("b_fast_breathing", "Fast breathing (60+ a minute)", "baby", "RED", ["baby fast breathing", "baby saans tez", "baby breathing fast"]),
  S("b_chest_indrawing", "Chest indrawing", "baby", "RED", ["chest indrawing", "baby chest andar", "ribs pulling in"]),
  S("b_temp", "Very high or very low temperature", "baby", "RED", ["baby very hot", "baby very cold", "baby bukhar tez", "baby cold body", "baby temperature"]),
  S("b_drowsy", "Unusually drowsy or limp", "baby", "RED", ["baby very sleepy", "baby limp", "baby uthta nahi", "baby unusually drowsy"]),
  S("b_jaundice_24", "Yellow skin in first 24 hours", "baby", "RED", ["baby yellow first day", "jaundice first 24 hours", "baby peela pehle din"]),
  S("b_cord", "Spreading redness or pus at cord", "baby", "RED", ["cord pus", "cord red", "naal mein pus", "navel red"]),
  // ---------- Baby: AMBER / GREEN ----------
  S("b_jaundice", "Yellowish skin or eyes", "baby", "AMBER", ["baby jaundice", "baby peela", "baby yellow"]),
  S("b_vomit", "Baby vomiting repeatedly", "baby", "AMBER", ["baby vomiting", "baby ulti"]),
  S("b_loose", "Loose watery stools", "baby", "AMBER", ["baby loose motions", "baby diarrhoea", "baby patla potty"]),
  S("b_rash", "Skin rash", "baby", "AMBER", ["baby rash", "baby daane", "diaper rash"]),
  S("b_hiccups", "Hiccups or sneezing", "baby", "GREEN", ["baby hiccups", "baby sneezing", "baby hichki", "baby chheenk"], "Hiccups and sneezing are normal in newborns and settle by themselves."),
  S("b_cry", "Fussy crying in the evening", "baby", "GREEN", ["baby crying evening", "baby fussy", "baby rota hai", "baby colic"], "Evening fussiness is common. Hold, swaddle, burp and feed. If crying is non-stop with fever or not feeding, use the checker again."),
];

// Postpartum psychosis warning signs - handled as its own path, never judged by software.
export const PSYCHOSIS_SIGNS = [
  "Confusion or seeming 'not herself'",
  "Seeing or hearing things others don't",
  "Believing the baby is in danger or 'not hers'",
  "Not sleeping for days without feeling tired",
];

// Hindi (Devanagari) keywords so mothers can type in Hindi script too
const DEVA: Record<string, string[]> = {
  heavy_bleeding: ["बहुत खून", "ज्यादा खून", "ज़्यादा खून"], clots: ["खून के थक्के"], fits: ["दौरा", "झटके"], fainting: ["बेहोश", "चक्कर"],
  headache_vision: ["सिर दर्द धुंधला", "सिरदर्द धुंधला दिख रहा"], chest_pain: ["सीने में दर्द"], breathless: ["सांस फूल", "सांस लेने में तकलीफ"],
  fever_chills: ["बुखार ठंड", "बुखार कंपकंपी"], foul_discharge: ["बदबूदार स्राव", "बदबू"], calf_swelling: ["पिंडली में सूजन", "पिंडली में दर्द"],
  self_harm: ["खुद को नुकसान", "मरना चाहती", "जीना नहीं"], high_bp: ["बीपी ज्यादा", "बीपी बढ़ा"], fever: ["बुखार"],
  breast_red: ["स्तन में दर्द", "स्तन लाल"], urine_burn: ["पेशाब में जलन"], wound_infection: ["टांके में दर्द", "टांके लाल", "घाव में मवाद"],
  low_mood: ["उदास", "रोना आ रहा"], anxiety: ["घबराहट", "चिंता"], no_sleep: ["नींद नहीं आ रही"], cant_eat: ["भूख नहीं", "खाना नहीं खा"],
  severe_pain: ["बहुत दर्द बढ़ रहा"], leaking_urine: ["पेशाब निकल जाता"], breast_engorged: ["स्तन सख्त", "दूध रुका"],
  afterpains: ["पेट में हल्का दर्द", "ऐंठन"], light_bleeding: ["हल्का खून"], tired: ["थकान", "थकी हुई", "कमजोरी"], tearful: ["थोड़ा रोना", "मूड बदलना"],
  back_pain: ["कमर दर्द", "बदन दर्द"], constipation: ["कब्ज"], sore_nipples: ["निप्पल में दर्द"], hair_fall: ["बाल झड़"], night_sweats: ["रात को पसीना"],
  b_not_feeding: ["बच्चा दूध नहीं", "बच्चा दूध नहीं पी रहा"], b_convulsion: ["बच्चे को दौरा"], b_fast_breathing: ["बच्चे की सांस तेज"],
  b_temp: ["बच्चे को तेज बुखार"], b_drowsy: ["बच्चा उठ नहीं रहा"], b_jaundice: ["बच्चा पीला"], b_vomit: ["बच्चे को उल्टी"],
  b_loose: ["बच्चे को पतले दस्त"], b_rash: ["बच्चे को दाने"], b_hiccups: ["बच्चे को हिचकी"], b_cry: ["बच्चा बहुत रो रहा"],
};
SYMPTOMS.forEach((s) => s.keywords.push(...(DEVA[s.id] ?? [])));

// Expanded list, follow-ups and combos live in their own file (clinician-editable data in production).
SYMPTOMS.push(...EXTRA);
SYMPTOMS.forEach((s) => { s.area ??= AREA_OF[s.id]; s.keywords.push(...(EXTRA_KEYWORDS[s.id] ?? [])); });

// Make every new label, tip, question and area name translatable (existing translations win).
const reg = (en: string, hi: string | undefined) => { if (hi && HI[en] === undefined) HI[en] = hi; };
SYMPTOMS.forEach((s) => { reg(s.label, s.hi); if (s.tip) reg(s.tip, s.tipHi); });
Object.values(AREA_LABELS).forEach((a) => reg(a.en, a.hi));
Object.values(FOLLOWUPS).flat().forEach((f) => { reg(f.q, f.hi); f.options.forEach((o) => reg(o.label, o.hi)); });
COMBOS.forEach((c) => reg(c.why, c.hi));

const BY_ID = new Map(SYMPTOMS.map((s) => [s.id, s]));
export const bySymptomId = (id: string) => BY_ID.get(id)!;
