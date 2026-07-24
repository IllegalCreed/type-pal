import { isDeepStrictEqual } from 'node:util'
import type { Command } from '@type-pal/content'
import type {
  ProductReferenceSite,
  ScriptBodyAudit,
  ScriptControlFlowAuditV1,
} from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import { commandAtPointer, legacyAuthorCellSha256, readV4ScriptCorpus } from './source-v4.js'
import { digestRecord, stableJsonSha256, stableStringCompare } from './stable-json.js'
import type {
  P2BodyFutureWork,
  P2RetainedBody,
  P3DeferredReason,
  P3FlowCensus,
  P3FlowExitCommand,
  P3FlowReferenceSite,
  P3FlowStructure,
  P3FlowTransitionEvidence,
  P3FlowTransitionGroup,
  P3FutureWork,
  P3PendingTransition,
  P3RetainedBody,
  P3TransitionEntry,
  ScriptMigrationIRP2,
  ScriptMigrationIRP3,
  ScriptTransitionLedgerDraftP3,
  ScriptTransitionLedgerDraftV1,
} from './types.js'

const MATERIALIZED_AST_LIMIT = 512 as const
const TARGET_BYTES_LIMIT = 65_536 as const
const PROJECTED_CHUNK_BYTES_LIMIT = 1_048_576 as const

type P3Disposition =
  | 'tail-inline'
  | 'branch-switch-join'
  | 'deferred-call-owner'
  | 'deferred-entity-binding-owner'
  | 'deferred-multi-owner-join'
  | 'deferred-mixed-flow-binding'

interface P3Candidate {
  body: P2RetainedBody
  audit: ScriptBodyAudit
  incoming: ProductReferenceSite[]
  disposition: P3Disposition
}

interface P3StructureDraft {
  kind: P3FlowStructure['kind']
  id: string
  targetBody: P2RetainedBody
  targetAudit: ScriptBodyAudit
  ownerBody: P2RetainedBody
  ownerAudit: ScriptBodyAudit
  incoming: P3FlowReferenceSite[]
  context: P3FlowStructure['context']
  evidenceId: string
}

interface P3Replacement {
  structureId: string
  sourcePath: string
}

export interface P3TransformResult {
  ir: ScriptMigrationIRP3
  ledger: ScriptTransitionLedgerDraftP3
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`P3 transform: ${message}`)
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

function phaseWork(body: P2RetainedBody): P2BodyFutureWork | undefined {
  return body.status.kind === 'resolved-entity-behavior' ? undefined : body.status.work
}

function transitionEntryKey(entry: P3TransitionEntry): string {
  if (entry.from.kind === 'legacy-script') return `legacy-script:${entry.from.id}`
  if (entry.from.kind === 'source-cell')
    return `source-cell:${entry.from.source}#${entry.from.pointer}`
  return `legacy-script-cell:${entry.from.scriptId}#${entry.from.pointer}`
}

function conditionalArmPath(path: string): boolean {
  return /\/(?:then|else|onNo|onLose|onFlee|onFail)\//.test(path)
}

export function classifyP3ReferenceShape(
  incoming: readonly Pick<ProductReferenceSite, 'callerBodyId' | 'kind' | 'flow' | 'path'>[],
): P3Disposition {
  if (!incoming.length) throw new Error('P3 reference shape: candidate has no incoming site')
  const jumpSites = incoming.filter(
    (site) => site.kind === 'jumpScript' && site.flow === 'execution',
  )
  if (jumpSites.length === incoming.length) {
    if (jumpSites.length === 1) return 'tail-inline'
    if (
      new Set(jumpSites.map((site) => site.callerBodyId)).size === 1 &&
      jumpSites.every((site) => conditionalArmPath(site.path))
    )
      return 'branch-switch-join'
    return 'deferred-multi-owner-join'
  }
  if (jumpSites.length) return 'deferred-mixed-flow-binding'
  if (incoming.every((site) => site.kind === 'callScript')) return 'deferred-call-owner'
  if (
    incoming.every(
      (site) =>
        (site.kind === 'setEntityAuto' || site.kind === 'setEntityTrigger') &&
        site.flow === 'deferred-binding',
    )
  )
    return 'deferred-entity-binding-owner'
  throw new Error(
    `P3 reference shape: unsupported inventory ${JSON.stringify(
      incoming.map((site) => `${site.kind}:${site.flow}`).sort(),
    )}`,
  )
}

export function inheritedContextDisposition(
  commands: readonly SourceCmd[],
  addresses: readonly number[],
): {
  rng: {
    firstRelevantOpcode: 'none' | 'set-before-use'
    inheritedConsumer: boolean
  }
  pendingBattleAuto: {
    firstRelevantOpcode: 'none' | 'set-before-use'
    inheritedConsumer: boolean
  }
} {
  const opcodes = addresses
    .map((address) => commands[address])
    .filter((command): command is SourceCmd => command !== undefined)
    .flatMap((command) =>
      command.op === 'raw' && command.opcode !== undefined ? [command.opcode] : [],
    )
  const rng = opcodes.find((opcode) => opcode === 0x36 || opcode === 0x37)
  const pendingBattleAuto = opcodes.find((opcode) => opcode === 0x8a || opcode === 0x07)
  return {
    rng: {
      firstRelevantOpcode: rng === undefined ? 'none' : rng === 0x36 ? 'set-before-use' : 'none',
      inheritedConsumer: rng === 0x37,
    },
    pendingBattleAuto: {
      firstRelevantOpcode:
        pendingBattleAuto === undefined
          ? 'none'
          : pendingBattleAuto === 0x8a
            ? 'set-before-use'
            : 'none',
      inheritedConsumer: pendingBattleAuto === 0x07,
    },
  }
}

function deferredReason(disposition: P3Disposition): P3DeferredReason {
  switch (disposition) {
    case 'deferred-call-owner':
      return 'p3-call-owner-resolution'
    case 'deferred-entity-binding-owner':
      return 'p3-entity-binding-owner-resolution'
    case 'deferred-multi-owner-join':
      return 'p3-multi-owner-join'
    case 'deferred-mixed-flow-binding':
      return 'p3-mixed-flow-binding'
    default:
      throw new Error(`P3 transform: ${disposition} is not deferred`)
  }
}

function deferredPhase(body: ScriptBodyAudit): 'P4' | 'P6' {
  return body.id.startsWith('shared/') ||
    body.source.owner?.startsWith('global/') ||
    body.runtimeEntryKinds.includes('item-run-script')
    ? 'P6'
    : 'P4'
}

function buildCandidates(
  p2: ScriptMigrationIRP2,
  frozenAudit: ScriptControlFlowAuditV1,
): P3Candidate[] {
  const auditById = new Map(frozenAudit.product.bodies.map((body) => [body.id, body]))
  const referencesByTarget = new Map<string, ProductReferenceSite[]>()
  for (const site of frozenAudit.product.references.sites) {
    const sites = referencesByTarget.get(site.targetId) ?? []
    sites.push(site)
    referencesByTarget.set(site.targetId, sites)
  }
  return p2.retainedBodies
    .filter((body) => phaseWork(body)?.phase === 'P3')
    .map((body) => {
      const audit = auditById.get(body.legacyScriptId)
      assert(audit, `candidate audit missing ${body.legacyScriptId}`)
      assert(!audit.productComponent.cyclic, `cyclic body entered P3 ${body.legacyScriptId}`)
      const incoming = [...(referencesByTarget.get(body.legacyScriptId) ?? [])].sort(
        (left, right) =>
          stableStringCompare(left.callerBodyId, right.callerBodyId) ||
          stableStringCompare(left.path, right.path),
      )
      return {
        body,
        audit,
        incoming,
        disposition: classifyP3ReferenceShape(incoming),
      }
    })
    .sort((left, right) => stableStringCompare(left.body.legacyScriptId, right.body.legacyScriptId))
}

function census(candidates: readonly P3Candidate[]): P3FlowCensus {
  const count = (disposition: P3Disposition) =>
    candidates.filter((candidate) => candidate.disposition === disposition).length
  const actual = {
    input: candidates.length,
    tailInline: count('tail-inline'),
    branchSwitchJoin: count('branch-switch-join'),
    deferredCallOwner: count('deferred-call-owner'),
    deferredEntityBindingOwner: count('deferred-entity-binding-owner'),
    deferredMultiOwnerJoin: count('deferred-multi-owner-join'),
    deferredMixedFlowBinding: count('deferred-mixed-flow-binding'),
    unknown: 0,
  }
  assert(
    isDeepStrictEqual(actual, {
      input: 1_715,
      tailInline: 579,
      branchSwitchJoin: 20,
      deferredCallOwner: 622,
      deferredEntityBindingOwner: 455,
      deferredMultiOwnerJoin: 38,
      deferredMixedFlowBinding: 1,
      unknown: 0,
    }),
    `PAL P3 census drift ${JSON.stringify(actual)}`,
  )
  return {
    input: 1_715,
    tailInline: 579,
    branchSwitchJoin: 20,
    deferredCallOwner: 622,
    deferredEntityBindingOwner: 455,
    deferredMultiOwnerJoin: 38,
    deferredMixedFlowBinding: 1,
    unknown: 0,
  }
}

function structureId(kind: P3FlowStructure['kind'], target: P2RetainedBody): string {
  return `p3-flow-${kind}-${target.handle.slice('ir-body-'.length)}`
}

function sourceCommandAt(body: P2RetainedBody, path: string, expectedActiveRefId: string): Command {
  const command = commandAtPointer(body.body, path)
  assert(
    isRecord(command) && command.kind === 'jumpScript',
    `jump command missing ${body.legacyScriptId}#${path}`,
  )
  const ref = command.ref
  assert(
    isRecord(ref) && ref.id === expectedActiveRefId,
    `jump target mismatch ${body.legacyScriptId}#${path}`,
  )
  return clone(command) as Command
}

function buildStructureDrafts(args: {
  candidates: readonly P3Candidate[]
  p2: ScriptMigrationIRP2
  frozenAudit: ScriptControlFlowAuditV1
  sourceCommands: readonly SourceCmd[]
  corpus: ReturnType<typeof readV4ScriptCorpus>
}): P3StructureDraft[] {
  const bodyById = new Map(args.p2.retainedBodies.map((body) => [body.legacyScriptId, body]))
  const auditById = new Map(args.frozenAudit.product.bodies.map((body) => [body.id, body]))
  return args.candidates
    .filter(
      (candidate) =>
        candidate.disposition === 'tail-inline' || candidate.disposition === 'branch-switch-join',
    )
    .map((candidate) => {
      const callerIds = [...new Set(candidate.incoming.map((site) => site.callerBodyId))]
      assert(
        callerIds.length === 1,
        `structured target has multiple callers ${candidate.body.legacyScriptId}`,
      )
      const ownerLegacyScriptId = callerIds[0]!
      const ownerBody = bodyById.get(ownerLegacyScriptId)
      const ownerAudit = auditById.get(ownerLegacyScriptId)
      const sourceTarget = args.corpus.byId.get(candidate.body.legacyScriptId)
      const sourceOwner = args.corpus.byId.get(ownerLegacyScriptId)
      assert(
        ownerBody && ownerAudit && sourceTarget && sourceOwner,
        `structure provenance missing ${candidate.body.legacyScriptId}`,
      )
      const incoming: P3FlowReferenceSite[] = candidate.incoming.map((site) => {
        const sourceCommand = sourceCommandAt(ownerBody, site.path, candidate.body.activeRefId)
        const baseCommand = commandAtPointer(sourceOwner.body, site.path)
        assert(
          isRecord(baseCommand) &&
            baseCommand.kind === 'jumpScript' &&
            isRecord(baseCommand.ref) &&
            baseCommand.ref.id === candidate.body.legacyScriptId,
          `v4 jump provenance mismatch ${ownerLegacyScriptId}#${site.path}`,
        )
        const actualSelf =
          typeof (sourceCommand as unknown as Record<string, unknown>).self === 'string'
            ? ((sourceCommand as unknown as Record<string, unknown>).self as string)
            : undefined
        assert(
          actualSelf === candidate.audit.source.owner,
          `self mismatch ${ownerLegacyScriptId}#${site.path}: ${String(actualSelf)} != ${String(candidate.audit.source.owner)}`,
        )
        return {
          callerLegacyScriptId: ownerLegacyScriptId,
          callerHandle: ownerBody.handle,
          path: site.path,
          baseCellSha256: legacyAuthorCellSha256(baseCommand),
          sourceCommand,
        }
      })
      const dialogue = candidate.audit.dialogue
      assert(dialogue, `dialogue provenance missing ${candidate.body.legacyScriptId}`)
      assert(
        candidate.body.legacyScriptId.endsWith(`/d-${dialogue.hash}`),
        `dialogue identity mismatch ${candidate.body.legacyScriptId}`,
      )
      const inherited = inheritedContextDisposition(
        args.sourceCommands,
        candidate.audit.source.addresses,
      )
      assert(
        !inherited.rng.inheritedConsumer,
        `lastRngChunk context is not merge-safe ${candidate.body.legacyScriptId}`,
      )
      assert(
        !inherited.pendingBattleAuto.inheritedConsumer,
        `pendingAuto context is not merge-safe ${candidate.body.legacyScriptId}`,
      )
      const kind =
        candidate.disposition === 'tail-inline'
          ? ('tail-inline' as const)
          : ('branch-switch-join' as const)
      const id = structureId(kind, candidate.body)
      const context: P3FlowStructure['context'] = {
        dialogue: {
          entryHash: dialogue.hash,
          ...(dialogue.exit ? { exitStateSha256: stableJsonSha256(dialogue.exit) } : {}),
          registryIdentityMatched: true,
        },
        self: {
          ...(candidate.audit.source.owner ? { targetOwner: candidate.audit.source.owner } : {}),
          allIncomingMatched: true,
        },
        rng: {
          firstRelevantOpcode: inherited.rng.firstRelevantOpcode,
          inheritedConsumer: false,
        },
        pendingBattleAuto: {
          firstRelevantOpcode: inherited.pendingBattleAuto.firstRelevantOpcode,
          inheritedConsumer: false,
        },
        incomingShape:
          kind === 'tail-inline' ? 'single-predecessor' : 'same-caller-conditional-arms',
      }
      return {
        kind,
        id,
        targetBody: candidate.body,
        targetAudit: candidate.audit,
        ownerBody,
        ownerAudit,
        incoming,
        context,
        evidenceId: `p3:${args.frozenAudit.digest}:${kind}:${candidate.body.legacyScriptId}`,
      }
    })
    .sort((left, right) =>
      stableStringCompare(left.targetBody.legacyScriptId, right.targetBody.legacyScriptId),
    )
}

function replacementKey(callerLegacyScriptId: string, path: string): string {
  return `${callerLegacyScriptId}#${path}`
}

function rewriteBody(
  body: readonly unknown[],
  callerLegacyScriptId: string,
  replacements: ReadonlyMap<string, P3Replacement>,
): unknown[] {
  const walk = (value: unknown, pointer: string): unknown => {
    const replacement = replacements.get(replacementKey(callerLegacyScriptId, pointer))
    if (replacement) {
      assert(
        isRecord(value) && value.kind === 'jumpScript',
        `rewrite source is not jump ${callerLegacyScriptId}#${pointer}`,
      )
      const node: P3FlowExitCommand = {
        kind: 'n3P3FlowExit',
        structureId: replacement.structureId,
        sourcePath: replacement.sourcePath,
        scheduling: { kind: 'macroTask', worldClockAdvanceMs: 0 },
        continuation: 'terminate-current-activation',
      }
      return node
    }
    if (Array.isArray(value)) return value.map((child, index) => walk(child, `${pointer}/${index}`))
    if (!isRecord(value)) return value
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        walk(child, `${pointer}/${pointerToken(key)}`),
      ]),
    )
  }
  return walk(body, '') as unknown[]
}

function materializedAstNodes(
  rootId: string,
  auditById: ReadonlyMap<string, ScriptBodyAudit>,
  absorbedTargetsByCaller: ReadonlyMap<string, readonly string[]>,
): number {
  const seen = new Set<string>()
  const visit = (id: string): number => {
    if (seen.has(id)) return 0
    seen.add(id)
    const audit = auditById.get(id)
    assert(audit, `materialized AST audit missing ${id}`)
    return (
      audit.astKindNodes +
      [...new Set(absorbedTargetsByCaller.get(id) ?? [])].reduce(
        (total, target) => total + visit(target),
        0,
      )
    )
  }
  return visit(rootId)
}

function retainedStatus(
  candidate: P3Candidate | undefined,
  body: P2RetainedBody,
): P3RetainedBody['status'] {
  if (!candidate) return clone(body.status) as P3RetainedBody['status']
  const reason = deferredReason(candidate.disposition)
  const work: P3FutureWork = {
    phase: deferredPhase(candidate.audit),
    reason,
  }
  return body.status.kind === 'pending-owner'
    ? { kind: 'pending-owner', ownerKind: body.status.ownerKind, work }
    : { kind: 'future', work }
}

function buildLedger(args: {
  p2: ScriptMigrationIRP2
  p2Ledger: ScriptTransitionLedgerDraftV1
  irWithoutDigest: Omit<ScriptMigrationIRP3, 'digest'>
  structures: readonly P3FlowStructure[]
}): ScriptTransitionLedgerDraftP3 {
  const flowGroups: P3FlowTransitionGroup[] = args.structures.map((structure) => {
    const dependencies = new Set<string>()
    const collectDependencies = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const child of value) collectDependencies(child)
        return
      }
      if (!isRecord(value)) return
      if (
        value.kind === 'n3P3FlowExit' &&
        typeof value.structureId === 'string' &&
        value.structureId !== structure.id
      )
        dependencies.add(value.structureId)
      for (const child of Object.values(value)) collectDependencies(child)
    }
    collectDependencies(structure.target.body)
    return {
      kind: 'flow-absorption-group',
      id: structure.id,
      transformId:
        structure.kind === 'tail-inline'
          ? 'inline-acyclic-tail-v1'
          : 'restore-branch-switch-join-v1',
      editPolicy: 'conflict-if-modified',
      sources: [
        {
          identity: {
            kind: 'legacy-script',
            id: structure.target.legacyScriptId,
          },
          baseCellSha256: structure.target.baseCellSha256,
        },
        ...structure.incoming.map((site) => ({
          identity: {
            kind: 'legacy-script-cell' as const,
            scriptId: site.callerLegacyScriptId,
            pointer: site.path,
          },
          baseCellSha256: site.baseCellSha256,
        })),
      ],
      outcome: {
        kind: 'absorbed-into-structured-flow',
        structure: structure.kind,
      },
      evidenceId: structure.evidenceId,
      dependsOn: [...dependencies].sort(stableStringCompare),
    }
  })
  const flowEntries: P3TransitionEntry[] = flowGroups.flatMap((group) =>
    group.sources.map((source) => ({
      from: clone(source.identity),
      baseCellSha256: source.baseCellSha256,
      outcome: {
        kind: 'group',
        groupId: group.id,
      },
    })),
  )
  const flowEvidence: P3FlowTransitionEvidence[] = args.structures.map((structure) => ({
    id: structure.evidenceId,
    kind: structure.kind === 'tail-inline' ? 'acyclic-tail-inline' : 'branch-switch-join',
    sourceAuditDigest: args.irWithoutDigest.sourceAudit.digest,
    legacyScriptIds: [
      structure.target.legacyScriptId,
      ...new Set(structure.incoming.map((site) => site.callerLegacyScriptId)),
    ],
    sourceCells: structure.incoming.map(
      (site) => `legacy-script:${site.callerLegacyScriptId}#${site.path}`,
    ),
    contextCompatible: true,
    sizeGatesPassed: true,
  }))
  const pending: P3PendingTransition[] = args.irWithoutDigest.retainedBodies
    .flatMap((body) => {
      if (body.status.kind === 'resolved-entity-behavior') return []
      return [
        {
          legacyScriptId: body.legacyScriptId,
          handle: body.handle,
          phase: body.status.work.phase,
          reason: body.status.work.reason,
        },
      ]
    })
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  const entries = [...clone(args.p2Ledger.entries), ...flowEntries].sort((left, right) =>
    stableStringCompare(transitionEntryKey(left), transitionEntryKey(right)),
  )
  assert(
    new Set(entries.map(transitionEntryKey)).size === entries.length,
    'ledger source identity overlap',
  )
  return digestRecord<ScriptTransitionLedgerDraftP3>({
    kind: 'script-transition-ledger-draft',
    version: 1,
    projectId: 'pal',
    transitionId: 'script-v4-v5',
    generatorEpoch: 'n3-script-v5-p3-v1',
    throughPhase: 'P3',
    sourceAudit: clone(args.p2Ledger.sourceAudit),
    previousPhase: {
      irDigest: args.p2.digest,
      ledgerDigest: args.p2Ledger.digest,
    },
    completed: [
      'folded-body-pruning',
      'misleading-scc-retirement',
      's018-owner-resolution',
      'acyclic-flow-structure',
    ],
    entries,
    groups: [clone(args.p2Ledger.groups[0]!), ...flowGroups],
    evidence: [...clone(args.p2Ledger.evidence), ...flowEvidence].sort((left, right) =>
      stableStringCompare(left.id, right.id),
    ),
    pending,
  })
}

export function buildP3ScriptMigrationIR(args: {
  migration: import('../../pal-migration.js').MigrationFileSet
  frozenAudit: ScriptControlFlowAuditV1
  sourceCommands: readonly SourceCmd[]
  p2: ScriptMigrationIRP2
  p2Ledger: ScriptTransitionLedgerDraftV1
}): P3TransformResult {
  assert(args.p2.throughPhase === 'P2', 'P2 IR phase mismatch')
  assert(args.p2Ledger.throughPhase === 'P2', 'P2 ledger phase mismatch')
  const corpus = readV4ScriptCorpus(args.migration)
  assert(
    corpus.sourceSnapshotSha256 === args.p2.source.sourceSnapshotSha256,
    'P2 source snapshot drift',
  )
  const candidates = buildCandidates(args.p2, args.frozenAudit)
  const flowCensus = census(candidates)
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.body.legacyScriptId, candidate]),
  )
  const drafts = buildStructureDrafts({
    candidates,
    p2: args.p2,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    corpus,
  })
  const absorbed = new Set(drafts.map((draft) => draft.targetBody.legacyScriptId))
  assert(absorbed.size === 599, `absorbed body count drift ${absorbed.size}`)

  const replacements = new Map<string, P3Replacement>()
  for (const draft of drafts) {
    for (const site of draft.incoming) {
      const key = replacementKey(site.callerLegacyScriptId, site.path)
      assert(!replacements.has(key), `duplicate flow rewrite ${key}`)
      replacements.set(key, { structureId: draft.id, sourcePath: site.path })
    }
  }
  assert(replacements.size === 655, `rewritten jump site count drift ${replacements.size}`)

  const auditById = new Map(args.frozenAudit.product.bodies.map((body) => [body.id, body]))
  const absorbedTargetsByCaller = new Map<string, string[]>()
  for (const draft of drafts) {
    const targets = absorbedTargetsByCaller.get(draft.ownerBody.legacyScriptId) ?? []
    targets.push(draft.targetBody.legacyScriptId)
    absorbedTargetsByCaller.set(draft.ownerBody.legacyScriptId, targets)
  }
  const retainedBodies: P3RetainedBody[] = args.p2.retainedBodies
    .filter((body) => !absorbed.has(body.legacyScriptId))
    .map((body) => ({
      ...clone(body),
      body: rewriteBody(body.body, body.legacyScriptId, replacements),
      status: retainedStatus(candidateById.get(body.legacyScriptId), body),
    }))
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))

  const structures: P3FlowStructure[] = drafts.map((draft) => {
    const materialized = materializedAstNodes(
      draft.ownerBody.legacyScriptId,
      auditById,
      absorbedTargetsByCaller,
    )
    return {
      kind: draft.kind,
      id: draft.id,
      target: {
        handle: draft.targetBody.handle,
        legacyScriptId: draft.targetBody.legacyScriptId,
        activeRefId: draft.targetBody.activeRefId,
        baseCellSha256: draft.targetBody.baseCellSha256,
        body: rewriteBody(draft.targetBody.body, draft.targetBody.legacyScriptId, replacements),
      },
      ownerLegacyScriptId: draft.ownerBody.legacyScriptId,
      incoming: draft.incoming,
      context: draft.context,
      size: {
        callerAstNodes: draft.ownerAudit.astKindNodes,
        targetAstNodes: draft.targetAudit.astKindNodes,
        materializedAstNodes: materialized,
        targetBytes: Buffer.byteLength(JSON.stringify(draft.targetBody.body)),
        ownerChunk: draft.ownerAudit.chunk,
        targetChunk: draft.targetAudit.chunk,
      },
      evidenceId: draft.evidenceId,
    }
  })

  const projectedChunkBytes = new Map<string, number>()
  const addChunkBytes = (chunk: string, value: unknown): void => {
    projectedChunkBytes.set(
      chunk,
      (projectedChunkBytes.get(chunk) ?? 0) + Buffer.byteLength(JSON.stringify(value)),
    )
  }
  for (const body of retainedBodies) {
    const audit = auditById.get(body.legacyScriptId)
    assert(audit, `retained chunk audit missing ${body.legacyScriptId}`)
    addChunkBytes(audit.chunk, body.body)
  }
  for (const structure of structures)
    addChunkBytes(structure.size.ownerChunk, structure.target.body)
  const projectedChunks = [...projectedChunkBytes]
    .map(([chunk, bytes]) => ({ chunk, bytes }))
    .sort((left, right) => stableStringCompare(left.chunk, right.chunk))
  const observed = {
    materializedAstNodes: Math.max(
      ...structures.map((structure) => structure.size.materializedAstNodes),
    ),
    targetBytes: Math.max(...structures.map((structure) => structure.size.targetBytes)),
    projectedChunkBytes: Math.max(...projectedChunks.map((chunk) => chunk.bytes)),
  }
  const violations = [
    ...(observed.materializedAstNodes > MATERIALIZED_AST_LIMIT
      ? [`materializedAstNodes:${observed.materializedAstNodes}`]
      : []),
    ...(observed.targetBytes > TARGET_BYTES_LIMIT ? [`targetBytes:${observed.targetBytes}`] : []),
    ...(observed.projectedChunkBytes > PROJECTED_CHUNK_BYTES_LIMIT
      ? [`projectedChunkBytes:${observed.projectedChunkBytes}`]
      : []),
  ]
  assert(!violations.length, `size gate failed ${violations.join(',')}`)

  const pendingByPhase = { P3: 0, P4: 0, P5: 0, P6: 0 }
  for (const body of retainedBodies) {
    if (body.status.kind === 'resolved-entity-behavior') continue
    pendingByPhase[body.status.work.phase]++
  }
  assert(
    isDeepStrictEqual(pendingByPhase, { P3: 0, P4: 7_055, P5: 433, P6: 14 }),
    `pending phase drift ${JSON.stringify(pendingByPhase)}`,
  )

  const irWithoutDigest: Omit<ScriptMigrationIRP3, 'digest'> = {
    kind: 'script-migration-ir',
    version: 1,
    throughPhase: 'P3',
    generatorEpoch: 'n3-script-v5-p3-v1',
    canonical: false,
    runtimeConsumable: false,
    sourceAudit: clone(args.p2.sourceAudit),
    previousPhase: {
      irDigest: args.p2.digest,
      ledgerDigest: args.p2Ledger.digest,
    },
    source: clone(args.p2.source),
    commandCensus: clone(args.p2.commandCensus),
    commandSites: clone(args.p2.commandSites),
    commandTransition: clone(args.p2.commandTransition),
    retainedBodies,
    tombstones: clone(args.p2.tombstones),
    ownerResolutions: clone(args.p2.ownerResolutions),
    flowStructures: structures,
    flowCensus,
    sizeGates: {
      limits: {
        materializedAstNodes: MATERIALIZED_AST_LIMIT,
        targetBytes: TARGET_BYTES_LIMIT,
        projectedChunkBytes: PROJECTED_CHUNK_BYTES_LIMIT,
      },
      observed,
      projectedChunks,
      violations,
    },
    pendingByPhase,
  }
  const ir = digestRecord<ScriptMigrationIRP3>(irWithoutDigest)
  const ledger = buildLedger({
    p2: args.p2,
    p2Ledger: args.p2Ledger,
    irWithoutDigest,
    structures,
  })
  return { ir, ledger }
}
