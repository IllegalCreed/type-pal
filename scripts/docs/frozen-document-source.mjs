import { createHash } from 'node:crypto'

// Approved 1838-document snapshot. Changing this trust root requires a separate
// independent source/design review; never derive it from a candidate envelope.
export const frozenDocumentBaseline = Object.freeze({
  path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json',
  revision: '33cc2df50c7279d2750ddad4fcf6c373b7b2bda3',
  gitObject: '00da11bb594126105abbb5ea596c7272ed8e5542',
  sha256: '1c9a01c80a477e8de0d23d064f00a45fbbe9eab4aaffd9e1d5b26114f92e71f5',
  denominator: 1838,
})

export function inspectFrozenDocumentBaseline(read, readSource) {
  const frozen = readSource?.(frozenDocumentBaseline)
  if (
    !frozen ||
    frozen.gitObject !== frozenDocumentBaseline.gitObject ||
    typeof frozen.text !== 'string' ||
    createHash('sha256').update(frozen.text).digest('hex') !== frozenDocumentBaseline.sha256
  )
    return {
      entries: [],
      issues: ['frozen historical baseline Git identity mismatch or unavailable'],
    }
  let entries
  try {
    entries = JSON.parse(frozen.text)?.entries
  } catch {
    return { entries: [], issues: ['frozen historical source baseline invalid JSON'] }
  }
  if (
    !Array.isArray(entries) ||
    new Set(entries.map((entry) => entry.path)).size !== frozenDocumentBaseline.denominator
  )
    return { entries: [], issues: ['frozen document baseline denominator mismatch'] }
  const working = read(frozenDocumentBaseline.path)
  const issues =
    typeof working !== 'string' ||
    createHash('sha256').update(working).digest('hex') !== frozenDocumentBaseline.sha256
      ? ['frozen historical baseline working tree drift']
      : []
  return { entries, issues }
}
