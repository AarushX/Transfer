# FRC Team Training & Certification LMS

SvelteKit + Supabase implementation of a Say-Show-Do training system:

- Students complete modules by watching videos, passing quizzes, and waiting for mentor checkoff.
- Mentors review pending checkoffs from a mobile-friendly queue and approve/reject in one tap.
- Admins manage module content, review roster bottlenecks, and inspect audit logs.
- Passport QR supports on-floor identity and authorization lookups.

## Setup

1. Copy `.env.example` to `.env` and fill in project credentials.
2. Install dependencies:
   - `npm install --force` (needed on non-LTS Node versions).
3. Start Supabase local stack (optional):
   - `npx supabase start`
4. Apply schema + seed:
   - `npx supabase db reset`
5. Run app:
   - `npm run dev`

## Key Paths

- `supabase/migrations/202604170001_init.sql` - schema, RLS policies, RPCs
- `supabase/seed.sql` - initial subteams/modules/assessments/machines
- `src/routes/learn/[nodeSlug]` - learning flow
- `src/routes/mentor` - checkoff queue
- `src/routes/passport` - digital passport + QR
- `src/routes/admin` - content and audit tools
