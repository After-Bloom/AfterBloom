# Deploying AfterBloom (free tiers only)

## 1. Supabase
Run these in the SQL editor, in order: `supabase/migrations/001_schema.sql`, `002_security.sql`, `003_features.sql`, `004_fixes.sql`, `005_care_loop.sql`, `006_depth.sql`, `007_signals.sql`, `008_cases.sql`, `010_routing.sql` (009 is reserved for the action layer that comes next, so there is no gap to fill).

Optional extras (the app works without them):
- **Text-message reminders:** set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM` (see `.env.example`). Mothers opt in under Privacy, and the daily job sends one neutral text to those who have not checked in.
- **Faster follow-up after a RED or AMBER result:** the daily job escalates unanswered follow-ups once a day. For quicker escalation, call `GET /api/cron/loops` every 15 to 30 minutes from any scheduler with `Authorization: Bearer $CRON_SECRET`.
- **Ask Bloom matching data:** after editing `lib/ask/knowledge.ts`, run `curl http://localhost:3000/api/dev/build-ask-vectors` and commit `data/ask-vectors.json`.

Free projects pause after about 7 days idle and have no automatic backups. The keepalive and backup workflows below cover both.

## 2. Vercel environment variables
| Name | Notes |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | public |
| SUPABASE_SERVICE_ROLE_KEY | server only, never in the browser |
| ENCRYPTION_KEY | 32 bytes, base64. Losing it makes stored EPDS answers unreadable |
| CRON_SECRET | any long random string |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT | `npx web-push generate-vapid-keys` |
| CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN | hosted symptom matching (optional; app falls back to on-device) |
| NEXT_PUBLIC_SITE_URL | the deployed URL |
| DEMO_PASSWORD, ENABLE_DEMO | demo accounts. Set ENABLE_DEMO off and delete `@demo.afterbloom.app` users before real users arrive |

## 3. GitHub secrets (for `.github/workflows`)
APP_URL, CRON_SECRET, BACKUP_PASSPHRASE.

## 4. After deploy
- Symptom list changed? Run `/api/dev/build-vectors` locally and commit `data/symptom-vectors.json`.
- Tests: `node --test tests/epds.test.ts`.

## 5. To confirm before real users
- A clinician signs off the triage rules, EPDS cut-offs and Hindi text.
- EPDS permission and credit (Cox, Holden, Sagovsky).
- Call the 14416 / 1-800-891-4416 numbers and confirm they work.
- Re-check the vaccine schedule against current MoHFW guidance.
- Growth chart values are approximate WHO figures; replace with the official tables.
- Replace the "Sample profile" professionals with a real hospital partner.
- DPDP Act review of consent and data-deletion flows.
