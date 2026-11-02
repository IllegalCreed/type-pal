import { createHash } from 'node:crypto'
import { lstatSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { currentNativeControlAcceptance } from './current-native-control-acceptance.mjs'
import { currentNativeControlAdmissions } from './current-native-control-admission.mjs'
import { currentNativeControlQualificationIssues } from './current-native-control-qualification.mjs'
import { frozenRegistrySource, summarizeDocumentRegistry } from './document-registry.mjs'
import {
  incrementalControlMaintenanceMatches,
  incrementalControlProjection,
  isIncrementalRegistryLayout,
} from './incremental-control-view.mjs'
import { assertReviewRecordSourceUnchanged } from './review-record-storage.mjs'
import { fileState } from './review-record-storage-io.mjs'
import { isRollforwardRegistryLayout } from './rollforward-control-view.mjs'
import { canonicalTerminalJson, parseTerminalJson } from './terminal-json.mjs'

const hash = (b) => createHash('sha256').update(b).digest('hex')
const digest = (v) => hash(canonicalTerminalJson(v))
const demand = (v, reason) => {
  if (!v) throw new Error(reason)
}
const text = (v) => typeof v === 'string' && v.trim().length > 0
const texts = (v) => Array.isArray(v) && v.length > 0 && v.every(text)
const phases = ['lore', 'phase1', 'phase2', 'phase3']
const registryPhases = ['ops', ...phases, 'phase-governance', 'testing']
const counts = (rows, field) =>
  Object.fromEntries(
    [...new Set(rows.map((e) => e[field]))].map((key) => [
      key,
      rows.filter((e) => e[field] === key).length,
    ]),
  )
const base = 'docs/phase-governance/'
const header = (v, ...omit) =>
  Object.fromEntries(Object.entries(v).filter(([k]) => !omit.includes(k)))
const unique = (rows, key, label) => {
  demand(Array.isArray(rows), `${label} array missing`)
  const ids = rows.map((e) => e?.[key])
  demand(ids.every(text) && new Set(ids).size === ids.length, `${label} duplicate/missing ${key}`)
  return ids
}

export const currentControlContract = Object.freeze({
  templateId: 'governance-index-v1',
  variant: 'current-governance-control-native-v1',
  templateVersion: '1.0.0',
  format: 'json-native',
  metadataLocation: 'existing-current-review',
  lifecycle: 'current',
  purpose:
    'Live authority, membership and physical ownership; child semantic credit stays separate.',
})
export const currentExampleContract = Object.freeze({
  templateId: 'reference-canon-v1',
  variant: 'current-template-example-native-v1',
  templateVersion: '1.0.0',
  format: 'json-native',
  metadataLocation: 'existing-current-review',
  lifecycle: 'current',
  purpose: 'Editable JSON template example; placeholders and example statuses are not executions.',
})
export const currentNativeContract = (binding) =>
  binding.role === 'template-example' ? currentExampleContract : currentControlContract

/** The read set is returned to the caller for exit revalidation, never used as write authority. */
export function inspectCurrentNativeControl(
  path,
  readBuffer,
  { currentRouting, retiredDocuments } = {},
) {
  const binding = currentNativeControlAdmissions.find((b) => b.path === path)
  demand(binding, 'unadmitted native control/reference path')
  const captured = new Map()
  const parsed = new Map()
  const bytes = (p) => {
    if (!captured.has(p)) {
      const b = readBuffer(p)
      demand(Buffer.isBuffer(b), `ordinary native input unavailable: ${p}`)
      captured.set(p, Buffer.from(b))
    }
    return captured.get(p)
  }
  const json = (p) => {
    if (parsed.has(p)) return parsed.get(p)
    const b = bytes(p)
    demand(b.length < 1_048_576, `native control reaches formatter cap: ${p}`)
    const value = parseTerminalJson(b)
    demand(
      value && typeof value === 'object' && !Array.isArray(value),
      `control object missing: ${p}`,
    )
    parsed.set(p, value)
    return value
  }
  const v = json(path)
  let projection,
    members = [],
    observed = {}
  if (binding.role.startsWith('phase-')) {
    const root = json(`${base}catalog.json`),
      entries = []
    demand(
      root.schemaVersion === 2 && root.shards?.length === phases.length,
      'phase manifest shape',
    )
    demand(
      same(
        root.shards.map((d) => d.phase),
        phases,
      ),
      'phase manifest exact partition order',
    )
    for (const d of root.shards) {
      demand(d.path === `catalog.${d.phase}.json`, 'unsafe/foreign phase shard')
      const p = base + d.path,
        s = json(p)
      demand(hash(bytes(p)) === d.sha256, `phase shard descriptor mismatch: ${p}`)
      unique(s.entries, 'path', 'phase members')
      demand(
        s.schemaVersion === 1 && s.phase === d.phase && s.entries.length === d.total,
        'phase shard identity/count',
      )
      demand(
        s.entries.every(
          (e) =>
            e.phase === d.phase && e.path.startsWith(`docs/${d.phase}/`) && e.path.endsWith('.md'),
        ),
        'phase membership scope',
      )
      demand(
        same(s.summary, { total: s.entries.length, byStatus: counts(s.entries, 'status') }),
        'phase shard summary count/status projection',
      )
      entries.push(...s.entries)
    }
    unique(entries, 'path', 'all phase members')
    unique(entries, 'id', 'phase identities')
    demand(root.summary?.total === entries.length, 'phase manifest summary count')
    for (const p of phases)
      demand(
        root.summary.byPhase[p] === entries.filter((e) => e.phase === p).length,
        'phase summary partition',
      )
    demand(
      same(root.summary, {
        total: entries.length,
        byPhase: counts(entries, 'phase'),
        byStatus: counts(entries, 'status'),
      }),
      'phase manifest derived summary',
    )
    const selected = binding.role === 'phase-manifest' ? entries : v.entries
    members = selected.map((e) => e.path)
    projection = {
      header: header(v, 'summary', 'entries', 'shards'),
      shards: v.shards?.map(({ phase, path, total }) => ({ phase, path, total })) ?? null,
      membership: selected.map(({ id, path, phase }) => ({ id, path, phase })),
    }
    observed = {
      entries: selected.length,
      collectionEntries: entries.length,
      byStatus: Object.fromEntries(
        [...new Set(selected.map((e) => e.status))].map((s) => [
          s,
          selected.filter((e) => e.status === s).length,
        ]),
      ),
    }
  } else if (binding.role.startsWith('registry-')) {
    const root = json(`${base}document-registry.json`),
      all = [],
      positions = []
    demand(
      root.schemaVersion === 2 &&
        (same(
          root.shards?.map((d) => d.phase),
          registryPhases,
        ) ||
          isIncrementalRegistryLayout(root.shards) ||
          isRollforwardRegistryLayout(root.shards, isIncrementalRegistryLayout)),
      'registry exact partition order',
    )
    for (const k of ['revision', 'path', 'sha256', 'total'])
      demand(
        root.storageMigration?.[k] === frozenRegistrySource[k],
        'registry frozen original source changed',
      )
    for (const d of root.shards) {
      demand(
        d.path === `document-registry.${d.phase}.json` ||
          ((isIncrementalRegistryLayout(root.shards) ||
            isRollforwardRegistryLayout(root.shards, isIncrementalRegistryLayout)) &&
            root.shards.slice(7).some((part) => part === d)),
        'unsafe/foreign registry shard',
      )
      const p = base + d.path,
        s = json(p)
      demand(hash(bytes(p)) === d.sha256, `registry descriptor mismatch: ${p}`)
      unique(s.entries, 'path', 'registry members')
      demand(
        s.schemaVersion === 1 &&
          s.phase === d.phase &&
          s.entries.length === d.total &&
          s.positions?.length === d.total,
        'registry shard shape/count',
      )
      demand(
        s.entries.every((e) => e.phase === d.phase),
        'registry phase mismatch',
      )
      all.push(...s.entries)
      positions.push(...s.positions)
    }
    unique(all, 'path', 'registry complete members')
    demand(
      positions.every((n) => Number.isInteger(n) && n >= 0 && n < all.length) &&
        new Set(positions).size === all.length,
      'registry global positions',
    )
    demand(same(root.summary, summarizeDocumentRegistry(all)), 'registry derived summary')
    const selected = binding.role === 'registry-manifest' ? all : v.entries
    members = selected.map((e) => e.path)
    projection = {
      header: header(v, 'summary', 'entries', 'shards'),
      shards: v.shards?.map(({ path, phase, total }) => ({ path, phase, total })) ?? null,
      membership: selected.map(({ path, phase, reviewRecord }) => ({ path, phase, reviewRecord })),
    }
    observed = {
      entries: selected.length,
      collectionEntries: all.length,
      reviewStatuses: Object.fromEntries(
        [...new Set(selected.map((e) => e.reviewStatus))].map((s) => [
          s,
          selected.filter((e) => e.reviewStatus === s).length,
        ]),
      ),
    }
  } else if (binding.role === 'routing') {
    unique(v.routes, 'operation', 'operation routes')
    unique(v.migratedDocuments, 'path', 'migrated routes')
    demand(
      v.entry === 'AGENTS.md' &&
        v.entrySection === '操作与必读' &&
        Array.isArray(v.forwardingEntries),
      'routing authority',
    )
    for (const r of currentRouting?.routes ?? v.routes)
      demand(
        texts(r.required) && r.required.every((p) => Buffer.isBuffer(readBuffer(p))),
        'operation target missing',
      )
    const types = json(`${base}templates/registry.json`).types
    for (const r of v.migratedDocuments)
      demand(
        types.some((t) => t.templateId === r.templateId) && Buffer.isBuffer(readBuffer(r.path)),
        'migrated route target/template missing',
      )
    projection = v
    members = v.migratedDocuments.map((r) => r.path)
    observed = { routes: v.routes.length, migratedDocuments: members.length }
  } else if (binding.role === 'templates') {
    unique(v.types, 'templateId', 'template identities')
    demand(
      v.types.length === 17 &&
        v.types.every((t) => text(t.docType) && text(t.templateVersion) && text(t.historyRule)),
      '17 template contracts required',
    )
    for (const c of [currentControlContract, currentExampleContract])
      demand(
        same(v.types.find((t) => t.templateId === c.templateId)?.variants?.[c.variant], c),
        'current native variant definition mismatch',
      )
    projection = v
    members = v.types.map((t) => t.templateId)
    observed = { types: members.length, historicalSourcePins: v.historicalSourcePins?.length }
  } else if (binding.role === 'matrix') {
    unique(v.rows, 'id', 'relationship identities')
    const directoryWitnesses = {
      'docs/lore': 'docs/lore/README.md',
      'docs/ops': 'docs/ops/board.md',
      'docs/phase-governance': `${base}catalog.json`,
      'docs/phase1': 'docs/phase1/01-feasibility.md',
      'docs/phase2': 'docs/phase2/READ-FIRST.md',
      'docs/phase3': 'docs/phase3/README.md',
      'docs/testing': 'docs/testing/catalog.json',
      packages: 'packages/content/src/character.ts',
      'scripts/e2e': 'scripts/e2e/opening-matrix.mjs',
    }
    for (const r of v.rows) {
      demand(
        text(r.relationship) &&
          ['resolved', 'guarded', 'blocked'].includes(r.status) &&
          text(r.stopLine),
        'matrix relationship boundary invalid',
      )
      if (r.from === undefined && r.to === undefined) {
        demand(
          [
            'S16-history-MD-evidence-rework-boundary',
            'S16-fixed347-individual-114-body-only-decisions',
          ].includes(r.id) &&
            r.status === 'guarded' &&
            text(r.scope) &&
            texts(r.evidence),
          'only the two explicit historical scope annotations omit endpoint arrays',
        )
      } else {
        demand(texts(r.from) && texts(r.to), 'matrix endpoints missing')
        for (const p of [...r.from, ...r.to]) {
          // A retired entry is an historical relationship endpoint. Its admitted
          // replacement must exist now; the location contract verifies recovery
          // of the old Git object separately instead of inventing a live file.
          bytes(
            retiredDocuments?.get(p)?.replacement ?? directoryWitnesses[p.replace(/\/$/, '')] ?? p,
          )
        }
      }
    }
    demand(
      v.acceptance?.runtimeClaimsDeferred === true &&
        v.acceptance?.guardedRowsAreNotCurrentTruth === true,
      'matrix cannot promote guarded/runtime claims',
    )
    projection = v
    members = v.rows.map((r) => r.id)
    observed = { relationships: members.length }
  } else if (binding.role === 'testing-catalog') {
    unique(v.entries, 'id', 'testing publication identities')
    demand(
      v.schemaVersion === 2 && v.generatedBy === 'scripts/docs/generate-testing-index.mjs',
      'testing catalog authority',
    )
    for (const e of v.entries)
      for (const k of ['canonical', 'index', 'evidence'])
        demand(
          text(e[k]) &&
            !e[k].startsWith('/') &&
            !e[k].split('/').includes('..') &&
            Buffer.isBuffer(readBuffer(`docs/testing/${e[k]}`)),
          'testing publication target missing',
        )
    projection = {
      header: header(v, 'entries'),
      membership: v.entries.map(({ id, kind, canonical, index, evidence }) => ({
        id,
        kind,
        canonical,
        index,
        evidence,
      })),
    }
    members = v.entries.map((e) => e.id)
    observed = { entries: members.length }
  } else if (binding.role.startsWith('legacy-')) {
    const manifest = json('docs/testing/legacy-flat.json'),
      classifier = json('docs/testing/legacy-flat-classification.json')
    const rows = [...manifest.entries, ...manifest.retired]
    unique(rows, 'path', 'legacy census')
    unique(classifier.entries, 'path', 'legacy classifications')
    demand(
      manifest.frozenCensus?.count === rows.length &&
        classifier.summary?.total === rows.length &&
        classifier.entries.length === rows.length &&
        classifier.summary.active === manifest.entries.length &&
        classifier.summary.retired === manifest.retired.length,
      'legacy census/classification counts',
    )
    for (const e of classifier.entries)
      demand(
        rows.some((r) => r.path === e.path && r.sourceSha256 === e.sourceSha),
        'legacy classification source identity',
      )
    projection = v
    members = (binding.role === 'legacy-manifest' ? rows : v.entries).map((e) => e.path)
    observed = {
      entries: manifest.entries.length,
      retired: manifest.retired.length,
      census: rows.length,
    }
  } else {
    demand(binding.role === 'template-example', 'unknown current native role')
    if (path.endsWith('/evidence.json'))
      demand(
        v.id === 'e2e-NNN' &&
          v.status === 'draft' &&
          v.candidateSha === null &&
          v.exitCode === null &&
          v.sourceHashesStable === false,
        'execution example must retain placeholder/non-run identity',
      )
    else if (path.endsWith('/test-catalog.json'))
      demand(
        v.entries?.length === 0 &&
          v._governance?.status === 'draft' &&
          v._governance.runtimeExecutionPerformed === false,
        'catalog example cannot publish entries or executions',
      )
    else
      demand(
        v.id === 'test-NNN' && v.execution?.exitCode === null && v.cleanup?.complete === false,
        'machine example must remain unexecuted',
      )
    projection = v
    observed = {
      exampleId: v.id ?? null,
      exampleStatus: v.status ?? v._governance.status,
      executionPerformed: false,
    }
  }
  return {
    binding,
    structureSha256: digest({ role: binding.role, projection }),
    membershipSha256: digest(members),
    observed,
    members,
    captured,
  }
}

/** Snapshot bytes, source, ownership and candidate completeness; no status promotion is implied. */
export function currentNativeControlIssues(doc, template, contract, read, options = {}) {
  const b = currentNativeControlAdmissions.find((r) => r.path === doc.path)
  // Retain the existing underlying catalog-schema API. Its transitional
  // production use is legal only while the exact old row is still pending.
  // Active native metadata or a compiled grant forbids a joint relabel downgrade.
  if (b?.role === 'testing-catalog' && doc.templateId === 'test-catalog-v1' && !doc.variant) {
    if (typeof options.reviewGroupReader !== 'function') return undefined
    try {
      const group = options.reviewGroupReader()
      assertReviewRecordSourceUnchanged(group.loadedSource)
      const owners = [...group.records].flatMap(([owner, r]) =>
        r.entries.flatMap((row, index) => (row.path === b.path ? [{ owner, index, row }] : [])),
      )
      const row = owners[0]?.row
      if (
        group.records.size === 114 &&
        owners.length === 1 &&
        owners[0].owner === b.reviewRecord &&
        owners[0].index === b.index &&
        row.templateId === 'test-catalog-v1' &&
        !row.templateVariant &&
        row.contentReviewStatus === 'partial-review-unknown' &&
        row.templateCompliance === 'needs-migration' &&
        row.currentIndependentAcceptance === undefined &&
        currentNativeControlAcceptance[b.path] === undefined
      )
        return undefined
    } catch (error) {
      return [`current native catalog transition: ${error.message}`]
    }
  }
  if (!b && ![currentControlContract.variant, currentExampleContract.variant].includes(doc.variant))
    return undefined
  const expected = b && currentNativeContract(b)
  if (
    !b ||
    doc.templateId !== expected.templateId ||
    template?.templateId !== expected.templateId ||
    template.docType !== (b.role === 'template-example' ? 'reference-canon' : 'governance-index') ||
    doc.variant !== expected.variant ||
    doc.historyOverlay ||
    !same(contract, expected)
  )
    return ['current native control/reference requires its exact admitted role and contract']
  if (
    typeof options.reviewGroupReader !== 'function' ||
    typeof options.readBuffer !== 'function' ||
    typeof options.readSourceBuffer !== 'function' ||
    typeof options.root !== 'string'
  )
    return ['current native control requires protected full-group and actual Git byte providers']
  try {
    const group = options.reviewGroupReader()
    assertReviewRecordSourceUnchanged(group.loadedSource)
    demand(group.records.size === 114, 'complete current review group required')
    try {
      lstatSync(join(options.root, `${base}document-registry.json.lock`))
      throw new Error('active document registry write lock')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const parents = new Map(),
      states = new Map()
    const nativeRead = (path) => {
      if (!states.has(path)) {
        const state = fileState(
          options.root,
          options.locations?.currentPath(path) ?? path,
          parents,
          '',
        )
        demand(Buffer.isBuffer(state.buffer), `native input unavailable: ${path}`)
        states.set(path, state)
      }
      return options.readBuffer(path)
    }
    const inspectControl = (path, reader) =>
      inspectCurrentNativeControl(path, reader, {
        currentRouting: options.locations?.manifest.routing,
        retiredDocuments: options.locations?.retired,
      })
    const view = inspectControl(doc.path, nativeRead),
      raw = view.captured.get(doc.path)
    demand(read(doc.path) === raw.toString('utf8'), 'text/byte native view mismatch')
    const pin = options.readSourceBuffer(b.source)
    demand(
      pin?.mode === '100644' &&
        pin.path === b.source.path &&
        pin.revision === b.source.revision &&
        pin.gitObject === b.source.gitObject &&
        Buffer.isBuffer(pin.buffer) &&
        hash(pin.buffer) === b.source.sha256,
      'actual original Git identity mismatch',
    )
    const owners = [...group.records].flatMap(([owner, r]) =>
      r.entries.flatMap((e, index) => (e.path === b.path ? [{ owner, index, e }] : [])),
    )
    demand(
      owners.length === 1 && owners[0].owner === b.reviewRecord && owners[0].index === b.index,
      'unique current review owner/position required',
    )
    const row = owners[0].e
    demand(
      row.afterSha256 === hash(raw) &&
        row.docType === template.docType &&
        row.templateId === expected.templateId &&
        row.templateVariant === expected.variant &&
        row.templateVersion === '1.0.0' &&
        row.documentStatus === 'current' &&
        row.historyOverlay === false &&
        row.artifactOnly === false &&
        row.artifactEnvelope !== true,
      'current native review identity/observed bytes mismatch',
    )
    demand(
      currentNativeControlQualificationIssues(row, b).length === 0,
      'current native control status requires its compiled scoped acceptance',
    )
    demand(
      text(row.coreConclusion) &&
        text(row.owner) &&
        texts(row.truthAnchors) &&
        text(row.readDomain?.actual) &&
        texts(row.readDomain?.notRead) &&
        texts(row.legalInputs) &&
        texts(row.publicCallers) &&
        texts(row.fieldRoles?.logical) &&
        texts(row.fieldRoles?.physical) &&
        same(row.fieldRoles?.governance, [`${b.reviewRecord}#entries/${b.index}`]) &&
        row.businessOracle?.type === 'current-native-control-integrity' &&
        texts(row.businessOracle.assertions) &&
        text(row.historyBoundary) &&
        text(row.stopLine) &&
        text(row.nextStep),
      'concrete role/input/oracle/read-domain/history sections incomplete',
    )
    const e = row.evidence
    const unchangedProjection =
      e?.structureSha256 === view.structureSha256 && e?.membershipSha256 === view.membershipSha256
    const requiresIncremental =
      b.role.startsWith('registry-') &&
      parseTerminalJson(nativeRead(`${base}document-registry.json`)).shards.length !== 7
    const administrative =
      (!unchangedProjection || requiresIncremental) &&
      incrementalControlProjection(doc.path, options, inspectControl)
    const projectionMatches =
      (unchangedProjection && !requiresIncremental) ||
      incrementalControlMaintenanceMatches(row, view, administrative)
    demand(
      e?.kind === 'current-native-control-candidate' &&
        e.path === b.path &&
        e.role === b.role &&
        ['Codex', 'GLM'].includes(e.author) &&
        same(e.source, b.source) &&
        projectionMatches &&
        e.runtimeExecutionPerformed === false &&
        e.historicClaimsReexecuted === false &&
        e.childSemanticAcceptanceGranted === false,
      'native role/structure/source mismatch or borrowed execution/child credit',
    )
    if (b.role === 'templates') {
      const now = structuredClone(parseTerminalJson(raw)),
        old = parseTerminalJson(pin.buffer)
      for (const c of [currentControlContract, currentExampleContract])
        delete now.types.find((t) => t.templateId === c.templateId).variants[c.variant]
      for (const t of now.types)
        if (t.variants && Object.keys(t.variants).length === 0) delete t.variants
      demand(same(now, old), 'existing template parents/variants/source pins changed')
    }
    if (b.role === 'legacy-manifest')
      demand(
        same(parseTerminalJson(raw).frozenCensus, parseTerminalJson(pin.buffer).frozenCensus),
        'original legacy census changed',
      )
    for (const [p, bytes] of view.captured)
      demand(options.readBuffer(p)?.equals(bytes), `native input changed during inspection: ${p}`)
    for (const [p, before] of states) {
      const after = fileState(options.root, options.locations?.currentPath(p) ?? p, parents, '')
      demand(
        same(before.identity, after.identity) && before.buffer.equals(after.buffer),
        `native physical input changed: ${p}`,
      )
    }
    assertReviewRecordSourceUnchanged(group.loadedSource)
    return []
  } catch (error) {
    return [`current native control: ${error.message}`]
  }
}
