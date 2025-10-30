
# Oracle SQL Practice

A small React + Vite app for practicing Oracle SQL questions, with mock tests and per-user scoring stored in Supabase.

This README is for myself and future contributors and gives the minimal steps to get the project running locally and explains the important env vars and admin flow.

## Quick start (Windows / PowerShell)

1. Install dependencies

```powershell
npm install
```

2. Create a local environment file

Copy the example and fill in your Supabase details. Do not commit your `.env` file.

```powershell
copy .env.example .env
# then open .env and set your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

Required env variables (client-side):

- `VITE_SUPABASE_URL` - your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - the anon/public key (safe for client usage)
- `VITE_ADMIN_PATH` - optional path for admin UI (defaults to `/admin-ybfehx8862v11`)

3. Start the dev server

```powershell
npm run dev
```

Open the address Vite prints (e.g. `http://localhost:8081`).

## Auth and RBAC

- Login is implemented by register number + password. After login the app persists a small `auth_user` object in `localStorage` with `{ register_no, student_name, isAdmin }`.
- `isAdmin` is read from the `users` table `is_admin` column on login. The client shows an "Admin Page" button if `isAdmin` is true.
- Important: client-side RBAC is only a convenience — enforce admin restrictions server-side (RLS or server APIs) for real security.

## Admin page

- The admin UI lists 7 tests (Mock + 6 practice sets). Clicking a test shows all users and, per user, number of attempts and best percentage. If a user hasn't attempted a test the UI displays "Test not taken yet".

## Where secrets live

- The project reads Supabase credentials from Vite env vars (prefixed with `VITE_`). This means the anon key is available in the client bundle (this is expected for Supabase anon access). Never place `service_role` keys in client code or commit them.
- Make sure `.env` is in your `.gitignore`.

## Security checklist

- Do NOT commit `.env` with real keys.
- If a secret was accidentally committed in the past, rotate it and purge history (BFG or git filter-repo).
- Prefer Supabase Row Level Security for sensitive queries; use a server API that holds the `service_role` key only for privileged operations.

## Useful files

- `src/lib/supabaseClient.ts` — creates the Supabase client from env vars
- `src/pages/Profile.tsx` — profile view showing attempts and best score for the logged-in user
- `src/pages/Admin.tsx` — admin UI (guarded by `src/components/AdminRoute.tsx`)

## Contributing

Make a feature branch, commit changes, and open a PR to `main`.

---
