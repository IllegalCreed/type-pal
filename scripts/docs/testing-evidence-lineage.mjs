import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

const safe = (path) =>
  typeof path === 'string' &&
  path.endsWith('.json') &&
  !path.startsWith('/') &&
  !path.includes('\\') &&
  path.split('/').every((part) => part && part !== '.' && part !== '..')
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Preserve a former paired native artifact without confusing its publication
 * identity with the replacement. `read` takes paths relative to testing root.
 * Missing/changed bytes or a missing replacement backlink never authorize it.
 */
export function testingEvidenceLineageIssues(entry, read) {
  const historic = entry.historical
  if (historic?.publication === undefined) return []
  const pin = historic.publication
  const issues = []
  if (
    !pin ||
    typeof pin !== 'object' ||
    Array.isArray(pin) ||
    !isDeepStrictEqual(Object.keys(pin).sort(), ['candidateSha', 'sha256', 'status'])
  )
    return ['historical evidence publication requires exactly candidateSha/sha256/status']
  if (!safe(historic.evidence) || !safe(entry.evidence) || historic.evidence === entry.evidence)
    return ['historical evidence requires distinct safe JSON paths']
  if (
    !/^[a-f0-9]{64}$/.test(pin.sha256 ?? '') ||
    !/^[a-f0-9]{40}$/.test(pin.candidateSha ?? '') ||
    typeof pin.status !== 'string'
  )
    return ['historical evidence identity incomplete']
  let old, current
  try {
    const bytes = read(historic.evidence)
    if (bytes === undefined || sha(bytes) !== pin.sha256)
      return ['historical evidence byte pin mismatch']
    old = JSON.parse(bytes)
    const now = read(entry.evidence)
    if (now === undefined) return ['replacement evidence missing']
    current = JSON.parse(now)
  } catch {
    return ['historical or replacement evidence unavailable/invalid JSON']
  }
  if (
    old?.schemaVersion !== 2 ||
    old.id !== entry.id ||
    old.status !== pin.status ||
    old.candidateSha !== pin.candidateSha
  )
    issues.push('historical evidence identity differs from catalog snapshot')
  if (current?.schemaVersion !== 2 || current.id !== entry.id)
    issues.push('replacement evidence identity differs from catalog')
  if (
    !isDeepStrictEqual(current.supersedes, {
      evidence: historic.evidence,
      sha256: pin.sha256,
      status: pin.status,
      candidateSha: pin.candidateSha,
    })
  )
    issues.push('replacement evidence requires exact historical backlink')
  return issues
}
