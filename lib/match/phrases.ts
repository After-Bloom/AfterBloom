import { SYMPTOMS } from "../symptoms";

/**
 * Background class: everyday off-topic requests. If the nearest phrase to what she typed is one of these, hosted matching
 * returns nothing instead of forcing a weak symptom suggestion. Keep these DIFFERENT from the test phrases in data/match-eval.json.
 */
export const OFF_TOPIC_ID = "__none";
export const OFF_TOPIC = [
  "what time is it", "tell me a joke", "open the settings", "order groceries online", "book movie tickets", "train timing to Pune",
  "how to change the language", "reset my PIN", "update my phone number", "what is the capital of India", "share this app with a friend",
  "recipe for khichdi", "best cooking oil", "shopping sale discount", "cricket match tonight", "bollywood songs", "wifi is not working",
  "phone battery is low", "how to download a pdf", "send a message to my sister", "hello", "hi there", "thank you", "good morning",
  "who made this app", "how much does it cost", "what is the date today", "play some music", "set an alarm for 6 am", "traffic on the way to office",
  "buy baby clothes", "name ideas for my baby", "baby photo shoot", "birthday party decorations", "school admission forms", "home loan interest rate",
  "gold price today", "weather forecast tomorrow", "news headlines", "stock market", "how to learn english", "yoga classes near me",
  "salon appointment", "taxi to the airport", "electricity bill payment", "mobile recharge", "aadhaar card update", "festival date this year",
  "aaj mausam kaisa hai", "khana kya banau", "gaana chalao", "mera naam badlo", "paise kitne lagenge", "namaste", "dhanyavaad", "ok", "test message",
];

/** Every phrase that gets embedded for a symptom: its label, its keywords, and a natural first-person sentence. */
export function symptomPhrases() {
  const out: { id: string; text: string }[] = [];
  for (const s of SYMPTOMS) {
    const seen = new Set<string>();
    const add = (text: string) => { const k = text.trim().toLowerCase(); if (k && !seen.has(k)) { seen.add(k); out.push({ id: s.id, text: text.trim() }); } };
    add(s.label);
    s.keywords.forEach(add);
    add(s.who === "baby" ? `My baby: ${s.label.toLowerCase()}` : `I have ${s.label.toLowerCase()}`);
  }
  for (const text of OFF_TOPIC) out.push({ id: OFF_TOPIC_ID, text });
  return out;
}
