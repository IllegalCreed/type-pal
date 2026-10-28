import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import {
  nativeArtifactReviewIssues,
  nativeArtifactHash as sha,
} from './historical-native-artifact.mjs'
import {
  nativeArtifactAdmission,
  nativeArtifactContracts,
} from './historical-native-artifact-admission.mjs'
import { nativeArtifactCarrierRevision } from './historical-native-artifact-bindings.mjs'
import {
  prepareCurrentReviewTransaction,
  publishCurrentReviewTransaction,
} from './review-current-generation-transaction.mjs'
import { hasLossyJsonValue, loadReviewRecords } from './review-record-storage.mjs'
import { biomeFormat, packReviewStorageRecord } from './review-record-storage-packing.mjs'
import { canonicalTerminalJson, parseTerminalJson } from './terminal-json.mjs'

const demand = (v, reason) => {
  if (!v) throw new Error(`native-artifact-candidate: ${reason}`)
}
export const nativeArtifactEntryHash = (value) => sha(canonicalTerminalJson(value))
const mutable = new Set([
  'docType',
  'templateId',
  'templateVariant',
  'templateVersion',
  'historyOverlay',
  'artifactOnly',
  'coreConclusion',
  'owner',
  'readMethod',
  'reviewDepth',
  'reviewedLines',
  'truthAnchors',
  'primarySource',
  'legalInputs',
  'businessOracle',
  'evidence',
  'readDomain',
  'fieldRoles',
  'historyBoundary',
  'publicCallers',
  'versionScope',
  'dedupe',
  'unresolved',
  'stopLine',
  'nextStep',
  'history',
  'revision',
  'provenance',
  'documentStatus',
  'artifactEnvelope',
])
const handles = new WeakMap()

/** Identity, withdrawals and old acceptance remain immutable. No status field is writable. */
export function validateNativeArtifactChanges(changes, records, readBuffer) {
  demand(
    Array.isArray(changes) && changes.length > 0 && changes.length <= 473,
    'bounded nonempty subset of473 required',
  )
  demand(new Set(changes.map((c) => c.path)).size === changes.length, 'duplicate target path')
  let retained = 0
  for (const c of changes) {
    const b = nativeArtifactAdmission(c.path)
    demand(
      b && c.reviewRecord === b.reviewRecord && c.index === b.reviewIndex,
      `out-of-scope path/position: ${c.path}`,
    )
    const before = records.get(b.reviewRecord)?.entries[b.reviewIndex]
    demand(
      before?.path === c.path && nativeArtifactEntryHash(before) === c.beforeEntrySha256,
      `before row changed: ${c.path}`,
    )
    demand(sha(readBuffer(c.path)) === b.carrierSha256, `native bytes changed: ${c.path}`)
    const after = c.after
    demand(after && !hasLossyJsonValue(after), 'lossless complete after row required')
    if (b.existingVariant) {
      demand(
        same(after, before),
        'existing pilot contract/content/source boundaries must be reused unchanged',
      )
      retained++
      continue
    }
    demand(!same(after, before), `no actual content delta: ${c.path}`)
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)]))
      if (!mutable.has(key))
        demand(same(before[key], after[key]), `immutable field ${key}: ${c.path}`)
    for (const key of ['history', 'provenance']) {
      const old = before[key] ?? []
      demand(
        Array.isArray(after[key]) && same(after[key].slice(0, old.length), old),
        `${key} prefix changed: ${c.path}`,
      )
    }
    const prior = after.history?.slice(before.history?.length ?? 0)
    demand(
      prior?.some(
        (h) => h.kind === 'native-artifact-candidate' && h.priorEntrySha256 === c.beforeEntrySha256,
      ),
      'explicit prior-review locator required',
    )
    const oldRevision = before.revision
    demand(
      same(
        Object.fromEntries(
          Object.entries(after.revision ?? {}).filter(([k]) => !['history'].includes(k)),
        ),
        Object.fromEntries(Object.entries(oldRevision).filter(([k]) => !['history'].includes(k))),
      ),
      'revision identity changed',
    )
    demand(
      Array.isArray(after.revision.history) &&
        same(after.revision.history.slice(0, oldRevision.history.length), oldRevision.history),
      'revision history prefix changed',
    )
    const issues = nativeArtifactReviewIssues(after, b, parseTerminalJson(readBuffer(c.path)))
    demand(issues.length === 0, `${c.path}: ${issues.join('; ')}`)
  }
  return { targets: changes.length, existingContractReused: retained, creditGranted: 0 }
}

function controls(root, changes, readBuffer) {
  const output = [],
    registryPath = 'docs/phase-governance/document-registry.json'
  const manifest = parseTerminalJson(readBuffer(registryPath)),
    all = []
  const byPath = new Map(changes.map((c) => [c.path, c.after]))
  for (const descriptor of manifest.shards) {
    const path = `docs/phase-governance/${descriptor.path}`,
      before = readBuffer(path),
      shard = parseTerminalJson(before)
    demand(sha(before) === descriptor.sha256, 'registry source descriptor mismatch')
    for (const row of shard.entries) {
      const after = byPath.get(row.path)
      if (after && !nativeArtifactAdmission(row.path).existingVariant)
        for (const key of [
          'docType',
          'templateId',
          'templateVariant',
          'templateVersion',
          'historyOverlay',
          'artifactOnly',
          'reviewDepth',
        ])
          row[key] = after[key]
      if (
        after &&
        !nativeArtifactAdmission(row.path).existingVariant &&
        Object.hasOwn(row, 'artifactEnvelope')
      )
        row.artifactEnvelope = false
      all.push(row)
    }
    const bytes = biomeFormat(shard, path, { repoRoot: root })
    demand(same(parseTerminalJson(bytes), shard), 'registry shard formatter value change')
    if (!bytes.equals(before)) output.push({ path, kind: 'control', bytes })
    descriptor.sha256 = sha(bytes)
  }
  manifest.summary.byType = Object.fromEntries(
    [...new Set(all.map((r) => r.docType))].map((type) => [
      type,
      all.filter((r) => r.docType === type).length,
    ]),
  )
  const manifestBytes = biomeFormat(manifest, registryPath, { repoRoot: root })
  demand(
    same(parseTerminalJson(manifestBytes), manifest),
    'registry manifest formatter value change',
  )
  if (!manifestBytes.equals(readBuffer(registryPath)))
    output.push({ path: registryPath, kind: 'control', bytes: manifestBytes })
  const path = 'docs/phase-governance/routing.json',
    routing = parseTerminalJson(readBuffer(path))
  for (const c of changes) {
    const old = routing.migratedDocuments.filter((r) => r.path === c.path)
    demand(old.length <= 1, 'duplicate existing route')
    const binding = nativeArtifactAdmission(c.path)
    if (binding.existingVariant) {
      demand(
        old.length === 1 && old[0].variant === binding.existingVariant,
        'specific original pilot route required',
      )
      continue
    }
    const route = {
      path: c.path,
      templateId: c.after.templateId,
      variant: c.after.templateVariant,
      historyOverlay: false,
    }
    if (old.length) {
      if (!same(old[0], route)) Object.assign(old[0], route)
    } else routing.migratedDocuments.push(route)
  }
  const bytes = biomeFormat(routing, path, { repoRoot: root })
  demand(same(parseTerminalJson(bytes), routing), 'routing formatter value change')
  if (!bytes.equals(readBuffer(path))) output.push({ path, kind: 'control', bytes })
  return output
}

/** One in-memory proposal, complete dependency closure, then the established locked group transaction. */
export function prepareNativeArtifactCandidate({ root, plan, planSha256 }) {
  demand(
    plan?.kind === 'native-artifact-candidate/1.0.0' &&
      plan.creditGranted === 0 &&
      /^\d{4}-\d{2}-\d{2}$/u.test(plan.date ?? '') &&
      nativeArtifactEntryHash(plan) === planSha256,
    'exact zero-credit plan fingerprint required',
  )
  root = resolve(root)
  const readBuffer = (p) => readFileSync(join(root, p)),
    group = loadReviewRecords({ root })
  const validated = validateNativeArtifactChanges(plan.changes, group.records, readBuffer)
  const records = new Map([...group.records].map(([p, r]) => [p, structuredClone(r)])),
    dirty = new Set()
  for (const c of plan.changes) {
    records.get(c.reviewRecord).entries[c.index] = structuredClone(c.after)
    if (!same(c.after, group.records.get(c.reviewRecord).entries[c.index]))
      dirty.add(c.reviewRecord)
  }
  const outputs = controls(root, plan.changes, readBuffer),
    retired = []
  let last = -1
  while (last !== dirty.size) {
    last = dirty.size
    for (const [owner, r] of records)
      if (r.entries.some((e) => dirty.has(e.path) || outputs.some((o) => o.path === e.path)))
        dirty.add(owner)
  }
  const built = new Set(),
    building = new Set()
  function build(owner) {
    if (built.has(owner)) return
    demand(!building.has(owner), 'dependency cycle')
    building.add(owner)
    const record = records.get(owner)
    for (const [index, row] of record.entries.entries()) {
      if (dirty.has(row.path)) build(row.path)
      const out = outputs.find((o) => o.path === row.path)
      if (!out) continue
      const previous = group.records.get(owner).entries[index]
      demand(
        previous.afterSha256 === sha(readBuffer(row.path)),
        'original administrative before-pin mismatch',
      )
      const afterSha256 = sha(out.bytes)
      if (afterSha256 !== previous.afterSha256) {
        row.afterSha256 = afterSha256
        row.maintenanceDeltas ??= []
        row.maintenanceDeltas.push({
          date: plan.date,
          task: 'DOCS-FULL-TEMPLATE-1/native-artifact-candidate',
          beforeSha256: previous.afterSha256,
          afterSha256,
          newSemanticCredit: 0,
          newTemplateMigrationCredit: 0,
          runtimeCredit: false,
        })
      }
    }
    const storage = group.storages.get(owner)
    if (storage) {
      outputs.push(
        ...packReviewStorageRecord({
          logicalPath: owner,
          record,
          sourcePin: storage.source,
          context: { repoRoot: root },
        }).outputs,
      )
      retired.push(...storage.shards.map((s) => `docs/phase-governance/reviews/${s.path}`))
    } else {
      const bytes = biomeFormat(record, owner, { repoRoot: root })
      demand(same(parseTerminalJson(bytes), record), 'review formatter value change')
      outputs.push({ path: owner, kind: 'review', bytes })
    }
    building.delete(owner)
    built.add(owner)
  }
  for (const owner of [...dirty].sort()) build(owner)
  const templateRegistry = parseTerminalJson(
    readBuffer('docs/phase-governance/templates/registry.json'),
  )
  const cache = new Map(),
    source = (pin) => {
      const k = `${pin.revision}:${pin.path}`
      if (!cache.has(k)) cache.set(k, readGitDocumentSnapshot(root, pin))
      return cache.get(k)
    }
  for (const c of plan.changes) {
    const b = nativeArtifactAdmission(c.path)
    const fixed = source({ path: c.path, revision: nativeArtifactCarrierRevision })
    demand(
      fixed?.mode === '100644' &&
        fixed.gitObject === b.carrierGitObject &&
        sha(fixed.buffer) === b.carrierSha256,
      'fixed carrier Git mismatch',
    )
    const issues = checkMigratedDocument(
      {
        path: c.path,
        templateId: c.after.templateId,
        variant: c.after.templateVariant,
        historyOverlay: false,
      },
      templateRegistry,
      (p) => readBuffer(p).toString('utf8'),
      {
        readBuffer,
        readSourceBuffer: source,
        readSource: (pin) => {
          const value = source(pin)
          return value ? { ...value, text: value.buffer.toString('utf8') } : undefined
        },
        reviewReader: (p) => records.get(p),
      },
    )
    demand(issues.length === 0, `${c.path}: ${issues.join('; ')}`)
  }
  const transaction = prepareCurrentReviewTransaction({
    root,
    baseRevision: plan.baseRevision,
    group,
    records,
    outputs,
    retired,
    sourceProfile: 'native-artifact-v1',
  })
  const handle = {
    kind: plan.kind,
    baseRevision: plan.baseRevision,
    planSha256,
    ...validated,
    transaction: structuredClone(transaction),
  }
  handles.set(handle, { transaction, public: structuredClone(handle) })
  return handle
}

export function writeNativeArtifactCandidate(handle) {
  const state = handles.get(handle)
  demand(state && same(state.public, handle), 'unmodified in-process prepare capability required')
  const result = publishCurrentReviewTransaction(state.transaction, { allowWrite: true })
  handles.delete(handle)
  return { ...result, targets: handle.targets, newSemanticCredit: 0, newTemplateMigrationCredit: 0 }
}

/** Reuse specific source explanations; this is an author draft, never an acceptance. */
export function composeNativeArtifactRow(before, binding, seed, { baseRevision, actor = 'GLM' }) {
  if (binding.existingVariant) return structuredClone(before)
  const row = structuredClone(before),
    semantic = seed.semantic
  const parent = nativeArtifactContracts[binding.originalTemplateId]
  const pin = {
    path: binding.path,
    revision: nativeArtifactCarrierRevision,
    gitObject: binding.carrierGitObject,
    sha256: binding.carrierSha256,
  }
  const priorEntrySha256 = nativeArtifactEntryHash(before)
  Object.assign(row, {
    docType: parent.templateId.replace(/-v1$/u, ''),
    templateId: parent.templateId,
    templateVariant: parent.variant,
    templateVersion: '1.0.0',
    historyOverlay: false,
    artifactOnly: false,
    documentStatus: 'historical',
    ...(Object.hasOwn(before, 'artifactEnvelope') ? { artifactEnvelope: false } : {}),
    coreConclusion: semantic.coreConclusion,
    owner: `${actor}; fixed prior source-specific explanations reused`,
    truthAnchors: seed.nativeWitnesses.map((c) => `${binding.path}: ${c.claim}`),
    primarySource: [pin],
    legalInputs: [{ kind: 'fixed-native-carrier', ...pin }],
    businessOracle: {
      type: 'historical-native-document',
      currentExecution: false,
      assertions: semantic.businessOracle.assertions,
    },
    readDomain: {
      actual:
        'Fixed JSON parse and cited pointer checks; reuse prior source-specific explanations with disclosed reading limits. No new full-text or execution claim.',
      reusedFrom: [JSON.stringify(seed.contentSource)],
      priorReadDomainSha256: nativeArtifactEntryHash(seed.readDomain),
      notRead: [
        'Historical commands, downstream runtime and old test suites were not reexecuted; long arrays retain the prior declared reading limits.',
      ],
    },
    fieldRoles: {
      nativePointers: [...new Set(binding.requiredWitnesses.map((w) => w.pointer))],
      governance: [`${binding.reviewRecord}#entries/${binding.reviewIndex}`],
    },
    evidence: {
      kind: 'historical-native-artifact',
      path: binding.path,
      family: binding.family,
      nativeShape: binding.rootShape,
      witnesses: seed.nativeWitnesses.flatMap((c) =>
        c.witnesses.map((w) => ({ claim: c.claim, pointer: w.pointer, value: w.value })),
      ),
      runtimeExecutionPerformed: false,
      historicClaimsReexecuted: false,
      creditGranted: 0,
    },
    historyBoundary:
      'Original dates, claims, withdrawal and provenance limitations remain historical. Current carrier Git identity does not authenticate original execution; no withdrawn credit is restored.',
    readMethod:
      'Specific prior explanation reused plus fixed JSON pointer checks; candidate authoring, not independent acceptance',
    reviewDepth: 'partial-semantic',
    reviewedLines: 0,
  })
  for (const key of ['publicCallers', 'versionScope', 'dedupe', 'stopLine', 'nextStep'])
    if (semantic[key] !== undefined) row[key] = structuredClone(semantic[key])
  row.history ??= []
  row.history.push({
    kind: 'native-artifact-candidate',
    revision: baseRevision,
    priorReviewRecord: binding.reviewRecord,
    priorReviewIndex: binding.reviewIndex,
    priorEntrySha256,
    newSemanticCredit: 0,
    newTemplateMigrationCredit: 0,
  })
  return row
}
