import { readFileSync } from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'

const p =
  process.argv[2] ||
  path.join(process.env.USERPROFILE || '', 'Downloads', 'PoD-Team-Demand-2026-10-09.xlsx')
const wb = XLSX.read(readFileSync(p), { type: 'buffer' })
console.log('sheets', wb.SheetNames)

function excelDate(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'number' && XLSX.SSF?.parse_date_code) {
    const d = XLSX.SSF.parse_date_code(value)
    if (!d) return String(value)
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return String(value).trim()
}

for (const name of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })
  console.log('---', name, rows.length)
  if (!rows[0]) continue
  console.log('keys', Object.keys(rows[0]).join(' | '))
  if (!/cert/i.test(name) && !Object.keys(rows[0]).some((k) => /cert/i.test(k))) continue

  const statuses = {}
  const months = {}
  const certTypes = {}
  const people = new Set()
  for (const r of rows) {
    const st = String(r.Status || r.status || '').trim() || '(blank)'
    statuses[st] = (statuses[st] || 0) + 1
    const person = String(r.Name || r.Assignee || r['Team Member'] || '').trim()
    if (person) people.add(person)
    const cert = String(
      r['Certification to Pursue'] || r.Certification || r['Certification Name'] || '',
    ).trim()
    if (cert) certTypes[cert] = (certTypes[cert] || 0) + 1
    const d = excelDate(r['Tentative Exam Date'] || r['Exam Date'] || '')
    const mk = d ? d.slice(0, 7) : 'TBD'
    months[mk] = (months[mk] || 0) + 1
  }
  console.log('people', people.size)
  console.log('statuses', statuses)
  console.log('months', months)
  console.log('certTypes', certTypes)
}
