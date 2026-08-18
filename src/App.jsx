import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import CommercialPanel from './components/CommercialPanel'
import { DemandForm, Modal, TeamForm } from './components/Forms'
import { DemandTable, TeamTable } from './components/Tables'
import { exportWorkbook, importWorkbook } from './utils/excel'
import {
  computeStats,
  formatFte,
  isActiveOpenDemand,
  loadState,
  normalizeBillingStatus,
  resetState,
  saveState,
  uid,
  uniquePeopleCount,
  uniqueSorted,
  DEFAULT_DEMAND_OPEN_DATE,
  DEFAULT_TEAM_END_DATE,
  DEFAULT_TEAM_ACCOUNT,
  DEFAULT_TEAM_LOCATION,
} from './utils/storage'

const emptyTeam = {
  pod: '',
  account: DEFAULT_TEAM_ACCOUNT,
  location: DEFAULT_TEAM_LOCATION,
  role: '',
  skill: '',
  assignee: '',
  billingStatus: 'Billable',
  allocation: '100%',
  onboardMonth: '',
  endDate: DEFAULT_TEAM_END_DATE,
  remarks: '',
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
  const [projectFilter, setProjectFilter] = useState('All')
  const [locationFilter, setLocationFilter] = useState('All')
  const [demandStatusFilter, setDemandStatusFilter] = useState('Active')
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

  const stats = useMemo(
    () => computeStats(state.teamMembers, state.openDemands),
    [state.teamMembers, state.openDemands],
  )

  const accounts = useMemo(
    () => uniqueSorted(state.teamMembers, 'account'),
    [state.teamMembers],
  )
  const pods = useMemo(() => {
    const source =
      accountFilter === 'All'
        ? state.teamMembers
        : state.teamMembers.filter((m) => m.account === accountFilter)
    return uniqueSorted(source, 'pod')
  }, [state.teamMembers, accountFilter])
  const roles = useMemo(() => {
    const source = state.teamMembers.filter((m) => {
      if (accountFilter !== 'All' && m.account !== accountFilter) return false
      if (podFilter !== 'All' && m.pod !== podFilter) return false
      return true
    })
    return uniqueSorted(source, 'role')
  }, [state.teamMembers, accountFilter, podFilter])
  const projects = useMemo(
    () => uniqueSorted(state.openDemands, 'projectName'),
    [state.openDemands],
  )

  const filteredTeam = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.teamMembers.filter((m) => {
      if (accountFilter !== 'All' && m.account !== accountFilter) return false
      if (podFilter !== 'All' && m.pod !== podFilter) return false
      if (roleFilter !== 'All' && m.role !== roleFilter) return false
      if (!q) return true
      return [
        m.account,
        m.pod,
        m.role,
        m.skill,
        m.assignee,
        m.location,
        m.billingStatus,
        m.allocation,
        m.onboardMonth,
        m.endDate,
        m.remarks,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [state.teamMembers, accountFilter, podFilter, roleFilter, query])

  const filteredTeamPeople = useMemo(
    () => uniquePeopleCount(filteredTeam),
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

  function notify(message) {
    setToast(message)
  }

  function openAddTeam() {
    setDraft({ ...emptyTeam })
    setModal({ type: 'team', mode: 'add' })
  }

  function openEditTeam(row) {
    setDraft({ ...row })
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

  function saveModal() {
    if (!draft) return
    if (modal.type === 'team') {
      if (!draft.role && !draft.assignee) {
        notify('Role or Assignee is required')
        return
      }
      setState((prev) => {
        const row = {
          ...draft,
          billingStatus: normalizeBillingStatus(draft.billingStatus),
        }
        if (modal.mode === 'add') {
          return {
            ...prev,
            teamMembers: [
              ...prev.teamMembers,
              { ...row, id: uid('tm'), sno: String(prev.teamMembers.length + 1) },
            ],
          }
        }
        return {
          ...prev,
          teamMembers: prev.teamMembers.map((m) =>
            m.id === modal.id ? { ...m, ...row } : m,
          ),
        }
      })
      notify(modal.mode === 'add' ? 'Team member added' : 'Team member updated')
    } else {
      if (!draft.role) {
        notify('Role is required')
        return
      }
      setState((prev) => {
        if (modal.mode === 'add') {
          return {
            ...prev,
            openDemands: [
              ...prev.openDemands,
              { ...draft, id: uid('od'), sno: String(prev.openDemands.length + 1) },
            ],
          }
        }
        return {
          ...prev,
          openDemands: prev.openDemands.map((d) =>
            d.id === modal.id ? { ...d, ...draft } : d,
          ),
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
      teamMembers: prev.teamMembers.filter((m) => m.id !== id),
    }))
    notify('Team member removed')
  }

  function deleteDemand(id) {
    if (!window.confirm('Remove this open demand?')) return
    setState((prev) => ({
      ...prev,
      openDemands: prev.openDemands.filter((d) => d.id !== id),
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
      }))
      notify(`Imported ${imported.teamMembers.length} team + ${imported.openDemands.length} demands`)
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
          <h2>Team size by Account → POD</h2>
          <p className="panel-note">
            Account total = unique people. POD rows = allocations (multi-POD people appear in each POD).
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
          {filteredTeam.length !== filteredTeamPeople
            ? ` · ${filteredTeam.length} allocations`
            : ''}
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
                placeholder="Search account, POD, role, skill, assignee..."
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
                {pods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
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
            </div>
            <button className="btn btn-primary" type="button" onClick={openAddTeam}>
              + Add team member
            </button>
          </div>
          <TeamTable
            rows={filteredTeam}
            onEdit={openEditTeam}
            onDelete={deleteTeam}
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
            modal.type === 'team'
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
          {modal.type === 'team' ? (
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
