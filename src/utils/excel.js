import * as XLSX from 'xlsx'
import { DEFAULT_DEMAND_OPEN_DATE, uid } from './storage'

function clean(value) {
  return String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

export function exportWorkbook({ teamMembers, openDemands, leadership }) {
  const teamRows = teamMembers.map((m, i) => ({
    'S.NO': m.sno || i + 1,
    POD: m.pod,
    Role: m.role,
    Assignee: m.assignee,
    'Billing Status': m.billingStatus,
    Allocation: m.allocation,
    'Onboard Month': m.onboardMonth,
    Remarks: m.remarks,
  }))

  const leadershipRows = leadership.map((l) => ({
    Role: l.role,
    Assignee: l.assignee,
    Allocation: l.allocation,
  }))

  const demandRows = openDemands.map((d, i) => ({
    'S.No': d.sno || i + 1,
    'Project Name': d.projectName,
    Role: d.role,
    Location: d.location,
    'Demand Open Date': d.demandOpenDate || DEFAULT_DEMAND_OPEN_DATE,
    'Onboarded Member': d.onboardedMember || '',
    'New/Replacement': d.newOrReplacement,
    'No. Positions': d.positions,
    Status: d.status || 'Open',
  }))

  const wb = XLSX.utils.book_new()
  const teamSheet = XLSX.utils.json_to_sheet(teamRows)
  XLSX.utils.book_append_sheet(wb, teamSheet, 'Team Members')
  const demandSheet = XLSX.utils.json_to_sheet(demandRows)
  XLSX.utils.book_append_sheet(wb, demandSheet, 'Open Demands')
  const leadSheet = XLSX.utils.json_to_sheet(leadershipRows)
  XLSX.utils.book_append_sheet(wb, leadSheet, 'Leadership')
  XLSX.writeFile(wb, `PoD-Team-Demand-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function importWorkbook(file) {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const teamSheet =
    wb.Sheets['Team Members'] || wb.Sheets[wb.SheetNames[0]]
  const demandSheet =
    wb.Sheets['Open Demands'] || wb.Sheets[wb.SheetNames[1]]
  const leadSheet = wb.Sheets['Leadership']

  const teamRaw = XLSX.utils.sheet_to_json(teamSheet, { defval: '' })
  const demandRaw = demandSheet
    ? XLSX.utils.sheet_to_json(demandSheet, { defval: '' })
    : []
  const leadRaw = leadSheet
    ? XLSX.utils.sheet_to_json(leadSheet, { defval: '' })
    : []

  const teamMembers = teamRaw
    .map((row, i) => ({
      id: uid('tm'),
      sno: clean(row['S.NO'] ?? row['S.No'] ?? i + 1),
      pod: clean(row.POD ?? row.Pod ?? row.Project ?? ''),
      role: clean(row.Role ?? row['Role?'] ?? ''),
      assignee: clean(row.Assignee ?? row['Assignee?'] ?? ''),
      billingStatus: clean(row['Billing Status'] ?? ''),
      allocation: clean(row.Allocation ?? row['Allocation?'] ?? ''),
      onboardMonth: clean(row['Onboard Month'] ?? row['Onboard Month ?'] ?? ''),
      remarks: clean(row.Remarks ?? ''),
    }))
    .filter((r) => r.pod || r.role || r.assignee)

  const openDemands = demandRaw
    .map((row, i) => ({
      id: uid('od'),
      sno: clean(row['S.No'] ?? row['S.NO'] ?? i + 1),
      projectName: clean(row['Project Name'] ?? ''),
      role: clean(row.Role ?? ''),
      location: clean(row.Location ?? ''),
      demandOpenDate:
        clean(row['Demand Open Date'] ?? '') || DEFAULT_DEMAND_OPEN_DATE,
      onboardedMember: clean(
        row['Onboarded Member'] ??
          row['Onboarded Team Member'] ??
          row['Team Member Onboarded'] ??
          '',
      ),
      newOrReplacement: clean(row['New/Replacement'] ?? 'New'),
      positions: Number(row['No. Positions'] ?? 1) || 1,
      status: clean(row.Status ?? 'Open') || 'Open',
    }))
    .filter((r) => r.projectName || r.role)

  const leadership = leadRaw
    .map((row) => ({
      id: uid('ld'),
      role: clean(row.Role ?? ''),
      assignee: clean(row.Assignee ?? ''),
      allocation: clean(row.Allocation ?? 'Shared'),
    }))
    .filter((r) => r.role || r.assignee)

  return { teamMembers, openDemands, leadership }
}
