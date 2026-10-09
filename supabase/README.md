# AfterBloom database

Two SQL files, run **in order**, in Supabase: *SQL Editor → New query → paste → Run*.

1. `migrations/001_schema.sql`: tables, indexes and defaults
2. `migrations/002_security.sql`: Row Level Security, helper functions, RPCs, realtime

Both are safe to run again. Later changes ship as `003_...`, `004_...` and so on. `007_signals.sql` (related alerts) and `010_routing.sql` (continuity of care) are additive: they only add tables and columns, and the app keeps working if they have not been run yet.

## What protects the data
- Every table has Row Level Security. A signed-out visitor can read nothing.
- A mother's records belong to her. A matched professional always sees urgent flags and booked sessions, and sees her check-ins, symptoms and screening results only while she shares them. Family see only what she switched on.
- Typed symptom text is never stored (only matched labels and the level). Screening answers are encrypted by the server (AES-256-GCM, key in `ENCRYPTION_KEY`) before storage.
- Circle posts show an alias. Who wrote a post is in `post_authors`, readable only by the author and moderators.
- Every professional view of a record writes a row to `audit_log`; the mother can read it.

## After running the SQL
Nothing else is needed in the dashboard. Sign-up goes through the app's own server route, so you do **not** have to change Authentication settings or email confirmation.
