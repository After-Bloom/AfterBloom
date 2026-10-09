// Topic words for each answer: the vocabulary a mother might use, in any language. Used for matching only.
// Rule of thumb: 6 to 15 words per topic, the words that make THIS topic different from the others.
export const KEYWORDS: Record<string, string[]> = {
  lochia: ["bleeding", "blood", "pad", "discharge", "weeks", "clots", "khoon", "lochia", "ब्लीडिंग", "स्राव"],
  afterpains: ["cramp", "cramps", "afterpains", "uterus", "womb", "stomach pain", "ainthan", "marod", "पेट दर्द"],
  csection_wound: ["csection", "caesarean", "scar", "wound", "stitches", "operation", "incision", "bath", "clean", "heal", "tanke", "ghav"],
  stitches: ["stitches", "episiotomy", "tear", "perineum", "sitting", "normal delivery", "tanke", "heal", "टांके"],
  blues_vs_ppd: ["crying", "sad", "low", "blues", "depression", "anxious", "worry", "mood", "udaas", "rona", "उदास", "bonding"],
  sleep: ["sleep", "insomnia", "tired", "awake", "night", "rest", "neend", "नींद"],
  diet: ["eat", "food", "diet", "ghee", "laddoo", "fruits", "iron", "nutrition", "khana", "आहार", "panjiri"],
  exercise: ["exercise", "walk", "walking", "yoga", "workout", "lift", "weight", "gym", "pelvic", "vyayam"],
  intimacy: ["sex", "intimacy", "contraception", "family planning", "pregnant", "condom", "copper", "spacing", "sambandh"],
  constipation: ["constipation", "piles", "stool", "hard stool", "kabz", "bawasir", "fiber", "potty pain"],
  hair: ["hair", "hair fall", "hair loss", "baal", "jhadna", "गिरना"],
  engorgement: ["breast", "hard", "swollen", "lump", "engorged", "mastitis", "heavy breast", "stan", "sakht"],
  nipples: ["nipple", "cracked", "sore", "latch", "bleeding nipple", "painful feeding", "निप्पल"],
  low_milk: ["milk", "supply", "enough", "less milk", "hungry", "increase milk", "doodh", "utar", "weight gain"],
  checkups: ["checkup", "visit", "asha", "anm", "hbnc", "follow up", "doctor visit", "6 week", "jaanch"],
  b_feeds: ["feed", "feeding", "how often", "hour", "every", "schedule", "cluster", "breastfeed", "drink", "doodh pilana"],
  b_only_milk: ["honey", "water", "ghutti", "gripe water", "solids", "formula", "janam ghutti", "shahad", "paani", "cow milk"],
  b_stool: ["poop", "stool", "potty", "green", "black", "loose", "motions", "day", "colour"],
  b_jaundice: ["yellow", "jaundice", "eyes", "skin", "piliya", "sunlight", "peela"],
  b_cord: ["cord", "navel", "stump", "belly button", "naal", "nabhi", "smell", "fall off"],
  b_sleep: ["sleep", "night", "awake", "bed", "safe sleep", "back", "stomach", "co-sleeping", "jagta"],
  b_cry: ["cry", "crying", "colic", "calm", "soothe", "evening", "chup", "rota"],
  b_fever: ["fever", "temperature", "hot", "warm", "thermometer", "bukhar", "garam"],
  b_spit: ["spit", "vomit", "hiccups", "burp", "ulti", "hichki", "reflux"],
  b_vaccines: ["vaccine", "vaccination", "injection", "teeka", "bcg", "polio", "schedule", "week"],
  f_help: ["help", "support", "husband", "wife", "family", "night feed", "chores", "madad"],
  f_ppd: ["wife", "bahu", "sad", "depression", "crying", "not eating", "hold baby", "udaas", "withdrawn"],
};

/** Words that mean "this is NOT the topic": they halve its score. Use sparingly, only for a known look-alike. */
export const NOT: Record<string, string[]> = {
  b_fever: ["cough", "khansi", "runny nose", "naak", "खांसी"],
  hair: ["dye", "colour", "color", "mehendi", "henna"],
};
