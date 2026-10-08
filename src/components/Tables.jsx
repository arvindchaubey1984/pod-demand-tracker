import { Fragment, useMemo, useState } from 'react'
import {
  formatFte,
  getAllocationPhase,
  getAssignments,
  normalizeBillingStatus,
  normalizePodStatus,
} from '../utils/storage'

function certStatusBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') return 'badge-ok'
  if (s.includes('book')) return 'badge-info'
  if (s === 'yts') return 'badge-muted'
  return 'badge-warn'
}

function formatCertDate(value) {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })
}

function billingBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('non')) return 'badge-muted'
  if (s.includes('yet')) return 'badge-warn'
  if (s.includes('billable')) return 'badge-ok'
  return 'badge-muted'
}

function memberStatusBadge(status) {
  const s = String(status || 'Active').toLowerCase()
  if (s === 'active') return 'badge-ok'
  if (s === 'released') return 'badge-warn'
  if (s === 'resigned') return 'badge-muted'
  return 'badge-muted'
}

function phaseBadge(phase) {
  if (phase === 'Current') return 'badge-ok'
  if (phase === 'Scheduled') return 'badge-info'
  return 'badge-muted'
}

function sortAssignments(assignments) {
  const rank = { Current: 0, Scheduled: 1, Ended: 2 }
  return [...assignments].sort((a, b) => {
    const pa = getAllocationPhase(a)
    const pb = getAllocationPhase(b)
    if (rank[pa] !== rank[pb]) return rank[pa] - rank[pb]
    return String(a.pod || '').localeCompare(String(b.pod || ''))
  })
}

function filterAssignments(assignments, viewFilters = {}) {
  const { pod = 'All', role = 'All', phase = 'All', billing = 'All' } = viewFilters
  return assignments.filter((a) => {
    if (pod !== 'All' && a.pod !== pod) return false
    if (role !== 'All' && a.role !== role) return false
    if (phase !== 'All' && getAllocationPhase(a) !== phase) return false
    if (billing !== 'All' && normalizeBillingStatus(a.billingStatus) !== billing) {
      return false
    }
    return true
  })
}

function primaryAssignment(person, viewFilters) {
  const all = sortAssignments(getAssignments(person))
  const visible = sortAssignments(filterAssignments(all, viewFilters))
  return visible[0] || all[0] || {}
}

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function SortTh({ label, col, sortKey, sortDir, onSort }) {
  const active = sortKey === col
  return (
    <th aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        className={`sort-th ${active ? 'active' : ''}`}
        onClick={() => onSort(col)}
      >
        <span>{label}</span>
        <span className="sort-ind" aria-hidden="true">
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  )
}

function useColumnSort(defaultKey = 'assignee', defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)

  function onSort(col) {
    if (sortKey === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col)
      setSortDir('asc')
    }
  }

  return { sortKey, sortDir, onSort }
}

function teamSortValue(person, key, viewFilters) {
  const all = getAssignments(person)
  const visible = filterAssignments(all, viewFilters)
  const primary = primaryAssignment(person, viewFilters)
  switch (key) {
    case 'sno':
      return Number(person.sno) || 0
    case 'account':
      return person.account || ''
    case 'assignee':
      return person.assignee || ''
    case 'status':
      return person.status || 'Active'
    case 'location':
      return person.location || ''
    case 'pod':
      return primary.pod || ''
    case 'role':
      return primary.role || ''
    case 'phase':
      return getAllocationPhase(primary)
    case 'count':
      return visible.length || all.length
    default:
      return person.assignee || ''
  }
}

export function TeamTable({
  rows,
  onEdit,
  onDelete,
  viewFilters = { pod: 'All', role: 'All', phase: 'All', billing: 'All' },
}) {
  const { sortKey, sortDir, onSort } = useColumnSort('assignee', 'asc')
  const filtersActive =
    viewFilters.pod !== 'All' ||
    viewFilters.role !== 'All' ||
    viewFilters.phase !== 'All' ||
    viewFilters.billing !== 'All'

  const sortedRows = useMemo(() => {
    const list = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort(
      (a, b) =>
        compareValues(
          teamSortValue(a, sortKey, viewFilters),
          teamSortValue(b, sortKey, viewFilters),
        ) * dir,
    )
    return list
  }, [rows, sortKey, sortDir, viewFilters])

  if (!rows.length) {
    return <div className="empty">No team members match the current filters.</div>
  }

  return (
    <div className="table-wrap team-table person-table">
      <table>
        <thead>
          <tr>
            <SortTh label="#" col="sno" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh
              label="Account"
              col="account"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Assignee"
              col="assignee"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Status"
              col="status"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Loc"
              col="location"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="POD"
              col="pod"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Role"
              col="role"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Window"
              col="phase"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="# Asgn"
              col="count"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th>Assignment details</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((person, i) => {
            const allAssignments = sortAssignments(getAssignments(person))
            const visibleAssignments = sortAssignments(
              filterAssignments(allAssignments, viewFilters),
            )
            // When filters are on, show only matching assignments; else show all
            const shown = filtersActive ? visibleAssignments : allAssignments
            const primary = shown[0] || allAssignments[0] || {}
            const primaryPhase = getAllocationPhase(primary)
            return (
              <tr key={person.id}>
                <td>{i + 1}</td>
                <td>{person.account || '—'}</td>
                <td>
                  <strong>{person.assignee || '—'}</strong>
                  {filtersActive && allAssignments.length > shown.length ? (
                    <div className="muted-line">
                      Showing {shown.length} of {allAssignments.length}
                    </div>
                  ) : null}
                </td>
                <td>
                  <span className={`badge ${memberStatusBadge(person.status)}`}>
                    {person.status || 'Active'}
                  </span>
                </td>
                <td>{person.location || '—'}</td>
                <td>
                  <span className="badge badge-info">{primary.pod || '—'}</span>
                </td>
                <td>{primary.role || '—'}</td>
                <td>
                  <span className={`badge ${phaseBadge(primaryPhase)}`}>{primaryPhase}</span>
                </td>
                <td>
                  <strong>{shown.length}</strong>
                  {filtersActive && allAssignments.length !== shown.length ? (
                    <div className="muted-line">of {allAssignments.length}</div>
                  ) : null}
                </td>
                <td>
                  <div className="assignment-list">
                    {shown.length === 0 ? (
                      <div className="muted-line">No assignments match filters</div>
                    ) : (
                      shown.map((a) => {
                        const phase = getAllocationPhase(a)
                        return (
                          <div
                            className={`assignment-chip ${phase !== 'Current' ? 'dim' : ''}`}
                            key={a.id}
                          >
                            <div className="assignment-chip-top">
                              <span className="badge badge-info">{a.pod || '—'}</span>
                              <span className={`badge ${phaseBadge(phase)}`}>{phase}</span>
                              {a.billingStatus ? (
                                <span className={`badge ${billingBadge(a.billingStatus)}`}>
                                  {a.billingStatus}
                                </span>
                              ) : null}
                              {a.allocation ? (
                                <span className="alloc-pill">{a.allocation}</span>
                              ) : null}
                            </div>
                            <div className="assignment-chip-meta">
                              <span>{a.role || '—'}</span>
                              {a.skill ? <span>· {a.skill}</span> : null}
                              <span>
                                · {a.onboardMonth || '—'} → {a.endDate || '—'}
                              </span>
                            </div>
                            {a.remarks ? (
                              <div className="assignment-chip-note">{a.remarks}</div>
                            ) : null}
                          </div>
                        )
                      })
                    )}
                  </div>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      onClick={() => onEdit(person)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => onDelete(person.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatOpenDate(value) {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function demandSortValue(row, key) {
  switch (key) {
    case 'sno':
      return Number(row.sno) || 0
    case 'project':
      return row.projectName || ''
    case 'role':
      return row.role || ''
    case 'location':
      return row.location || ''
    case 'openDate':
      return row.demandOpenDate || ''
    case 'onboarded':
      return row.onboardedMember || ''
    case 'type':
      return row.newOrReplacement || ''
    case 'positions':
      return Number(row.positions) || 0
    case 'status':
      return row.status || 'Open'
    default:
      return row.projectName || ''
  }
}

function projectSortValue(row, key) {
  switch (key) {
    case 'pod':
      return row.pod || ''
    case 'status':
      return row.status || ''
    case 'people':
      return row.peopleCount || 0
    case 'billable':
      return row.billableFte || 0
    case 'nonBillable':
      return row.nonBillableFte || 0
    case 'yetToBill':
      return row.yetToBillFte || 0
    case 'total':
      return row.totalFte || 0
    case 'open':
      return row.openPositions || 0
    default:
      return row.pod || ''
  }
}

export function ProjectsTable({ rows, onEditPerson, onOpenInTeam }) {
  const { sortKey, sortDir, onSort } = useColumnSort('billable', 'desc')
  const [expanded, setExpanded] = useState(() => new Set())

  const sortedRows = useMemo(() => {
    const list = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort(
      (a, b) =>
        compareValues(projectSortValue(a, sortKey), projectSortValue(b, sortKey)) * dir,
    )
    return list
  }, [rows, sortKey, sortDir])

  function toggle(pod) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(pod)) next.delete(pod)
      else next.add(pod)
      return next
    })
  }

  if (!rows.length) {
    return <div className="empty">No projects match the current filters.</div>
  }

  return (
    <div className="table-wrap projects-table">
      <table>
        <thead>
          <tr>
            <th className="expand-col" aria-label="Expand" />
            <SortTh label="Project" col="pod" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh
              label="Status"
              col="status"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th>Account</th>
            <SortTh
              label="People"
              col="people"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Billable FTE"
              col="billable"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Non-Billable FTE"
              col="nonBillable"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Yet to Bill FTE"
              col="yetToBill"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Total FTE"
              col="total"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Open demand"
              col="open"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const open = expanded.has(row.pod)
            const retired = normalizePodStatus(row.status) === 'Retired'
            return (
              <Fragment key={row.pod}>
                <tr className={retired ? 'row-retired' : ''}>
                  <td>
                    <button
                      type="button"
                      className={`expand-btn ${open ? 'open' : ''}`}
                      onClick={() => toggle(row.pod)}
                      aria-expanded={open}
                      aria-label={open ? 'Hide people' : 'Show people'}
                    >
                      {open ? '▾' : '▸'}
                    </button>
                  </td>
                  <td>
                    <strong>{row.pod}</strong>
                    <div className="muted-line">{row.assignments} assignment(s)</div>
                  </td>
                  <td>
                    <span className={`badge ${retired ? 'badge-muted' : 'badge-ok'}`}>
                      {row.status || 'Active'}
                    </span>
                  </td>
                  <td>{row.accounts?.length ? row.accounts.join(', ') : '—'}</td>
                  <td>
                    <strong>{row.peopleCount}</strong>
                  </td>
                  <td>
                    <strong className="fte-billable">{formatFte(row.billableFte)}</strong>
                    <div className="muted-line">{row.billableCount} slots</div>
                  </td>
                  <td>
                    <span>{formatFte(row.nonBillableFte)}</span>
                    <div className="muted-line">{row.nonBillableCount} slots</div>
                  </td>
                  <td>
                    <span>{formatFte(row.yetToBillFte)}</span>
                    <div className="muted-line">{row.yetToBillCount} slots</div>
                  </td>
                  <td>
                    <strong>{formatFte(row.totalFte)}</strong>
                  </td>
                  <td>{row.openPositions || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => toggle(row.pod)}
                      >
                        {open ? 'Hide' : 'People'}
                      </button>
                      {onOpenInTeam ? (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => onOpenInTeam(row.pod)}
                        >
                          Team view
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {open ? (
                  <tr className="project-people-row">
                    <td colSpan={11}>
                      {row.people.length === 0 ? (
                        <div className="muted-line">No people linked for this filter.</div>
                      ) : (
                        <div className="project-people">
                          <table>
                            <thead>
                              <tr>
                                <th>Assignee</th>
                                <th>Status</th>
                                <th>Loc</th>
                                <th>Role</th>
                                <th>Billing</th>
                                <th>Alloc</th>
                                <th>Window</th>
                                <th>Phase</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {row.people.map((p) => (
                                <tr key={p.assignmentId || `${p.personId}-${p.role}`}>
                                  <td>
                                    <strong>{p.assignee || '—'}</strong>
                                    {p.skill ? (
                                      <div className="muted-line">{p.skill}</div>
                                    ) : null}
                                  </td>
                                  <td>
                                    <span className={`badge ${memberStatusBadge(p.status)}`}>
                                      {p.status || 'Active'}
                                    </span>
                                  </td>
                                  <td>{p.location || '—'}</td>
                                  <td>{p.role || '—'}</td>
                                  <td>
                                    <span
                                      className={`badge ${billingBadge(p.billingStatus)}`}
                                    >
                                      {p.billingStatus}
                                    </span>
                                  </td>
                                  <td>
                                    {p.allocation || '—'}
                                    {p.fte ? (
                                      <div className="muted-line">{p.fte.toFixed(2)} FTE</div>
                                    ) : null}
                                  </td>
                                  <td>
                                    {p.onboardMonth || '—'} → {p.endDate || '—'}
                                  </td>
                                  <td>
                                    <span className={`badge ${phaseBadge(p.phase)}`}>
                                      {p.phase}
                                    </span>
                                  </td>
                                  <td>
                                    {onEditPerson && p.personId ? (
                                      <button
                                        type="button"
                                        className="icon-btn"
                                        onClick={() => onEditPerson(p.personId)}
                                      >
                                        Edit
                                      </button>
                                    ) : null}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function certSortValue(row, key) {
  switch (key) {
    case 'sno':
      return Number(row.sno) || 0
    case 'assignee':
      return row.assignee || ''
    case 'certification':
      return row.certification || ''
    case 'exam':
      return row.tentativeExamDate || ''
    case 'status':
      return row.status || ''
    case 'done':
      return row.completionDate || ''
    case 'linked':
      return row.personId ? 1 : 0
    default:
      return row.assignee || ''
  }
}

export function CertTable({ rows, onEdit, onDelete }) {
  const { sortKey, sortDir, onSort } = useColumnSort('assignee', 'asc')

  const sortedRows = useMemo(() => {
    const list = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort(
      (a, b) =>
        compareValues(certSortValue(a, sortKey), certSortValue(b, sortKey)) * dir,
    )
    return list
  }, [rows, sortKey, sortDir])

  if (!rows.length) {
    return <div className="empty">No certifications match the current filters.</div>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <SortTh label="#" col="sno" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh
              label="Name"
              col="assignee"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Certification to pursue"
              col="certification"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Tentative exam date"
              col="exam"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Status"
              col="status"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Completion date"
              col="done"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Team link"
              col="linked"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((c, i) => (
            <tr key={c.id}>
              <td>{i + 1}</td>
              <td>
                <strong>{c.assignee || '—'}</strong>
              </td>
              <td>{c.certification || '—'}</td>
              <td>{formatCertDate(c.tentativeExamDate)}</td>
              <td>
                <span className={`badge ${certStatusBadge(c.status)}`}>{c.status}</span>
              </td>
              <td>{formatCertDate(c.completionDate)}</td>
              <td>
                {c.personId ? (
                  <span className="badge badge-ok">Linked</span>
                ) : (
                  <span className="badge badge-muted">Unlinked</span>
                )}
              </td>
              <td>
                <div className="row-actions">
                  <button className="icon-btn" type="button" onClick={() => onEdit(c)}>
                    Edit
                  </button>
                  <button className="icon-btn" type="button" onClick={() => onDelete(c.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DemandTable({ rows, onEdit, onDelete }) {
  const { sortKey, sortDir, onSort } = useColumnSort('project', 'asc')

  const sortedRows = useMemo(() => {
    const list = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort(
      (a, b) =>
        compareValues(demandSortValue(a, sortKey), demandSortValue(b, sortKey)) * dir,
    )
    return list
  }, [rows, sortKey, sortDir])

  if (!rows.length) {
    return <div className="empty">No open demands match the current filters.</div>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <SortTh label="#" col="sno" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh
              label="Project"
              col="project"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh label="Role" col="role" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh
              label="Location"
              col="location"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Open Date"
              col="openDate"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Onboarded Member"
              col="onboarded"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh label="Type" col="type" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh
              label="Positions"
              col="positions"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Status"
              col="status"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((d, i) => (
            <tr key={d.id}>
              <td>{i + 1}</td>
              <td>
                <span className="badge badge-info">{d.projectName || '—'}</span>
              </td>
              <td>{d.role || '—'}</td>
              <td>{d.location || '—'}</td>
              <td>{formatOpenDate(d.demandOpenDate)}</td>
              <td>{d.onboardedMember || '—'}</td>
              <td>{d.newOrReplacement || '—'}</td>
              <td>
                <strong>{d.positions || 1}</strong>
              </td>
              <td>
                <span
                  className={`badge ${
                    d.status === 'Filled'
                      ? 'badge-ok'
                      : d.status === 'On Hold'
                        ? 'badge-warn'
                        : 'badge-info'
                  }`}
                >
                  {d.status || 'Open'}
                </span>
              </td>
              <td>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => onEdit(d)} type="button">
                    Edit
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => onDelete(d.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
