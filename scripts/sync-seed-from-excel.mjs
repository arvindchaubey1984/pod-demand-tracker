/**
 * Rebuild src/data/seed.json from an exported PoD-Team-Demand workbook.
 * Usage: node scripts/sync-seed-from-excel.mjs [path-to.xlsx]
 */
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'

const DEFAULT_DEMAND_OPEN_DATE = '2026-08-01'
const DEFAULT_TEAM_END_DATE = 'Dec-2026'
const DEFAULT_TEAM_ACCOUNT = 'McKesson'
const DEFAULT_TEAM_LOCATION = 'India'

const excelPath =
  process.argv[2] ||
  path.join(process.env.USERPROFILE || '', 'Downloads', 'PoD-Team-Demand-2026-10-07.xlsx')
const seedPath = path.resolve('src/data/seed.json')

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function clean(value) {
  return String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

function excelDate(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'number' && XLSX.SSF?.parse_date_code) {
    const d = XLSX.SSF.parse_date_code(value)
    if (!d) return String(value)
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = clean(value)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return s
}

function normalizeMemberStatus(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return 'Active'
  if (s.startsWith('release')) return 'Released'
  if (s.startsWith('resign')) return 'Resigned'
  if (s.startsWith('active') || s === 'current' || s === 'onboarded') return 'Active'
  return 'Active'
}

function normalizeBillingStatus(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return ''
  if (s.includes('non')) return 'Non-Billable'
  if (s.includes('yet')) return 'Yet to be Billed'
  if (s === 'billable' || s.startsWith('billable')) return 'Billable'
  return String(status).trim()
}

function normalizeCertStatus(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return 'YTS'
  if (s === 'yts' || s.includes('yet to start') || s === 'not started') return 'YTS'
  if (s.includes('book')) return 'Booked Slot'
  if (s.includes('complete') || s === 'done' || s === 'passed') return 'Completed'
  if (s.includes('progress') || s === 'wip' || s === 'ongoing') return 'In progress'
  return 'In progress'
}

function normalizePersonName(name) {
  return String(name || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function createEmptyAssignment(overrides = {}) {
  return {
    id: uid('as'),
    pod: '',
    role: '',
    skill: '',
    billingStatus: 'Billable',
    allocation: '100%',
    onboardMonth: '',
    endDate: DEFAULT_TEAM_END_DATE,
    remarks: '',
    ...overrides,
  }
}

function normalizeAssignment(a = {}, fallback = {}) {
  let pod = a.pod ?? fallback.pod ?? ''
  if (pod === 'NA') pod = 'Shadow'
  let billingStatus = normalizeBillingStatus(
    a.billingStatus ?? fallback.billingStatus ?? '',
  )
  if (pod === 'Shadow' && !billingStatus) billingStatus = 'Non-Billable'
  const role = a.role ?? fallback.role ?? ''
  return {
    id: a.id || uid('as'),
    pod,
    role,
    skill: String(a.skill || fallback.skill || '').trim(),
    billingStatus,
    allocation: a.allocation ?? fallback.allocation ?? '',
    onboardMonth: a.onboardMonth ?? fallback.onboardMonth ?? '',
    endDate: a.endDate || fallback.endDate || DEFAULT_TEAM_END_DATE,
    remarks: a.remarks ?? fallback.remarks ?? '',
  }
}

function personKey(member) {
  return String(member?.assignee || '')
    .trim()
    .toLowerCase()
}

function groupKey(m) {
  const name = personKey(m)
  const account = String(m.account || DEFAULT_TEAM_ACCOUNT).trim().toLowerCase()
  if (name) return `${account}::${name}`
  return `row::${m.id || uid('tm')}`
}

function migrateTeamMembers(rawMembers = []) {
  const groups = new Map()

  rawMembers.forEach((raw, index) => {
    const legacy = {
      ...raw,
      account: raw.account || DEFAULT_TEAM_ACCOUNT,
      location: raw.location || DEFAULT_TEAM_LOCATION,
      status: normalizeMemberStatus(raw.status),
    }

    if (Array.isArray(raw.assignments)) {
      const key = groupKey(legacy)
      const existing = groups.get(key)
      const assignments = raw.assignments.map((a) => normalizeAssignment(a))
      if (!existing) {
        groups.set(key, {
          id: raw.id || uid('tm'),
          sno: raw.sno || String(index + 1),
          account: legacy.account,
          assignee: raw.assignee || '',
          location: legacy.location,
          status: legacy.status,
          assignments: assignments.length ? assignments : [createEmptyAssignment()],
        })
      } else {
        existing.assignments.push(...assignments)
        if (!existing.assignee && raw.assignee) existing.assignee = raw.assignee
      }
      return
    }

    const assignment = normalizeAssignment(raw)
    const key = groupKey(legacy)
    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, {
        id: raw.id || uid('tm'),
        sno: raw.sno || String(index + 1),
        account: legacy.account,
        assignee: raw.assignee || '',
        location: legacy.location,
        status: legacy.status,
        assignments: [assignment],
      })
    } else {
      existing.assignments.push(assignment)
      if (legacy.status === 'Active') existing.status = 'Active'
      if (!existing.location && legacy.location) existing.location = legacy.location
    }
  })

  return [...groups.values()]
    .sort((a, b) =>
      String(a.assignee || '').localeCompare(String(b.assignee || ''), undefined, {
        sensitivity: 'base',
      }),
    )
    .map((person, i) => ({
      ...person,
      sno: String(i + 1),
      status: normalizeMemberStatus(person.status),
      account: person.account || DEFAULT_TEAM_ACCOUNT,
      location: person.location || DEFAULT_TEAM_LOCATION,
      assignments: (person.assignments || []).map((a) => normalizeAssignment(a)),
    }))
}

function findTeamMemberByName(assignee, teamMembers = []) {
  const key = normalizePersonName(assignee)
  if (!key) return null
  const exact = teamMembers.find((m) => normalizePersonName(m.assignee) === key)
  if (exact) return exact
  return (
    teamMembers.find((m) => {
      const n = normalizePersonName(m.assignee)
      return n.startsWith(key) || key.startsWith(n)
    }) || null
  )
}

function migrateCertifications(raw = [], teamMembers = []) {
  return (Array.isArray(raw) ? raw : [])
    .map((c) => {
      const assignee = String(c.assignee || '').trim()
      const linked =
        (c.personId && teamMembers.find((m) => m.id === c.personId)) ||
        findTeamMemberByName(assignee, teamMembers)
      return {
        id: c.id || uid('cert'),
        personId: linked?.id || c.personId || '',
        assignee: linked?.assignee || assignee,
        certification: String(c.certification || '').trim(),
        tentativeExamDate: String(c.tentativeExamDate || '').trim(),
        status: normalizeCertStatus(c.status),
        completionDate: String(c.completionDate || '').trim(),
      }
    })
    .filter((c) => c.assignee || c.certification)
    .map((c, i) => ({ ...c, sno: String(i + 1) }))
}

const existing = JSON.parse(
  readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, ''),
)
const buf = readFileSync(excelPath)
const wb = XLSX.read(buf, { type: 'buffer' })
console.log('Sheets:', wb.SheetNames.join(', '))

const teamSheet = wb.Sheets['Team Members'] || wb.Sheets[wb.SheetNames[0]]
const demandSheet = wb.Sheets['Open Demands'] || wb.Sheets[wb.SheetNames[1]]
const leadSheet = wb.Sheets.Leadership
const certSheet =
  wb.Sheets.Certifications ||
  wb.Sheets.Certification ||
  wb.Sheets['Certification Details']

const teamRaw = XLSX.utils.sheet_to_json(teamSheet, { defval: '' })
const demandRaw = demandSheet
  ? XLSX.utils.sheet_to_json(demandSheet, { defval: '' })
  : []
const leadRaw = leadSheet ? XLSX.utils.sheet_to_json(leadSheet, { defval: '' }) : []
const certRaw = certSheet ? XLSX.utils.sheet_to_json(certSheet, { defval: '' }) : []

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
    demandOpenDate: clean(row['Demand Open Date'] ?? '') || DEFAULT_DEMAND_OPEN_DATE,
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
  .map((d, i) => ({ ...d, sno: String(i + 1) }))

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

const next = {
  leadership: leadership.length ? leadership : existing.leadership || [],
  teamMembers,
  openDemands,
  certifications: certifications.length
    ? certifications
    : existing.certifications || [],
  podRegistry: existing.podRegistry || [],
}

writeFileSync(seedPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')

console.log('Updated', seedPath)
console.log('teamMembers', teamMembers.length)
console.log(
  'assignments',
  teamMembers.reduce((n, m) => n + (m.assignments?.length || 0), 0),
)
console.log('openDemands', openDemands.length)
console.log('certifications', next.certifications.length)
console.log('leadership', next.leadership.length)
