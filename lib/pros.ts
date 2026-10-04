// SAMPLE PROFILES for the demo - not real clinicians. Real onboarding needs a hospital or clinical partner.
export type Pro = { id: string; name: string; role: "Clinical psychologist" | "Counsellor" | "Psychiatrist"; qual: string; reg: string; langs: string[]; fee: number; for: string };
export const PROS: Pro[] = [
  { id: "p1", name: "Dr. Ananya Rao", role: "Clinical psychologist", qual: "M.Phil. Clinical Psychology", reg: "RCI CRR No. A12345 (sample)", langs: ["English", "Hindi"], fee: 600, for: "Talk therapy for postpartum low mood and anxiety" },
  { id: "p2", name: "Ms. Neha Kulkarni", role: "Counsellor", qual: "M.A. Counselling Psychology", reg: "RCI CRR No. A67890 (sample)", langs: ["Hindi", "Marathi", "English"], fee: 400, for: "Supportive counselling, sleep and adjustment" },
  { id: "p3", name: "Dr. Vikram Sethi", role: "Psychiatrist", qual: "MD Psychiatry", reg: "Medical Council Reg. No. 54321 (sample)", langs: ["English", "Hindi"], fee: 1200, for: "Diagnosis and medication decisions" },
];
export const SLOTS = ["Today 6:00 PM", "Today 8:00 PM", "Tomorrow 10:00 AM", "Tomorrow 4:30 PM", "Day after 11:00 AM"];

export type Patient = { id: string; name: string; day: number; epds: { d: string; score: number }[]; tags: string[]; urgent?: string; mood: number[]; sleep: number[] };
export const SAMPLE_PATIENTS: Patient[] = [
  { id: "s1", name: "Anita Sharma (sample)", day: 31, epds: [{ d: "Week 2", score: 9 }, { d: "Week 4", score: 15 }], tags: ["Probable depression"], mood: [3, 3, 2, 2, 2, 1, 2, 2], sleep: [5, 4, 4, 3, 4, 3, 4, 3] },
  { id: "s2", name: "Meera Iyer (sample)", day: 18, epds: [{ d: "Week 2", score: 6 }], tags: [], mood: [4, 4, 3, 4, 4, 3, 4, 4], sleep: [6, 6, 7, 5, 6, 6, 7, 6] },
  { id: "s3", name: "Sunita Devi (sample)", day: 40, epds: [{ d: "Week 2", score: 11 }, { d: "Week 6", score: 11 }], tags: ["Possible depression", "BP logged"], mood: [3, 3, 3, 2, 3, 3, 3, 3], sleep: [5, 5, 4, 5, 5, 6, 5, 5] },
];
