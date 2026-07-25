import { isDeepStrictEqual } from 'node:util'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { legacyAuthorCellSha256 } from './source-v4.js'
import { digestRecord, stableStringCompare } from './stable-json.js'
import type {
  LegacyScriptIdentity,
  P4AuthorOwnerIdentity,
  P4OwnerFragment,
  P5CycleStructure,
  P6CallInlineRewrite,
  P6ClosureCensus,
  P6ClosureTransitionEvidence,
  P6ClosureTransitionGroup,
  P6FlowExitRewrite,
  P6GeneratedFlowExit,
  P6ItemPrivateClosure,
  P6ItemPrivateScriptIdentity,
  P6LocalFlowAllocation,
  P6LocalFlowIdentity,
  P6LocalSourceBody,
  P6MisleadingSccRetirement,
  P6RepresentationCellIdentity,
  P6ReversibleItemSourceBody,
  P6SharedTailClassification,
  P6TransitionEntry,
  ScriptMigrationIRP5,
  ScriptMigrationIRP6,
  ScriptTransitionLedgerDraftP5,
  ScriptTransitionLedgerDraftP6,
} from './types.js'

const ITEM_FLOW_ACTIVE_REF = 'ir/p2/pending/item-use-flow-a'
const ITEM_TAIL_A_ACTIVE_REF = 'ir/p2/pending/item-use-shared-tail-a'
const ITEM_TAIL_B_ACTIVE_REF = 'ir/p2/pending/item-use-shared-tail-b'
const S023_LOCAL_BODY = 'scene/s023/L-7039/e425/d-0a386828'
const S180_LOCAL_BODY = 'scene/s180/L-25096/e2960/d-0a386828'

const SPIRIT_ORB_ITEM_IDS = ['265', '266', '267'] as const

interface CommandSite {
  representation: 'owner-fragment' | 'cycle-body' | 'flow-structure' | 'retained-body'
  scriptId: string
  pointer: string
  command: Record<string, unknown>
  owner?: P4AuthorOwnerIdentity
}

interface GroupDraft {
  kind: P6ClosureTransitionGroup['kind']
  id: string
  transformId: P6ClosureTransitionGroup['transformId']
  sources: Map<string, P6ClosureTransitionGroup['sources'][number]>
  targets: Map<string, P6ClosureTransitionGroup['targets'][number]>
  callInlineCount: number
  flowExitRewriteCount: number
  localSourceBodyCount: number
  localFlowAllocationCount: number
  itemPrivateScriptCount: number
  bodyCopies: number
  dependsOn: Set<string>
}

export interface P6TransformResult {
  ir: ScriptMigrationIRP6
  ledger: ScriptTransitionLedgerDraftP6
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`P6 transform: ${message}`)
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

function localFlowKey(identity: P6LocalFlowIdentity): string {
  return `${ownerKey(identity.owner)}:${identity.flowId}`
}

function representationKey(identity: P6RepresentationCellIdentity): string {
  return `${identity.representation}:${identity.scriptId}`
}

function sourceKey(identity: LegacyScriptIdentity | P6RepresentationCellIdentity): string {
  return identity.kind === 'legacy-script'
    ? `legacy-script:${identity.id}`
    : `p5-representation-cell:${representationKey(identity)}`
}

function targetKey(identity: P6ClosureTransitionGroup['targets'][number]): string {
  if (identity.kind === 'p5-representation-cell')
    return `p5-representation-cell:${representationKey(identity)}`
  if (identity.kind === 'owner-local-flow') return `owner-local-flow:${localFlowKey(identity)}`
  return `item-private-script:${identity.itemId}:${identity.scriptId}`
}

function collectCommandSites(
  value: unknown,
  kind: 'callScript' | 'jumpScript',
  context: Omit<CommandSite, 'pointer' | 'command'>,
): CommandSite[] {
  const sites: CommandSite[] = []
  const visit = (node: unknown, pointer: string): void => {
    if (Array.isArray(node)) {
      for (const [index, child] of node.entries()) visit(child, `${pointer}/${index}`)
      return
    }
    if (!isRecord(node)) return
    if (node.kind === kind) sites.push({ ...context, pointer, command: node })
    for (const [key, child] of Object.entries(node)) {
      if (key === 'ref') continue
      visit(child, `${pointer}/${pointerToken(key)}`)
    }
  }
  visit(value, '')
  return sites
}

function scriptTarget(command: Readonly<Record<string, unknown>>): string {
  assert(isRecord(command.ref) && typeof command.ref.id === 'string', 'script ref target missing')
  return command.ref.id
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

function createGroup(
  groups: Map<string, GroupDraft>,
  args: Pick<GroupDraft, 'kind' | 'id' | 'transformId'>,
): GroupDraft {
  const previous = groups.get(args.id)
  if (previous) return previous
  const group: GroupDraft = {
    ...args,
    sources: new Map(),
    targets: new Map(),
    callInlineCount: 0,
    flowExitRewriteCount: 0,
    localSourceBodyCount: 0,
    localFlowAllocationCount: 0,
    itemPrivateScriptCount: 0,
    bodyCopies: 0,
    dependsOn: new Set(),
  }
  groups.set(args.id, group)
  return group
}

function addSource(
  group: GroupDraft,
  identity: LegacyScriptIdentity | P6RepresentationCellIdentity,
  baseCellSha256: string,
): void {
  const key = sourceKey(identity)
  const previous = group.sources.get(key)
  if (previous) {
    assert(previous.baseCellSha256 === baseCellSha256, `source hash drift ${key}`)
    return
  }
  group.sources.set(key, { identity: clone(identity), baseCellSha256 })
}

function addTarget(group: GroupDraft, identity: P6ClosureTransitionGroup['targets'][number]): void {
  group.targets.set(targetKey(identity), clone(identity))
}

function representationIdentity(
  representation: P6RepresentationCellIdentity['representation'],
  scriptId: string,
): P6RepresentationCellIdentity {
  return { kind: 'p5-representation-cell', representation, scriptId }
}

function replaceAtPointers(
  value: unknown,
  replacements: ReadonlyMap<string, unknown>,
  pointer = '',
): unknown {
  const replacement = replacements.get(pointer)
  if (replacement !== undefined) return clone(replacement)
  if (Array.isArray(value))
    return value.map((child, index) =>
      replaceAtPointers(child, replacements, `${pointer}/${index}`),
    )
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      replaceAtPointers(child, replacements, `${pointer}/${pointerToken(key)}`),
    ]),
  )
}

function inlineNestedCommands(
  value: unknown,
  expandCall: (command: Record<string, unknown>) => unknown[],
): unknown {
  if (Array.isArray(value)) {
    const output: unknown[] = []
    for (const child of value) {
      if (isRecord(child) && child.kind === 'callScript') output.push(...expandCall(child))
      else output.push(inlineNestedCommands(child, expandCall))
    }
    return output
  }
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === 'ref' ? clone(child) : inlineNestedCommands(child, expandCall),
    ]),
  )
}

function inlineSingleJump(value: unknown, target: readonly unknown[]): unknown {
  let replacements = 0
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      const output: unknown[] = []
      for (const child of node) {
        if (isRecord(child) && child.kind === 'jumpScript') {
          replacements++
          output.push(...clone(target))
        } else output.push(visit(child))
      }
      return output
    }
    if (!isRecord(node)) return node
    return Object.fromEntries(
      Object.entries(node).map(([key, child]) => [
        key,
        key === 'ref' ? clone(child) : visit(child),
      ]),
    )
  }
  const result = visit(value)
  assert(replacements === 1, `expected one item flow jump, got ${replacements}`)
  return result
}

function itemPrivateIdentity(itemId: string): P6ItemPrivateScriptIdentity {
  return { kind: 'item-private-script', itemId, scriptId: 'use' }
}

function sourceBody(
  body: Pick<
    ScriptMigrationIRP5['retainedBodies'][number],
    'handle' | 'legacyScriptId' | 'baseCellSha256' | 'body'
  >,
): P6ReversibleItemSourceBody {
  return {
    handle: body.handle,
    legacyScriptId: body.legacyScriptId,
    baseCellSha256: body.baseCellSha256,
    body: clone(body.body),
    origin: 'p6-retained-body',
  }
}

function buildItemPrivateClosures(args: {
  p5: ScriptMigrationIRP5
  itemBodies: ScriptMigrationIRP5['retainedBodies']
}): P6ItemPrivateClosure[] {
  const byLegacyId = new Map(args.itemBodies.map((body) => [body.legacyScriptId, body]))
  const byActiveRef = new Map(args.itemBodies.map((body) => [body.activeRefId, body]))
  const rootFor = (itemId: string) => {
    const root = byLegacyId.get(`shared/user/pal-item-use/${itemId}`)
    assert(root, `item author root missing ${itemId}`)
    assert(root.body.length === 1 && isRecord(root.body[0]), `item author root shape ${itemId}`)
    const target = byActiveRef.get(scriptTarget(root.body[0] as Record<string, unknown>))
    assert(target, `item author target missing ${itemId}`)
    return { root, target }
  }
  const tailA = byActiveRef.get(ITEM_TAIL_A_ACTIVE_REF)
  const tailB = byActiveRef.get(ITEM_TAIL_B_ACTIVE_REF)
  assert(tailA && tailB, 'item shared tails missing')
  const itemFlow = args.p5.flowStructures.find(
    (structure) => structure.target.activeRefId === ITEM_FLOW_ACTIVE_REF,
  )
  assert(itemFlow, 'item P3 flow structure missing')

  const entityScenes = new Map<string, string>()
  for (const page of args.p5.pages) {
    const previous = entityScenes.get(page.identity.entityId)
    assert(
      !previous || previous === page.identity.sceneId,
      `duplicate entity scene ${page.identity.entityId}`,
    )
    entityScenes.set(page.identity.entityId, page.identity.sceneId)
  }

  const spiritPairs = SPIRIT_ORB_ITEM_IDS.map((itemId) => ({ itemId, ...rootFor(itemId) }))
  const placements = spiritPairs.map(({ itemId, target }) => {
    const lose = target.body.find((command) => isRecord(command) && command.kind === 'loseItem') as
      | Record<string, unknown>
      | undefined
    const state = target.body.find(
      (command) => isRecord(command) && command.kind === 'setEntityState',
    ) as Record<string, unknown> | undefined
    const facing = target.body.find(
      (command) => isRecord(command) && command.kind === 'setEntityFacing',
    ) as Record<string, unknown> | undefined
    const frame = target.body.find(
      (command) => isRecord(command) && command.kind === 'setEntityFrame',
    ) as Record<string, unknown> | undefined
    assert(
      lose?.itemId === itemId &&
        typeof state?.entity === 'string' &&
        state.state === 3 &&
        facing?.entity === state.entity &&
        typeof facing.facing === 'string' &&
        frame?.entity === state.entity &&
        typeof frame.frame === 'number',
      `spirit orb placement shape ${itemId}`,
    )
    const sceneId = entityScenes.get(state.entity)
    assert(sceneId === 's241', `spirit orb entity scene ${itemId}:${sceneId}`)
    return {
      itemId,
      target: { sceneId, entityId: state.entity },
      placedState: 3,
      facing: facing.facing,
      frame: frame.frame,
      fallback: itemId === '267' ? ('scene-teleport' as const) : ('no-effect' as const),
    }
  })
  const completionStates = new Map<string, Set<number>>()
  for (const command of tailB.body) {
    if (!isRecord(command) || command.kind !== 'branch' || !isRecord(command.cond)) continue
    const cond = command.cond
    assert(
      cond.kind === 'entityState' && typeof cond.entity === 'string' && typeof cond.is === 'number',
      'spirit completion guard shape',
    )
    const states = completionStates.get(cond.entity) ?? new Set<number>()
    states.add(cond.is)
    completionStates.set(cond.entity, states)
  }
  const completionTargets = [...completionStates]
    .map(([entityId, states]) => {
      assert(
        states.size === 2 && states.has(0) && states.has(2),
        `spirit completion states ${entityId}`,
      )
      const sceneId = entityScenes.get(entityId)
      assert(sceneId === 's241', `spirit completion scene ${entityId}:${sceneId}`)
      return {
        target: { sceneId, entityId },
        blockedStates: [0, 2] as [0, 2],
      }
    })
    .sort((left, right) => stableStringCompare(left.target.entityId, right.target.entityId))
  assert(completionTargets.length === 5, 'spirit completion target count')
  const completionBody = tailB.body.filter(
    (command) => !isRecord(command) || command.kind !== 'branch',
  )
  assert(
    completionBody.length === 2 &&
      isRecord(completionBody[0]) &&
      completionBody[0].kind === 'fade' &&
      isRecord(completionBody[1]) &&
      completionBody[1].kind === 'loadScene' &&
      completionBody[1].scene === 's227',
    'spirit completion body shape',
  )
  const itemFlowBody = inlineSingleJump(itemFlow.target.body, tailA.body) as unknown[]
  assert(countKind(itemFlowBody, 'jumpScript') === 0, 'item teleport flow still has jump')
  const spiritSourcesUnsorted: P6ReversibleItemSourceBody[] = [
    ...spiritPairs.flatMap(({ root, target }) => [sourceBody(root), sourceBody(target)]),
    sourceBody(tailA),
    sourceBody(tailB),
    {
      handle: itemFlow.target.handle,
      legacyScriptId: itemFlow.target.legacyScriptId,
      baseCellSha256: itemFlow.target.baseCellSha256,
      body: clone(itemFlow.target.body),
      origin: 'p3-flow-structure' as const,
    },
  ]
  const spiritSources = spiritSourcesUnsorted.sort((left, right) =>
    stableStringCompare(left.legacyScriptId, right.legacyScriptId),
  )

  const simpleClosure = (
    itemId: '280' | '290' | '293',
    domainId: P6ItemPrivateClosure['domainId'],
    label: string,
  ): P6ItemPrivateClosure => {
    const { root, target } = rootFor(itemId)
    let analysis: P6ItemPrivateClosure['analysis']
    if (itemId === '280') {
      const money = target.body
        .filter((command) => isRecord(command) && command.kind === 'giveMoney')
        .reduce<number>(
          (total, command) => total + ((command as Record<string, unknown>).delta as number),
          0,
        )
      const items = target.body
        .filter((command) => isRecord(command) && command.kind === 'giveItem')
        .map((command) => {
          const value = command as Record<string, unknown>
          assert(typeof value.itemId === 'string', 'reward item id')
          return {
            itemId: value.itemId,
            count: typeof value.count === 'number' ? value.count : 1,
          }
        })
      analysis = {
        kind: 'reward-bundle',
        presentation: clone(
          target.body.filter(
            (command) =>
              !isRecord(command) || (command.kind !== 'giveMoney' && command.kind !== 'giveItem'),
          ),
        ),
        money,
        items,
      }
    } else if (itemId === '290') {
      analysis = { kind: 'narrative', body: clone(target.body) }
    } else {
      const skills = target.body
        .filter((command) => isRecord(command) && command.kind === 'learnSkill')
        .map((command) => {
          const value = command as Record<string, unknown>
          assert(
            typeof value.role === 'number' && typeof value.skill === 'string',
            'teach skill shape',
          )
          return { role: value.role, skillId: value.skill }
        })
      analysis = {
        kind: 'teach-skills',
        presentation: clone(
          target.body.filter((command) => !isRecord(command) || command.kind !== 'learnSkill'),
        ),
        skills,
      }
    }
    assert(analysis.kind === domainId, `item private analysis mismatch ${itemId}`)
    return {
      domainId,
      label,
      scripts: [
        {
          identity: itemPrivateIdentity(itemId),
          label,
          authorBody: clone(target.body),
        },
      ],
      sourceBodies: [sourceBody(root), sourceBody(target)].sort((left, right) =>
        stableStringCompare(left.legacyScriptId, right.legacyScriptId),
      ),
      analysis,
      groupId: `p6-item-${domainId}`,
      sharedScriptCount: 0,
    }
  }

  const spiritScripts = spiritPairs.map(({ itemId, target }) => {
    const branch = target.body[0]
    const tailExit = target.body.at(-1)
    assert(
      isRecord(branch) &&
        branch.kind === 'branch' &&
        Array.isArray(branch.then) &&
        branch.then.length === 1 &&
        isRecord(tailExit) &&
        (tailExit.kind === 'jumpScript' || itemId === '267'),
      `spirit private script shape ${itemId}`,
    )
    const fallbackBody = itemId === '267' ? itemFlowBody : tailA.body
    const authorBody = [
      {
        ...clone(branch),
        then: clone(fallbackBody),
        else: [...clone(target.body.slice(1, -1)), ...clone(tailB.body)],
      },
    ]
    assert(
      countKind(authorBody, 'callScript') === 0 && countKind(authorBody, 'jumpScript') === 0,
      `spirit private script still internal ${itemId}`,
    )
    return {
      identity: itemPrivateIdentity(itemId),
      label: `${itemId} 灵珠祭坛用途`,
      authorBody,
    }
  })

  return [
    {
      domainId: 'spirit-orb-altar',
      label: '五灵珠祭坛放置',
      scripts: spiritScripts,
      sourceBodies: spiritSources,
      analysis: {
        kind: 'spirit-orb-altar',
        sceneId: 's241',
        placements,
        noEffectBody: clone(tailA.body),
        sceneTeleportBody: itemFlowBody,
        completion: {
          targets: completionTargets,
          body: clone(completionBody),
        },
      },
      groupId: 'p6-item-spirit-orb-altar',
      sharedScriptCount: 0,
    },
    simpleClosure('280', 'reward-bundle', '礼包奖励'),
    simpleClosure('290', 'narrative', '天书阅读'),
    simpleClosure('293', 'teach-skills', '手卷授艺'),
  ]
}

function buildLedger(args: {
  p5: ScriptMigrationIRP5
  p5Ledger: ScriptTransitionLedgerDraftP5
  irWithoutDigest: Omit<ScriptMigrationIRP6, 'digest'>
  groups: P6ClosureTransitionGroup[]
}): ScriptTransitionLedgerDraftP6 {
  const newEntries: P6TransitionEntry[] = args.groups.flatMap((group) =>
    group.sources.map((source) => ({
      from: clone(source.identity),
      baseCellSha256: source.baseCellSha256,
      outcome: { kind: 'group' as const, groupId: group.id },
    })),
  )
  const entryKeys = new Set<string>()
  for (const entry of [...args.p5Ledger.entries, ...newEntries]) {
    const key =
      entry.from.kind === 'legacy-script'
        ? `legacy-script:${entry.from.id}`
        : entry.from.kind === 'p5-representation-cell'
          ? `p5-representation-cell:${representationKey(entry.from)}`
          : entry.from.kind === 'p4-representation-cell'
            ? `p4-representation-cell:${entry.from.representation}:${entry.from.scriptId}#${entry.from.pointer}`
            : entry.from.kind === 'source-cell'
              ? `source-cell:${entry.from.source}#${entry.from.pointer}`
              : `legacy-script-cell:${entry.from.scriptId}#${entry.from.pointer}`
    assert(!entryKeys.has(key), `duplicate ledger source ${key}`)
    entryKeys.add(key)
  }
  const evidence: P6ClosureTransitionEvidence[] = args.groups.map((group) => ({
    id: group.evidenceId,
    kind:
      group.kind === 'local-call-closure-group'
        ? 'local-call-closure'
        : group.kind === 'local-flow-closure-group'
          ? 'owner-local-flow'
          : 'item-private-script',
    sourceAuditDigest: args.irWithoutDigest.sourceAudit.digest,
    legacyScriptIds: group.sources
      .flatMap((source) => (source.identity.kind === 'legacy-script' ? [source.identity.id] : []))
      .sort(stableStringCompare),
    sourceCells: group.sources
      .flatMap((source) =>
        source.identity.kind === 'p5-representation-cell'
          ? [representationKey(source.identity)]
          : [],
      )
      .sort(stableStringCompare),
    stableIdsExplicit: true,
    genericFunctionCriterion: true,
    sharedScriptCount: 0,
  }))
  return digestRecord<ScriptTransitionLedgerDraftP6>({
    kind: 'script-transition-ledger-draft',
    version: 1,
    projectId: 'pal',
    transitionId: 'script-v4-v5',
    generatorEpoch: 'n3-script-v5-p6-v1',
    throughPhase: 'P6',
    sourceAudit: clone(args.p5Ledger.sourceAudit),
    previousPhase: {
      irDigest: args.p5.digest,
      ledgerDigest: args.p5Ledger.digest,
    },
    completed: [
      ...clone(args.p5Ledger.completed),
      'local-call-closure',
      'owner-local-flow',
      'item-private-script',
      'shared-script-closure',
      'legacy-script-model-retirement',
    ],
    entries: [...clone(args.p5Ledger.entries), ...newEntries],
    groups: [...clone(args.p5Ledger.groups), ...clone(args.groups)],
    evidence: [...clone(args.p5Ledger.evidence), ...evidence].sort((left, right) =>
      stableStringCompare(left.id, right.id),
    ),
    pending: [],
  })
}

export function allocateP6LocalFlowId(index: number): string {
  if (!Number.isInteger(index) || index < 0)
    throw new Error(`P6 local flow allocation: invalid owner-local index ${index}`)
  return `legacy-continuation-${String(index + 1).padStart(3, '0')}`
}

export function buildP6ScriptMigrationIR(args: {
  frozenAudit: ScriptControlFlowAuditV1
  p5: ScriptMigrationIRP5
  p5Ledger: ScriptTransitionLedgerDraftP5
}): P6TransformResult {
  assert(args.p5.throughPhase === 'P5', 'P5 IR phase mismatch')
  assert(args.p5Ledger.throughPhase === 'P5', 'P5 ledger phase mismatch')
  assert(args.p5.sourceAudit.digest === args.frozenAudit.digest, 'source audit drift')
  assert(args.p5.retainedBodies.length === 31, 'P6 retained input drift')

  const ownerFragmentsById = new Map(
    args.p5.ownerFragments.map((fragment) => [fragment.legacyScriptId, fragment]),
  )
  const retainedById = new Map(args.p5.retainedBodies.map((body) => [body.legacyScriptId, body]))
  const crossBodies = args.p5.retainedBodies
    .filter((body) => body.status.work.reason === 'p4-cross-owner-reuse')
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  const itemBodies = args.p5.retainedBodies
    .filter((body) => body.status.work.reason !== 'p4-cross-owner-reuse')
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  assert(crossBodies.length === 17 && itemBodies.length === 14, 'P6 retained partition drift')
  const crossIds = new Set(crossBodies.map((body) => body.legacyScriptId))
  const ownerLinks = new Map(
    args.p5.pendingOwnerLinks.map((link) => [link.legacyScriptId, link.owners]),
  )

  const originalOwnerCallSites = args.p5.ownerFragments.flatMap((fragment) =>
    collectCommandSites(fragment.body, 'callScript', {
      representation: 'owner-fragment',
      scriptId: fragment.legacyScriptId,
      owner: fragment.owner,
    }),
  )
  const originalCycleCallSites = args.p5.cycleStructures.flatMap((structure) =>
    structure.bodies.flatMap((body) =>
      collectCommandSites(body.loweredBody, 'callScript', {
        representation: 'cycle-body',
        scriptId: body.legacyScriptId,
        owner: structure.owners[0],
      }),
    ),
  )
  const callSites = [...originalOwnerCallSites, ...originalCycleCallSites]
  assert(
    originalOwnerCallSites.length === 568 &&
      originalCycleCallSites.length === 6 &&
      callSites.length === 574,
    `local call inventory drift ${originalOwnerCallSites.length}/${originalCycleCallSites.length}`,
  )
  for (const site of callSites) {
    assert(
      /^\/\d+$/.test(site.pointer),
      `nested local call unsupported ${site.scriptId}#${site.pointer}`,
    )
    const target = scriptTarget(site.command)
    assert(
      ownerFragmentsById.has(target) || crossIds.has(target),
      `non-local call entered P6 ${target}`,
    )
  }

  const callTargetBody = (targetId: string): readonly unknown[] => {
    const fragment = ownerFragmentsById.get(targetId)
    if (fragment) return fragment.body
    const retained = retainedById.get(targetId)
    assert(retained && crossIds.has(targetId), `local call target missing ${targetId}`)
    return retained.body
  }
  const expandedCache = new Map<string, unknown[]>()
  const expandTarget = (targetId: string, stack: readonly string[] = []): unknown[] => {
    const cached = expandedCache.get(targetId)
    if (cached) return clone(cached)
    assert(!stack.includes(targetId), `local call cycle ${[...stack, targetId].join(' -> ')}`)
    const expanded = inlineNestedCommands(callTargetBody(targetId), (command) =>
      expandTarget(scriptTarget(command), [...stack, targetId]),
    ) as unknown[]
    assert(countKind(expanded, 'callScript') === 0, `expanded call remains ${targetId}`)
    expandedCache.set(targetId, clone(expanded))
    return expanded
  }

  const callInlineRewrites: P6CallInlineRewrite[] = callSites
    .map((site) => {
      const targetLegacyScriptId = scriptTarget(site.command)
      const owner = site.owner
      assert(owner, `call owner missing ${site.scriptId}`)
      return {
        source: {
          representation: site.representation as 'owner-fragment' | 'cycle-body',
          scriptId: site.scriptId,
          pointer: site.pointer,
          baseCellSha256: legacyAuthorCellSha256(site.command),
        },
        before: clone(site.command),
        afterBody: expandTarget(targetLegacyScriptId),
        targetLegacyScriptId,
        targetBodySha256: legacyAuthorCellSha256(callTargetBody(targetLegacyScriptId)),
        callReturn: 'preserved' as const,
        compatibilityBoundaryAfterMs:
          owner.kind === 'entity-behavior' && owner.channel === 'auto'
            ? (100 as const)
            : (0 as const),
        groupId: 'p6-local-call-closure' as const,
      }
    })
    .sort((left, right) =>
      stableStringCompare(
        `${left.source.representation}:${left.source.scriptId}#${left.source.pointer}`,
        `${right.source.representation}:${right.source.scriptId}#${right.source.pointer}`,
      ),
    )
  assert(
    callInlineRewrites.filter((rewrite) => rewrite.compatibilityBoundaryAfterMs === 100).length ===
      22,
    'auto call boundary count drift',
  )

  const inlineBody = (body: readonly unknown[]): unknown[] =>
    inlineNestedCommands(body, (command) => expandTarget(scriptTarget(command))) as unknown[]
  const ownerFragmentsWithInlines: P4OwnerFragment[] = args.p5.ownerFragments.map((fragment) => ({
    ...clone(fragment),
    body: inlineBody(fragment.body),
  }))
  const cycleStructures: P5CycleStructure[] = args.p5.cycleStructures.map((structure) => {
    const transformed = clone(structure)
    transformed.bodies = transformed.bodies.map((body) => ({
      ...body,
      loweredBody: inlineBody(body.loweredBody),
    }))
    transformed.authorProjection = inlineNestedCommands(transformed.authorProjection, (command) =>
      expandTarget(scriptTarget(command)),
    ) as P5CycleStructure['authorProjection']
    return transformed
  })

  const jumpSites = ownerFragmentsWithInlines.flatMap((fragment) =>
    collectCommandSites(fragment.body, 'jumpScript', {
      representation: 'owner-fragment',
      scriptId: fragment.legacyScriptId,
      owner: fragment.owner,
    }),
  )
  const ownerFragmentByActiveRef = new Map(
    ownerFragmentsWithInlines.map((fragment) => [fragment.activeRefId, fragment]),
  )
  const localJumpSites = jumpSites.filter((site) => {
    const target = scriptTarget(site.command)
    return ownerFragmentByActiveRef.has(target) || target === S023_LOCAL_BODY
  })
  assert(localJumpSites.length === 5, `local jump count drift ${localJumpSites.length}`)
  const localTargetFragments = [
    ...new Map(
      localJumpSites.flatMap((site) => {
        const target = ownerFragmentByActiveRef.get(scriptTarget(site.command))
        return target ? [[target.legacyScriptId, target] as const] : []
      }),
    ).values(),
  ].sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  assert(localTargetFragments.length === 4, 'P4 local tail target count drift')

  const groupForLocalSource = new Map<string, string>()
  for (const body of crossBodies) {
    groupForLocalSource.set(
      body.legacyScriptId,
      body.legacyScriptId === S023_LOCAL_BODY
        ? 'p6-local-tail-s023'
        : body.legacyScriptId === S180_LOCAL_BODY
          ? 'p6-local-bound-s180'
          : 'p6-local-call-closure',
    )
  }
  for (const fragment of localTargetFragments) {
    const owner = fragment.owner
    const groupId =
      owner.kind === 'scene-hook' && owner.sceneId === 's182'
        ? 'p6-local-tail-s182'
        : owner.kind === 'scene-hook' && owner.sceneId === 's145'
          ? 'p6-local-tail-s145'
          : owner.kind === 'scene-hook' && owner.sceneId === 's117'
            ? 'p6-local-tail-s117'
            : undefined
    assert(groupId, `unexpected local target owner ${ownerKey(owner)}`)
    groupForLocalSource.set(fragment.legacyScriptId, groupId)
  }

  const localSourceBodies: P6LocalSourceBody[] = [
    ...crossBodies.map((body) => ({
      handle: body.handle,
      legacyScriptId: body.legacyScriptId,
      baseCellSha256: body.baseCellSha256,
      body: clone(body.body),
      origin: 'p6-retained-body' as const,
      groupId: groupForLocalSource.get(body.legacyScriptId)!,
    })),
    ...localTargetFragments.map((fragment) => ({
      handle: fragment.handle,
      legacyScriptId: fragment.legacyScriptId,
      baseCellSha256: fragment.baseCellSha256,
      body: clone(fragment.body),
      origin: 'p4-owner-fragment' as const,
      groupId: groupForLocalSource.get(fragment.legacyScriptId)!,
    })),
  ].sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  assert(localSourceBodies.length === 21, 'local source body count drift')

  const ownersForSource = (source: P6LocalSourceBody): P4AuthorOwnerIdentity[] => {
    if (source.origin === 'p4-owner-fragment') {
      const fragment = ownerFragmentsById.get(source.legacyScriptId)
      assert(fragment, `local fragment missing ${source.legacyScriptId}`)
      return [fragment.owner]
    }
    const owners = ownerLinks.get(source.legacyScriptId)
    assert(owners?.length, `local source owner missing ${source.legacyScriptId}`)
    return clone(owners)
  }
  const localPairs = localSourceBodies
    .flatMap((source) => ownersForSource(source).map((owner) => ({ source, owner: clone(owner) })))
    .sort((left, right) =>
      stableStringCompare(
        `${ownerKey(left.owner)}:${left.source.legacyScriptId}`,
        `${ownerKey(right.owner)}:${right.source.legacyScriptId}`,
      ),
    )
  const ownerOrdinals = new Map<string, number>()
  const localIdentityBySourceOwner = new Map<string, P6LocalFlowIdentity>()
  for (const pair of localPairs) {
    const key = ownerKey(pair.owner)
    const ordinal = ownerOrdinals.get(key) ?? 0
    ownerOrdinals.set(key, ordinal + 1)
    localIdentityBySourceOwner.set(`${pair.source.legacyScriptId}:${key}`, {
      kind: 'owner-local-flow',
      owner: clone(pair.owner),
      flowId: allocateP6LocalFlowId(ordinal),
    })
  }

  const localFlowFor = (
    sourceLegacyScriptId: string,
    owner: P4AuthorOwnerIdentity,
  ): P6LocalFlowIdentity => {
    const identity = localIdentityBySourceOwner.get(`${sourceLegacyScriptId}:${ownerKey(owner)}`)
    assert(identity, `local flow target missing ${sourceLegacyScriptId}:${ownerKey(owner)}`)
    return identity
  }
  const flowExitRewrites: P6FlowExitRewrite[] = localJumpSites
    .map((site) => {
      const targetRef = scriptTarget(site.command)
      const targetLegacyScriptId =
        targetRef === S023_LOCAL_BODY
          ? targetRef
          : ownerFragmentByActiveRef.get(targetRef)!.legacyScriptId
      const owner = site.owner!
      const after: P6GeneratedFlowExit = {
        kind: 'n3P6FlowExit',
        target: clone(localFlowFor(targetLegacyScriptId, owner)),
        scheduling: 'macroTask',
        worldClockAdvanceMs: 0,
        cancellation: 'required',
        continuation: 'terminate-current-segment',
      }
      return {
        source: {
          representation: 'owner-fragment' as const,
          scriptId: site.scriptId,
          pointer: site.pointer,
          baseCellSha256: legacyAuthorCellSha256(site.command),
        },
        before: clone(site.command),
        after,
        targetLegacyScriptId,
        groupId: groupForLocalSource.get(targetLegacyScriptId)!,
      }
    })
    .sort((left, right) =>
      stableStringCompare(
        `${left.source.scriptId}#${left.source.pointer}`,
        `${right.source.scriptId}#${right.source.pointer}`,
      ),
    )
  const exitRewritesByScript = new Map<string, Map<string, unknown>>()
  for (const rewrite of flowExitRewrites) {
    const replacements = exitRewritesByScript.get(rewrite.source.scriptId) ?? new Map()
    replacements.set(rewrite.source.pointer, rewrite.after)
    exitRewritesByScript.set(rewrite.source.scriptId, replacements)
  }
  const removedLocalFragmentIds = new Set(
    localTargetFragments.map((fragment) => fragment.legacyScriptId),
  )
  const ownerFragments = ownerFragmentsWithInlines
    .filter((fragment) => !removedLocalFragmentIds.has(fragment.legacyScriptId))
    .map((fragment) => ({
      ...fragment,
      body: replaceAtPointers(
        fragment.body,
        exitRewritesByScript.get(fragment.legacyScriptId) ?? new Map(),
      ) as unknown[],
    }))

  const callSitesByTargetOwner = new Map<string, number>()
  for (const site of callSites) {
    const target = scriptTarget(site.command)
    const owner = site.owner!
    const key = `${target}:${ownerKey(owner)}`
    callSitesByTargetOwner.set(key, (callSitesByTargetOwner.get(key) ?? 0) + 1)
  }
  const flowExitsByTargetOwner = new Set(
    flowExitRewrites.map(
      (rewrite) => `${rewrite.targetLegacyScriptId}:${ownerKey(rewrite.after.target.owner)}`,
    ),
  )
  const localFlows: P6LocalFlowAllocation[] = localPairs.map(({ source, owner }) => {
    const identity = localFlowFor(source.legacyScriptId, owner)
    const materializedCallSites =
      callSitesByTargetOwner.get(`${source.legacyScriptId}:${ownerKey(owner)}`) ?? 0
    const entry = materializedCallSites
      ? ('call-inline' as const)
      : flowExitsByTargetOwner.has(`${source.legacyScriptId}:${ownerKey(owner)}`)
        ? ('tail-transition' as const)
        : ('direct-owner-body' as const)
    return {
      identity: clone(identity),
      label: `迁移局部续段 ${identity.flowId.slice(-3)}`,
      sourceHandle: source.handle,
      sourceLegacyScriptId: source.legacyScriptId,
      sourceBodySha256: source.baseCellSha256,
      authorBody: inlineBody(source.body),
      entry,
      materializedCallSites,
      groupId: source.groupId,
    }
  })
  assert(localFlows.length === 42, `local flow allocation count ${localFlows.length}`)
  assert(localFlows.length - localSourceBodies.length === 21, 'local body copy count drift')

  const itemPrivateClosures = buildItemPrivateClosures({ p5: args.p5, itemBodies })
  const itemPrivateScripts = itemPrivateClosures.flatMap((closure) =>
    closure.scripts.map((script) => clone(script)),
  )
  assert(itemPrivateScripts.length === 6, 'item private script count drift')
  const itemFlowLegacyId = itemPrivateClosures
    .find((closure) => closure.domainId === 'spirit-orb-altar')!
    .sourceBodies.find((body) => body.origin === 'p3-flow-structure')!.legacyScriptId
  const flowStructures = args.p5.flowStructures.filter(
    (structure) => structure.target.legacyScriptId !== itemFlowLegacyId,
  )
  assert(flowStructures.length === 598, 'P6 flow structure count drift')

  const cycleIds = new Set(
    cycleStructures.flatMap((structure) => structure.bodies.map((body) => body.legacyScriptId)),
  )
  const ownerIds = new Set(args.p5.ownerFragments.map((fragment) => fragment.legacyScriptId))
  const localSharedTailIds = new Set(crossBodies.map((body) => body.legacyScriptId))
  const itemSharedTailIds = new Set([
    tailId(itemBodies, ITEM_TAIL_A_ACTIVE_REF),
    tailId(itemBodies, ITEM_TAIL_B_ACTIVE_REF),
  ])
  const sharedTailClassifications: P6SharedTailClassification[] =
    args.frozenAudit.product.sharedTails
      .map((legacyScriptId) => {
        const disposition = cycleIds.has(legacyScriptId)
          ? ('p5-cycle-structure' as const)
          : ownerIds.has(legacyScriptId)
            ? ('p4-named-owner' as const)
            : localSharedTailIds.has(legacyScriptId)
              ? ('p6-owner-local' as const)
              : itemSharedTailIds.has(legacyScriptId)
                ? ('p6-item-private' as const)
                : undefined
        assert(disposition, `unclassified shared tail ${legacyScriptId}`)
        return { legacyScriptId, disposition, sharedAuthorScript: false as const }
      })
      .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  const dispositionCount = (disposition: P6SharedTailClassification['disposition']) =>
    sharedTailClassifications.filter((entry) => entry.disposition === disposition).length
  assert(
    dispositionCount('p5-cycle-structure') === 433 &&
      dispositionCount('p4-named-owner') === 80 &&
      dispositionCount('p6-owner-local') === 17 &&
      dispositionCount('p6-item-private') === 2,
    'shared tail classification census drift',
  )

  const itemScriptsByLegacyId = new Map<string, P6ItemPrivateScriptIdentity[]>()
  for (const closure of itemPrivateClosures)
    for (const body of closure.sourceBodies)
      itemScriptsByLegacyId.set(
        body.legacyScriptId,
        closure.scripts.map((script) => clone(script.identity)),
      )
  const misleadingSccIds = args.frozenAudit.product.bodies
    .map((body) => body.id)
    .filter((id) => id.startsWith('shared/scc-'))
    .sort(stableStringCompare)
  const misleadingSccRetirements: P6MisleadingSccRetirement[] = misleadingSccIds.map(
    (legacyScriptId) => {
      const local = localFlows.filter((flow) => flow.sourceLegacyScriptId === legacyScriptId)
      if (local.length)
        return {
          legacyScriptId,
          disposition: 'owner-local-flow' as const,
          activeAuthorIdentities: local.map((flow) => clone(flow.identity)),
        }
      const scripts = itemScriptsByLegacyId.get(legacyScriptId)
      assert(scripts?.length, `misleading SCC disposition missing ${legacyScriptId}`)
      return {
        legacyScriptId,
        disposition: 'item-private-script' as const,
        activeAuthorIdentities: clone(scripts),
      }
    },
  )
  assert(misleadingSccRetirements.length === 13, 'misleading SCC count drift')

  const groups = new Map<string, GroupDraft>()
  const callGroup = createGroup(groups, {
    kind: 'local-call-closure-group',
    id: 'p6-local-call-closure',
    transformId: 'inline-local-call-closure-v1',
  })
  callGroup.callInlineCount = callInlineRewrites.length
  const callRepresentationBodies = new Map<
    string,
    { identity: P6RepresentationCellIdentity; body: unknown[] }
  >()
  for (const site of callSites) {
    const identity = representationIdentity(
      site.representation as 'owner-fragment' | 'cycle-body',
      site.scriptId,
    )
    const body =
      site.representation === 'owner-fragment'
        ? ownerFragmentsById.get(site.scriptId)!.body
        : args.p5.cycleStructures
            .flatMap((structure) => structure.bodies)
            .find((candidate) => candidate.legacyScriptId === site.scriptId)!.loweredBody
    callRepresentationBodies.set(representationKey(identity), { identity, body })
    const target = scriptTarget(site.command)
    const targetFragment = ownerFragmentsById.get(target)
    if (targetFragment) {
      const targetIdentity = representationIdentity('owner-fragment', target)
      callRepresentationBodies.set(representationKey(targetIdentity), {
        identity: targetIdentity,
        body: targetFragment.body,
      })
    }
  }
  for (const { identity, body } of callRepresentationBodies.values())
    addSource(callGroup, identity, legacyAuthorCellSha256(body))
  const callCrossBodies = crossBodies.filter((body) =>
    callSites.some((site) => scriptTarget(site.command) === body.legacyScriptId),
  )
  assert(callCrossBodies.length === 15, 'call-local source count drift')
  for (const body of callCrossBodies)
    addSource(callGroup, { kind: 'legacy-script', id: body.legacyScriptId }, body.baseCellSha256)
  for (const rewrite of callInlineRewrites)
    addTarget(
      callGroup,
      representationIdentity(rewrite.source.representation, rewrite.source.scriptId),
    )
  for (const flow of localFlows.filter((flow) => flow.groupId === callGroup.id))
    addTarget(callGroup, flow.identity)
  callGroup.localSourceBodyCount = callCrossBodies.length
  callGroup.localFlowAllocationCount = localFlows.filter(
    (flow) => flow.groupId === callGroup.id,
  ).length
  callGroup.bodyCopies = callGroup.localFlowAllocationCount - callGroup.localSourceBodyCount

  const nonCallLocalGroupIds = [
    'p6-local-tail-s023',
    'p6-local-bound-s180',
    'p6-local-tail-s117',
    'p6-local-tail-s145',
    'p6-local-tail-s182',
  ]
  for (const groupId of nonCallLocalGroupIds) {
    const group = createGroup(groups, {
      kind: 'local-flow-closure-group',
      id: groupId,
      transformId: 'restore-owner-local-flow-v1',
    })
    const sources = localSourceBodies.filter((source) => source.groupId === groupId)
    const allocations = localFlows.filter((flow) => flow.groupId === groupId)
    group.localSourceBodyCount = sources.length
    group.localFlowAllocationCount = allocations.length
    group.bodyCopies = allocations.length - sources.length
    for (const source of sources) {
      if (source.origin === 'p6-retained-body')
        addSource(
          group,
          { kind: 'legacy-script', id: source.legacyScriptId },
          source.baseCellSha256,
        )
      else
        addSource(
          group,
          representationIdentity('owner-fragment', source.legacyScriptId),
          legacyAuthorCellSha256(source.body),
        )
    }
    for (const rewrite of flowExitRewrites.filter((rewrite) => rewrite.groupId === groupId)) {
      const caller = ownerFragmentsById.get(rewrite.source.scriptId)
      assert(caller, `flow exit caller missing ${rewrite.source.scriptId}`)
      addSource(
        group,
        representationIdentity('owner-fragment', rewrite.source.scriptId),
        legacyAuthorCellSha256(caller.body),
      )
      addTarget(group, representationIdentity('owner-fragment', rewrite.source.scriptId))
      group.flowExitRewriteCount++
    }
    for (const allocation of allocations) addTarget(group, allocation.identity)
  }

  for (const closure of itemPrivateClosures) {
    const group = createGroup(groups, {
      kind: 'item-private-script-closure-group',
      id: closure.groupId,
      transformId: 'absorb-item-private-script-v1',
    })
    group.itemPrivateScriptCount = closure.scripts.length
    for (const body of closure.sourceBodies) {
      if (body.origin === 'p6-retained-body')
        addSource(group, { kind: 'legacy-script', id: body.legacyScriptId }, body.baseCellSha256)
      else {
        const structure = args.p5.flowStructures.find(
          (candidate) => candidate.target.legacyScriptId === body.legacyScriptId,
        )
        assert(structure, `item flow representation missing ${body.legacyScriptId}`)
        addSource(
          group,
          representationIdentity('flow-structure', body.legacyScriptId),
          legacyAuthorCellSha256(structure.target.body),
        )
      }
    }
    for (const script of closure.scripts) addTarget(group, script.identity)
  }

  const transitionGroups: P6ClosureTransitionGroup[] = [...groups.values()]
    .map((group) => {
      assert(group.sources.size && group.targets.size, `empty P6 group ${group.id}`)
      return {
        kind: group.kind,
        id: group.id,
        transformId: group.transformId,
        editPolicy: 'conflict-if-modified' as const,
        sources: [...group.sources.values()].sort((left, right) =>
          stableStringCompare(sourceKey(left.identity), sourceKey(right.identity)),
        ),
        targets: [...group.targets.values()].sort((left, right) =>
          stableStringCompare(targetKey(left), targetKey(right)),
        ),
        outcome: {
          kind:
            group.kind === 'local-call-closure-group'
              ? ('inlined-local-calls' as const)
              : group.kind === 'local-flow-closure-group'
                ? ('restored-owner-local-flow' as const)
                : ('absorbed-item-private-script' as const),
          callInlineCount: group.callInlineCount,
          flowExitRewriteCount: group.flowExitRewriteCount,
          localSourceBodyCount: group.localSourceBodyCount,
          localFlowAllocationCount: group.localFlowAllocationCount,
          itemPrivateScriptCount: group.itemPrivateScriptCount,
          bodyCopies: group.bodyCopies,
          sharedScriptCount: 0 as const,
        },
        evidenceId: `p6:${args.frozenAudit.digest}:${group.id}`,
        dependsOn: [...group.dependsOn].sort(stableStringCompare),
      }
    })
    .sort((left, right) => stableStringCompare(left.id, right.id))
  assert(transitionGroups.length === 10, `P6 group count drift ${transitionGroups.length}`)

  const activeInternalCalls =
    ownerFragments.reduce((total, fragment) => total + countKind(fragment.body, 'callScript'), 0) +
    flowStructures.reduce(
      (total, structure) => total + countKind(structure.target.body, 'callScript'),
      0,
    ) +
    cycleStructures.reduce(
      (total, structure) =>
        total +
        structure.bodies.reduce(
          (bodyTotal, body) => bodyTotal + countKind(body.loweredBody, 'callScript'),
          0,
        ),
      0,
    )
  const activeLegacyJumps =
    ownerFragments.reduce((total, fragment) => total + countKind(fragment.body, 'jumpScript'), 0) +
    flowStructures.reduce(
      (total, structure) => total + countKind(structure.target.body, 'jumpScript'),
      0,
    ) +
    cycleStructures.reduce(
      (total, structure) =>
        total +
        structure.bodies.reduce(
          (bodyTotal, body) => bodyTotal + countKind(body.loweredBody, 'jumpScript'),
          0,
        ),
      0,
    )
  assert(activeInternalCalls === 0, `remaining internal calls ${activeInternalCalls}`)
  assert(activeLegacyJumps === 0, `remaining legacy jumps ${activeLegacyJumps}`)

  const closureCensus: P6ClosureCensus = {
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
    misleadingScc: {
      input: 13,
      active: 0,
      provenanceOnly: 13,
    },
    authorRoots: {
      input: 6,
      bridgeShells: 0,
      itemPrivate: 6,
      shared: 0,
    },
    reversibleBodies: 8102,
    unknown: 0,
  }

  const irWithoutDigest: Omit<ScriptMigrationIRP6, 'digest'> = {
    ...clone(args.p5),
    throughPhase: 'P6',
    generatorEpoch: 'n3-script-v5-p6-v1',
    previousPhase: {
      irDigest: args.p5.digest,
      ledgerDigest: args.p5Ledger.digest,
    },
    retainedBodies: [],
    flowStructures,
    ownerFragments,
    pendingOwnerLinks: [],
    cycleStructures,
    localSourceBodies,
    localFlows,
    itemPrivateClosures,
    itemPrivateScripts,
    sharedAuthorScripts: [],
    callInlineRewrites,
    flowExitRewrites,
    sharedTailClassifications,
    misleadingSccRetirements,
    closureCensus,
    pendingByPhase: { P6: 0 },
  }
  delete (irWithoutDigest as Partial<ScriptMigrationIRP6>).digest
  const ir = digestRecord<ScriptMigrationIRP6>(irWithoutDigest)
  const ledger = buildLedger({
    p5: args.p5,
    p5Ledger: args.p5Ledger,
    irWithoutDigest,
    groups: transitionGroups,
  })
  assert(ledger.pending.length === 0, 'P6 ledger pending remains')
  return { ir, ledger }
}

function tailId(itemBodies: ScriptMigrationIRP5['retainedBodies'], activeRefId: string): string {
  const body = itemBodies.find((candidate) => candidate.activeRefId === activeRefId)
  assert(body, `item tail missing ${activeRefId}`)
  return body.legacyScriptId
}

export function assertP6CorpusRecomputation(
  expected: P6TransformResult,
  actual: P6TransformResult,
): void {
  assert(isDeepStrictEqual(actual.ir, expected.ir), 'IR differs from corpus recomputation')
  assert(
    isDeepStrictEqual(actual.ledger, expected.ledger),
    'ledger differs from corpus recomputation',
  )
}
