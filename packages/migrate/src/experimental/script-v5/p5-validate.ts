import { isDeepStrictEqual } from 'node:util'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { buildP5ScriptMigrationIR } from './p5-cycle-structure.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'
import type {
  P4AuthorOwnerIdentity,
  P5TransitionRewrite,
  P5ValidationReport,
  ScriptMigrationIRP4,
  ScriptMigrationIRP5,
  ScriptTransitionLedgerDraftP4,
  ScriptTransitionLedgerDraftP5,
} from './types.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`P5 validation: ${message}`)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function ownerKey(identity: P4AuthorOwnerIdentity): string {
  return identity.kind === 'entity-behavior'
    ? `entity:${identity.sceneId}:${identity.entityId}:${identity.channel}:${identity.behaviorId}`
    : `hook:${identity.sceneId}:${identity.slot}:${identity.hookId}`
}

function rewriteKey(
  representation: P5TransitionRewrite['source']['representation'],
  legacyScriptId: string,
  pointer: string,
): string {
  return `${representation}:${legacyScriptId}#${pointer}`
}

function reverseBody(
  body: readonly unknown[],
  representation: P5TransitionRewrite['source']['representation'],
  legacyScriptId: string,
  rewrites: ReadonlyMap<string, P5TransitionRewrite>,
): unknown[] {
  const visit = (value: unknown, pointer: string): unknown => {
    const rewrite = rewrites.get(rewriteKey(representation, legacyScriptId, pointer))
    if (rewrite) {
      assert(
        isDeepStrictEqual(value, rewrite.after),
        `rewritten command drift ${representation}:${legacyScriptId}#${pointer}`,
      )
      return clone(rewrite.before)
    }
    if (Array.isArray(value))
      return value.map((child, index) => visit(child, `${pointer}/${index}`))
    if (!isRecord(value)) return value
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        visit(child, `${pointer}/${pointerToken(key)}`),
      ]),
    )
  }
  return visit(body, '') as unknown[]
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

function collectLegacyJumpTargets(value: unknown): string[] {
  const targets: string[] = []
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    if (!isRecord(node)) return
    if (node.kind === 'jumpScript' && isRecord(node.ref) && typeof node.ref.id === 'string')
      targets.push(node.ref.id)
    for (const [key, child] of Object.entries(node)) {
      if (key !== 'ref') visit(child)
    }
  }
  visit(value)
  return targets
}

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

export function validateP5ScriptMigrationIR(args: {
  frozenAudit: ScriptControlFlowAuditV1
  p4: ScriptMigrationIRP4
  p4Ledger: ScriptTransitionLedgerDraftP4
  ir: ScriptMigrationIRP5
  ledger: ScriptTransitionLedgerDraftP5
  throughPhase: 'P5'
}): P5ValidationReport {
  assert(args.throughPhase === 'P5', 'phase mismatch')
  assert(args.ir.throughPhase === 'P5', 'IR phase mismatch')
  assert(args.ledger.throughPhase === 'P5', 'ledger phase mismatch')
  assert(args.ir.canonical === false, 'IR must remain non-canonical')
  assert(args.ir.runtimeConsumable === false, 'IR must remain non-runtime-consumable')
  assert(args.ir.digest === digestWithoutSelf(args.ir), 'IR self digest mismatch')
  assert(args.ledger.digest === digestWithoutSelf(args.ledger), 'ledger self digest mismatch')
  assert(
    args.ir.previousPhase.irDigest === args.p4.digest &&
      args.ir.previousPhase.ledgerDigest === args.p4Ledger.digest,
    'IR previous phase mismatch',
  )
  assert(
    args.ledger.previousPhase.irDigest === args.p4.digest &&
      args.ledger.previousPhase.ledgerDigest === args.p4Ledger.digest,
    'ledger previous phase mismatch',
  )
  assert(
    args.ir.sourceAudit.digest === args.frozenAudit.digest &&
      args.ledger.sourceAudit.digest === args.frozenAudit.digest,
    'source audit drift',
  )

  const expected = buildP5ScriptMigrationIR({
    frozenAudit: args.frozenAudit,
    p4: args.p4,
    p4Ledger: args.p4Ledger,
  })
  assert(isDeepStrictEqual(args.ir, expected.ir), 'IR differs from corpus recomputation')
  assert(
    isDeepStrictEqual(args.ledger, expected.ledger),
    'ledger differs from corpus recomputation',
  )

  assert(args.ir.cycleStructures.length === 331, 'cycle structure count mismatch')
  assert(
    args.ir.cycleStructures.reduce((total, structure) => total + structure.bodies.length, 0) ===
      433,
    'cycle body count mismatch',
  )
  assert(args.ir.transitionRewrites.length === 1_286, 'transition rewrite count mismatch')
  assert(args.ir.retainedBodies.length === 31, 'P6 retained body count mismatch')
  assert(args.ledger.entries.length === 17_291, 'ledger entry count mismatch')
  assert(args.ledger.groups.length === 5_620, 'ledger group count mismatch')
  assert(args.ledger.evidence.length === 8_965, 'ledger evidence count mismatch')
  assert(args.ledger.pending.length === 31, 'ledger pending count mismatch')
  assert(
    isDeepStrictEqual(args.ir.pendingByPhase, { P5: 0, P6: 31 }),
    'pending phase conservation mismatch',
  )

  const rewriteByCell = new Map<string, P5TransitionRewrite>()
  for (const rewrite of args.ir.transitionRewrites) {
    const key = rewriteKey(
      rewrite.source.representation,
      rewrite.source.legacyScriptId,
      rewrite.source.pointer,
    )
    assert(!rewriteByCell.has(key), `duplicate rewrite source ${key}`)
    rewriteByCell.set(key, rewrite)
    assert(
      rewrite.after.cancellation === 'required' &&
        rewrite.after.worldClockAdvanceMs === 0 &&
        rewrite.after.continuation === 'terminate-current-segment',
      `invalid generated flow exit ${key}`,
    )
    assert(
      rewrite.after.scheduling === (rewrite.backEdge ? 'worldTick' : 'macroTask'),
      `flow exit scheduling mismatch ${key}`,
    )
  }

  const p4OwnerFragments = new Map(
    args.p4.ownerFragments.map((fragment) => [fragment.legacyScriptId, fragment]),
  )
  const p4FlowStructures = new Map(
    args.p4.flowStructures.map((structure) => [structure.target.legacyScriptId, structure]),
  )
  for (const fragment of args.ir.ownerFragments) {
    const previous = p4OwnerFragments.get(fragment.legacyScriptId)
    assert(previous, `previous owner fragment missing ${fragment.legacyScriptId}`)
    assert(
      isDeepStrictEqual(
        reverseBody(fragment.body, 'owner-fragment', fragment.legacyScriptId, rewriteByCell),
        previous.body,
      ),
      `owner fragment is not reversible ${fragment.legacyScriptId}`,
    )
  }
  for (const structure of args.ir.flowStructures) {
    const previous = p4FlowStructures.get(structure.target.legacyScriptId)
    assert(previous, `previous flow structure missing ${structure.target.legacyScriptId}`)
    assert(
      isDeepStrictEqual(
        reverseBody(
          structure.target.body,
          'flow-structure',
          structure.target.legacyScriptId,
          rewriteByCell,
        ),
        previous.target.body,
      ),
      `flow structure is not reversible ${structure.target.legacyScriptId}`,
    )
  }
  const p4CycleBodies = new Map(
    args.p4.retainedBodies
      .filter((body) => body.status.work.phase === 'P5')
      .map((body) => [body.legacyScriptId, body]),
  )
  const projectedCycleIds = new Set<string>()
  for (const structure of args.ir.cycleStructures) {
    for (const body of structure.bodies) {
      assert(
        !projectedCycleIds.has(body.legacyScriptId),
        `cycle body copied ${body.legacyScriptId}`,
      )
      projectedCycleIds.add(body.legacyScriptId)
      const previous = p4CycleBodies.get(body.legacyScriptId)
      assert(previous, `previous cycle body missing ${body.legacyScriptId}`)
      assert(
        isDeepStrictEqual(
          reverseBody(body.loweredBody, 'cycle-body', body.legacyScriptId, rewriteByCell),
          previous.body,
        ),
        `cycle body is not reversible ${body.legacyScriptId}`,
      )
    }
  }
  assert(projectedCycleIds.size === 433, 'cycle body coverage mismatch')
  const p4P6Ids = args.p4.retainedBodies
    .filter((body) => body.status.work.phase === 'P6')
    .map((body) => body.legacyScriptId)
    .sort(stableStringCompare)
  assert(
    isDeepStrictEqual(
      args.ir.retainedBodies.map((body) => body.legacyScriptId).sort(stableStringCompare),
      p4P6Ids,
    ),
    'P6 retained bodies changed',
  )
  const reversibleBodies =
    args.ir.ownerFragments.length +
    args.ir.flowStructures.length +
    projectedCycleIds.size +
    args.ir.retainedBodies.length
  assert(reversibleBodies === 8_102, 'reversible body conservation mismatch')

  const cycleById = new Map(
    args.ir.cycleStructures.map((structure) => [structure.identity.cycleId, structure]),
  )
  const fragments = new Set(args.ir.ownerFragments.map((fragment) => fragment.legacyScriptId))
  let danglingFlowTargets = 0
  for (const rewrite of args.ir.transitionRewrites) {
    const target = rewrite.after.target
    if (target.kind === 'owner-fragment') {
      if (!fragments.has(target.legacyScriptId)) danglingFlowTargets++
      continue
    }
    const structure = cycleById.get(target.cycleId)
    if (
      !structure?.bodies.some((body) => body.legacyScriptId === target.legacyScriptId) ||
      (target.stateId !== undefined &&
        !structure.bodies.some((body) => body.stateId === target.stateId))
    )
      danglingFlowTargets++
  }
  assert(danglingFlowTargets === 0, 'dangling generated flow target')

  let duplicateStableIds = 0
  const flowIdsByOwner = new Map<string, Set<string>>()
  let authorTransitions = 0
  const authorTransitionTriggers = {
    bodyEnd: 0,
    condition: 0,
    commandOutcome: 0,
  }
  for (const structure of args.ir.cycleStructures) {
    assert(/^p5-cycle-\d{3}$/.test(structure.identity.cycleId), 'invalid generated cycle id')
    assert(structure.bodyCopies === 0, `cycle body copy ${structure.identity.cycleId}`)
    for (const ownerFlow of structure.ownerFlows) {
      const key = ownerKey(ownerFlow.identity.owner)
      const ids = flowIdsByOwner.get(key) ?? new Set<string>()
      if (ids.has(ownerFlow.identity.flowId)) duplicateStableIds++
      ids.add(ownerFlow.identity.flowId)
      flowIdsByOwner.set(key, ids)
      assert(
        /^(?:cycle|legacy-cycle-\d{3})$/.test(ownerFlow.identity.flowId),
        `unsafe stable flow id ${ownerFlow.identity.flowId}`,
      )
    }
    const stateIds = structure.bodies.flatMap((body) =>
      body.stateId === undefined ? [] : [body.stateId],
    )
    duplicateStableIds += stateIds.length - new Set(stateIds).size
    assert(
      stateIds.every((id) => /^(?:initial|legacy-\d{3})$/.test(id)),
      `unsafe stable state id ${structure.identity.cycleId}`,
    )
    const transitionIds = structure.transitions.map((transition) => transition.transitionId)
    duplicateStableIds += transitionIds.length - new Set(transitionIds).size
    assert(
      transitionIds.every((id) => /^legacy-transition-\d{3}$/.test(id)),
      `unsafe stable transition id ${structure.identity.cycleId}`,
    )
    authorTransitions += structure.transitions.length
    for (const transition of structure.transitions) {
      if (transition.trigger.kind === 'body-end') authorTransitionTriggers.bodyEnd++
      else if (transition.trigger.kind === 'condition') authorTransitionTriggers.condition++
      else authorTransitionTriggers.commandOutcome++
      const rewrite = rewriteByCell.get(
        rewriteKey('cycle-body', transition.from.legacyScriptId, transition.sourcePointer),
      )
      assert(rewrite, `author transition source missing ${transition.transitionId}`)
      assert(
        isDeepStrictEqual(transition.target, rewrite.after.target) &&
          transition.scheduling === rewrite.after.scheduling &&
          transition.cancellation === rewrite.after.cancellation &&
          transition.backEdge === rewrite.backEdge,
        `author transition lowering drift ${structure.identity.cycleId}:${transition.transitionId}`,
      )
      if (structure.kind === 'state-machine')
        assert(
          transition.from.stateId ===
            structure.bodies.find((body) => body.legacyScriptId === transition.from.legacyScriptId)
              ?.stateId,
          `author transition state drift ${structure.identity.cycleId}:${transition.transitionId}`,
        )
      else
        assert(
          transition.from.stateId === undefined,
          `non-machine transition has state ${structure.identity.cycleId}`,
        )
    }
    const projectedTransitionIds =
      structure.authorProjection.kind === 'auto-runner-repeat'
        ? [structure.authorProjection.repeatTransitionId]
        : structure.authorProjection.kind === 'structured-loop'
          ? [
              structure.authorProjection.loopTransitionId,
              ...structure.authorProjection.exitTransitionIds,
            ]
          : structure.authorProjection.states.flatMap((state) => state.transitionIds)
    assert(
      isDeepStrictEqual(
        [...projectedTransitionIds].sort(stableStringCompare),
        [...transitionIds].sort(stableStringCompare),
      ),
      `author transition projection mismatch ${structure.identity.cycleId}`,
    )
  }
  assert(duplicateStableIds === 0, 'duplicate stable flow/state id')
  assert(authorTransitions === 753, 'author transition count mismatch')
  assert(
    isDeepStrictEqual(authorTransitionTriggers, {
      bodyEnd: 230,
      condition: 522,
      commandOutcome: 1,
    }),
    'author transition trigger census mismatch',
  )

  const legacyJumpTargets = [
    ...args.ir.ownerFragments.flatMap((fragment) => collectLegacyJumpTargets(fragment.body)),
    ...args.ir.flowStructures.flatMap((structure) =>
      collectLegacyJumpTargets(structure.target.body),
    ),
    ...args.ir.cycleStructures.flatMap((structure) =>
      structure.bodies.flatMap((body) => collectLegacyJumpTargets(body.loweredBody)),
    ),
    ...args.ir.retainedBodies.flatMap((body) => collectLegacyJumpTargets(body.body)),
  ]
  const deferredP6Ids = new Set(args.ir.retainedBodies.map((body) => body.legacyScriptId))
  assert(legacyJumpTargets.length === 11, 'legacy jump count after P5 mismatch')
  assert(
    legacyJumpTargets.every(
      (target) => deferredP6Ids.has(target) || target.startsWith('ir/p2/pending/'),
    ),
    'non-P6 legacy jump survived P5',
  )
  const generatedExitCount =
    args.ir.ownerFragments.reduce(
      (total, fragment) => total + countKind(fragment.body, 'n3P5FlowExit'),
      0,
    ) +
    args.ir.flowStructures.reduce(
      (total, structure) => total + countKind(structure.target.body, 'n3P5FlowExit'),
      0,
    ) +
    args.ir.cycleStructures.reduce(
      (total, structure) =>
        total +
        structure.bodies.reduce(
          (bodyTotal, body) => bodyTotal + countKind(body.loweredBody, 'n3P5FlowExit'),
          0,
        ),
      0,
    )
  assert(generatedExitCount === 1_286, 'generated flow exit count mismatch')

  const autoRunnerRepeat = args.ir.cycleStructures.filter(
    (structure) => structure.kind === 'auto-runner-repeat',
  )
  const structuredLoops = args.ir.cycleStructures.filter(
    (structure) => structure.kind === 'structured-loop',
  )
  const stateMachines = args.ir.cycleStructures.filter(
    (structure) => structure.kind === 'state-machine',
  )
  assert(autoRunnerRepeat.length === 99, 'auto-runner repeat count mismatch')
  assert(structuredLoops.length === 162, 'structured loop count mismatch')
  assert(stateMachines.length === 70, 'state machine count mismatch')
  assert(
    stateMachines.reduce((total, structure) => total + structure.bodies.length, 0) === 172,
    'state machine state count mismatch',
  )
  for (const structure of autoRunnerRepeat)
    assert(
      structure.authorProjection.kind === 'auto-runner-repeat' &&
        structure.authorProjection.yield === 'worldTick' &&
        structure.owners.every(
          (owner) => owner.kind === 'entity-behavior' && owner.channel === 'auto',
        ),
      `invalid auto-runner projection ${structure.identity.cycleId}`,
    )
  for (const structure of structuredLoops)
    assert(
      structure.authorProjection.kind === 'structured-loop' &&
        structure.authorProjection.loop.yield === 'worldTick' &&
        structure.authorProjection.loop.maxIterations === 10_000,
      `invalid structured loop ${structure.identity.cycleId}`,
    )

  const crossOwner = args.ir.cycleStructures.filter((structure) => structure.owners.length > 1)
  assert(crossOwner.length === 3, 'cross-owner cycle count mismatch')
  assert(
    crossOwner.every(
      (structure) =>
        structure.bodyCopies === 0 &&
        new Set(structure.bodies.map((body) => body.legacyScriptId)).size ===
          structure.bodies.length,
    ),
    'cross-owner cycle copied body',
  )
  const nestedOutcomeTransitions = args.ir.cycleStructures.reduce(
    (total, structure) => total + structure.nestedOutcomeTransitions,
    0,
  )
  assert(nestedOutcomeTransitions === 1, 'nested outcome transition count mismatch')
  const pendingUnknown = args.ir.retainedBodies.filter(
    (body) => body.status.work.phase !== 'P6',
  ).length
  assert(pendingUnknown === 0, 'unknown pending phase')

  return {
    kind: 'script-migration-phase-validation',
    version: 1,
    throughPhase: 'P5',
    sourceAuditDigest: args.frozenAudit.digest,
    checks: {
      sourceAuditFrozen: true,
      previousPhaseFrozen: true,
      cycleComponents: args.ir.cycleStructures.length,
      cycleBodies: projectedCycleIds.size,
      autoRunnerRepeat: autoRunnerRepeat.length,
      structuredLoops: structuredLoops.length,
      stateMachines: stateMachines.length,
      stateMachineStates: stateMachines.reduce(
        (total, structure) => total + structure.bodies.length,
        0,
      ),
      transitionRewrites: args.ir.transitionRewrites.length,
      backEdges: args.ir.transitionRewrites.filter((rewrite) => rewrite.backEdge).length,
      legacyJumpCommands: legacyJumpTargets.length,
      deferredP6JumpCommands: legacyJumpTargets.length,
      reversibleBodies,
      duplicateStableIds,
      danglingFlowTargets,
      crossOwnerCopies: 0,
      nestedOutcomeTransitions,
      authorTransitions,
      pendingP5: args.ir.pendingByPhase.P5,
      pendingUnknown,
    },
    digest: stableJsonSha256({
      sourceAuditDigest: args.frozenAudit.digest,
      irDigest: args.ir.digest,
      ledgerDigest: args.ledger.digest,
      cycleCensus: args.ir.cycleCensus,
      pendingByPhase: args.ir.pendingByPhase,
    }),
  }
}
