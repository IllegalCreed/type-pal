import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  currentControlContract,
  currentExampleContract,
  currentNativeContract,
  inspectCurrentNativeControl,
} from './current-native-control.mjs'
import { currentNativeControlAcceptance } from './current-native-control-acceptance.mjs'
import {
  currentNativeControlAdmissions,
  currentNativeControlBaseline,
} from './current-native-control-admission.mjs'
import {
  applyCurrentNativeControlGrant,
  currentNativeControlContentSha256,
  currentNativeControlQualificationIssues,
} from './current-native-control-qualification.mjs'
import {
  currentLedgerEntryHash,
  validateCurrentLedgerChanges,
  validateCurrentNativeControlChanges,
  validateCurrentNativeControlPublication,
} from './current-review-ledger-candidate.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { loadReviewRecords } from './review-record-storage.mjs'
import { packReviewStorageRecord } from './review-record-storage-packing.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url)),
  cache = new Map(),
  sha = (b) => createHash('sha256').update(b).digest('hex')
const sourceCache = new Map()
const source = (pin) => {
  const key = `${pin.revision}:${pin.path}`
  if (!sourceCache.has(key)) sourceCache.set(key, readGitDocumentSnapshot(root, pin))
  return sourceCache.get(key)
}
const fixed = (p) => {
  if (!cache.has(p))
    cache.set(
      p,
      execFileSync('git', ['show', `${currentNativeControlBaseline}:${p}`], {
        cwd: root,
        maxBuffer: 16 * 1024 * 1024,
      }),
    )
  return cache.get(p)
}
const nativePaths = currentNativeControlAdmissions.map((b) => b.path),
  registryPath = 'docs/phase-governance/templates/registry.json'
const templates = JSON.parse(fixed(registryPath))
for (const c of [currentControlContract, currentExampleContract]) {
  const t = templates.types.find((t) => t.templateId === c.templateId)
  t.variants ??= {}
  t.variants[c.variant] = c
}
const pilots = ['phase-manifest', 'registry-manifest', 'templates'].map((role) =>
  currentNativeControlAdmissions.find((b) => b.role === role),
)

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-current-native-control-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const write = (p, v) => {
    mkdirSync(dirname(join(directory, p)), { recursive: true })
    writeFileSync(join(directory, p), Buffer.isBuffer(v) ? v : `${JSON.stringify(v, null, 2)}\n`)
  }
  const paths = execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', currentNativeControlBaseline, 'docs/phase-governance/reviews'],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter((p) => p.endsWith('.json'))
  for (const p of [...paths, ...nativePaths]) write(p, fixed(p))
  write(registryPath, templates)
  const readBuffer = (p) =>
      existsSync(join(directory, p)) ? readFileSync(join(directory, p)) : fixed(p),
    read = (p) => readBuffer(p).toString('utf8')
  const group = () => loadReviewRecords({ root: directory, readSourceSnapshot: source }),
    changes = []
  let original
  const saveRecord = (owner, record, storage) => {
    if (storage) {
      for (const parent of new Set(
        storage.shards.map((d) =>
          dirname(join(directory, 'docs/phase-governance/reviews', d.path)),
        ),
      ))
        rmSync(parent, { recursive: true })
      const plan = packReviewStorageRecord({
        logicalPath: owner,
        record,
        sourcePin: storage.source,
        context: { repoRoot: root },
      })
      for (const o of plan.outputs) write(o.path, o.bytes)
    } else write(owner, record)
  }
  const editRow = (b, fn) => {
    const g = group(),
      r = structuredClone(g.records.get(b.reviewRecord))
    fn(r.entries[b.index])
    saveRecord(b.reviewRecord, r, g.storages.get(b.reviewRecord))
  }
  // The fixture installs two native definitions first, then pins those bytes;
  // author proposals cannot use an after-pin edit to smuggle a native mutation.
  editRow(
    pilots.find((b) => b.role === 'templates'),
    (r) => {
      r.afterSha256 = sha(readBuffer(registryPath))
    },
  )
  original = group()
  for (const b of pilots) {
    const c = currentNativeContract(b),
      v = inspectCurrentNativeControl(b.path, readBuffer),
      before = original.records.get(b.reviewRecord).entries[b.index],
      after = structuredClone(before)
    Object.assign(after, {
      docType: c.templateId === 'governance-index-v1' ? 'governance-index' : 'reference-canon',
      templateId: c.templateId,
      templateVariant: c.variant,
      templateVersion: '1.0.0',
      documentStatus: 'current',
      historyOverlay: false,
      artifactOnly: false,
      artifactEnvelope: false,
      owner: 'isolated control contract fixture',
      coreConclusion: `Isolated ${b.role} input with a concrete structural boundary; no real acceptance.`,
      truthAnchors: [b.path],
      readDomain: {
        actual: 'Header, native structure and member identity only',
        notRead: ['Child document semantics and historical executions'],
      },
      legalInputs: ['Complete protected group and original Git bytes'],
      publicCallers: ['checkMigratedDocument'],
      fieldRoles: {
        logical: ['authority and membership'],
        physical: ['native control, with owned descriptors where present'],
        governance: [`${b.reviewRecord}#entries/${b.index}`],
      },
      historyBoundary: 'Preserve original claims and runtime scope.',
      stopLine: 'Native/source/ownership drift fails.',
      nextStep: 'Independent review required.',
      businessOracle: {
        type: 'current-native-control-integrity',
        assertions: ['Exact role, structural identity and ownership'],
      },
      evidence: {
        kind: 'current-native-control-candidate',
        path: b.path,
        role: b.role,
        author: 'Codex',
        source: b.source,
        structureSha256: v.structureSha256,
        membershipSha256: v.membershipSha256,
        runtimeExecutionPerformed: false,
        historicClaimsReexecuted: false,
        childSemanticAcceptanceGranted: false,
      },
    })
    after.afterSha256 = sha(readBuffer(b.path))
    after.history ??= []
    after.history.push({
      kind: 'current-native-control-candidate',
      priorEntrySha256: currentLedgerEntryHash(before),
    })
    changes.push({
      path: b.path,
      reviewRecord: b.reviewRecord,
      index: b.index,
      beforeEntrySha256: currentLedgerEntryHash(before),
      after,
    })
    editRow(b, (r) => Object.assign(r, after))
  }
  const check = (b, extra = {}) => {
    const g = group()
    return checkMigratedDocument(
      {
        path: b.path,
        templateId: currentNativeContract(b).templateId,
        variant: currentNativeContract(b).variant,
        historyOverlay: false,
      },
      templates,
      read,
      {
        root: directory,
        readBuffer,
        readSourceBuffer: source,
        reviewGroupReader: () => g,
        ...extra,
      },
    )
  }
  const editNative = (b, fn) => {
    const v = JSON.parse(read(b.path))
    fn(v)
    write(b.path, v)
    editRow(b, (r) => {
      r.afterSha256 = sha(readBuffer(b.path))
    })
  }
  return {
    directory,
    readBuffer,
    read,
    write,
    group,
    original,
    changes,
    editRow,
    editNative,
    check,
  }
}

test('all22 real native roles retain distinct counts, source axes and example non-execution', () => {
  const read = (p) => (p === registryPath ? Buffer.from(JSON.stringify(templates)) : fixed(p))
  const results = currentNativeControlAdmissions.map((b) => {
    const snap = source(b.source)
    assert.equal(snap.gitObject, b.source.gitObject)
    assert.equal(sha(snap.buffer), b.source.sha256)
    return inspectCurrentNativeControl(b.path, read)
  })
  assert.equal(results.length, 22)
  assert.equal(results.find((r) => r.binding.role === 'phase-manifest').observed.entries, 184)
  assert.equal(results.find((r) => r.binding.role === 'registry-manifest').observed.entries, 2435)
  assert.equal(results.find((r) => r.binding.role === 'matrix').observed.relationships, 65)
  assert.equal(results.find((r) => r.binding.role === 'templates').observed.types, 17)
  assert.equal(results.find((r) => r.binding.role === 'legacy-manifest').observed.retired, 359)
  for (const r of results.filter((r) => r.binding.role === 'template-example'))
    assert.equal(r.observed.executionPerformed, false)
  const rootPath = 'docs/phase-governance/catalog.json',
    corrupt = JSON.parse(read(rootPath))
  corrupt.summary.byStatus.current--
  assert.throws(
    () =>
      inspectCurrentNativeControl(rootPath, (p) =>
        p === rootPath ? Buffer.from(JSON.stringify(corrupt)) : read(p),
      ),
    /derived summary/,
  )
})
test('three real public model pilots accept complete partial candidates without granting credit', (t) => {
  const f = fixture(t)
  for (const b of pilots) assert.deepEqual(f.check(b), [])
  assert.deepEqual(validateCurrentNativeControlChanges(f.changes, f.original.records), {
    targets: 3,
    creditGranted: 0,
  })
})
test('role borrowing, missing Git authority and wrong original OID reject through public model', (t) => {
  const f = fixture(t),
    b = pilots[0]
  assert(f.check(b, { readSourceBuffer: undefined }).length)
  assert(
    f.check(b, { readSourceBuffer: (pin) => ({ ...source(pin), gitObject: '0'.repeat(40) }) })
      .length,
  )
  const wrong = {
    path: b.path,
    templateId: 'evidence-receipt-v1',
    variant: currentControlContract.variant,
    historyOverlay: false,
  }
  assert(checkMigratedDocument(wrong, templates, f.read).length)
  f.editRow(b, (r) => {
    r.docType = 'task-card'
  })
  assert.match(f.check(b).join(';'), /review identity/)
})
test('updated byte pins cannot wash structural policy or sibling descriptor drift', (t) => {
  const f = fixture(t),
    b = pilots[0]
  f.editNative(b, (v) => {
    v.policy += ' unauthorized policy change'
  })
  assert.match(f.check(b).join(';'), /structure\/source mismatch/)
  const r = pilots[1]
  f.editNative(r, (v) => {
    v.shards[0].sha256 = '0'.repeat(64)
  })
  assert.match(f.check(r).join(';'), /descriptor mismatch/)
})
test('forged reviewed status, execution credit and body signatures reject; compiled grants stay closed', (t) => {
  const f = fixture(t),
    b = pilots[0]
  assert.throws(() => applyCurrentNativeControlGrant(f.changes[0].after, b), /lacks compiled/)
  assert.throws(
    () => validateCurrentNativeControlPublication(f.changes, f.original.records),
    /lacks compiled/,
  )
  f.editRow(b, (r) => {
    r.contentReviewStatus = 'content-reviewed'
    r.templateCompliance = 'template-compliant'
    r.currentIndependentAcceptance = { nonAuthorReviewer: true, verdict: 'accept' }
  })
  assert.match(f.check(b).join(';'), /compiled scoped acceptance/)
  const other = pilots[1]
  f.editRow(other, (r) => {
    r.evidence.runtimeExecutionPerformed = true
  })
  assert.match(f.check(other).join(';'), /execution\/child credit/)
})
test('native byte races and duplicate JSON keys fail instead of accepting a parsed substitute', (t) => {
  const f = fixture(t),
    b = pilots[0],
    raw = f.readBuffer(b.path)
  let n = 0
  const buffer = (p) =>
    p === b.path && ++n > 1 ? Buffer.concat([raw, Buffer.from('\n')]) : f.readBuffer(p)
  assert.match(f.check(b, { readBuffer: buffer }).join(';'), /changed during inspection/)
  f.write(b.path, Buffer.from('{"schemaVersion":2,"schemaVersion":2}'))
  assert.match(f.check(b).join(';'), /duplicate/)
})
test('control candidate writer rejects ledger-family targets, status edits and lost history prefixes', (t) => {
  const f = fixture(t)
  assert.throws(() => validateCurrentLedgerChanges(f.changes, f.original.records), /unadmitted/)
  for (const mutate of [
    (c) => {
      c.after.contentReviewStatus = 'content-reviewed'
    },
    (c) => {
      c.after.history[0] = { rewritten: true }
    },
    (c) => {
      c.index++
    },
  ]) {
    const changes = structuredClone(f.changes)
    mutate(changes[0])
    assert.throws(() => validateCurrentNativeControlChanges(changes, f.original.records))
  }
})

test('same-byte symlinks and active registry locks reject at the real native IO boundary', (t) => {
  const f = fixture(t),
    b = pilots[0],
    lock = 'docs/phase-governance/document-registry.json.lock'
  f.write(lock, Buffer.from('active'))
  assert.match(f.check(b).join(';'), /active document registry write lock/)
  rmSync(join(f.directory, lock))
  f.write('original-native.json', f.readBuffer(b.path))
  rmSync(join(f.directory, b.path))
  symlinkSync(join(f.directory, 'original-native.json'), join(f.directory, b.path))
  assert.match(f.check(b).join(';'), /ordinary file/)
})

test('isolated pure qualification preserves withdrawals and separates genuine signature shape from production authority', () => {
  const b = pilots[0],
    before = {
      path: b.path,
      history: [{ kind: 'prior-withdrawal', scope: 'old claim remains withdrawn' }],
      claimCorrection: { scope: 'entire prior object retained', nested: { credit: 0 } },
      contentReviewStatus: 'partial-review-unknown',
      templateCompliance: 'needs-migration',
      evidence: {
        author: 'Codex',
        source: b.source,
        structureSha256: '1'.repeat(64),
        membershipSha256: '2'.repeat(64),
      },
      coreConclusion: 'Isolated pure validator fixture; not a real accepted document.',
    }
  const a = {
      path: b.path,
      author: 'Codex',
      reviewer: 'GLM',
      nonAuthorReviewer: true,
      reportSha256: 'a'.repeat(64),
      contentSha256: currentNativeControlContentSha256(before),
      reviewedCandidate: currentNativeControlBaseline,
      task: 'isolated-pure-qualification',
      date: '2026-10-29',
    },
    row = structuredClone(before)
  delete row.claimCorrection
  row.contentReviewStatus = 'content-reviewed'
  row.templateCompliance = 'template-compliant'
  row.currentIndependentAcceptance = {
    protocol: 'document-delivery-acceptance/1.0.0',
    path: b.path,
    author: a.author,
    reviewer: a.reviewer,
    nonAuthorReviewer: true,
    verdict: 'accept',
    reportSha256: a.reportSha256,
    contentSha256: a.contentSha256,
    reviewedCandidate: a.reviewedCandidate,
    controlIdentity: {
      role: b.role,
      source: b.source,
      structureSha256: row.evidence.structureSha256,
      membershipSha256: row.evidence.membershipSha256,
      reviewRecord: b.reviewRecord,
      index: b.index,
    },
    ownerDecision: {
      actor: 'Codex',
      task: a.task,
      currentBodyReview: true,
      currentTemplateMigration: true,
      oldClaimRestored: false,
      runtimeCredit: false,
      childSemanticAcceptanceGranted: false,
    },
  }
  row.history.push({
    kind: 'current-native-control-publication',
    task: a.task,
    date: a.date,
    reviewedCandidate: a.reviewedCandidate,
    contentSha256: a.contentSha256,
    priorClaimCorrection: structuredClone(before.claimCorrection),
    oldClaimRestored: false,
    runtimeCredit: false,
    childSemanticAcceptanceGranted: false,
  })
  assert.deepEqual(currentNativeControlQualificationIssues(row, b, a), [])
  assert.equal(currentNativeControlContentSha256(row), a.contentSha256)
  assert.deepEqual(row.history.at(-1).priorClaimCorrection, before.claimCorrection)
  assert(currentNativeControlQualificationIssues(row, b).length)
  assert.throws(() => applyCurrentNativeControlGrant(before, b), /lacks compiled/)
  for (const mutate of [
    (r) => {
      r.coreConclusion += ' changed'
    },
    (r) => {
      r.history.at(-1).priorClaimCorrection.nested.credit = 1
    },
    (r) => {
      r.currentIndependentAcceptance.ownerDecision.runtimeCredit = true
    },
    (r) => {
      r.history.push(structuredClone(r.history.at(-1)))
    },
  ]) {
    const copy = structuredClone(row)
    mutate(copy)
    assert(currentNativeControlQualificationIssues(copy, b, a).length)
  }
  assert(currentNativeControlQualificationIssues(row, b, { ...a, reviewer: a.author }).length)
})

test('the original catalog structure API remains available but cannot downgrade the production control role', (t) => {
  const doc = { path: 'docs/testing/catalog.json', templateId: 'test-catalog-v1' },
    read = (p) => fixed(p).toString('utf8')
  assert.deepEqual(checkMigratedDocument(doc, templates, read), [])
  const f = fixture(t),
    binding = currentNativeControlAdmissions.find((b) => b.role === 'testing-catalog')
  const options = () => ({
    root: f.directory,
    readBuffer: f.readBuffer,
    readSourceBuffer: source,
    reviewGroupReader: f.group,
  })
  const oldRoleIssues = checkMigratedDocument(doc, templates, f.read, options())
  if (Object.hasOwn(currentNativeControlAcceptance, binding.path))
    assert.match(oldRoleIssues.join(';'), /exact admitted role/)
  else assert.deepEqual(oldRoleIssues, [])
  f.editRow(binding, (r) => {
    r.contentReviewStatus = 'content-reviewed'
  })
  assert.match(
    checkMigratedDocument(doc, templates, f.read, options()).join(';'),
    /exact admitted role/,
  )
})
