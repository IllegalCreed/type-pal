import { isDeepStrictEqual } from 'node:util'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { legacyAuthorCellSha256 } from './source-v4.js'
import { digestRecord, stableStringCompare } from './stable-json.js'
import type {
  LegacyScriptIdentity,
  P4AuthorOwnerIdentity,
  P4OwnerFragment,
  P4RetainedBody,
  P5AuthorCycleProjection,
  P5AuthorTransitionAllocation,
  P5AuthorTransitionTrigger,
  P5CycleBodyProjection,
  P5CycleCensus,
  P5CycleStructure,
  P5CycleTransitionEvidence,
  P5CycleTransitionGroup,
  P5FlowExitTarget,
  P5GeneratedFlowExit,
  P5OwnerFlowAllocation,
  P5OwnerFlowIdentity,
  P5PendingTransition,
  P5RepresentationCellIdentity,
  P5ResolvedSelf,
  P5RetainedBody,
  P5TransitionEntry,
  P5TransitionRewrite,
  ScriptMigrationIRP4,
  ScriptMigrationIRP5,
  ScriptTransitionLedgerDraftP4,
  ScriptTransitionLedgerDraftP5,
} from './types.js'

const MAX_LOOP_ITERATIONS = 10_000 as const

interface JumpSite {
  representation: 'owner-fragment' | 'flow-structure' | 'cycle-body'
  legacyScriptId: string
  pointer: string
  command: Record<string, unknown>
  targetLegacyScriptId: string
}

interface CycleDraft {
  componentOrdinal: number
  productComponentId: number
  cycleId: string
  groupId: string
  bodies: P4RetainedBody[]
  owners: P4AuthorOwnerIdentity[]
  ownerFlows: P5OwnerFlowAllocation[]
  kind: P5CycleStructure['kind']
  stateIds: Map<string, string>
  entryLegacyScriptIds: string[]
}

interface GroupDraft {
  kind: P5CycleTransitionGroup['kind']
  id: string
  transformId: P5CycleTransitionGroup['transformId']
  sources: Map<string, P5CycleTransitionGroup['sources'][number]>
  targets: Map<string, P5CycleTransitionGroup['targets'][number]>
  cycleBodyCount: number
  transitionRewriteCount: number
  ownerFlowCount: number
  dependsOn: Set<string>
}

export interface P5TransformResult {
  ir: ScriptMigrationIRP5
  ledger: ScriptTransitionLedgerDraftP5
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`P5 transform: ${message}`)
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

function ownerFlowKey(identity: P5OwnerFlowIdentity): string {
  return `${ownerKey(identity.owner)}:${identity.flowId}`
}

function representationCellKey(identity: P5RepresentationCellIdentity): string {
  return `${identity.representation}:${identity.scriptId}#${identity.pointer}`
}

function sourceIdentityKey(identity: LegacyScriptIdentity | P5RepresentationCellIdentity): string {
  return identity.kind === 'legacy-script'
    ? `legacy-script:${identity.id}`
    : `p4-representation-cell:${representationCellKey(identity)}`
}

function targetIdentityKey(
  identity: P5CycleTransitionGroup['targets'][number] | P5CycleStructure['identity'],
): string {
  if (identity.kind === 'cycle-structure') return `cycle:${identity.cycleId}`
  if (identity.kind === 'owner-flow') return `owner-flow:${ownerFlowKey(identity)}`
  return `p4-representation-cell:${representationCellKey(identity)}`
}

export function allocateP5FlowId(index: number): string {
  if (!Number.isInteger(index) || index < 0)
    throw new Error(`P5 flow allocation: invalid owner-local index ${index}`)
  return index === 0 ? 'cycle' : `legacy-cycle-${String(index + 1).padStart(3, '0')}`
}

export function allocateP5StateId(index: number): string {
  if (!Number.isInteger(index) || index < 0)
    throw new Error(`P5 state allocation: invalid component-local index ${index}`)
  return index === 0 ? 'initial' : `legacy-${String(index + 1).padStart(3, '0')}`
}

export function allocateP5TransitionId(index: number): string {
  if (!Number.isInteger(index) || index < 0)
    throw new Error(`P5 transition allocation: invalid component-local index ${index}`)
  return `legacy-transition-${String(index + 1).padStart(3, '0')}`
}

function collectJumpSites(
  value: unknown,
  representation: JumpSite['representation'],
  legacyScriptId: string,
): JumpSite[] {
  const sites: JumpSite[] = []
  const visit = (node: unknown, pointer: string): void => {
    if (Array.isArray(node)) {
      for (const [index, child] of node.entries()) visit(child, `${pointer}/${index}`)
      return
    }
    if (!isRecord(node)) return
    if (node.kind === 'jumpScript' && isRecord(node.ref) && typeof node.ref.id === 'string')
      sites.push({
        representation,
        legacyScriptId,
        pointer,
        command: node,
        targetLegacyScriptId: node.ref.id,
      })
    for (const [key, child] of Object.entries(node)) {
      if (key === 'ref') continue
      visit(child, `${pointer}/${pointerToken(key)}`)
    }
  }
  visit(value, '')
  return sites
}

function exactTailSelfJump(body: readonly unknown[], legacyScriptId: string): boolean {
  const sites = collectJumpSites(body, 'cycle-body', legacyScriptId).filter(
    (site) => site.targetLegacyScriptId === legacyScriptId,
  )
  const tail = body.at(-1)
  return (
    sites.length === 1 &&
    sites[0]!.pointer === `/${body.length - 1}` &&
    isRecord(tail) &&
    tail.kind === 'jumpScript'
  )
}

function simpleConditionalSelfJump(
  body: readonly unknown[],
  legacyScriptId: string,
): { branchIndex: number; condition: unknown } | undefined {
  const sites = collectJumpSites(body, 'cycle-body', legacyScriptId).filter(
    (site) => site.targetLegacyScriptId === legacyScriptId,
  )
  if (sites.length !== 1) return undefined
  const match = /^\/(\d+)\/then\/0$/.exec(sites[0]!.pointer)
  if (!match) return undefined
  const branchIndex = Number(match[1])
  const branch = body[branchIndex]
  if (
    !isRecord(branch) ||
    branch.kind !== 'branch' ||
    !Array.isArray(branch.then) ||
    branch.then.length !== 1 ||
    branch.else !== undefined ||
    branch.cond === undefined
  )
    return undefined
  return { branchIndex, condition: branch.cond }
}

export function classifyP5CycleShape(args: {
  componentSize: number
  body: readonly unknown[]
  legacyScriptId: string
  owners: readonly P4AuthorOwnerIdentity[]
}): P5CycleStructure['kind'] {
  if (!Number.isInteger(args.componentSize) || args.componentSize < 1)
    throw new Error(`P5 cycle classification: invalid component size ${args.componentSize}`)
  if (!args.owners.length) throw new Error('P5 cycle classification: missing owner')
  if (args.componentSize !== 1) return 'state-machine'
  if (
    exactTailSelfJump(args.body, args.legacyScriptId) &&
    args.owners.every((owner) => owner.kind === 'entity-behavior' && owner.channel === 'auto')
  )
    return 'auto-runner-repeat'
  if (simpleConditionalSelfJump(args.body, args.legacyScriptId)) return 'structured-loop'
  return 'state-machine'
}

function rewriteKey(
  representation: P5TransitionRewrite['source']['representation'],
  legacyScriptId: string,
  pointer: string,
): string {
  return `${representation}:${legacyScriptId}#${pointer}`
}

function rewriteBody(
  body: readonly unknown[],
  representation: P5TransitionRewrite['source']['representation'],
  legacyScriptId: string,
  rewrites: ReadonlyMap<string, P5TransitionRewrite>,
): unknown[] {
  const visit = (value: unknown, pointer: string): unknown => {
    const rewrite = rewrites.get(rewriteKey(representation, legacyScriptId, pointer))
    if (rewrite) {
      assert(
        isDeepStrictEqual(value, rewrite.before),
        `rewrite source drift ${representation}:${legacyScriptId}#${pointer}`,
      )
      return clone(rewrite.after)
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

function uniqueOwners(owners: readonly P4AuthorOwnerIdentity[]): P4AuthorOwnerIdentity[] {
  return [...new Map(owners.map((owner) => [ownerKey(owner), clone(owner)])).values()].sort(
    (left, right) => stableStringCompare(ownerKey(left), ownerKey(right)),
  )
}

function createGroup(
  groups: Map<string, GroupDraft>,
  id: string,
  kind: GroupDraft['kind'],
  transformId: GroupDraft['transformId'],
): GroupDraft {
  const existing = groups.get(id)
  if (existing) {
    assert(existing.kind === kind && existing.transformId === transformId, `group kind drift ${id}`)
    return existing
  }
  const group: GroupDraft = {
    kind,
    id,
    transformId,
    sources: new Map(),
    targets: new Map(),
    cycleBodyCount: 0,
    transitionRewriteCount: 0,
    ownerFlowCount: 0,
    dependsOn: new Set(),
  }
  groups.set(id, group)
  return group
}

function addSource(
  group: GroupDraft,
  identity: LegacyScriptIdentity | P5RepresentationCellIdentity,
  baseCellSha256: string,
): void {
  const key = sourceIdentityKey(identity)
  const previous = group.sources.get(key)
  if (previous) {
    assert(previous.baseCellSha256 === baseCellSha256, `source hash drift ${key}`)
    return
  }
  group.sources.set(key, { identity: clone(identity), baseCellSha256 })
}

function addTarget(group: GroupDraft, target: P5CycleTransitionGroup['targets'][number]): void {
  group.targets.set(targetIdentityKey(target), clone(target))
}

function resolveSelf(
  command: Readonly<Record<string, unknown>>,
  entityScenes: ReadonlyMap<string, string>,
): P5ResolvedSelf | undefined {
  if (command.self === undefined) return undefined
  assert(typeof command.self === 'string', 'jump self must be a string')
  const sceneId = entityScenes.get(command.self)
  assert(sceneId, `jump self owner missing ${command.self}`)
  return { sceneId, entityId: command.self }
}

function legacyJumpCount(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((total, child) => total + legacyJumpCount(child), 0)
  if (!isRecord(value)) return 0
  return (
    (value.kind === 'jumpScript' ? 1 : 0) +
    Object.entries(value).reduce(
      (total, [key, child]) => total + (key === 'ref' ? 0 : legacyJumpCount(child)),
      0,
    )
  )
}

function transitionTrigger(
  rewrite: P5TransitionRewrite,
  sourceBody: readonly unknown[],
): P5AuthorTransitionTrigger {
  const bodyEnd = /^\/(\d+)$/.exec(rewrite.source.pointer)
  if (bodyEnd) {
    assert(
      Number(bodyEnd[1]) === sourceBody.length - 1,
      `non-tail body exit ${rewrite.source.pointer}`,
    )
    return { kind: 'body-end' }
  }
  const condition = /^\/(\d+)\/then\/0$/.exec(rewrite.source.pointer)
  if (condition) {
    const command = sourceBody[Number(condition[1])]
    assert(
      isRecord(command) && command.kind === 'branch',
      `branch exit drift ${rewrite.source.pointer}`,
    )
    assert(command.cond !== undefined, `branch exit condition missing ${rewrite.source.pointer}`)
    return {
      kind: 'condition',
      cond: clone(command.cond),
      arm: 'then',
      fallback: 'continue',
    }
  }
  const outcome = /^\/(\d+)\/onNo\/0$/.exec(rewrite.source.pointer)
  if (outcome) {
    const command = sourceBody[Number(outcome[1])]
    assert(
      isRecord(command) && command.kind === 'confirm',
      `outcome exit drift ${rewrite.source.pointer}`,
    )
    return {
      kind: 'command-outcome',
      command: 'confirm',
      outcome: 'no',
      fallback: 'continue',
    }
  }
  throw new Error(`P5 transform: unsupported author transition site ${rewrite.source.pointer}`)
}

function cycleCensus(args: {
  p4: ScriptMigrationIRP4
  drafts: readonly CycleDraft[]
  rewrites: readonly P5TransitionRewrite[]
  structures: readonly P5CycleStructure[]
  rewrittenOwnerFragments: readonly P4OwnerFragment[]
  rewrittenFlowStructures: readonly ScriptMigrationIRP4['flowStructures'][number][]
  retainedP6: readonly P5RetainedBody[]
}): P5CycleCensus {
  const input =
    args.p4.ownerFragments.reduce((total, fragment) => total + legacyJumpCount(fragment.body), 0) +
    args.p4.flowStructures.reduce(
      (total, structure) => total + legacyJumpCount(structure.target.body),
      0,
    ) +
    args.p4.retainedBodies.reduce((total, body) => total + legacyJumpCount(body.body), 0)
  const remaining =
    args.rewrittenOwnerFragments.reduce(
      (total, fragment) => total + legacyJumpCount(fragment.body),
      0,
    ) +
    args.rewrittenFlowStructures.reduce(
      (total, structure) => total + legacyJumpCount(structure.target.body),
      0,
    ) +
    args.structures.reduce(
      (total, structure) =>
        total +
        structure.bodies.reduce(
          (bodyTotal, body) => bodyTotal + legacyJumpCount(body.loweredBody),
          0,
        ),
      0,
    ) +
    args.retainedP6.reduce((total, body) => total + legacyJumpCount(body.body), 0)
  const componentSizes = {
    size1: args.drafts.filter((draft) => draft.bodies.length === 1).length,
    size2: args.drafts.filter((draft) => draft.bodies.length === 2).length,
    size3: args.drafts.filter((draft) => draft.bodies.length === 3).length,
  }
  const ownerChannel = (draft: CycleDraft, channel: 'trigger' | 'auto'): boolean =>
    draft.owners.some((owner) => owner.kind === 'entity-behavior' && owner.channel === channel)
  const actual = {
    components: args.drafts.length,
    bodies: args.drafts.reduce((total, draft) => total + draft.bodies.length, 0),
    componentSizes,
    projections: {
      autoRunnerRepeat: args.drafts.filter((draft) => draft.kind === 'auto-runner-repeat').length,
      structuredLoops: args.drafts.filter((draft) => draft.kind === 'structured-loop').length,
      stateMachines: args.drafts.filter((draft) => draft.kind === 'state-machine').length,
      stateMachineStates: args.drafts
        .filter((draft) => draft.kind === 'state-machine')
        .reduce((total, draft) => total + draft.bodies.length, 0),
    },
    ownerChannels: {
      triggerComponents: args.drafts.filter((draft) => ownerChannel(draft, 'trigger')).length,
      autoComponents: args.drafts.filter((draft) => ownerChannel(draft, 'auto')).length,
      sceneHookComponents: args.drafts.filter((draft) =>
        draft.owners.some((owner) => owner.kind === 'scene-hook'),
      ).length,
    },
    jumpTransitions: {
      input,
      rewrittenP5: args.rewrites.length,
      cycleBody: args.rewrites.filter((rewrite) => rewrite.source.representation === 'cycle-body')
        .length,
      ownerFragment: args.rewrites.filter(
        (rewrite) => rewrite.source.representation === 'owner-fragment',
      ).length,
      flowStructure: args.rewrites.filter(
        (rewrite) => rewrite.source.representation === 'flow-structure',
      ).length,
      sccBackEdges: args.rewrites.filter((rewrite) => rewrite.backEdge).length,
      crossComponent: args.rewrites.filter(
        (rewrite) =>
          rewrite.source.representation === 'cycle-body' &&
          rewrite.after.target.kind === 'cycle' &&
          !rewrite.backEdge,
      ).length,
      ownerInboundToCycles: args.rewrites.filter(
        (rewrite) =>
          rewrite.source.representation === 'owner-fragment' &&
          rewrite.after.target.kind === 'cycle',
      ).length,
      acyclicOwnerFlow: args.rewrites.filter(
        (rewrite) =>
          rewrite.source.representation !== 'cycle-body' &&
          rewrite.after.target.kind === 'owner-fragment',
      ).length,
      deferredP6: remaining,
    },
    crossOwnerStructures: args.drafts.filter((draft) => draft.owners.length > 1).length,
    bodyCopies: 0,
    nestedOutcomeTransitions: args.rewrites.filter(
      (rewrite) =>
        rewrite.source.representation === 'cycle-body' && rewrite.source.pointer.includes('/onNo/'),
    ).length,
    authorTransitions: {
      total: args.structures.reduce((total, structure) => total + structure.transitions.length, 0),
      bodyEnd: args.structures.reduce(
        (total, structure) =>
          total +
          structure.transitions.filter((transition) => transition.trigger.kind === 'body-end')
            .length,
        0,
      ),
      condition: args.structures.reduce(
        (total, structure) =>
          total +
          structure.transitions.filter((transition) => transition.trigger.kind === 'condition')
            .length,
        0,
      ),
      commandOutcome: args.structures.reduce(
        (total, structure) =>
          total +
          structure.transitions.filter(
            (transition) => transition.trigger.kind === 'command-outcome',
          ).length,
        0,
      ),
    },
    maxIterations: MAX_LOOP_ITERATIONS,
    unknown: 0,
  }
  const expected: P5CycleCensus = {
    components: 331,
    bodies: 433,
    componentSizes: { size1: 275, size2: 10, size3: 46 },
    projections: {
      autoRunnerRepeat: 99,
      structuredLoops: 162,
      stateMachines: 70,
      stateMachineStates: 172,
    },
    ownerChannels: {
      triggerComponents: 6,
      autoComponents: 323,
      sceneHookComponents: 2,
    },
    jumpTransitions: {
      input: 1297,
      rewrittenP5: 1286,
      cycleBody: 753,
      ownerFragment: 528,
      flowStructure: 5,
      sccBackEdges: 694,
      crossComponent: 51,
      ownerInboundToCycles: 464,
      acyclicOwnerFlow: 69,
      deferredP6: 11,
    },
    crossOwnerStructures: 3,
    bodyCopies: 0,
    nestedOutcomeTransitions: 1,
    authorTransitions: {
      total: 753,
      bodyEnd: 230,
      condition: 522,
      commandOutcome: 1,
    },
    maxIterations: MAX_LOOP_ITERATIONS,
    unknown: 0,
  }
  assert(isDeepStrictEqual(actual, expected), `cycle census drift ${JSON.stringify(actual)}`)
  return expected
}

function buildLedger(args: {
  p4: ScriptMigrationIRP4
  p4Ledger: ScriptTransitionLedgerDraftP4
  irWithoutDigest: Omit<ScriptMigrationIRP5, 'digest'>
  groups: P5CycleTransitionGroup[]
}): ScriptTransitionLedgerDraftP5 {
  const newEntries: P5TransitionEntry[] = args.groups.flatMap((group) =>
    group.sources.map((source) => ({
      from: clone(source.identity),
      baseCellSha256: source.baseCellSha256,
      outcome: { kind: 'group' as const, groupId: group.id },
    })),
  )
  const entryKeys = new Set<string>()
  for (const entry of [...args.p4Ledger.entries, ...newEntries]) {
    const key =
      entry.from.kind === 'legacy-script'
        ? `legacy-script:${entry.from.id}`
        : entry.from.kind === 'p4-representation-cell'
          ? `p4-representation-cell:${representationCellKey(entry.from)}`
          : entry.from.kind === 'source-cell'
            ? `source-cell:${entry.from.source}#${entry.from.pointer}`
            : `legacy-script-cell:${entry.from.scriptId}#${entry.from.pointer}`
    assert(!entryKeys.has(key), `duplicate ledger source ${key}`)
    entryKeys.add(key)
  }
  const evidence: P5CycleTransitionEvidence[] = args.groups.map((group) => ({
    id: group.evidenceId,
    kind: group.kind === 'cycle-structure-group' ? 'cycle-structure' : 'flow-exit-rewrite',
    sourceAuditDigest: args.irWithoutDigest.sourceAudit.digest,
    legacyScriptIds: group.sources
      .flatMap((source) => (source.identity.kind === 'legacy-script' ? [source.identity.id] : []))
      .sort(stableStringCompare),
    sourceCells: group.sources
      .flatMap((source) =>
        source.identity.kind === 'p4-representation-cell'
          ? [representationCellKey(source.identity)]
          : [],
      )
      .sort(stableStringCompare),
    stableIdsExplicit: true,
    backEdgesYield: true,
    bodyCopies: 0,
  }))
  const pending: P5PendingTransition[] = args.irWithoutDigest.retainedBodies
    .map((body) => ({
      legacyScriptId: body.legacyScriptId,
      handle: body.handle,
      phase: 'P6' as const,
      reason: body.status.work.reason,
    }))
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  return digestRecord<ScriptTransitionLedgerDraftP5>({
    kind: 'script-transition-ledger-draft',
    version: 1,
    projectId: 'pal',
    transitionId: 'script-v4-v5',
    generatorEpoch: 'n3-script-v5-p5-v1',
    throughPhase: 'P5',
    sourceAudit: clone(args.p4Ledger.sourceAudit),
    previousPhase: {
      irDigest: args.p4.digest,
      ledgerDigest: args.p4Ledger.digest,
    },
    completed: [
      'folded-body-pruning',
      'misleading-scc-retirement',
      's018-owner-resolution',
      'acyclic-flow-structure',
      'named-owner-allocation',
      'legacy-selection-rewrite',
      'cyclic-flow-structure',
      'legacy-flow-exit-rewrite',
    ],
    entries: [...clone(args.p4Ledger.entries), ...newEntries],
    groups: [...clone(args.p4Ledger.groups), ...clone(args.groups)],
    evidence: [...clone(args.p4Ledger.evidence), ...evidence].sort((left, right) =>
      stableStringCompare(left.id, right.id),
    ),
    pending,
  })
}

export function buildP5ScriptMigrationIR(args: {
  frozenAudit: ScriptControlFlowAuditV1
  p4: ScriptMigrationIRP4
  p4Ledger: ScriptTransitionLedgerDraftP4
}): P5TransformResult {
  assert(args.p4.throughPhase === 'P4', 'P4 IR phase mismatch')
  assert(args.p4Ledger.throughPhase === 'P4', 'P4 ledger phase mismatch')
  assert(args.p4.sourceAudit.digest === args.frozenAudit.digest, 'source audit drift')

  const auditById = new Map(args.frozenAudit.product.bodies.map((body) => [body.id, body]))
  const p5Bodies = args.p4.retainedBodies
    .filter((body) => body.status.work.phase === 'P5')
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  assert(p5Bodies.length === 433, `P5 body count drift ${p5Bodies.length}`)
  const p5Ids = new Set(p5Bodies.map((body) => body.legacyScriptId))
  const p4Fragments = new Map(
    args.p4.ownerFragments.map((fragment) => [fragment.legacyScriptId, fragment]),
  )
  const ownerLinks = new Map(
    args.p4.pendingOwnerLinks.map((link) => [link.legacyScriptId, link.owners]),
  )

  const bodiesByComponent = new Map<number, P4RetainedBody[]>()
  for (const body of p5Bodies) {
    const audit = auditById.get(body.legacyScriptId)
    assert(audit?.productComponent.cyclic, `non-cyclic body entered P5 ${body.legacyScriptId}`)
    const component = bodiesByComponent.get(audit.productComponent.id) ?? []
    component.push(body)
    bodiesByComponent.set(audit.productComponent.id, component)
  }
  assert(bodiesByComponent.size === 331, `P5 component count drift ${bodiesByComponent.size}`)

  const sortedComponents = [...bodiesByComponent]
    .map(([productComponentId, bodies]) => ({
      productComponentId,
      bodies: bodies.sort((left, right) =>
        stableStringCompare(left.legacyScriptId, right.legacyScriptId),
      ),
    }))
    .sort((left, right) =>
      stableStringCompare(left.bodies[0]!.legacyScriptId, right.bodies[0]!.legacyScriptId),
    )

  const ownerFlowOrdinals = new Map<string, number>()
  const drafts: CycleDraft[] = sortedComponents.map(
    ({ productComponentId, bodies }, componentOrdinal) => {
      const owners = uniqueOwners(
        bodies.flatMap((body) => ownerLinks.get(body.legacyScriptId) ?? []),
      )
      assert(owners.length, `cycle owner missing ${bodies[0]!.legacyScriptId}`)
      const stateIds = new Map(
        bodies.map((body, index) => [body.legacyScriptId, allocateP5StateId(index)]),
      )
      const kind = classifyP5CycleShape({
        componentSize: bodies.length,
        body: bodies[0]!.body,
        legacyScriptId: bodies[0]!.legacyScriptId,
        owners,
      })
      const ownerFlows: P5OwnerFlowAllocation[] = owners.map((owner) => {
        const key = ownerKey(owner)
        const ordinal = ownerFlowOrdinals.get(key) ?? 0
        ownerFlowOrdinals.set(key, ordinal + 1)
        const identity: P5OwnerFlowIdentity = {
          kind: 'owner-flow',
          owner: clone(owner),
          flowId: allocateP5FlowId(ordinal),
        }
        return {
          identity,
          ...(kind === 'state-machine' ? { machineId: identity.flowId } : {}),
          legacyEntryAliases: bodies.map((body) => ({
            legacyScriptId: body.legacyScriptId,
            ...(kind === 'state-machine' ? { stateId: stateIds.get(body.legacyScriptId)! } : {}),
          })),
        }
      })
      const bodySet = new Set(bodies.map((body) => body.legacyScriptId))
      const entryLegacyScriptIds = bodies
        .filter((body) => {
          const audit = auditById.get(body.legacyScriptId)!
          return audit.incomingPredecessorBodyIds.some((id) => !bodySet.has(id))
        })
        .map((body) => body.legacyScriptId)
      assert(entryLegacyScriptIds.length, `cycle entry missing ${bodies[0]!.legacyScriptId}`)
      return {
        componentOrdinal,
        productComponentId,
        cycleId: `p5-cycle-${String(componentOrdinal + 1).padStart(3, '0')}`,
        groupId: `p5-cycle-${String(componentOrdinal + 1).padStart(3, '0')}`,
        bodies,
        owners,
        ownerFlows,
        kind,
        stateIds,
        entryLegacyScriptIds,
      }
    },
  )

  const draftByBody = new Map<string, CycleDraft>()
  for (const draft of drafts)
    for (const body of draft.bodies) draftByBody.set(body.legacyScriptId, draft)

  const entityScenes = new Map<string, string>()
  for (const page of args.p4.pages) {
    const previous = entityScenes.get(page.identity.entityId)
    assert(
      !previous || previous === page.identity.sceneId,
      `duplicate entity scene ${page.identity.entityId}`,
    )
    entityScenes.set(page.identity.entityId, page.identity.sceneId)
  }
  for (const owner of args.p4.owners) {
    if (owner.identity.kind !== 'entity-behavior') continue
    const previous = entityScenes.get(owner.identity.entityId)
    assert(
      !previous || previous === owner.identity.sceneId,
      `duplicate entity scene ${owner.identity.entityId}`,
    )
    entityScenes.set(owner.identity.entityId, owner.identity.sceneId)
  }

  const rawSites: JumpSite[] = [
    ...args.p4.ownerFragments.flatMap((fragment) =>
      collectJumpSites(fragment.body, 'owner-fragment', fragment.legacyScriptId),
    ),
    ...args.p4.flowStructures.flatMap((structure) =>
      collectJumpSites(structure.target.body, 'flow-structure', structure.target.legacyScriptId),
    ),
    ...p5Bodies.flatMap((body) => collectJumpSites(body.body, 'cycle-body', body.legacyScriptId)),
  ]
    .filter(
      (site) => p5Ids.has(site.targetLegacyScriptId) || p4Fragments.has(site.targetLegacyScriptId),
    )
    .sort((left, right) =>
      stableStringCompare(
        `${left.representation}:${left.legacyScriptId}#${left.pointer}`,
        `${right.representation}:${right.legacyScriptId}#${right.pointer}`,
      ),
    )
  assert(rawSites.length === 1_286, `P5 rewrite site drift ${rawSites.length}`)

  const groups = new Map<string, GroupDraft>()
  for (const draft of drafts) {
    const group = createGroup(
      groups,
      draft.groupId,
      'cycle-structure-group',
      'restore-cycle-structure-v1',
    )
    group.cycleBodyCount = draft.bodies.length
    group.ownerFlowCount = draft.ownerFlows.length
    addTarget(group, { kind: 'cycle-structure', cycleId: draft.cycleId })
    for (const ownerFlow of draft.ownerFlows) addTarget(group, ownerFlow.identity)
    for (const body of draft.bodies)
      addSource(group, { kind: 'legacy-script', id: body.legacyScriptId }, body.baseCellSha256)
  }

  const standaloneSites = rawSites.filter(
    (site) => site.representation !== 'cycle-body' && !p5Ids.has(site.targetLegacyScriptId),
  )
  assert(standaloneSites.length === 69, `standalone flow exit drift ${standaloneSites.length}`)
  const standaloneGroupBySite = new Map<string, string>()
  for (const [index, site] of standaloneSites.entries())
    standaloneGroupBySite.set(
      `${site.representation}:${site.legacyScriptId}#${site.pointer}`,
      `p5-flow-exit-${String(index + 1).padStart(3, '0')}`,
    )
  for (const groupId of standaloneGroupBySite.values())
    createGroup(groups, groupId, 'flow-exit-rewrite-group', 'rewrite-flow-exit-v1')

  const rewrites: P5TransitionRewrite[] = rawSites.map((site) => {
    const sourceDraft = draftByBody.get(site.legacyScriptId)
    const targetDraft = draftByBody.get(site.targetLegacyScriptId)
    const backEdge =
      Boolean(sourceDraft && targetDraft) &&
      sourceDraft!.productComponentId === targetDraft!.productComponentId
    let target: P5FlowExitTarget
    if (targetDraft) {
      target = {
        kind: 'cycle',
        cycleId: targetDraft.cycleId,
        legacyScriptId: site.targetLegacyScriptId,
        ...(targetDraft.kind === 'state-machine'
          ? { stateId: targetDraft.stateIds.get(site.targetLegacyScriptId)! }
          : {}),
        ownerFlows: targetDraft.ownerFlows.map((flow) => clone(flow.identity)),
      }
    } else {
      const fragment = p4Fragments.get(site.targetLegacyScriptId)
      assert(fragment, `flow exit target missing ${site.targetLegacyScriptId}`)
      target = {
        kind: 'owner-fragment',
        legacyScriptId: fragment.legacyScriptId,
        owner: clone(fragment.owner),
      }
    }
    const groupId =
      site.representation === 'cycle-body'
        ? sourceDraft!.groupId
        : targetDraft
          ? targetDraft.groupId
          : standaloneGroupBySite.get(
              `${site.representation}:${site.legacyScriptId}#${site.pointer}`,
            )!
    const self = resolveSelf(site.command, entityScenes)
    const after: P5GeneratedFlowExit = {
      kind: 'n3P5FlowExit',
      target,
      scheduling: backEdge ? 'worldTick' : 'macroTask',
      worldClockAdvanceMs: 0,
      cancellation: 'required',
      continuation: 'terminate-current-segment',
      ...(self ? { self } : {}),
    }
    return {
      source: {
        representation: site.representation === 'cycle-body' ? 'cycle-body' : site.representation,
        legacyScriptId: site.legacyScriptId,
        pointer: site.pointer,
        baseCellSha256: legacyAuthorCellSha256(site.command),
      },
      before: clone(site.command),
      after,
      targetLegacyScriptId: site.targetLegacyScriptId,
      backEdge,
      groupId,
    }
  })

  const rewriteByCell = new Map<string, P5TransitionRewrite>()
  for (const rewrite of rewrites) {
    const key = rewriteKey(
      rewrite.source.representation,
      rewrite.source.legacyScriptId,
      rewrite.source.pointer,
    )
    assert(!rewriteByCell.has(key), `duplicate rewrite source ${key}`)
    rewriteByCell.set(key, rewrite)
    const group = groups.get(rewrite.groupId)
    assert(group, `rewrite group missing ${rewrite.groupId}`)
    group.transitionRewriteCount++
    if (rewrite.source.representation !== 'cycle-body') {
      const representation = rewrite.source.representation
      const identity: P5RepresentationCellIdentity = {
        kind: 'p4-representation-cell',
        representation,
        scriptId: rewrite.source.legacyScriptId,
        pointer: rewrite.source.pointer,
      }
      addSource(group, identity, rewrite.source.baseCellSha256)
      addTarget(group, identity)
    }
    if (rewrite.source.representation === 'cycle-body' && rewrite.after.target.kind === 'cycle') {
      const targetDraft = draftByBody.get(rewrite.targetLegacyScriptId)!
      if (targetDraft.groupId !== rewrite.groupId) group.dependsOn.add(targetDraft.groupId)
    }
  }

  for (const [siteKey, groupId] of standaloneGroupBySite) {
    const rewrite = rewrites.find(
      (candidate) =>
        `${candidate.source.representation}:${candidate.source.legacyScriptId}#${candidate.source.pointer}` ===
        siteKey,
    )
    assert(rewrite, `standalone rewrite missing ${siteKey}`)
    const group = createGroup(groups, groupId, 'flow-exit-rewrite-group', 'rewrite-flow-exit-v1')
    group.transitionRewriteCount = 1
    const identity: P5RepresentationCellIdentity = {
      kind: 'p4-representation-cell',
      representation: rewrite.source.representation as 'owner-fragment' | 'flow-structure',
      scriptId: rewrite.source.legacyScriptId,
      pointer: rewrite.source.pointer,
    }
    addSource(group, identity, rewrite.source.baseCellSha256)
    addTarget(group, identity)
  }

  const ownerFragments = args.p4.ownerFragments.map((fragment) => ({
    ...clone(fragment),
    body: rewriteBody(fragment.body, 'owner-fragment', fragment.legacyScriptId, rewriteByCell),
  }))
  const flowStructures = args.p4.flowStructures.map((structure) => ({
    ...clone(structure),
    target: {
      ...clone(structure.target),
      body: rewriteBody(
        structure.target.body,
        'flow-structure',
        structure.target.legacyScriptId,
        rewriteByCell,
      ),
    },
  }))

  const structures: P5CycleStructure[] = drafts.map((draft) => {
    const bodies: P5CycleBodyProjection[] = draft.bodies.map((body) => ({
      handle: body.handle,
      legacyScriptId: body.legacyScriptId,
      sourceBodySha256: body.baseCellSha256,
      ...(draft.kind === 'state-machine'
        ? { stateId: draft.stateIds.get(body.legacyScriptId)! }
        : {}),
      loweredBody: rewriteBody(body.body, 'cycle-body', body.legacyScriptId, rewriteByCell),
    }))
    const sourceBodies = new Map(
      draft.bodies.map((body) => [body.legacyScriptId, body.body] as const),
    )
    const structureRewrites = rewrites.filter(
      (rewrite) =>
        rewrite.source.representation === 'cycle-body' &&
        sourceBodies.has(rewrite.source.legacyScriptId),
    )
    const transitions: P5AuthorTransitionAllocation[] = structureRewrites.map((rewrite, index) => ({
      transitionId: allocateP5TransitionId(index),
      from: {
        legacyScriptId: rewrite.source.legacyScriptId,
        ...(draft.kind === 'state-machine'
          ? { stateId: draft.stateIds.get(rewrite.source.legacyScriptId)! }
          : {}),
      },
      sourcePointer: rewrite.source.pointer,
      trigger: transitionTrigger(rewrite, sourceBodies.get(rewrite.source.legacyScriptId)!),
      target: clone(rewrite.after.target),
      scheduling: rewrite.after.scheduling,
      cancellation: 'required',
      backEdge: rewrite.backEdge,
    }))
    let authorProjection: P5AuthorCycleProjection
    if (draft.kind === 'auto-runner-repeat') {
      const body = bodies[0]!
      const original = draft.bodies[0]!.body
      assert(exactTailSelfJump(original, body.legacyScriptId), 'auto repeat tail drift')
      assert(transitions.length === 1, `auto repeat transition drift ${draft.cycleId}`)
      authorProjection = {
        kind: 'auto-runner-repeat',
        body: body.loweredBody.slice(0, -1),
        yield: 'worldTick',
        lifecycle: 'auto-runner',
        repeatTransitionId: transitions[0]!.transitionId,
      }
    } else if (draft.kind === 'structured-loop') {
      const body = bodies[0]!
      const original = draft.bodies[0]!.body
      const loop = simpleConditionalSelfJump(original, body.legacyScriptId)
      assert(loop, 'structured loop shape drift')
      const loopTransition = transitions.find(
        (transition) =>
          transition.backEdge &&
          transition.from.legacyScriptId === body.legacyScriptId &&
          transition.target.kind === 'cycle' &&
          transition.target.legacyScriptId === body.legacyScriptId,
      )
      assert(loopTransition, `structured loop transition missing ${draft.cycleId}`)
      const prefix = body.loweredBody.slice(0, loop.branchIndex)
      const suffix = body.loweredBody.slice(loop.branchIndex + 1)
      const loopCommand = {
        kind: 'loop' as const,
        mode: 'until' as const,
        cond: { kind: 'not', cond: clone(loop.condition) },
        body: prefix,
        yield: 'worldTick' as const,
        maxIterations: MAX_LOOP_ITERATIONS,
      }
      authorProjection = {
        kind: 'structured-loop',
        body: [loopCommand, ...suffix],
        loop: clone(loopCommand),
        loopTransitionId: loopTransition.transitionId,
        exitTransitionIds: transitions
          .filter((transition) => transition.transitionId !== loopTransition.transitionId)
          .map((transition) => transition.transitionId),
      }
    } else {
      authorProjection = {
        kind: 'state-machine',
        machineIds: draft.ownerFlows.map((flow) => clone(flow.identity)),
        initialStateId: allocateP5StateId(0),
        states: bodies.map((body) => ({
          id: body.stateId!,
          label: body.stateId === 'initial' ? '初始状态' : `迁移状态 ${body.stateId}`,
          legacyScriptId: body.legacyScriptId,
          body: clone(body.loweredBody),
          transitionIds: transitions
            .filter((transition) => transition.from.legacyScriptId === body.legacyScriptId)
            .map((transition) => transition.transitionId),
        })),
        transitionProjection: 'explicit-transition-table',
      }
    }
    return {
      identity: { kind: 'cycle-structure', cycleId: draft.cycleId },
      kind: draft.kind,
      componentOrdinal: draft.componentOrdinal,
      productComponentId: draft.productComponentId,
      owners: clone(draft.owners),
      ownerFlows: clone(draft.ownerFlows),
      bodies,
      transitions,
      authorProjection,
      entryLegacyScriptIds: clone(draft.entryLegacyScriptIds),
      transitionRewriteCount: structureRewrites.length,
      backEdgeCount: structureRewrites.filter((rewrite) => rewrite.backEdge).length,
      nestedOutcomeTransitions: structureRewrites.filter((rewrite) =>
        rewrite.source.pointer.includes('/onNo/'),
      ).length,
      bodyCopies: 0,
      evidenceId: `p5:${args.frozenAudit.digest}:cycle:${draft.cycleId}`,
      groupId: draft.groupId,
    }
  })

  const retainedBodies = args.p4.retainedBodies
    .filter((body) => body.status.work.phase === 'P6')
    .map((body) => clone(body) as P5RetainedBody)
  assert(retainedBodies.length === 31, `P6 retained body drift ${retainedBodies.length}`)

  const transitionGroups: P5CycleTransitionGroup[] = [...groups.values()]
    .map((group) => {
      assert(group.sources.size, `group source missing ${group.id}`)
      assert(group.targets.size, `group target missing ${group.id}`)
      return {
        kind: group.kind,
        id: group.id,
        transformId: group.transformId,
        editPolicy: 'conflict-if-modified' as const,
        sources: [...group.sources.values()].sort((left, right) =>
          stableStringCompare(sourceIdentityKey(left.identity), sourceIdentityKey(right.identity)),
        ),
        targets: [...group.targets.values()].sort((left, right) =>
          stableStringCompare(targetIdentityKey(left), targetIdentityKey(right)),
        ),
        outcome: {
          kind:
            group.kind === 'cycle-structure-group'
              ? ('restored-cycle-structure' as const)
              : ('rewritten-flow-exit' as const),
          cycleBodyCount: group.cycleBodyCount,
          transitionRewriteCount: group.transitionRewriteCount,
          ownerFlowCount: group.ownerFlowCount,
          bodyCopies: 0 as const,
        },
        evidenceId:
          group.kind === 'cycle-structure-group'
            ? structures.find((structure) => structure.groupId === group.id)!.evidenceId
            : `p5:${args.frozenAudit.digest}:exit:${group.id}`,
        dependsOn: [...group.dependsOn].sort(stableStringCompare),
      }
    })
    .sort((left, right) => stableStringCompare(left.id, right.id))
  assert(transitionGroups.length === 400, `P5 group count drift ${transitionGroups.length}`)

  const census = cycleCensus({
    p4: args.p4,
    drafts,
    rewrites,
    structures,
    rewrittenOwnerFragments: ownerFragments,
    rewrittenFlowStructures: flowStructures,
    retainedP6: retainedBodies,
  })
  const pendingByPhase = { P5: 0, P6: retainedBodies.length }
  const irWithoutDigest: Omit<ScriptMigrationIRP5, 'digest'> = {
    kind: 'script-migration-ir',
    version: 1,
    throughPhase: 'P5',
    generatorEpoch: 'n3-script-v5-p5-v1',
    canonical: false,
    runtimeConsumable: false,
    sourceAudit: clone(args.p4.sourceAudit),
    previousPhase: {
      irDigest: args.p4.digest,
      ledgerDigest: args.p4Ledger.digest,
    },
    source: clone(args.p4.source),
    commandCensus: clone(args.p4.commandCensus),
    commandSites: clone(args.p4.commandSites),
    commandTransition: clone(args.p4.commandTransition),
    commandRewrites: clone(args.p4.commandRewrites),
    retainedBodies,
    tombstones: clone(args.p4.tombstones),
    ownerResolutions: clone(args.p4.ownerResolutions),
    flowStructures,
    flowCensus: clone(args.p4.flowCensus),
    sizeGates: clone(args.p4.sizeGates),
    pages: clone(args.p4.pages),
    owners: clone(args.p4.owners),
    ownerFragments,
    pendingOwnerLinks: args.p4.pendingOwnerLinks
      .filter((link) => link.phase === 'P6')
      .map((link) => clone(link)),
    ownerCensus: clone(args.p4.ownerCensus),
    cycleStructures: structures,
    transitionRewrites: rewrites,
    cycleCensus: census,
    scheduling: {
      commandPaceMs: 100,
      stageIntervalMs: 40,
      hiddenEntityMs: 120,
      authorityMs: 150,
      chaseMs: 200,
      backEdgeYield: 'worldTick',
      forwardTransferYield: 'macroTask',
      cancellation: 'required',
    },
    pendingByPhase,
  }
  const ir = digestRecord<ScriptMigrationIRP5>(irWithoutDigest)
  const ledger = buildLedger({
    p4: args.p4,
    p4Ledger: args.p4Ledger,
    irWithoutDigest,
    groups: transitionGroups,
  })
  assert(ledger.entries.length === 17_291, `ledger entry drift ${ledger.entries.length}`)
  assert(ledger.groups.length === 5_620, `ledger group drift ${ledger.groups.length}`)
  assert(ledger.evidence.length === 8_965, `ledger evidence drift ${ledger.evidence.length}`)
  assert(ledger.pending.length === 31, `ledger pending drift ${ledger.pending.length}`)
  return { ir, ledger }
}
