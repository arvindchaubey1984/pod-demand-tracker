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

export function computeCommercialStats(dataset = data) {
  const pods = dataset.pods || []
  const lineItems = dataset.lineItems || []
  const totals = dataset.totals || {}

  const byProject = {}
  for (const item of lineItems) {
    const key = item.project || 'Unassigned'
    if (!byProject[key]) byProject[key] = { amount: 0, hours: 0, roles: 0 }
    byProject[key].amount += Number(item.amount) || 0
    byProject[key].hours += Number(item.hours) || 0
    byProject[key].roles += 1
  }

  const byLocation = {}
  for (const item of lineItems) {
    const key = item.location || 'TBD'
    if (!byLocation[key]) byLocation[key] = { amount: 0, roles: 0 }
    byLocation[key].amount += Number(item.amount) || 0
    byLocation[key].roles += 1
  }

  const avgBlended =
    pods.filter((p) => p.blendedRate != null).reduce((s, p) => s + p.blendedRate, 0) /
    Math.max(pods.filter((p) => p.blendedRate != null).length, 1)

  return {
    totals,
    pods,
    lineItems,
    months: dataset.months || [],
    byProject,
    byLocation,
    avgBlended,
    podCount: pods.length,
    roleCount: lineItems.length,
  }
}
