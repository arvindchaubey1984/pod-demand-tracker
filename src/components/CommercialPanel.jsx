import { useMemo, useState } from 'react'
import {
  computeCommercialStats,
  formatNumber,
  formatUsd,
  getCommercialData,
} from '../utils/commercial'

export default function CommercialPanel() {
  const data = useMemo(() => getCommercialData(), [])
  const stats = useMemo(() => computeCommercialStats(data), [data])
  const [view, setView] = useState('executive')
  const [podFilter, setPodFilter] = useState('All')
  const [projectFilter, setProjectFilter] = useState('All')
  const [query, setQuery] = useState('')

  const projects = useMemo(
    () => [...new Set(stats.lineItems.map((i) => i.project).filter(Boolean))].sort(),
    [stats.lineItems],
  )

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return stats.lineItems.filter((item) => {
      if (podFilter !== 'All' && item.podCode !== podFilter) return false
      if (projectFilter !== 'All' && item.project !== projectFilter) return false
      if (!q) return true
      return [item.role, item.project, item.area, item.location, item.podName, item.teamPod]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [stats.lineItems, podFilter, projectFilter, query])

  const maxPodTotal = Math.max(...stats.pods.map((p) => Number(p.grandTotal) || 0), 1)
  const maxProject = Math.max(...Object.values(stats.byProject).map((p) => p.amount), 1)

  return (
    <div className="commercial">
      <div className="commercial-head">
        <div>
          <h2>FY27 Commercial</h2>
          <p>
            McKesson cost model from <em>{data.source}</em> · currency {data.currency}
          </p>
        </div>
        <div className="view-toggle" role="tablist">
          <button
            type="button"
            className={`tab ${view === 'executive' ? 'active' : ''}`}
            onClick={() => setView('executive')}
          >
            Executive
          </button>
          <button
            type="button"
            className={`tab ${view === 'detailed' ? 'active' : ''}`}
            onClick={() => setView('detailed')}
          >
            Detailed
          </button>
        </div>
      </div>

      <div className="stats commercial-stats">
        <div className="stat-card dark">
          <span>FY27 Grand Total</span>
          <strong>{formatUsd(stats.totals.grandTotal)}</strong>
        </div>
        <div className="stat-card dark">
          <span>MRx POD Price</span>
          <strong>{formatUsd(stats.totals.mrxPrice)}</strong>
        </div>
        <div className="stat-card dark">
          <span>Total Hours</span>
          <strong>{formatNumber(stats.totals.hours)}</strong>
        </div>
        <div className="stat-card dark">
          <span>PODs</span>
          <strong>{stats.podCount}</strong>
        </div>
        <div className="stat-card dark">
          <span>Roles / Lines</span>
          <strong>{stats.roleCount}</strong>
        </div>
      </div>

      {view === 'executive' ? (
        <>
          <div className="panels">
            <div className="panel">
              <h2>POD commercial summary</h2>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>POD</th>
                      <th>Est. Price</th>
                      <th>Winfo Inv.</th>
                      <th>MRx Price</th>
                      <th>Blended $/hr</th>
                      <th>Shift</th>
                      <th>Travel</th>
                      <th>Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.pods.map((pod) => (
                      <tr key={pod.code}>
                        <td>
                          <strong>
                            {pod.code} · {pod.name}
                          </strong>
                        </td>
                        <td>{formatUsd(pod.estimatedPrice)}</td>
                        <td>{formatUsd(pod.winfoInvestment)}</td>
                        <td>{formatUsd(pod.mrxPrice)}</td>
                        <td>{formatUsd(pod.blendedRate, 0)}</td>
                        <td>{formatUsd(pod.shiftExpenses)}</td>
                        <td>{formatUsd(pod.travelExpense)}</td>
                        <td>
                          <strong>{formatUsd(pod.grandTotal)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="panels">
            <div className="panel">
              <h2>Grand total by POD</h2>
              <div className="bar-list">
                {stats.pods
                  .slice()
                  .sort((a, b) => (b.grandTotal || 0) - (a.grandTotal || 0))
                  .map((pod) => (
                    <div className="bar-row" key={pod.code}>
                      <span title={`${pod.code} ${pod.name}`}>
                        {pod.code} {pod.name}
                      </span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${((pod.grandTotal || 0) / maxPodTotal) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>{formatUsd(pod.grandTotal)}</strong>
                    </div>
                  ))}
              </div>
            </div>
            <div className="panel">
              <h2>Spend by project</h2>
              <div className="bar-list">
                {Object.entries(stats.byProject)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([project, info]) => (
                    <div className="bar-row" key={project}>
                      <span title={project}>{project}</span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${(info.amount / maxProject) * 100}%` }}
                        />
                      </div>
                      <strong>{formatUsd(info.amount)}</strong>
                    </div>
                  ))}
              </div>
              <div className="chips" style={{ marginTop: '1rem' }}>
                <span className="chip">
                  Avg blended rate <b>{formatUsd(stats.avgBlended, 0)}/hr</b>
                </span>
                <span className="chip">
                  Shift expenses <b>{formatUsd(stats.totals.shiftExpenses)}</b>
                </span>
                <span className="chip">
                  Travel <b>{formatUsd(stats.totals.travelExpense)}</b>
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="toolbar">
            <div className="filters">
              <input
                className="search"
                placeholder="Search role, project, location..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="field"
                value={podFilter}
                onChange={(e) => setPodFilter(e.target.value)}
              >
                <option value="All">All PODs</option>
                {stats.pods.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
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
            </div>
            <div className="chip">
              Showing <b>{filteredItems.length}</b> lines
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>POD</th>
                  <th>Project</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Rate/hr</th>
                  <th>Alloc %</th>
                  <th>Hours</th>
                  <th>Amount</th>
                  {stats.months.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="badge badge-info">
                        {item.podCode} · {item.podName}
                      </span>
                    </td>
                    <td>{item.project || '—'}</td>
                    <td>{item.role}</td>
                    <td>{item.location || '—'}</td>
                    <td>{formatUsd(item.rateHr, 0)}</td>
                    <td>
                      {item.allocationPct != null ? `${item.allocationPct}%` : '—'}
                    </td>
                    <td>{formatNumber(item.hours)}</td>
                    <td>
                      <strong>{formatUsd(item.amount)}</strong>
                    </td>
                    {stats.months.map((m) => (
                      <td key={`${item.id}-${m}`}>
                        {item.months?.[m] != null ? formatNumber(item.months[m]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
