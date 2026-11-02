import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { currentDocumentPath } from './document-location.mjs'
import { installHistoricalLocationFixture } from './document-location.test-support.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { saveDocumentRegistryFixture } from './document-registry.test-support.mjs'
import { frozenDocumentBaseline } from './frozen-document-source.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { readGitDocumentSource } from './git-document-source.mjs'
import {
  historicalDeliveryContract,
  historicalDeliveryIntegritySource,
  historicalDeliveryPilots,
  historicalDeliveryReadDomain,
} from './historical-document-delivery-native.mjs'
import { expectedHistoricalBoundaries } from './historical-document-delivery-native.test-support.mjs'
import { packReviewStorageRecord } from './review-record-storage-packing.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const carrierRevision = 'd9a3a0a0a7c45fc75f922ae3dffd13a68ca29a5e'
const templatePath = 'docs/phase-governance/templates/registry.json'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = (path) => JSON.parse(readFileSync(join(root, currentDocumentPath(path)), 'utf8'))
const sourceCache = new Map()
function source(pin) {
  const key = `${pin.revision}:${pin.path}`
  if (!sourceCache.has(key)) sourceCache.set(key, readGitDocumentSnapshot(root, pin))
  return sourceCache.get(key)
}

function receipt(pilot) {
  const original = source({ path: pilot.path, revision: carrierRevision })
  assert(original, `fixed native Git source unavailable: ${pilot.path}`)
  const native = JSON.parse(original.buffer)
  const context = source(historicalDeliveryIntegritySource)
  assert(context, 'fixed record-integrity source unavailable')
  const contextReferences = [
    {
      ...historicalDeliveryIntegritySource,
      lineStart: 2,
      lineEnd: 2,
      quote: context.buffer.toString('utf8').split('\n')[1].trim(),
    },
  ]
  const stringKeys = ['id', 'reviewDate', 'verdict', 'policy'].filter(
    (key) => typeof native[key] === 'string',
  )
  const nativeWitnesses = stringKeys.map((key) => ({
    pointer: `/${key}`,
    representation: 'parsed-string',
    quote: native[key],
    meaning: `Original historical ${key}`,
  }))
  const resultKeys = [
    'counters',
    'blockingCounters',
    'nonBlockingCounters',
    'entries',
    'documents',
    'recordIntegrityCorrection20261018',
  ].filter((key) => typeof native[key] === 'object')
  for (const key of resultKeys)
    nativeWitnesses.push({
      pointer: `/${key}`,
      representation: 'json-stringify',
      quote: JSON.stringify(native[key]).slice(0, 120),
      meaning: 'Historical result shape; no current execution or acceptance',
    })
  return {
    path: pilot.path,
    docType: 'evidence-receipt',
    templateId: 'evidence-receipt-v1',
    templateVariant: historicalDeliveryContract.variant,
    templateVersion: '1.0.0',
    historyOverlay: false,
    artifactOnly: false,
    documentStatus: 'historical',
    historicalRole: pilot.historicalRole,
    sourceSha256: pilot.historicalSourceSha256,
    sourceGitRevision: pilot.historicalSourceGitRevision,
    afterSha256: pilot.sourceSha256,
    revision: { currentSha: pilot.sourceSha256 },
    contentReviewStatus: 'content-reviewed',
    templateCompliance: 'template-compliant',
    owner: 'S33 owned test fixture',
    coreConclusion:
      'Historical receipt content only; old verdicts and corrected claims stay bounded.',
    readMethod: 'Fixed Git native bytes and accepted historical boundary; no old execution replay.',
    reviewedLines: `1-${original.buffer.toString('utf8').split('\n').length}`,
    truthAnchors: [`${carrierRevision}:${pilot.path}`],
    primarySource: [
      {
        path: pilot.path,
        revision: carrierRevision,
        gitObject: original.gitObject,
        sha256: hash(original.buffer),
      },
    ],
    legalInputs: [
      {
        kind: 'native-carrier',
        path: pilot.path,
        revision: carrierRevision,
        sha256: hash(original.buffer),
      },
      { kind: 'historical-context', ...historicalDeliveryIntegritySource },
    ],
    businessOracle: {
      type: 'historical-receipt-content',
      historicalOnly: true,
      assertions: [
        'The original receipt identity, result shape, and corrected history remain intact.',
      ],
    },
    unresolved: ['Historical commands are not reexecuted; permanent retention is unproven.'],
    stopLine: 'No current execution, semantic reacceptance, or parent task completion credit.',
    nextStep: 'Independent pilot acceptance precedes any wider publication.',
    evidence: {
      kind: historicalDeliveryContract.variant,
      metadataLocation: 'existing-current-review',
      nativeWitnesses,
      contextReferences,
      readDomain: structuredClone(historicalDeliveryReadDomain),
      fieldRoles: {
        identity: ['id', 'reviewDate'],
        results: resultKeys,
        governance: [`${pilot.reviewRecord}#entries/${pilot.reviewIndex}`],
      },
      retention: {
        recommendation: 'retain-native',
        reason: 'Current byte pin and corrected historical claims require an explicit exit plan.',
        removalPrecondition:
          'Preserve unique corrections, migrate real references, and verify consumers.',
        permanentRetentionProven: false,
        completeSubstituteAssessment: 'not-performed',
      },
      historicalBoundary: structuredClone(
        expectedHistoricalBoundaries[pilot.path.split('/').at(-1)],
      ),
      runtimeExecutionPerformed: false,
      historicClaimsReexecuted: false,
      creditGranted: 0,
    },
  }
}

function memory(pilot = historicalDeliveryPilots[0]) {
  const documents = new Map()
  const registry = json(templatePath)
  const row = receipt(pilot)
  const entries = Array.from({ length: pilot.reviewIndex + 1 }, (_, index) => ({
    path: `docs/fixture-unreviewed-${index}.md`,
  }))
  entries[pilot.reviewIndex] = row
  const review = { entries }
  documents.set(
    pilot.path,
    Buffer.from(source({ path: pilot.path, revision: carrierRevision }).buffer),
  )
  const readBuffer = (path) => {
    if (path === pilot.reviewRecord) return Buffer.from(JSON.stringify(review))
    return documents.get(path) ?? readFileSync(join(root, currentDocumentPath(path)))
  }
  const read = (path) => readBuffer(path)?.toString('utf8')
  const options = {
    readBuffer,
    readSource: (pin) => readGitDocumentSource(root, pin),
    readSourceBuffer: source,
    reviewReader: (path) => (path === pilot.reviewRecord ? review : undefined),
  }
  const doc = {
    path: pilot.path,
    templateId: 'evidence-receipt-v1',
    variant: historicalDeliveryContract.variant,
  }
  return {
    pilot,
    row,
    review,
    documents,
    registry,
    doc,
    options,
    check: () => checkMigratedDocument(doc, registry, read, options),
  }
}

function rejection(fixture, pattern) {
  const issues = fixture.check()
  assert(
    issues.some((issue) => pattern.test(issue)),
    JSON.stringify(issues),
  )
}

test('six fixed native pilots retain three roles and historical contradictions without rewriting originals', () => {
  assert.equal(new Set(historicalDeliveryPilots.map((pilot) => pilot.historicalRole)).size, 3)
  for (const pilot of historicalDeliveryPilots) {
    const f = memory(pilot)
    assert.deepEqual(f.check(), [], pilot.path)
    const native = JSON.parse(f.documents.get(pilot.path))
    assert.equal(Object.hasOwn(native, '_governance'), false)
    assert.equal(Object.hasOwn(native, 'nonAuthorReviewer'), false)
    assert.equal(hash(f.documents.get(pilot.path)), pilot.sourceSha256)
  }
  const r53 = receipt(historicalDeliveryPilots[2]).evidence.historicalBoundary
  assert.equal(r53.r53PolicyCountContradiction.declaredInPolicy, 20)
  assert.equal(r53.r53PolicyCountContradiction.actualEntries, 16)
  assert.equal(
    receipt(historicalDeliveryPilots[5]).evidence.historicalBoundary.correctedCandidateHead
      .actualCandidateHead,
    null,
  )
})

test('native edits cannot be laundered through synchronized after and current SHA values', () => {
  for (const mutate of [
    (bytes) => Buffer.concat([bytes, Buffer.from('\n')]),
    (bytes) =>
      Buffer.from(bytes.toString('utf8').replace('"verdict": "accept"', '"verdict": "rework"')),
    (bytes) => Buffer.from(JSON.stringify({ payload: JSON.parse(bytes) })),
  ]) {
    const f = memory()
    const before = f.documents.get(f.doc.path)
    const changed = mutate(before)
    assert.notDeepEqual(changed, before, 'counterexample must change native bytes')
    f.documents.set(f.doc.path, changed)
    f.row.afterSha256 = hash(changed)
    f.row.revision.currentSha = hash(changed)
    rejection(f, /original bytes changed/)
  }
})

test('native IO rejects invalid UTF8 and duplicate decoded keys before hash trust', () => {
  const text = memory().documents.get(historicalDeliveryPilots[0].path).toString('utf8')
  for (const [bytes, message] of [
    [
      Buffer.from(text.replace('{', '{"id":"forged","\\u0069d":"second",')),
      /duplicate decoded key/,
    ],
    [
      Buffer.concat([
        Buffer.from(text.slice(0, 2)),
        Buffer.from([0xff]),
        Buffer.from(text.slice(2)),
      ]),
      /invalid UTF8/,
    ],
  ]) {
    const f = memory()
    f.documents.set(f.doc.path, bytes)
    f.row.afterSha256 = hash(bytes)
    f.row.revision.currentSha = hash(bytes)
    rejection(f, message)
  }
})

test('admission fixes role, review position, original source, and carrier provenance independently', () => {
  for (const mutate of [
    (f) => {
      f.row.historicalRole = 'author-contribution-ledger'
    },
    (f) => {
      f.review.entries.unshift({ path: 'docs/foreign.md' })
    },
    (f) => {
      f.row.sourceSha256 = f.row.afterSha256
    },
    (f) => {
      f.row.sourceGitRevision = carrierRevision
    },
    (f) => {
      f.row.primarySource[0].gitObject = '0'.repeat(40)
    },
    (f) => {
      f.review.entries.push(structuredClone(f.row))
    },
  ]) {
    const f = memory(historicalDeliveryPilots[3])
    assert.notEqual(f.row.sourceSha256, f.row.afterSha256)
    mutate(f)
    rejection(f, /identity|source|role|review|primary/i)
  }
  const foreign = memory()
  foreign.doc.path = 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/unapproved-receipt.json'
  foreign.documents.set(foreign.doc.path, foreign.documents.get(foreign.pilot.path))
  rejection(foreign, /fixed.*path\/variant\/version/)
})

test('witnesses bind RFC6901 values and context SHA, revision, line range, and literal quotes', () => {
  for (const mutate of [
    (e) => {
      e.nativeWitnesses[0].pointer = '/id/~2invalid'
    },
    (e) => {
      e.nativeWitnesses[0].pointer = '/missing'
    },
    (e) => {
      e.nativeWitnesses[0].quote = 'not present in this original value'
    },
    (e) => {
      e.nativeWitnesses.at(-1).representation = 'parsed-string'
    },
    (e) => {
      e.contextReferences[0].revision = '0'.repeat(40)
    },
    (e) => {
      e.contextReferences[0].sha256 = '0'.repeat(64)
    },
    (e) => {
      e.contextReferences[0].lineStart = 999999
      e.contextReferences[0].lineEnd = 999999
    },
    (e) => {
      e.contextReferences[0].quote = 'invented historical finding'
    },
  ]) {
    const f = memory()
    mutate(f.row.evidence)
    rejection(f, /witness|context/i)
  }
})

test('legal inputs are exactly the carrier and declared historical context, never recorded results', () => {
  for (const mutate of [
    (row) => {
      row.legalInputs = ['documents[].afterSha256']
    },
    (row) => {
      row.legalInputs.push({ kind: 'recorded-result', path: 'documents/0/afterSha256' })
    },
    (row) => {
      row.legalInputs.push(structuredClone(row.legalInputs[0]))
    },
    (row) => {
      row.legalInputs.pop()
    },
    (row) => {
      row.legalInputs[0].result = 'pass'
    },
    (row) => {
      row.legalInputs[1].sha256 = row.afterSha256
    },
  ]) {
    const f = memory()
    mutate(f.row)
    rejection(f, /legal input/i)
  }
})

test('historical boundaries preserve unknown independence and withdrawn execution without new credit', () => {
  for (const [index, mutate] of [
    [
      0,
      (e) => {
        e.historicalBoundary.canonicalWithdrawnPaths152.pop()
      },
    ],
    [
      0,
      (e) => {
        e.historicalBoundary.historicalNonAuthorReviewer.value = false
      },
    ],
    [
      3,
      (e) => {
        e.historicalBoundary.r65SummaryOnlyEdit = null
      },
    ],
    [
      4,
      (e) => {
        e.historicalBoundary.r88to91ExecutionIsolation = null
      },
    ],
    [
      5,
      (e) => {
        e.historicalBoundary.correctedCandidateHead.actualCandidateHead = carrierRevision
      },
    ],
    [
      0,
      (e) => {
        e.runtimeExecutionPerformed = true
      },
    ],
    [
      0,
      (e) => {
        e.historicClaimsReexecuted = true
      },
    ],
    [
      0,
      (e) => {
        e.creditGranted = 1
      },
    ],
    [
      0,
      (e) => {
        e.readDomain.notRead = []
      },
    ],
    [
      0,
      (e) => {
        e.retention.permanentRetentionProven = true
      },
    ],
  ]) {
    const f = memory(historicalDeliveryPilots[index])
    mutate(f.row.evidence)
    rejection(f, /historical|execution|credit|read domain|retention/i)
  }
})

function publicFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-native-delivery-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', root, directory])
  cpSync(join(root, 'scripts/docs'), join(directory, 'scripts/docs'), { recursive: true })
  installHistoricalLocationFixture(directory)
  const write = (path, bytes) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), bytes)
  }
  const save = (path, value) => write(path, `${JSON.stringify(value, null, 2)}\n`)
  write('AGENTS.md', '# Fixture\n\n## Routes\n\nOwned native receipt fixture.\n')
  write(templatePath, readFileSync(join(root, templatePath)))
  write(
    frozenDocumentBaseline.path,
    readFileSync(join(root, currentDocumentPath(frozenDocumentBaseline.path))),
  )
  const routes = historicalDeliveryPilots.map((pilot) => ({
    path: pilot.path,
    templateId: 'evidence-receipt-v1',
    variant: historicalDeliveryContract.variant,
  }))
  const entries = historicalDeliveryPilots.map((pilot) => ({
    path: pilot.path,
    phase: 'ops',
    docType: 'evidence-receipt',
    templateId: 'evidence-receipt-v1',
    templateVersion: '1.0.0',
    templateVariant: historicalDeliveryContract.variant,
    historyOverlay: false,
    templateCompliance: 'template-compliant',
    reviewStatus: 'content-reviewed',
    reviewRecord: pilot.reviewRecord.split('/').at(-1),
  }))
  const reviews = new Map()
  for (const pilot of historicalDeliveryPilots) {
    if (!reviews.has(pilot.reviewRecord))
      reviews.set(pilot.reviewRecord, {
        schemaVersion: 1,
        id: 'owned-six-pilot-fixture',
        entries: [],
      })
    const record = reviews.get(pilot.reviewRecord)
    while (record.entries.length <= pilot.reviewIndex)
      record.entries.push({ path: `docs/fixture-unreviewed-${record.entries.length}.md` })
    record.entries[pilot.reviewIndex] = receipt(pilot)
    write(pilot.path, source({ path: pilot.path, revision: carrierRevision }).buffer)
  }
  const publish = () => {
    rmSync(join(directory, 'docs/phase-governance/reviews/shards'), {
      recursive: true,
      force: true,
    })
    for (const [logicalPath, record] of reviews) {
      const original = source({ path: logicalPath, revision: carrierRevision })
      const packed = packReviewStorageRecord({
        logicalPath,
        record,
        sourcePin: {
          path: logicalPath,
          revision: carrierRevision,
          gitObject: original.gitObject,
          sha256: hash(original.buffer),
        },
        context: { format: (text) => text },
      })
      for (const output of packed.outputs) write(output.path, output.bytes)
    }
    save('docs/phase-governance/routing.json', {
      entry: 'AGENTS.md',
      entrySection: 'Routes',
      routes: [],
      forwardingEntries: [],
      migratedDocuments: routes,
    })
    saveDocumentRegistryFixture(directory, entries)
  }
  const cli = (script) => {
    const result = spawnSync(
      process.execPath,
      [
        `scripts/docs/${script}.mjs`,
        ...(script === 'report-governance-progress' ? ['--json'] : []),
      ],
      { cwd: directory, encoding: 'utf8' },
    )
    assert.equal(result.error, undefined)
    assert.equal(result.signal, null)
    return {
      ...result,
      report: script === 'report-governance-progress' ? JSON.parse(result.stdout) : undefined,
    }
  }
  const reject = (path, pattern) => {
    const model = cli('check-document-model')
    const progress = cli('report-governance-progress')
    assert.equal(model.status, 1, model.stdout + model.stderr)
    assert.match(model.stderr, pattern)
    assert.equal(progress.status, 1, progress.stdout + progress.stderr)
    assert(
      progress.report.issues.some((issue) => issue.includes(path) && pattern.test(issue)),
      JSON.stringify(progress.report.issues),
    )
    assert.equal(
      progress.report.completed.some((entry) => entry.path === path),
      false,
    )
    assert.equal(progress.report.completed.length, 5)
  }
  publish()
  return { directory, write, publish, entries, routes, reviews, cli, reject }
}

test('public model and progress reject coordinated retag, byte/SHA laundering, and missing historical boundaries', (t) => {
  const f = publicFixture(t)
  const goodModel = f.cli('check-document-model')
  assert.equal(goodModel.status, 0, goodModel.stdout + goodModel.stderr)
  const goodProgress = f.cli('report-governance-progress')
  assert.equal(goodProgress.status, 0, goodProgress.stdout + goodProgress.stderr)
  assert.equal(goodProgress.report.completed.length, 6)
  assert.equal(goodProgress.report.approvedCohort, 1838)
  const pilot = historicalDeliveryPilots[0]
  const row = f.reviews.get(pilot.reviewRecord).entries[pilot.reviewIndex]
  const originalRow = structuredClone(row)
  const originalBytes = source({ path: pilot.path, revision: carrierRevision }).buffer
  const entry = f.entries[0],
    route = f.routes[0]
  const originalEntry = structuredClone(entry),
    originalRoute = structuredClone(route)
  const body =
    '# Forged index\n\nLast reviewed: 2026-10-24\nTemplate: governance-index-v1 / 1.0.0\n' +
    ['目的', '范围', '当前状态', '入口与责任', '证据与下一步']
      .map((heading) => `\n## ${heading}\n\nStructurally complete replacement.\n`)
      .join('')
  entry.docType = 'governance-index'
  entry.templateId = 'governance-index-v1'
  delete entry.templateVariant
  route.templateId = entry.templateId
  delete route.variant
  row.docType = entry.docType
  row.templateId = entry.templateId
  delete row.templateVariant
  row.afterSha256 = hash(body)
  row.revision.currentSha = hash(body)
  f.write(pilot.path, body)
  f.publish()
  f.reject(pilot.path, /fixed.*path\/variant\/version/)
  Object.assign(entry, originalEntry)
  Object.assign(route, originalRoute)
  for (const key of Object.keys(row)) delete row[key]
  Object.assign(row, structuredClone(originalRow))
  const changed = Buffer.concat([originalBytes, Buffer.from('\n')])
  f.write(pilot.path, changed)
  row.afterSha256 = hash(changed)
  row.revision.currentSha = hash(changed)
  f.publish()
  f.reject(pilot.path, /original bytes changed/)
  Object.assign(row, structuredClone(originalRow))
  f.write(pilot.path, originalBytes)
  row.evidence.historicalBoundary.canonicalWithdrawnPaths152 = []
  f.publish()
  f.reject(pilot.path, /historical boundary/i)
  Object.assign(row, structuredClone(originalRow))
  f.publish()
  assert.equal(f.cli('check-document-model').status, 0)
  assert.equal(f.cli('report-governance-progress').report.completed.length, 6)
})
