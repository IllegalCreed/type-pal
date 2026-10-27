import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { readGitHtmlSnapshot } from './git-html-snapshot.mjs'
import {
  historicalHtmlCarrierRevision,
  historicalHtmlContracts,
  historicalHtmlPilots,
} from './historical-html-admission.mjs'
import { htmlSourceWitnesses } from './historical-html-native.mjs'
import { readHistoricalHtml, readHtmlResources } from './historical-html-reading.mjs'
import { loadReviewRecordFromGit } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const readBuffer = (path) => {
  try {
    return readFileSync(new URL(`../../${path}`, import.meta.url))
  } catch {
    return undefined
  }
}
const read = (path) => readBuffer(path)?.toString('utf8')
const registry = JSON.parse(read('docs/phase-governance/templates/registry.json'))
const mockup = 'docs/phase2/archive/mockups/actor-mode-v2.html'
const host = 'docs/testing/archive/legacy/batches/glm-new-waves/wave-F/browser-host/index.html'
const canvas = 'docs/testing/archive/legacy/batches/glm-runtime-resource-wave/hosts/rv2/index.html'

// Real frozen HTML and real source review position; this is an IO contract fixture, not content credit.
function fixture(path) {
  const pilot = historicalHtmlPilots.find((entry) => entry.path === path)
  const definition = historicalHtmlContracts[pilot.family]
  const record = loadReviewRecordFromGit({
    root,
    revision: historicalHtmlCarrierRevision,
    logicalPath: pilot.reviewRecord,
  }).record
  const reading = readHistoricalHtml(readBuffer(path))
  const pin = {
    path,
    revision: historicalHtmlCarrierRevision,
    gitObject: pilot.carrierGitObject,
    sha256: pilot.carrierSha256,
  }
  const row = {
    ...structuredClone(record.entries[pilot.reviewIndex]),
    docType: definition.templateId.replace(/-v1$/u, ''),
    templateId: definition.templateId,
    templateVariant: definition.variant,
    templateVersion: definition.templateVersion,
    historyOverlay: false,
    artifactOnly: false,
    documentStatus: 'historical',
    owner: 'HTML contract IO fixture',
    coreConclusion: `Historical ${reading.title}: static source only; no execution claim.`,
    truthAnchors: [path],
    readDomain: {
      actual: 'Real fixed HTML syntax inspected by this IO test.',
      reusedFrom: [],
      notRead: ['No script or browser execution'],
    },
    primarySource: [pin],
    legalInputs: [{ kind: 'fixed-html-source', ...pin }],
    businessOracle: {
      type: 'historical-html-document',
      currentExecution: false,
      assertions: ['Native DOM and script references are static declarations.'],
    },
    evidence: {
      kind: 'historical-html-native',
      metadataLocation: 'existing-current-review',
      htmlReading: reading,
      resourceReading: readHtmlResources(path, reading, read),
      nativeWitnesses: htmlSourceWitnesses(reading),
      callerBoundary: {
        activeExecutionVerified: false,
        scope: 'No active caller asserted by IO fixture.',
      },
      runtimeExecutionPerformed: false,
      historicClaimsReexecuted: false,
      creditGranted: 0,
    },
    fieldRoles: {
      representation: 'derived-static-html/1',
      identity: ['/title'],
      results: ['/canvases', '/scripts', '/references'],
      governance: [`${pilot.reviewRecord}#entries/${pilot.reviewIndex}`],
    },
    versionScope: 'Historical HTML source, not a current game checkpoint.',
    publicCallers: [],
    dedupe: { result: 'Existing native identity only.', against: [path] },
    historyBoundary: 'Source is retained; no historical execution authenticated.',
    unresolved: [],
    stopLine: 'No author self-promotion.',
    nextStep: 'Independent acceptance before publication.',
    readMethod: 'Fixed original source and native parser, no runtime.',
    reviewedLines: 'Real source HTML only.',
    contentReviewStatus: 'partial-review-unknown',
    templateCompliance: 'needs-migration',
  }
  delete row.currentIndependentAcceptance
  const doc = {
    path,
    templateId: definition.templateId,
    variant: definition.variant,
    historyOverlay: false,
  }
  const check = ({
    value = row,
    document = doc,
    bytes = readBuffer(path),
    templates = registry,
  } = {}) =>
    checkMigratedDocument(
      document,
      templates,
      (p) => (p === path ? bytes.toString('utf8') : read(p)),
      {
        readBuffer: (p) => (p === path ? bytes : readBuffer(p)),
        readHtmlSourceBuffer: (p) => readGitHtmlSnapshot(root, p),
        reviewReader: (p) => {
          assert.equal(p, pilot.reviewRecord)
          return {
            ...record,
            entries: record.entries.map((r, i) => (i === pilot.reviewIndex ? value : r)),
          }
        },
      },
    )
  return { pilot, doc, row, reading, check }
}

test('HTML Git reader resolves both real source axes and does not widen the JSON reader', () => {
  for (const path of [mockup, host, canvas]) {
    const pilot = historicalHtmlPilots.find((entry) => entry.path === path)
    const pin = { path, revision: historicalHtmlCarrierRevision }
    assert.equal(readGitHtmlSnapshot(root, pin).gitObject, pilot.carrierGitObject)
    assert.equal(readGitDocumentSnapshot(root, pin), undefined)
  }
  assert.equal(
    readGitHtmlSnapshot(root, { path: '../AGENTS.md', revision: historicalHtmlCarrierRevision }),
    undefined,
  )
  assert.equal(
    readGitHtmlSnapshot(root, {
      path: 'docs/testing/catalog.json',
      revision: historicalHtmlCarrierRevision,
    }),
    undefined,
  )
})

test('real static mockup, root-only host and explicit missing-build host pass the public model', () => {
  const a = fixture(mockup),
    b = fixture(host),
    c = fixture(canvas)
  assert.equal(a.reading.title, '编辑器 · 角色模式 mockup v2')
  assert.deepEqual(a.reading.scripts, [])
  assert.deepEqual(a.reading.canvases, [])
  assert(b.reading.ids.some((item) => item.tag === 'div' && item.id === 'root'))
  assert.deepEqual(b.reading.canvases, [])
  assert.equal(b.reading.scripts[0].src, './host.tsx')
  assert.deepEqual(c.reading.canvases, [{ id: 'stage', width: '960', height: '600' }])
  assert.equal(c.row.evidence.resourceReading[0].present, false)
  for (const f of [a, b, c]) assert.deepEqual(f.check(), [], f.doc.path)
})

test('changed source and refreshed self-reported SHA cannot replace the admitted carrier', () => {
  const f = fixture(host)
  const changed = Buffer.from(read(host).replace('GLM New Wave F', 'Changed Wave F'))
  const row = structuredClone(f.row)
  row.afterSha256 = createHash('sha256').update(changed).digest('hex')
  row.primarySource[0].sha256 = row.afterSha256
  row.legalInputs[0].sha256 = row.afterSha256
  row.evidence.htmlReading = readHistoricalHtml(changed)
  row.evidence.nativeWitnesses = htmlSourceWitnesses(row.evidence.htmlReading)
  assert(f.check({ value: row, bytes: changed }).includes('HTML native original bytes changed'))
})

test('joint variant and registry relabeling cannot turn a host into a mockup', () => {
  const f = fixture(host)
  const definition = historicalHtmlContracts.mockup
  const changed = structuredClone(registry)
  const parent = changed.types.find((entry) => entry.templateId === definition.templateId)
  parent.variants[definition.variant] = definition
  assert(
    f
      .check({
        document: { ...f.doc, templateId: definition.templateId, variant: definition.variant },
        templates: changed,
      })
      .some((issue) => issue.includes('exact admitted')),
  )
})

test('missing compiled main.js cannot be reported as a resolved runnable script', () => {
  const f = fixture(canvas),
    row = structuredClone(f.row)
  row.evidence.resourceReading[0].present = true
  assert(f.check({ value: row }).some((issue) => issue.includes('DOM/resources/witnesses')))
})

test('borrowing the S56 report cannot self-promote HTML', () => {
  const f = fixture(host),
    row = structuredClone(f.row)
  row.contentReviewStatus = 'content-reviewed'
  row.templateCompliance = 'template-compliant'
  row.currentIndependentAcceptance = {
    reviewer: 'GLM',
    nonAuthorReviewer: true,
    verdict: 'accept',
    reportSha256: '1f3c0cc95229cb3e6a40ef7c173d54ab44a947528738546de0bdf3d1b06293bb',
  }
  assert(
    f.check({ value: row }).some((issue) => issue.includes('exact external content acceptance')),
  )
})

test('static HTML inspection cannot authenticate a browser execution', () => {
  const f = fixture(host),
    row = structuredClone(f.row)
  row.evidence.runtimeExecutionPerformed = true
  assert(f.check({ value: row }).some((issue) => issue.includes('execution boundary')))
})

test('HTML reader rejects invalid UTF-8 instead of producing a repaired source interpretation', () => {
  assert.throws(() => readHistoricalHtml(Buffer.from([0xff])))
})
