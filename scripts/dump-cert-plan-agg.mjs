import { readFileSync } from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'

const p =
  process.argv[2] ||
  path.join(process.env.USERPROFILE || '', 'Downloads', 'PoD-Team-Demand-2026-10-09.xlsx')
const wb = XLSX.read(readFileSync(p), { type: 'buffer' })
const rows = XLSX.utils.sheet_to_json(wb.Sheets.Certifications, { defval: '' })

function excelDate(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'number' && XLSX.SSF?.parse_date_code) {
    const d = XLSX.SSF.parse_date_code(value)
    if (!d) return ''
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(value).trim()
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  return s
}

function normStatus(s) {
  const t = String(s || '').trim().toLowerCase()
  if (t.includes('complete')) return 'Completed'
  if (t.includes('book')) return 'Booked Slot'
  if (t === 'yts' || t.includes('yet')) return 'YTS'
  if (t.includes('progress')) return 'In progress'
  return String(s || 'In progress').trim() || 'In progress'
}

const plan = rows.map((r) => ({
  cert: String(r['Certification to Pursue'] || '').trim(),
  status: normStatus(r.Status),
  date: excelDate(r['Tentative Exam Date']),
  done: excelDate(r['Completion Date']),
}))

const focus = ['2026-10', '2026-11', '2026-12']
const byMonth = Object.fromEntries(
  focus.map((m) => [
    m,
    { total: 0, Completed: 0, 'Booked Slot': 0, 'In progress': 0, YTS: 0, byCert: {} },
  ]),
)
const outside = []
const byCert = {}
const byStatus = { Completed: 0, 'Booked Slot': 0, 'In progress': 0, YTS: 0 }

for (const c of plan) {
  byStatus[c.status] = (byStatus[c.status] || 0) + 1
  byCert[c.cert] = (byCert[c.cert] || 0) + 1
  const mk = c.date ? c.date.slice(0, 7) : 'TBD'
  if (!focus.includes(mk)) {
    outside.push({ ...c, mk })
    continue
  }
  const bucket = byMonth[mk]
  bucket.total += 1
  bucket[c.status] = (bucket[c.status] || 0) + 1
  bucket.byCert[c.cert] = (bucket.byCert[c.cert] || 0) + 1
}

console.log(JSON.stringify({ total: plan.length, byStatus, byCert, byMonth, outside }, null, 2))
