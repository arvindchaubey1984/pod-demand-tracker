import { useMemo, useState } from 'react'
import {
  computeCommercialStats,
  filterCommercialBySow,
  formatNumber,
  formatUsd,
  getCommercialData,
  getSowOptions,
} from '../utils/commercial'

export default function CommercialPanel() {
  const data = useMemo(() => getCommercialData(), [])
  const sowOptions = useMemo(() => getSowOptions(data), [data])
  const [sowId, setSowId] = useState('mayOnward')
  const [view, setView] = useState('executive')
  const [podFilter, setPodFilter] = useState('All')
  const [projectFilter, setProjectFilter] = useState('All')
  const [query, setQuery] = useState('')

  const sowView = useMemo(
    () => computeCommercialStats(filterCommercialBySow(sowId, data)),
    [sowId, data],
  )
  const activeSow = sowOptions.find((s) => s.id === sowId) || sowOptions[0]

  const projects = useMemo(
    () => [...new Set(sowView.lineItems.map((i) => i.project).filter(Boolean))].sort(),
    [sowView.lineItems],
  )

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sowView.lineItems.filter((item) => {
      if (podFilter !== 'All' && item.podCode !== podFilter) return false
      if (projectFilter !== 'All' && item.project !== projectFilter) return false
      if (!q) return true
      return [item.role, item.project, item.area, item.location, item.podName, item.teamPod]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [sowView.lineItems, podFilter, projectFilter, query])

  const maxPodTotal = Math.max(...sowView.pods.map((p) => Number(p.viewAmount) || 0), 1)
  const maxProject = Math.max(...Object.values(sowView.byProject).map((p) => p.amount), 1)

  return (
    <div className="commercial">
      <div className="commercial-head">
        <div>
          <h2>FY27 Commercial</h2>
          <p>
            McKesson · {activeSow?.label} — {activeSow?.description || data.source}
            {data.notes ? ` · ${data.notes}` : ''}
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

      <div className="sow-toggle" role="tablist" aria-label="SOW views">
        {sowOptions.map((sow) => (
          <button
            key={sow.id}
            type="button"
            className={`sow-btn ${sowId === sow.id ? 'active' : ''}`}
            onClick={() => {
              setSowId(sow.id)
              setPodFilter('All')
              setProjectFilter('All')
            }}
          >
            {sow.label}
          </button>
        ))}
      </div>

      <div className="stats commercial-stats">
        <div className="stat-card dark">
          <span>{sowId === 'combined' ? 'FY27 Grand Total' : 'SOW Amount'}</span>
          <strong>{formatUsd(sowView.totals.amount)}</strong>
        </div>
        <div className="stat-card dark">
          <span>Hours</span>
          <strong>{formatNumber(sowView.totals.hours)}</strong>
        </div>
        <div className="stat-card dark">
          <span>PODs</span>
          <strong>{sowView.totals.pods}</strong>
        </div>
        <div className="stat-card dark">
          <span>Roles / Lines</span>
          <strong>{sowView.totals.roles}</strong>
        </div>
        {sowId === 'combined' ? (
          <div className="stat-card dark">
            <span>April SOW / May+ SOW</span>
            <strong className="stat-split">
              {formatUsd(sowView.totals.aprilSowCost)}
              <small> / {formatUsd(sowView.totals.mayOnwardCost)}</small>
            </strong>
          </div>
        ) : (
          <div className="stat-card dark">
            <span>Months in view</span>
            <strong>{sowView.months.length}</strong>
          </div>
        )}
      </div>

      {view === 'executive' ? (
        <>
          <div className="panels">
            <div className="panel">
              <h2>
                {sowId === 'combined'
                  ? 'POD commercial summary (full FY27)'
                  : 'POD summary for selected SOW'}
              </h2>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>POD</th>
        {sowId === 'combined' ? (
          <>
            <th>Est. Price</th>
            <th>Winfo Inv.</th>
            <th>MRx Price (May+)</th>
            <th>April SOW</th>
            <th>May+ Grand</th>
            <th>Combined</th>
          </>
        ) : sowId === 'mayOnward' ? (
          <>
            <th>Est. Price</th>
            <th>Winfo Inv.</th>
            <th>MRx Price</th>
            <th>Blended $/hr</th>
            <th>Shift</th>
            <th>Travel</th>
            <th>Grand Total</th>
          </>
        ) : (
          <>
            <th>Roles</th>
            <th>Hours</th>
            <th>Amount</th>
          </>
        )}
                    </tr>
                  </thead>
                  <tbody>
                    {sowView.pods.map((pod) => (
                      <tr key={pod.code}>
                        <td>
                          <strong>
                            {pod.code} · {pod.name}
                          </strong>
                        </td>
                        {sowId === 'combined' ? (
                          <>
                            <td>{formatUsd(pod.estimatedPrice)}</td>
                            <td>{formatUsd(pod.winfoInvestment)}</td>
                            <td>{formatUsd(pod.mrxPrice)}</td>
                            <td>{formatUsd(pod.aprilAmount)}</td>
                            <td>{formatUsd(pod.mayAmount)}</td>
                            <td>
                              <strong>{formatUsd(pod.viewAmount)}</strong>
                            </td>
                          </>
                        ) : sowId === 'mayOnward' ? (
                          <>
                            <td>{formatUsd(pod.estimatedPrice)}</td>
                            <td>{formatUsd(pod.winfoInvestment)}</td>
                            <td>{formatUsd(pod.mrxPrice)}</td>
                            <td>{formatUsd(pod.blendedRate, 0)}</td>
                            <td>{formatUsd(pod.shiftExpenses)}</td>
                            <td>{formatUsd(pod.travelExpense)}</td>
                            <td>
                              <strong>{formatUsd(pod.grandTotal)}</strong>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{pod.roles}</td>
                            <td>{formatNumber(pod.viewHours)}</td>
                            <td>
                              <strong>{formatUsd(pod.viewAmount)}</strong>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="panels">
            <div className="panel">
              <h2>Amount by POD</h2>
              <div className="bar-list">
                {sowView.pods
                  .slice()
                  .sort((a, b) => (b.viewAmount || 0) - (a.viewAmount || 0))
                  .map((pod) => (
                    <div className="bar-row" key={pod.code}>
                      <span title={`${pod.code} ${pod.name}`}>
                        {pod.code} {pod.name}
                      </span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${((pod.viewAmount || 0) / maxPodTotal) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>{formatUsd(pod.viewAmount)}</strong>
                    </div>
                  ))}
              </div>
            </div>
            <div className="panel">
              <h2>Spend by project</h2>
              <div className="bar-list">
                {Object.entries(sowView.byProject)
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
                {sowView.pods.map((p) => (
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
                  <th>Hours</th>
                  <th>Amount</th>
                  {sowView.months.map((m) => (
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
                      {item.sowTag ? (
                        <div>
                          <span className="badge badge-muted">{item.sowTag}</span>
                        </div>
                      ) : null}
                    </td>
                    <td>{item.project || '—'}</td>
                    <td>{item.role}</td>
                    <td>{item.location || '—'}</td>
                    <td>{formatUsd(item.rateHr, 0)}</td>
                    <td>{formatNumber(item.viewHours)}</td>
                    <td>
                      <strong>{formatUsd(item.viewAmount)}</strong>
                    </td>
                    {sowView.months.map((m) => (
                      <td key={`${item.id}-${m}`}>
                        {item.viewMonths?.[m] != null
                          ? formatNumber(item.viewMonths[m])
                          : '—'}
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
