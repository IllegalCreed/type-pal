const allowlistKeys = [
  'file',
  'line',
  'rule',
  'owner',
  'reason',
  'verification',
  'removalCondition',
].sort()

/** Pure allowlist schema and identity validation; no repository or console access. */
export function validateAllowlist(document) {
  const problems = []
  if (!document || document.version !== 1 || !Array.isArray(document.entries))
    return ['design-system-allowlist.json must contain { version: 1, entries: [] }']
  const seen = new Set()
  for (const [index, entry] of document.entries.entries()) {
    if (!entry || typeof entry !== 'object') {
      problems.push(`entries[${index}] must be an object`)
      continue
    }
    const keys = Object.keys(entry).sort()
    if (JSON.stringify(keys) !== JSON.stringify(allowlistKeys))
      problems.push(`entries[${index}] must use exactly ${allowlistKeys.join(', ')}`)
    if (typeof entry.file !== 'string' || !entry.file.endsWith('.tsx'))
      problems.push(`entries[${index}].file must be a production .tsx path relative to src/ui`)
    if (!Number.isInteger(entry.line) || entry.line < 1)
      problems.push(`entries[${index}].line must be a positive integer`)
    if (typeof entry.rule !== 'string' || !entry.rule)
      problems.push(`entries[${index}].rule must be non-empty`)
    if (
      typeof entry.owner !== 'string' ||
      !/^(?:Codex|Kimi|GLM|card:[A-Z0-9-]+)$/.test(entry.owner)
    )
      problems.push(`entries[${index}].owner must name an Agent or card:ED-XXX`)
    for (const key of ['reason', 'verification', 'removalCondition'])
      if (typeof entry[key] !== 'string' || !entry[key].trim())
        problems.push(`entries[${index}].${key} must be non-empty`)
    const identity = `${entry.file}:${entry.line}:${entry.rule}`
    if (seen.has(identity)) problems.push(`duplicate allowlist identity ${identity}`)
    seen.add(identity)
  }
  return problems
}

/** Match current violations to reviewed exceptions without mutating either input. */
export function evaluateAllowlist(document, violations) {
  const problems = validateAllowlist(document)
  if (problems.length) return { code: 2, active: [], unapproved: [], stale: [], problems }
  const allowlist = new Map(
    document.entries.map((entry) => [`${entry.file}:${entry.line}:${entry.rule}`, entry]),
  )
  const active = []
  const unapproved = []
  for (const violation of violations) {
    const identity = `${violation.file}:${violation.line}:${violation.rule}`
    if (allowlist.has(identity)) active.push(identity)
    else unapproved.push(violation)
  }
  const stale = [...allowlist.keys()].filter((identity) => !active.includes(identity))
  return {
    code: stale.length ? 2 : unapproved.length ? 1 : 0,
    active,
    unapproved,
    stale,
    problems: [],
  }
}
