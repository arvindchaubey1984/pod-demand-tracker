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

export function TeamTable({ rows, onEdit, onDelete }) {
  if (!rows.length) {
    return <div className="empty">No team members match the current filters.</div>
  }
  return (
    <div className="table-wrap team-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Account</th>
            <th>POD</th>
            <th>Role</th>
            <th>Skill</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Loc</th>
            <th>Billing</th>
            <th>Alloc</th>
            <th>Onboard</th>
            <th>End</th>
            <th>Remarks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr key={m.id}>
              <td>{m.sno || i + 1}</td>
              <td>{m.account || '—'}</td>
              <td>
                <span className="badge badge-info">{m.pod || '—'}</span>
              </td>
              <td>{m.role || '—'}</td>
              <td>{m.skill || '—'}</td>
              <td>{m.assignee || '—'}</td>
              <td>
                <span className={`badge ${memberStatusBadge(m.status)}`}>
                  {m.status || 'Active'}
                </span>
              </td>
              <td>{m.location || '—'}</td>
              <td>
                {m.billingStatus ? (
                  <span className={`badge ${billingBadge(m.billingStatus)}`}>
                    {m.billingStatus}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td>{m.allocation || '—'}</td>
              <td>{m.onboardMonth || '—'}</td>
              <td>{m.endDate || '—'}</td>
              <td>{m.remarks || '—'}</td>
              <td>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => onEdit(m)} type="button">
                    Edit
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => onDelete(m.id)}
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
