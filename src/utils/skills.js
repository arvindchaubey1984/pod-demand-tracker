/** Map role text to a skill label when skill is not stored explicitly. */
export function inferSkillFromRole(role = '') {
  const r = String(role || '').toLowerCase()
  if (!r) return ''
  if (/\b(ai|ml|genai|llm|machine learning)\b/.test(r)) return 'AI / ML'
  if (/data engineer|databricks|etl|pipeline|spark/.test(r)) return 'Data Engineering'
  if (/business analyst|data analyst|ba\/da|\bba\b|\bda\b/.test(r)) return 'BA / DA'
  if (/architect/.test(r)) return 'Architecture'
  if (/devops|sre|cloud ops/.test(r)) return 'DevOps'
  if (/\bqa\b|test|quality/.test(r)) return 'QA'
  if (/scrum|agile|\bsm\b/.test(r)) return 'Agile / SM'
  if (/tpm|program manager|project manager|technical manager|delivery lead|engagement/.test(r)) {
    return 'Delivery / TPM'
  }
  if (/report|bi\b|power bi|tableau/.test(r)) return 'BI / Reporting'
  if (/ux|designer/.test(r)) return 'UX / Design'
  if (/frontend|front.end|ui\/|react|\.net|full.?stack|backend|developer|engineer/.test(r)) {
    return 'Engineering'
  }
  if (/sponsor|partner|governance|pmo|lead/.test(r)) return 'Leadership'
  return ''
}

export function resolveSkill(itemOrRole) {
  if (itemOrRole && typeof itemOrRole === 'object') {
    const explicit = String(itemOrRole.skill || '').trim()
    if (explicit) return explicit
    return inferSkillFromRole(itemOrRole.role)
  }
  return inferSkillFromRole(itemOrRole)
}
