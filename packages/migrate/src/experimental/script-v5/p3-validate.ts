import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import { classifyP3ReferenceShape, inheritedContextDisposition } from './p3-control-flow.js'
import {
  canonicalLegacyAuthorCell,
  commandAtPointer,
  legacyAuthorCellSha256,
  readV4ScriptCorpus,
} from './source-v4.js'
import { digestRecord, stableJsonSha256, stableStringCompare } from './stable-json.js'
import type {
  P3FlowExitCommand,
  P3FlowStructure,
  P3FlowTransitionEvidence,
  P3FlowTransitionGroup,
  P3TransitionEntry,
  P3ValidationReport,
  ScriptMigrationIRP2,
  ScriptMigrationIRP3,
  ScriptTransitionLedgerDraftP3,
  ScriptTransitionLedgerDraftV1,
} from './types.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`P3 validation: ${message}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function conditionalArmPath(path: string): boolean {
  return /\/(?:then|else|onNo|onLose|onFlee|onFail)\//.test(path)
}

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

function transitionEntryKey(entry: P3TransitionEntry): string {
  if (entry.from.kind === 'legacy-script') return `legacy-script:${entry.from.id}`
  if (entry.from.kind === 'source-cell')
    return `source-cell:${entry.from.source}#${entry.from.pointer}`
  return `legacy-script-cell:${entry.from.scriptId}#${entry.from.pointer}`
}

function isFlowExit(value: unknown): value is P3FlowExitCommand {
  return (
    isRecord(value) &&
    value.kind === 'n3P3FlowExit' &&
    typeof value.structureId === 'string' &&
    typeof value.sourcePath === 'string'
  )
}

function collectFlowExits(
  value: unknown,
  callerLegacyScriptId: string,
  pointer: string,
  output: Array<{
    callerLegacyScriptId: string
    path: string
    node: P3FlowExitCommand
  }>,
): void {
  if (isFlowExit(value)) {
    output.push({ callerLegacyScriptId, path: pointer, node: value })
    return
  }
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries())
      collectFlowExits(child, callerLegacyScriptId, `${pointer}/${index}`, output)
    return
  }
  if (!isRecord(value)) return
  for (const [key, child] of Object.entries(value))
    collectFlowExits(child, callerLegacyScriptId, `${pointer}/${pointerToken(key)}`, output)
}

function countCommandKind(value: unknown, kind: string): number {
  if (isFlowExit(value)) return 0
  if (Array.isArray(value))
    return value.reduce((total, child) => total + countCommandKind(child, kind), 0)
  if (!isRecord(value)) return 0
  return (
    (value.kind === kind ? 1 : 0) +
    Object.values(value).reduce((total: number, child) => total + countCommandKind(child, kind), 0)
  )
}

function countJumpRefsTo(value: unknown, targets: ReadonlySet<string>): number {
  if (isFlowExit(value)) return 0
  if (Array.isArray(value))
    return value.reduce((total, child) => total + countJumpRefsTo(child, targets), 0)
  if (!isRecord(value)) return 0
  const own =
    value.kind === 'jumpScript' &&
    isRecord(value.ref) &&
    typeof value.ref.id === 'string' &&
    targets.has(value.ref.id)
      ? 1
      : 0
  return (
    own +
    Object.values(value).reduce(
      (total: number, child) => total + countJumpRefsTo(child, targets),
      0,
    )
  )
}

function reverseP3Body(args: {
  value: unknown
  callerLegacyScriptId: string
  pointer: string
  structures: ReadonlyMap<string, P3FlowStructure>
}): unknown {
  const { value, callerLegacyScriptId, pointer, structures } = args
  if (isFlowExit(value)) {
    const structure = structures.get(value.structureId)
    assert(structure, `unknown flow structure ${value.structureId}`)
    assert(
      value.sourcePath === pointer,
      `flow source path drift ${callerLegacyScriptId}#${pointer}`,
    )
    assert(
      value.scheduling?.kind === 'macroTask' &&
        value.scheduling.worldClockAdvanceMs === 0 &&
        value.continuation === 'terminate-current-activation',
      `flow scheduling drift ${callerLegacyScriptId}#${pointer}`,
    )
    const incoming = structure.incoming.find(
      (site) => site.callerLegacyScriptId === callerLegacyScriptId && site.path === pointer,
    )
    assert(incoming, `flow provenance missing ${callerLegacyScriptId}#${pointer}`)
    return clone(incoming.sourceCommand)
  }
  if (Array.isArray(value))
    return value.map((child, index) =>
      reverseP3Body({
        value: child,
        callerLegacyScriptId,
        pointer: `${pointer}/${index}`,
        structures,
      }),
    )
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      reverseP3Body({
        value: child,
        callerLegacyScriptId,
        pointer: `${pointer}/${pointerToken(key)}`,
        structures,
      }),
    ]),
  )
}

function materializedAstNodes(
  rootId: string,
  audits: ReadonlyMap<string, { astKindNodes: number }>,
  targetsByOwner: ReadonlyMap<string, readonly string[]>,
): number {
  const seen = new Set<string>()
  const visit = (id: string): number => {
    if (seen.has(id)) return 0
    seen.add(id)
    const audit = audits.get(id)
    assert(audit, `materialized AST audit missing ${id}`)
    return (
      audit.astKindNodes +
      [...new Set(targetsByOwner.get(id) ?? [])].reduce((total, target) => total + visit(target), 0)
    )
  }
  return visit(rootId)
}

function expectedPending(ir: ScriptMigrationIRP3) {
  return ir.retainedBodies
    .flatMap((body) =>
      body.status.kind === 'resolved-entity-behavior'
        ? []
        : [
            {
              legacyScriptId: body.legacyScriptId,
              handle: body.handle,
              phase: body.status.work.phase,
              reason: body.status.work.reason,
            },
          ],
    )
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
}

export function validateP3ScriptMigrationIR(args: {
  migration: import('../../pal-migration.js').MigrationFileSet
  frozenAudit: ScriptControlFlowAuditV1
  sourceCommands: readonly SourceCmd[]
  p2: ScriptMigrationIRP2
  p2Ledger: ScriptTransitionLedgerDraftV1
  ir: ScriptMigrationIRP3
  ledger: ScriptTransitionLedgerDraftP3
  throughPhase: 'P3'
}): P3ValidationReport {
  const { frozenAudit, p2, p2Ledger, ir, ledger } = args
  assert(args.throughPhase === 'P3', 'phase argument mismatch')
  assert(
    ir.kind === 'script-migration-ir' &&
      ir.version === 1 &&
      ir.throughPhase === 'P3' &&
      ir.generatorEpoch === 'n3-script-v5-p3-v1',
    'IR header mismatch',
  )
  assert(ir.canonical === false && ir.runtimeConsumable === false, 'IR masquerades as canonical')
  assert(ir.digest === digestWithoutSelf(ir), 'IR digest mismatch')
  assert(ledger.digest === digestWithoutSelf(ledger), 'ledger digest mismatch')
  assert(
    p2.digest === digestWithoutSelf(p2) && p2Ledger.digest === digestWithoutSelf(p2Ledger),
    'previous phase self digest drift',
  )
  assert(
    ledger.kind === 'script-transition-ledger-draft' &&
      ledger.version === 1 &&
      ledger.projectId === 'pal' &&
      ledger.transitionId === 'script-v4-v5' &&
      ledger.throughPhase === 'P3' &&
      ledger.generatorEpoch === ir.generatorEpoch,
    'ledger header mismatch',
  )
  assert(
    ir.sourceAudit.digest === frozenAudit.digest &&
      ledger.sourceAudit.digest === frozenAudit.digest &&
      ir.sourceAudit.methodVersion === frozenAudit.methodVersion &&
      ledger.sourceAudit.methodVersion === frozenAudit.methodVersion,
    'source audit drift',
  )
  assert(
    ir.previousPhase.irDigest === p2.digest &&
      ir.previousPhase.ledgerDigest === p2Ledger.digest &&
      ledger.previousPhase.irDigest === p2.digest &&
      ledger.previousPhase.ledgerDigest === p2Ledger.digest,
    'previous phase digest drift',
  )

  const corpus = readV4ScriptCorpus(args.migration)
  assert(ir.source.sourceSnapshotSha256 === corpus.sourceSnapshotSha256, 'source snapshot drift')
  assert(
    stableJsonSha256(ir.source) === stableJsonSha256(p2.source) &&
      stableJsonSha256(ir.commandCensus) === stableJsonSha256(p2.commandCensus) &&
      stableJsonSha256(ir.commandSites) === stableJsonSha256(p2.commandSites) &&
      stableJsonSha256(ir.commandTransition) === stableJsonSha256(p2.commandTransition) &&
      stableJsonSha256(ir.tombstones) === stableJsonSha256(p2.tombstones) &&
      stableJsonSha256(ir.ownerResolutions) === stableJsonSha256(p2.ownerResolutions),
    'P2 cumulative payload drift',
  )

  const p2ById = new Map(p2.retainedBodies.map((body) => [body.legacyScriptId, body]))
  const retainedById = new Map(ir.retainedBodies.map((body) => [body.legacyScriptId, body]))
  const structuresById = new Map(ir.flowStructures.map((structure) => [structure.id, structure]))
  const structuresByTarget = new Map(
    ir.flowStructures.map((structure) => [structure.target.legacyScriptId, structure]),
  )
  assert(p2ById.size === 8_102, 'P2 retained input count drift')
  assert(retainedById.size === ir.retainedBodies.length, 'duplicate retained body')
  assert(structuresById.size === ir.flowStructures.length, 'duplicate flow structure id')
  assert(structuresByTarget.size === ir.flowStructures.length, 'duplicate flow target')
  assert(retainedById.size + structuresByTarget.size === p2ById.size, 'P3 body conservation failed')
  for (const id of p2ById.keys())
    assert(
      retainedById.has(id) !== structuresByTarget.has(id),
      `body is missing or double represented ${id}`,
    )
  for (const root of frozenAudit.canaries.authorRoots)
    assert(retainedById.has(root.id), `author root absorbed ${root.id}`)

  const bodyRepresentations = new Map<string, unknown[]>()
  for (const body of ir.retainedBodies) bodyRepresentations.set(body.legacyScriptId, body.body)
  for (const structure of ir.flowStructures)
    bodyRepresentations.set(structure.target.legacyScriptId, structure.target.body)
  let reversibleBodies = 0
  for (const [id, p2Body] of p2ById) {
    const representation = bodyRepresentations.get(id)
    assert(representation, `P3 representation missing ${id}`)
    const reversed = reverseP3Body({
      value: representation,
      callerLegacyScriptId: id,
      pointer: '',
      structures: structuresById,
    })
    assert(
      stableJsonSha256(canonicalLegacyAuthorCell(reversed)) ===
        stableJsonSha256(canonicalLegacyAuthorCell(p2Body.body)),
      `body is not reversible ${id}`,
    )
    reversibleBodies++
  }

  const exits: Array<{
    callerLegacyScriptId: string
    path: string
    node: P3FlowExitCommand
  }> = []
  for (const [id, body] of bodyRepresentations) collectFlowExits(body, id, '', exits)
  const exitKeys = new Set<string>()
  let danglingFlowStructures = 0
  for (const exit of exits) {
    const key = `${exit.callerLegacyScriptId}#${exit.path}`
    if (exitKeys.has(key)) danglingFlowStructures++
    exitKeys.add(key)
    const structure = structuresById.get(exit.node.structureId)
    const incoming = structure?.incoming.find(
      (site) => site.callerLegacyScriptId === exit.callerLegacyScriptId && site.path === exit.path,
    )
    if (!structure || !incoming) danglingFlowStructures++
  }
  const declaredIncoming = ir.flowStructures.flatMap((structure) =>
    structure.incoming.map((site) => `${site.callerLegacyScriptId}#${site.path}`),
  )
  if (
    declaredIncoming.length !== exitKeys.size ||
    declaredIncoming.some((key) => !exitKeys.has(key))
  )
    danglingFlowStructures++
  assert(exits.length === 655, `rewritten jump site count drift ${exits.length}`)
  assert(danglingFlowStructures === 0, 'dangling flow structure')

  const absorbedActiveIds = new Set(
    ir.flowStructures.map((structure) => structure.target.activeRefId),
  )
  const activeAbsorbedJumpRefs = [...bodyRepresentations.values()].reduce(
    (total, body) => total + countJumpRefsTo(body, absorbedActiveIds),
    0,
  )
  assert(activeAbsorbedJumpRefs === 0, 'active jump ref to absorbed body remains')
  const p2CallSites = p2.retainedBodies.reduce(
    (total, body) => total + countCommandKind(body.body, 'callScript'),
    0,
  )
  const p3CallSites = [...bodyRepresentations.values()].reduce(
    (total, body) => total + countCommandKind(body, 'callScript'),
    0,
  )
  const callSitesChanged = Math.abs(p3CallSites - p2CallSites)
  assert(callSitesChanged === 0, 'callScript boundary changed')

  const auditById = new Map(frozenAudit.product.bodies.map((body) => [body.id, body]))
  const targetsByOwner = new Map<string, string[]>()
  let contextViolations = 0
  for (const structure of ir.flowStructures) {
    const targetAudit = auditById.get(structure.target.legacyScriptId)
    const ownerAudit = auditById.get(structure.ownerLegacyScriptId)
    const p2Target = p2ById.get(structure.target.legacyScriptId)
    if (!targetAudit || !ownerAudit || !p2Target) {
      contextViolations++
      continue
    }
    const targets = targetsByOwner.get(structure.ownerLegacyScriptId) ?? []
    targets.push(structure.target.legacyScriptId)
    targetsByOwner.set(structure.ownerLegacyScriptId, targets)
    const inherited = inheritedContextDisposition(args.sourceCommands, targetAudit.source.addresses)
    if (
      inherited.rng.inheritedConsumer ||
      inherited.pendingBattleAuto.inheritedConsumer ||
      structure.context.rng.inheritedConsumer ||
      structure.context.pendingBattleAuto.inheritedConsumer ||
      !structure.context.dialogue.registryIdentityMatched ||
      structure.context.dialogue.entryHash !== targetAudit.dialogue?.hash ||
      structure.context.dialogue.exitStateSha256 !==
        (targetAudit.dialogue?.exit ? stableJsonSha256(targetAudit.dialogue.exit) : undefined) ||
      !structure.context.self.allIncomingMatched ||
      structure.context.self.targetOwner !== targetAudit.source.owner ||
      structure.target.baseCellSha256 !== p2Target.baseCellSha256 ||
      structure.size.callerAstNodes !== ownerAudit.astKindNodes ||
      structure.size.targetAstNodes !== targetAudit.astKindNodes ||
      structure.size.targetBytes !== Buffer.byteLength(JSON.stringify(p2Target.body)) ||
      structure.size.ownerChunk !== ownerAudit.chunk ||
      structure.size.targetChunk !== targetAudit.chunk
    )
      contextViolations++
    if (
      structure.kind === 'tail-inline'
        ? structure.incoming.length !== 1 ||
          structure.context.incomingShape !== 'single-predecessor'
        : structure.incoming.length < 2 ||
          new Set(structure.incoming.map((site) => site.callerLegacyScriptId)).size !== 1 ||
          structure.incoming.some((site) => !conditionalArmPath(site.path)) ||
          structure.context.incomingShape !== 'same-caller-conditional-arms'
    )
      contextViolations++
    const auditedIncoming = frozenAudit.product.references.sites
      .filter(
        (site) =>
          site.targetId === structure.target.legacyScriptId &&
          site.kind === 'jumpScript' &&
          site.flow === 'execution',
      )
      .map((site) => ({
        callerLegacyScriptId: site.callerBodyId,
        path: site.path,
      }))
      .sort(
        (left, right) =>
          stableStringCompare(left.callerLegacyScriptId, right.callerLegacyScriptId) ||
          stableStringCompare(left.path, right.path),
      )
    const declaredIncoming = structure.incoming
      .map((site) => ({
        callerLegacyScriptId: site.callerLegacyScriptId,
        path: site.path,
      }))
      .sort(
        (left, right) =>
          stableStringCompare(left.callerLegacyScriptId, right.callerLegacyScriptId) ||
          stableStringCompare(left.path, right.path),
      )
    if (stableJsonSha256(auditedIncoming) !== stableJsonSha256(declaredIncoming))
      contextViolations++
    for (const site of structure.incoming) {
      const source = corpus.byId.get(site.callerLegacyScriptId)
      const sourceRecord = site.sourceCommand as unknown as Record<string, unknown>
      const actualSelf = typeof sourceRecord.self === 'string' ? sourceRecord.self : undefined
      const sourceRef = isRecord(sourceRecord.ref) ? sourceRecord.ref : undefined
      const baseCommand = source ? commandAtPointer(source.body, site.path) : undefined
      if (
        !source ||
        !isRecord(baseCommand) ||
        baseCommand.kind !== 'jumpScript' ||
        !isRecord(baseCommand.ref) ||
        baseCommand.ref.id !== structure.target.legacyScriptId ||
        sourceRecord.kind !== 'jumpScript' ||
        sourceRef?.id !== structure.target.activeRefId ||
        actualSelf !== targetAudit.source.owner ||
        site.baseCellSha256 !== legacyAuthorCellSha256(baseCommand)
      )
        contextViolations++
    }
  }
  assert(contextViolations === 0, `${contextViolations} flow context violations`)

  for (const structure of ir.flowStructures) {
    const materialized = materializedAstNodes(
      structure.ownerLegacyScriptId,
      auditById,
      targetsByOwner,
    )
    assert(
      structure.size.materializedAstNodes === materialized,
      `materialized AST drift ${structure.id}`,
    )
  }
  const projectedChunkBytes = new Map<string, number>()
  const addChunkBytes = (chunk: string, value: unknown): void => {
    projectedChunkBytes.set(
      chunk,
      (projectedChunkBytes.get(chunk) ?? 0) + Buffer.byteLength(JSON.stringify(value)),
    )
  }
  for (const body of ir.retainedBodies) {
    const audit = auditById.get(body.legacyScriptId)
    assert(audit, `retained chunk missing ${body.legacyScriptId}`)
    addChunkBytes(audit.chunk, body.body)
  }
  for (const structure of ir.flowStructures)
    addChunkBytes(structure.size.ownerChunk, structure.target.body)
  const projectedChunks = [...projectedChunkBytes]
    .map(([chunk, bytes]) => ({ chunk, bytes }))
    .sort((left, right) => stableStringCompare(left.chunk, right.chunk))
  const observed = {
    materializedAstNodes: Math.max(
      ...ir.flowStructures.map((structure) => structure.size.materializedAstNodes),
    ),
    targetBytes: Math.max(...ir.flowStructures.map((structure) => structure.size.targetBytes)),
    projectedChunkBytes: Math.max(...projectedChunks.map((chunk) => chunk.bytes)),
  }
  const sizeViolations = [
    ...(observed.materializedAstNodes > ir.sizeGates.limits.materializedAstNodes
      ? ['materializedAstNodes']
      : []),
    ...(observed.targetBytes > ir.sizeGates.limits.targetBytes ? ['targetBytes'] : []),
    ...(observed.projectedChunkBytes > ir.sizeGates.limits.projectedChunkBytes
      ? ['projectedChunkBytes']
      : []),
  ].length
  assert(
    ir.sizeGates.limits.materializedAstNodes === 512 &&
      ir.sizeGates.limits.targetBytes === 65_536 &&
      ir.sizeGates.limits.projectedChunkBytes === 1_048_576 &&
      stableJsonSha256(ir.sizeGates.observed) === stableJsonSha256(observed) &&
      stableJsonSha256(ir.sizeGates.projectedChunks) === stableJsonSha256(projectedChunks) &&
      ir.sizeGates.violations.length === 0 &&
      sizeViolations === 0,
    'size gate report drift',
  )

  const candidateIds = new Set(
    p2.retainedBodies
      .filter(
        (body) =>
          body.status.kind !== 'resolved-entity-behavior' && body.status.work.phase === 'P3',
      )
      .map((body) => body.legacyScriptId),
  )
  const deferred = ir.retainedBodies.filter((body) =>
    body.status.kind === 'resolved-entity-behavior'
      ? false
      : String(body.status.work.reason).startsWith('p3-'),
  )
  assert(
    candidateIds.size === 1_715 &&
      ir.flowStructures.length === 599 &&
      deferred.length === 1_116 &&
      [...candidateIds].every(
        (id) => structuresByTarget.has(id) || deferred.some((body) => body.legacyScriptId === id),
      ),
    'P3 candidate conservation failed',
  )
  const referencesByTarget = new Map<string, typeof frozenAudit.product.references.sites>()
  for (const site of frozenAudit.product.references.sites) {
    const sites = referencesByTarget.get(site.targetId) ?? []
    sites.push(site)
    referencesByTarget.set(site.targetId, sites)
  }
  const deferredReasonByDisposition = {
    'deferred-call-owner': 'p3-call-owner-resolution',
    'deferred-entity-binding-owner': 'p3-entity-binding-owner-resolution',
    'deferred-multi-owner-join': 'p3-multi-owner-join',
    'deferred-mixed-flow-binding': 'p3-mixed-flow-binding',
  } as const
  for (const id of candidateIds) {
    const disposition = classifyP3ReferenceShape(referencesByTarget.get(id) ?? [])
    const structure = structuresByTarget.get(id)
    const retained = retainedById.get(id)
    if (disposition === 'tail-inline' || disposition === 'branch-switch-join')
      assert(structure?.kind === disposition && !retained, `structured disposition drift ${id}`)
    else
      assert(
        !structure &&
          retained &&
          retained.status.kind !== 'resolved-entity-behavior' &&
          retained.status.work.phase === 'P4' &&
          retained.status.work.reason === deferredReasonByDisposition[disposition],
        `deferred disposition drift ${id}`,
      )
  }
  assert(
    stableJsonSha256(ir.flowCensus) ===
      stableJsonSha256({
        input: 1_715,
        tailInline: 579,
        branchSwitchJoin: 20,
        deferredCallOwner: 622,
        deferredEntityBindingOwner: 455,
        deferredMultiOwnerJoin: 38,
        deferredMixedFlowBinding: 1,
        unknown: 0,
      }),
    'flow census drift',
  )
  const deferredCounts = Object.fromEntries(
    [
      'p3-call-owner-resolution',
      'p3-entity-binding-owner-resolution',
      'p3-multi-owner-join',
      'p3-mixed-flow-binding',
    ].map((reason) => [
      reason,
      deferred.filter(
        (body) =>
          body.status.kind !== 'resolved-entity-behavior' && body.status.work.reason === reason,
      ).length,
    ]),
  )
  assert(
    stableJsonSha256(deferredCounts) ===
      stableJsonSha256({
        'p3-call-owner-resolution': 622,
        'p3-entity-binding-owner-resolution': 455,
        'p3-multi-owner-join': 38,
        'p3-mixed-flow-binding': 1,
      }),
    'deferred census drift',
  )

  assert(
    stableJsonSha256(ledger.completed) ===
      stableJsonSha256([
        'folded-body-pruning',
        'misleading-scc-retirement',
        's018-owner-resolution',
        'acyclic-flow-structure',
      ]),
    'completed inventory drift',
  )
  const ledgerEntriesByKey = new Map(
    ledger.entries.map((entry) => [transitionEntryKey(entry), entry]),
  )
  assert(ledgerEntriesByKey.size === ledger.entries.length, 'duplicate ledger source')
  for (const p2Entry of p2Ledger.entries) {
    const current = ledgerEntriesByKey.get(transitionEntryKey(p2Entry))
    assert(
      current && stableJsonSha256(current) === stableJsonSha256(p2Entry),
      `P2 ledger entry drift ${transitionEntryKey(p2Entry)}`,
    )
  }
  assert(
    ledger.groups.length === 600 &&
      stableJsonSha256(ledger.groups[0]) === stableJsonSha256(p2Ledger.groups[0]),
    'ledger group count or P2 group drift',
  )
  const flowGroups = new Map(
    ledger.groups
      .filter((group): group is P3FlowTransitionGroup => group.kind === 'flow-absorption-group')
      .map((group) => [group.id, group]),
  )
  const flowEvidence = new Map(
    ledger.evidence
      .filter(
        (evidence): evidence is P3FlowTransitionEvidence =>
          evidence.kind === 'acyclic-tail-inline' || evidence.kind === 'branch-switch-join',
      )
      .map((evidence) => [evidence.id, evidence]),
  )
  assert(
    flowGroups.size === ir.flowStructures.length && flowEvidence.size === ir.flowStructures.length,
    'flow ledger coverage drift',
  )
  for (const structure of ir.flowStructures) {
    const group = flowGroups.get(structure.id)
    const evidence = flowEvidence.get(structure.evidenceId)
    assert(group && evidence, `flow ledger record missing ${structure.id}`)
    const dependencies: string[] = []
    const collectDependencies = (value: unknown): void => {
      if (isFlowExit(value)) {
        if (value.structureId !== structure.id) dependencies.push(value.structureId)
        return
      }
      if (Array.isArray(value)) {
        for (const child of value) collectDependencies(child)
        return
      }
      if (!isRecord(value)) return
      for (const child of Object.values(value)) collectDependencies(child)
    }
    collectDependencies(structure.target.body)
    const expectedSources = [
      {
        identity: { kind: 'legacy-script', id: structure.target.legacyScriptId },
        baseCellSha256: structure.target.baseCellSha256,
      },
      ...structure.incoming.map((site) => ({
        identity: {
          kind: 'legacy-script-cell',
          scriptId: site.callerLegacyScriptId,
          pointer: site.path,
        },
        baseCellSha256: site.baseCellSha256,
      })),
    ]
    assert(
      group.evidenceId === structure.evidenceId &&
        group.editPolicy === 'conflict-if-modified' &&
        group.transformId ===
          (structure.kind === 'tail-inline'
            ? 'inline-acyclic-tail-v1'
            : 'restore-branch-switch-join-v1') &&
        group.outcome.kind === 'absorbed-into-structured-flow' &&
        group.outcome.structure === structure.kind &&
        stableJsonSha256(group.sources) === stableJsonSha256(expectedSources) &&
        stableJsonSha256(group.dependsOn) ===
          stableJsonSha256([...new Set(dependencies)].sort(stableStringCompare)) &&
        evidence.kind ===
          (structure.kind === 'tail-inline' ? 'acyclic-tail-inline' : 'branch-switch-join') &&
        evidence.sourceAuditDigest === frozenAudit.digest &&
        stableJsonSha256(evidence.legacyScriptIds) ===
          stableJsonSha256([
            structure.target.legacyScriptId,
            ...new Set(structure.incoming.map((site) => site.callerLegacyScriptId)),
          ]) &&
        stableJsonSha256(evidence.sourceCells) ===
          stableJsonSha256(
            structure.incoming.map(
              (site) => `legacy-script:${site.callerLegacyScriptId}#${site.path}`,
            ),
          ) &&
        evidence.contextCompatible &&
        evidence.sizeGatesPassed,
      `flow ledger relationship drift ${structure.id}`,
    )
    for (const source of group.sources) {
      const key =
        source.identity.kind === 'legacy-script'
          ? `legacy-script:${source.identity.id}`
          : `legacy-script-cell:${source.identity.scriptId}#${source.identity.pointer}`
      const entry = ledgerEntriesByKey.get(key)
      assert(
        entry &&
          entry.baseCellSha256 === source.baseCellSha256 &&
          entry.outcome.kind === 'group' &&
          entry.outcome.groupId === group.id,
        `flow group entry drift ${key}`,
      )
    }
  }
  assert(
    ledger.entries.length === p2Ledger.entries.length + 599 + 655 &&
      ledger.evidence.length === p2Ledger.evidence.length + 599,
    'flow ledger cardinality drift',
  )
  const allEvidenceById = new Map(ledger.evidence.map((evidence) => [evidence.id, evidence]))
  for (const evidence of p2Ledger.evidence)
    assert(
      stableJsonSha256(allEvidenceById.get(evidence.id)) === stableJsonSha256(evidence),
      `P2 ledger evidence drift ${evidence.id}`,
    )

  const pending = expectedPending(ir)
  const pendingPhaseCounts = { P3: 0, P4: 0, P5: 0, P6: 0 }
  for (const entry of pending) pendingPhaseCounts[entry.phase]++
  let pendingUnknown = 0
  if (stableJsonSha256(ledger.pending) !== stableJsonSha256(pending)) pendingUnknown++
  if (stableJsonSha256(ir.pendingByPhase) !== stableJsonSha256(pendingPhaseCounts)) pendingUnknown++
  assert(pendingPhaseCounts.P3 === 0, 'P3 pending remains')
  assert(pendingUnknown === 0, 'pending inventory drift')

  return digestRecord<P3ValidationReport>({
    kind: 'script-migration-phase-validation',
    version: 1,
    throughPhase: 'P3',
    sourceAuditDigest: frozenAudit.digest,
    checks: {
      sourceAuditFrozen: true,
      previousPhaseFrozen: true,
      candidateBodies: candidateIds.size,
      structuredBodies: ir.flowStructures.length,
      rewrittenJumpSites: exits.length,
      retainedBodies: ir.retainedBodies.length,
      reversibleBodies,
      danglingFlowStructures,
      activeAbsorbedJumpRefs,
      callSitesChanged,
      contextViolations,
      sizeViolations,
      pendingP3: pendingPhaseCounts.P3,
      pendingUnknown,
    },
  })
}
