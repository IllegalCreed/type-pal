export const difference = (left, right) => {
  const other = new Set(right)
  return left.filter((item) => !other.has(item))
}

export const missingFromSuperset = (subset, superset) => difference(subset, superset)

export function auditScope(actual, baseline) {
  const changes = []
  const removals = []
  const ids = new Set([...Object.keys(actual.packages), ...Object.keys(baseline.packages ?? {})])
  for (const id of [...ids].sort()) {
    const current = actual.packages[id]
    const previous = baseline.packages?.[id]
    if (!current) {
      changes.push(`${id}: package scope 被移除`)
      removals.push({ kind: 'package', value: previous.directory })
      continue
    }
    if (!previous) {
      changes.push(`${id}: 新 package scope`)
      continue
    }
    const addedSources = difference(current.sourceFiles, previous.sourceFiles)
    const removedSources = difference(previous.sourceFiles, current.sourceFiles)
    const currentTests = new Map(current.fastTests.fileEntries.map((entry) => [entry.file, entry]))
    const previousTests = new Map(
      previous.fastTests.fileEntries.map((entry) => [entry.file, entry]),
    )
    const addedTestFiles = difference([...currentTests.keys()], [...previousTests.keys()])
    const removedTestFiles = difference([...previousTests.keys()], [...currentTests.keys()])
    let changedTestFiles = 0
    for (const [file, currentFile] of currentTests) {
      const previousFile = previousTests.get(file)
      if (!previousFile || currentFile.identityDigest === previousFile.identityDigest) continue
      changedTestFiles++
      if (currentFile.testCount < previousFile.testCount)
        removals.push({
          kind: 'test-count',
          value: file,
          previous: previousFile.testCount,
          current: currentFile.testCount,
        })
    }
    if (addedSources.length || removedSources.length)
      changes.push(
        `${id}: source +${addedSources.length}/-${removedSources.length}（${previous.sourceFileCount} -> ${current.sourceFileCount}）`,
      )
    if (current.scopeDigest !== previous.scopeDigest)
      changes.push(`${id}: coverage include/exclude/source digest 已变化`)
    if (addedTestFiles.length || removedTestFiles.length || changedTestFiles > 0)
      changes.push(
        `${id}: fast test files +${addedTestFiles.length}/-${removedTestFiles.length}，内容变化 ${changedTestFiles}（${previous.fastTests.testCount} -> ${current.fastTests.testCount} tests）`,
      )
    if (current.fastTests.executionDigest !== previous.fastTests.executionDigest)
      changes.push(`${id}: fast test execution config/digest 已变化`)
    for (const source of removedSources) removals.push({ kind: 'source', value: source })
    for (const file of removedTestFiles) removals.push({ kind: 'test-file', value: file })
  }
  return { changes, removals }
}
