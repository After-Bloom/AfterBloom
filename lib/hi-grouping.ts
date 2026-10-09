// Hindi for the related-alerts screens, continuity of care ("Your doctors") and the professional load panel.
// Draft pending clinician and native-speaker review. The words for concerns, relations and "why linked" live in lib/labels.ts.
export const HI_GROUPING: Record<string, string> = {
  // continuity of care (mother)
  "Your doctors": "आपकी डॉक्टर",
  "You have seen these professionals before. You can continue with the same one or choose someone else. It is always your choice.": "आप इन पेशेवरों से पहले मिल चुकी हैं। आप उन्हीं के साथ आगे बढ़ सकती हैं या किसी और को चुन सकती हैं। फ़ैसला हमेशा आपका है।",
  "Recommended": "सुझाई गई", "1 session with you": "आपके साथ 1 सत्र", "{n} sessions with you": "आपके साथ {n} सत्र", "The doctor you chose": "आपकी चुनी हुई डॉक्टर", "last seen": "पिछली बार",
  "Continue with {a}": "{a} के साथ जारी रखें", "Book again": "दोबारा बुक करें", "Choose someone else": "किसी और को चुनें", "Make preferred": "पसंदीदा बनाएँ", "Preferred": "पसंदीदा",
  "Change my preferred doctor": "मेरी पसंदीदा डॉक्टर बदलें", "Other professionals": "अन्य पेशेवर",
  "Would you like {a} to be your preferred doctor from now on?": "क्या आप चाहेंगी कि अब से {a} आपकी पसंदीदा डॉक्टर हों?",
  "Right now your preferred doctor is {a}. Your care team contacts your preferred doctor first.": "अभी आपकी पसंदीदा डॉक्टर {a} हैं। आपकी केयर टीम सबसे पहले आपकी पसंदीदा डॉक्टर से संपर्क करती है।",
  "Yes, make {a} my preferred doctor": "हाँ, {a} को मेरी पसंदीदा डॉक्टर बनाएँ", "No, keep {a}": "नहीं, {a} ही रहें",
  "Your preferred doctor is the one your care team contacts first. You can change this any time, and the change is recorded.": "आपकी पसंदीदा डॉक्टर वही हैं जिनसे आपकी केयर टीम सबसे पहले संपर्क करती है। आप इसे कभी भी बदल सकती हैं, और बदलाव दर्ज होता है।",
  "Could not save that choice. Please try again.": "यह चुनाव सहेजा नहीं जा सका। कृपया दोबारा कोशिश करें।",
  // related alerts (professional)
  "Related alerts": "संबंधित अलर्ट",
  "Related alerts need the latest database update (migration 007). Ask the administrator to run it, then refresh.": "संबंधित अलर्ट के लिए नवीनतम डेटाबेस अपडेट (माइग्रेशन 007) चाहिए। एडमिन से चलवाएँ, फिर पेज रीफ़्रेश करें।",
  "Could not load the related alerts. Please check your connection.": "संबंधित अलर्ट लोड नहीं हो सके। कृपया कनेक्शन जाँचें।",
  "Baby": "शिशु", "Why linked": "क्यों जुड़ा", "Confirm link": "जुड़ाव की पुष्टि करें", "Unlink": "अलग करें", "Not related": "संबंधित नहीं",
  "Repeat x{n}": "दोहराव x{n}", "hide repeats": "दोहराव छिपाएँ", "show repeats": "दोहराव दिखाएँ",
  "Alerts received": "प्राप्त अलर्ट", "Groups by concern": "चिंता के अनुसार समूह", "Notifications held back": "रोकी गई सूचनाएँ", "To confirm": "पुष्टि बाकी",
  "Individual alerts": "अलग-अलग अलर्ट", "Grouped by concern": "चिंता के अनुसार समूह", "Care team": "केयर टीम", "Mine": "मेरे", "View": "दृश्य", "Whose": "किसके",
  "{a} alerts into {b} groups": "{a} अलर्ट, {b} समूहों में", "{a} separate alerts": "{a} अलग-अलग अलर्ट",
  "Same data, nothing deleted. Grouping only changes how the alerts are laid out, and a rise in severity, a new concern or any safety alert always reaches the care team.": "वही डेटा, कुछ भी मिटाया नहीं गया। समूह बनाने से सिर्फ़ अलर्ट का क्रम बदलता है; गंभीरता बढ़ने, नई चिंता या किसी भी सुरक्षा अलर्ट की सूचना केयर टीम को हमेशा मिलती है।",
  "Nothing is assigned to you right now.": "अभी आपको कुछ असाइन नहीं है।",
  "No related alerts yet. They appear here as soon as a mother checks in or uses the symptom checker.": "अभी कोई संबंधित अलर्ट नहीं। जैसे ही कोई माँ चेक-इन करेगी या लक्षण जाँच इस्तेमाल करेगी, वे यहाँ दिखेंगे।",
  "She is not sharing her check-ins and screening results right now. You see red and safety alerts only, without the details.": "वे अभी अपने चेक-इन और स्क्रीनिंग परिणाम साझा नहीं कर रहीं। आपको सिर्फ़ लाल और सुरक्षा अलर्ट दिखते हैं, बिना ब्योरे के।",
  "{n} alerts": "{n} अलर्ट", "latest": "नवीनतम", "you": "आप", "not assigned": "असाइन नहीं", "Times are shown in Indian Standard Time.": "समय भारतीय मानक समय में दिखाया गया है।",
  // professional pages (dashboard, patients, alerts)
  "Welcome, {name}": "स्वागत है, {name}", "Here is who needs you today. Every view of a record is logged.": "आज किन्हें आपकी ज़रूरत है, यह यहाँ है। रिकॉर्ड का हर देखना दर्ज होता है।",
  "Need a call now": "अभी कॉल चाहिए", "Open callbacks": "खुले कॉलबैक", "Needs you now": "अभी आपकी ज़रूरत", "Nobody needs a call right now. Everyone is looked after.": "अभी किसी को कॉल की ज़रूरत नहीं। सबका ध्यान रखा जा रहा है।",
  "Needs a call now": "अभी कॉल करें", "Callback waiting": "कॉलबैक बाकी", "Keep an eye on": "नज़र रखें", "Doing well": "ठीक चल रही हैं", "+{n} more": "+{n} और", "Open patient": "मरीज़ खोलें",
  "Day {n}": "दिन {n}", "Next session": "अगला सत्र", "All sessions": "सभी सत्र", "Call now": "अभी कॉल करें", "Overview": "सारांश", "Trends": "रुझान", "Callbacks": "कॉलबैक", "Alerts": "अलर्ट", "Sessions": "सत्र", "Audit log": "ऑडिट लॉग", "Dashboard": "डैशबोर्ड",
  "Choose a patient to see her alerts and her record. Every view of a record is logged.": "किसी मरीज़ को चुनें और उसके अलर्ट और रिकॉर्ड देखें। रिकॉर्ड का हर देखना दर्ज होता है।",
  "Callbacks waiting for you, and how a mother's alerts fit together.": "आपके लिए रुके कॉलबैक, और माँ के अलर्ट आपस में कैसे जुड़े हैं।",
  "Your booked video sessions. Joining opens 10 minutes before the start.": "आपके बुक किए वीडियो सत्र। शुरू होने से 10 मिनट पहले जुड़ना खुलता है।",
  "Every time you opened a record or completed a callback. Mothers can see this too.": "हर बार जब आपने कोई रिकॉर्ड खोला या कॉलबैक पूरा किया। माँएँ भी इसे देख सकती हैं।",
  // doctor categories (mother)
  "Find the right person for you": "अपने लिए सही व्यक्ति चुनें",
  "For your heart and mind": "आपके मन और भावनाओं के लिए", "Talk through low mood, worry, sleep and the big feelings of new motherhood.": "उदासी, चिंता, नींद और माँ बनने की बड़ी भावनाओं के बारे में बात करें।",
  "For your body and your baby": "आपके शरीर और आपके शिशु के लिए", "Recovery, blood pressure, bleeding, feeding and newborn care.": "रिकवरी, ब्लड प्रेशर, रक्तस्राव, स्तनपान और नवजात की देखभाल।",
  // admin: professional load
  "Professional load": "पेशेवरों का कार्यभार",
  "Returning mothers go to the doctor they already know, even above the limit. New mothers go to the least busy professional who is on duty and below their limit, and the on-call professional takes over when everyone is full.": "लौटने वाली माँएँ अपनी जानी-पहचानी डॉक्टर के पास जाती हैं, सीमा से ऊपर होने पर भी। नई माँएँ ड्यूटी पर मौजूद सबसे कम व्यस्त पेशेवर के पास जाती हैं जो अपनी सीमा से नीचे हो, और सब भरे होने पर ऑन-कॉल पेशेवर संभालते हैं।",
  "Psychologist": "मनोवैज्ञानिक", "Gynaecologist": "स्त्री रोग विशेषज्ञ", "Paediatrician": "शिशु रोग विशेषज्ञ", "Lactation": "स्तनपान सलाहकार", "Not set": "तय नहीं",
  "On call": "ऑन-कॉल", "Off duty": "ड्यूटी पर नहीं", "of": "में से", "at capacity": "क्षमता पूरी", "Open load against the limit": "सीमा के मुकाबले खुला कार्यभार",
  "Load counts open urgent items for the mothers matched with each professional. It will count open cases once cases are added.": "कार्यभार हर पेशेवर से जुड़ी माँओं के खुले ज़रूरी मामलों को गिनता है। केस जुड़ने के बाद यह खुले केस गिनेगा।",
};
