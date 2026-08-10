import type { PalMigrationSources } from './pal-migration.js'
import { assertB10PublishedAuthority } from './pal-b10-enemy-team-slots.js'
import type { MigrationSnapshot } from './migration-baseline.js'
import { extractSourceScriptEdgesV2, type ScriptEdge } from './script-graph.js'
import { sceneSlug, signExtendI16, type SourceCmd } from './source-facts.js'
import {
  advanceR13SourceExecutionContext,
  assertPreparedR13SourceExecutionCensus,
  assertR13SourceExecutionCensus,
  type PreparedR13SourceExecutionCensus,
  type R13SourceExecutionCensusV1,
  type R13SourceExecutionContext,
  r13SourceExecutionContextId,
  shouldFollowR13SourceExecutionEdge,
} from './experimental/script-v5/source-execution-census.js'
import { stableJsonSha256, stableStringCompare } from './experimental/script-v5/stable-json.js'

export const PAL_W9_LIFECYCLE_TRANSITION_ID = 'w9-entity-lifecycle-v1' as const
export const PAL_W9_LIFECYCLE_LEDGER_METHOD =
  'w9-entity-lifecycle-source-ledger-v1' as const
export const PAL_W9_PRESTATE_PROOF_METHOD = 'w9-entity-prestate-dataflow-v1' as const
export const PAL_W9_BATTLE_PRESERVATION_METHOD =
  'w9-battle-start-target-preservation-v1' as const
export const PAL_W9_GENERATION_COMMAND =
  'pnpm --filter @type-pal/migrate run migrate:content -- --w9' as const
export const PAL_W9_PROOF_AFFECTED_FILE_ALLOWLIST = Object.freeze([
  '_transitions/w9-entity-lifecycle-v1.json',
  'content/scenes/index.json',
])
export const PAL_W9_EXPECTED_SOURCE_DIGEST =
  '071fd1b359deb391a072c32f8bf72b86e9f0d9c2904893b35300998fd59c78c7' as const
export const PAL_W9_EXPECTED_SOURCE_CENSUS_DIGEST =
  '3d19fb14b8261fd5a0e48f20cbd1e80fc57c31622624bb09126eb86ea2cb13ac' as const
export const PAL_W9_EXPECTED_FOLDED_HOSTILE_TARGETS_DIGEST =
  '21028f47a7334c5f5cfc3ef4ddbf61cb11440e2489ba2fbee4e60b94eaba872a' as const
export const PAL_W9_EXPECTED_RUNTIME_ENTRY_FACTS_DIGEST =
  'f04730c5d5ef47080ff88de36a6f48f049994ef0d2640d3c31fb58bf1ce0b2bf' as const
export const PAL_W9_EXPECTED_BATTLE_PRESERVATION_FACTS_DIGEST =
  '782d1b9472293d9c26ac52e8ddbaa11d67fa22fc103ab4390841fe36cc08f7c6' as const
export const PAL_W9_EXPECTED_PROOF_LEDGER_DIGEST =
  '82d55642c5b4d5c05089f4dc2bb71640bf6eb79c7102a1b6597195694052d631' as const

export interface W9LifecycleSourceContractEntry {
  sourceAddress: number
  opcode: 0x4b | 0x52
  operands: readonly number[]
  sourceCommandSha256: string
  ticks: number
}

export const PAL_W9_LIFECYCLE_SOURCE_CONTRACT: readonly W9LifecycleSourceContractEntry[] =
  Object.freeze([
    Object.freeze({
      sourceAddress: 41073,
      opcode: 0x4b,
      operands: Object.freeze([0, 0, 0]),
      sourceCommandSha256: '3ad3f5f1fde4c5864d5ac613a149aba9888eab96e4dd75df5fcdf8238b35e46f',
      ticks: 15,
    }),
    Object.freeze({
      sourceAddress: 41127,
      opcode: 0x52,
      operands: Object.freeze([0, 0, 0]),
      sourceCommandSha256: '68c4cced14dff419ac48a8a0e3332a4aa8107cd248a1f8c15424ca67c6cae339',
      ticks: 800,
    }),
    Object.freeze({
      sourceAddress: 41176,
      opcode: 0x52,
      operands: Object.freeze([150, 0, 0]),
      sourceCommandSha256: 'f13d8d71503f7c860da06086ab3d208bf0bef74b7236ca2fea864912e64eb72f',
      ticks: 150,
    }),
    Object.freeze({
      sourceAddress: 41180,
      opcode: 0x52,
      operands: Object.freeze([100, 0, 0]),
      sourceCommandSha256: '727956aaaa571d34fd70cd871f348df612a038e0e9615f2033a58c9c7f1349c2',
      ticks: 100,
    }),
  ])

export interface W9LifecycleRuntimeEntryFact {
  sourceId: string
  kind: 'entity-trigger' | 'entity-auto'
  sceneId: string
  entityId: string
  sourceAddress: number
  sourceLabel: string
  runtimeGate: 'trigger-mode-positive-state-gate' | 'auto-runner-positive-state-gate'
  triggerMode?: number
  sourceInitialState: number
  sourceEventObjectSha256: string
}

export interface W9LifecycleTarget {
  sceneId: string
  entityId: string
}

export type W9LifecycleSourceDisposition =
  | {
      kind: 'folded-hostile-on-player-flee'
      policy: { kind: 'suspend'; ticks: number }
    }
  | {
      kind: 'folded-hostile-on-victory'
      policy: { kind: 'hide'; ticks: number }
    }
  | { kind: 'lifecycle-suspend'; command: 'suspendEntity'; ticks: number }
  | { kind: 'lifecycle-hide'; command: 'hideEntity'; ticks: number }

export interface W9LifecycleSourceLedgerEntry {
  id: string
  sourceAddress: number
  opcode: 0x4b | 0x52
  operands: number[]
  sourceCommandSha256: string
  contextId: string
  entrySite: {
    id: string
    kind: string
    sourceAddress: number
  }
  channel: 'auto' | 'trigger'
  owner: string
  self: string
  target: W9LifecycleTarget
  disposition: W9LifecycleSourceDisposition
  preState: { kind: 'positive' }
  preStateProof: {
    methodVersion: typeof PAL_W9_PRESTATE_PROOF_METHOD
    entryGate: 'entity-runtime-requires-positive-state'
    runtimeGate: W9LifecycleRuntimeEntryFact['runtimeGate']
    triggerMode?: number
    sourceInitialState: number
    sourceEventObjectSha256: string
    factsSha256: string
  }
}

export interface W9BattleStartPreservationProofV1 {
  methodVersion: typeof PAL_W9_BATTLE_PRESERVATION_METHOD
  battleRootKinds: readonly ['actor', 'enemy', 'item', 'skill']
  targetEntityCount: number
  targetEntityIdsSha256: string
  battleContextCount: number
  writerSiteCount: number
  writerHitSiteCount: number
  writerHitFactsSha256: string
  factsSha256: string
}

export interface W9LifecycleSourceLedgerV1 {
  kind: 'w9-entity-lifecycle-source-ledger'
  version: 1
  methodVersion: typeof PAL_W9_LIFECYCLE_LEDGER_METHOD
  transitionId: typeof PAL_W9_LIFECYCLE_TRANSITION_ID
  generator: {
    sourceDigest: string
    sourceCensusDigest: string
    generationCommand: string
    generationCommandSha256: string
    affectedFileAllowlist: string[]
    affectedFileAllowlistSha256: string
    foldedHostileTargetsSha256: string
    runtimeEntryFactsSha256: string
    battleStartPreservationProof: W9BattleStartPreservationProofV1
  }
  entries: W9LifecycleSourceLedgerEntry[]
  summary: {
    sourceInstructions: number
    sourceSites: number
    executionContexts: number
    opcode4bSites: number
    opcode52Sites: number
    pairedContexts: number
    opcode4bOnlyContexts: number
    opcode52OnlyContexts: number
    foldedHostileContexts: number
    residualPairedContexts: number
    residualOpcode4bOnlyContexts: number
    landings: {
      hostilePolicies: number
      suspendCommands: number
      hideCommands: number
      total: number
    }
  }
  digest: string
}

type AbstractStateMask = number

const STATE_POSITIVE = 1 << 0
const STATE_ZERO = 1 << 1
const STATE_NEGATIVE = 1 << 2
const STATE_UNKNOWN = STATE_POSITIVE | STATE_ZERO | STATE_NEGATIVE

interface ContextProofResult {
  beforeByAddress: Map<number, AbstractStateMask>
  factsSha256ByTarget: Map<number, string>
}

export interface BuildW9LifecycleSourceLedgerArgs {
  commands: readonly SourceCmd[]
  census: R13SourceExecutionCensusV1
  foldedHostileTargets: readonly W9LifecycleTarget[]
  generationCommand: string
  affectedFileAllowlist: readonly string[]
  sourceContract: readonly W9LifecycleSourceContractEntry[]
  runtimeEntryFacts: ReadonlyMap<string, W9LifecycleRuntimeEntryFact>
}

export interface BuildPalW9LifecycleSourceLedgerArgs {
  sources: PalMigrationSources
  preparedSourceCensus: PreparedR13SourceExecutionCensus
  foldedHostileTargets: readonly W9LifecycleTarget[]
  affectedFileAllowlist: readonly string[]
}

export function foldedHostileTargetsFromPublishedB10(
  snapshot: MigrationSnapshot,
): W9LifecycleTarget[] {
  if (!assertB10PublishedAuthority(snapshot))
    throw new Error('W9 source ledger: 缺 published B10/content12 authority')
  const sceneIds = snapshot.files.get('content/scenes/index.json')
  if (!Array.isArray(sceneIds)) throw new Error('W9 source ledger: published B10 scene index 非法')
  const validatedSceneIds = sceneIds.map((id) => {
    if (typeof id !== 'string' || !id)
      throw new Error('W9 source ledger: published B10 scene index 非法')
    return id
  })
  const targets: W9LifecycleTarget[] = []
  for (const sceneId of validatedSceneIds) {
    const scene = snapshot.files.get(`content/scenes/${sceneId}.json`)
    if (!scene || typeof scene !== 'object' || Array.isArray(scene))
      throw new Error(`W9 source ledger: published B10 缺 scene ${sceneId}`)
    const entities = (scene as Record<string, unknown>).entities
    if (!Array.isArray(entities))
      throw new Error(`W9 source ledger: published B10 scene ${sceneId} entities 非数组`)
    for (const entity of entities) {
      if (!entity || typeof entity !== 'object' || Array.isArray(entity))
        throw new Error(`W9 source ledger: published B10 scene ${sceneId} entity 非对象`)
      const record = entity as Record<string, unknown>
      if (record.hostile === undefined) continue
      if (typeof record.id !== 'string' || !record.id)
        throw new Error(`W9 source ledger: published B10 scene ${sceneId} hostile id 非法`)
      targets.push({ sceneId, entityId: record.id })
    }
  }
  targets.sort(
    (left, right) =>
      stableStringCompare(left.sceneId, right.sceneId) ||
      stableStringCompare(left.entityId, right.entityId),
  )
  if (stableJsonSha256(targets) !== PAL_W9_EXPECTED_FOLDED_HOSTILE_TARGETS_DIGEST)
    throw new Error('W9 source ledger: published B10 hostile target surface 漂移')
  return targets
}

function stateMaskForSigned(value: number): AbstractStateMask {
  return value > 0 ? STATE_POSITIVE : value < 0 ? STATE_NEGATIVE : STATE_ZERO
}

function stateMaskLabel(mask: AbstractStateMask): string {
  const labels = [
    ...(mask & STATE_POSITIVE ? ['positive'] : []),
    ...(mask & STATE_ZERO ? ['zero'] : []),
    ...(mask & STATE_NEGATIVE ? ['negative'] : []),
  ]
  return labels.length ? labels.join('|') : 'unreachable'
}

function invertStateMask(mask: AbstractStateMask): AbstractStateMask {
  return (
    (mask & STATE_POSITIVE ? STATE_NEGATIVE : 0) |
    (mask & STATE_ZERO ? STATE_ZERO : 0) |
    (mask & STATE_NEGATIVE ? STATE_POSITIVE : 0)
  )
}

function entityWord(self: string): number {
  const match = /^e(0|[1-9]\d*)$/.exec(self)
  if (!match) throw new Error(`W9 source ledger: 非法 self ${self}`)
  const value = Number(match[1]) + 1
  if (!Number.isSafeInteger(value) || value <= 0 || value >= 0xffff)
    throw new Error(`W9 source ledger: self 越界 ${self}`)
  return value
}

function commandTargetsSelf(rawTarget: number, selfWord: number): boolean {
  return rawTarget === 0xffff || rawTarget === selfWord
}

function transferState(
  command: SourceCmd,
  edge: ScriptEdge,
  mask: AbstractStateMask,
  selfWord: number,
  battleStartPreservesTargetState: boolean,
): AbstractStateMask {
  if (edge.kind === 'recovery' || edge.reason === 'goto-delay-expiry') return STATE_UNKNOWN
  if (command.op !== 'raw' || command.opcode === undefined) return mask
  const operands = command.operands ?? []
  const opcode = command.opcode

  // PAL_RunTriggerScript may execute arbitrary state writers before returning to fallthrough.
  // The source graph does not model call-return effects, so the continuation is deliberately
  // unknown rather than silently assuming preservation. (0x81 is only a range/facing branch.)
  if (opcode === 0x04) return STATE_UNKNOWN
  if (opcode === 0x07) return battleStartPreservesTargetState ? mask : STATE_UNKNOWN
  if (opcode === 0x4b) return mask

  if (opcode === 0x49) {
    const rawTarget = operands[0] ?? 0
    if (rawTarget !== 0 && commandTargetsSelf(rawTarget, selfWord))
      return stateMaskForSigned(signExtendI16(operands[1] ?? 0))
    return mask
  }
  if (opcode === 0x6f) {
    const rawSource = operands[0] ?? 0
    if (rawSource === 0 || commandTargetsSelf(rawSource, selfWord)) return mask
    return mask | stateMaskForSigned(signExtendI16(operands[1] ?? 0))
  }
  if (opcode === 0x84) {
    const rawTarget = operands[0] ?? 0
    // Unlike most pCurrent opcodes, 0x84 range-checks the raw global id first. 0/FFFF always
    // take the failure edge and cannot act as self aliases; only the exact in-scene id can write.
    if (rawTarget !== selfWord) return mask
    return edge.reason === '0x84'
      ? mask
      : stateMaskForSigned(signExtendI16(operands[1] ?? 0))
  }
  if (opcode === 0x9a) {
    const from = operands[0] ?? 0
    const to = operands[1] ?? 0
    if (from <= selfWord && selfWord <= to)
      return stateMaskForSigned(signExtendI16(operands[2] ?? 0))
    return mask
  }
  if (opcode === 0x52) return invertStateMask(mask)
  return STATE_UNKNOWN
}

function initialContextState(
  context: R13SourceExecutionContext,
  entry: R13SourceExecutionCensusV1['entries'][number],
  runtimeFact: W9LifecycleRuntimeEntryFact | undefined,
): AbstractStateMask {
  const directEntityHost =
    runtimeFact !== undefined &&
    context.host.sourceId === context.entrySiteId &&
    (context.host.kind === 'entity-trigger' || context.host.kind === 'entity-auto') &&
    context.host.kind === entry.kind &&
    runtimeFact.sourceId === entry.sourceId &&
    runtimeFact.kind === entry.kind &&
    runtimeFact.sourceAddress === entry.entry &&
    runtimeFact.sceneId === context.owner &&
    runtimeFact.entityId === context.self
  return directEntityHost ? STATE_POSITIVE : STATE_UNKNOWN
}

function proveContextPreStates(args: {
  commands: readonly SourceCmd[]
  census: R13SourceExecutionCensusV1
  context: R13SourceExecutionContext
  targetAddresses: readonly number[]
  edgesByAddress: ReadonlyMap<number, readonly ScriptEdge[]>
  instructionHashes: ReadonlyMap<number, string>
  allowedAddresses: ReadonlySet<number>
  runtimeEntryFact: W9LifecycleRuntimeEntryFact | undefined
  battleStartPreservesTargetState: boolean
}): ContextProofResult {
  const entry = args.census.entries.find((candidate) => candidate.sourceId === args.context.entrySiteId)
  if (!entry)
    throw new Error(
      `W9 source ledger: context ${args.context.id} 缺 entry ${args.context.entrySiteId}`,
    )
  if (!args.allowedAddresses.has(entry.entry))
    throw new Error(`W9 source ledger: context ${args.context.id} 缺入口执行 site`)
  if (!args.context.self)
    throw new Error(`W9 source ledger: context ${args.context.id} 无 self，前态不可证明`)

  const selfWord = entityWord(args.context.self)
  const beforeByAddress = new Map<number, AbstractStateMask>()
  const queue: number[] = []
  const merge = (address: number, mask: AbstractStateMask): void => {
    const previous = beforeByAddress.get(address) ?? 0
    const next = previous | mask
    if (next === previous) return
    beforeByAddress.set(address, next)
    queue.push(address)
  }
  merge(entry.entry, initialContextState(args.context, entry, args.runtimeEntryFact))

  const transitionFacts: Array<{
    from: number
    to: number
    kind: ScriptEdge['kind']
    reason: string
    before: string
    after: string
  }> = []
  while (queue.length) {
    const address = queue.shift()!
    const before = beforeByAddress.get(address)!
    const command = args.commands[address]
    if (!command) throw new Error(`W9 source ledger: source address ${address} 越界`)
    for (const edge of args.edgesByAddress.get(address) ?? []) {
      if (!shouldFollowR13SourceExecutionEdge(command, edge)) continue
      const { id: _id, ...contextPayload } = args.context
      const nextContext = advanceR13SourceExecutionContext(
        contextPayload,
        address,
        command,
        edge,
      )
      if (r13SourceExecutionContextId(nextContext) !== args.context.id) continue
      if (!args.allowedAddresses.has(edge.to)) continue
      const after = transferState(
        command,
        edge,
        before,
        selfWord,
        args.battleStartPreservesTargetState,
      )
      transitionFacts.push({
        from: address,
        to: edge.to,
        kind: edge.kind,
        reason: edge.reason,
        before: stateMaskLabel(before),
        after: stateMaskLabel(after),
      })
      merge(edge.to, after)
    }
  }

  const stateFacts = [...beforeByAddress.entries()]
    .sort(([left], [right]) => left - right)
    .map(([address, mask]) => ({
      address,
      sourceCommandSha256: args.instructionHashes.get(address),
      before: stateMaskLabel(mask),
    }))
  transitionFacts.sort(
    (left, right) =>
      left.from - right.from ||
      left.to - right.to ||
      stableStringCompare(left.kind, right.kind) ||
      stableStringCompare(left.reason, right.reason) ||
      stableStringCompare(left.before, right.before) ||
      stableStringCompare(left.after, right.after),
  )
  const factsSha256ByTarget = new Map<number, string>()
  for (const targetAddress of args.targetAddresses) {
    factsSha256ByTarget.set(
      targetAddress,
      stableJsonSha256({
        methodVersion: PAL_W9_PRESTATE_PROOF_METHOD,
        context: args.context,
        entry,
        runtimeEntryFact: args.runtimeEntryFact ?? null,
        targetAddress,
        stateFacts,
        transitionFacts,
      }),
    )
  }
  return { beforeByAddress, factsSha256ByTarget }
}

function sourceAddressFromLabel(label: string, sourceId: string): number {
  const match = /^L_(\d+)$/.exec(label)
  const address = match?.[1] === undefined ? Number.NaN : Number(match[1])
  if (!Number.isSafeInteger(address) || address <= 0)
    throw new Error(`W9 source ledger: ${sourceId} label 非法 ${label}`)
  return address
}

function derivePalRuntimeEntryFacts(
  sources: Pick<PalMigrationSources, 'scenes'>,
): Map<string, W9LifecycleRuntimeEntryFact> {
  const facts = new Map<string, W9LifecycleRuntimeEntryFact>()
  const add = (fact: W9LifecycleRuntimeEntryFact): void => {
    if (facts.has(fact.sourceId))
      throw new Error(`W9 source ledger: 重复 runtime entry fact ${fact.sourceId}`)
    facts.set(fact.sourceId, fact)
  }
  for (const scene of sources.scenes) {
    const sceneId = sceneSlug(scene.sceneId)
    for (const eventObject of scene.eventObjects) {
      const entityId = `e${eventObject.id}`
      const sourceEventObjectSha256 = stableJsonSha256(eventObject)
      const sourceInitialState = eventObject.sState ?? 1
      if (eventObject.triggerLabel) {
        const sourceId = `${sceneId}/${entityId}/trigger`
        const triggerMode = eventObject.triggerMode ?? 0
        // collectSourceEntrySites deliberately inventories disabled trigger pointers too. They
        // are not runtime proof: only modes 1..8 pass the engine's positive-state trigger gate.
        if (triggerMode >= 1 && triggerMode <= 8)
          add({
            sourceId,
            kind: 'entity-trigger',
            sceneId,
            entityId,
            sourceAddress: sourceAddressFromLabel(eventObject.triggerLabel, sourceId),
            sourceLabel: eventObject.triggerLabel,
            runtimeGate: 'trigger-mode-positive-state-gate',
            triggerMode,
            sourceInitialState,
            sourceEventObjectSha256,
          })
      }
      if (eventObject.autoLabel) {
        const sourceId = `${sceneId}/${entityId}/auto`
        add({
          sourceId,
          kind: 'entity-auto',
          sceneId,
          entityId,
          sourceAddress: sourceAddressFromLabel(eventObject.autoLabel, sourceId),
          sourceLabel: eventObject.autoLabel,
          runtimeGate: 'auto-runner-positive-state-gate',
          sourceInitialState,
          sourceEventObjectSha256,
        })
      }
    }
  }
  return facts
}

function assertRuntimeEntryFact(fact: W9LifecycleRuntimeEntryFact, sourceId: string): void {
  if (
    fact.sourceId !== sourceId ||
    !/^s\d+$/.test(fact.sceneId) ||
    !/^e\d+$/.test(fact.entityId) ||
    !Number.isSafeInteger(fact.sourceAddress) ||
    fact.sourceAddress <= 0 ||
    fact.sourceLabel !== `L_${fact.sourceAddress}` ||
    !Number.isSafeInteger(fact.sourceInitialState) ||
    !/^[0-9a-f]{64}$/.test(fact.sourceEventObjectSha256)
  )
    throw new Error(`W9 source ledger: runtime entry fact 漂移 ${sourceId}`)
  if (fact.kind === 'entity-trigger') {
    if (
      fact.runtimeGate !== 'trigger-mode-positive-state-gate' ||
      !Number.isSafeInteger(fact.triggerMode) ||
      Number(fact.triggerMode) < 1 ||
      Number(fact.triggerMode) > 8
    )
      throw new Error(`W9 source ledger: trigger runtime gate 不成立 ${sourceId}`)
  } else if (
    fact.runtimeGate !== 'auto-runner-positive-state-gate' ||
    fact.triggerMode !== undefined
  )
    throw new Error(`W9 source ledger: auto runtime gate 漂移 ${sourceId}`)
}

function normalizeAllowlist(paths: readonly string[]): string[] {
  const normalized = [...new Set(paths)].sort(stableStringCompare)
  if (!normalized.length) throw new Error('W9 source ledger: affected-file allowlist 为空')
  for (const path of normalized)
    if (
      !path ||
      path.startsWith('/') ||
      path.startsWith('./') ||
      path.includes('\\') ||
      path.split('/').some((part) => part === '' || part === '.' || part === '..')
    )
      throw new Error(`W9 source ledger: 非法 affected-file allowlist 路径 ${path}`)
  return normalized
}

function normalizeContract(
  contract: readonly W9LifecycleSourceContractEntry[],
): W9LifecycleSourceContractEntry[] {
  const entries = contract
    .map((entry) => ({ ...entry, operands: [...entry.operands] }))
    .sort((left, right) => left.sourceAddress - right.sourceAddress || left.opcode - right.opcode)
  if (!entries.length) throw new Error('W9 source ledger: source contract 为空')
  const addresses = new Set<number>()
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.sourceAddress) || entry.sourceAddress < 0)
      throw new Error(`W9 source ledger: 非法 source address ${entry.sourceAddress}`)
    if (addresses.has(entry.sourceAddress))
      throw new Error(`W9 source ledger: 重复 source address ${entry.sourceAddress}`)
    addresses.add(entry.sourceAddress)
    if (entry.opcode !== 0x4b && entry.opcode !== 0x52)
      throw new Error(`W9 source ledger: 非法 opcode ${String(entry.opcode)}`)
    if (
      !/^[0-9a-f]{64}$/.test(entry.sourceCommandSha256) ||
      entry.operands.some(
        (operand) => !Number.isInteger(operand) || operand < 0 || operand > 0xffff,
      )
    )
      throw new Error(`W9 source ledger: ${entry.sourceAddress} source command contract 非法`)
    if (!Number.isSafeInteger(entry.ticks) || entry.ticks <= 0)
      throw new Error(`W9 source ledger: ${entry.sourceAddress} ticks 非正安全整数`)
  }
  return entries
}

function targetKey(target: W9LifecycleTarget): string {
  return `${target.sceneId}/${target.entityId}`
}

function targetForContext(context: R13SourceExecutionContext): W9LifecycleTarget {
  const match = /^(s\d+)\/(e\d+)\/(trigger|auto)$/.exec(context.entrySiteId)
  const sceneId = match?.[1]
  const entityId = match?.[2]
  if (
    !sceneId ||
    !entityId ||
    context.host.sourceId !== context.entrySiteId ||
    context.owner !== sceneId ||
    context.self !== entityId
  )
    throw new Error(
      `W9 source ledger: context ${context.id} 不是可证明的直接实体入口 ` +
        `(entry=${context.entrySiteId}, owner=${context.owner}, self=${String(context.self)})`,
    )
  return { sceneId, entityId }
}

function ticksForCommand(
  command: SourceCmd,
  contract: W9LifecycleSourceContractEntry,
): number {
  if (command.op !== 'raw' || command.opcode !== contract.opcode)
    throw new Error(
      `W9 source ledger: source drift @${contract.sourceAddress}，期望 0x${contract.opcode.toString(16)}`,
    )
  const operands = command.operands ?? []
  const actualCommandSha256 = stableJsonSha256(command)
  if (
    actualCommandSha256 !== contract.sourceCommandSha256 ||
    stableJsonSha256(operands) !== stableJsonSha256(contract.operands)
  )
    throw new Error(
      `W9 source ledger: source command drift @${contract.sourceAddress} ` +
        `(actual=${actualCommandSha256}, expected=${contract.sourceCommandSha256})`,
    )
  if (operands.some((operand) => !Number.isInteger(operand) || operand < 0 || operand > 0xffff))
    throw new Error(`W9 source ledger: @${contract.sourceAddress} operands 非 WORD`)
  const ticks =
    contract.opcode === 0x4b
      ? 15
      : (() => {
          const word = operands[0] ?? 0
          const signed = signExtendI16(word || 800)
          if (signed <= 0)
            throw new Error(
              `W9 source ledger: 0x52@${contract.sourceAddress} SHORT ticks=${signed} 非正，停止生成`,
            )
          return signed
        })()
  if (ticks !== contract.ticks)
    throw new Error(
      `W9 source ledger: source drift @${contract.sourceAddress} ticks=${ticks}，期望 ${contract.ticks}`,
    )
  return ticks
}

const BATTLE_PRESERVATION_ROOT_KINDS = Object.freeze([
  'actor',
  'enemy',
  'item',
  'skill',
] as const)

const BATTLE_STATE_WRITER_OPCODES = new Set([0x49, 0x6f, 0x84, 0x9a, 0x52])

function entityIdFromWord(word: number): string | undefined {
  if (!Number.isSafeInteger(word) || word <= 0 || word >= 0xffff) return undefined
  return `e${word - 1}`
}

function writerTargetHits(
  command: SourceCmd,
  context: R13SourceExecutionContext,
  targetEntityIds: ReadonlySet<string>,
  targetEntityWords: ReadonlyMap<string, number>,
): { hits: string[]; ambiguous: string[] } {
  if (command.op !== 'raw' || command.opcode === undefined) return { hits: [], ambiguous: [] }
  const operands = command.operands ?? []
  const hits = new Set<string>()
  const ambiguous: string[] = []
  const addWord = (word: number): void => {
    const entityId = entityIdFromWord(word)
    if (entityId && targetEntityIds.has(entityId)) hits.add(entityId)
  }
  const addSelf = (reason: string): void => {
    if (!context.self) {
      ambiguous.push(reason)
      return
    }
    if (targetEntityIds.has(context.self)) hits.add(context.self)
  }

  if (command.opcode === 0x49) {
    const rawTarget = operands[0] ?? 0
    if (rawTarget === 0) return { hits: [], ambiguous }
    if (rawTarget === 0xffff) addSelf('0x49 implicit self without census self')
    else addWord(rawTarget)
  } else if (command.opcode === 0x6f) {
    const rawSource = operands[0] ?? 0
    if (rawSource === 0 || rawSource === 0xffff) return { hits: [], ambiguous }
    if (context.self && rawSource === entityWord(context.self)) return { hits: [], ambiguous }
    addSelf('0x6F write-to-self without census self')
  } else if (command.opcode === 0x84) {
    const rawTarget = operands[0] ?? 0
    if (rawTarget !== 0xffff) addWord(rawTarget)
  } else if (command.opcode === 0x9a) {
    const from = operands[0] ?? 0
    const to = operands[1] ?? 0
    for (const [entityId, word] of targetEntityWords)
      if (from <= word && word <= to) hits.add(entityId)
  } else if (command.opcode === 0x52) {
    addSelf('0x52 implicit self without census self')
  }

  return {
    hits: [...hits].sort(stableStringCompare),
    ambiguous: [...ambiguous].sort(stableStringCompare),
  }
}

function buildBattleStartPreservationProof(args: {
  commands: readonly SourceCmd[]
  census: R13SourceExecutionCensusV1
  contexts: ReadonlyMap<string, R13SourceExecutionContext>
  protectedTargets: readonly W9LifecycleTarget[]
  instructionHashes: ReadonlyMap<number, string>
}): W9BattleStartPreservationProofV1 {
  const targetEntityIds = [
    ...new Set(args.protectedTargets.map((target) => target.entityId)),
  ].sort(stableStringCompare)
  const targetEntityIdSet = new Set(targetEntityIds)
  const targetEntityWords = new Map(
    targetEntityIds.map((entityId) => [entityId, entityWord(entityId)] as const),
  )
  const rootKindByEntry = new Map(args.census.entries.map((entry) => [entry.sourceId, entry.kind]))
  const battleRootKindSet = new Set<string>(BATTLE_PRESERVATION_ROOT_KINDS)
  const battleContextIds = new Set<string>()
  for (const context of args.census.contexts) {
    const rootKind = rootKindByEntry.get(context.entrySiteId)
    if (rootKind && battleRootKindSet.has(rootKind)) battleContextIds.add(context.id)
  }

  const writerFacts: Array<{
    address: number
    opcode: number
    contextId: string
    entrySiteId: string
    rootKind: string
    self: string | null
    sourceCommandSha256: string | undefined
    targetHits: string[]
    ambiguous: string[]
  }> = []
  for (const site of args.census.sites) {
    if (!battleContextIds.has(site.contextId)) continue
    const command = args.commands[site.address]
    if (command?.op !== 'raw' || command.opcode === undefined) continue
    if (!BATTLE_STATE_WRITER_OPCODES.has(command.opcode)) continue
    const context = args.contexts.get(site.contextId)
    if (!context)
      throw new Error(`W9 source ledger: battle preservation context 缺失 ${site.contextId}`)
    const rootKind = rootKindByEntry.get(context.entrySiteId)
    if (!rootKind)
      throw new Error(`W9 source ledger: battle preservation root 缺失 ${context.entrySiteId}`)
    const { hits, ambiguous } = writerTargetHits(
      command,
      context,
      targetEntityIdSet,
      targetEntityWords,
    )
    writerFacts.push({
      address: site.address,
      opcode: command.opcode,
      contextId: site.contextId,
      entrySiteId: context.entrySiteId,
      rootKind,
      self: context.self ?? null,
      sourceCommandSha256: args.instructionHashes.get(site.address),
      targetHits: hits,
      ambiguous,
    })
  }
  writerFacts.sort(
    (left, right) =>
      left.address - right.address ||
      stableStringCompare(left.contextId, right.contextId) ||
      stableStringCompare(left.entrySiteId, right.entrySiteId),
  )
  const hitFacts = writerFacts.filter(
    (fact) => fact.targetHits.length > 0 || fact.ambiguous.length > 0,
  )
  if (hitFacts.length > 0) {
    const sample = hitFacts
      .slice(0, 3)
      .map(
        (fact) =>
          `${fact.address}:${fact.contextId}:hits=${fact.targetHits.join(',')}:ambiguous=${fact.ambiguous.join(',')}`,
      )
      .join('; ')
    throw new Error(`W9 source ledger: 0x07 battle preservation 不成立，${sample}`)
  }

  const facts = {
    methodVersion: PAL_W9_BATTLE_PRESERVATION_METHOD,
    battleRootKinds: BATTLE_PRESERVATION_ROOT_KINDS,
    targetEntityIds,
    writerFacts,
  }
  return {
    methodVersion: PAL_W9_BATTLE_PRESERVATION_METHOD,
    battleRootKinds: BATTLE_PRESERVATION_ROOT_KINDS,
    targetEntityCount: targetEntityIds.length,
    targetEntityIdsSha256: stableJsonSha256(targetEntityIds),
    battleContextCount: battleContextIds.size,
    writerSiteCount: writerFacts.length,
    writerHitSiteCount: hitFacts.length,
    writerHitFactsSha256: stableJsonSha256(hitFacts),
    factsSha256: stableJsonSha256(facts),
  }
}

function assertPalConservation(summary: W9LifecycleSourceLedgerV1['summary']): void {
  const expected = {
    sourceInstructions: 4,
    sourceSites: 1849,
    executionContexts: 928,
    opcode4bSites: 928,
    opcode52Sites: 921,
    pairedContexts: 921,
    opcode4bOnlyContexts: 7,
    opcode52OnlyContexts: 0,
    foldedHostileContexts: 828,
    residualPairedContexts: 93,
    residualOpcode4bOnlyContexts: 7,
    landings: {
      hostilePolicies: 828,
      suspendCommands: 100,
      hideCommands: 93,
      total: 1021,
    },
  }
  if (stableJsonSha256(summary) !== stableJsonSha256(expected))
    throw new Error(
      `W9 source ledger: PAL 守恒漂移，actual=${JSON.stringify(summary)} expected=${JSON.stringify(expected)}`,
    )
}

export function buildW9LifecycleSourceLedger(
  args: BuildW9LifecycleSourceLedgerArgs,
): W9LifecycleSourceLedgerV1 {
  if (!args.generationCommand.trim()) throw new Error('W9 source ledger: generation command 为空')
  assertR13SourceExecutionCensus(args.census)
  const allowlist = normalizeAllowlist(args.affectedFileAllowlist)
  const contract = normalizeContract(args.sourceContract)
  if (args.commands.length !== args.census.instructions.length)
    throw new Error('W9 source ledger: commands/census 长度漂移')

  const contexts = new Map(args.census.contexts.map((context) => [context.id, context]))
  const sites = new Map(args.census.sites.map((site) => [site.id, site]))
  const instructionHashes = new Map<number, string>()
  for (const instruction of args.census.instructions) {
    const command = args.commands[instruction.address]
    if (!command || stableJsonSha256(command) !== instruction.sourceCommandSha256)
      throw new Error(`W9 source ledger: source command hash 漂移 @${instruction.address}`)
    instructionHashes.set(instruction.address, instruction.sourceCommandSha256)
  }
  const allowedAddressesByContext = new Map<string, Set<number>>()
  for (const site of args.census.sites) {
    const addresses = allowedAddressesByContext.get(site.contextId) ?? new Set<number>()
    addresses.add(site.address)
    allowedAddressesByContext.set(site.contextId, addresses)
  }
  const edgesByAddress = new Map<number, ScriptEdge[]>()
  for (const edge of extractSourceScriptEdgesV2(args.commands)) {
    const edges = edgesByAddress.get(edge.from) ?? []
    edges.push(edge)
    edgesByAddress.set(edge.from, edges)
  }
  for (const edges of edgesByAddress.values())
    edges.sort(
      (left, right) =>
        left.to - right.to ||
        stableStringCompare(left.kind, right.kind) ||
        stableStringCompare(left.reason, right.reason),
    )

  const normalizedFoldedTargets = args.foldedHostileTargets
    .map(({ sceneId, entityId }) => ({ sceneId, entityId }))
    .sort(
      (left, right) =>
        stableStringCompare(left.sceneId, right.sceneId) ||
        stableStringCompare(left.entityId, right.entityId),
    )
  const foldedTargetKeys = normalizedFoldedTargets.map(targetKey)
  const foldedTargets = new Set(foldedTargetKeys)
  if (foldedTargets.size !== args.foldedHostileTargets.length)
    throw new Error('W9 source ledger: folded hostile target 重复')
  const contractsByAddress = new Map(contract.map((entry) => [entry.sourceAddress, entry]))
  const relevantSites: Array<{
    siteId: string
    address: number
    contextId: string
    contract: W9LifecycleSourceContractEntry
  }> = []
  for (const contractEntry of contract) {
    const instruction = args.census.instructions[contractEntry.sourceAddress]
    const command = args.commands[contractEntry.sourceAddress]
    if (!instruction || !command)
      throw new Error(`W9 source ledger: source address ${contractEntry.sourceAddress} 越界`)
    ticksForCommand(command, contractEntry)
    for (const siteId of instruction.executionSiteIds) {
      const site = sites.get(siteId)
      if (!site || site.address !== contractEntry.sourceAddress)
        throw new Error(`W9 source ledger: instruction/site 反向索引漂移 ${siteId}`)
      relevantSites.push({
        siteId,
        address: site.address,
        contextId: site.contextId,
        contract: contractEntry,
      })
    }
  }
  relevantSites.sort(
    (left, right) =>
      left.address - right.address || stableStringCompare(left.contextId, right.contextId),
  )

  const protectedTargets = relevantSites.map((site) => {
    const context = contexts.get(site.contextId)
    if (!context) throw new Error(`W9 source ledger: context/site 索引漂移 ${site.contextId}`)
    return targetForContext(context)
  })
  const battleStartPreservationProof = buildBattleStartPreservationProof({
    commands: args.commands,
    census: args.census,
    contexts,
    protectedTargets,
    instructionHashes,
  })

  const targetAddressesByContext = new Map<string, Set<number>>()
  for (const site of relevantSites) {
    const addresses = targetAddressesByContext.get(site.contextId) ?? new Set<number>()
    addresses.add(site.address)
    targetAddressesByContext.set(site.contextId, addresses)
  }
  const proofByContext = new Map<string, ContextProofResult>()
  const relevantRuntimeFacts = new Map<string, W9LifecycleRuntimeEntryFact>()
  for (const [contextId, targetAddresses] of targetAddressesByContext) {
    const context = contexts.get(contextId)
    const allowedAddresses = allowedAddressesByContext.get(contextId)
    if (!context || !allowedAddresses)
      throw new Error(`W9 source ledger: context/site 索引漂移 ${contextId}`)
    // W9 does not borrow the caller's runtime gate for a dynamically rebound owner/self.
    // Only a direct entity runner entry establishes the positive pre-state axiom.
    targetForContext(context)
    const runtimeEntryFact = args.runtimeEntryFacts.get(context.entrySiteId)
    if (runtimeEntryFact) {
      assertRuntimeEntryFact(runtimeEntryFact, context.entrySiteId)
      const previous = relevantRuntimeFacts.get(runtimeEntryFact.sourceId)
      if (previous && stableJsonSha256(previous) !== stableJsonSha256(runtimeEntryFact))
        throw new Error(`W9 source ledger: runtime entry fact 重复漂移 ${runtimeEntryFact.sourceId}`)
      relevantRuntimeFacts.set(runtimeEntryFact.sourceId, runtimeEntryFact)
    }
    proofByContext.set(
      contextId,
      proveContextPreStates({
        commands: args.commands,
        census: args.census,
        context,
        targetAddresses: [...targetAddresses].sort((left, right) => left - right),
        edgesByAddress,
        instructionHashes,
        allowedAddresses,
        runtimeEntryFact,
        battleStartPreservesTargetState:
          battleStartPreservationProof.writerHitSiteCount === 0,
      }),
    )
  }

  const entries: W9LifecycleSourceLedgerEntry[] = []
  for (const site of relevantSites) {
    const context = contexts.get(site.contextId)!
    const proof = proofByContext.get(site.contextId)!
    const runtimeEntryFact = args.runtimeEntryFacts.get(context.entrySiteId)
    const preState = proof.beforeByAddress.get(site.address) ?? 0
    if (preState !== STATE_POSITIVE)
      throw new Error(
        `W9 source ledger: 0x${site.contract.opcode.toString(16)}@${site.address} ` +
          `context=${site.contextId} preState=${stateMaskLabel(preState)}，停止生成`,
      )
    if (!runtimeEntryFact)
      throw new Error(
        `W9 source ledger: context=${site.contextId} 缺 runtime entry fact，停止生成`,
      )
    const target = targetForContext(context)
    const folded = foldedTargets.has(targetKey(target))
    const ticks = ticksForCommand(args.commands[site.address]!, site.contract)
    const disposition: W9LifecycleSourceDisposition =
      site.contract.opcode === 0x4b
        ? folded
          ? {
              kind: 'folded-hostile-on-player-flee',
              policy: { kind: 'suspend', ticks },
            }
          : { kind: 'lifecycle-suspend', command: 'suspendEntity', ticks }
        : folded
          ? { kind: 'folded-hostile-on-victory', policy: { kind: 'hide', ticks } }
          : { kind: 'lifecycle-hide', command: 'hideEntity', ticks }
    const entry = args.census.entries.find(
      (candidate) => candidate.sourceId === context.entrySiteId,
    )!
    entries.push({
      id: `w9-site-${site.address}-${site.contextId}`,
      sourceAddress: site.address,
      opcode: site.contract.opcode,
      operands: [...(args.commands[site.address]!.operands ?? [])],
      sourceCommandSha256: instructionHashes.get(site.address)!,
      contextId: site.contextId,
      entrySite: { id: entry.sourceId, kind: entry.kind, sourceAddress: entry.entry },
      channel: context.channel,
      owner: context.owner,
      self: context.self!,
      target,
      disposition,
      preState: { kind: 'positive' },
      preStateProof: {
        methodVersion: PAL_W9_PRESTATE_PROOF_METHOD,
        entryGate: 'entity-runtime-requires-positive-state',
        runtimeGate: runtimeEntryFact.runtimeGate,
        ...(runtimeEntryFact.triggerMode === undefined
          ? {}
          : { triggerMode: runtimeEntryFact.triggerMode }),
        sourceInitialState: runtimeEntryFact.sourceInitialState,
        sourceEventObjectSha256: runtimeEntryFact.sourceEventObjectSha256,
        factsSha256: proof.factsSha256ByTarget.get(site.address)!,
      },
    })
  }

  const contextsWith4b = new Set(
    entries.filter((entry) => entry.opcode === 0x4b).map((entry) => entry.contextId),
  )
  const contextsWith52 = new Set(
    entries.filter((entry) => entry.opcode === 0x52).map((entry) => entry.contextId),
  )
  const allContexts = new Set([...contextsWith4b, ...contextsWith52])
  const pairedContexts = new Set(
    [...contextsWith4b].filter((contextId) => contextsWith52.has(contextId)),
  )
  const targetByContext = new Map<string, string>()
  for (const entry of entries) {
    const key = targetKey(entry.target)
    const previous = targetByContext.get(entry.contextId)
    if (previous !== undefined && previous !== key)
      throw new Error(`W9 source ledger: context ${entry.contextId} target 漂移`)
    targetByContext.set(entry.contextId, key)
  }
  for (const foldedTarget of foldedTargets) {
    const contextIds = [...targetByContext.entries()]
      .filter(([, target]) => target === foldedTarget)
      .map(([contextId]) => contextId)
    if (contextIds.length !== 1 || !pairedContexts.has(contextIds[0]!))
      throw new Error(`W9 source ledger: folded hostile ${foldedTarget} 缺成对 0x4B/0x52 proof`)
  }
  const foldedContexts = new Set(
    [...targetByContext.entries()]
      .filter(([, target]) => foldedTargets.has(target))
      .map(([contextId]) => contextId),
  )
  const residualPairedContexts = [...pairedContexts].filter(
    (contextId) => !foldedContexts.has(contextId),
  ).length
  const opcode4bOnlyContexts = [...contextsWith4b].filter(
    (contextId) => !contextsWith52.has(contextId),
  )
  const opcode52OnlyContexts = [...contextsWith52].filter(
    (contextId) => !contextsWith4b.has(contextId),
  )
  const suspendCommands = entries.filter(
    (entry) => entry.disposition.kind === 'lifecycle-suspend',
  ).length
  const hideCommands = entries.filter(
    (entry) => entry.disposition.kind === 'lifecycle-hide',
  ).length
  const summary: W9LifecycleSourceLedgerV1['summary'] = {
    sourceInstructions: contractsByAddress.size,
    sourceSites: entries.length,
    executionContexts: allContexts.size,
    opcode4bSites: entries.filter((entry) => entry.opcode === 0x4b).length,
    opcode52Sites: entries.filter((entry) => entry.opcode === 0x52).length,
    pairedContexts: pairedContexts.size,
    opcode4bOnlyContexts: opcode4bOnlyContexts.length,
    opcode52OnlyContexts: opcode52OnlyContexts.length,
    foldedHostileContexts: foldedContexts.size,
    residualPairedContexts,
    residualOpcode4bOnlyContexts: opcode4bOnlyContexts.filter(
      (contextId) => !foldedContexts.has(contextId),
    ).length,
    landings: {
      hostilePolicies: foldedContexts.size,
      suspendCommands,
      hideCommands,
      total: foldedContexts.size + suspendCommands + hideCommands,
    },
  }
  const withoutDigest = {
    kind: 'w9-entity-lifecycle-source-ledger' as const,
    version: 1 as const,
    methodVersion: PAL_W9_LIFECYCLE_LEDGER_METHOD,
    transitionId: PAL_W9_LIFECYCLE_TRANSITION_ID,
    generator: {
      sourceDigest: args.census.generator.sourceDigest,
      sourceCensusDigest: args.census.digest,
      generationCommand: args.generationCommand,
      generationCommandSha256: stableJsonSha256(args.generationCommand),
      affectedFileAllowlist: allowlist,
      affectedFileAllowlistSha256: stableJsonSha256(allowlist),
      foldedHostileTargetsSha256: stableJsonSha256(normalizedFoldedTargets),
      runtimeEntryFactsSha256: stableJsonSha256(
        [...relevantRuntimeFacts.values()].sort((left, right) =>
          stableStringCompare(left.sourceId, right.sourceId),
        ),
      ),
      battleStartPreservationProof,
    },
    entries,
    summary,
  }
  return { ...withoutDigest, digest: stableJsonSha256(withoutDigest) }
}

export function buildPalW9LifecycleSourceLedger(
  args: BuildPalW9LifecycleSourceLedgerArgs,
): W9LifecycleSourceLedgerV1 {
  assertPreparedR13SourceExecutionCensus(
    args.preparedSourceCensus,
    args.sources,
    args.preparedSourceCensus.census,
  )
  if (
    args.preparedSourceCensus.census.generator.sourceDigest !== PAL_W9_EXPECTED_SOURCE_DIGEST ||
    args.preparedSourceCensus.census.digest !== PAL_W9_EXPECTED_SOURCE_CENSUS_DIGEST
  )
    throw new Error(
      'W9 source ledger: PAL source/census authority 漂移，必须重新设计审查，禁止动态重钉',
    )
  const foldedTargets = args.foldedHostileTargets
    .map(({ sceneId, entityId }) => ({ sceneId, entityId }))
    .sort(
      (left, right) =>
        stableStringCompare(left.sceneId, right.sceneId) ||
        stableStringCompare(left.entityId, right.entityId),
    )
  if (stableJsonSha256(foldedTargets) !== PAL_W9_EXPECTED_FOLDED_HOSTILE_TARGETS_DIGEST)
    throw new Error(
      'W9 source ledger: B10/v12 folded hostile target set 漂移，禁止只以 828 aggregate 重钉',
    )
  const ledger = buildW9LifecycleSourceLedger({
    commands: args.preparedSourceCensus.commands,
    census: args.preparedSourceCensus.census,
    foldedHostileTargets: args.foldedHostileTargets.map(({ sceneId, entityId }) => ({
      sceneId,
      entityId,
    })),
    generationCommand: PAL_W9_GENERATION_COMMAND,
    affectedFileAllowlist: args.affectedFileAllowlist,
    sourceContract: PAL_W9_LIFECYCLE_SOURCE_CONTRACT,
    runtimeEntryFacts: derivePalRuntimeEntryFacts(args.sources),
  })
  if (ledger.generator.runtimeEntryFactsSha256 !== PAL_W9_EXPECTED_RUNTIME_ENTRY_FACTS_DIGEST)
    throw new Error(
      'W9 source ledger: runtime entry/event-object proof surface 漂移，禁止动态重钉',
    )
  if (
    ledger.generator.battleStartPreservationProof.factsSha256 !==
    PAL_W9_EXPECTED_BATTLE_PRESERVATION_FACTS_DIGEST
  )
    throw new Error(
      'W9 source ledger: 0x07 battle preservation proof surface 漂移，禁止动态重钉',
    )
  assertPalConservation(ledger.summary)
  return ledger
}
