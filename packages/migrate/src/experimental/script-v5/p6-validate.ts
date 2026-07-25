import { isDeepStrictEqual } from 'node:util'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { buildP6ScriptMigrationIR } from './p6-shared-closure.js'
import { digestRecord, stableJsonSha256, stableStringCompare } from './stable-json.js'
import type {
  P4AuthorOwnerIdentity,
  P6ValidationReport,
  ScriptMigrationIRP5,
  ScriptMigrationIRP6,
  ScriptTransitionLedgerDraftP5,
  ScriptTransitionLedgerDraftP6,
} from './types.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`P6 validation: ${message}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function countKind(value: unknown, kind: string): number {
  if (Array.isArray(value)) return value.reduce((total, child) => total + countKind(child, kind), 0)
  if (!isRecord(value)) return 0
  return (
    (value.kind === kind ? 1 : 0) +
    Object.entries(value).reduce(
      (total, [key, child]) => total + (key === 'ref' ? 0 : countKind(child, kind)),
      0,
    )
  )
}

function ownerKey(identity: P4AuthorOwnerIdentity): string {
  return identity.kind === 'entity-behavior'
    ? `entity:${identity.sceneId}:${identity.entityId}:${identity.channel}:${identity.behaviorId}`
    : `hook:${identity.sceneId}:${identity.slot}:${identity.hookId}`
}

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

export function validateP6ScriptMigrationIR(args: {
  frozenAudit: ScriptControlFlowAuditV1
  p5: ScriptMigrationIRP5
  p5Ledger: ScriptTransitionLedgerDraftP5
  ir: ScriptMigrationIRP6
  ledger: ScriptTransitionLedgerDraftP6
  throughPhase: 'P6'
}): P6ValidationReport {
  assert(args.throughPhase === 'P6', 'phase mismatch')
  assert(args.ir.throughPhase === 'P6', 'IR phase mismatch')
  assert(args.ledger.throughPhase === 'P6', 'ledger phase mismatch')
  assert(args.ir.canonical === false, 'IR must remain non-canonical')
  assert(args.ir.runtimeConsumable === false, 'IR must remain non-runtime-consumable')
  assert(args.ir.digest === digestWithoutSelf(args.ir), 'IR self digest mismatch')
  assert(args.ledger.digest === digestWithoutSelf(args.ledger), 'ledger self digest mismatch')
  assert(
    args.ir.previousPhase.irDigest === args.p5.digest &&
      args.ir.previousPhase.ledgerDigest === args.p5Ledger.digest,
    'IR previous phase mismatch',
  )
  assert(
    args.ledger.previousPhase.irDigest === args.p5.digest &&
      args.ledger.previousPhase.ledgerDigest === args.p5Ledger.digest,
    'ledger previous phase mismatch',
  )
  assert(
    args.ir.sourceAudit.digest === args.frozenAudit.digest &&
      args.ledger.sourceAudit.digest === args.frozenAudit.digest,
    'source audit drift',
  )

  const expected = buildP6ScriptMigrationIR({
    frozenAudit: args.frozenAudit,
    p5: args.p5,
    p5Ledger: args.p5Ledger,
  })
  assert(isDeepStrictEqual(args.ir, expected.ir), 'IR differs from corpus recomputation')
  assert(
    isDeepStrictEqual(args.ledger, expected.ledger),
    'ledger differs from corpus recomputation',
  )

  assert(args.ir.retainedBodies.length === 0, 'retained P6 body remains')
  assert(args.ir.pendingOwnerLinks.length === 0, 'pending owner link remains')
  assert(isDeepStrictEqual(args.ir.pendingByPhase, { P6: 0 }), 'pending P6 remains')
  assert(args.ledger.pending.length === 0, 'ledger pending remains')
  assert(args.ir.sharedAuthorScripts.length === 0, 'non-generic shared author script remains')
  assert(args.ir.localSourceBodies.length === 21, 'local source count mismatch')
  assert(args.ir.localFlows.length === 42, 'local flow allocation mismatch')
  assert(args.ir.itemPrivateClosures.length === 4, 'item private closure mismatch')
  assert(
    args.ir.itemPrivateScripts.length === 6 &&
      args.ir.itemPrivateClosures.reduce((total, closure) => total + closure.scripts.length, 0) ===
        6,
    'item private script mismatch',
  )
  assert(args.ir.callInlineRewrites.length === 574, 'local call inline mismatch')
  assert(args.ir.flowExitRewrites.length === 5, 'local flow exit mismatch')
  assert(args.ir.sharedTailClassifications.length === 532, 'shared tail coverage mismatch')
  assert(args.ir.misleadingSccRetirements.length === 13, 'misleading SCC coverage mismatch')

  const activeBodies: unknown[] = [
    ...args.ir.ownerFragments.map((fragment) => fragment.body),
    ...args.ir.flowStructures.map((structure) => structure.target.body),
    ...args.ir.cycleStructures.flatMap((structure) =>
      structure.bodies.map((body) => body.loweredBody),
    ),
    ...args.ir.localFlows.map((flow) => flow.authorBody),
    ...args.ir.itemPrivateScripts.map((script) => script.authorBody),
    ...args.ir.itemPrivateClosures.map((closure) => closure.analysis),
  ]
  const internalCallCommands = activeBodies.reduce<number>(
    (total, body) => total + countKind(body, 'callScript'),
    0,
  )
  const legacyJumpCommands = activeBodies.reduce<number>(
    (total, body) => total + countKind(body, 'jumpScript'),
    0,
  )
  assert(internalCallCommands === 0, 'internal callScript remains in author projection')
  assert(legacyJumpCommands === 0, 'legacy jumpScript remains in author projection')
  assert(
    args.ir.callInlineRewrites.every(
      (rewrite) =>
        rewrite.callReturn === 'preserved' &&
        countKind(rewrite.afterBody, 'callScript') === 0 &&
        (rewrite.compatibilityBoundaryAfterMs === 0 ||
          rewrite.compatibilityBoundaryAfterMs === 100),
    ),
    'call inline semantic evidence mismatch',
  )
  assert(
    args.ir.callInlineRewrites.filter((rewrite) => rewrite.compatibilityBoundaryAfterMs === 100)
      .length === 22,
    'auto call compatibility boundary mismatch',
  )
  assert(
    args.ir.flowExitRewrites.every(
      (rewrite) =>
        rewrite.after.scheduling === 'macroTask' &&
        rewrite.after.worldClockAdvanceMs === 0 &&
        rewrite.after.cancellation === 'required' &&
        rewrite.after.continuation === 'terminate-current-segment',
    ),
    'local flow exit contract mismatch',
  )

  const localFlowKeys = new Set<string>()
  let duplicateStableIds = 0
  for (const flow of args.ir.localFlows) {
    const key = `${ownerKey(flow.identity.owner)}:${flow.identity.flowId}`
    if (localFlowKeys.has(key)) duplicateStableIds++
    localFlowKeys.add(key)
    assert(
      /^legacy-continuation-\d{3}$/.test(flow.identity.flowId),
      `unsafe local flow id ${flow.identity.flowId}`,
    )
  }
  const itemPrivateKeys = args.ir.itemPrivateScripts.map(
    (script) => `${script.identity.itemId}:${script.identity.scriptId}`,
  )
  duplicateStableIds += itemPrivateKeys.length - new Set(itemPrivateKeys).size
  assert(duplicateStableIds === 0, 'duplicate P6 stable id')

  let danglingLocalFlows = 0
  for (const rewrite of args.ir.flowExitRewrites) {
    const key = `${ownerKey(rewrite.after.target.owner)}:${rewrite.after.target.flowId}`
    if (!localFlowKeys.has(key)) danglingLocalFlows++
  }
  assert(danglingLocalFlows === 0, 'dangling local flow target')

  const p5BodyIds = [
    ...args.p5.ownerFragments.map((fragment) => fragment.legacyScriptId),
    ...args.p5.flowStructures.map((structure) => structure.target.legacyScriptId),
    ...args.p5.cycleStructures.flatMap((structure) =>
      structure.bodies.map((body) => body.legacyScriptId),
    ),
    ...args.p5.retainedBodies.map((body) => body.legacyScriptId),
  ].sort(stableStringCompare)
  const p6BodyIds = [
    ...args.ir.ownerFragments.map((fragment) => fragment.legacyScriptId),
    ...args.ir.flowStructures.map((structure) => structure.target.legacyScriptId),
    ...args.ir.cycleStructures.flatMap((structure) =>
      structure.bodies.map((body) => body.legacyScriptId),
    ),
    ...args.ir.localSourceBodies.map((body) => body.legacyScriptId),
    ...args.ir.itemPrivateClosures.flatMap((closure) =>
      closure.sourceBodies.map((body) => body.legacyScriptId),
    ),
  ].sort(stableStringCompare)
  assert(
    p6BodyIds.length === 8_102 &&
      new Set(p6BodyIds).size === 8_102 &&
      isDeepStrictEqual(p6BodyIds, p5BodyIds),
    'reversible body conservation mismatch',
  )

  const misleadingActiveSccIdentities = [
    ...args.ir.ownerFragments.map((fragment) => fragment.legacyScriptId),
    ...args.ir.flowStructures.map((structure) => structure.target.legacyScriptId),
  ].filter((id) => id.startsWith('shared/scc-')).length
  assert(misleadingActiveSccIdentities === 0, 'active misleading SCC identity remains')
  const bridgeAuthorRoots = [
    ...args.ir.ownerFragments.map((fragment) => fragment.legacyScriptId),
    ...args.ir.flowStructures.map((structure) => structure.target.legacyScriptId),
  ].filter((id) => id.startsWith('shared/user/pal-item-use/')).length
  assert(bridgeAuthorRoots === 0, 'item author bridge root remains')

  const expectedCensus = {
    retainedInput: 31,
    retainedOutput: 0,
    localSourceBodies: 21,
    localFlowAllocations: 42,
    localBodyCopies: 21,
    itemPrivateScripts: 6,
    itemPrivateClosures: 4,
    sharedAuthorScripts: 0,
    sharedTails: {
      input: 532,
      p5CycleStructure: 433,
      p4NamedOwner: 80,
      p6OwnerLocal: 17,
      p6ItemPrivate: 2,
      sharedAuthorScript: 0,
      unknown: 0,
    },
    internalCalls: {
      input: 580,
      inlinedLocal: 574,
      absorbedItemBridges: 6,
      autoCompatibilityBoundaries: 22,
      remaining: 0,
    },
    legacyJumps: {
      input: 11,
      rewrittenLocal: 5,
      absorbedItemPrivate: 6,
      remaining: 0,
    },
    misleadingScc: { input: 13, active: 0, provenanceOnly: 13 },
    authorRoots: { input: 6, bridgeShells: 0, itemPrivate: 6, shared: 0 },
    reversibleBodies: 8102,
    unknown: 0,
  } as const
  assert(isDeepStrictEqual(args.ir.closureCensus, expectedCensus), 'closure census drift')

  return digestRecord<P6ValidationReport>({
    kind: 'script-migration-phase-validation',
    version: 1,
    throughPhase: 'P6',
    sourceAuditDigest: args.frozenAudit.digest,
    checks: {
      sourceAuditFrozen: true,
      previousPhaseFrozen: true,
      retainedBodies: 0,
      localSourceBodies: args.ir.localSourceBodies.length,
      localFlowAllocations: args.ir.localFlows.length,
      itemPrivateScripts: itemPrivateKeys.length,
      sharedAuthorScripts: args.ir.sharedAuthorScripts.length,
      sharedTailsClassified: args.ir.sharedTailClassifications.length,
      internalCallCommands,
      legacyJumpCommands,
      misleadingActiveSccIdentities,
      bridgeAuthorRoots,
      reversibleBodies: p6BodyIds.length,
      duplicateStableIds,
      danglingLocalFlows,
      pendingP6: 0,
      pendingUnknown: 0,
    },
  })
}
