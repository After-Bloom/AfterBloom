# AfterBloom

**A postpartum care app for Indian mothers, their families and their babies.**

---

## Project overview

After a baby is born, almost everyone checks on the baby. AfterBloom checks on the **mother**.

In India, childbirth is now mostly safe inside the hospital, but the weeks after going home are not. Dangerous problems such as heavy bleeding, infection and high blood pressure often start at home. About 1 in 5 Indian mothers also has postpartum depression, and most get no help for it. Care is scattered, many families do not know the warning signs, and many mothers stay silent.

AfterBloom is a **mobile-first web app** (it can be installed on a phone like an app) that does three jobs:

1. **Detect early:** a symptom checker, a 30-second daily check-in, blood pressure watch, and a mood screening (the EPDS questionnaire).
2. **Route quickly to real people:** urgent results go to a clinician, to family (only if the mother agreed), and to free helplines (Tele-MANAS 14416 and 112). The app follows up to check that she actually got care.
3. **Support the whole circle:** family get plain-language guidance, ASHA health workers get a visit dashboard, and mothers can join small peer circles.

**Important safety principle:** the app never writes medical advice with AI. All advice is pre-written and meant to be reviewed by a doctor. The software only decides *which* pre-written answer to show. It is screening support and care navigation, not a diagnosis.

It works in **English and Hindi** (including Hinglish typing) and is built for homes where one phone is shared.

*Built for She Solves 3.0, Web & Software Development track, Health domain.*

---

## How to install/run the project

**You need:** [Node.js](https://nodejs.org) 22.6 or newer (the tests use this), npm, and a free [Supabase](https://supabase.com) project.

```bash
# 1. Get the code and install packages
git clone https://github.com/mitishah2109/AfterBloom.git
cd AfterBloom
npm install

# 2. Create your settings file (see "Any credentials/setup instructions" below)
copy .env.example .env.local        # on Mac/Linux: cp .env.example .env.local
#    then open .env.local and fill in the values

# 3. Create the database: in Supabase, open SQL Editor and run these files IN ORDER
#    supabase/migrations/001_schema.sql
#    supabase/migrations/002_security.sql
#    supabase/migrations/003_features.sql
#    supabase/migrations/004_fixes.sql
#    supabase/migrations/005_care_loop.sql
#    supabase/migrations/006_depth.sql

# 4. Start the app
npm run dev
```

Open **http://localhost:3000**.

**Add the demo accounts** (once the app is running): open `http://localhost:3000/api/dev/seed` in your browser. Then use the "Try the demo" buttons on the sign-in page.

**Other useful commands**

```bash
npm run build                                      # production build (also checks types)
npm start                                          # run the production build
npx tsc --noEmit                                   # type check only
node --test tests/epds.test.ts tests/risk.test.ts  # automated tests
```

**Tip:** if the page ever looks broken after many changes, stop the server, delete the `.next` folder, and run `npm run dev` again.

---

## Features implemented

**For the mother**

- **Landing page:** a calm scroll story of five stops (Day 1 to Month 6) told on one illustration of a mother carrying her baby.
- **Symptom checker:** type or speak in English, Hindi or Hinglish. Emergency words are checked first on the phone. Then the app matches the words to about 125 known mother and baby symptoms, asks short follow-up questions, and shows a red, amber or green result. If it is not sure, it says so and never guesses.
- **Ask Bloom:** a question box for everyday questions ("How long will the bleeding last?"). Every reply is a pre-written, clinician-style answer from a library of 27 topics, in English and Hindi. If there is no good match, it says so.
- **Daily check-in:** 30 seconds of taps for mood, appetite, sleep, danger signs and an optional home blood pressure reading.
- **Blood pressure and pre-eclampsia watch:** a recovery profile (high BP in pregnancy, heavy bleeding, diabetes, anaemia, C-section, twins, preterm) sets how often the app reminds her to check blood pressure. It spots rising readings and treats a raised reading plus a headache as an emergency.
- **Care loop:** after a red or amber result, the app asks later "Did you get the care you needed?". If she does not answer, her professional (and family, only if she agreed) is told.
- **Mind check (EPDS):** the 10-question Edinburgh Postnatal Depression Scale. A high score shows only "Our care team will be in touch". Any answer to question 10 above "Never" opens the crisis screen.
- **Crisis screen:** one-tap Tele-MANAS (14416) and 112, nearest hospital finder, works with no login and even when the PIN lock is on.
- **Professional care:** browse sample professionals, book a slot, join a video session.
- **Baby care:** vaccine timeline from the date of birth, growth chart against WHO-style reference lines, birth weight check, a feeding and nappy log with warnings, milestones and the PMMVY benefit checklist.
- **Family circle:** invite family and choose exactly what each person can see.
- **Bloom Circles:** small, anonymous peer chat groups. Self-harm words open the crisis screen and go to a human moderator.
- **Weekly report:** three versions from fixed templates: for the mother, for her doctor (printable PDF with recovery profile), and for family. Includes a week-by-week recovery view.
- **Privacy tools:** PIN lock, Quick Exit button, neutral notifications, a consent switch for every kind of sharing, a "who looked at my record" log, data export and account deletion.

**For family:** plain-language learning modules, "Myths & facts", "What to say" sentences, a short partner screening, a shared night-feed planner, and alerts the mother agreed to share.

**For professionals:** a dashboard sorted by urgency with mood, sleep and blood pressure charts, risk history, a callback queue with deadlines, and an audit log of every record view.

**For ASHA health workers:** mothers sorted by risk, the next home visit (days 3, 7, 14, 21, 28, 42), warnings such as raised blood pressure, typed or spoken visit notes, and visits that are saved on the phone when offline and sent later.

**For moderators and admins:** a flagged-message queue, user management, clinical settings (cut-off scores) and anonymous hospital totals.

**Across the app:** English and Hindi, light and dark mode, installable on a phone (PWA) with the crisis page available offline, web push notifications, optional text-message reminders, and automatic weekly encrypted backups.

---

## Tech Stack

| Area | What we used |
|---|---|
| Framework | Next.js 14 (App Router) with React 18 and TypeScript |
| Styling and UI | Tailwind CSS 3, Lucide icons, Recharts (charts), Motion (animation) |
| Database and login | Supabase (PostgreSQL, Row Level Security, Auth, Realtime) |
| AI / machine learning | Cloudflare Workers AI, model `@cf/baai/bge-m3` (multilingual text embeddings) for symptom matching and Ask Bloom. No text-generating AI is used. |
| Matching without AI | Plain rules: emergency word lists, spelling-tolerant matching (Levenshtein distance), pre-written triage tables |
| Security | Supabase Row Level Security, AES-256-GCM encryption of screening answers (Node `crypto`) |
| Notifications | Web Push (`web-push`, VAPID keys), Twilio SMS/WhatsApp (optional) |
| Video | Jitsi Meet (meet.jit.si) |
| Maps and location | OpenStreetMap Overpass API (nearest hospitals), browser Geolocation |
| Voice input | Browser Web Speech API (Hindi and English) |
| Offline and install | Service worker and web app manifest (PWA) |
| Hosting and jobs | Vercel (hosting and a daily scheduled job), GitHub Actions (weekly backup, keep-alive) |
| Testing | Node's built-in test runner; a built-in accuracy test for the symptom matcher |

---

## Screenshots

*(To be added.)*

---

## Deployment link

**Live site:** https://after-bloom.vercel.app

You can try it without signing up: open the sign-in page and use the "Try the demo" buttons (mother, family member, professional, ASHA worker, moderator, admin).

---

## Any credentials/setup instructions

**Never commit `.env.local`** (it is already in `.gitignore`). It holds your private keys.

Copy `.env.example` to `.env.local` and fill in the values below.

| Setting | Required? | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project, Settings, API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase project, Settings, API (the public "anon / publishable" key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase project, Settings, API (**secret**, server only) |
| `SUPABASE_DB_PASSWORD` | Optional | The database password you chose for the Supabase project |
| `ENCRYPTION_KEY` | Yes | 32 random bytes, base64. Make one with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. **Never change it after launch**, or saved screening answers become unreadable. |
| `CRON_SECRET` | Yes | Any long random string. Protects the scheduled-job addresses. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | For push notifications | Run `npx web-push generate-vapid-keys`. Subject looks like `mailto:you@example.com` |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Optional | Free Cloudflare account, Workers AI. Without these the app uses on-device matching only. |
| `DEMO_PASSWORD` | For demo accounts | Any password of 8 or more characters. Used when you open `/api/dev/seed`. |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` locally; your real address when deployed |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `TWILIO_CHANNEL` | Optional | Twilio account, only for text-message reminders. Leave empty to switch off. |

**Demo accounts** (created by `/api/dev/seed`; all use the `DEMO_PASSWORD` you set):

| Role | Email |
|---|---|
| Mother (Priya, day 10 after a C-section) | `priya@demo.afterbloom.app` |
| Family (her husband) | `rohan@demo.afterbloom.app` |
| Professional (sample psychologist) | `dr.rao@demo.afterbloom.app` |
| Moderator | `moderator@demo.afterbloom.app` |
| ASHA worker | `asha@demo.afterbloom.app` |
| Admin | `admin@demo.afterbloom.app` |

You can also sign in from the "Try the demo" buttons on the sign-in page. Before real users arrive, set `ENABLE_DEMO=false` and delete the demo users.

**For deployment** (Vercel and GitHub): add the same settings as Vercel environment variables. For the GitHub Actions workflows, add three repository secrets: `APP_URL`, `CRON_SECRET` and `BACKUP_PASSPHRASE`. See `DEPLOY.md` for the full steps.

**Important notes**

- The sample professionals are labelled "Sample profile". Real use needs a clinical partner.
- Triage tables, cut-off scores and all Hindi text are drafts and must be reviewed by a doctor before real use.
- Helpline numbers: Tele-MANAS **14416** (free, 24x7) and **112** (emergency).
