// Myths and facts, and "what to say" scripts, for the family. Wording and Hindi are drafts pending sign-off by a doctor or counsellor.
export type Myth = { myth: string; hi_myth: string; fact: string; hi_fact: string };
export const MYTHS: Myth[] = [
  { myth: "A new mother must stay indoors and must not bathe for weeks.", hi_myth: "नई माँ को हफ़्तों घर के अंदर रहना चाहिए और नहाना नहीं चाहिए।",
    fact: "A daily bath with clean warm water is safe and helps prevent infection. She needs rest, and a little fresh air and gentle walking help her recover.", hi_fact: "रोज़ साफ़ गुनगुने पानी से नहाना सुरक्षित है और संक्रमण से बचाता है। उसे आराम चाहिए, और थोड़ी ताज़ी हवा और हल्का चलना ठीक होने में मदद करता है।" },
  { myth: "She should avoid dal, fruit and vegetables so the baby does not fall ill.", hi_myth: "बच्चे को बीमारी से बचाने के लिए माँ को दाल, फल और सब्ज़ियाँ नहीं खानी चाहिए।",
    fact: "She needs a full, varied diet to heal and make milk. Most home foods are fine. If a doctor says to avoid something, follow that.", hi_fact: "ठीक होने और दूध बनाने के लिए उसे पूरा, विविध खाना चाहिए। ज़्यादातर घर का खाना ठीक है। डॉक्टर कुछ मना करें तो वही मानें।" },
  { myth: "A newborn needs ghutti, honey or water to be strong or to digest.", hi_myth: "नवजात को ताक़त या पाचन के लिए घुट्टी, शहद या पानी चाहिए।",
    fact: "For the first 6 months a baby needs only breast milk. Honey can make a baby under 1 year seriously ill, and other things can cause infections.", hi_fact: "पहले 6 महीने बच्चे को सिर्फ़ माँ का दूध चाहिए। 1 साल से छोटे बच्चे को शहद गंभीर रूप से बीमार कर सकता है, और बाकी चीज़ों से संक्रमण हो सकता है।" },
  { myth: "The first thick yellow milk is dirty and should be thrown away.", hi_myth: "पहला गाढ़ा पीला दूध गंदा होता है, उसे फेंक देना चाहिए।",
    fact: "This first milk (colostrum) is the baby's first protection against infection. Give it.", hi_fact: "यह पहला दूध (खीस) बच्चे को संक्रमण से बचाने की पहली सुरक्षा है। उसे ज़रूर पिलाएँ।" },
  { myth: "Kajal in the eyes, or oil, powder or ash on the cord, is good for the baby.", hi_myth: "आँखों में काजल, या नाल पर तेल, पाउडर या राख लगाना बच्चे के लिए अच्छा है।",
    fact: "A baby's eyes need nothing, and the cord should be kept clean and dry. These things can cause infection.", hi_fact: "बच्चे की आँखों में कुछ नहीं लगाना चाहिए, और नाल को साफ़ और सूखा रखना चाहिए। इनसे संक्रमण हो सकता है।" },
  { myth: "After a C-section the mother cannot breastfeed properly.", hi_myth: "सिज़ेरियन के बाद माँ ठीक से दूध नहीं पिला सकती।",
    fact: "Mothers can breastfeed after a C-section. Milk usually comes in within 2 to 5 days. Ask the nurse or ANM to help with a comfortable position.", hi_fact: "सिज़ेरियन के बाद भी माँ दूध पिला सकती है। दूध आमतौर पर 2-5 दिन में उतरता है। आरामदायक पोज़िशन के लिए नर्स या ANM से मदद लें।" },
  { myth: "Feeling sad after the baby means she is ungrateful or weak.", hi_myth: "बच्चे के बाद उदास होने का मतलब है कि वह नाशुक्री या कमज़ोर है।",
    fact: "Postpartum depression is a medical condition that affects about 1 in 5 Indian mothers. It is not her fault, and it improves with support and treatment.", hi_fact: "प्रसवोत्तर अवसाद एक चिकित्सा स्थिति है जो लगभग 5 में से 1 भारतीय माँ को होती है। यह उसकी गलती नहीं है, और सहारे और इलाज से ठीक होता है।" },
  { myth: "After a few days she can go back to housework and lifting.", hi_myth: "कुछ दिनों बाद वह घर के काम और भारी सामान उठाना शुरू कर सकती है।",
    fact: "She needs rest to heal, and after a C-section no heavy lifting until the doctor says it is safe. The family can take over the housework.", hi_fact: "ठीक होने के लिए उसे आराम चाहिए, और सिज़ेरियन के बाद डॉक्टर की इजाज़त तक भारी सामान नहीं उठाना चाहिए। घर का काम परिवार सँभाल सकता है।" },
];

export type Script = { situation: string; hi_situation: string; say: string; hi_say: string; avoid: string; hi_avoid: string };
export const SCRIPTS: Script[] = [
  { situation: "She is crying and cannot say why", hi_situation: "वह रो रही है और बता नहीं पा रही कि क्यों",
    say: "\"I am here. You do not have to explain.\" Sit with her.", hi_say: "\"मैं यहाँ हूँ। तुम्हें समझाने की ज़रूरत नहीं।\" उसके पास बैठें।",
    avoid: "\"You have a healthy baby, why are you sad?\"", hi_avoid: "\"बच्चा स्वस्थ है, फिर उदास क्यों हो?\"" },
  { situation: "She says she is a bad mother or cannot do this", hi_situation: "वह कहती है कि वह बुरी माँ है या यह नहीं कर पाएगी",
    say: "\"You are doing well. Nobody gets this right at first. Let me take the baby for a while.\"", hi_say: "\"तुम अच्छा कर रही हो। शुरू में किसी को यह नहीं आता। थोड़ी देर बच्चे को मुझे दे दो।\"",
    avoid: "\"Other mothers manage fine.\"", hi_avoid: "\"बाकी माँएँ तो आराम से सँभाल लेती हैं।\"" },
  { situation: "She has hardly slept", hi_situation: "वह मुश्किल से सो पाई है",
    say: "\"Go to bed. I will do the 1 am and 4 am feeds.\" Then really do them.", hi_say: "\"तुम सो जाओ। रात 1 और 4 बजे की फ़ीड मैं देख लूँगा/लूँगी।\" और सचमुच करें।",
    avoid: "\"Just sleep when the baby sleeps.\" (on its own)", hi_avoid: "\"बच्चा सोए तब तुम भी सो जाओ।\" (सिर्फ़ यही कहना)" },
  { situation: "A relative criticises how she feeds or holds the baby", hi_situation: "कोई रिश्तेदार उसके दूध पिलाने या बच्चे को पकड़ने पर टोकता है",
    say: "\"She is doing what the doctor and ANM advised.\" Then offer the relative a job, like making tea.", hi_say: "\"वह वही कर रही है जो डॉक्टर और ANM ने बताया है।\" फिर रिश्तेदार को कोई काम दे दें, जैसे चाय बनाना।",
    avoid: "Arguing in front of her, or staying silent while she is criticised.", hi_avoid: "उसके सामने बहस करना, या उसे टोके जाते समय चुप रहना।" },
  { situation: "You are worried it is more than the baby blues", hi_situation: "आपको लगता है कि यह बेबी ब्लूज़ से ज़्यादा है",
    say: "\"I have noticed you have been very low. I love you. Can we talk to a counsellor together?\"", hi_say: "\"मैंने देखा है कि तुम बहुत उदास हो। मैं तुमसे प्यार करता/करती हूँ। क्या हम साथ में किसी काउंसलर से बात कर लें?\"",
    avoid: "\"Snap out of it.\" or \"It is all in your head.\"", hi_avoid: "\"ऐसे मत सोचो।\" या \"यह सब तुम्हारे दिमाग़ का वहम है।\"" },
  { situation: "She talks about harming herself or the baby", hi_situation: "वह खुद को या बच्चे को नुकसान पहुँचाने की बात करती है",
    say: "\"Thank you for telling me. I am staying with you.\" Call 112 or Tele-MANAS 14416 now, and do not leave her alone with the baby.", hi_say: "\"मुझे बताने के लिए धन्यवाद। मैं तुम्हारे साथ हूँ।\" अभी 112 या टेली-मानस 14416 पर कॉल करें, और उसे बच्चे के साथ अकेला न छोड़ें।",
    avoid: "Promising to keep it secret, or waiting to see if it passes.", hi_avoid: "इसे राज़ रखने का वादा करना, या यह देखने के लिए रुकना कि यह अपने आप ठीक हो जाए।" },
];
