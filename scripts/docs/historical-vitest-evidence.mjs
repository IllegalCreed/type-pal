import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Preserve reporter axes and complete identities; this does not authenticate a test run. */
export function nativeVitestResultSets(value) {
  const assertions = value.testResults.flatMap((file, i) =>
    file.assertionResults.map((row, j) => ({
      pointer: `#/testResults/${i}/assertionResults/${j}`,
      fullName: row.fullName,
      status: row.status,
    })),
  )
  return {
    files: value.testResults.length,
    counters: Object.fromEntries(Object.entries(value).filter(([key]) => key.startsWith('num'))),
    assertionStatuses: Object.fromEntries(
      [...new Set(assertions.map((row) => row.status))]
        .sort()
        .map((status) => [status, assertions.filter((row) => row.status === status).length]),
    ),
    failedAssertions: assertions.filter((row) => row.status === 'failed'),
    pendingAssertions: assertions.filter(
      (row) => row.status !== 'passed' && row.status !== 'failed',
    ),
  }
}

function pointerValue(value, pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('#/')) return undefined
  return pointer
    .slice(2)
    .split('/')
    .map((key) => key.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce(
      (object, key) =>
        object !== null && typeof object === 'object' && Object.hasOwn(object, key)
          ? object[key]
          : undefined,
      value,
    )
}

/** Validate the source witnesses actually consumed by model/progress and the semantic writer. */
export function historicalVitestEvidenceIssues(row, native, readBuffer) {
  const issues = []
  try {
    const actual = nativeVitestResultSets(native)
    if (!isDeepStrictEqual(row.evidence?.nativeResults, actual))
      issues.push('native Vitest complete result sets mismatch')
    if (!row.readDomain?.actual || !Array.isArray(row.readDomain?.reusedFrom))
      issues.push('native Vitest actual read domain missing')
    if (!Array.isArray(row.nativeWitnesses) || row.nativeWitnesses.length < 2)
      issues.push('native Vitest witnesses missing')
    else
      for (const witness of row.nativeWitnesses) {
        const value = pointerValue(native, witness.pointer)
        const text = typeof value === 'string' ? value : JSON.stringify(value)
        if (
          typeof witness.quote !== 'string' ||
          !witness.quote.length ||
          !text?.includes(witness.quote)
        )
          issues.push('native Vitest witness differs from original value')
      }
    if (!Array.isArray(row.contextReferences) || !row.contextReferences.length)
      issues.push('native Vitest context references missing')
    else
      for (const pin of row.contextReferences) {
        if (
          typeof pin.path !== 'string' ||
          !pin.path.startsWith('docs/') ||
          pin.path.includes('\\') ||
          pin.path.split('/').some((part) => !part || part === '.' || part === '..')
        ) {
          issues.push('native Vitest unsafe context path')
          continue
        }
        const bytes = readBuffer(pin.path)
        if (
          !Buffer.isBuffer(bytes) ||
          digest(bytes) !== pin.sha256 ||
          !Array.isArray(pin.lines) ||
          pin.lines.length !== 2 ||
          !pin.lines.every(Number.isSafeInteger) ||
          pin.lines[0] < 1 ||
          pin.lines[1] < pin.lines[0] ||
          typeof pin.quote !== 'string' ||
          !pin.quote.length ||
          !bytes
            .toString('utf8')
            .split('\n')
            .slice(pin.lines[0] - 1, pin.lines[1])
            .join('\n')
            .includes(pin.quote)
        )
          issues.push('native Vitest context SHA/line/quote mismatch')
      }
    const oracle = row.businessOracle?.assertions?.join('\n') ?? ''
    for (const assertion of actual.failedAssertions)
      if (!oracle.includes(assertion.fullName))
        issues.push('native Vitest failed oracle incomplete')
  } catch (error) {
    issues.push(`native Vitest evidence invalid: ${error.message}`)
  }
  return issues
}
