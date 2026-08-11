# Data Team & Open Demand Tracker

React UI to capture **account team size** and **open demand**, with simple built-in email/password login (no third-party auth).

## Login (built-in)

Default credentials (until you override via env):

- Email: `admin@winfosolutions.com`
- Password: `Winfo@123`

### Local override

```bash
cp .env.example .env.local
# edit email/password
npm install
npm run dev
```

### GitHub Pages secrets (recommended)

Repo → **Settings → Secrets and variables → Actions**:

- `VITE_AUTH_EMAIL`
- `VITE_AUTH_PASSWORD`
- `VITE_AUTH_NAME` (optional)

Or multi-user JSON in `VITE_AUTH_USERS`.

> Note: this is a lightweight UI gate for an internal tool on static hosting. Passwords are baked into the frontend build, so change defaults before wide sharing.

## Features

- Email/password sign-in and sign-out
- Dashboard KPIs and Account → POD chart
- Team Members / Open Demands CRUD + Excel import/export

Live URL: https://arvindchaubey1984.github.io/pod-demand-tracker/
