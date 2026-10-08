import { getAllocationPhase, getAssignments } from '../utils/storage'

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

export function TeamTable({ rows, onEdit, onDelete }) {
  if (!rows.length) {
    return <div className="empty">No team members match the current filters.</div>
  }
  return (
    <div className="table-wrap team-table person-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Account</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Loc</th>
            <th>Assignments (POD · role · billing window)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((person, i) => {
            const assignments = sortAssignments(getAssignments(person))
            return (
              <tr key={person.id}>
                <td>{person.sno || i + 1}</td>
                <td>{person.account || '—'}</td>
                <td>
                  <strong>{person.assignee || '—'}</strong>
                  <div className="muted-line">
                    {assignments.length} assignment{assignments.length === 1 ? '' : 's'}
                  </div>
                </td>
                <td>
                  <span className={`badge ${memberStatusBadge(person.status)}`}>
                    {person.status || 'Active'}
                  </span>
                </td>
                <td>{person.location || '—'}</td>
                <td>
                  <div className="assignment-list">
                    {assignments.map((a) => {
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
                    })}
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

export function DemandTable({ rows, onEdit, onDelete }) {
  if (!rows.length) {
    return <div className="empty">No open demands match the current filters.</div>
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Project</th>
            <th>Role</th>
            <th>Location</th>
            <th>Open Date</th>
            <th>Onboarded Member</th>
            <th>Type</th>
            <th>Positions</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={d.id}>
              <td>{d.sno || i + 1}</td>
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
