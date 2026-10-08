import seed from '../data/seed.json'
import { inferSkillFromRole } from './skills'

const STORAGE_KEY = 'winfo-pod-demand-v1'
export const DEFAULT_DEMAND_OPEN_DATE = '2026-08-01'
export const DEFAULT_TEAM_END_DATE = 'Dec-2026'
export const DEFAULT_TEAM_ACCOUNT = 'McKesson'
export const DEFAULT_TEAM_LOCATION = 'India'

function normalizeDemand(d) {
  return {
    ...d,
    demandOpenDate: d.demandOpenDate || DEFAULT_DEMAND_OPEN_DATE,
    onboardedMember: d.onboardedMember ?? '',
  }
}

/** Canonical billing labels used in UI + stats. */
export function normalizeBillingStatus(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return ''
  if (s.includes('non')) return 'Non-Billable'
  if (s.includes('yet')) return 'Yet to be Billed'
  if (s === 'billable' || s.startsWith('billable')) return 'Billable'
  return String(status).trim()
}

export const MEMBER_STATUSES = ['Active', 'Released', 'Resigned']

/** Canonical employment status for team members. Defaults to Active. */
export function normalizeMemberStatus(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return 'Active'
  if (s.startsWith('release')) return 'Released'
  if (s.startsWith('resign')) return 'Resigned'
  if (s.startsWith('active') || s === 'current' || s === 'onboarded') return 'Active'
  if (MEMBER_STATUSES.includes(String(status).trim())) return String(status).trim()
  return 'Active'
}

export function isActiveMember(member) {
  return normalizeMemberStatus(member?.status) === 'Active'
}

export const POD_STATUSES = ['Active', 'Retired']

/** POD lifecycle — Retired PODs are excluded from KPIs / charts. */
export function normalizePodStatus(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return 'Active'
  if (s.startsWith('retir') || s.startsWith('shut') || s === 'closed' || s === 'inactive') {
    return 'Retired'
  }
  return 'Active'
}

export function isRetiredPod(podName, podRegistry = []) {
  const name = String(podName || '').trim()
  if (!name) return false
  const hit = podRegistry.find(
    (p) => String(p.name || '').trim().toLowerCase() === name.toLowerCase(),
  )
  return normalizePodStatus(hit?.status) === 'Retired'
}

export function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyAssignment(overrides = {}) {
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

export function normalizeAssignment(a = {}, fallback = {}) {
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
    skill: String(a.skill || fallback.skill || '').trim() || inferSkillFromRole(role),
    billingStatus,
    allocation: a.allocation ?? fallback.allocation ?? '',
    onboardMonth: a.onboardMonth ?? fallback.onboardMonth ?? '',
    endDate: a.endDate || fallback.endDate || DEFAULT_TEAM_END_DATE,
    remarks: a.remarks ?? fallback.remarks ?? '',
  }
}

/** Flatten person.assignments for KPIs / export (one virtual row per assignment). */
export function flattenAssignments(teamMembers = []) {
  const rows = []
  for (const person of teamMembers) {
    const assignments = getAssignments(person)
    for (const a of assignments) {
      rows.push({
        ...person,
        ...a,
        personId: person.id,
        assignmentId: a.id,
        // keep person employment status distinct from assignment fields
        status: person.status,
      })
    }
  }
  return rows
}

export function getAssignments(person) {
  if (!person) return []
  if (Array.isArray(person.assignments) && person.assignments.length) {
    return person.assignments.map((a) => normalizeAssignment(a))
  }
  // Legacy flat row → single assignment
  if (person.pod || person.role || person.onboardMonth || person.endDate) {
    return [normalizeAssignment(person)]
  }
  return []
}

/** Merge saved POD statuses with PODs discovered on assignments. */
export function buildPodRegistry(teamMembers = [], saved = []) {
  const map = new Map()
  for (const p of saved || []) {
    const name = String(p?.name || '').trim()
    if (!name) continue
    map.set(name.toLowerCase(), {
      name,
      status: normalizePodStatus(p.status),
    })
  }
  for (const row of flattenAssignments(teamMembers)) {
    const name = String(row?.pod || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!map.has(key)) {
      map.set(key, { name, status: 'Active' })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const MONTH_INDEX = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

/** Parse values like "April 2026", "Sep 2026", "Oct-26", "Dec-2026". */
export function parseMonthYear(value) {
  if (!value) return null
  const s = String(value).trim().toLowerCase()
  const m = s.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b[\s\-./]*(\d{2,4})/i,
  )
  if (!m) return null
  const monthKey = m[1].toLowerCase()
  const month =
    MONTH_INDEX[monthKey] ??
    MONTH_INDEX[monthKey.slice(0, 3)] ??
    MONTH_INDEX[monthKey.slice(0, 4)]
  if (month == null) return null
  let year = Number(m[2])
  if (Number.isNaN(year)) return null
  if (year < 100) year += 2000
  return new Date(year, month, 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

/**
 * Allocation window from onboard → end.
 * Missing start/end = open-ended on that side.
 */
export function getAllocationPhase(assignment, asOf = new Date()) {
  const start = parseMonthYear(assignment?.onboardMonth)
  const endStart = parseMonthYear(assignment?.endDate)
  const end = endStart ? endOfMonth(endStart) : null
  if (start && asOf < start) return 'Scheduled'
  if (end && asOf > end) return 'Ended'
  return 'Current'
}

export function isAllocationLive(assignment, asOf = new Date()) {
  return getAllocationPhase(assignment, asOf) === 'Current'
}

export function personKey(member) {
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

/**
 * Normalize to one person record with assignments[].
 * Migrates legacy duplicate rows for the same assignee into one person.
 */
export function normalizeTeamMember(m) {
  return m
}

export function migrateTeamMembers(rawMembers = []) {
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
      // Prefer Active employment status if any row is Active
      if (legacy.status === 'Active') existing.status = 'Active'
      if (!existing.location && legacy.location) existing.location = legacy.location
    }
  })

  return [...groups.values()].map((person, i) => ({
    ...person,
    sno: person.sno || String(i + 1),
    status: normalizeMemberStatus(person.status),
    account: person.account || DEFAULT_TEAM_ACCOUNT,
    location: person.location || DEFAULT_TEAM_LOCATION,
    assignments: (person.assignments || []).map((a) => normalizeAssignment(a)),
  }))
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const teamMembers = migrateTeamMembers(parsed.teamMembers ?? [])
      return {
        ...parsed,
        teamMembers,
        openDemands: (parsed.openDemands ?? []).map(normalizeDemand),
        podRegistry: buildPodRegistry(teamMembers, parsed.podRegistry ?? []),
      }
    }
  } catch {
    /* ignore */
  }
  const teamMembers = migrateTeamMembers(seed.teamMembers ?? [])
  return {
    leadership: seed.leadership ?? [],
    teamMembers,
    openDemands: (seed.openDemands ?? []).map(normalizeDemand),
    podRegistry: buildPodRegistry(teamMembers, seed.podRegistry ?? []),
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY)
  return loadState()
}

export function parseAllocation(value) {
  if (value == null || value === '') return 0
  const s = String(value).trim().toLowerCase()
  if (s === 'shared' || s === 'na') return 0
  if (s.includes('%')) return Number.parseFloat(s) / 100
  const n = Number.parseFloat(s)
  if (Number.isNaN(n)) return 0
  return n > 1 ? n / 100 : n
}

export function formatFte(n) {
  return `${n.toFixed(1)} FTE`
}

export function uniqueSorted(items, key) {
  return [...new Set(items.map((i) => i[key]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** Unique people (assignee keys). */
export function uniquePeopleCount(members) {
  const keys = new Set()
  for (const m of members) {
    const key = personKey(m)
    if (key) keys.add(key)
    else if (m.id) keys.add(m.id)
  }
  return keys.size
}

export function countAssignments(members = []) {
  return members.reduce((sum, m) => sum + getAssignments(m).length, 0)
}

/** Still recruiting — exclude Filled / On Hold from open counts. */
export function isActiveOpenDemand(demand) {
  const s = String(demand?.status || 'Open')
    .trim()
    .toLowerCase()
  if (!s) return true
  if (s === 'filled' || s === 'on hold' || s === 'onhold' || s === 'closed') {
    return false
  }
  return true
}

export function isBillableStatus(status) {
  return normalizeBillingStatus(status) === 'Billable'
}

export function isYetToBeBilledStatus(status) {
  return normalizeBillingStatus(status) === 'Yet to be Billed'
}

export function isNonBillableStatus(status) {
  return normalizeBillingStatus(status) === 'Non-Billable'
}

export function computeStats(teamMembers, openDemands, podRegistry = [], asOf = new Date()) {
  // Flatten assignments, then keep Active people · current window · non-retired POD
  const activeAllocations = flattenAssignments(teamMembers).filter(
    (m) =>
      (m.role || m.assignee || m.pod) &&
      isActiveMember(m) &&
      isAllocationLive(m, asOf) &&
      !isRetiredPod(m.pod, podRegistry),
  )
  const fte = activeAllocations.reduce(
    (sum, m) => sum + parseAllocation(m.allocation),
    0,
  )

  const billable = activeAllocations.filter((m) =>
    isBillableStatus(m.billingStatus),
  ).length
  const nonBillable = activeAllocations.filter((m) =>
    isNonBillableStatus(m.billingStatus),
  ).length
  const yetToStart = activeAllocations.filter((m) =>
    isYetToBeBilledStatus(m.billingStatus),
  ).length

  const activeDemands = openDemands.filter(isActiveOpenDemand)
  const openPositions = activeDemands.reduce(
    (sum, d) => sum + (Number(d.positions) || 0),
    0,
  )

  const byAccountPod = {}
  const accountPeople = {}
  for (const m of activeAllocations) {
    const account = m.account || 'Unassigned'
    const pod = m.pod || 'Unassigned'
    const key = personKey(m)
    if (!byAccountPod[account]) byAccountPod[account] = {}
    if (!byAccountPod[account][pod]) byAccountPod[account][pod] = { count: 0, fte: 0 }
    byAccountPod[account][pod].count += 1
    byAccountPod[account][pod].fte += parseAllocation(m.allocation)
    if (!accountPeople[account]) accountPeople[account] = new Set()
    if (key) accountPeople[account].add(key)
  }

  const byPod = {}
  for (const m of activeAllocations) {
    const pod = m.pod || 'Unassigned'
    if (!byPod[pod]) byPod[pod] = { count: 0, fte: 0 }
    byPod[pod].count += 1
    byPod[pod].fte += parseAllocation(m.allocation)
  }
  const byProject = {}
  for (const d of activeDemands) {
    const p = d.projectName || 'Unassigned'
    if (!byProject[p]) byProject[p] = 0
    byProject[p] += Number(d.positions) || 0
  }
  const byLocation = {}
  for (const d of activeDemands) {
    const loc = d.location || 'TBD'
    if (!byLocation[loc]) byLocation[loc] = 0
    byLocation[loc] += Number(d.positions) || 0
  }
  return {
    headcount: uniquePeopleCount(activeAllocations),
    allocationRows: activeAllocations.length,
    fte,
    billable,
    nonBillable,
    yetToStart,
    openPositions,
    openRoles: activeDemands.length,
    filledRoles: openDemands.length - activeDemands.length,
    byAccountPod,
    accountPeopleCount: Object.fromEntries(
      Object.entries(accountPeople).map(([account, set]) => [account, set.size]),
    ),
    byPod,
    byProject,
    byLocation,
  }
}
