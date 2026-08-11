import data from '../data/fy27Commercial.json'

export function formatUsd(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value))
}

export function formatNumber(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value))
}

export function getCommercialData() {
  return data
}

function sumBy(items, key) {
  return items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)
}

export function getSowOptions(dataset = data) {
  return dataset.sows || [
    { id: 'combined', label: 'Combined FY27' },
    { id: 'april', label: "April'26 SOW (3 PODs)" },
    { id: 'mayOnward', label: "May'26 onwards SOW" },
  ]
}

export function filterCommercialBySow(sowId, dataset = data) {
  const lineItems = dataset.lineItems || []
  const pods = dataset.pods || []
  const aprilPods = dataset.aprilSowPodCodes || ['POD1', 'POD2', 'POD3']
  const mayMonths = dataset.mayOnwardMonths || (dataset.months || []).filter((m) => m !== 'Apr-26')

  if (sowId === 'april') {
    const items = lineItems
      .filter((i) => aprilPods.includes(i.podCode) && (i.aprilHours || i.aprilCost))
      .map((i) => ({
        ...i,
        viewHours: i.aprilHours,
        viewAmount: i.aprilCost,
        viewMonths: { 'Apr-26': i.aprilHours },
      }))
    const podRows = pods
      .filter((p) => aprilPods.includes(p.code))
      .map((p) => {
        const podItems = items.filter((i) => i.podCode === p.code)
        return {
          ...p,
          viewHours: sumBy(podItems, 'viewHours'),
          viewAmount: sumBy(podItems, 'viewAmount'),
          roles: podItems.length,
        }
      })
    return {
      sowId,
      months: ['Apr-26'],
      lineItems: items,
      pods: podRows,
      totals: {
        amount: sumBy(items, 'viewAmount'),
        hours: sumBy(items, 'viewHours'),
        roles: items.length,
        pods: podRows.length,
      },
    }
  }

  if (sowId === 'mayOnward') {
    const items = lineItems
      .filter((i) => (Number(i.mayOnwardHours) || 0) > 0 || (Number(i.mayOnwardCost) || 0) > 0)
      .map((i) => {
        const viewMonths = {}
        for (const m of mayMonths) {
          if (i.months?.[m] != null) viewMonths[m] = i.months[m]
        }
        return {
          ...i,
          viewHours: i.mayOnwardHours,
          viewAmount: i.mayOnwardCost,
          viewMonths,
        }
      })
    const podRows = pods.map((p) => {
      const podItems = items.filter((i) => i.podCode === p.code)
      return {
        ...p,
        viewHours: sumBy(podItems, 'viewHours'),
        viewAmount: sumBy(podItems, 'viewAmount'),
        roles: podItems.length,
      }
    }).filter((p) => p.roles > 0)
    return {
      sowId,
      months: mayMonths,
      lineItems: items,
      pods: podRows,
      totals: {
        amount: sumBy(items, 'viewAmount'),
        hours: sumBy(items, 'viewHours'),
        roles: items.length,
        pods: podRows.length,
      },
    }
  }

  // combined
  const items = lineItems.map((i) => ({
    ...i,
    viewHours: i.hours,
    viewAmount: i.amount,
    viewMonths: i.months || {},
  }))
  const podRows = pods.map((p) => ({
    ...p,
    viewHours: p.hours,
    viewAmount: p.grandTotal ?? p.mrxPrice ?? p.estimatedPrice,
    roles: items.filter((i) => i.podCode === p.code).length,
  }))
  return {
    sowId: 'combined',
    months: dataset.months || [],
    lineItems: items,
    pods: podRows,
    totals: {
      amount: dataset.totals?.grandTotal ?? sumBy(items, 'viewAmount'),
      mrxPrice: dataset.totals?.mrxPrice,
      estimatedPrice: dataset.totals?.estimatedPrice,
      hours: dataset.totals?.hours ?? sumBy(items, 'viewHours'),
      shiftExpenses: dataset.totals?.shiftExpenses,
      travelExpense: dataset.totals?.travelExpense,
      roles: items.length,
      pods: podRows.length,
      aprilSowCost: dataset.totals?.aprilSowCost,
      mayOnwardCost: dataset.totals?.mayOnwardCost,
    },
  }
}

export function computeCommercialStats(sowView) {
  const byProject = {}
  for (const item of sowView.lineItems) {
    const key = item.project || 'Unassigned'
    if (!byProject[key]) byProject[key] = { amount: 0, hours: 0, roles: 0 }
    byProject[key].amount += Number(item.viewAmount) || 0
    byProject[key].hours += Number(item.viewHours) || 0
    byProject[key].roles += 1
  }

  const byLocation = {}
  for (const item of sowView.lineItems) {
    const key = item.location || 'TBD'
    if (!byLocation[key]) byLocation[key] = { amount: 0, roles: 0 }
    byLocation[key].amount += Number(item.viewAmount) || 0
    byLocation[key].roles += 1
  }

  return {
    ...sowView,
    byProject,
    byLocation,
  }
}
