// Demo accounts (seeded by /api/dev/seed). Remove them before real users arrive: set ENABLE_DEMO=false and delete is_demo profiles.
export const DEMO_DOMAIN = "demo.afterbloom.app";
export const DEMO = {
  priya: { email: `priya@${DEMO_DOMAIN}`, role: "mother", name: "Priya Verma", blurb: "A mother, day 16 after a C-section" },
  rohan: { email: `rohan@${DEMO_DOMAIN}`, role: "family", name: "Rohan Verma", blurb: "Priya's husband" },
  drrao: { email: `dr.rao@${DEMO_DOMAIN}`, role: "pro", name: "Dr. Ananya Rao", blurb: "Sample clinical psychologist" },
  drmehta: { email: `dr.mehta@${DEMO_DOMAIN}`, role: "pro", name: "Dr. Rohan Mehta", blurb: "Sample gynaecologist (blood pressure and recovery)" },
  drsen: { email: `dr.sen@${DEMO_DOMAIN}`, role: "pro", name: "Dr. Kabir Sen", blurb: "Sample psychologist, on call" },
  moderator: { email: `moderator@${DEMO_DOMAIN}`, role: "moderator", name: "Kavita (Bloom Buddy)", blurb: "Circle mentor and moderator" },
  asha: { email: `asha@${DEMO_DOMAIN}`, role: "asha", name: "Sunita Devi (ASHA)", blurb: "Community health worker" },
  admin: { email: `admin@${DEMO_DOMAIN}`, role: "admin", name: "AfterBloom Admin", blurb: "Settings and sign-off" },
} as const;
export type DemoKey = keyof typeof DEMO;
export const HOME_BY_ROLE: Record<string, string> = { mother: "/home", family: "/family-view", pro: "/pro", moderator: "/moderate", asha: "/asha", admin: "/admin" };
