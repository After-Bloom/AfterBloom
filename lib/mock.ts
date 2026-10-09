// ALL demo data lives here so the live demo is deterministic. Everything is a SAMPLE: nobody here is a real clinician or patient.
// /api/dev/seed turns this into real accounts and rows in the database.
export const DEMO_HOSPITAL = "00000000-0000-0000-0000-0000000000a1";

export type DemoPro = {
  key: string; email: string; name: string; title: string; qualification: string; reg_no: string; langs: string[]; fee: number; bio: string; loginKey?: string;
  /** continuity of care: what they handle, whether they are working, how many open urgent items they take before new mothers go to a colleague, and the on-call backup */
  specialty: "psychologist" | "gynaecologist" | "paediatrician" | "lactation"; onDuty?: boolean; maxOpen?: number; onCall?: boolean;
};
export const DEMO_PROS: DemoPro[] = [
  // Dr Rao is seeded at capacity (1 of 1) so the demo shows a new mother being routed to Dr Sen, while a returning mother stays with Dr Rao
  { key: "drrao", email: "dr.rao@demo.afterbloom.app", name: "Dr. Ananya Rao", title: "Clinical psychologist", qualification: "M.Phil. Clinical Psychology", reg_no: "RCI CRR No. A12345 (sample)", langs: ["English", "Hindi"], fee: 600, bio: "Talk therapy for postpartum low mood and anxiety", specialty: "psychologist", maxOpen: 1 },
  { key: "sen", email: "dr.sen@demo.afterbloom.app", name: "Dr. Kabir Sen", title: "Clinical psychologist", qualification: "M.Phil. Clinical Psychology", reg_no: "RCI CRR No. A24680 (sample)", langs: ["English", "Hindi", "Bengali"], fee: 600, bio: "Postpartum mood and anxiety. On-call backup for the care team", specialty: "psychologist", onCall: true },
  { key: "mehta", email: "dr.mehta@demo.afterbloom.app", name: "Dr. Rohan Mehta", title: "Gynaecologist", qualification: "MS Obstetrics and Gynaecology", reg_no: "Medical Council Reg. No. 66231 (sample)", langs: ["English", "Hindi"], fee: 800, bio: "Postnatal recovery, blood pressure after birth, bleeding and infection", specialty: "gynaecologist" },
  // the rest of the sample team are off duty in the demo, so the routing story (Rao, Sen, Mehta) is the same every time
  { key: "neha", email: "neha.kulkarni@demo.afterbloom.app", name: "Ms. Neha Kulkarni", title: "Counsellor", qualification: "M.A. Counselling Psychology", reg_no: "RCI CRR No. A67890 (sample)", langs: ["Hindi", "Marathi", "English"], fee: 400, bio: "Supportive counselling, sleep and adjustment", specialty: "psychologist", onDuty: false },
  { key: "sethi", email: "vikram.sethi@demo.afterbloom.app", name: "Dr. Vikram Sethi", title: "Psychiatrist", qualification: "MD Psychiatry", reg_no: "Medical Council Reg. No. 54321 (sample)", langs: ["English", "Hindi"], fee: 1200, bio: "Diagnosis and medication decisions", specialty: "psychologist", onDuty: false },
  { key: "shah", email: "meenal.shah@demo.afterbloom.app", name: "Dr. Meenal Shah", title: "Gynaecologist", qualification: "MS Obstetrics and Gynaecology", reg_no: "Medical Council Reg. No. 77120 (sample)", langs: ["English", "Hindi", "Gujarati"], fee: 800, bio: "Postnatal recovery, wounds, bleeding and contraception", specialty: "gynaecologist", onDuty: false },
  { key: "bhatt", email: "arjun.bhatt@demo.afterbloom.app", name: "Dr. Arjun Bhatt", title: "Paediatrician", qualification: "MD Paediatrics", reg_no: "Medical Council Reg. No. 90417 (sample)", langs: ["English", "Hindi"], fee: 700, bio: "Newborn feeding, jaundice, weight gain and vaccines", specialty: "paediatrician" },
  { key: "nair", email: "pooja.nair@demo.afterbloom.app", name: "Ms. Pooja Nair", title: "Lactation consultant", qualification: "IBCLC", reg_no: "IBLCE ID 9981 (sample)", langs: ["English", "Malayalam", "Hindi"], fee: 500, bio: "Latching, supply, pumping and weaning", specialty: "lactation" },
];

export type DemoMother = {
  key: string; email: string; name: string; city: string; baby: string; day: number; delivery: "Normal" | "C-section";
  mood: number[]; sleep: number[]; appetite?: number[]; epds: { daysAgo: number; score: number }[]; bp?: { sys: number; dia: number }; flagAgoH?: number; family?: boolean; emergencyAlert?: boolean;
  /** a blood pressure for every check-in (oldest first), instead of only the last one */
  bpSeries?: { sys: number; dia: number }[];
  /** recovery profile (what made this pregnancy or birth higher risk) */
  risk?: Record<string, boolean>;
  /** not matched with Dr Rao by default: the routing rules (least busy, on duty, below their limit) pick the professional */
  routed?: boolean;
};

// Priya's blood pressure and sleep for days 3 to 15: normal, so the later rise stands out on the chart
const PRIYA_BP = [[118, 76], [120, 78], [122, 80], [119, 77], [121, 79], [124, 81], [120, 78], [118, 76], [123, 80], [125, 82], [121, 79], [119, 77], [122, 80]].map(([sys, dia]) => ({ sys, dia }));
export const DEMO_MOTHERS: DemoMother[] = [
  { key: "priya", email: "priya@demo.afterbloom.app", name: "Priya Verma", city: "Delhi", baby: "Aarav", day: 16, delivery: "C-section", mood: [3, 2, 3, 3, 4, 3, 3, 4, 3, 3, 3, 2, 3], sleep: [5, 5.5, 6, 5, 5.5, 6, 5.5, 5, 6, 5.5, 5.5, 5, 5.5], epds: [{ daysAgo: 2, score: 11 }], family: true, emergencyAlert: true, bpSeries: PRIYA_BP, risk: { set: true, htn: true, csection: true } },
  { key: "anita", email: "anita.sharma@demo.afterbloom.app", name: "Anita Sharma (sample)", city: "Delhi", baby: "Diya", day: 31, delivery: "Normal", mood: [3, 3, 2, 2, 2, 1, 2, 2], sleep: [5, 4, 4, 3, 4, 3, 4, 3], epds: [{ daysAgo: 17, score: 9 }, { daysAgo: 2, score: 15 }], flagAgoH: 10 },
  { key: "meera", email: "meera.iyer@demo.afterbloom.app", name: "Meera Iyer (sample)", city: "Delhi", baby: "Kabir", day: 18, delivery: "Normal", mood: [4, 4, 3, 4, 4, 3, 4, 4], sleep: [6, 6, 7, 5, 6, 6, 7, 6], epds: [{ daysAgo: 4, score: 6 }] },
  { key: "kavya", email: "kavya.nair@demo.afterbloom.app", name: "Kavya Nair (sample)", city: "Delhi", baby: "Ishaan", day: 90, delivery: "Normal", mood: [3, 3, 3, 2, 3, 3, 3, 3], sleep: [6, 6, 5, 6, 5, 6, 6, 5], epds: [{ daysAgo: 3, score: 10 }], routed: true },
  { key: "anjali", email: "anjali.kulkarni@demo.afterbloom.app", name: "Anjali Kulkarni (sample)", city: "Delhi", baby: "Myra", day: 5, delivery: "Normal", mood: [4, 3, 3, 4], sleep: [5, 4, 5, 5], epds: [], routed: true },
  { key: "sunita", email: "sunita.devi@demo.afterbloom.app", name: "Sunita Devi (sample)", city: "Delhi", baby: "Riya", day: 40, delivery: "Normal", mood: [3, 3, 3, 2, 3, 3, 3, 3], sleep: [5, 5, 4, 5, 5, 6, 5, 5], epds: [{ daysAgo: 26, score: 11 }, { daysAgo: 1, score: 11 }], bp: { sys: 146, dia: 94 } },
];

export const DEMO_STAFF = {
  moderator: { email: "moderator@demo.afterbloom.app", name: "Kavita (Bloom Buddy)", role: "moderator" },
  asha: { email: "asha@demo.afterbloom.app", name: "Sunita Devi (ASHA)", role: "asha" },
  admin: { email: "admin@demo.afterbloom.app", name: "AfterBloom Admin", role: "admin" },
  rohan: { email: "rohan@demo.afterbloom.app", name: "Rohan Verma", role: "family" },
  kamla: { email: "kamla@demo.afterbloom.app", name: "Kamla Verma", role: "family" },
} as const;

// Opening conversation in the demo circle (alias, topic, text, hoursAgo, anon?)
export const DEMO_POSTS: { alias: string; topic: string; text: string; hoursAgo: number; anon?: boolean; mod?: boolean }[] = [
  { alias: "Bloom Buddy Kavita", topic: "Welcome", text: "Welcome, mothers. This is your safe corner. You are not alone in how you feel.", hoursAgo: 40, mod: true },
  { alias: "Meera", topic: "Sleep", text: "Week 2 and I feel like I have forgotten what sleep is. Anyone else?", hoursAgo: 26 },
  { alias: "Anonymous mother", topic: "In-law pressure", text: "My mother-in-law keeps saying I should not feel sad because I have a healthy baby. It hurts.", hoursAgo: 9, anon: true },
];

export const SLOTS = ["Today 6:00 PM", "Today 8:00 PM", "Tomorrow 10:00 AM", "Tomorrow 4:30 PM", "Day after 11:00 AM"];
