import type { Concern } from "../types/cases.ts";

// The plain-words title of a case, one per concern. English is stored on the case; the screen shows Hindi when the doctor's language is Hindi.
export const CASE_TITLE: Record<Concern, { en: string; hi: string }> = {
  HYPERTENSIVE: { en: "Possible high blood pressure after birth", hi: "प्रसव के बाद संभावित हाई ब्लड प्रेशर" },
  HAEMORRHAGE: { en: "Possible heavy bleeding", hi: "संभावित भारी रक्तस्राव" },
  INFECTION: { en: "Possible infection", hi: "संभावित संक्रमण" },
  CLOT_RISK: { en: "Possible blood clot or breathing problem", hi: "संभावित खून का थक्का या साँस की समस्या" },
  MOOD: { en: "Low mood or worry after birth", hi: "प्रसव के बाद उदासी या चिंता" },
  SELF_HARM: { en: "Safety concern: thoughts of self-harm", hi: "सुरक्षा की चिंता: खुद को नुकसान के विचार" },
  NEWBORN: { en: "Baby needs a check", hi: "शिशु की जाँच ज़रूरी" },
  ENGAGEMENT: { en: "Has stopped checking in", hi: "चेक-इन बंद कर दिया है" },
  GENERAL: { en: "Symptom that needs a look", hi: "ऐसा लक्षण जिसे देखना ज़रूरी है" },
};
