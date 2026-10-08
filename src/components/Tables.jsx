import { useMemo, useState } from 'react'
import {
  getAllocationPhase,
  getAssignments,
  normalizeBillingStatus,
} from '../utils/storage'

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
