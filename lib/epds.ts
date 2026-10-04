// Edinburgh Postnatal Depression Scale - Cox, Holden & Sagovsky (1987).
// Check exact permission terms before submission. Hindi wording is a translation pending clinician review.
export type EpdsOption = { text: string; score: number };
export const EPDS: { q: string; options: EpdsOption[] }[] = [
  { q: "I have been able to laugh and see the funny side of things", options: [{ text: "As much as I always could", score: 0 }, { text: "Not quite so much now", score: 1 }, { text: "Definitely not so much now", score: 2 }, { text: "Not at all", score: 3 }] },
  { q: "I have looked forward with enjoyment to things", options: [{ text: "As much as I ever did", score: 0 }, { text: "Rather less than I used to", score: 1 }, { text: "Definitely less than I used to", score: 2 }, { text: "Hardly at all", score: 3 }] },
  { q: "I have blamed myself unnecessarily when things went wrong", options: [{ text: "Yes, most of the time", score: 3 }, { text: "Yes, some of the time", score: 2 }, { text: "Not very often", score: 1 }, { text: "No, never", score: 0 }] },
  { q: "I have been anxious or worried for no good reason", options: [{ text: "No, not at all", score: 0 }, { text: "Hardly ever", score: 1 }, { text: "Yes, sometimes", score: 2 }, { text: "Yes, very often", score: 3 }] },
  { q: "I have felt scared or panicky for no very good reason", options: [{ text: "Yes, quite a lot", score: 3 }, { text: "Yes, sometimes", score: 2 }, { text: "No, not much", score: 1 }, { text: "No, not at all", score: 0 }] },
  { q: "Things have been getting on top of me", options: [{ text: "Yes, most of the time I haven't been able to cope at all", score: 3 }, { text: "Yes, sometimes I haven't been coping as well as usual", score: 2 }, { text: "No, most of the time I have coped quite well", score: 1 }, { text: "No, I have been coping as well as ever", score: 0 }] },
  { q: "I have been so unhappy that I have had difficulty sleeping", options: [{ text: "Yes, most of the time", score: 3 }, { text: "Yes, sometimes", score: 2 }, { text: "Not very often", score: 1 }, { text: "No, not at all", score: 0 }] },
  { q: "I have felt sad or miserable", options: [{ text: "Yes, most of the time", score: 3 }, { text: "Yes, quite often", score: 2 }, { text: "Not very often", score: 1 }, { text: "No, not at all", score: 0 }] },
  { q: "I have been so unhappy that I have been crying", options: [{ text: "Yes, most of the time", score: 3 }, { text: "Yes, quite often", score: 2 }, { text: "Only occasionally", score: 1 }, { text: "No, never", score: 0 }] },
  { q: "The thought of harming myself has occurred to me", options: [{ text: "Yes, quite often", score: 3 }, { text: "Sometimes", score: 2 }, { text: "Hardly ever", score: 1 }, { text: "Never", score: 0 }] },
];

// Thresholds are data, to be set and signed off by the clinical advisor (Indian studies use 9-13).
export const EPDS_CONFIG = { possible: 10, probable: 13 };

export type EpdsBand = "low" | "possible" | "probable";
export function scoreEpds(answers: number[], cfg: { possible: number; probable: number } = EPDS_CONFIG) {
  const total = answers.reduce((a, b) => a + b, 0);
  const q10 = answers[9] ?? 0;
  const band: EpdsBand = total >= cfg.probable ? "probable" : total >= cfg.possible ? "possible" : "low";
  return { total, band, selfHarm: q10 >= 1 };
}

// Screening schedule (days after birth)
export const EPDS_SCHEDULE = [
  { label: "Week 2 (light check)", day: 14 },
  { label: "Week 6", day: 42 },
  { label: "Month 3", day: 90 },
  { label: "Month 6", day: 180 },
];

export const PARTNER_QS = [
  "Is she sleeping less than usual, even when the baby sleeps?",
  "Is she eating much less (or much more) than usual?",
  "Does she seem withdrawn, quiet, or avoid people?",
  "Does she cry often or seem hopeless?",
  "Does she seem uninterested in or worried about bonding with the baby?",
  "Does she seem very anxious, irritable or panicky?",
];
