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
  const account = data.account || 'McKesson'
  return {
    ...data,
    account,
    accounts: data.accounts?.length ? data.accounts : [account],
    lineItems: (data.lineItems || []).map((i) => ({
      ...i,
      account: i.account || account,
    })),
    pods: (data.pods || []).map((p) => ({
      ...p,
      account: p.account || account,
    })),
  }
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
      .filter((i) => (Number(i.mayOnwardHours) || Number(i.hours) || 0) > 0 || (Number(i.mayOnwardCost) || Number(i.amount) || 0) > 0)
      .map((i) => ({
        ...i,
        viewHours: i.mayOnwardHours ?? i.hours,
        viewAmount: i.mayOnwardCost ?? i.amount,
        viewMonths: i.months || {},
      }))
    const podRows = pods.map((p) => {
      const podItems = items.filter((i) => i.podCode === p.code)
      return {
        ...p,
        viewHours: p.hours ?? sumBy(podItems, 'viewHours'),
        viewAmount: p.grandTotal ?? p.mrxPrice ?? sumBy(podItems, 'viewAmount'),
        roles: podItems.length,
      }
    }).filter((p) => p.roles > 0 || p.viewAmount)
    return {
      sowId,
      months: mayMonths,
      lineItems: items,
      pods: podRows,
      totals: {
        amount: dataset.totals?.mayOnwardCost ?? dataset.totals?.grandTotal ?? sumBy(items, 'viewAmount'),
        mrxPrice: dataset.totals?.mrxPrice,
        estimatedPrice: dataset.totals?.estimatedPrice,
        hours: dataset.totals?.mayOnwardHours ?? dataset.totals?.hours ?? sumBy(items, 'viewHours'),
        shiftExpenses: dataset.totals?.shiftExpenses,
        travelExpense: dataset.totals?.travelExpense,
        roles: items.length,
        pods: podRows.length,
      },
    }
  }

  // combined = preserved April SOW + May onwards Excel commercial
  const aprilItems = lineItems
    .filter((i) => i.inAprilSow && (i.aprilHours || i.aprilCost))
    .map((i) => ({
      ...i,
      viewHours: i.aprilHours,
      viewAmount: i.aprilCost,
      viewMonths: { 'Apr-26': i.aprilHours },
      sowTag: 'April',
    }))
  const mayItems = lineItems.map((i) => ({
    ...i,
    viewHours: i.mayOnwardHours ?? i.hours,
    viewAmount: i.mayOnwardCost ?? i.amount,
    viewMonths: i.months || {},
    sowTag: 'May+',
  }))
  const items = [...aprilItems, ...mayItems]
  const podRows = pods.map((p) => {
    const mayPodItems = mayItems.filter((i) => i.podCode === p.code)
    const aprilPodItems = aprilItems.filter((i) => i.podCode === p.code)
    return {
      ...p,
      viewHours:
        (Number(p.hours) || 0) + sumBy(aprilPodItems, 'viewHours'),
      viewAmount:
        (Number(p.grandTotal) || Number(p.mrxPrice) || 0) +
        sumBy(aprilPodItems, 'viewAmount'),
      roles: mayPodItems.length,
      aprilAmount: sumBy(aprilPodItems, 'viewAmount'),
      mayAmount: Number(p.grandTotal) || Number(p.mrxPrice) || sumBy(mayPodItems, 'viewAmount'),
    }
  })
  return {
    sowId: 'combined',
    months: ['Apr-26', ...(dataset.months || [])],
    lineItems: items,
    pods: podRows,
    totals: {
      amount: dataset.totals?.combinedTotal ??
        ((Number(dataset.totals?.aprilSowCost) || 0) +
          (Number(dataset.totals?.mayOnwardCost) || Number(dataset.totals?.grandTotal) || 0)),
      mrxPrice: dataset.totals?.mrxPrice,
      estimatedPrice: dataset.totals?.estimatedPrice,
      hours: dataset.totals?.combinedHours ??
        ((Number(dataset.totals?.aprilSowHours) || 0) +
          (Number(dataset.totals?.mayOnwardHours) || Number(dataset.totals?.hours) || 0)),
      shiftExpenses: dataset.totals?.shiftExpenses,
      travelExpense: dataset.totals?.travelExpense,
      roles: mayItems.length,
      pods: podRows.length,
      aprilSowCost: dataset.totals?.aprilSowCost,
      mayOnwardCost: dataset.totals?.mayOnwardCost ?? dataset.totals?.grandTotal,
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

  const byAccount = {}
  for (const item of sowView.lineItems) {
    const key = item.account || 'Unassigned'
    if (!byAccount[key]) byAccount[key] = { amount: 0, hours: 0, roles: 0 }
    byAccount[key].amount += Number(item.viewAmount) || 0
    byAccount[key].hours += Number(item.viewHours) || 0
    byAccount[key].roles += 1
  }

  const byAccountPod = {}
  for (const pod of sowView.pods || []) {
    const account = pod.account || 'Unassigned'
    if (!byAccountPod[account]) byAccountPod[account] = []
    byAccountPod[account].push(pod)
  }

  return {
    ...sowView,
    byProject,
    byLocation,
    byAccount,
    byAccountPod,
  }
}
