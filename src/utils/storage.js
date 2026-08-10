import seed from '../data/seed.json'

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

function normalizeTeamMember(m) {
  return {
    ...m,
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

export function computeStats(teamMembers, openDemands) {
  const activeTeam = teamMembers.filter((m) => m.role || m.assignee)
  const fte = activeTeam.reduce((sum, m) => sum + parseAllocation(m.allocation), 0)
  const billable = activeTeam.filter((m) =>
    String(m.billingStatus || '').toLowerCase().includes('billable'),
  ).length
  const yetToStart = activeTeam.filter((m) =>
    String(m.billingStatus || '').toLowerCase().includes('yet'),
  ).length
  const openPositions = openDemands.reduce(
    (sum, d) => sum + (Number(d.positions) || 0),
    0,
  )
  const byPod = {}
  for (const m of activeTeam) {
    const pod = m.pod || 'Unassigned'
    if (!byPod[pod]) byPod[pod] = { count: 0, fte: 0 }
    byPod[pod].count += 1
    byPod[pod].fte += parseAllocation(m.allocation)
  }
  const byProject = {}
  for (const d of openDemands) {
    const p = d.projectName || 'Unassigned'
    if (!byProject[p]) byProject[p] = 0
    byProject[p] += Number(d.positions) || 0
  }
  const byLocation = {}
  for (const d of openDemands) {
    const loc = d.location || 'TBD'
    if (!byLocation[loc]) byLocation[loc] = 0
    byLocation[loc] += Number(d.positions) || 0
  }
  return {
    headcount: activeTeam.length,
    fte,
    billable,
    yetToStart,
    openPositions,
    openRoles: openDemands.length,
    byPod,
    byProject,
    byLocation,
  }
}
