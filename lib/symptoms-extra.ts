// Expanded symptom list, follow-up questions and combination rules.
// DRAFT: every level, question and tip here is pending sign-off by the team's clinical advisor
// (sources to check against: WHO postpartum and newborn care guidance, NHM/HBNC, IMNCI danger signs).
// In production this lives in the database so a clinician can edit it without a deploy.
// Rules of the road: follow-ups can only RAISE a level, never lower it. Wording is prewritten; software only picks.
import type { Level, Symptom } from "./symptoms";
import type { CrisisKind } from "./triage";

type Who = "mother" | "baby";
const mk = (who: Who) => (id: string, label: string, hi: string, level: Level, area: string, keywords: string[], tip?: string, tipHi?: string): Symptom =>
  ({ id, label, hi, who, level, area, keywords, tip, tipHi });
const M = mk("mother");
const B = mk("baby");

export const EXTRA: Symptom[] = [
  // ---------- Mother: RED ----------
  M("severe_belly_pain", "Severe or worsening belly pain", "पेट में बहुत तेज़ या बढ़ता दर्द", "RED", "womb", ["severe abdominal pain", "severe belly pain", "stomach pain unbearable", "pet mein bahut tez dard", "pet dard bardasht nahi", "पेट में बहुत तेज दर्द"]),
  M("vision_flash", "Blurred vision or flashing lights", "धुंधला दिखना या आँखों के आगे चमक", "RED", "head", ["blurred vision", "flashing lights", "seeing spots", "vision problem", "dhundhla dikhna", "aankhon ke aage chamak", "आँखों के आगे अंधेरा"]),
  M("cough_blood", "Coughing up blood", "खून की खाँसी", "RED", "chest", ["coughing blood", "blood in cough", "khaansi mein khoon", "खांसी में खून"]),
  M("passing_tissue", "Passing tissue or lumps with bleeding", "खून के साथ माँस जैसे टुकड़े", "RED", "womb", ["passing tissue", "tissue with bleeding", "lumps of tissue", "maas ke tukde"]),
  // ---------- Mother: AMBER ----------
  M("headache", "Headache", "सिरदर्द", "AMBER", "head", ["headache", "head pain", "migraine", "sar dard", "sirdard", "सिर दर्द"]),
  M("spinal_headache", "Headache that is worse when sitting or standing", "बैठने या खड़े होने पर बढ़ने वाला सिरदर्द", "AMBER", "head", ["headache worse sitting up", "headache after spinal", "headache after epidural", "sar dard baithne par badhta", "बैठने पर सिर दर्द"]),
  M("swelling_face_hands", "Sudden swelling of face or hands", "चेहरे या हाथों में अचानक सूजन", "AMBER", "head", ["face swelling", "swollen face", "hands swollen", "sudden swelling", "chehre pe sujan", "haath mein sujan", "चेहरे पर सूजन"]),
  M("upper_belly_pain", "Pain in the upper belly under the ribs", "पसलियों के नीचे ऊपरी पेट में दर्द", "AMBER", "womb", ["upper abdominal pain", "pain under ribs", "pain right side under ribs", "pet ke upar dard", "pasliyon ke neeche dard"]),
  M("palpitations", "Racing or pounding heartbeat", "तेज़ धड़कन", "AMBER", "chest", ["racing heart", "palpitations", "heart beating fast", "dhadkan tez", "dil ghabrana", "धड़कन तेज"]),
  M("bp_raised", "Raised blood pressure reading", "बढ़ा हुआ ब्लड प्रेशर रीडिंग", "AMBER", "head", ["blood pressure raised", "bp slightly high", "bp thoda zyada", "बीपी थोड़ा बढ़ा"]),
  M("dizzy", "Dizzy or faint when standing", "खड़े होने पर चक्कर", "AMBER", "body", ["dizzy", "dizziness", "lightheaded", "chakkar aa raha", "chakkar", "चक्कर आना"]),
  M("pale_weak", "Looking very pale and weak", "बहुत पीला और कमज़ोर दिखना", "AMBER", "body", ["very pale", "looks pale", "anaemia", "khoon ki kami", "peela pad gaya", "बहुत कमज़ोरी और पीलापन"]),
  M("urine_blood", "Blood in urine", "पेशाब में खून", "AMBER", "urine", ["blood in urine", "urine mein khoon", "peshab mein khoon", "पेशाब में खून"]),
  M("cannot_urinate", "Cannot pass urine", "पेशाब नहीं हो पा रहा", "AMBER", "urine", ["cannot pass urine", "unable to urinate", "urine retention", "peshab nahi ho raha", "पेशाब नहीं आ रहा"]),
  M("stool_control", "Cannot control stool or gas", "मल या गैस पर नियंत्रण नहीं", "AMBER", "urine", ["cannot control stool", "stool leaking", "potty control nahi", "motion control nahi"]),
  M("wound_open", "Wound or stitches have opened", "टाँके या घाव खुल गए", "AMBER", "wound", ["stitches opened", "wound opened", "wound gaping", "tanke khul gaye", "ghav khul gaya", "टांके खुल गए"]),
  M("lochia_smell", "Smelly vaginal discharge", "योनि स्राव से बदबू", "AMBER", "womb", ["smelly discharge", "discharge smells", "bad smell bleeding", "badbu wala discharge", "बदबू वाला स्राव"]),
  M("fresh_bleeding", "Fresh red bleeding after it had stopped", "रुकने के बाद फिर ताज़ा लाल खून", "AMBER", "womb", ["bleeding started again", "fresh red bleeding", "bleeding came back", "khoon phir se shuru", "फिर से खून आना"]),
  M("breast_lump", "A lump in the breast", "स्तन में गाँठ", "AMBER", "breast", ["breast lump", "lump in breast", "stan mein gaanth", "स्तन में गांठ"]),
  M("breast_pus", "Pus or blood from the nipple or breast", "स्तन या निप्पल से मवाद या खून", "AMBER", "breast", ["nipple pus", "breast abscess", "pus from breast", "nipple bleeding", "stan se pus", "निप्पल से खून"]),
  M("vomiting_mother", "Vomiting that will not stop", "उल्टी जो रुक नहीं रही", "AMBER", "body", ["vomiting", "cannot stop vomiting", "ulti ho rahi", "ulti nahi ruk rahi", "उल्टी"]),
  M("diarrhoea_mother", "Loose motions for more than a day", "एक दिन से ज़्यादा पतले दस्त", "AMBER", "urine", ["loose motions", "diarrhoea", "patle dast", "dast lag gaye", "दस्त"]),
  M("sleep_too_much", "Sleeping all day or cannot get out of bed", "दिन भर सोना या बिस्तर से उठ न पाना", "AMBER", "mind", ["sleeping all day", "cannot get out of bed", "bed se uth nahi pa rahi", "bahut zyada sona", "बिस्तर से उठ नहीं पा रही"]),
  M("panic", "Panic attacks", "घबराहट के दौरे", "AMBER", "mind", ["panic attack", "panic attacks", "achanak ghabrahat", "घबराहट के दौरे"]),
  M("no_bond", "Not feeling close to the baby", "बच्चे से जुड़ाव महसूस न होना", "AMBER", "mind", ["not bonding with baby", "dont feel close to baby", "baby se lagav nahi", "बच्चे से लगाव नहीं"]),
  M("numb_empty", "Feeling numb, empty or hopeless", "सुन्न, खाली या निराश महसूस करना", "AMBER", "mind", ["feeling numb", "feeling empty", "hopeless", "nirash", "khali khali lag raha", "कुछ महसूस नहीं हो रहा"]),
  M("irritable", "Constant anger or irritability", "हर समय गुस्सा या चिड़चिड़ापन", "AMBER", "mind", ["angry all the time", "irritable", "bahut gussa", "chidchida", "चिड़चिड़ापन"]),
  M("no_interest", "Lost interest in everything", "किसी चीज़ में दिलचस्पी नहीं", "AMBER", "mind", ["lost interest", "nothing feels enjoyable", "mann nahi lag raha", "kisi cheez mein mann nahi", "मन नहीं लगता"]),
  // ---------- Mother: GREEN ----------
  M("small_clots", "Small blood clots", "छोटे खून के थक्के", "GREEN", "womb", ["small clots", "small blood clots", "chhote thakke", "छोटे थक्के"], "Small clots (smaller than a coin) can pass in the first days. Large clots, or soaking a pad in an hour, need hospital care.", "छोटे थक्के (सिक्के से छोटे) शुरू के दिनों में आ सकते हैं। बड़े थक्के या एक घंटे में पैड भीगना हो तो अस्पताल जाएँ।"),
  M("swollen_feet", "Swollen feet or ankles", "पैरों या टखनों में सूजन", "GREEN", "body", ["swollen feet", "swollen ankles", "feet swelling", "pairon mein sujan", "पैरों में सूजन"], "Mild swelling of both feet is common in the first week. Rest with your feet up and drink water.", "पहले हफ़्ते में दोनों पैरों में हल्की सूजन आम है। पैर ऊँचे करके आराम करें और पानी पिएँ।"),
  M("perineal_pain", "Soreness around the stitches (tear or cut)", "टाँकों के आसपास दुखन", "GREEN", "wound", ["perineal pain", "episiotomy pain", "tear pain", "sore stitches", "tanke ke paas dard", "टाँकों के पास दुखन"], "Sit on a soft cushion, rinse with clean warm water after the toilet and pat dry. Ask your doctor about pain relief.", "नरम गद्दी पर बैठें, शौच के बाद साफ़ गुनगुने पानी से धोकर सुखाएँ। दर्द की दवा के लिए डॉक्टर से पूछें।"),
  M("piles", "Painful piles", "बवासीर में दर्द", "GREEN", "urine", ["piles", "hemorrhoids", "bawasir", "buwasir", "बवासीर"], "Eat fibre, drink water and avoid straining. Ask your doctor about a soothing cream.", "रेशेदार खाना खाएँ, पानी पिएँ और ज़ोर न लगाएँ। आराम की क्रीम के लिए डॉक्टर से पूछें।"),
  M("low_milk", "Worry about low milk", "दूध कम होने की चिंता", "GREEN", "breast", ["low milk", "not enough milk", "milk supply low", "doodh kam", "दूध कम"], "Feed often, check the latch and drink water. Most mothers make enough milk. Ask your ANM or a lactation counsellor if the baby is not gaining weight.", "बार-बार दूध पिलाएँ, लैच जाँचें और पानी पिएँ। ज़्यादातर माँओं में काफ़ी दूध बनता है। बच्चे का वज़न न बढ़े तो आशा/एएनएम या लैक्टेशन काउंसलर से पूछें।"),
  M("cracked_nipples", "Cracked nipples", "फटे हुए निप्पल", "GREEN", "breast", ["cracked nipples", "nipple crack", "nipple fat gaya", "निप्पल फटना"], "Check the latch, let a little milk dry on the nipple after feeds, and ask a lactation counsellor for help.", "लैच जाँचें, दूध पिलाने के बाद निप्पल पर थोड़ा दूध सूखने दें, और लैक्टेशन काउंसलर से मदद लें।"),
  M("leaking_milk", "Milk leaking between feeds", "फ़ीड के बीच दूध टपकना", "GREEN", "breast", ["milk leaking", "leaking milk", "doodh nikal raha", "दूध टपकना"], "This is normal while your supply settles. Breast pads help.", "जब तक दूध की मात्रा सेट होती है यह सामान्य है। ब्रेस्ट पैड मदद करते हैं।"),
  M("cold_cough", "Cold or cough", "सर्दी या खाँसी", "GREEN", "body", ["cold and cough", "common cold", "cough", "sardi", "khaansi", "जुकाम", "खांसी"], "Rest, drink warm fluids and wash hands before touching the baby. See a doctor if you get fever or trouble breathing.", "आराम करें, गुनगुने तरल पिएँ और बच्चे को छूने से पहले हाथ धोएँ। बुखार या साँस की दिक्कत हो तो डॉक्टर को दिखाएँ।"),
  M("acidity", "Acidity or heartburn", "एसिडिटी या सीने में जलन", "GREEN", "body", ["acidity", "heartburn", "gas and acidity", "seene mein jalan", "एसिडिटी"], "Eat small meals, avoid very spicy food and do not lie down straight after eating.", "थोड़ा-थोड़ा खाएँ, बहुत तीखा न खाएँ और खाने के तुरंत बाद न लेटें।"),
  M("joint_pain", "Wrist or joint pain", "कलाई या जोड़ों में दर्द", "GREEN", "body", ["wrist pain", "joint pain", "neck and shoulder pain", "jodon mein dard", "kalai mein dard"], "Support your wrists and shoulders while feeding. Gentle stretching helps. See a doctor if it keeps getting worse.", "दूध पिलाते समय कलाई और कंधों को सहारा दें। हल्की स्ट्रेचिंग मदद करती है। बढ़ता रहे तो डॉक्टर को दिखाएँ।"),
  M("skin_itch", "Itchy skin", "त्वचा में खुजली", "GREEN", "skin", ["itching", "itchy skin", "khujli", "खुजली"], "Keep skin moisturised and wear loose cotton. See a doctor if there is a rash that spreads or fever.", "त्वचा को नम रखें और ढीले सूती कपड़े पहनें। दाने फैलें या बुखार हो तो डॉक्टर को दिखाएँ।"),
  M("skin_changes", "Dry skin, pimples or stretch marks", "रूखी त्वचा, मुँहासे या खिंचाव के निशान", "GREEN", "skin", ["dry skin", "pimples", "acne", "stretch marks", "rookhi twacha", "muhase", "खिंचाव के निशान"], "Hormone changes cause these and they settle over months. Moisturise and drink water.", "हार्मोन बदलने से ऐसा होता है और कुछ महीनों में ठीक हो जाता है। मॉइस्चराइज़र लगाएँ और पानी पिएँ।"),
  M("belly_soft", "Belly still soft or bulging", "पेट अभी भी ढीला या उभरा हुआ", "GREEN", "womb", ["belly still big", "soft belly", "diastasis", "pet abhi bhi bahar", "पेट अभी भी बड़ा"], "The belly takes weeks to settle. Ask your doctor before starting exercise.", "पेट को सामान्य होने में हफ़्ते लगते हैं। व्यायाम शुरू करने से पहले डॉक्टर से पूछें।"),
  M("sex_pain", "Pain or dryness during sex", "संबंध के समय दर्द या सूखापन", "GREEN", "womb", ["pain during sex", "vaginal dryness", "sex mein dard", "संबंध में दर्द"], "This is common, especially while breastfeeding. Go slowly, use a water-based lubricant and talk to your doctor if it continues.", "यह आम है, खासकर स्तनपान के दौरान। धीरे चलें, पानी वाला लुब्रिकेंट इस्तेमाल करें और जारी रहे तो डॉक्टर से बात करें।"),
  M("period_back", "Period has returned", "माहवारी वापस आ गई", "GREEN", "womb", ["period returned", "periods started again", "mahwari wapas", "माहवारी शुरू"], "Periods can return at different times, and can be irregular while breastfeeding. Ask your doctor about family planning.", "माहवारी अलग-अलग समय पर लौट सकती है और स्तनपान में अनियमित हो सकती है। परिवार नियोजन के बारे में डॉक्टर से पूछें।"),
  M("lonely", "Feeling lonely or cut off", "अकेलापन या सबसे कटा हुआ महसूस करना", "GREEN", "mind", ["feeling lonely", "feel alone", "no one to talk to", "akela pan", "akeli feel", "अकेलापन"], "You are not alone. Talk to someone you trust, try a Bloom Circle, or call Tele-MANAS (14416) any time.", "आप अकेली नहीं हैं। किसी भरोसेमंद से बात करें, ब्लूम सर्कल आज़माएँ, या कभी भी टेली-मानस (14416) पर कॉल करें।"),
  M("forgetful", "Forgetful or cannot concentrate", "भूलना या ध्यान न लगना", "GREEN", "mind", ["forgetful", "cannot concentrate", "brain fog", "bhoolna", "dhyan nahi lagta", "भूलने की आदत"], "Broken sleep causes this. Write things down, rest when you can and accept help. Tell your care team if it worries you.", "टूटी नींद से ऐसा होता है। बातें लिख लें, जब हो सके आराम करें और मदद लें। चिंता हो तो अपनी केयर टीम को बताएँ।"),

  // ---------- Baby: RED ----------
  B("b_blue", "Blue lips or skin", "होंठ या त्वचा नीली", "RED", "breath", ["baby blue lips", "baby blue skin", "baby neela", "hont neele", "नीले होंठ"]),
  B("b_bulging", "Swollen or bulging soft spot on the head", "सिर का नरम हिस्सा फूला हुआ", "RED", "head", ["bulging soft spot", "bulging fontanelle", "baby ka taalu ubhar", "तालू उभरा"]),
  B("b_green_vomit", "Green vomit or blood in the vomit", "हरी उल्टी या उल्टी में खून", "RED", "tummy", ["green vomit", "bilious vomiting", "baby green ulti", "hari ulti", "baby ki ulti mein khoon"]),
  B("b_weak_cry", "Very weak or high-pitched cry", "बहुत कमज़ोर या तीखी रोने की आवाज़", "RED", "sleep", ["weak cry", "high pitched cry", "baby ka rona kamzor", "baby bahut kamzor roya"]),
  B("b_jaundice_palms", "Yellow palms or soles", "हथेलियाँ या तलवे पीले", "RED", "skin", ["yellow palms", "yellow soles", "jaundice palms", "hatheli peeli", "talwe peele"]),
  B("b_fever", "Baby feels hot or has a fever", "बच्चे को बुखार", "RED", "temp", ["baby has fever", "baby is hot", "baby feels warm", "baby bukhar", "baby garam", "बच्चे को बुखार"]),
  B("b_stiff", "Baby is stiff or floppy", "बच्चा अकड़ा हुआ या ढीला", "RED", "sleep", ["baby stiff", "baby floppy", "baby akda hua", "baby dheela", "baby body stiff"]),
  // ---------- Baby: AMBER ----------
  B("b_no_wet", "No wet nappy for 8 hours", "8 घंटे से गीला डायपर नहीं", "AMBER", "tummy", ["no wet nappy", "no wet diaper", "baby ne peshab nahi kiya", "baby urine nahi", "dry diaper all day"]),
  B("b_sunken", "Sunken soft spot or dry mouth", "धँसा हुआ तालू या सूखा मुँह", "AMBER", "head", ["sunken soft spot", "dry mouth baby", "baby ka taalu dhansa", "baby dehydration"]),
  B("b_blood_stool", "Blood in the stool", "मल में खून", "AMBER", "tummy", ["blood in stool", "baby stool blood", "baby potty mein khoon", "खून वाला मल"]),
  B("b_swollen_belly", "Swollen or hard belly", "फूला या सख्त पेट", "AMBER", "tummy", ["swollen belly", "hard belly", "baby ka pet phoola", "baby pet tight"]),
  B("b_eye_pus", "Pus or sticky discharge from the eyes", "आँखों से चिपचिपा पानी या मवाद", "AMBER", "skin", ["eye discharge", "sticky eyes", "baby eyes sticky", "aankh mein pus", "aankh se pani"]),
  B("b_cold_hands", "Cold hands and feet", "ठंडे हाथ-पैर", "AMBER", "temp", ["cold hands and feet", "baby cold feet", "baby ke haath pair thande"]),
  B("b_weight_low", "Not gaining weight or losing weight", "वज़न नहीं बढ़ रहा या घट रहा", "AMBER", "feeding", ["not gaining weight", "weight loss baby", "baby weight nahi badh raha", "baby ka wazan kam"]),
  B("b_pale_stool", "Pale or white stools", "सफ़ेद या हल्के रंग का मल", "AMBER", "tummy", ["pale stool", "white stool", "clay coloured stool", "baby ka potty safed"]),
  B("b_pustules", "Pus-filled spots on the skin", "त्वचा पर मवाद वाले दाने", "AMBER", "skin", ["pustules", "pus filled spots", "baby daane pus", "pimples with pus baby"]),
  B("b_cord_bleed", "Bleeding or bad smell from the cord", "नाल से खून या बदबू", "AMBER", "cord", ["cord bleeding", "cord smell", "umbilical bleeding", "naal se khoon", "naal mein badbu"]),
  B("b_thrush", "White patches in the mouth", "मुँह में सफ़ेद धब्बे", "AMBER", "feeding", ["white patches mouth", "oral thrush", "baby mouth white", "muh mein safed"]),
  B("b_cough", "Cough or blocked nose with noisy breathing", "खाँसी या बंद नाक के साथ आवाज़ वाली साँस", "AMBER", "breath", ["baby cough", "baby noisy breathing", "baby khansi", "baby naak band cough"]),
  B("b_reflux", "Frequent spitting up or arching the back", "बार-बार दूध उगलना", "AMBER", "feeding", ["spitting up a lot", "reflux baby", "baby arching back", "baby doodh ugalta"]),
  B("b_no_stool", "No stool in the first 2 days", "पहले 2 दिन मल नहीं", "AMBER", "tummy", ["baby no stool", "meconium not passed", "baby ne potty nahi ki", "baby no potty"]),
  B("b_tongue", "Trouble latching or tongue-tie", "स्तनपान में दिक्कत या जीभ बँधी", "AMBER", "feeding", ["tongue tie", "cannot latch", "baby latch nahi", "jeebh bandhi"]),
  // ---------- Baby: GREEN ----------
  B("b_spit", "Small spit-ups after feeds", "फ़ीड के बाद थोड़ा दूध उगलना", "GREEN", "feeding", ["baby spits up", "small spit up", "baby thoda doodh ugalta", "burp spit up"], "Small spit-ups are common. Burp after feeds and keep the baby upright for 15 minutes. Check again if it is forceful, green or the baby is not gaining weight.", "थोड़ा दूध उगलना आम है। फ़ीड के बाद डकार दिलाएँ और 15 मिनट सीधा रखें। ज़ोर से, हरा हो या वज़न न बढ़े तो फिर जाँचें।"),
  B("b_gas", "Gas or tummy wind", "पेट में गैस", "GREEN", "tummy", ["baby gas", "baby wind", "baby pet mein gas", "gas pain baby"], "Burp the baby after feeds and gently cycle the legs. Gas settles by itself.", "फ़ीड के बाद डकार दिलाएँ और पैरों को हल्के से साइकिल की तरह चलाएँ। गैस अपने आप ठीक हो जाती है।"),
  B("b_cradle", "Flaky scalp (cradle cap)", "सिर पर पपड़ी", "GREEN", "skin", ["cradle cap", "baby scalp flakes", "baby ke sar par paprdi"], "It is harmless. Massage with a little oil, then wash gently. It clears by itself.", "यह नुकसानदायक नहीं है। थोड़े तेल से मालिश करके हल्के से धो दें। यह अपने आप चली जाती है।"),
  B("b_peel", "Peeling skin", "त्वचा का छिलना", "GREEN", "skin", ["baby peeling skin", "baby skin peeling", "baby ki skin utar rahi"], "Peeling in the first weeks is normal. Do not pull the skin. A little moisturiser helps.", "शुरू के हफ़्तों में त्वचा का छिलना सामान्य है। त्वचा को खींचें नहीं। थोड़ा मॉइस्चराइज़र लगाएँ।"),
  B("b_acne", "Tiny white or red spots on the face", "चेहरे पर छोटे दाने", "GREEN", "skin", ["baby acne", "milia", "baby face spots", "baby chehre pe daane"], "These tiny spots are normal and clear in weeks. Wash the face with plain water and do not squeeze them.", "ये छोटे दाने सामान्य हैं और हफ़्तों में चले जाते हैं। चेहरा सादे पानी से धोएँ और दबाएँ नहीं।"),
  B("b_breast_swell", "Swollen breasts in the baby", "बच्चे के स्तन में सूजन", "GREEN", "skin", ["baby breast swelling", "newborn breast lump", "baby ke stan sujan"], "Mother's hormones cause this and it settles in weeks. Do not squeeze. See a doctor if it is red or hot.", "माँ के हार्मोन से ऐसा होता है और हफ़्तों में ठीक हो जाता है। दबाएँ नहीं। लाल या गर्म हो तो डॉक्टर को दिखाएँ।"),
  B("b_startle", "Startling or small jerks in sleep", "चौंकना या नींद में हल्के झटके", "GREEN", "sleep", ["baby startles", "moro reflex", "baby chaunkta hai", "baby jerks in sleep"], "Brief startles that stop when you hold the baby are normal. Fits that do not stop when held need urgent care.", "गोद में लेने पर रुक जाने वाले छोटे झटके सामान्य हैं। गोद में लेने पर भी न रुकें तो तुरंत इलाज चाहिए।"),
  B("b_stuffy", "Mild blocked nose", "हल्की बंद नाक", "GREEN", "breath", ["baby stuffy nose", "baby sniffles", "baby naak band halka"], "Newborns breathe through the nose. A drop of saline and holding upright helps. Check again if breathing is fast or noisy.", "नवजात नाक से साँस लेते हैं। सलाइन की एक बूँद और सीधा पकड़ना मदद करता है। साँस तेज़ या आवाज़ वाली हो तो फिर जाँचें।"),
  B("b_hernia", "Bulge near the belly button when crying", "रोते समय नाभि के पास उभार", "GREEN", "cord", ["umbilical hernia", "navel bulge", "baby naabhi ubhri"], "A soft bulge that goes in when the baby is calm is common and often closes by itself. See a doctor if it is hard, red or the baby vomits.", "रोते समय उभरकर शांत होने पर अंदर चला जाने वाला नरम उभार आम है। सख्त, लाल हो या उल्टी हो तो डॉक्टर को दिखाएँ।"),
  B("b_sleepy", "Sleeps most of the day but wakes to feed", "ज़्यादातर सोता है पर फ़ीड के लिए जागता है", "GREEN", "sleep", ["baby sleeps a lot", "baby sleeps all day", "baby bahut sota hai"], "Newborns sleep 16 to 17 hours a day. Wake the baby to feed at least every 3 hours. If the baby is hard to wake or not feeding, check again.", "नवजात दिन में 16-17 घंटे सोते हैं। कम से कम हर 3 घंटे में फ़ीड के लिए जगाएँ। जगाना मुश्किल हो या फ़ीड न ले तो फिर जाँचें।"),
  B("b_stool_colour", "Green or mustard-coloured stools", "हरा या सरसों के रंग का मल", "GREEN", "tummy", ["baby green stool", "mustard stool", "baby potty hari", "baby potty peela"], "Mustard, green and seedy stools are normal for breastfed babies. Watch for white or pale stools or blood.", "स्तनपान वाले बच्चों में सरसों, हरा और दानेदार मल सामान्य है। सफ़ेद या हल्का मल या खून दिखे तो ध्यान दें।"),
];

// ---------- Which area chip each symptom sits under (for tap-first browsing) ----------
export const AREA_LABELS: Record<string, { en: string; hi: string; who: Who }> = {
  womb: { en: "Bleeding and womb", hi: "ख़ून और गर्भाशय", who: "mother" },
  wound: { en: "Wound and stitches", hi: "घाव और टाँके", who: "mother" },
  breast: { en: "Breasts and feeding", hi: "स्तन और दूध", who: "mother" },
  head: { en: "Head, face and vision", hi: "सिर, चेहरा और आँखें", who: "mother" },
  chest: { en: "Heart, chest and breathing", hi: "दिल, सीना और साँस", who: "mother" },
  urine: { en: "Urine and bowels", hi: "पेशाब और पेट", who: "mother" },
  body: { en: "Body and energy", hi: "शरीर और ताक़त", who: "mother" },
  mind: { en: "Mind and mood", hi: "मन और मूड", who: "mother" },
  skin: { en: "Skin and hair", hi: "त्वचा और बाल", who: "mother" },
  feeding: { en: "Feeding", hi: "दूध पीना", who: "baby" },
  breath: { en: "Breathing", hi: "साँस", who: "baby" },
  temp: { en: "Temperature", hi: "तापमान", who: "baby" },
  tummy: { en: "Tummy and stools", hi: "पेट और मल", who: "baby" },
  sleep: { en: "Sleep and crying", hi: "नींद और रोना", who: "baby" },
  cord: { en: "Belly button and cord", hi: "नाभि और नाल", who: "baby" },
};
export const AREA_OF: Record<string, string> = {
  heavy_bleeding: "womb", clots: "womb", fits: "head", fainting: "body", headache_vision: "head", chest_pain: "chest", breathless: "chest",
  fever_chills: "body", foul_discharge: "womb", calf_swelling: "body", self_harm: "mind", high_bp: "head", fever: "body", breast_red: "breast",
  urine_burn: "urine", wound_infection: "wound", low_mood: "mind", anxiety: "mind", no_sleep: "mind", cant_eat: "body", severe_pain: "womb",
  leaking_urine: "urine", breast_engorged: "breast", hair_loss_heavy: "skin", afterpains: "womb", light_bleeding: "womb", tired: "body",
  tearful: "mind", back_pain: "body", constipation: "urine", sore_nipples: "breast", hair_fall: "skin", night_sweats: "body",
  b_not_feeding: "feeding", b_convulsion: "sleep", b_fast_breathing: "breath", b_chest_indrawing: "breath", b_temp: "temp", b_drowsy: "sleep",
  b_jaundice_24: "skin", b_cord: "cord", b_jaundice: "skin", b_vomit: "tummy", b_loose: "tummy", b_rash: "skin", b_hiccups: "tummy", b_cry: "sleep",
};

// ---------- Follow-up questions: asked after a symptom is chosen. They can only RAISE the level. ----------
export type Effect = { level?: Level; add?: string; crisis?: CrisisKind };
export type FollowUp = { id: string; q: string; hi: string; options: { label: string; hi: string; effect?: Effect }[] };
const fu = (id: string, q: string, hi: string, opts: [string, string, Effect?][]): FollowUp => ({ id, q, hi, options: opts.map(([label, h, effect]) => ({ label, hi: h, effect })) });
const YN = (id: string, q: string, hi: string, yes: Effect): FollowUp => fu(id, q, hi, [["Yes", "हाँ", yes], ["No", "नहीं"]]);

const HEADACHE: FollowUp[] = [
  YN("severe", "Is it the worst or most severe headache you have had?", "क्या यह अब तक का सबसे तेज़ सिरदर्द है?", { level: "RED" }),
  YN("vision", "Do you have blurred vision, flashing lights or spots?", "क्या आँखों के आगे धुंधलापन, चमक या धब्बे हैं?", { add: "vision_flash" }),
  YN("swelling", "Is your face or are your hands swollen?", "क्या चेहरे या हाथों में सूजन है?", { add: "swelling_face_hands" }),
];
const MOOD: FollowUp[] = [
  YN("harm", "Have you had thoughts of harming yourself or your baby?", "क्या आपके मन में खुद को या बच्चे को नुकसान पहुँचाने के विचार आए हैं?", { crisis: "selfharm", level: "RED" }),
  YN("psychosis", "Are you seeing or hearing things others do not, or have you not slept for days?", "क्या आपको ऐसी चीज़ें दिखती या सुनाई देती हैं जो दूसरों को नहीं, या कई दिनों से नींद नहीं आई?", { crisis: "psychosis", level: "RED" }),
];
const FEVER_Q: FollowUp[] = [
  YN("high", "Is your temperature 102°F (39°C) or higher, or are you shivering?", "क्या तापमान 102°F (39°C) या उससे ज़्यादा है, या कँपकँपी है?", { add: "fever_chills" }),
  fu("source", "Which of these do you also have?", "इनमें से और क्या है?", [
    ["Painful red breast", "स्तन में लालिमा और दर्द", { add: "breast_red" }], ["Burning while passing urine", "पेशाब में जलन", { add: "urine_burn" }],
    ["Wound red or leaking", "घाव लाल या रिस रहा", { add: "wound_infection" }], ["Smelly vaginal discharge", "योनि स्राव से बदबू", { add: "lochia_smell" }],
    ["Painful swollen calf", "पिंडली में दर्द और सूजन", { add: "calf_swelling" }], ["None of these", "इनमें से कोई नहीं"],
  ]),
];
const BLEED: FollowUp[] = [
  YN("pad", "In the last hour, have you soaked a pad, or passed clots bigger than a lemon?", "पिछले एक घंटे में क्या पैड भीगा है, या नींबू से बड़े थक्के आए हैं?", { add: "heavy_bleeding" }),
  YN("dizzy", "Do you feel dizzy, faint or very weak?", "क्या चक्कर, बेहोशी या बहुत कमज़ोरी महसूस हो रही है?", { add: "dizzy" }),
];
const BABY_RED_SIGNS: FollowUp[] = [
  fu("signs", "Does the baby have any of these?", "क्या बच्चे में इनमें से कुछ है?", [
    ["Sleepy and hard to wake, or not feeding", "बहुत सोया और जगाना मुश्किल, या दूध नहीं पी रहा", { add: "b_drowsy" }],
    ["Fast breathing or chest pulling in", "तेज़ साँस या सीना अंदर धँसना", { add: "b_fast_breathing" }],
    ["Fever or feels very cold", "बुखार या बहुत ठंडा", { add: "b_temp" }],
    ["Fits or stiff body", "दौरा या अकड़ा शरीर", { add: "b_convulsion" }], ["None of these", "इनमें से कोई नहीं"],
  ]),
];

export const FOLLOWUPS: Record<string, FollowUp[]> = {
  headache: HEADACHE,
  spinal_headache: HEADACHE.slice(1),
  swelling_face_hands: [YN("head", "Do you also have a headache or blurred vision?", "क्या सिरदर्द या धुंधला दिखना भी है?", { add: "headache" })],
  upper_belly_pain: [YN("head", "Do you also have a headache, vomiting or swelling of the face or hands?", "क्या सिरदर्द, उल्टी या चेहरे/हाथों में सूजन भी है?", { add: "swelling_face_hands" })],
  fever: FEVER_Q,
  fresh_bleeding: BLEED, light_bleeding: BLEED, small_clots: BLEED,
  afterpains: [
    YN("severe", "Is the pain severe or getting worse?", "क्या दर्द बहुत तेज़ है या बढ़ रहा है?", { add: "severe_belly_pain" }),
    YN("fever", "Do you also have fever or smelly discharge?", "क्या बुखार या बदबूदार स्राव भी है?", { add: "lochia_smell" }),
  ],
  wound_infection: [
    YN("fever", "Do you also have fever or chills?", "क्या बुखार या कँपकँपी भी है?", { add: "fever_chills" }),
    YN("open", "Has the wound opened up?", "क्या घाव खुल गया है?", { add: "wound_open" }),
  ],
  perineal_pain: [YN("worse", "Is there pus, a bad smell, fever, or is the pain getting worse?", "क्या मवाद, बदबू, बुखार है, या दर्द बढ़ रहा है?", { add: "wound_infection" })],
  low_mood: MOOD, anxiety: MOOD, numb_empty: MOOD, no_bond: MOOD, irritable: MOOD, panic: MOOD, no_interest: MOOD, sleep_too_much: MOOD, tearful: MOOD.slice(0, 1),
  tired: [
    YN("mood", "Do you feel hopeless, or unable to enjoy anything?", "क्या आप निराश हैं, या किसी चीज़ में आनंद नहीं आ रहा?", { add: "numb_empty" }),
    YN("pale", "Are you dizzy, breathless on stairs or very pale?", "क्या चक्कर, सीढ़ियों पर साँस फूलना या बहुत पीलापन है?", { add: "pale_weak" }),
  ],
  swollen_feet: [YN("one", "Is only one leg painful, red or swollen, or is your face swollen?", "क्या सिर्फ़ एक पैर में दर्द, लालिमा या सूजन है, या चेहरा सूजा है?", { add: "calf_swelling" })],
  constipation: [YN("blood", "Is there blood, or can you not pass stool at all?", "क्या खून आ रहा है, या बिल्कुल मल नहीं हो रहा?", { level: "AMBER" })],
  b_jaundice: [YN("deep", "Is the yellow colour on the palms or soles, or did it start in the first 24 hours?", "क्या पीलापन हथेलियों या तलवों पर है, या पहले 24 घंटे में शुरू हुआ?", { add: "b_jaundice_palms" }), ...BABY_RED_SIGNS],
  b_vomit: [YN("green", "Is the vomit green or bloody, or is the belly swollen?", "क्या उल्टी हरी या खून वाली है, या पेट फूला है?", { add: "b_green_vomit" }), ...BABY_RED_SIGNS],
  b_loose: [YN("dry", "Is there blood in the stool, no wet nappy for 8 hours, or a sunken soft spot?", "क्या मल में खून, 8 घंटे से गीला डायपर नहीं, या धँसा तालू है?", { add: "b_no_wet" }), ...BABY_RED_SIGNS],
  b_rash: [YN("pus", "Are there many pus-filled spots, or does the baby have fever?", "क्या मवाद वाले कई दाने हैं, या बच्चे को बुखार है?", { add: "b_pustules" })],
  b_cry: [
    YN("nonstop", "Has the baby cried non-stop for hours, or cries when touched?", "क्या बच्चा घंटों से लगातार रो रहा है, या छूने पर रोता है?", { level: "AMBER" }),
    ...BABY_RED_SIGNS,
  ],
  b_cough: [YN("fast", "Is the baby breathing fast, or is the chest pulling in?", "क्या बच्चा तेज़ साँस ले रहा है, या सीना अंदर धँस रहा है?", { add: "b_fast_breathing" })],
  b_startle: [YN("fits", "Do the jerks continue when you hold the baby, or is the baby stiff or blue?", "क्या गोद में लेने पर भी झटके जारी रहते हैं, या बच्चा अकड़ा/नीला है?", { add: "b_convulsion" })],
  b_sleepy: [YN("hard", "Is the baby hard to wake, or not feeding well?", "क्या बच्चे को जगाना मुश्किल है, या ठीक से दूध नहीं पी रहा?", { add: "b_drowsy" })],
  b_spit: [YN("force", "Is the vomiting forceful, green, or is the baby not gaining weight?", "क्या उल्टी ज़ोर से है, हरी है, या वज़न नहीं बढ़ रहा?", { add: "b_vomit" })],
  b_hiccups: [], b_gas: [YN("hard", "Is the belly hard and swollen, or does the baby vomit?", "क्या पेट सख्त और फूला है, या बच्चा उल्टी कर रहा है?", { add: "b_swollen_belly" })],
};

// ---------- Combination rules: symptoms that are more serious together ----------
export const COMBOS: { all: string[]; level: Level; why: string; hi: string }[] = [
  { all: ["headache", "swelling_face_hands"], level: "RED", why: "Headache with swelling can be a sign of dangerous high blood pressure", hi: "सूजन के साथ सिरदर्द खतरनाक उच्च रक्तचाप का संकेत हो सकता है" },
  { all: ["headache", "vision_flash"], level: "RED", why: "Headache with vision changes", hi: "सिरदर्द के साथ आँखों में बदलाव" },
  { all: ["headache", "upper_belly_pain"], level: "RED", why: "Headache with upper belly pain", hi: "सिरदर्द के साथ ऊपरी पेट में दर्द" },
  { all: ["swelling_face_hands", "upper_belly_pain"], level: "RED", why: "Swelling with upper belly pain", hi: "सूजन के साथ ऊपरी पेट में दर्द" },
  { all: ["fever", "calf_swelling"], level: "RED", why: "Fever with a painful swollen calf", hi: "बुखार के साथ पिंडली में दर्द और सूजन" },
  { all: ["fever", "lochia_smell"], level: "RED", why: "Fever with smelly discharge can mean a womb infection", hi: "बुखार के साथ बदबूदार स्राव गर्भाशय के संक्रमण का संकेत हो सकता है" },
  { all: ["breathless", "palpitations"], level: "RED", why: "Breathlessness with a racing heart", hi: "साँस फूलने के साथ तेज़ धड़कन" },
  { all: ["dizzy", "fresh_bleeding"], level: "RED", why: "Dizziness with bleeding", hi: "चक्कर के साथ खून आना" },
  { all: ["dizzy", "light_bleeding"], level: "AMBER", why: "Dizziness with bleeding", hi: "चक्कर के साथ खून आना" },
  { all: ["b_vomit", "b_swollen_belly"], level: "RED", why: "Vomiting with a swollen belly in a baby", hi: "बच्चे में उल्टी के साथ फूला पेट" },
  { all: ["b_loose", "b_no_wet"], level: "RED", why: "Loose stools with no wet nappy: the baby may be drying out", hi: "पतले दस्त के साथ गीला डायपर नहीं: बच्चे में पानी की कमी हो सकती है" },
  { all: ["b_loose", "b_sunken"], level: "RED", why: "Loose stools with a sunken soft spot", hi: "पतले दस्त के साथ धँसा तालू" },
  { all: ["b_jaundice", "b_not_feeding"], level: "RED", why: "Jaundice with poor feeding", hi: "पीलिया के साथ दूध न पीना" },
  { all: ["b_cough", "b_fast_breathing"], level: "RED", why: "Cough with fast breathing", hi: "खाँसी के साथ तेज़ साँस" },
  { all: ["b_reflux", "b_weight_low"], level: "AMBER", why: "Spitting up with poor weight gain", hi: "दूध उगलने के साथ वज़न न बढ़ना" },
];

// Extra phrasings for older symptoms (kept here so the original list stays untouched).
export const EXTRA_KEYWORDS: Record<string, string[]> = {
  self_harm: ["no reason to live", "there is no point in living", "i do not want to be here any more", "i wish i could disappear", "they would be better off if i was gone", "i am a burden to everyone", "i cannot do this any more", "sab theek ho jayega agar main na rahoon", "जीने का मन नहीं"],
  heavy_bleeding: ["blood pouring out", "blood gushing", "bleeding through my clothes", "bleeding through the bed", "blood dripping", "khoon beh raha hai", "खून बह रहा है"],
  b_convulsion: ["baby ko jhatke", "baby ke haath pair jhatke", "baby shaking and jerking", "बच्चे को झटके"],
  fainting: ["might pass out", "about to faint", "feel faint", "going to faint", "passed out"],
  b_chest_indrawing: ["baby chest pulling in", "ribs sucking in", "chest going in with each breath"],
};
