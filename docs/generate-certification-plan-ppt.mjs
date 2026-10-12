/**
 * Customer-facing Certification Plan — anonymized Oct–Dec coverage.
 * Reads latest certs from seed.json (sync from Excel first if needed).
 * Usage: node docs/generate-certification-plan-ppt.mjs
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pptxgen from 'pptxgenjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const logoPath = join(root, 'public', 'winfo-logo.png')
const seed = JSON.parse(
  readFileSync(join(root, 'src', 'data', 'seed.json'), 'utf8').replace(/^\uFEFF/, ''),
)

const certs = (seed.certifications || []).map((c) => ({
  cert: String(c.certification || '').trim() || 'Unspecified',
  status: String(c.status || 'In progress').trim(),
  date: String(c.tentativeExamDate || '').trim(),
  done: String(c.completionDate || '').trim(),
}))

const FOCUS = [
  { key: '2026-10', label: 'October', short: 'Oct' },
  { key: '2026-11', label: 'November', short: 'Nov' },
  { key: '2026-12', label: 'December', short: 'Dec' },
]

const STATUS_ORDER = ['Completed', 'Booked Slot', 'In progress', 'YTS']
const emptyMonth = () => ({
  total: 0,
  Completed: 0,
  'Booked Slot': 0,
  'In progress': 0,
  YTS: 0,
  byCert: {},
})

const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]))
const byCert = {}
const byMonth = Object.fromEntries(FOCUS.map((m) => [m.key, emptyMonth()]))
let outsideQ4 = 0
let completedBeforeQ4 = 0

for (const c of certs) {
  const status = STATUS_ORDER.includes(c.status) ? c.status : 'In progress'
  byStatus[status] = (byStatus[status] || 0) + 1
  byCert[c.cert] = (byCert[c.cert] || 0) + 1
  const mk = c.date ? c.date.slice(0, 7) : ''
  if (!byMonth[mk]) {
    outsideQ4 += 1
    if (status === 'Completed') completedBeforeQ4 += 1
    continue
  }
  const b = byMonth[mk]
  b.total += 1
  b[status] = (b[status] || 0) + 1
  b.byCert[c.cert] = (b.byCert[c.cert] || 0) + 1
}

const q4Total = FOCUS.reduce((n, m) => n + byMonth[m.key].total, 0)
const certMix = Object.entries(byCert).sort((a, b) => b[1] - a[1])
const allCertNames = certMix.map(([n]) => n)

const asOfLabel = new Date().toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const TOTAL = 6
const pptx = new pptxgen()
pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 })
pptx.layout = 'WIDE'
pptx.author = 'Winfo Solutions'
pptx.title = 'McKesson Data Team – Certification Plan (Oct–Dec)'
pptx.subject = 'Anonymized Q4 certification coverage plan'

const C = {
  teal: '007A93',
  bright: '00A8C5',
  deep: '045566',
  sand: 'F3F7F8',
  ink: '1A2B32',
  soft: '5A7078',
  white: 'FFFFFF',
  card: 'FFFFFF',
  line: 'D0E4EA',
  ok: '1F8A5B',
  warn: 'C47A12',
  muted: '5A7078',
}
const S = pptx.ShapeType

function addLogo(slide) {
  try {
    slide.addImage({ path: logoPath, x: 11.55, y: 0.18, w: 1.45, h: 0.58 })
  } catch {
    /* optional */
  }
}

function addBg(slide) {
  slide.addShape(S.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: C.sand },
    line: { color: C.sand },
  })
}

function headerBar(slide, title, subtitle) {
  slide.addShape(S.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.95,
    fill: { color: C.deep },
    line: { color: C.deep },
  })
  slide.addShape(S.rect, {
    x: 0,
    y: 0.95,
    w: 13.333,
    h: 0.08,
    fill: { color: C.bright },
    line: { color: C.bright },
  })
  slide.addText(title, {
    x: 0.4,
    y: 0.16,
    w: 10.8,
    h: 0.4,
    fontSize: 21,
    fontFace: 'Calibri',
    bold: true,
    color: C.white,
    margin: 0,
  })
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4,
      y: 0.54,
      w: 10.8,
      h: 0.28,
      fontSize: 11,
      fontFace: 'Calibri',
      color: 'B8DCE4',
      margin: 0,
    })
  }
  addLogo(slide)
}

function footer(slide, page) {
  slide.addShape(S.rect, {
    x: 0,
    y: 7.2,
    w: 13.333,
    h: 0.3,
    fill: { color: C.white },
    line: { color: C.line },
  })
  slide.addText(
    `Winfo Solutions  ·  McKesson Account  ·  Certification Plan  ·  Confidential  ·  ${page}/${TOTAL}`,
    {
      x: 0.4,
      y: 7.22,
      w: 12.5,
      h: 0.24,
      fontSize: 10,
      fontFace: 'Calibri',
      color: C.soft,
      margin: 0,
    },
  )
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(S.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: opts.fill || C.card },
    line: { color: opts.line || C.line, width: 1 },
    rectRadius: 0.08,
  })
  if (opts.accent) {
    slide.addShape(S.rect, {
      x,
      y,
      w: 0.08,
      h,
      fill: { color: opts.accent },
      line: { color: opts.accent },
    })
  }
}

function kpi(slide, x, y, w, h, label, value, accent) {
  card(slide, x, y, w, h, { accent })
  slide.addText(label, {
    x: x + 0.18,
    y: y + 0.22,
    w: w - 0.3,
    h: 0.35,
    fontSize: 12,
    fontFace: 'Calibri',
    color: C.soft,
    margin: 0,
  })
  slide.addText(String(value), {
    x: x + 0.18,
    y: y + 0.6,
    w: w - 0.3,
    h: 0.6,
    fontSize: 32,
    fontFace: 'Calibri',
    bold: true,
    color: C.deep,
    margin: 0,
  })
}

// 1. Title
{
  const slide = pptx.addSlide()
  slide.addShape(S.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: C.deep },
    line: { color: C.deep },
  })
  slide.addShape(S.rect, {
    x: 0,
    y: 0,
    w: 0.18,
    h: 7.5,
    fill: { color: C.bright },
    line: { color: C.bright },
  })
  try {
    slide.addImage({ path: logoPath, x: 0.7, y: 0.55, w: 1.7, h: 0.68 })
  } catch {
    /* optional */
  }
  slide.addText('McKesson Data Team', {
    x: 0.7,
    y: 2.15,
    w: 11.5,
    h: 0.35,
    fontSize: 16,
    fontFace: 'Calibri',
    color: '8FCFDB',
    margin: 0,
  })
  slide.addText('Certification Plan\nOct – Dec 2026', {
    x: 0.7,
    y: 2.55,
    w: 11.5,
    h: 1.5,
    fontSize: 40,
    fontFace: 'Calibri',
    bold: true,
    color: C.white,
    margin: 0,
  })
  slide.addText(
    `${certs.length} certifications on the plan  ·  Q4 exam window coverage (anonymized)\nAs of ${asOfLabel}`,
    {
      x: 0.7,
      y: 4.4,
      w: 11,
      h: 0.7,
      fontSize: 15,
      fontFace: 'Calibri',
      color: 'D5EBEF',
      margin: 0,
    },
  )
  slide.addText('Winfo Solutions  ·  Confidential – for customer review  ·  No named resources', {
    x: 0.7,
    y: 6.85,
    w: 11.5,
    h: 0.3,
    fontSize: 11,
    fontFace: 'Calibri',
    color: '8FCFDB',
    margin: 0,
  })
}

// 2. Plan snapshot
{
  const slide = pptx.addSlide()
  addBg(slide)
  headerBar(
    slide,
    'Plan snapshot',
    'Overall certification plan size and current progress (no named associates)',
  )
  footer(slide, 2)

  const cards = [
    ['On the plan', certs.length, C.teal],
    ['Q4 exam targets\n(Oct–Dec)', q4Total, C.deep],
    ['Already completed\n(before / outside Q4)', completedBeforeQ4, C.ok],
    ['Booked slot', byStatus['Booked Slot'] || 0, C.bright],
    ['In progress', byStatus['In progress'] || 0, C.warn],
    ['Yet to start', byStatus.YTS || 0, C.muted],
  ]
  cards.forEach((k, i) => {
    const x = 0.45 + (i % 3) * 4.2
    const y = 1.35 + Math.floor(i / 3) * 2.55
    kpi(slide, x, y, 3.95, 2.25, k[0], k[1], k[2])
  })
}

// 3. Oct / Nov / Dec coverage
{
  const slide = pptx.addSlide()
  addBg(slide)
  headerBar(
    slide,
    'Q4 coverage by month',
    'How many certifications are targeted for exam in each month',
  )
  footer(slide, 3)

  const max = Math.max(...FOCUS.map((m) => byMonth[m.key].total), 1)
  FOCUS.forEach((m, i) => {
    const b = byMonth[m.key]
    const x = 0.5 + i * 4.2
    card(slide, x, 1.3, 3.95, 5.5)
    slide.addShape(S.rect, {
      x,
      y: 1.3,
      w: 3.95,
      h: 0.7,
      fill: { color: C.deep },
      line: { color: C.deep },
    })
    slide.addText(m.label, {
      x: x + 0.2,
      y: 1.42,
      w: 3.5,
      h: 0.45,
      fontSize: 18,
      fontFace: 'Calibri',
      bold: true,
      color: C.white,
      margin: 0,
    })
    slide.addText(String(b.total), {
      x: x + 0.25,
      y: 2.25,
      w: 3.4,
      h: 0.7,
      fontSize: 44,
      fontFace: 'Calibri',
      bold: true,
      color: C.deep,
      margin: 0,
    })
    slide.addText('certifications targeted', {
      x: x + 0.25,
      y: 2.95,
      w: 3.4,
      h: 0.3,
      fontSize: 13,
      fontFace: 'Calibri',
      color: C.soft,
      margin: 0,
    })

    const barH = 1.8 * (b.total / max)
    slide.addShape(S.roundRect, {
      x: x + 0.45,
      y: 3.5 + (1.8 - barH),
      w: 1.1,
      h: Math.max(barH, 0.12),
      fill: { color: C.teal },
      line: { color: C.teal },
      rectRadius: 0.06,
    })
    slide.addText(`${Math.round((b.total / certs.length) * 100)}%\nof plan`, {
      x: x + 1.8,
      y: 3.7,
      w: 1.8,
      h: 0.7,
      fontSize: 14,
      fontFace: 'Calibri',
      bold: true,
      color: C.teal,
      margin: 0,
    })

    const lines = [
      ['Booked slot', b['Booked Slot'] || 0, C.bright],
      ['In progress', b['In progress'] || 0, C.warn],
      ['Yet to start', b.YTS || 0, C.muted],
      ['Completed in month', b.Completed || 0, C.ok],
    ]
    lines.forEach((row, ri) => {
      const y = 5.5 + ri * 0.28
      if (ri > 2) return // keep card clean — show top 3 status lines
      slide.addText(`${row[0]}:  ${row[1]}`, {
        x: x + 0.25,
        y: 5.45 + ri * 0.35,
        w: 3.4,
        h: 0.3,
        fontSize: 13,
        fontFace: 'Calibri',
        color: row[2],
        margin: 0,
      })
    })
  })
}

// 4. Mix by certification type
{
  const slide = pptx.addSlide()
  addBg(slide)
  headerBar(
    slide,
    'Certification focus areas',
    'Where the plan invests — role-aligned credentials across the team',
  )
  footer(slide, 4)

  const max = Math.max(...certMix.map(([, n]) => n), 1)
  certMix.forEach(([name, n], i) => {
    const y = 1.35 + i * 1.2
    card(slide, 0.55, y, 12.2, 1.05)
    slide.addText(name, {
      x: 0.85,
      y: y + 0.18,
      w: 7.2,
      h: 0.32,
      fontSize: 16,
      fontFace: 'Calibri',
      bold: true,
      color: C.ink,
      margin: 0,
    })
    slide.addText(
      `${n} on plan  ·  ${Math.round((n / certs.length) * 100)}% of total certifications`,
      {
        x: 0.85,
        y: y + 0.55,
        w: 7.2,
        h: 0.28,
        fontSize: 12,
        fontFace: 'Calibri',
        color: C.soft,
        margin: 0,
      },
    )
    slide.addShape(S.roundRect, {
      x: 8.5,
      y: y + 0.38,
      w: 3.2,
      h: 0.3,
      fill: { color: 'D8EEF3' },
      line: { color: 'D8EEF3' },
      rectRadius: 0.1,
    })
    slide.addShape(S.roundRect, {
      x: 8.5,
      y: y + 0.38,
      w: Math.max(3.2 * (n / max), 0.2),
      h: 0.3,
      fill: { color: C.teal },
      line: { color: C.teal },
      rectRadius: 0.1,
    })
    slide.addText(String(n), {
      x: 11.85,
      y: y + 0.32,
      w: 0.6,
      h: 0.4,
      fontSize: 18,
      fontFace: 'Calibri',
      bold: true,
      color: C.deep,
      margin: 0,
    })
  })
}

// 5. Month × certification matrix
{
  const slide = pptx.addSlide()
  addBg(slide)
  headerBar(
    slide,
    'Month × certification coverage',
    'How many of each certification are planned in Oct, Nov, and Dec',
  )
  footer(slide, 5)

  const headerRow = [
    {
      text: 'Certification',
      options: { bold: true, color: C.white, fill: { color: C.deep } },
    },
    ...FOCUS.map((m) => ({
      text: m.short,
      options: { bold: true, color: C.white, fill: { color: C.deep }, align: 'center' },
    })),
    {
      text: 'Q4 total',
      options: { bold: true, color: C.white, fill: { color: C.deep }, align: 'center' },
    },
  ]

  const body = allCertNames.map((name) => {
    const counts = FOCUS.map((m) => byMonth[m.key].byCert[name] || 0)
    const sum = counts.reduce((a, b) => a + b, 0)
    return [
      { text: name, options: { bold: true, color: C.ink } },
      ...counts.map((n) => ({
        text: String(n),
        options: { align: 'center', color: n ? C.deep : C.soft, bold: !!n },
      })),
      {
        text: String(sum),
        options: { align: 'center', bold: true, color: C.teal },
      },
    ]
  })

  const totals = [
    { text: 'All certifications', options: { bold: true, color: C.white, fill: { color: C.teal } } },
    ...FOCUS.map((m) => ({
      text: String(byMonth[m.key].total),
      options: {
        bold: true,
        align: 'center',
        color: C.white,
        fill: { color: C.teal },
      },
    })),
    {
      text: String(q4Total),
      options: { bold: true, align: 'center', color: C.white, fill: { color: C.teal } },
    },
  ]

  slide.addTable([headerRow, ...body, totals], {
    x: 0.55,
    y: 1.4,
    w: 12.2,
    colW: [5.2, 1.6, 1.6, 1.6, 2.2],
    border: [
      { pt: 0.6, color: C.line },
      { pt: 0.6, color: C.line },
      { pt: 0.6, color: C.line },
      { pt: 0.6, color: C.line },
    ],
    fontFace: 'Calibri',
    fontSize: 13,
    color: C.ink,
    align: 'left',
    valign: 'middle',
  })

  slide.addText(
    `Q4 planned exams: ${q4Total} of ${certs.length} on the overall plan` +
      (outsideQ4
        ? `  ·  ${outsideQ4} already dated outside Oct–Dec (incl. ${completedBeforeQ4} completed)`
        : ''),
    {
      x: 0.55,
      y: 6.55,
      w: 12.2,
      h: 0.35,
      fontSize: 12,
      fontFace: 'Calibri',
      color: C.soft,
      margin: 0,
    },
  )
}

// 6. Outlook / how we run
{
  const slide = pptx.addSlide()
  addBg(slide)
  headerBar(
    slide,
    'Q4 outlook',
    'What we aim to cover through December — tracked without sharing named resources',
  )
  footer(slide, 6)

  const points = [
    {
      title: 'October',
      body: `${byMonth['2026-10'].total} certifications targeted — heaviest month on the plan (${byMonth['2026-10']['Booked Slot']} booked, ${byMonth['2026-10']['In progress']} in progress).`,
      accent: C.teal,
    },
    {
      title: 'November',
      body: `${byMonth['2026-11'].total} certifications targeted — includes remaining DE / DA associates and GenAI starts (${byMonth['2026-11'].YTS} yet to start).`,
      accent: C.bright,
    },
    {
      title: 'December',
      body: `${byMonth['2026-12'].total} certifications targeted — advanced track (Professional / GenAI), including ${byMonth['2026-12']['Booked Slot']} booked slot.`,
      accent: C.deep,
    },
  ]
  points.forEach((p, i) => {
    const y = 1.3 + i * 1.25
    card(slide, 0.5, y, 8.0, 1.1, { accent: p.accent })
    slide.addText(p.title, {
      x: 0.8,
      y: y + 0.18,
      w: 7.4,
      h: 0.3,
      fontSize: 16,
      fontFace: 'Calibri',
      bold: true,
      color: C.ink,
      margin: 0,
    })
    slide.addText(p.body, {
      x: 0.8,
      y: y + 0.52,
      w: 7.4,
      h: 0.45,
      fontSize: 13,
      fontFace: 'Calibri',
      color: C.soft,
      margin: 0,
    })
  })

  card(slide, 8.75, 1.3, 4.1, 5.5, { accent: C.deep })
  slide.addText('Operating rhythm', {
    x: 9.05,
    y: 1.55,
    w: 3.5,
    h: 0.35,
    fontSize: 16,
    fontFace: 'Calibri',
    bold: true,
    color: C.deep,
    margin: 0,
  })
  slide.addText(
    [
      '• Plan sized at 33 certifications',
      '• Status path: YTS → In progress → Booked → Completed',
      '• Monthly exam targets for Oct / Nov / Dec',
      '• Focus: Data Engineering, Data Analyst, GenAI',
      '• Customer view stays aggregate — no named roster in this pack',
      '',
      `Q4 target volume: ${q4Total}`,
      `Already completed: ${byStatus.Completed}`,
    ].join('\n'),
    {
      x: 9.05,
      y: 2.1,
      w: 3.5,
      h: 4.3,
      fontSize: 13,
      fontFace: 'Calibri',
      color: C.ink,
      margin: 0,
    },
  )
}

const outPath = join(__dirname, 'McKesson-Team-Certification-Plan.pptx')
await pptx.writeFile({ fileName: outPath })
console.log('Wrote', outPath)
console.log({ total: certs.length, q4Total, byStatus, byMonth: Object.fromEntries(FOCUS.map((m) => [m.short, byMonth[m.key].total])) })
