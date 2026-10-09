// Ask Bloom text rules. Plain rules only: no AI, no network. Runs the same way on the phone and in tests.
// Every phrase in the answer library AND every question she types go through the SAME steps, so spelling
// differences (doodh/dudh, neend/nind, bachcha/bacha) and languages (milk/doodh/दूध) land on the same token.

/** Words that mean the same thing in English, Hinglish and Hindi. The first word is only a label. */
export const CONCEPTS: Record<string, string[]> = {
  baby: ["baby", "babies", "newborn", "infant", "bachcha", "baccha", "bachche", "bachi", "bachchi", "munna", "munni", "nawjaat", "navjaat", "shishu", "बच्चा", "बच्चे", "बच्ची", "नवजात", "शिशु"],
  milk: ["milk", "doodh", "dudh", "दूध"],
  breast: ["breast", "stan", "chhati", "chaati", "स्तन", "छाती"],
  feed: ["feed", "breastfeed", "nursing", "drink", "pila", "pilao", "pilate", "pilana", "pilaun", "pilayein", "pilaye", "peeta", "peeti", "पिलाना", "पिलाएं", "पिलाऊं"],
  stitch: ["stitch", "suture", "tanka", "tanke", "taanke", "tanko", "tankon", "टांके", "टांका", "टांकों"],
  wound: ["wound", "ghav", "ghaav", "zakhm", "घाव", "scar"],
  csection: ["csection", "cesarean", "caesarean", "sezarian", "sizerian", "operation", "ऑपरेशन", "सिजेरियन"],
  bleed: ["bleed", "blood", "khoon", "khun", "lochia", "खून", "रक्तस्राव"],
  pain: ["pain", "ache", "hurt", "dard", "peeda", "takleef", "दर्द", "पीड़ा", "तकलीफ"],
  stomach: ["stomach", "belly", "tummy", "abdomen", "pet", "पेट"],
  sleep: ["sleep", "insomnia", "neend", "nind", "sona", "sote", "soti", "सोना", "नींद", "सोता"],
  cry: ["cry", "crying", "rona", "rota", "roti", "rone", "रोना", "रोता", "रोती"],
  fever: ["fever", "temperature", "bukhar", "taap", "बुखार"],
  yellow: ["yellow", "jaundice", "peela", "peeli", "piliya", "पीला", "पीलिया"],
  vaccine: ["vaccine", "vaccination", "immunisation", "immunization", "teeka", "teeke", "teekakaran", "टीका", "टीके", "टीकाकरण"],
  food: ["food", "eat", "diet", "khana", "khaana", "khaun", "khayen", "aahar", "खाना", "आहार"],
  hair: ["hair", "baal", "बाल"],
  sad: ["sad", "low", "udaas", "depressed", "depression", "उदास", "दुखी"],
  wife: ["wife", "biwi", "patni", "bahu", "पत्नी", "बहू"],
  help: ["help", "support", "madad", "sahayata", "मदद"],
  exercise: ["exercise", "workout", "yoga", "vyayam", "व्यायाम", "kasrat"],
  stool: ["stool", "poop", "poo", "potty", "latrine", "motion", "मल", "पॉटी"],
  constipation: ["constipation", "kabz", "qabz", "कब्ज"],
  piles: ["piles", "hemorrhoid", "haemorrhoid", "bawasir", "बवासीर"],
  cord: ["cord", "navel", "naal", "nabhi", "bellybutton", "नाल", "नाभि"],
  vomit: ["vomit", "ulti", "spit", "उल्टी"],
  sex: ["sex", "intimacy", "sambandh", "संबंध"],
  pregnant: ["pregnant", "pregnancy", "conceive", "garbh", "गर्भ"],
  checkup: ["checkup", "visit", "jaanch", "janch", "जांच"],
  honey: ["honey", "shahad", "shehad", "शहद"],
  water: ["water", "paani", "pani", "पानी"],
  nipple: ["nipple", "nipples", "निप्पल"],
  tired: ["tired", "exhausted", "exhaustion", "fatigue", "thakan", "thaki", "thaka", "थकान", "थकी"],
  cramp: ["cramp", "afterpain", "ainthan", "marod", "maroda", "ऐंठन", "मरोड़"],
  hard: ["hard", "swollen", "engorged", "sakht", "kada", "sujan", "सूजन", "सख्त"],
  hold: ["hold", "carry", "god", "uthana", "गोद"],
  calm: ["calm", "soothe", "settle", "chup", "shant", "चुप", "शांत"],
  hour: ["hour", "ghanta", "ghante", "घंटा", "घंटे"],
  week: ["week", "hafta", "hafte", "saptah", "हफ्ता", "हफ्ते"],
  day: ["day", "din", "दिन", "daily"],
  month: ["month", "mahina", "mahine", "महीना", "महीने"],
  period: ["period", "menses", "mahvari", "mc", "माहवारी", "पीरियड"],
  injection: ["injection", "shot", "sui", "सुई", "इंजेक्शन"],
  bath: ["bath", "bathe", "nahana", "nahane", "नहाना"],
  clean: ["clean", "wash", "saaf", "dhona", "साफ"],
  home: ["home", "ghar", "घर"],
  delivery: ["delivery", "birth", "childbirth", "postpartum", "prasav", "prasuti", "डिलीवरी", "प्रसव", "प्रसूति"],
  sit: ["sit", "sitting", "baithna", "baithne", "बैठना", "बैठने"],
  bond: ["bond", "bonding", "connected", "connection", "attached", "lagav", "जुड़ाव", "लगाव"],
  eye: ["eye", "aankh", "aankhen", "आंख", "आंखें"],
  heal: ["heal", "dry", "sukhna", "sukhenge", "bharna", "theek", "ठीक"],
};

/** Phrases joined into one word before splitting, so "c section" and "belly button" stay together. */
const JOIN: [RegExp, string][] = [
  [/\bc[\s-]?section\b|\bc[\s-]?sec\b/g, "csection"],
  [/\bbelly button\b/g, "bellybutton"],
  [/\bcheck[\s-]up\b/g, "checkup"],
  [/\bmother in law\b|\bsaas\b|\bसास\b/g, "motherinlaw"],
  [/\bjanam ghutti\b|\bghutti\b/g, "ghutti"],
  [/\bthrow(s|ing)? up\b|\bthrew up\b/g, "vomit"],
  [/\bfall(ing)? asleep\b|\basleep\b/g, "sleep"],
  [/\bscream(s|ing)?\b|\bwail(s|ing)?\b/g, "cry"],
  [/\bbreast ?milk\b/g, "milk"],
  [/\bgym\b|\bworking out\b/g, "exercise"],
  [/\bdown there\b|\bvagina\b|\bperineum\b/g, "perineum"],
  [/\bwarm\b|\bgaram\b/g, "fever"],
  [/\bbring(s|ing)? up\b|\bbrought up\b/g, "vomit"],
];

export const STOP = new Set([
  "a", "an", "the", "is", "are", "am", "was", "be", "i", "my", "me", "do", "does", "did", "can", "could", "to", "of", "in", "on", "at", "and", "or", "for", "it", "its", "this", "that",
  "how", "what", "when", "why", "which", "should", "will", "would", "after", "with", "so", "very", "much", "many", "some", "any", "there", "get", "has", "have", "she", "her", "he", "his",
  "you", "your", "we", "our", "they", "about", "please", "ok", "okay", "normal", "lot", "too", "just", "still", "also", "not", "no", "yes", "if", "from", "by", "as", "up",
  "hai", "hain", "ho", "hota", "hoti", "hote", "mein", "ka", "ki", "ke", "ko", "se", "kya", "kaise", "kab", "kitna", "kitne", "kitni", "main", "mera", "meri", "mere", "mujhe",
  "hoon", "hun", "kar", "karu", "karein", "karna", "baad", "aur", "bhi", "nahi", "nahin", "na", "toh", "to", "ye", "yeh", "wo", "woh", "raha", "rahi", "rahe", "bahut", "zyada", "thoda", "kuch", "sakti", "sakta", "chahiye",
  "rehta", "rehti", "rehte", "gaya", "gaye", "gayi", "aata", "aati", "aate", "lagta", "lagti", "lag", "hua", "hui", "hue", "karne", "karte", "karti", "kiya", "ki", "de", "do", "le", "lo", "par", "pe", "har", "every", "again", "time", "times", "old", "know", "want", "feel", "feels", "feeling", "look", "looks", "seem", "seems", "keep", "keeps", "like", "since", "while", "during", "really", "always", "still", "ever", "tell", "need",
  "vajah", "wajah", "liye", "saath", "sath", "waqt", "samay", "baar", "wala", "wali", "vala", "vali",
  "aa", "aana", "aaya", "aayi", "aaye", "aayega", "aayegi", "aayenge", "aayengi", "jaana", "jaaye", "jaye", "sake", "sakte", "sakti", "dena", "dete", "deti", "lena", "lete", "leti",
  "हर", "समय", "आता", "आती", "आते", "आना", "रहे", "जाता", "जाती", "होता", "होती", "होते", "गया", "गई", "गए", "कर", "पर", "तो", "ये", "यह", "वो", "वह", "लिए", "साथ", "कोई", "कुछ", "कितने", "कितनी", "कितना",
  "है", "हैं", "में", "का", "की", "के", "को", "से", "क्या", "कैसे", "कब", "मैं", "मेरा", "मेरी", "मेरे", "मुझे", "और", "भी", "नहीं", "बहुत", "हो", "रहा", "रही", "बाद", "करें", "चाहिए",
]);

const DEVANAGARI = /[ऀ-ॿ]/;

/** Hindi typed in English letters is spelt many ways. Fold the common variations to one spelling. */
export function foldLatin(w: string) {
  return w
    .replace(/chch/g, "ch").replace(/chh/g, "ch").replace(/ph/g, "f").replace(/sh/g, "s").replace(/w/g, "v").replace(/z/g, "j").replace(/q/g, "k").replace(/ck/g, "k")
    .replace(/ee/g, "i").replace(/oo/g, "u").replace(/ou/g, "u")
    .replace(/(.)\1+/g, "$1");          // doubled letters: bachcha -> bacha, doodh -> dudh (after oo -> u)
}

/** Very light English stemming: feeding -> feed, stitches -> stitch, babies -> baby. */
export function stem(w: string) {
  if (w.length <= 4) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ches") || w.endsWith("shes") || w.endsWith("xes")) return w.slice(0, -2);
  if (w.endsWith("ed") && !w.endsWith("eed") && w.length > 5) return w.slice(0, -2); // swollen/cracked, but not feed/bleed
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1);
  return w;
}

/** Hindi in Devanagari: drop the nukta, treat chandrabindu like anusvara (ज़/ज, माँ/मां), and drop a final vowel sign
 *  so masculine, feminine and plural forms meet (पीला/पीली/पीले, आंख/आंखें). */
const foldDeva = (w: string) => {
  const x = w.normalize("NFD").replace(/\u093C/g, "").normalize("NFC").replace(/\u0901/g, "\u0902");
  const cut = x.replace(/[\u093E-\u094C]\u0902?$/, "");
  return cut.length >= 2 ? cut : x;
};

const baseWord = (w: string) => (DEVANAGARI.test(w) ? foldDeva(w) : foldLatin(stem(w)));

// Build the lookups once. Exact spellings win first; folded spellings are used only when they are not ambiguous.
// Example: "peela" (yellow) and "pila" (made to drink) fold to the same letters, so only their exact spellings count.
const CONCEPT_RAW = new Map<string, string>();
const CONCEPT_FOLDED = new Map<string, string>();
const CLASH = new Set<string>();
for (const [label, list] of Object.entries(CONCEPTS)) for (const raw of list) {
  const r = raw.toLowerCase(), f = baseWord(r);
  CONCEPT_RAW.set(r, "#" + label);
  const had = CONCEPT_FOLDED.get(f);
  if (had && had !== "#" + label) CLASH.add(f); else CONCEPT_FOLDED.set(f, "#" + label);
}
for (const f of CLASH) CONCEPT_FOLDED.delete(f);
const STOP_FOLDED = new Set([...STOP].map((w) => baseWord(w)));
const CONCEPT_SPELLINGS = [...CONCEPT_FOLDED].filter(([f]) => f.length >= 5);

/** Last try for a concept: "constipated" -> constipation, "stiches" -> stitch. Strict on purpose:
 *  a long shared start (at least 5 letters and 3/4 of the shorter word) or exactly one typo. */
const sharedStart = (a: string, b: string) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
function nearConcept(b: string) {
  if (b.length < 5) return undefined;
  const close = (f: string) => {
    const n = Math.min(b.length, f.length);
    return sharedStart(b, f) >= Math.max(5, Math.ceil(0.75 * n)) || (Math.abs(b.length - f.length) <= 1 && editDistance(b, f, 1) <= 1);
  };
  const hits = new Set(CONCEPT_SPELLINGS.filter(([f]) => close(f)).map(([, c]) => c));
  return hits.size === 1 ? [...hits][0] : undefined;   // only if it points to exactly one concept
}

export function normalise(s: string) {
  let t = s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").trim();
  for (const [re, to] of JOIN) t = t.replace(re, to);
  return t;
}

/** The tokens matching works on. Concepts come out as "#milk", other words as their folded spelling. */
export function tokens(s: string): string[] {
  const out: string[] = [];
  for (const raw of normalise(s).split(" ")) {
    if (!raw || STOP.has(raw) || /^\d+$/.test(raw)) continue; // plain numbers do not help choose a topic
    const b = baseWord(raw);
    if (!b || STOP_FOLDED.has(b)) continue;
    const c = CONCEPT_RAW.get(raw) ?? CONCEPT_FOLDED.get(b) ?? nearConcept(b) ?? b;
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

/** Two words match if equal, if one starts the other (min 4 letters), or if a long word has one wrong letter. Concepts match only exactly. */
export function same(a: string, b: string) {
  if (a === b) return true;
  if (a[0] === "#" || b[0] === "#") return false;
  const n = Math.min(a.length, b.length);
  if (n >= 4 && (a.startsWith(b.slice(0, Math.max(4, n - 2))) || b.startsWith(a.slice(0, Math.max(4, n - 2))))) return true;
  if (n >= 6 && Math.abs(a.length - b.length) <= 1) return editDistance(a, b, 1) <= 1; // long words: one missing, extra or wrong letter
  return false;
}

/** Levenshtein distance, stopping early once it goes past max. */
export function editDistance(a: string, b: string, max = 2) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Who is the question about? "me" if she talks about herself, "baby" if about the baby, "both" or null. Used only to ask a clarifying question. */
const SELF = /(^|\s)(i|i'm|im|me|myself|main|mai|mujhe|mujhko|मैं|मुझे|मुझको)(\s|$)/;
export function subject(text: string): "me" | "baby" | "both" | null {
  const t = " " + normalise(text) + " ";
  const me = SELF.test(t), baby = tokens(text).includes("#baby");
  return me && baby ? "both" : me ? "me" : baby ? "baby" : null;
}
