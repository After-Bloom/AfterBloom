# Deploying AfterBloom (free tiers only)

## 1. Supabase
Run these in the SQL editor, in order: `supabase/migrations/001_schema.sql`, `002_security.sql`, `003_features.sql`, `004_fixes.sql`.
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
