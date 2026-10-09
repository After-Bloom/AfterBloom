// Browsing Ask Bloom without typing: categories, the weeks a topic matters most, and related topics.
// Plain data. Every topic id here must exist in knowledge.ts (tests/ask.test.ts checks this).

export type Category = "body" | "feelings" | "feeding" | "baby" | "family" | "admin";
export type Stage = "week1" | "weeks2to6" | "months2to6";

export const CATEGORIES: { id: Category; label: string; hi: string }[] = [
  { id: "body", label: "My body", hi: "मेरा शरीर" },
  { id: "feelings", label: "Feelings and sleep", hi: "मन और नींद" },
  { id: "feeding", label: "Feeding", hi: "दूध पिलाना" },
  { id: "baby", label: "Baby care", hi: "बच्चे की देखभाल" },
  { id: "family", label: "For family", hi: "परिवार के लिए" },
  { id: "admin", label: "Benefits and paperwork", hi: "योजनाएं और कागज़" },
];

export const STAGES: { id: Stage; label: string; hi: string; from: number; to: number }[] = [
  { id: "week1", label: "Week 1", hi: "पहला हफ़्ता", from: 0, to: 7 },
  { id: "weeks2to6", label: "Weeks 2 to 6", hi: "हफ़्ते 2 से 6", from: 8, to: 42 },
  { id: "months2to6", label: "Months 2 to 6", hi: "महीने 2 से 6", from: 43, to: 183 },
];

export const META: Record<string, { cat: Category; stages: Stage[]; related: string[] }> = {
  lochia: { cat: "body", stages: ["week1", "weeks2to6"], related: ["afterpains", "checkups", "intimacy"] },
  afterpains: { cat: "body", stages: ["week1"], related: ["lochia", "b_feeds", "constipation"] },
  csection_wound: { cat: "body", stages: ["week1", "weeks2to6"], related: ["exercise", "constipation", "checkups"] },
  stitches: { cat: "body", stages: ["week1", "weeks2to6"], related: ["constipation", "lochia", "checkups"] },
  blues_vs_ppd: { cat: "feelings", stages: ["week1", "weeks2to6", "months2to6"], related: ["sleep", "f_ppd", "f_help"] },
  sleep: { cat: "feelings", stages: ["week1", "weeks2to6", "months2to6"], related: ["blues_vs_ppd", "b_sleep", "f_help"] },
  diet: { cat: "body", stages: ["week1", "weeks2to6", "months2to6"], related: ["low_milk", "constipation", "hair"] },
  exercise: { cat: "body", stages: ["weeks2to6", "months2to6"], related: ["csection_wound", "diet", "checkups"] },
  intimacy: { cat: "body", stages: ["weeks2to6", "months2to6"], related: ["checkups", "lochia", "blues_vs_ppd"] },
  constipation: { cat: "body", stages: ["week1", "weeks2to6"], related: ["diet", "stitches", "csection_wound"] },
  hair: { cat: "body", stages: ["months2to6"], related: ["diet", "sleep", "checkups"] },
  engorgement: { cat: "feeding", stages: ["week1", "weeks2to6"], related: ["nipples", "low_milk", "b_feeds"] },
  nipples: { cat: "feeding", stages: ["week1", "weeks2to6"], related: ["engorgement", "low_milk", "b_feeds"] },
  low_milk: { cat: "feeding", stages: ["week1", "weeks2to6", "months2to6"], related: ["b_feeds", "diet", "nipples"] },
  checkups: { cat: "body", stages: ["week1", "weeks2to6"], related: ["b_vaccines", "intimacy", "exercise"] },
  b_feeds: { cat: "feeding", stages: ["week1", "weeks2to6", "months2to6"], related: ["low_milk", "b_only_milk", "b_stool"] },
  b_only_milk: { cat: "feeding", stages: ["week1", "weeks2to6", "months2to6"], related: ["b_feeds", "b_spit", "low_milk"] },
  b_stool: { cat: "baby", stages: ["week1", "weeks2to6", "months2to6"], related: ["b_feeds", "b_jaundice", "b_spit"] },
  b_jaundice: { cat: "baby", stages: ["week1", "weeks2to6"], related: ["b_feeds", "b_stool", "b_fever"] },
  b_cord: { cat: "baby", stages: ["week1", "weeks2to6"], related: ["b_fever", "b_sleep", "b_vaccines"] },
  b_sleep: { cat: "baby", stages: ["week1", "weeks2to6", "months2to6"], related: ["b_cry", "sleep", "b_feeds"] },
  b_cry: { cat: "baby", stages: ["week1", "weeks2to6", "months2to6"], related: ["b_sleep", "b_feeds", "b_fever"] },
  b_fever: { cat: "baby", stages: ["week1", "weeks2to6", "months2to6"], related: ["b_feeds", "b_cry", "b_vaccines"] },
  b_spit: { cat: "baby", stages: ["week1", "weeks2to6", "months2to6"], related: ["b_feeds", "b_only_milk", "b_stool"] },
  b_vaccines: { cat: "baby", stages: ["week1", "weeks2to6", "months2to6"], related: ["checkups", "b_fever", "b_cord"] },
  f_help: { cat: "family", stages: ["week1", "weeks2to6", "months2to6"], related: ["f_ppd", "sleep", "b_feeds"] },
  f_ppd: { cat: "family", stages: ["week1", "weeks2to6", "months2to6"], related: ["f_help", "blues_vs_ppd", "sleep"] },
};

export const stageOf = (day: number): Stage => (STAGES.find((s) => day >= s.from && day <= s.to)?.id ?? "months2to6");
export const relatedTo = (id: string) => META[id]?.related ?? [];
