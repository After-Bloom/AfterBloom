// ALL demo data lives here so the live demo is deterministic.
// Professionals and patients are SAMPLE PROFILES, not real clinicians.
import type { State, Checkin } from "./store";
import type { Level } from "./symptoms";

const DAY = 86400000;
const iso = (d: Date) => d.toISOString();

/** Priya, day 9 after a C-section. */
export function seed(): State {
  const now = Date.now();
  const at = (daysAgo: number, h = 10) => iso(new Date(now - daysAgo * DAY - (10 - h) * 3600000));
  const moods = [2, 2, 3, 2, 3, 3, 3, 2, 3];
  const checkins: Checkin[] = moods.slice(0, 8).map((m, i) => ({
    date: at(8 - i), mood: m, appetite: 3 - (i % 3 === 0 ? 1 : 0) + (i > 4 ? 0 : 0), sleepHours: [4, 5, 4, 6, 5, 4, 5, 6][i], level: "GREEN" as Level,
  }));
  return {
    role: "mother", lang: "en",
    mother: { name: "Priya", babyName: "Aarav", birth: at(9), delivery: "C-section", city: "Delhi" },
    checkins, symptomLogs: [{ date: at(6), text: "feeling tired and mild cramps", level: "GREEN", labels: ["Tiredness", "Mild afterpains / cramps"] }],
    epds: [], flags: [],
    family: [{ id: "f1", name: "Rohan", relation: "Husband", sees: { alerts: true, trends: false, weekly: true } }],
    shifts: {}, partnerScreens: [],
    consent: { emergencyAlert: true, shareWithPro: true, familyNote: false, emergencyContact: "Rohan (husband)", cloudMatch: null },
    bookings: [], vaccinesDone: ["birth"], milestonesDone: [], weights: [{ date: at(9), kg: 3.1 }],
    posts: [
      { id: "p1", author: "Meera", anon: false, topic: "Sleep", at: at(1, 22), text: "Week 2 and I feel like I have forgotten what sleep is. Anyone else?" },
      { id: "p2", author: "Bloom Buddy Kavita", anon: false, topic: "Welcome", at: at(1, 20), text: "Welcome mothers 💜 This is your safe corner. You are not alone in how you feel." },
      { id: "p3", author: "Anonymous mother", anon: true, topic: "In-law pressure", at: at(0, 8), text: "My mother-in-law keeps saying I should not feel sad because I have a healthy baby. It hurts." },
    ],
    mod: [], alerts: [],
    audit: [{ at: at(1, 17), who: "Dr. Ananya Rao (sample)", what: "Viewed Priya's weekly summary" }],
    pin: null, joinedCircle: false, neutralNotif: true,
  };
}


export type Pro = { id: string; name: string; role: "Clinical psychologist" | "Counsellor" | "Psychiatrist"; qual: string; reg: string; langs: string[]; fee: number; for: string };
export const PROS: Pro[] = [
  { id: "p1", name: "Dr. Ananya Rao", role: "Clinical psychologist", qual: "M.Phil. Clinical Psychology", reg: "RCI CRR No. A12345 (sample)", langs: ["English", "Hindi"], fee: 600, for: "Talk therapy for postpartum low mood and anxiety" },
  { id: "p2", name: "Ms. Neha Kulkarni", role: "Counsellor", qual: "M.A. Counselling Psychology", reg: "RCI CRR No. A67890 (sample)", langs: ["Hindi", "Marathi", "English"], fee: 400, for: "Supportive counselling, sleep and adjustment" },
  { id: "p3", name: "Dr. Vikram Sethi", role: "Psychiatrist", qual: "MD Psychiatry", reg: "Medical Council Reg. No. 54321 (sample)", langs: ["English", "Hindi"], fee: 1200, for: "Diagnosis and medication decisions" },
];
export const SLOTS = ["Today 6:00 PM", "Today 8:00 PM", "Tomorrow 10:00 AM", "Tomorrow 4:30 PM", "Day after 11:00 AM"];

export type Patient = { id: string; name: string; day: number; epds: { d: string; score: number }[]; tags: string[]; urgent?: string; mood: number[]; sleep: number[]; flaggedAgoH?: number };
export const SAMPLE_PATIENTS: Patient[] = [
  { id: "s1", name: "Anita Sharma (sample)", day: 31, epds: [{ d: "Week 2", score: 9 }, { d: "Week 4", score: 15 }], tags: ["Probable depression"], mood: [3, 3, 2, 2, 2, 1, 2, 2], sleep: [5, 4, 4, 3, 4, 3, 4, 3], flaggedAgoH: 10 },
  { id: "s2", name: "Meera Iyer (sample)", day: 18, epds: [{ d: "Week 2", score: 6 }], tags: [], mood: [4, 4, 3, 4, 4, 3, 4, 4], sleep: [6, 6, 7, 5, 6, 6, 7, 6] },
  { id: "s3", name: "Sunita Devi (sample)", day: 40, epds: [{ d: "Week 2", score: 11 }, { d: "Week 6", score: 11 }], tags: ["Possible depression", "BP logged"], mood: [3, 3, 3, 2, 3, 3, 3, 3], sleep: [5, 5, 4, 5, 5, 6, 5, 5] },
];
