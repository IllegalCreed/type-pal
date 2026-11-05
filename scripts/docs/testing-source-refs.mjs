import { createHash } from 'node:crypto'

export const safeTestingPath = (path) =>
  typeof path === 'string' &&
  path.length > 0 &&
  !path.startsWith('/') &&
  !path.includes('\\') &&
  !path.split('/').some((part) => ['', '.', '..'].includes(part))

function parseLineRange(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d+)(?:-(\d+))?$/.exec(value)
  if (!match) return null
  return { start: Number(match[1]), end: Number(match[2] ?? match[1]) }
}

/** The caller owns IO/snapshot lifetime. Check existence before the range, and
 * read bytes only for a syntactically valid reference, as in the publication gate. */
export function testingSourceRefIssues(refs, prefix, sources) {
  const issues = []
  if (!Array.isArray(refs) || refs.length === 0) return [`${prefix}: sourceRefs must be non-empty`]
  for (const ref of refs) {
    if (!ref || !safeTestingPath(ref.path) || !ref.lines)
      return [`${prefix}: every sourceRef needs path and lines`]
    if (!sources.has(ref.path)) {
      issues.push(`${prefix}: sourceRef path missing ${ref.path}`)
      continue
    }
    const range = parseLineRange(ref.lines)
    if (!range || range.start < 1 || range.end < range.start) {
      issues.push(`${prefix}: invalid sourceRef lines ${ref.path}:${ref.lines}`)
      continue
    }
    const bytes = sources.read(ref.path)
    const lines = bytes.toString('utf8').trimEnd().split('\n')
    const lineCount = lines.length
    if (range.end > lineCount)
      issues.push(`${prefix}: sourceRef line out of range ${ref.path}:${ref.lines}`)
    if (
      !/^[a-f\d]{64}$/.test(ref.sha256 ?? '') ||
      createHash('sha256').update(bytes).digest('hex') !== ref.sha256
    )
      issues.push(`${prefix}: sourceRef hash mismatch ${ref.path}`)
    if (
      typeof ref.anchor !== 'string' ||
      !ref.anchor ||
      !lines
        .slice(range.start - 1, range.end)
        .join('\n')
        .includes(ref.anchor)
    )
      issues.push(`${prefix}: sourceRef anchor not in declared range ${ref.path}:${ref.lines}`)
  }
  return issues
}
