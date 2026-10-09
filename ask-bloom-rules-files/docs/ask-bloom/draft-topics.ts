// DRAFT topics for Ask Bloom, written to close gaps found in testing ("when will my periods come back", "baby has a cold",
// "what is PMMVY", feeling unsafe at home). NOT used by the app until a clinician signs them off.
// To publish one: copy it into TOPICS in lib/ask/knowledge.ts, add its words to KEYWORDS (lib/ask/keywords.ts)
// and its browse data to META (lib/ask/browse.ts), set `reviewed`, then run `npm test`.
import type { Topic } from "../../lib/ask/knowledge";

export const DRAFT_TOPICS: Topic[] = [
  { id: "periods_return", who: "mother", title: "When will my periods come back?", hi_title: "माहवारी (पीरियड) कब वापस आएगी?",
    asks: ["when will my periods come back", "periods not started after delivery", "irregular periods after baby", "no periods while breastfeeding is it normal", "first period after birth heavy", "delivery ke baad period kab aayega", "mahvari kab shuru hogi", "माहवारी कब शुरू होगी"],
    answer: "If you are not breastfeeding, periods often come back within about 6 to 8 weeks. If you breastfeed often, they can stay away for several months, and the first few periods may be irregular or heavier than before. You can become pregnant before your first period returns, so talk to your doctor or ANM about family planning.",
    hi_answer: "अगर आप स्तनपान नहीं करा रहीं, तो माहवारी अक्सर 6 से 8 हफ़्तों में लौट आती है। अगर आप बार-बार दूध पिलाती हैं, तो यह कई महीनों तक नहीं भी आ सकती, और शुरू की कुछ माहवारी अनियमित या पहले से ज़्यादा हो सकती है। पहली माहवारी से पहले भी आप गर्भवती हो सकती हैं, इसलिए परिवार नियोजन के बारे में अपने डॉक्टर या ANM से बात करें।",
    watch: "See a doctor if you soak a pad in an hour, pass large clots, bleed for more than 7 days in a row, or bleeding comes with fever or a bad smell.",
    hi_watch: "अगर एक घंटे में पैड भीग जाए, बड़े थक्के आएँ, लगातार 7 दिन से ज़्यादा खून आए, या खून के साथ बुखार या बदबू हो, तो डॉक्टर को दिखाएँ।",
    link: { href: "/ask", label: "Ask about family planning" }, source: "Draft from WHO postnatal care guidance (2022)" },

  { id: "b_cold", who: "baby", title: "Blocked nose, cough or cold in a baby", hi_title: "बच्चे को सर्दी, खांसी या बंद नाक",
    asks: ["baby has a blocked nose", "baby cough and cold", "newborn sneezing a lot", "baby runny nose", "bachche ko sardi khansi", "baby ki naak band hai", "बच्चे को जुकाम", "baby breathing noisy at night"],
    answer: "Babies often sound snuffly because their noses are very small. Keep feeding often, because milk keeps your baby well hydrated. Hold your baby a little upright during feeds and keep the room airy but not cold. Do not give any cough or cold medicine, drops or home remedy unless a doctor tells you to.",
    hi_answer: "बच्चों की नाक बहुत छोटी होती है, इसलिए अक्सर साँस में घरघराहट सुनाई देती है। बार-बार दूध पिलाते रहें, इससे बच्चे के शरीर में पानी की कमी नहीं होती। दूध पिलाते समय बच्चे को थोड़ा सीधा पकड़ें और कमरा हवादार रखें, पर ठंडा नहीं। डॉक्टर के कहे बिना कोई खांसी-जुकाम की दवा, ड्रॉप या घरेलू नुस्खा न दें।",
    watch: "Go to a doctor now if your baby breathes fast, the chest pulls in with each breath, the lips look blue, your baby is not feeding or is unusually sleepy, or a baby under 2 months has a fever.",
    hi_watch: "अगर बच्चा तेज़ साँस ले, हर साँस पर छाती अंदर धँसे, होंठ नीले दिखें, बच्चा दूध न पिए या असामान्य रूप से सुस्त हो, या 2 महीने से छोटे बच्चे को बुखार हो, तो अभी डॉक्टर के पास जाएँ।",
    source: "Draft from IMNCI danger signs (Ministry of Health and Family Welfare)" },

  { id: "pmmvy", who: "mother", title: "PMMVY: the maternity cash benefit", hi_title: "PMMVY: मातृत्व नकद लाभ",
    asks: ["what is pmmvy", "how to apply for pmmvy", "matru vandana yojana", "maternity benefit scheme money", "government money for pregnant women", "pmmvy ka paisa kab aayega", "anganwadi registration benefit", "प्रधानमंत्री मातृ वंदना योजना"],
    answer: "Pradhan Mantri Matru Vandana Yojana (PMMVY) is a government cash benefit for mothers, paid into the mother's own bank account. Under the current rules it covers the first child, and also a second child if she is a girl. Your Anganwadi worker or ANM can register you and tell you which documents to bring; usually your Aadhaar, bank account details and the Mother and Child Protection card. Rules can change, so confirm with them.",
    hi_answer: "प्रधानमंत्री मातृ वंदना योजना (PMMVY) माताओं के लिए सरकारी नकद लाभ है, जो माँ के अपने बैंक खाते में आता है। मौजूदा नियमों में यह पहले बच्चे के लिए है, और दूसरा बच्चा लड़की हो तो उसके लिए भी। आपकी आंगनवाड़ी कार्यकर्ता या ANM आपका पंजीकरण कर सकती हैं और बताएँगी कि कौन-से कागज़ लाने हैं; आमतौर पर आधार, बैंक खाते की जानकारी और माँ-बच्चा सुरक्षा कार्ड। नियम बदल सकते हैं, इसलिए उनसे पक्का कर लें।",
    link: { href: "/baby", label: "Open the benefits checklist" }, source: "Draft from Ministry of Women and Child Development (PMMVY)" },

  { id: "unsafe_home", who: "mother", title: "I do not feel safe at home", hi_title: "मुझे घर पर सुरक्षित महसूस नहीं होता",
    asks: ["I do not feel safe at home", "my husband hits me", "someone at home hurts me", "in laws threaten me", "ghar par maarpeet hoti hai", "mujhe ghar mein darr lagta hai", "पति मारता है", "where can I get help for violence at home"],
    answer: "If someone at home hurts you, threatens you or controls you, it is not your fault and you do not have to face it alone. The Women Helpline 181 is free and works day and night. If you are in danger right now, call 112. You can also tell your doctor, ANM or ASHA worker; they can help you find support.",
    hi_answer: "अगर घर पर कोई आपको चोट पहुँचाता है, धमकाता है या आप पर नियंत्रण रखता है, तो यह आपकी गलती नहीं है और आपको अकेले इसका सामना नहीं करना है। महिला हेल्पलाइन 181 मुफ़्त है और दिन-रात चलती है। अगर आप अभी ख़तरे में हैं, तो 112 पर कॉल करें। आप अपने डॉक्टर, ANM या आशा कार्यकर्ता को भी बता सकती हैं; वे मदद दिलाने में साथ देंगी।",
    call: [{ label: "Women Helpline", hi_label: "महिला हेल्पलाइन", number: "181" }, { label: "Emergency", hi_label: "आपातकाल", number: "112" }],
    source: "Draft; helpline numbers to be confirmed before launch" },
];

// Matching words and browse data for the drafts, ready to paste into keywords.ts and browse.ts.
export const DRAFT_KEYWORDS: Record<string, string[]> = {
  periods_return: ["period", "periods", "menses", "mahvari", "irregular", "first period", "cycle", "mc"],
  b_cold: ["cough", "cold", "blocked nose", "runny nose", "sneeze", "khansi", "sardi", "zukam", "naak"],
  pmmvy: ["pmmvy", "matru vandana", "maternity benefit", "scheme", "yojana", "cash", "anganwadi", "registration", "paisa"],
  unsafe_home: ["unsafe", "hit", "beat", "hurt", "violence", "abuse", "threaten", "maarpeet", "darr", "dhamki"],
};
