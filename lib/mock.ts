// ALL demo data lives here so the live demo is deterministic. Everything is a SAMPLE: nobody here is a real clinician or patient.
// /api/dev/seed turns this into real accounts and rows in the database.
export const DEMO_HOSPITAL = "00000000-0000-0000-0000-0000000000a1";

export type DemoPro = { key: string; email: string; name: string; title: string; qualification: string; reg_no: string; langs: string[]; fee: number; bio: string; loginKey?: string };
export const DEMO_PROS: DemoPro[] = [
  { key: "drrao", email: "dr.rao@demo.afterbloom.app", name: "Dr. Ananya Rao", title: "Clinical psychologist", qualification: "M.Phil. Clinical Psychology", reg_no: "RCI CRR No. A12345 (sample)", langs: ["English", "Hindi"], fee: 600, bio: "Talk therapy for postpartum low mood and anxiety" },
  { key: "neha", email: "neha.kulkarni@demo.afterbloom.app", name: "Ms. Neha Kulkarni", title: "Counsellor", qualification: "M.A. Counselling Psychology", reg_no: "RCI CRR No. A67890 (sample)", langs: ["Hindi", "Marathi", "English"], fee: 400, bio: "Supportive counselling, sleep and adjustment" },
  { key: "sethi", email: "vikram.sethi@demo.afterbloom.app", name: "Dr. Vikram Sethi", title: "Psychiatrist", qualification: "MD Psychiatry", reg_no: "Medical Council Reg. No. 54321 (sample)", langs: ["English", "Hindi"], fee: 1200, bio: "Diagnosis and medication decisions" },
  { key: "shah", email: "meenal.shah@demo.afterbloom.app", name: "Dr. Meenal Shah", title: "Gynaecologist", qualification: "MS Obstetrics and Gynaecology", reg_no: "Medical Council Reg. No. 77120 (sample)", langs: ["English", "Hindi", "Gujarati"], fee: 800, bio: "Postnatal recovery, wounds, bleeding and contraception" },
  { key: "nair", email: "pooja.nair@demo.afterbloom.app", name: "Ms. Pooja Nair", title: "Lactation consultant", qualification: "IBCLC", reg_no: "IBLCE ID 9981 (sample)", langs: ["English", "Malayalam", "Hindi"], fee: 500, bio: "Latching, supply, pumping and weaning" },
];

export type DemoMother = {
  key: string; email: string; name: string; city: string; baby: string; day: number; delivery: "Normal" | "C-section";
  mood: number[]; sleep: number[]; appetite?: number[]; epds: { daysAgo: number; score: number }[]; bp?: { sys: number; dia: number }; flagAgoH?: number; family?: boolean; emergencyAlert?: boolean;
};
export const DEMO_MOTHERS: DemoMother[] = [
  { key: "priya", email: "priya@demo.afterbloom.app", name: "Priya Verma", city: "Delhi", baby: "Aarav", day: 9, delivery: "C-section", mood: [2, 2, 3, 2, 3, 3, 3, 2], sleep: [4, 5, 4, 6, 5, 4, 5, 6], epds: [], family: true, emergencyAlert: true },
  { key: "anita", email: "anita.sharma@demo.afterbloom.app", name: "Anita Sharma (sample)", city: "Delhi", baby: "Diya", day: 31, delivery: "Normal", mood: [3, 3, 2, 2, 2, 1, 2, 2], sleep: [5, 4, 4, 3, 4, 3, 4, 3], epds: [{ daysAgo: 17, score: 9 }, { daysAgo: 2, score: 15 }], flagAgoH: 10 },
  { key: "meera", email: "meera.iyer@demo.afterbloom.app", name: "Meera Iyer (sample)", city: "Delhi", baby: "Kabir", day: 18, delivery: "Normal", mood: [4, 4, 3, 4, 4, 3, 4, 4], sleep: [6, 6, 7, 5, 6, 6, 7, 6], epds: [{ daysAgo: 4, score: 6 }] },
  { key: "sunita", email: "sunita.devi@demo.afterbloom.app", name: "Sunita Devi (sample)", city: "Delhi", baby: "Riya", day: 40, delivery: "Normal", mood: [3, 3, 3, 2, 3, 3, 3, 3], sleep: [5, 5, 4, 5, 5, 6, 5, 5], epds: [{ daysAgo: 26, score: 11 }, { daysAgo: 1, score: 11 }], bp: { sys: 146, dia: 94 } },
];

export const DEMO_STAFF = {
  moderator: { email: "moderator@demo.afterbloom.app", name: "Kavita (Bloom Buddy)", role: "moderator" },
  asha: { email: "asha@demo.afterbloom.app", name: "Sunita Devi (ASHA)", role: "asha" },
  admin: { email: "admin@demo.afterbloom.app", name: "AfterBloom Admin", role: "admin" },
  rohan: { email: "rohan@demo.afterbloom.app", name: "Rohan Verma", role: "family" },
} as const;

// Opening conversation in the demo circle (alias, topic, text, hoursAgo, anon?)
export const DEMO_POSTS: { alias: string; topic: string; text: string; hoursAgo: number; anon?: boolean; mod?: boolean }[] = [
  { alias: "Bloom Buddy Kavita", topic: "Welcome", text: "Welcome, mothers. This is your safe corner. You are not alone in how you feel.", hoursAgo: 40, mod: true },
  { alias: "Meera", topic: "Sleep", text: "Week 2 and I feel like I have forgotten what sleep is. Anyone else?", hoursAgo: 26 },
  { alias: "Anonymous mother", topic: "In-law pressure", text: "My mother-in-law keeps saying I should not feel sad because I have a healthy baby. It hurts.", hoursAgo: 9, anon: true },
];

export const SLOTS = ["Today 6:00 PM", "Today 8:00 PM", "Tomorrow 10:00 AM", "Tomorrow 4:30 PM", "Day after 11:00 AM"];
