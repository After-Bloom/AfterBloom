import { Activity, Baby, BookHeart, CalendarCheck, FileText, HeartHandshake, Lock, MessageCircleHeart, ShieldPlus, Stethoscope, Users, Video, Brain, Home } from "lucide-react";

export type Feature = { href: string; key: string; title: string; desc: string; icon: any; tag?: "MVP" | "Stretch"; roles: ("mother" | "family" | "pro")[] };
export const FEATURES: Feature[] = [
  { href: "/check", key: "symptoms", title: "Symptom checker", desc: "Is this normal? Tell us in your own words.", icon: Stethoscope, roles: ["mother"] },
  { href: "/checkin", key: "checkin", title: "Daily check-in", desc: "30 seconds. Mood, sleep, danger signs.", icon: CalendarCheck, roles: ["mother"] },
  { href: "/screening", key: "mind", title: "Mind check (EPDS)", desc: "A routine wellness check for every new mother.", icon: Brain, roles: ["mother"] },
  { href: "/care", key: "care", title: "Talk to a professional", desc: "Video sessions. Free Tele-MANAS always shown.", icon: Video, roles: ["mother"] },
  { href: "/circles", key: "circles", title: "Bloom Circles", desc: "A small, safe group of mothers at your stage.", icon: MessageCircleHeart, roles: ["mother"] },
  { href: "/baby", key: "baby", title: "Baby care", desc: "Vaccines, growth, milestones, benefits.", icon: Baby, roles: ["mother", "family"] },
  { href: "/family", key: "family", title: "Family circle", desc: "Invite family and choose what they see.", icon: HeartHandshake, roles: ["mother"] },
  { href: "/report", key: "report", title: "Weekly report", desc: "Your week, and a one-page summary for your doctor.", icon: FileText, roles: ["mother"] },
  { href: "/privacy", key: "privacy", title: "Privacy & safety", desc: "PIN lock, quick exit, consent controls.", icon: Lock, roles: ["mother", "family", "pro"] },
  { href: "/family-view", key: "fview", title: "Family home", desc: "Learn, help, share night feeds.", icon: BookHeart, roles: ["family"] },
  { href: "/pro", key: "pro", title: "Professional dashboard", desc: "Patients by urgency, callbacks, moderation.", icon: Activity, roles: ["pro"] },
  { href: "/asha", key: "asha", title: "ASHA dashboard", desc: "Mothers in your area sorted by risk.", icon: Users, tag: "Stretch", roles: ["pro"] },
];
export const navFor = (role: string) => FEATURES.filter((f) => f.roles.includes(role as any));
export { Home, ShieldPlus };
export const HOME_BY_ROLE = { mother: "/home", family: "/family-view", pro: "/pro" } as const;
