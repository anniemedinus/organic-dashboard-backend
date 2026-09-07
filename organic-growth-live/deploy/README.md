# Organic Growth Dashboard + Report — live, shared setup

Two routes, one live dataset, backed by Supabase:

- `/` — the public **Report** (view only, no login, no edit controls)
- `/dashboard` — the **editable** view, behind a simple password gate

Editing at `/dashboard` updates `/` immediately for anyone viewing it —
both read/write the same Supabase table.

## 1. Set up the database (one-time, ~1 minute)
1. Open your Supabase project → **SQL Editor** → **New query**
2. Paste the contents of `supabase_setup.sql` (included in this folder) and click **Run**

This creates the `kv_store` table the app reads/writes to.

## 2. Local setup
```bash
npm install
npm run dev
```
`.env` already has your Supabase URL and key filled in. Change
`VITE_DASHBOARD_PASSWORD` in `.env` to whatever you want the edit
password to be before deploying (it currently says `changeme123` —
please change this).

Visit `http://localhost:5173/` for the report, `/dashboard` for editing.

## 3. Deploy to Vercel
`.env` is git-ignored on purpose (don't commit real keys to GitHub).
Instead, set the same three variables in Vercel directly:

1. Push this folder to a GitHub repo (see below)
2. Import it at vercel.com/new
3. Before deploying (or after, then redeploy), go to
   **Project Settings → Environment Variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DASHBOARD_PASSWORD`
   (values are in your local `.env` file)
4. Deploy

### Pushing to GitHub
```bash
git init
git add .
git commit -m "Live organic growth dashboard + report"
gh repo create organic-growth-report --private --source=. --push
```

## Notes on security
The password gate on `/dashboard` is a simple client-side check — enough
to stop a random person who finds the report link from also editing your
numbers, but not real authentication. The Supabase anon key is meant to
be public (it's designed to sit in client-side code), and per
`supabase_setup.sql`, anyone holding it can technically read/write the
table directly, bypassing the password. For an internal team tool this
is a reasonable tradeoff. If this ever needs to be genuinely locked down
(e.g. it starts holding anything sensitive), the fix is proper Supabase
Auth instead of a shared password — worth revisiting if that need comes up.
