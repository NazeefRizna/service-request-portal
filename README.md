# Service Request Management Portal

Internal portal where employees submit service requests, managers approve or reject them, and administrators monitor operations on a live dashboard.

**Stack:** React + Vite, Tailwind CSS, Recharts, Supabase (PostgreSQL, Auth, RLS, Realtime), GitHub Actions, Vercel.

## Features
- Request lifecycle: Submitted → Pending Approval → Approved / Rejected → Completed, enforced in the database
- Role-based access (employee / manager / admin) via Row Level Security and SECURITY DEFINER RPCs
- Full status history written by a database trigger
- Dashboard: 4 KPIs, 3 charts, date/department/status filters, realtime updates
- 36-record fictional dataset with CSV/JSON export and data dictionary
- CI/CD: lint, build, npm audit, Gitleaks, Semgrep; auto-deploy to Vercel on main

## Run locally
```bash
npm ci
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

## Database setup (Supabase SQL editor)
1. Run `supabase/01_schema.sql`
2. Run `supabase/02_security.sql`
3. Create users in Supabase Auth: employee1@demo.local, employee2@demo.local, manager@demo.local, admin@demo.local
4. Run `supabase/03_seed.sql`

## Environment variables
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase **publishable** key (never the secret key) |
| `VITE_GITHUB_REPO` | `owner/repo`, used for the repo link and pipeline status |

## Deployment
Push to `main` → GitHub Actions runs all security gates → deploys to Vercel production.
Required GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

See the **AI Log & Handover** page in the app for the user guide and the AI review log.