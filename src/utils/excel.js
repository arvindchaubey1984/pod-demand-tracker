import * as XLSX from 'xlsx'
import {
  DEFAULT_DEMAND_OPEN_DATE,
  DEFAULT_TEAM_ACCOUNT,
  DEFAULT_TEAM_END_DATE,
  DEFAULT_TEAM_LOCATION,
  flattenAssignments,
  migrateCertifications,
  migrateTeamMembers,
  normalizeCertStatus,
  normalizeMemberStatus,
  uid,
} from './storage'

function excelDate(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'number' && XLSX.SSF?.parse_date_code) {
    const d = XLSX.SSF.parse_date_code(value)
    if (!d) return String(value)
    const mm = String(d.m).padStart(2, '0')
    const dd = String(d.d).padStart(2, '0')
    return `${d.y}-${mm}-${dd}`
  }
  const s = clean(value)
  // MM/DD/YYYY → YYYY-MM-DD
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  return s
}

function clean(value) {
  return String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

export function exportWorkbook({ teamMembers, openDemands, leadership, certifications = [] }) {
  // One Excel row per assignment (flat) — re-groups on import
  const flat = flattenAssignments(teamMembers)
  const teamRows = flat.map((m, i) => ({
    'S.NO': i + 1,
    Account: m.account || DEFAULT_TEAM_ACCOUNT,
    POD: m.pod,
    Role: m.role,
    Skill: m.skill || '',
    Assignee: m.assignee,
    Status: m.status || 'Active',
    Location: m.location || DEFAULT_TEAM_LOCATION,
    'Billing Status': m.billingStatus,
    Allocation: m.allocation,
    'Onboard Month': m.onboardMonth,
    'End Date': m.endDate || DEFAULT_TEAM_END_DATE,
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

  const certRows = (certifications || []).map((c, i) => ({
    'S.No': c.sno || i + 1,
    Name: c.assignee,
    'Certification to Pursue': c.certification,
    'Tentative Exam Date': c.tentativeExamDate,
    Status: c.status,
    'Completion Date': c.completionDate || '',
  }))

  const wb = XLSX.utils.book_new()
  const teamSheet = XLSX.utils.json_to_sheet(teamRows)
  XLSX.utils.book_append_sheet(wb, teamSheet, 'Team Members')
  const demandSheet = XLSX.utils.json_to_sheet(demandRows)
  XLSX.utils.book_append_sheet(wb, demandSheet, 'Open Demands')
  const certSheet = XLSX.utils.json_to_sheet(certRows)
  XLSX.utils.book_append_sheet(wb, certSheet, 'Certifications')
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
  const certSheet =
    wb.Sheets.Certifications ||
    wb.Sheets.Certification ||
    wb.Sheets['Certification Details']

  const teamRaw = XLSX.utils.sheet_to_json(teamSheet, { defval: '' })
  const demandRaw = demandSheet
    ? XLSX.utils.sheet_to_json(demandSheet, { defval: '' })
    : []
  const leadRaw = leadSheet
    ? XLSX.utils.sheet_to_json(leadSheet, { defval: '' })
    : []
  const certRaw = certSheet
    ? XLSX.utils.sheet_to_json(certSheet, { defval: '' })
    : []

  const flatMembers = teamRaw
    .map((row, i) => ({
      id: uid('tm'),
      sno: clean(row['S.NO'] ?? row['S.No'] ?? i + 1),
      account: clean(row.Account ?? '') || DEFAULT_TEAM_ACCOUNT,
      pod: clean(row.POD ?? row.Pod ?? row.Project ?? ''),
      role: clean(row.Role ?? row['Role?'] ?? ''),
      skill: clean(row.Skill ?? row.Skills ?? row['Skill Set'] ?? ''),
      assignee: clean(row.Assignee ?? row['Assignee?'] ?? ''),
      status: normalizeMemberStatus(
        clean(row.Status ?? row['Member Status'] ?? row['Employment Status'] ?? ''),
      ),
      location: clean(row.Location ?? '') || DEFAULT_TEAM_LOCATION,
      billingStatus: clean(row['Billing Status'] ?? ''),
      allocation: clean(row.Allocation ?? row['Allocation?'] ?? ''),
      onboardMonth: clean(row['Onboard Month'] ?? row['Onboard Month ?'] ?? ''),
      endDate: clean(row['End Date'] ?? '') || DEFAULT_TEAM_END_DATE,
      remarks: clean(row.Remarks ?? ''),
    }))
    .filter((r) => r.pod || r.role || r.assignee)

  const teamMembers = migrateTeamMembers(flatMembers)

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

  const certifications = migrateCertifications(
    certRaw
      .map((row) => ({
        id: uid('cert'),
        assignee: clean(row.Name ?? row.Assignee ?? row['Team Member'] ?? ''),
        certification: clean(
          row['Certification to Pursue'] ??
            row.Certification ??
            row['Certification Name'] ??
            '',
        ),
        tentativeExamDate: excelDate(
          row['Tentative Exam Date'] ?? row['Exam Date'] ?? '',
        ),
        status: normalizeCertStatus(clean(row.Status ?? '')),
        completionDate: excelDate(row['Completion Date'] ?? ''),
      }))
      .filter((r) => r.assignee || r.certification),
    teamMembers,
  )

  return { teamMembers, openDemands, leadership, certifications }
}
