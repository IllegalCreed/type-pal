import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitHtmlSnapshot } from './git-html-snapshot.mjs'
import { historicalHtmlAdmissions } from './historical-html-admission.mjs'
import { historicalHtmlContentSha256 } from './historical-html-native.mjs'
import { loadReviewRecordFromGit, loadReviewRecords } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const readBuffer = (path) => {
  try {
    return readFileSync(new URL(`../../${path}`, import.meta.url))
  } catch {
    return undefined
  }
}
const read = (path) => readBuffer(path)?.toString('utf8')
const templates = JSON.parse(read('docs/phase-governance/templates/registry.json'))
const routing = JSON.parse(read('docs/phase-governance/routing.json'))
const group = loadReviewRecords({ root })
const rowFor = (source) => group.records.get(source.reviewRecord).entries[source.reviewIndex]
const check = (source, row = rowFor(source)) =>
  checkMigratedDocument(
    {
      path: source.path,
      templateId: row.templateId,
      variant: row.templateVariant,
      historyOverlay: false,
    },
    templates,
    read,
    {
      readBuffer,
      readHtmlSourceBuffer: (pin) => readGitHtmlSnapshot(root, pin),
      reviewReader: (path) => {
        const record = group.records.get(path)
        return path === source.reviewRecord
          ? {
              ...record,
              entries: record.entries.map((value, index) =>
                index === source.reviewIndex ? row : value,
              ),
            }
          : record
      },
    },
  )

// Current acceptance is the input under test. Frozen partial fixtures remain in the old suite.
test('all fifteen admitted HTML versions have one matching route and pass the actual public contract', () => {
  assert.equal(historicalHtmlAdmissions.length, 15)
  for (const source of historicalHtmlAdmissions) {
    const row = rowFor(source)
    assert.equal(row.path, source.path)
    assert.equal(row.contentReviewStatus, 'content-reviewed')
    assert.equal(row.templateCompliance, 'template-compliant')
    assert.equal(row.evidence.runtimeExecutionPerformed, false)
    assert.equal(row.evidence.path, source.path)
    assert.equal(routing.migratedDocuments.filter((doc) => doc.path === source.path).length, 1)
    assert.deepEqual(check(source), [], source.path)
  }
})

test('current accepted HTML content cannot be replaced by refreshing its self-reported digest', () => {
  const source = historicalHtmlAdmissions.find((entry) =>
    entry.path.endsWith('/actor-mode-v1.html'),
  )
  const row = structuredClone(rowFor(source))
  row.coreConclusion += ' A new unreviewed claim.'
  row.currentIndependentAcceptance.contentSha256 = historicalHtmlContentSha256(row)
  assert(
    check(source, row).includes(
      'HTML native promotion requires its exact external content acceptance',
    ),
  )
})

test('a new HTML path cannot borrow the independent report of the original three pilots', () => {
  const target = historicalHtmlAdmissions.find((entry) => entry.path.endsWith('/place-mode.html'))
  const pilot = historicalHtmlAdmissions.find((entry) => entry.path.endsWith('/actor-mode-v2.html'))
  const row = structuredClone(rowFor(target))
  row.currentIndependentAcceptance.reportSha256 =
    rowFor(pilot).currentIndependentAcceptance.reportSha256
  row.currentIndependentAcceptance.reviewer = 'GLM'
  assert(
    check(target, row).includes(
      'HTML native promotion requires its exact external content acceptance',
    ),
  )
})

test('withdrawn claims stay in history and cannot remain active beside a fresh HTML acceptance', () => {
  for (const source of historicalHtmlAdmissions) {
    const old = loadReviewRecordFromGit({
      root,
      revision: 'cf71157cfb07bf6b25a03a8e66c46e1f653dab27',
      logicalPath: source.reviewRecord,
    }).record.entries[source.reviewIndex]
    const row = rowFor(source)
    if (old.claimCorrection)
      assert(
        row.history.some(
          (event) =>
            JSON.stringify(event.priorClaimCorrection) === JSON.stringify(old.claimCorrection),
        ),
      )
    assert.equal(row.claimCorrection, undefined)
  }
  const source = historicalHtmlAdmissions[0]
  const row = structuredClone(rowFor(source))
  row.claimCorrection = { decision: 'withdrawn; this is a deliberately contradictory IO input' }
  assert(
    check(source, row).includes(
      'HTML native promotion requires its exact external content acceptance',
    ),
  )
})

test('an administrative evidence locator cannot redirect accepted HTML evidence', () => {
  const source = historicalHtmlAdmissions[0]
  const row = structuredClone(rowFor(source))
  row.evidence.path = 'docs/README.md'
  row.currentIndependentAcceptance.contentSha256 = historicalHtmlContentSha256(row)
  assert(
    check(source, row).includes(
      'HTML native actual DOM/resources/witnesses or execution boundary mismatch',
    ),
  )
})
