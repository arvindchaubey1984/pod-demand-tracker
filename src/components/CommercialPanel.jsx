import { useMemo, useState } from 'react'
import {
  computeCommercialStats,
  filterCommercialBySow,
  formatNumber,
  formatUsd,
  getCommercialData,
  getSowOptions,
  resolveSkill,
} from '../utils/commercial'

export default function CommercialPanel() {
  const data = useMemo(() => getCommercialData(), [])
  const sowOptions = useMemo(() => getSowOptions(data), [data])
  const [sowId, setSowId] = useState('mayOnward')
  const [view, setView] = useState('executive')
  const [accountFilter, setAccountFilter] = useState('All')
  const [podFilter, setPodFilter] = useState('All')
  const [projectFilter, setProjectFilter] = useState('All')
  const [query, setQuery] = useState('')

  const sowView = useMemo(
    () => computeCommercialStats(filterCommercialBySow(sowId, data)),
    [sowId, data],
  )
  const activeSow = sowOptions.find((s) => s.id === sowId) || sowOptions[0]

  const accounts = useMemo(() => {
    const fromItems = sowView.lineItems.map((i) => i.account).filter(Boolean)
    const fromMeta = data.accounts || []
    return [...new Set([...fromMeta, ...fromItems])].sort()
  }, [sowView.lineItems, data.accounts])

  const podsForFilter = useMemo(() => {
    if (accountFilter === 'All') return sowView.pods
    return sowView.pods.filter((p) => p.account === accountFilter)
  }, [sowView.pods, accountFilter])

  const projects = useMemo(() => {
    const source =
      accountFilter === 'All'
        ? sowView.lineItems
        : sowView.lineItems.filter((i) => i.account === accountFilter)
    return [...new Set(source.map((i) => i.project).filter(Boolean))].sort()
  }, [sowView.lineItems, accountFilter])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sowView.lineItems.filter((item) => {
      if (accountFilter !== 'All' && item.account !== accountFilter) return false
      if (podFilter !== 'All' && item.podCode !== podFilter) return false
      if (projectFilter !== 'All' && item.project !== projectFilter) return false
      if (!q) return true
      return [
        item.account,
        item.role,
        resolveSkill(item),
        item.project,
        item.area,
        item.location,
        item.podName,
        item.teamPod,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [sowView.lineItems, accountFilter, podFilter, projectFilter, query])

  const filteredPods = useMemo(() => {
    if (accountFilter === 'All') return sowView.pods
    return sowView.pods.filter((p) => p.account === accountFilter)
  }, [sowView.pods, accountFilter])

  const accountPodRows = useMemo(() => {
    const rows = []
    const byAccount = {}
    for (const pod of filteredPods) {
      const account = pod.account || 'Unassigned'
      if (!byAccount[account]) byAccount[account] = []
      byAccount[account].push(pod)
    }
    for (const [account, pods] of Object.entries(byAccount)) {
      const accountTotal = pods.reduce((s, p) => s + (Number(p.viewAmount) || 0), 0)
      rows.push({ type: 'account', account, count: accountTotal })
      for (const pod of pods.sort((a, b) => (b.viewAmount || 0) - (a.viewAmount || 0))) {
        rows.push({
          type: 'pod',
          account,
          pod: `${pod.code} · ${pod.name}`,
          count: Number(pod.viewAmount) || 0,
        })
      }
    }
    return rows
  }, [filteredPods])

  const maxPodTotal = Math.max(...filteredPods.map((p) => Number(p.viewAmount) || 0), 1)
  const maxProject = Math.max(
    ...Object.entries(sowView.byProject)
      .filter(([project]) =>
        accountFilter === 'All'
          ? true
          : sowView.lineItems.some(
              (i) => i.project === project && i.account === accountFilter,
            ),
      )
      .map(([, info]) => info.amount),
    1,
  )
  const maxAccountPod = Math.max(...accountPodRows.map((r) => r.count), 1)

  const filteredProjects = useMemo(() => {
    if (accountFilter === 'All') return Object.entries(sowView.byProject)
    const map = {}
    for (const item of filteredItems) {
      const key = item.project || 'Unassigned'
      if (!map[key]) map[key] = { amount: 0, hours: 0, roles: 0 }
      map[key].amount += Number(item.viewAmount) || 0
      map[key].hours += Number(item.viewHours) || 0
      map[key].roles += 1
    }
    return Object.entries(map)
  }, [accountFilter, sowView.byProject, filteredItems])


  return (
    <div className="commercial">
      <div className="commercial-head">
        <div>
          <h2>FY27 Commercial</h2>
          <p>
            Account → POD commercial · {activeSow?.label}
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
              setAccountFilter('All')
              setPodFilter('All')
              setProjectFilter('All')
            }}
          >
            {sow.label}
          </button>
        ))}
      </div>

      <div className="toolbar" style={{ marginBottom: '0.85rem' }}>
        <div className="filters">
          <select
            className="field"
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value)
              setPodFilter('All')
              setProjectFilter('All')
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
            onChange={(e) => setPodFilter(e.target.value)}
          >
            <option value="All">All PODs</option>
            {podsForFilter.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="chip">
          Account → POD · <b>{accountFilter === 'All' ? 'All' : accountFilter}</b>
        </div>
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
                  ? 'Account → POD commercial summary'
                  : 'Account → POD summary for selected SOW'}
              </h2>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Account</th>
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
                    {filteredPods
                      .filter((pod) => podFilter === 'All' || pod.code === podFilter)
                      .map((pod) => (
                      <tr key={`${pod.account}-${pod.code}`}>
                        <td>{pod.account || '—'}</td>
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
              <h2>Amount by Account → POD</h2>
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
                      <strong>{formatUsd(row.count)}</strong>
                    </div>
                  ) : (
                    <div className="bar-row pod-row" key={`${row.account}-${row.pod}`}>
                      <span title={row.pod}>↳ {row.pod}</span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${(row.count / maxAccountPod) * 100}%` }}
                        />
                      </div>
                      <strong>{formatUsd(row.count)}</strong>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="panel">
              <h2>Spend by project</h2>
              <div className="bar-list">
                {filteredProjects
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([project, info]) => (
                    <div className="bar-row" key={project}>
                      <span title={project}>{project}</span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${(info.amount / Math.max(maxProject, 1)) * 100}%`,
                          }}
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
                placeholder="Search account, POD, role, skill, project..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="field"
                value={accountFilter}
                onChange={(e) => {
                  setAccountFilter(e.target.value)
                  setPodFilter('All')
                  setProjectFilter('All')
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
                onChange={(e) => setPodFilter(e.target.value)}
              >
                <option value="All">All PODs</option>
                {podsForFilter.map((p) => (
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
                  <th>Account</th>
                  <th>POD</th>
                  <th>Project</th>
                  <th>Role</th>
                  <th>Skill</th>
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
                    <td>{item.account || '—'}</td>
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
                    <td>{resolveSkill(item) || '—'}</td>
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
