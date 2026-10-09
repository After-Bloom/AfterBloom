// Hindi for the priority workflow, the action form, family messages, the audit trail, the demo controls, the alert-load meter and the mother's
// "What my care team did" screens. Draft pending clinician and native-speaker review.
export const HI_WORKFLOW: Record<string, string> = {
  // action form and next action
  "Call {p}": "{p} पर कॉल करें",
  "Only you can resolve a case. If a new alert about the same concern arrives within 7 days, it reopens by itself.": "केस सिर्फ़ आप सुलझा सकते हैं। उसी चिंता का नया अलर्ट 7 दिन में आए तो केस अपने आप दोबारा खुल जाएगा।",
  "How did it go?": "कैसा रहा?", "Why are you keeping an eye on it?": "आप नज़र क्यों रख रहे हैं?", "Confirm": "पुष्टि करें",
  "Note (optional)": "नोट (वैकल्पिक)", "Saved encrypted. It is never shown to her family.": "एन्क्रिप्ट करके सहेजा जाता है। परिवार को कभी नहीं दिखता।",
  "Next action": "अगला कदम", "This case is resolved.": "यह केस सुलझ चुका है।", "Acknowledge": "देख लिया", "Take over": "मैं संभालता/संभालती हूँ", "Picked up at {t}": "{t} पर उठाया गया",
  "Why this priority": "यह प्राथमिकता क्यों", "Nothing is open.": "कुछ खुला नहीं है।", "It only goes down after someone records an action.": "यह तभी घटती है जब कोई कार्रवाई दर्ज करे।",
  // escalation
  "Escalation": "आगे बढ़ाना", "Assigned doctor: {n}": "तय डॉक्टर: {n}", "On-call backup: {n}": "ऑन-कॉल बैकअप: {n}", "not set": "तय नहीं", "min": "मिनट", "Admin desk": "एडमिन डेस्क",
  "Someone has picked it up, so it will not climb.": "किसी ने इसे उठा लिया है, इसलिए यह आगे नहीं बढ़ेगा।",
  "Only an Immediate case nobody has picked up climbs the ladder.": "सिर्फ़ वह तुरंत वाला केस आगे बढ़ता है जिसे किसी ने नहीं उठाया।",
  "Nobody has picked it up. The next step is in {n} min.": "किसी ने इसे नहीं उठाया। अगला कदम {n} मिनट में है।", "Nobody has picked it up. It has reached the admin desk.": "किसी ने इसे नहीं उठाया। यह एडमिन डेस्क तक पहुँच गया है।",
  // family
  "Not sent: {r}": "भेजा नहीं गया: {r}", "Waiting for her answer": "उनके जवाब का इंतज़ार", "Allowed once": "एक बार की अनुमति", "Always allowed": "हमेशा की अनुमति", "She chose Not now": "उन्होंने 'अभी नहीं' चुना",
  "Checked against {m}'s consent, right now.": "अभी, {m} की सहमति से जाँचा गया।", "No family members are linked.": "कोई परिवार का सदस्य जुड़ा नहीं है।", "Message": "संदेश",
  "alerts ON": "अलर्ट चालू", "alerts OFF": "अलर्ट बंद", "OFF": "बंद", "Message sent to {n}.": "{n} को संदेश भेजा गया।", "Send message": "संदेश भेजें",
  "Your message": "आपका संदेश", "Write a short, respectful message...": "एक छोटा, सम्मानजनक संदेश लिखें...", "Keep it respectful. Avoid sharing her health details, scores or a diagnosis.": "सम्मानजनक रखें। उनकी स्वास्थ्य जानकारी, स्कोर या निदान साझा करने से बचें।",
  "Use a template instead": "इसके बजाय एक टेम्पलेट उपयोग करें", "Write my own message instead": "इसके बजाय अपना संदेश लिखें",
  "{m} has been asked. Her answer is final.": "{m} से पूछ लिया गया है। उनका जवाब अंतिम है।", "Ask {m}": "{m} से पूछें",
  "Not asked during a safety case. Follow the crisis protocol: 112 and Tele-MANAS 14416.": "सुरक्षा के केस में पूछा नहीं जाता। संकट प्रोटोकॉल अपनाएँ: 112 और टेली-मानस 14416।",
  "Messages use fixed neutral wording. Nothing about her health is ever sent.": "संदेश तय, तटस्थ शब्दों में होते हैं। उनके स्वास्थ्य के बारे में कुछ नहीं भेजा जाता।",
  "More actions": "और कार्रवाइयाँ", "Refer": "रेफ़र करें", "Notify family": "परिवार को बताएँ", "Monitor with a reason": "कारण के साथ निगरानी", "Resolve": "सुलझाएँ",
  // audit trail
  "Audit trail": "ऑडिट ट्रेल", "Verify": "जाँचें", "The sealed audit trail needs the latest database update (migration 009).": "सील किए गए ऑडिट ट्रेल के लिए नवीनतम डेटाबेस अपडेट (माइग्रेशन 009) चाहिए।",
  "Could not verify. Please try again.": "जाँच नहीं हो सकी। कृपया दोबारा कोशिश करें।", "All records unchanged": "सभी रिकॉर्ड जस के तस", "{n} checked": "{n} जाँचे गए",
  "A record no longer matches. The first one is from {t}.": "एक रिकॉर्ड अब मेल नहीं खाता। पहला {t} का है।",
  "Every record is sealed with the one before it. Nobody can edit or delete one without the chain showing it.": "हर रिकॉर्ड पिछले रिकॉर्ड के साथ सील है। कोई भी रिकॉर्ड बदला या मिटाया गया तो चेन उसे दिखा देगी।",
  "Her consent then": "तब उनकी सहमति", "sharing ON": "साझा करना चालू", "sharing OFF": "साझा करना बंद",
  "Check that nothing was changed": "जाँचें कि कुछ बदला नहीं गया", "Every record is sealed with the one before it. Pick a patient and verify her trail.": "हर रिकॉर्ड पिछले के साथ सील है। मरीज़ चुनें और उनका ट्रेल जाँचें।",
  "Choose a patient": "मरीज़ चुनें", "A record no longer matches this patient's chain.": "इस मरीज़ की चेन में एक रिकॉर्ड अब मेल नहीं खाता।",
  // demo controls
  "The replay stopped. Is the demo set up? Open /api/dev/seed once.": "रीप्ले रुक गया। क्या डेमो सेट है? /api/dev/seed एक बार खोलें।", "Replaying: {a} of {b}. {x} alerts, {y} cases.": "रीप्ले: {b} में से {a}। {x} अलर्ट, {y} केस।",
  "The replay stopped. Please try again.": "रीप्ले रुक गया। कृपया दोबारा कोशिश करें।", "Checked {n} cases. Escalated {m}.": "{n} केस जाँचे। {m} आगे बढ़ाए गए।", "Could not run the checks.": "जाँच नहीं चल सकी।",
  "Reset the demo? This puts the demo mothers' alerts, cases, actions and requests back to the start. Audit records are kept.": "डेमो रीसेट करें? इससे डेमो माँओं के अलर्ट, केस, कार्रवाइयाँ और अनुरोध शुरुआत पर लौट जाएँगे। ऑडिट रिकॉर्ड बने रहते हैं।",
  "The demo is back at the start.": "डेमो शुरुआत पर लौट आया।", "Could not reset. Is the demo set up?": "रीसेट नहीं हो सका। क्या डेमो सेट है?", "Could not reset.": "रीसेट नहीं हो सका।",
  "Demo controls": "डेमो नियंत्रण", "Replay storm": "अलर्ट की बाढ़ दोहराएँ", "Run checks now": "अभी जाँच चलाएँ", "Pretend 20 minutes passed": "मान लें 20 मिनट बीत गए", "Reset demo": "डेमो रीसेट करें",
  // alert-load meter
  "{n} min": "{n} मिनट", "{n} h": "{n} घंटे", "Alerts received into cases": "प्राप्त अलर्ट, केस में", "{n} fewer things to look at": "देखने के लिए {n} कम चीज़ें", "Notifications sent · held back": "भेजी · रोकी गई सूचनाएँ",
  "Repeats are saved, not sent again": "दोहराव सहेजे जाते हैं, दोबारा भेजे नहीं जाते", "Median time to first action": "पहली कार्रवाई का औसत समय", "across {n} cases": "{n} केस में", "no actions yet": "अभी कोई कार्रवाई नहीं",
  "Cases handled in time": "समय पर संभाले गए केस", "within their priority's time window": "अपनी प्राथमिकता की समय-सीमा में", "Alert load": "अलर्ट का बोझ", "Demo data": "डेमो डेटा",
  "The meter needs the latest database updates (migrations 007 to 009).": "मीटर के लिए नवीनतम डेटाबेस अपडेट (माइग्रेशन 007 से 009) चाहिए।", "Tamper-evident audit trail": "छेड़छाड़ पकड़ने वाला ऑडिट ट्रेल", "Verify chain": "चेन जाँचें",
  "{n} urgent case(s) nobody has picked up for 30 minutes. Please call the doctor on duty.": "{n} ज़रूरी केस को 30 मिनट से किसी ने नहीं उठाया। कृपया ड्यूटी पर मौजूद डॉक्टर को कॉल करें।",
  // the mother's screens
  "That request was already answered.": "उस अनुरोध का जवाब पहले ही दिया जा चुका है।", "Saved: Not now. They will not ask again about this.": "सहेजा: अभी नहीं। इस बारे में वे दोबारा नहीं पूछेंगे।",
  "Saved: always allowed. You can change this any time in Family circle.": "सहेजा: हमेशा की अनुमति। आप इसे कभी भी फ़ैमिली सर्कल में बदल सकती हैं।", "Saved: allowed once.": "सहेजा: एक बार की अनुमति।",
  "A request from your care team": "आपकी केयर टीम का अनुरोध", "Your care team would like to let {n} know to check on you today. They will not be told why.": "आपकी केयर टीम {n} को बताना चाहती है कि आज वे आपका हाल पूछें। उन्हें कारण नहीं बताया जाएगा।",
  "Allow once": "एक बार अनुमति दें", "Always allow": "हमेशा अनुमति दें", "You can change this any time in Family circle. Your answer is final for this situation.": "आप इसे कभी भी फ़ैमिली सर्कल में बदल सकती हैं। इस स्थिति के लिए आपका जवाब अंतिम है।",
  "This list needs the latest database update. It will appear once it has been added.": "इस सूची के लिए नवीनतम डेटाबेस अपडेट चाहिए। जुड़ने पर यह दिखेगी।",
  "Nothing yet. When someone on your care team looks at your record, calls you, or tells a family member, it appears here.": "अभी कुछ नहीं। जब आपकी केयर टीम का कोई सदस्य आपका रिकॉर्ड देखेगा, कॉल करेगा या परिवार को बताएगा, तो वह यहाँ दिखेगा।",
  "No scores. No case names. Your care team never shares more than this with anyone but you.": "कोई स्कोर नहीं। कोई केस का नाम नहीं। आपकी केयर टीम इससे ज़्यादा किसी और से साझा नहीं करती।",
  "See what they have done": "देखें उन्होंने क्या किया", "What my care team did": "मेरी केयर टीम ने क्या किया", "Who looked at your record, who called you, and who was told. In plain words, nothing more.": "किसने आपका रिकॉर्ड देखा, किसने कॉल किया और किसे बताया गया। सरल शब्दों में, इससे ज़्यादा कुछ नहीं।",
  "Who looked, who called, who was told.": "किसने देखा, किसने कॉल किया, किसे बताया गया।", "Transparency": "पारदर्शिता",
  // priority and the queue
  "Next routine check": "अगली नियमित जाँच", "overdue by {t}": "{t} की देरी", "due in {t}": "{t} में देय",
  "Note": "नोट", "Why": "क्यों", "Opens the case": "केस खुलता है", "Action queue": "कार्रवाई कतार", "Overdue": "देर हो चुकी",
  "One card per case, most urgent first, each with the one thing to do next.": "हर केस का एक कार्ड, सबसे ज़रूरी पहले, हर एक में अगला एक काम।",
  "Call & log outcome": "कॉल करें और नतीजा दर्ज करें", "Save": "सहेजें", "Could not save. Please try again.": "सहेजा नहीं जा सका। कृपया दोबारा कोशिश करें।",
};
