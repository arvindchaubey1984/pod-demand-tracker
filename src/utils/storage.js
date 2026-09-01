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

function normalizeTeamMember(m) {
  const wasNa = m.pod === 'NA'
  const pod = wasNa ? 'Shadow' : m.pod
  let billingStatus = normalizeBillingStatus(m.billingStatus)
  if (wasNa || (pod === 'Shadow' && !billingStatus)) {
    billingStatus = 'Non-Billable'
  }

  return {
    ...m,
    pod,
    billingStatus,
    status: normalizeMemberStatus(m.status),
    skill: String(m.skill || '').trim() || inferSkillFromRole(m.role),
    endDate: m.endDate || DEFAULT_TEAM_END_DATE,
    account: m.account || DEFAULT_TEAM_ACCOUNT,
    location: m.location || DEFAULT_TEAM_LOCATION,
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...parsed,
        teamMembers: (parsed.teamMembers ?? []).map(normalizeTeamMember),
        openDemands: (parsed.openDemands ?? []).map(normalizeDemand),
      }
    }
  } catch {
    /* ignore */
  }
  return {
    leadership: seed.leadership ?? [],
    teamMembers: (seed.teamMembers ?? []).map(normalizeTeamMember),
    openDemands: (seed.openDemands ?? []).map(normalizeDemand),
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

export function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function uniqueSorted(items, key) {
  return [...new Set(items.map((i) => i[key]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
}

export function personKey(member) {
  return String(member?.assignee || '')
    .trim()
    .toLowerCase()
}

/** Unique people (multi-POD rows collapse to one person). */
export function uniquePeopleCount(members) {
  const keys = new Set()
  for (const m of members) {
    const key = personKey(m)
    if (key) keys.add(key)
  }
  return keys.size
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

export function computeStats(teamMembers, openDemands) {
  // KPIs / charts count Active members only (exclude Released & Resigned)
  const activeTeam = teamMembers
    .map(normalizeTeamMember)
    .filter((m) => (m.role || m.assignee) && isActiveMember(m))
  const fte = activeTeam.reduce((sum, m) => sum + parseAllocation(m.allocation), 0)

  // Billing KPIs count allocation rows (what you edit), not unique people
  const billable = activeTeam.filter((m) => isBillableStatus(m.billingStatus)).length
  const nonBillable = activeTeam.filter((m) =>
    isNonBillableStatus(m.billingStatus),
  ).length
  const yetToStart = activeTeam.filter((m) =>
    isYetToBeBilledStatus(m.billingStatus),
  ).length

  const activeDemands = openDemands.filter(isActiveOpenDemand)
  const openPositions = activeDemands.reduce(
    (sum, d) => sum + (Number(d.positions) || 0),
    0,
  )

  const byAccountPod = {}
  const accountPeople = {}
  for (const m of activeTeam) {
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
  for (const m of activeTeam) {
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
    headcount: uniquePeopleCount(activeTeam),
    allocationRows: activeTeam.length,
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
