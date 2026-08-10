# PoD Team & Demand Tracker

React UI to capture **account team size** and **open demand**, seeded from `PoD - Team Member Mapping.xlsx`.

## Run locally

```bash
npm install
npm run dev
```

App opens at http://localhost:5173

## Features

- Dashboard: headcount, FTE allocation, billable count, open positions
- Team Members CRUD with POD filters (from Excel sheet `Team Members`)
- Open Demands CRUD with project/location filters (from Excel sheet `Open Demands`)
- Leadership strip (Executive Sponsor / Engagement Partner / Delivery Lead)
- Import / Export Excel (SharePoint-ready `.xlsx`)
- Browser localStorage persistence between sessions

## Excel mapping

| Sheet | Fields |
| --- | --- |
| Team Members | POD, Role, Assignee, Billing Status, Allocation, Onboard Month, Remarks |
| Open Demands | Project Name, Role, Location, Demand Open Date, New/Replacement, No. Positions |

Replace the seed file later by importing from SharePoint-exported Excel via **Import Excel**.
