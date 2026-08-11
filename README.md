# Data Team & Open Demand Tracker

React UI to capture **account team size** and **open demand**, with simple built-in email/password login (no third-party auth).

## Login (built-in)

Credentials are **not** stored in this repo. Configure them via environment variables / GitHub Actions secrets.

### Local setup

```bash
cp .env.example .env.local
# set VITE_AUTH_EMAIL and VITE_AUTH_PASSWORD
npm install
npm run dev
```

### GitHub Pages secrets (required for the live site)

Repo → **Settings → Secrets and variables → Actions**:

- `VITE_AUTH_EMAIL`
- `VITE_AUTH_PASSWORD`
- `VITE_AUTH_NAME` (optional)

Or multi-user JSON in `VITE_AUTH_USERS`.

> Note: this is a lightweight UI gate for an internal tool on static hosting. Auth values are baked into the frontend build at deploy time — keep secrets out of source control.

## Features

- Email/password sign-in and sign-out
- Dashboard KPIs and Account → POD chart
- Team Members / Open Demands CRUD + Excel import/export

Live URL (after Pages is enabled): https://winfosolutions.github.io/Account-Demand-Tracker/
