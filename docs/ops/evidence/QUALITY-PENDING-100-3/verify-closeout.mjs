import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

// A recorded review-to-accept transition needs exact current bytes and completed gates.
// This verifies evidence integrity, not the semantic quality judgments themselves.
export function verifyCloseout(closeout, native, readCurrent) {
  const sha = (body) => createHash('sha256').update(body).digest('hex')
  const read = (name) => {
    assert.equal(typeof native[`unified-closeout/${name}`], 'string', name)
    return native[`unified-closeout/${name}`]
  }
  const json = (name) => JSON.parse(read(name))
  const table = (body) => {
    const marker = '| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |\n'
    // This receipt has a separately byte-verified historical fenced snapshot below the live table.
    const archiveStart = body.indexOf('<!-- original-source-fenced:start -->')
    assert.ok(archiveStart >= 0, 'missing fixed historical ledger boundary')
    body = body.slice(0, archiveStart)
    assert.equal(body.split(marker).length, 2)
    return new Map(
      body
        .split(marker)[1]
        .split('\n\n')[0]
        .split('\n')
        .slice(1)
        .map((line) => {
          const cells = line.split('|')
          return [cells[1].trim().slice(1, -1), cells[3].trim()]
        }),
    )
  }
  const before = table(read('ledger.before-code-acceptance.md'))
  const current = table(readCurrent('docs/ops/audits/code-quality-file-ledger.md'))
  assert.equal(closeout.fixedHistoricalSubjects, 178)
  assert.equal(closeout.goalSubjectsCompleted, 174)
  assert.equal(closeout.goalSubjectsRemaining, 0)
  assert.equal(closeout.acceptedCurrentPaths.length, 317)
  assert.equal(
    new Set(closeout.acceptedCurrentPaths.map((x) => x.path)).size,
    317,
    'duplicate accepted path',
  )
  for (const entry of closeout.acceptedCurrentPaths) {
    assert.equal(before.get(entry.path), 'review', entry.path)
    assert.equal(current.get(entry.path), '已验证', entry.path)
    assert.equal(sha(readCurrent(entry.path)), entry.sha256, entry.path)
    assert.ok(entry.evidence.length > 0, entry.path)
  }
  assert.equal(new Set(closeout.remainingReview).size, 5)
  for (const path of closeout.remainingReview) {
    assert.equal(before.get(path), 'review', path)
    assert.equal(current.get(path), 'review', path)
  }
  for (const [path, status] of before) {
    if (closeout.acceptedCurrentPaths.some((x) => x.path === path)) continue
    assert.equal(current.get(path), status, path)
  }
  for (const id of [
    'check-r2',
    'docs-final',
    'lint-final',
    'coverage-tools-r2',
    'same-report-ratchet-r2',
    'same-report-protected',
  ]) {
    const execution = json(`${id}.execution.json`)
    assert.equal(execution.exit, 0, id)
    assert.equal(execution.signal, null, id)
    assert.equal(execution.spawnError, null, id)
    assert.equal(read(`${id}.stderr.raw`), '', id)
    assert.equal(Buffer.byteLength(read(`${id}.stdout.raw`)), execution.stdoutBytes, id)
  }
  assert.match(read('lint-final.stdout.raw'), /0 errors \/ 0 warnings \/ 0 infos/)
  const report = json('official-coverage-summary.json')
  assert.equal(report.testCount, 20199)
  assert.equal(report.sourceFileCount, 812)
  assert.equal(
    sha(readCurrent('scripts/coverage/baseline.fast.json')),
    closeout.baselineAfterSha256,
  )
  assert.equal(json('coverage-analysis.json').extraCollections, 0)
  assert.ok(
    Object.values(json('coverage-analysis.json').runtimeDiagnosticCounts).every((x) => x === 0),
  )
  return {
    acceptedCurrentPaths: 317,
    remainingReview: 5,
    fixedHistoricalSubjects: 178,
    additionalCoverageCollections: 0,
    meaning: 'Exact evidence transition; no new semantic review credit.',
  }
}
