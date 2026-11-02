import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  currentReviewLedgerBaseline,
  currentReviewLedgerContract,
  currentReviewLedgerPilots,
} from './current-review-ledger-admission.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { loadReviewRecords } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const sourceCache = new Map()
const source = (pin) => {
  const key = `${pin.revision}:${pin.path}`
  if (!sourceCache.has(key)) sourceCache.set(key, readGitDocumentSnapshot(root, pin))
  return sourceCache.get(key)
}
const initial = loadReviewRecords({ root })
const templates = JSON.parse(
  readFileSync(join(root, 'docs/phase-governance/templates/registry.json')),
)
const sha = (b) => createHash('sha256').update(b).digest('hex')

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-current-ledger-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const write = (path, value) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(
      join(directory, path),
      Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`,
    )
  }
  // Isolate the original partial/flat test input from legitimate future publication.
  const fixturePaths = execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', currentReviewLedgerBaseline, 'docs/phase-governance/reviews'],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter((p) => p.endsWith('.json'))
  for (const path of fixturePaths)
    write(path, source({ path, revision: currentReviewLedgerBaseline }).buffer)
  const readBuffer = (p) => readFileSync(join(directory, p))
  const rows = new Map()
  for (const binding of currentReviewLedgerPilots) {
    const path = binding.reviewRecord
    const owner = JSON.parse(readBuffer(path))
    const row = owner.entries[binding.index]
    Object.assign(row, {
      templateId: currentReviewLedgerContract.templateId,
      templateVariant: currentReviewLedgerContract.variant,
      templateVersion: '1.0.0',
      documentStatus: 'current',
      historyOverlay: false,
      artifactOnly: false,
      artifactEnvelope: false,
      owner: 'isolated control contract fixture',
      coreConclusion: `Current ${binding.id} owns its exact ordered member set; child semantics are not accepted.`,
      truthAnchors: [`${binding.path}#/policy`],
      readDomain: {
        actual: 'Control header, protected logical membership and transfer sources',
        notRead: ['Child document bodies and historical execution not reread.'],
      },
      legalInputs: ['Actual complete protected current group and original Git source'],
      publicCallers: ['checkMigratedDocument through protected full-group reader'],
      fieldRoles: {
        logical: ['header and ordered membership'],
        physical: [
          binding.initialStorage === 'flat'
            ? 'flat JSON without own shards'
            : 'manifest with owned shards and original source pin',
        ],
        governance: [`${binding.reviewRecord}#entries/${binding.index}`],
      },
      historyBoundary: 'Original history remains scoped; integrity does not restore child credit.',
      stopLine: 'Identity, source or storage drift rejects.',
      nextStep: 'Independent content acceptance is still required.',
      businessOracle: {
        type: 'current-review-ledger-integrity',
        assertions: ['Unique membership and original transfers must remain exact.'],
      },
      evidence: {
        kind: 'current-review-ledger-pilot',
        path: binding.path,
        baselineRevision: '9d3e6834e9f41475a5802f37db4f898aa42179ba',
        headerSha256: binding.headerSha256,
        membershipSha256: binding.membershipSha256,
        runtimeExecutionPerformed: false,
        historicClaimsReexecuted: false,
        childSemanticAcceptanceGranted: false,
      },
    })
    write(path, owner)
    rows.set(binding.path, { path, index: binding.index })
  }
  function editMeta(binding, mutate) {
    const owner = JSON.parse(readBuffer(binding.reviewRecord))
    mutate(owner.entries[binding.index], owner)
    write(binding.reviewRecord, owner)
  }
  function editNative(binding, mutate) {
    const native = JSON.parse(readBuffer(binding.path))
    mutate(native)
    write(binding.path, native)
    editMeta(binding, (r) => {
      r.afterSha256 = sha(readBuffer(binding.path))
    })
  }
  function check(binding, override = {}) {
    const group = loadReviewRecords({ root: directory, readSourceSnapshot: source })
    const doc = {
      path: binding.path,
      templateId: currentReviewLedgerContract.templateId,
      variant: currentReviewLedgerContract.variant,
      historyOverlay: false,
    }
    return checkMigratedDocument(doc, templates, (p) => readBuffer(p).toString('utf8'), {
      readBuffer,
      readSourceBuffer: source,
      reviewGroupReader: () => group,
      ...override,
    })
  }
  return { write, readBuffer, check, editMeta, editNative }
}

test('actual public model admits nonempty, five-transfer empty and real manifest-backed current controls', (t) => {
  const f = fixture(t)
  for (const binding of currentReviewLedgerPilots)
    assert.deepEqual(f.check(binding), [], binding.path)
})

test('header and member-source changes reject even when the observed after pin is refreshed', (t) => {
  for (const mutate of [
    (v) => {
      v.policy += ' changed authority'
    },
    (v) => {
      v.entries[0].sourceSha256 = '0'.repeat(64)
    },
  ]) {
    const f = fixture(t),
      binding = currentReviewLedgerPilots[0]
    f.editNative(binding, mutate)
    assert(f.check(binding).some((x) => x.includes('header or ordered membership/source')))
  }
})

test('unique review ownership, observed bytes and pilot partial status are independent gates', (t) => {
  for (const mutate of [
    (r) => {
      r.afterSha256 = '0'.repeat(64)
    },
    (r, owner) => {
      owner.entries.push(structuredClone(r))
    },
    (r) => {
      r.contentReviewStatus = 'content-reviewed'
      r.templateCompliance = 'template-compliant'
    },
    (r) => {
      r.evidence.childSemanticAcceptanceGranted = true
    },
    (r) => {
      r.fieldRoles.governance = ['borrowed-review#entries/0']
    },
    (r) => {
      r.fieldRoles.physical = []
    },
  ]) {
    const f = fixture(t),
      binding = currentReviewLedgerPilots[0]
    f.editMeta(binding, mutate)
    assert(f.check(binding).length > 0)
  }
})

test('a declared transfer requires the real old blob and current unique destination, not its claimed true flag', (t) => {
  const f = fixture(t),
    binding = currentReviewLedgerPilots[1]
  const native = JSON.parse(f.readBuffer(binding.path)),
    pin = native.currentRecordTransfers[0].completePrior
  const result = f.check(binding, {
    readSourceBuffer: (p) =>
      p.revision === pin.revision && p.path === pin.path
        ? { ...source(p), buffer: Buffer.from('{}') }
        : source(p),
  })
  assert(result.some((x) => x.includes('transfer Git identity')))
  f.editNative(binding, (v) => {
    v.currentRecordTransfers.pop()
  })
  assert(f.check(binding).length > 0)
})

test('protected snapshot capability and current bytes are mandatory; a plain fabricated group is refused', (t) => {
  const f = fixture(t),
    binding = currentReviewLedgerPilots[0]
  assert(
    f.check(binding, {
      reviewGroupReader: () => ({ records: initial.records, loadedSource: { files: [] } }),
    }).length > 0,
  )
  assert(f.check(binding, { reviewGroupReader: undefined }).length > 0)
})

test('authorized child-status maintenance can change control bytes without freezing or accepting child meaning', (t) => {
  const f = fixture(t),
    binding = currentReviewLedgerPilots[0],
    before = sha(f.readBuffer(binding.path))
  f.editNative(binding, (v) => {
    v.entries[0].contentReviewStatus = 'partial-review-unknown'
    v.maintenanceHistory = [{ scope: 'isolated fixture; no child semantic acceptance' }]
  })
  assert.notEqual(sha(f.readBuffer(binding.path)), before)
  assert.deepEqual(f.check(binding), [])
})
