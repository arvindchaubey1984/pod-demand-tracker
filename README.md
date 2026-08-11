# Data Team & Open Demand Tracker

React UI to capture **account team size** and **open demand**, with Clerk email login.

## Clerk email login setup

1. Create a free app at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Enable **Email** authentication
3. Copy the **Publishable key** (`pk_test_...` or `pk_live_...`)
4. In Clerk → **Configure → Domains / Allowed origins**, add:
   - `http://localhost:5173`
   - `https://arvindchaubey1984.github.io`
5. Optional: restrict to `@winfosolutions.com` under **User & authentication → Restrictions / Allowlist**

### Local

```bash
cp .env.example .env.local
# paste VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
npm install
npm run dev
```

### GitHub Pages

1. Repo → **Settings → Secrets and variables → Actions**
2. Add secret: `VITE_CLERK_PUBLISHABLE_KEY` = your Clerk publishable key
3. Push to `main` (or run the deploy workflow)

Live URL: https://arvindchaubey1984.github.io/pod-demand-tracker/

## Features

- Clerk email sign-in / sign-out
- Dashboard: headcount, FTE, Yet to be Billed, Non-Billable, open positions
- Team Members CRUD with Account → POD → Role filters
- Open Demands CRUD with project/location filters
- Import / Export Excel

## Excel mapping

| Sheet | Fields |
| --- | --- |
| Team Members | Account, POD, Role, Assignee, Location, Billing Status, Allocation, Onboard Month, End Date, Remarks |
| Open Demands | Project Name, Role, Location, Demand Open Date, Onboarded Member, New/Replacement, No. Positions |
