import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import CommercialPanel from './components/CommercialPanel'
import { CertForm, DemandForm, Modal, TeamForm } from './components/Forms'
import { CertTable, DemandTable, ProjectsTable, TeamTable } from './components/Tables'
import { exportWorkbook, importWorkbook } from './utils/excel'
import {
  CERT_STATUSES,
  CERTIFICATION_OPTIONS,
  buildPodRegistry,
  computeProjectSummaries,
  computeStats,
  countAssignments,
  createEmptyAssignment,
  createEmptyCertification,
  flattenAssignments,
  formatFte,
  getAllocationPhase,
  getAssignments,
  isActiveOpenDemand,
  loadState,
  migrateCertifications,
  migrateTeamMembers,
  normalizeBillingStatus,
  normalizeCertStatus,
  normalizeMemberStatus,
  normalizePersonName,
  normalizePodStatus,
  renumberCertifications,
  renumberDemands,
  renumberTeamMembers,
  resetState,
  saveState,
  uid,
  uniquePeopleCount,
  uniqueSorted,
  DEFAULT_DEMAND_OPEN_DATE,
  DEFAULT_TEAM_ACCOUNT,
  DEFAULT_TEAM_LOCATION,
} from './utils/storage'

const emptyTeam = {
  account: DEFAULT_TEAM_ACCOUNT,
  location: DEFAULT_TEAM_LOCATION,
  assignee: '',
  status: 'Active',
  assignments: [createEmptyAssignment()],
}

const emptyDemand = {
  projectName: '',
  role: '',
  location: 'India',
  demandOpenDate: DEFAULT_DEMAND_OPEN_DATE,
  onboardedMember: '',
  newOrReplacement: 'New',
  positions: 1,
  status: 'Open',
}

export default function App() {
  const { session, logout } = useAuth()
  const [state, setState] = useState(() => loadState())
  const [section, setSection] = useState('staffing') // staffing | commercial
  const [tab, setTab] = useState('team')
  const [query, setQuery] = useState('')
  const [accountFilter, setAccountFilter] = useState('All')
  const [podFilter, setPodFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')
  const [memberStatusFilter, setMemberStatusFilter] = useState('Active')
  const [allocPhaseFilter, setAllocPhaseFilter] = useState('Current')
  const [billingFilter, setBillingFilter] = useState('All')
  const [projectPhaseFilter, setProjectPhaseFilter] = useState('Current')
  const [projectRetiredFilter, setProjectRetiredFilter] = useState('Hide')
  const [projectFilter, setProjectFilter] = useState('All')
  const [locationFilter, setLocationFilter] = useState('All')
  const [demandStatusFilter, setDemandStatusFilter] = useState('Active')
  const [certStatusFilter, setCertStatusFilter] = useState('All')
  const [certNameFilter, setCertNameFilter] = useState('All')
  const [certAssigneeFilter, setCertAssigneeFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [draft, setDraft] = useState(null)
  const [toast, setToast] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const podRegistry = useMemo(
    () => buildPodRegistry(state.teamMembers, state.podRegistry || []),
    [state.teamMembers, state.podRegistry],
  )

  const stats = useMemo(
    () => computeStats(state.teamMembers, state.openDemands, podRegistry),
    [state.teamMembers, state.openDemands, podRegistry],
  )

  const flatAssignments = useMemo(
    () => flattenAssignments(state.teamMembers),
    [state.teamMembers],
  )

  const accounts = useMemo(
    () => uniqueSorted(state.teamMembers, 'account'),
    [state.teamMembers],
  )
  const pods = useMemo(() => {
    const source =
      accountFilter === 'All'
        ? flatAssignments
        : flatAssignments.filter((m) => m.account === accountFilter)
    return uniqueSorted(source, 'pod')
  }, [flatAssignments, accountFilter])
  const roles = useMemo(() => {
    const source = flatAssignments.filter((m) => {
      if (accountFilter !== 'All' && m.account !== accountFilter) return false
      if (podFilter !== 'All' && m.pod !== podFilter) return false
      return true
    })
    return uniqueSorted(source, 'role')
  }, [flatAssignments, accountFilter, podFilter])
  const projects = useMemo(
    () => uniqueSorted(state.openDemands, 'projectName'),
    [state.openDemands],
  )

  const filteredTeam = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.teamMembers.filter((person) => {
      if (accountFilter !== 'All' && person.account !== accountFilter) return false
      if (
        memberStatusFilter !== 'All' &&
        normalizeMemberStatus(person.status) !== memberStatusFilter
      ) {
        return false
      }
      const assignments = getAssignments(person)
      const matchAssign = assignments.some((a) => {
        if (podFilter !== 'All' && a.pod !== podFilter) return false
        if (roleFilter !== 'All' && a.role !== roleFilter) return false
        if (allocPhaseFilter !== 'All' && getAllocationPhase(a) !== allocPhaseFilter) {
          return false
        }
        if (
          billingFilter !== 'All' &&
          normalizeBillingStatus(a.billingStatus) !== billingFilter
        ) {
          return false
        }
        return true
      })
      if (
        !matchAssign &&
        (podFilter !== 'All' ||
          roleFilter !== 'All' ||
          allocPhaseFilter !== 'All' ||
          billingFilter !== 'All')
      ) {
        return false
      }
      if (!q) return true
      const blob = [
        person.account,
        person.assignee,
        person.status,
        person.location,
        ...assignments.flatMap((a) => [
          a.pod,
          a.role,
          a.skill,
          a.billingStatus,
          a.allocation,
          a.onboardMonth,
          a.endDate,
          a.remarks,
        ]),
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [
    state.teamMembers,
    accountFilter,
    podFilter,
    roleFilter,
    memberStatusFilter,
    allocPhaseFilter,
    billingFilter,
    query,
  ])

  const filteredTeamPeople = useMemo(
    () => uniquePeopleCount(filteredTeam),
    [filteredTeam],
  )
  const filteredAssignmentCount = useMemo(
    () => countAssignments(filteredTeam),
    [filteredTeam],
  )

  const filteredDemands = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.openDemands.filter((d) => {
      if (projectFilter !== 'All' && d.projectName !== projectFilter) return false
      if (locationFilter !== 'All' && d.location !== locationFilter) return false
      if (demandStatusFilter === 'Active' && !isActiveOpenDemand(d)) return false
      if (
        demandStatusFilter !== 'All' &&
        demandStatusFilter !== 'Active' &&
        String(d.status || 'Open') !== demandStatusFilter
      ) {
        return false
      }
      if (!q) return true
      return [
        d.projectName,
        d.role,
        d.location,
        d.newOrReplacement,
        d.status,
        d.onboardedMember,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [
    state.openDemands,
    projectFilter,
    locationFilter,
    demandStatusFilter,
    query,
  ])

  const accountPodRows = useMemo(() => {
    const rows = []
    for (const [account, podsMap] of Object.entries(stats.byAccountPod || {})) {
      const podsSorted = Object.entries(podsMap).sort((a, b) => b[1].count - a[1].count)
      const accountTotal =
        stats.accountPeopleCount?.[account] ??
        podsSorted.reduce((sum, [, info]) => sum + info.count, 0)
      rows.push({ type: 'account', account, count: accountTotal })
      for (const [pod, info] of podsSorted) {
        rows.push({ type: 'pod', account, pod, count: info.count })
      }
    }
    return rows.sort((a, b) => {
      if (a.account !== b.account) {
        const aTotal = stats.accountPeopleCount?.[a.account] ?? 0
        const bTotal = stats.accountPeopleCount?.[b.account] ?? 0
        return bTotal - aTotal
      }
      if (a.type !== b.type) return a.type === 'account' ? -1 : 1
      return b.count - a.count
    })
  }, [stats.byAccountPod, stats.accountPeopleCount])

  const maxAccountPod = Math.max(...accountPodRows.map((r) => r.count), 1)
  const maxProject = Math.max(...Object.values(stats.byProject), 1)

  const projectSummaries = useMemo(() => {
    const q = query.trim().toLowerCase()
    return computeProjectSummaries(state.teamMembers, state.openDemands, podRegistry, {
      account: accountFilter,
      phase: projectPhaseFilter,
      includeRetired: projectRetiredFilter !== 'Hide',
    }).filter((row) => {
      if (projectRetiredFilter === 'Active only' && normalizePodStatus(row.status) !== 'Active') {
        return false
      }
      if (projectRetiredFilter === 'Retired only' && normalizePodStatus(row.status) !== 'Retired') {
        return false
      }
      if (!q) return true
      const blob = [
        row.pod,
        row.status,
        ...(row.accounts || []),
        ...row.people.flatMap((p) => [p.assignee, p.role, p.skill, p.billingStatus]),
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [
    state.teamMembers,
    state.openDemands,
    podRegistry,
    accountFilter,
    projectPhaseFilter,
    projectRetiredFilter,
    query,
  ])

  const projectTabTotals = useMemo(() => {
    return projectSummaries.reduce(
      (acc, row) => {
        acc.projects += 1
        acc.people += row.peopleCount
        acc.billableFte += row.billableFte
        acc.totalFte += row.totalFte
        return acc
      },
      { projects: 0, people: 0, billableFte: 0, totalFte: 0 },
    )
  }, [projectSummaries])

  const certifications = useMemo(
    () => migrateCertifications(state.certifications || [], state.teamMembers),
    [state.certifications, state.teamMembers],
  )

  const certNames = useMemo(() => {
    const fromData = uniqueSorted(certifications, 'certification')
    return [...new Set([...CERTIFICATION_OPTIONS, ...fromData])].sort((a, b) =>
      a.localeCompare(b),
    )
  }, [certifications])

  const certAssignees = useMemo(
    () => uniqueSorted(certifications, 'assignee'),
    [certifications],
  )

  const filteredCerts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return certifications.filter((c) => {
      if (certStatusFilter !== 'All' && normalizeCertStatus(c.status) !== certStatusFilter) {
        return false
      }
      if (certNameFilter !== 'All' && c.certification !== certNameFilter) return false
      if (certAssigneeFilter !== 'All') {
        if (normalizePersonName(c.assignee) !== normalizePersonName(certAssigneeFilter)) {
          return false
        }
      }
      if (!q) return true
      return [c.assignee, c.certification, c.status, c.tentativeExamDate, c.completionDate]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [
    certifications,
    certStatusFilter,
    certNameFilter,
    certAssigneeFilter,
    query,
  ])

  const certStats = useMemo(() => {
    const counts = { total: certifications.length, completed: 0, inProgress: 0, booked: 0, yts: 0 }
    for (const c of certifications) {
      const s = normalizeCertStatus(c.status)
      if (s === 'Completed') counts.completed += 1
      else if (s === 'Booked Slot') counts.booked += 1
      else if (s === 'YTS') counts.yts += 1
      else counts.inProgress += 1
    }
    return counts
  }, [certifications])

  function notify(message) {
    setToast(message)
  }

  function openAddTeam() {
    setDraft({
      account: DEFAULT_TEAM_ACCOUNT,
      location: DEFAULT_TEAM_LOCATION,
      assignee: '',
      status: 'Active',
      assignments: [createEmptyAssignment()],
    })
    setModal({ type: 'team', mode: 'add' })
  }

  function openEditTeam(row) {
    const assignments = getAssignments(row)
    setDraft({
      ...row,
      assignments: assignments.length
        ? assignments.map((a) => ({ ...a }))
        : [createEmptyAssignment()],
    })
    setModal({ type: 'team', mode: 'edit', id: row.id })
  }

  function openAddDemand() {
    setDraft({ ...emptyDemand })
    setModal({ type: 'demand', mode: 'add' })
  }

  function openEditDemand(row) {
    setDraft({ ...row })
    setModal({ type: 'demand', mode: 'edit', id: row.id })
  }

  function openManagePods() {
    setDraft({ pods: podRegistry.map((p) => ({ ...p })) })
    setModal({ type: 'pods' })
  }

  function openAddCert(person) {
    setDraft(
      createEmptyCertification(
        person
          ? { assignee: person.assignee || '', personId: person.id || '' }
          : {},
      ),
    )
    setModal({ type: 'cert', mode: 'add' })
  }

  function openEditCert(row) {
    setDraft({ ...row })
    setModal({ type: 'cert', mode: 'edit', id: row.id })
  }

  function deleteCert(id) {
    if (!window.confirm('Remove this certification record?')) return
    setState((prev) => ({
      ...prev,
      certifications: renumberCertifications(
        (prev.certifications || []).filter((c) => c.id !== id),
      ),
    }))
    notify('Certification removed')
  }

  function setPodDraftStatus(name, status) {
    setDraft((prev) => ({
      ...prev,
      pods: (prev?.pods || []).map((p) =>
        p.name === name ? { ...p, status: normalizePodStatus(status) } : p,
      ),
    }))
  }

  function saveModal() {
    if (!draft) return
    if (modal.type === 'pods') {
      setState((prev) => ({
        ...prev,
        podRegistry: buildPodRegistry(prev.teamMembers, draft.pods || []),
      }))
      notify('POD statuses saved')
      setModal(null)
      setDraft(null)
      return
    }
    if (modal.type === 'cert') {
      if (!draft.assignee?.trim()) {
        notify('Team member name is required')
        return
      }
      if (!draft.certification?.trim()) {
        notify('Certification name is required')
        return
      }
      setState((prev) => {
        const members = prev.teamMembers
        const normalized = migrateCertifications(
          [
            {
              ...draft,
              id: modal.mode === 'edit' ? modal.id : uid('cert'),
              status: normalizeCertStatus(draft.status),
              completionDate:
                normalizeCertStatus(draft.status) === 'Completed'
                  ? draft.completionDate || draft.tentativeExamDate || ''
                  : draft.completionDate || '',
            },
          ],
          members,
        )[0]
        const next =
          modal.mode === 'add'
            ? [...(prev.certifications || []), normalized]
            : (prev.certifications || []).map((c) =>
                c.id === modal.id ? { ...c, ...normalized, id: modal.id } : c,
              )
        return {
          ...prev,
          certifications: renumberCertifications(
            migrateCertifications(next, members),
          ),
        }
      })
      notify(modal.mode === 'add' ? 'Certification added' : 'Certification updated')
      setModal(null)
      setDraft(null)
      return
    }
    if (modal.type === 'team') {
      const assignments = getAssignments(draft).filter(
        (a) => a.pod || a.role || a.onboardMonth || a.endDate || a.remarks,
      )
      if (!draft.assignee && assignments.length === 0) {
        notify('Assignee or at least one assignment is required')
        return
      }
      if (assignments.length === 0) {
        notify('Add at least one POD assignment')
        return
      }
      setState((prev) => {
        const row = {
          id: modal.mode === 'edit' ? modal.id : uid('tm'),
          account: draft.account || DEFAULT_TEAM_ACCOUNT,
          assignee: draft.assignee || '',
          location: draft.location || DEFAULT_TEAM_LOCATION,
          status: normalizeMemberStatus(draft.status),
          assignments,
        }
        const nextMembers =
          modal.mode === 'add'
            ? [...prev.teamMembers, row]
            : prev.teamMembers.map((m) => (m.id === modal.id ? { ...m, ...row } : m))
        const migrated = renumberTeamMembers(migrateTeamMembers(nextMembers))
        return {
          ...prev,
          teamMembers: migrated,
          certifications: migrateCertifications(prev.certifications || [], migrated),
          podRegistry: buildPodRegistry(migrated, prev.podRegistry || []),
        }
      })
      notify(modal.mode === 'add' ? 'Team member added' : 'Team member updated')
    } else {
      if (!draft.role) {
        notify('Role is required')
        return
      }
      setState((prev) => {
        const next =
          modal.mode === 'add'
            ? [
                ...prev.openDemands,
                { ...draft, id: uid('od') },
              ]
            : prev.openDemands.map((d) =>
                d.id === modal.id ? { ...d, ...draft } : d,
              )
        return {
          ...prev,
          openDemands: renumberDemands(next),
        }
      })
      notify(modal.mode === 'add' ? 'Open demand added' : 'Open demand updated')
    }
    setModal(null)
    setDraft(null)
  }

  function deleteTeam(id) {
    if (!window.confirm('Remove this team member?')) return
    setState((prev) => ({
      ...prev,
      teamMembers: renumberTeamMembers(
        prev.teamMembers.filter((m) => m.id !== id),
      ),
    }))
    notify('Team member removed')
  }

  function deleteDemand(id) {
    if (!window.confirm('Remove this open demand?')) return
    setState((prev) => ({
      ...prev,
      openDemands: renumberDemands(prev.openDemands.filter((d) => d.id !== id)),
    }))
    notify('Open demand removed')
  }

  async function onImport(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const imported = await importWorkbook(file)
      setState((prev) => ({
        leadership: imported.leadership.length
          ? imported.leadership
          : prev.leadership,
        teamMembers: imported.teamMembers,
        openDemands: imported.openDemands,
        certifications:
          imported.certifications?.length
            ? imported.certifications
            : migrateCertifications(prev.certifications || [], imported.teamMembers),
        podRegistry: buildPodRegistry(imported.teamMembers, prev.podRegistry || []),
      }))
      const certCount = imported.certifications?.length || 0
      notify(
        `Imported ${imported.teamMembers.length} team + ${imported.openDemands.length} demands` +
          (certCount ? ` + ${certCount} certifications` : ''),
      )
    } catch (err) {
      console.error(err)
      notify('Import failed. Use the Team Members / Open Demands workbook.')
    }
  }

  function onExport() {
    exportWorkbook(state)
    notify('Excel exported')
  }

  function onReset() {
    if (!window.confirm('Reset to the original Excel seed data?')) return
    setState(resetState())
    notify('Reset to seed data')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="topbar">
          <div className="brand">
            <img
              src={`${import.meta.env.BASE_URL}winfo-logo.png`}
              alt="Winfo Solutions"
            />
            <div className="brand-copy">
              <strong>Data Team & Open Demand</strong>
              <span>
                {section === 'commercial'
                  ? 'FY27 commercial · Account → POD'
                  : 'Account staffing · open positions'}
              </span>
            </div>
          </div>
          <div className="top-actions">
            <span className="user-chip-label" title={session?.email}>
              {session?.name || session?.email}
            </span>
            <button className="btn btn-ghost" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>

        <nav className="app-nav" aria-label="App sections">
          <div className="app-nav-tabs" role="tablist">
            <button
              type="button"
              className={`app-nav-link ${section === 'staffing' ? 'active' : ''}`}
              onClick={() => {
                setSection('staffing')
                if (tab === 'commercial') setTab('team')
              }}
            >
              Team & Demand
            </button>
            <button
              type="button"
              className={`app-nav-link ${section === 'commercial' ? 'active' : ''}`}
              onClick={() => setSection('commercial')}
            >
              Commercial FY27
            </button>
          </div>
          {section === 'staffing' ? (
            <div className="app-nav-actions">
              <button className="btn btn-ghost" type="button" onClick={onReset}>
                Reset
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => fileRef.current?.click()}
              >
                Import Excel
              </button>
              <button className="btn btn-primary" type="button" onClick={onExport}>
                Export Excel
              </button>
            </div>
          ) : null}
          <input
            ref={fileRef}
            className="hidden-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={onImport}
          />
        </nav>
      </header>

      {section === 'commercial' ? (
        <CommercialPanel />
      ) : (
        <>
      <section className="hero">
        <h1>Account team size & open demand tracker</h1>
        <p className="hero-note">
          KPIs count Active people on a current billing window, excluding Retired PODs
        </p>
        <div className="stats">
          <div className="stat-card">
            <span>Unique team members</span>
            <strong>{stats.headcount}</strong>
          </div>
          <div className="stat-card">
            <span>POD allocations</span>
            <strong>{stats.allocationRows}</strong>
          </div>
          <div className="stat-card">
            <span>Allocated capacity</span>
            <strong>{formatFte(stats.fte)}</strong>
          </div>
          <div className="stat-card">
            <span>Yet to be Billed</span>
            <strong>{stats.yetToStart}</strong>
          </div>
          <div className="stat-card">
            <span>Non-Billable</span>
            <strong>{stats.nonBillable}</strong>
          </div>
          <div className="stat-card">
            <span>Open positions</span>
            <strong>{stats.openPositions}</strong>
          </div>
        </div>
      </section>

      <div className="leadership">
        {state.leadership.map((l) => (
          <div className="lead-card" key={l.id}>
            <small>{l.role}</small>
            <strong>{l.assignee}</strong>
            <span>{l.allocation || 'Shared'}</span>
          </div>
        ))}
      </div>

      <div className="panels">
        <div className="panel">
          <div className="panel-head">
            <h2>Team size by Account → POD</h2>
            <button className="btn btn-ghost btn-small" type="button" onClick={openManagePods}>
              Manage PODs
            </button>
          </div>
          <p className="panel-note">
            Current billing only. Re-assignments (old POD ended / new POD scheduled) do not double-count.
            Retired PODs are hidden from KPIs.
          </p>
          <div className="bar-list">
            {accountPodRows.map((row) =>
              row.type === 'account' ? (
                <div className="bar-row account-row" key={`acct-${row.account}`}>
                  <span title={row.account}>{row.account}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill account-fill"
                      style={{ width: `${(row.count / maxAccountPod) * 100}%` }}
                    />
                  </div>
                  <strong>{row.count}</strong>
                </div>
              ) : (
                <div className="bar-row pod-row" key={`${row.account}-${row.pod}`}>
                  <span title={`${row.account} → ${row.pod}`}>↳ {row.pod}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(row.count / maxAccountPod) * 100}%` }}
                    />
                  </div>
                  <strong>{row.count}</strong>
                </div>
              ),
            )}
          </div>
        </div>
        <div className="panel">
          <h2>Open demand snapshot</h2>
          <div className="chips" style={{ marginBottom: '0.9rem' }}>
            {Object.entries(stats.byLocation).map(([loc, n]) => (
              <span className="chip" key={loc}>
                {loc} <b>{n}</b>
              </span>
            ))}
          </div>
          <div className="bar-list">
            {Object.entries(stats.byProject)
              .sort((a, b) => b[1] - a[1])
              .map(([project, n]) => (
                <div className="bar-row" key={project}>
                  <span title={project}>{project}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(n / maxProject) * 100}%` }}
                    />
                  </div>
                  <strong>{n}</strong>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button
          type="button"
          className={`tab ${tab === 'team' ? 'active' : ''}`}
          onClick={() => setTab('team')}
        >
          Team Members ({filteredTeamPeople}
          {filteredAssignmentCount !== filteredTeamPeople
            ? ` · ${filteredAssignmentCount} assignments`
            : ''}
          )
        </button>
        <button
          type="button"
          className={`tab ${tab === 'projects' ? 'active' : ''}`}
          onClick={() => setTab('projects')}
        >
          Projects ({projectTabTotals.projects}
          {projectTabTotals.billableFte
            ? ` · ${formatFte(projectTabTotals.billableFte)} billable`
            : ''}
          )
        </button>
        <button
          type="button"
          className={`tab ${tab === 'certs' ? 'active' : ''}`}
          onClick={() => setTab('certs')}
        >
          Certifications ({certStats.total}
          {certStats.completed ? ` · ${certStats.completed} done` : ''}
          )
        </button>
        <button
          type="button"
          className={`tab ${tab === 'demand' ? 'active' : ''}`}
          onClick={() => setTab('demand')}
        >
          Open Demands ({stats.openPositions})
        </button>
      </div>

      {tab === 'team' ? (
        <>
          <div className="toolbar">
            <div className="filters">
              <input
                className="search"
                placeholder="Search account, POD, role, skill, assignee, status..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="field"
                value={accountFilter}
                onChange={(e) => {
                  setAccountFilter(e.target.value)
                  setPodFilter('All')
                  setRoleFilter('All')
                }}
              >
                <option value="All">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={podFilter}
                onChange={(e) => {
                  setPodFilter(e.target.value)
                  setRoleFilter('All')
                }}
              >
                <option value="All">All PODs</option>
                {pods.map((p) => {
                  const meta = podRegistry.find(
                    (x) => x.name.toLowerCase() === String(p).toLowerCase(),
                  )
                  const retired = normalizePodStatus(meta?.status) === 'Retired'
                  return (
                    <option key={p} value={p}>
                      {retired ? `${p} (Retired)` : p}
                    </option>
                  )
                })}
              </select>
              <select
                className="field"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="All">All Roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={memberStatusFilter}
                onChange={(e) => setMemberStatusFilter(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Released">Released</option>
                <option value="Resigned">Resigned</option>
                <option value="All">All statuses</option>
              </select>
              <select
                className="field"
                value={allocPhaseFilter}
                onChange={(e) => setAllocPhaseFilter(e.target.value)}
              >
                <option value="All">All billing windows</option>
                <option value="Current">Current</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Ended">Ended</option>
              </select>
              <select
                className="field"
                value={billingFilter}
                onChange={(e) => setBillingFilter(e.target.value)}
              >
                <option value="All">All billing</option>
                <option value="Billable">Billable</option>
                <option value="Non-Billable">Non-Billable</option>
                <option value="Yet to be Billed">Yet to be Billed</option>
              </select>
            </div>
            <div className="toolbar-actions">
              <button className="btn btn-ghost" type="button" onClick={openManagePods}>
                Manage PODs
              </button>
              <button className="btn btn-primary" type="button" onClick={openAddTeam}>
                + Add team member
              </button>
            </div>
          </div>
          <TeamTable
            rows={filteredTeam}
            onEdit={openEditTeam}
            onDelete={deleteTeam}
            certifications={certifications}
            onOpenCerts={(person) => {
              setCertAssigneeFilter(person.assignee || 'All')
              setCertStatusFilter('All')
              setCertNameFilter('All')
              setQuery('')
              setTab('certs')
            }}
            viewFilters={{
              pod: podFilter,
              role: roleFilter,
              phase: allocPhaseFilter,
              billing: billingFilter,
            }}
          />
        </>
      ) : tab === 'projects' ? (
        <>
          <div className="toolbar">
            <div className="filters">
              <input
                className="search"
                placeholder="Search project, assignee, role..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="field"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
              >
                <option value="All">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={projectPhaseFilter}
                onChange={(e) => setProjectPhaseFilter(e.target.value)}
              >
                <option value="Current">Current assignments</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Ended">Ended</option>
                <option value="All">All windows</option>
              </select>
              <select
                className="field"
                value={projectRetiredFilter}
                onChange={(e) => setProjectRetiredFilter(e.target.value)}
              >
                <option value="Hide">Hide retired PODs</option>
                <option value="Active only">Active PODs only</option>
                <option value="Retired only">Retired PODs only</option>
                <option value="Show">Show retired too</option>
              </select>
            </div>
            <div className="toolbar-actions project-totals">
              <span className="chip">
                People <b>{projectTabTotals.people}</b>
              </span>
              <span className="chip">
                Billable <b>{formatFte(projectTabTotals.billableFte)}</b>
              </span>
              <span className="chip">
                Total <b>{formatFte(projectTabTotals.totalFte)}</b>
              </span>
            </div>
          </div>
          <p className="panel-note" style={{ marginTop: 0 }}>
            Each project (POD) lists linked people and FTE by billing type. Expand a row to see
            assignees. Open demand counts match demand project names to the POD.
          </p>
          <ProjectsTable
            rows={projectSummaries}
            onEditPerson={(personId) => {
              const person = state.teamMembers.find((p) => p.id === personId)
              if (person) openEditTeam(person)
            }}
            onOpenInTeam={(pod) => {
              setPodFilter(pod)
              setAllocPhaseFilter(projectPhaseFilter)
              setTab('team')
            }}
          />
        </>
      ) : tab === 'certs' ? (
        <>
          <div className="toolbar">
            <div className="filters">
              <input
                className="search"
                placeholder="Search name, certification, status..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="field"
                value={certAssigneeFilter}
                onChange={(e) => setCertAssigneeFilter(e.target.value)}
              >
                <option value="All">All people</option>
                {certAssignees.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={certNameFilter}
                onChange={(e) => setCertNameFilter(e.target.value)}
              >
                <option value="All">All certifications</option>
                {certNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={certStatusFilter}
                onChange={(e) => setCertStatusFilter(e.target.value)}
              >
                <option value="All">All statuses</option>
                {CERT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar-actions project-totals">
              <span className="chip">
                In progress <b>{certStats.inProgress}</b>
              </span>
              <span className="chip">
                Booked <b>{certStats.booked}</b>
              </span>
              <span className="chip">
                Completed <b>{certStats.completed}</b>
              </span>
              <button className="btn btn-primary" type="button" onClick={() => openAddCert()}>
                + Add certification
              </button>
            </div>
          </div>
          <p className="panel-note" style={{ marginTop: 0 }}>
            Certifications link to team members by name. Linked rows match a person in Team
            Members (e.g. Lakshmi B → Lakshmi B (LoopRx)). Import a Certifications sheet via
            Excel to bulk-load.
          </p>
          <CertTable
            rows={filteredCerts}
            onEdit={openEditCert}
            onDelete={deleteCert}
          />
        </>
      ) : (
        <>
          <div className="toolbar">
            <div className="filters">
              <input
                className="search"
                placeholder="Search project, role, type..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="field"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="All">All projects</option>
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="All">All locations</option>
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="UK">UK</option>
              </select>
              <select
                className="field"
                value={demandStatusFilter}
                onChange={(e) => setDemandStatusFilter(e.target.value)}
              >
                <option value="Active">Active (Open + In Progress)</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Filled">Filled</option>
                <option value="On Hold">On Hold</option>
                <option value="All">All statuses</option>
              </select>
            </div>
            <button className="btn btn-primary" type="button" onClick={openAddDemand}>
              + Add open demand
            </button>
          </div>
          <DemandTable
            rows={filteredDemands}
            onEdit={openEditDemand}
            onDelete={deleteDemand}
          />
        </>
      )}
        </>
      )}

      {modal && draft && (
        <Modal
          title={
            modal.type === 'pods'
              ? 'Manage POD status'
              : modal.type === 'cert'
                ? modal.mode === 'add'
                  ? 'Add certification'
                  : 'Edit certification'
                : modal.type === 'team'
                  ? modal.mode === 'add'
                    ? 'Add team member'
                    : 'Edit team member'
                  : modal.mode === 'add'
                    ? 'Add open demand'
                    : 'Edit open demand'
          }
          onClose={() => {
            setModal(null)
            setDraft(null)
          }}
          actions={
            <>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setModal(null)
                  setDraft(null)
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={saveModal}>
                Save
              </button>
            </>
          }
        >
          {modal.type === 'pods' ? (
            <div className="pod-manage">
              <p className="form-hint">
                Mark a POD as <b>Retired</b> when it is shutting down. Retired PODs drop out of
                KPIs and charts. People history remains in the Team Members table.
              </p>
              <div className="pod-manage-list">
                {(draft.pods || []).map((p) => (
                  <div className="pod-manage-row" key={p.name}>
                    <strong>{p.name}</strong>
                    <select
                      className="field"
                      value={normalizePodStatus(p.status)}
                      onChange={(e) => setPodDraftStatus(p.name, e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ) : modal.type === 'cert' ? (
            <CertForm
              value={draft}
              onChange={setDraft}
              teamMembers={state.teamMembers}
            />
          ) : modal.type === 'team' ? (
            <TeamForm value={draft} onChange={setDraft} pods={pods} />
          ) : (
            <DemandForm value={draft} onChange={setDraft} projects={projects} />
          )}
        </Modal>
      )}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
