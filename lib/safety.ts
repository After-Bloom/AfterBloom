import { hasSelfHarmLanguage } from "./triage";

export { hasSelfHarmLanguage };

// Posts that look like medical advice get an automatic, fixed note. Unsafe advice spreads fast in mother groups.
// Detected: medicine names and doses, "take X for it", home remedies and cures. The software only attaches the note, it never replies.
const ADVICE = /\b(\d+\s?(mg|ml|mcg|tablets?|tabs?|capsules?|drops?)|paracetamol|dolo|crocin|ibuprofen|brufen|combiflam|antibiotics?|amoxicillin|azithromycin|syrup|ointment|dosage|dose|prescri\w+|home remed\w+|gharelu|nuskha|ayurved\w+|kadha|kashayam|you should (take|give|try|stop)|give (him|her|the baby) |cure[sd]?|heals? (it|fast)|works? (for|like magic)|tablet)\b/i;
export const looksLikeMedicalAdvice = (text: string) => ADVICE.test(text);
export const ADVICE_NOTE = "Please check this with your doctor or use the symptom checker.";
export const TOPICS = ["General", "Sleep", "Feeding", "C-section recovery", "Body changes", "In-law pressure", "Returning to work"] as const;
