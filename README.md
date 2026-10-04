# AfterBloom

**A postpartum care platform for Indian mothers, their families and their babies.**
She Solves 3.0 · Web & Software Development Track · Domain: Health

> "After the baby comes home, everyone checks on the baby. AfterBloom checks on the mother."

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Proposed Solution](#2-proposed-solution)
3. [Features](#3-features)
4. [Technologies / Tech Stack Used](#4-technologies--tech-stack-used)
5. [Installation & Setup Instructions](#5-installation--setup-instructions)
6. [How to Run the Project](#6-how-to-run-the-project)
7. [Project Structure](#7-project-structure)
8. [Safety & Design Principles](#8-safety--design-principles)
9. [Current Status & Limitations](#9-current-status--limitations)
10. [Items to Confirm Before Submission](#10-items-to-confirm-before-submission)

---

## 1. Problem Statement

Childbirth in India is now mostly safe inside the hospital, but the weeks after discharge are not. Care is intense up to delivery, then the mother goes home after a short stay with very little structured follow-up for her own body or mind.

| Fact | Figure | Source |
|---|---|---|
| Indian mothers who screen positive for postpartum depression (PPD) | About 22% (roughly 1 in 5) | Upadhyay et al., *Bulletin of the WHO*, 2017 (38 studies, 20,043 women) |
| Maternal mortality ratio | 87 per 100,000 live births (88 the year before) | SRS Special Bulletin 2022–24 |
| Share of maternal deaths after delivery and discharge | About one-third | NHM, "Optimizing Postnatal Care" guidance note |
| People with common mental disorders who receive no treatment | 85% | National Mental Health Survey 2015–16 (NIMHANS) |

**Why mothers fall through the gap**

- **Silence after discharge.** NFHS-5 (2019–21): 78% of mothers get a postnatal check within 2 days, mostly in hospital. Only about half get complete, good-quality postnatal care. Bleeding, infection and high blood pressure often appear days or weeks later, at home.
- **Depression goes unseen.** PPD is not routinely screened in India's standard home-visit programme. Stigma and the belief that a new mother should feel only joy stop mothers from speaking up.
- **Help is scarce and scattered.** About 0.75 psychiatrists per 100,000 people. The national helpline is general-purpose, and popular parenting apps offer content and baby trackers but no clinical screening or escalation.
- **The baby suffers too.** Children of depressed mothers are more likely to be underweight (OR 1.5) and stunted (OR 1.4) (Surkan et al., 2011).

No single product in India combines validated depression screening, daily physical danger-sign checks for mother and baby, a hard-coded crisis route, clinician follow-up, family involvement, and Hindi-friendly design.

## 2. Proposed Solution

AfterBloom is a **mobile-first, installable web app** with one shared record and three kinds of users. The mother controls what each of the others can see.

| User | What AfterBloom gives them |
|---|---|
| **The mother** | Guided symptom checker, daily check-in, depression screening, video sessions, crisis help, baby schedule, Bloom Circles community, weekly health report |
| **Her family** | Plain-language education, a "how to actually help" guide, a short partner screening, a night-feed planner, alerts she has agreed to share, a weekly "how to help" note |
| **Professionals** | A dashboard of patients' screening results, mood trends and urgent flags, plus an audit log (and, later, an ASHA worker dashboard) |

AfterBloom's role is to **detect early and route quickly into human care**, including the free services that already exist (Tele-MANAS 14416, 112).

## 3. Features

Everything below is built into the app. "Next" marks features shown as a lighter version with a clear "planned next" note.

| # | Feature | What it does |
|---|---|---|
| 1 | **Symptom checker** | Type or speak in English, Hindi (Devanagari) or Hinglish. Step 1: red-flag keyword check (no AI). Step 2: spelling-tolerant matching against ~50 postpartum/newborn symptoms. Step 3: confidence check ("Did you mean…?" or "speak to a doctor" – it never guesses). Step 4: clinician-style red/amber/green triage table; the most severe colour wins. Separate mother and baby lists. |
| 2 | **Daily check-in** | 30-second tap check-in: mood, appetite, sleep, danger signs (bleeding, fever, headache, wound, breathing) and optional home BP. Same triage table as the symptom checker. Trend charts. BP ≥160/110 or headache with vision change triggers RED. |
| 3 | **Mind check (EPDS)** | The 10-question Edinburgh Postnatal Depression Scale, scored with plain arithmetic. 0–9 low · 10–12 possible · 13+ probable. Probable: she sees only "Our care team will be in touch" and the result is flagged for her psychologist (24–48 h callback). Question 10 ≥1 overrides everything with the crisis screen and an urgent flag. Screening schedule: week 2, week 6, month 3, month 6. |
| 4 | **Professional care** | Browse sample psychologists, counsellors and psychiatrists with qualification and registration number shown. Book a slot and join an embedded Jitsi video room. Free Tele-MANAS is always shown beside paid options. |
| 5 | **Crisis protocol** | Full-screen red crisis view with one-tap Tele-MANAS (14416) and 112. Needs no login, no network call, no loading screen. Triggered by a RED symptom, EPDS Q10, self-harm language anywhere, or psychosis warning signs. Postpartum psychosis has its own path: "call emergency services now", never "book a session". Works even when the PIN lock is on. |
| 6 | **Family circle** | Mother invites partner / mother / mother-in-law and controls, per person, what they see. Family view: education modules, partner screening, shared night-feed planner, consented alerts, "how to help" note. |
| 7 | **Baby care** | Vaccination timeline calculated from the baby's date of birth (India's National Immunization Schedule) with overdue/due states. *Next:* weight log, milestones checklist, PMMVY benefit reminder. |
| 8 | **Professional dashboard** | Patients sorted by urgency, EPDS history, mood/sleep/appetite charts, callback queue with deadlines, community moderation queue, and an audit log of every record view. |
| 9 | **ASHA worker dashboard** *(Next)* | Mothers in an ASHA's area sorted by risk with the next HBNC visit day (3, 7, 14, 21, 28, 42). |
| 10 | **Bloom Circles** | A small circle of mothers at the same stage. Live chat (synced across tabs), topic filters, anonymous posting. Self-harm language → writer sees the crisis screen and the message goes to a human moderator queue (software never replies). Medical-advice posts get an automatic "check with your doctor" note. *Next:* peer mentors ("Bloom Buddies") and expert Q&A sessions. |
| 11 | **Weekly report** | Three versions from the same data, written from fixed templates (no AI): (1) "Your week" for the mother – no scores or grades, no bad news; (2) one-page clinical summary for her doctor – print to PDF or share on WhatsApp; (3) a family "how to help" note with no health details, sent only if she agrees. |
| 12 | **Privacy & shared-phone safety** | PIN lock, Quick Exit button, neutral notification wording, consent toggle for every data type and family member, "who looked at my record" log, no advertising, ever. |
| 13 | **Hindi / English** | One-tap language switch. Every screen is translated, including the EPDS questions, symptom names, self-care tips, dates and names, with proper Devanagari fonts. |
| 14 | **Soft, animated UI** | Blush/rose palette, collapsible sidebar, scroll-reveal sections, count-up statistics, animated progress bars, page transitions (respects "reduce motion"). |

## 4. Technologies / Tech Stack Used

| Layer | Choice |
|---|---|
| Framework | **Next.js 14** (App Router) with **React 18** and **TypeScript** |
| Styling | **Tailwind CSS 3** with a custom blush/rose/maroon palette, custom keyframe animations |
| Fonts | Cormorant Garamond + Nunito (Latin); Noto Sans / Noto Serif Devanagari (Hindi) via `next/font` |
| Charts | **Recharts** |
| Icons | **lucide-react** |
| State & storage | React Context + `localStorage` (mock data), `BroadcastChannel` for live sync between tabs |
| Symptom matching | Red-flag regex list → Levenshtein fuzzy matching → confidence thresholds (no generative AI) |
| Screening & triage | Plain TypeScript rules; thresholds and tables are plain data files a clinician can edit |
| Video | Jitsi Meet (embedded iframe) |
| Voice input | Browser Web Speech API (`hi-IN` / `en-IN`) |
| PDF report | Browser print-to-PDF with print stylesheet |
| Internationalisation | Lightweight in-house dictionary (`lib/hi.ts`, `lib/hi-data.ts`) |

**Planned production stack** (from the project plan): FastAPI backend, PostgreSQL (Supabase) with encryption at rest, Firebase phone-OTP login, multilingual sentence embeddings (LaBSE / MiniLM), WebSockets or Supabase Realtime, APScheduler + WeasyPrint for weekly reports, PWA install.

## 5. Installation & Setup Instructions

**Prerequisites**

- [Node.js](https://nodejs.org) 18 or newer (developed on Node 24)
- npm (comes with Node)
- Internet connection on first run (Google Fonts download; Jitsi for video sessions)

**Steps**

```bash
# 1. Go to the project folder
cd AfterBloom

# 2. Install dependencies
npm install
```

No environment variables, API keys or database are needed. All data is mock data stored in the browser.

## 6. How to Run the Project

```bash
npm run dev      # development server  → http://localhost:3000
npm run build    # production build (also type-checks)
npm start        # serve the production build
```

Open **http://localhost:3000**.

**Tips**

- Use the **View:** dropdown in the header to switch between **Mother**, **Family** and **Professional**.
- Open **two browser tabs** (one as Mother, one as Professional) to watch flags and chat messages appear live.
- Use the **हिं / EN** button to switch language.
- If the page ever looks unstyled, stop any old server on port 3000 and run `npm run dev` again, then hard-refresh (Ctrl+Shift+R).
- **Privacy → Reset demo data** restores the starting demo state.

**Demo script – Priya, day 9 after a C-section**

1. *Symptom checker:* type `sar mein bahut dard aur dhundhla dikh raha hai` → RED crisis screen with 112 and Tele-MANAS; her husband's alert appears under Family.
2. Type `feeling very tired and some cramps` → GREEN with self-care steps.
3. *Mind check:* answer so the total is 13 or more → "Our care team will be in touch"; switch to **Professional → Callbacks** to see the flag.
4. Re-run answering question 10 anything but "Never" → crisis screen appears instantly.
5. *Family view:* read the PPD module, do the partner screening, plan night feeds; open *Baby care* for the vaccine timeline.
6. *Bloom Circles:* post `I want to die` → crisis screen, and the message appears in the Professional → Moderation queue.
7. *Weekly report → For your doctor → Download PDF.*

## 7. Project Structure

```
AfterBloom/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root layout, fonts, shell
│   ├── globals.css           # Tailwind layers, buttons/cards/chips, print styles
│   ├── page.tsx              # Home: scrollable dashboard (hero, stats, services, evidence, daily view)
│   ├── more/                 # Grid of every feature (mobile "More")
│   ├── check/                # Symptom checker
│   ├── checkin/              # Daily check-in + trend charts
│   ├── screening/            # EPDS mind check
│   ├── care/                 # Professionals, booking, video
│   ├── circles/              # Bloom Circles community
│   ├── baby/                 # Vaccines, growth, milestones, PMMVY
│   ├── family/               # Family circle management (mother)
│   ├── family-view/          # Family member experience
│   ├── report/               # Weekly report (mother / doctor / family)
│   ├── privacy/              # PIN, consent, audit view
│   ├── pro/                  # Professional dashboard
│   ├── asha/                 # ASHA worker dashboard (stretch)
│   └── crisis/               # Direct crisis URL (no login needed)
├── components/
│   ├── Shell.tsx             # Header, collapsible sidebar, mobile nav, providers
│   ├── Crisis.tsx            # Full-screen crisis view (never gated)
│   ├── LockScreen.tsx        # PIN lock
│   ├── TriageResult.tsx      # Red/amber/green result card
│   ├── Charts.tsx            # Mood/sleep/appetite and BP charts
│   ├── NightFeeds.tsx        # Shared night-feed planner
│   ├── FeatureGrid.tsx       # Feature cards
│   ├── ui.tsx                # PageHead, Tabs, Toggle, badges, date helpers
│   └── fx.tsx                # Scroll reveal, count-up, bars, illustrations, wave dividers
├── lib/
│   ├── symptoms.ts           # Symptom list + triage levels (editable data)
│   ├── triage.ts             # Red-flag check, fuzzy matching, check-in triage
│   ├── epds.ts               # EPDS questions, scoring, bands, schedule
│   ├── vaccines.ts           # Immunization schedule + milestones
│   ├── pros.ts               # Sample professionals and sample patients
│   ├── report.ts             # Weekly report templates and stage guidance
│   ├── features.ts           # Feature / navigation list
│   ├── store.tsx             # App state, demo seed data, tab sync, persistence
│   ├── i18n.ts               # useTr() translation hook
│   ├── hi.ts, hi-data.ts     # Hindi dictionary (draft, pending clinician review)
│   ├── locale.ts             # Active date locale
│   └── features.ts
├── tailwind.config.ts        # Palette, fonts, animations
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## 8. Safety & Design Principles

1. **AI never writes medical advice.** Matching only maps words to a fixed symptom list; every response is prewritten and clinician-reviewed.
2. **Worrying results go to a human first.** A mother never reads a frightening score alone on a screen.
3. **Crisis help is never gated.** No login, no loading screen, no paywall; it also bypasses the PIN lock.
4. **Free help is always visible.** Tele-MANAS (14416) appears beside every paid option.
5. **Built for real Indian homes.** Hindi support, shared-phone privacy, low-bandwidth friendly pages.
6. **Screening support, not diagnosis.** Positioned as care navigation to stay clear of diagnostic-software rules.

## 9. Current Status & Limitations

- This is a **front-end prototype**. All data is mock data in `localStorage`; there is no backend, real login (phone OTP) or database yet.
- Professionals and patients are clearly labelled **sample profiles**. Real onboarding needs a hospital or clinical partner.
- Symptom matching uses keywords and fuzzy matching; multilingual embeddings are the production upgrade.
- Family alerts, callbacks and community moderation are simulated in the browser (they sync across tabs of the same browser only).
- Hindi text is a draft and needs clinical review. No peer-reviewed Hindi EPDS validation was found.
- Growth charts do not yet include WHO reference curves; milestones and PMMVY are lightweight versions.
- Not yet built: installable PWA manifest/offline mode, real push notifications, WhatsApp invites.

## 10. Items to Confirm Before Submission

- [ ] A doctor or psychologist signs off the triage table, EPDS cut-off scores and Hindi wording, and is named in the deck.
- [ ] Describe the Hindi EPDS as a translation pending clinician review.
- [ ] Call 14416 and 1-800-891-4416 before the demo; re-check the vaccine schedule against the current MoHFW document (the app shows "not yet verified").
- [ ] Check the exact EPDS permission terms and credit the authors (Cox, Holden and Sagovsky, 1987).
- [ ] State the years of all national data (NFHS-5 is 2019–21; the mental health survey is 2015–16).

## Sources

Upadhyay et al., *Bull WHO* 2017 · SRS Special Bulletin 2022–24 · NHM Optimizing Postnatal Care · NMHS 2015–16 · NFHS-5 · Surkan et al., *Bull WHO* 2011 · Fuhr et al., *Lancet Psychiatry* 2019 · BMC Psychiatry 2021 (EPDS validation) · WHO postnatal guideline 2022 · Telemedicine Practice Guidelines 2020 · DPDP Act 2023.

---

*AfterBloom offers screening support and care navigation, not a diagnosis. In an emergency call 112. Free mental health helpline: Tele-MANAS 14416 (24×7).*
