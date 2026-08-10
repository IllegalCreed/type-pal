import { createHash } from 'node:crypto'
import type { PalMigrationSources } from '../../pal-migration.js'
import { collectSourceEntrySites, type SourceEntrySite } from '../../script-control-flow-audit.js'
import { extractSourceScriptEdgesV2, type ScriptEdge } from '../../script-graph.js'
import type { SourceCmd } from '../../source-facts.js'
import { legacyEventObjectEntityId, sceneSlug } from '../../source-facts.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'

export const R13_SOURCE_EXECUTION_CENSUS_METHOD = 'n3-p7-r13-source-execution-v2' as const

export type R13SourceExecutionChannel = 'auto' | 'trigger'

export interface R13SourceExecutionHost {
  kind:
    | SourceEntrySite['kind']
    | 'dynamic-entity-trigger'
    | 'dynamic-entity-auto'
    | 'dynamic-scene-on-enter'
    | 'dynamic-scene-on-teleport'
  sourceId: string
}

export interface R13SourceExecutionContext {
  id: string
  entrySiteId: string
  channel: R13SourceExecutionChannel
  owner: string
  host: R13SourceExecutionHost
  self?: string
}

export interface R13SourceInstructionCensusEntry {
  address: number
  sourceCommandSha256: string
  op: string
  opcode?: number
  reachable: boolean
  executionSiteIds: string[]
}

export interface R13SourceExecutionSite {
  id: string
  address: number
  contextId: string
}

export interface R13SourceExecutionCensusV1 {
  kind: 'r13-source-execution-census'
  version: 1
  methodVersion: typeof R13_SOURCE_EXECUTION_CENSUS_METHOD
  generator: {
    sourceDigest: string
  }
  entries: SourceEntrySite[]
  contexts: R13SourceExecutionContext[]
  instructions: R13SourceInstructionCensusEntry[]
  sites: R13SourceExecutionSite[]
  summary: {
    instructions: number
    reachableInstructions: number
    unreachableInstructions: number
    entrySites: number
    contexts: number
    executionSites: number
    sitesByChannel: Record<R13SourceExecutionChannel, number>
  }
  digest: string
}

/**
 * Explicit immutable-lifetime proof context for expensive PAL graph traversal.
 * Callers must not mutate sources, commands, or census while this object is in use.
 * There is intentionally no module-global cache.
 */
export interface PreparedR13SourceExecutionCensus {
  readonly sources: PalMigrationSources
  readonly commands: readonly SourceCmd[]
  readonly census: R13SourceExecutionCensusV1
  readonly censusDigest: string
}

const preparedR13SourceExecutionCensuses = new WeakSet<PreparedR13SourceExecutionCensus>()
const preparedR13SourceExecutionCensusDependencies = new WeakMap<
  PreparedR13SourceExecutionCensus,
  Readonly<{
    migrate: PalMigrationSources['migrate']
    commands: PalMigrationSources['migrate']['commands']
    scenes: PalMigrationSources['scenes']
    items: PalMigrationSources['migrate']['items']
    spells: PalMigrationSources['migrate']['spells']
    enemyObjects: PalMigrationSources['migrate']['enemyObjects']
    objectPlayers: PalMigrationSources['objectPlayers']
  }>
>()

function deepFreezePreparedValue<T>(value: T, seen = new Set<object>()): T {
  if (!value || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreezePreparedValue(child, seen)
  return Object.freeze(value)
}

interface TraversalState {
  address: number
  context: Omit<R13SourceExecutionContext, 'id'>
}

const TARGET_OPERAND: Readonly<Record<number, number>> = {
  0x04: 0,
  0x06: 1,
  0x1e: 1,
  0x20: 2,
  0x24: 1,
  0x25: 1,
  0x2e: 2,
  0x33: 0,
  0x34: 0,
  0x38: 0,
  0x3a: 0,
  0x58: 2,
  0x5d: 1,
  0x5e: 1,
  0x61: 0,
  0x64: 1,
  0x68: 0,
  0x74: 0,
  0x79: 1,
  0x81: 2,
  0x83: 2,
  0x84: 2,
  0x86: 2,
  0x91: 0,
  0x94: 2,
  0x95: 1,
  0x9c: 1,
  0x9e: 2,
}

function shortDigest(value: unknown): string {
  return stableJsonSha256(value).slice(0, 20)
}

function commandName(command: SourceCmd): string {
  if (command.op === 'raw') return `raw:0x${(command.opcode ?? 0).toString(16).padStart(2, '0')}`
  return command.op ?? 'unknown'
}

function rootContext(site: SourceEntrySite): Omit<R13SourceExecutionContext, 'id'> {
  const entity = /\/(e\d+)\/(?:trigger|auto)$/.exec(site.sourceId)?.[1]
  return {
    entrySiteId: site.sourceId,
    channel: site.channel,
    owner: site.owner,
    host: { kind: site.kind, sourceId: site.sourceId },
    ...(entity ? { self: entity } : {}),
  }
}

export function r13SourceExecutionContextId(
  context: Omit<R13SourceExecutionContext, 'id'>,
): string {
  return `ctx-${shortDigest(context)}`
}

export function advanceR13SourceExecutionContext(
  context: Omit<R13SourceExecutionContext, 'id'>,
  address: number,
  command: SourceCmd,
  edge: ScriptEdge,
): Omit<R13SourceExecutionContext, 'id'> {
  if (command.op !== 'raw') return context
  const operands = command.operands ?? []
  if (command.opcode === 0x04 && edge.reason === '0x4') {
    const explicitOwner = operands[1] ?? 0
    const self = explicitOwner > 0 ? legacyEventObjectEntityId(explicitOwner) : context.self
    return {
      ...context,
      // SDLPal 的 0x04 即使从 auto runner 发起，也进入
      // PAL_RunTriggerScript；callee 不继承 caller 的 auto 语境。
      channel: 'trigger',
      owner: self ?? context.owner,
      ...(self ? { self } : {}),
    }
  }
  if ((command.opcode === 0x24 || command.opcode === 0x25) && edge.kind === 'binding') {
    const entityWord = operands[0] ?? 0
    const entity =
      entityWord === 0xffff
        ? context.self
        : entityWord > 0
          ? legacyEventObjectEntityId(entityWord)
          : undefined
    if (!entity) return context
    const channel = command.opcode === 0x24 ? 'auto' : 'trigger'
    return {
      entrySiteId: context.entrySiteId,
      channel,
      owner: entity,
      host: {
        kind: command.opcode === 0x24 ? 'dynamic-entity-auto' : 'dynamic-entity-trigger',
        sourceId: `${context.entrySiteId}@${address}:${entity}:${channel}`,
      },
      self: entity,
    }
  }
  if (command.opcode === 0x6d && edge.kind === 'binding') {
    const sceneWord = operands[0] ?? 0
    const scene = sceneWord > 0 ? sceneSlug(sceneWord - 1) : 'invalid-scene'
    const slot = edge.reason === '0x6d.onEnter' ? ('on-enter' as const) : ('on-teleport' as const)
    return {
      entrySiteId: context.entrySiteId,
      channel: 'trigger',
      owner: scene,
      host: {
        kind: slot === 'on-enter' ? 'dynamic-scene-on-enter' : 'dynamic-scene-on-teleport',
        sourceId: `${context.entrySiteId}@${address}:${scene}:${slot}`,
      },
    }
  }
  return context
}

export function shouldFollowR13SourceExecutionEdge(
  command: SourceCmd,
  edge: ScriptEdge,
): boolean {
  if (command.op !== 'raw') return true
  const operands = command.operands ?? []
  if (
    (command.opcode === 0x24 || command.opcode === 0x25) &&
    (operands[0] ?? 0) === 0 &&
    edge.kind === 'binding'
  )
    return false
  if (command.opcode === 0x06 && (operands[1] ?? 0) === 0 && edge.reason === '0x6') return false
  const targetOperand = command.opcode === undefined ? undefined : TARGET_OPERAND[command.opcode]
  const zeroTarget = targetOperand !== undefined && (operands[targetOperand] ?? 0) === 0
  const zeroSpecial =
    command.opcode === 0x07 &&
    ((edge.reason === '0x07.lose' && (operands[1] ?? 0) === 0) ||
      (edge.reason === '0x07.flee' && (operands[2] ?? 0) === 0))
  const zeroSceneHook =
    command.opcode === 0x6d &&
    ((edge.reason === '0x6d.onEnter' && (operands[1] ?? 0) === 0) ||
      (edge.reason === '0x6d.onTeleport' && (operands[2] ?? 0) === 0))
  return !((zeroTarget && edge.reason !== 'fallthrough') || zeroSpecial || zeroSceneHook)
}

function addAutoZeroRateSelfLoop(
  queue: TraversalState[],
  state: TraversalState,
  command: SourceCmd,
): void {
  if (
    command.op === 'raw' &&
    command.opcode === 0x06 &&
    (command.operands?.[1] ?? 0) === 0 &&
    state.context.channel === 'auto'
  )
    queue.push(state)
}

export function buildR13SourceExecutionCensus(
  sources: PalMigrationSources,
): R13SourceExecutionCensusV1 {
  const sourceEntries = collectSourceEntrySites(sources)
  return buildR13SourceExecutionCensusFromGraph(
    sources.migrate.commands,
    sourceEntries.sites,
    createHash('sha256')
      .update(
        JSON.stringify({
          commands: sources.migrate.commands,
          entries: sourceEntries.sites,
          emptyPointers: sourceEntries.emptyPointers,
        }),
      )
      .digest('hex'),
  )
}

export function buildR13SourceExecutionCensusFromGraph(
  commands: readonly SourceCmd[],
  entries: readonly SourceEntrySite[],
  sourceDigestOverride?: string,
): R13SourceExecutionCensusV1 {
  const entryRecords = entries
    .map((entry) => ({ ...entry }))
    .sort(
      (left, right) =>
        stableStringCompare(left.sourceId, right.sourceId) ||
        left.entry - right.entry ||
        stableStringCompare(left.channel, right.channel) ||
        stableStringCompare(left.owner, right.owner) ||
        stableStringCompare(left.kind, right.kind),
    )
  const outgoing = new Map<number, ScriptEdge[]>()
  for (const edge of extractSourceScriptEdgesV2(commands)) {
    const edges = outgoing.get(edge.from) ?? []
    edges.push(edge)
    outgoing.set(edge.from, edges)
  }
  for (const edges of outgoing.values())
    edges.sort(
      (left, right) =>
        left.to - right.to ||
        stableStringCompare(left.kind, right.kind) ||
        stableStringCompare(left.reason, right.reason),
    )

  const queue: TraversalState[] = entryRecords.map((entry) => ({
    address: entry.entry,
    context: rootContext(entry),
  }))
  const contexts = new Map<string, R13SourceExecutionContext>()
  const sites = new Map<string, R13SourceExecutionSite>()
  const siteIdsByAddress = Array.from({ length: commands.length }, () => [] as string[])
  const visited = new Set<string>()

  while (queue.length) {
    const state = queue.pop()!
    if (state.address < 0 || state.address >= commands.length) continue
    const id = r13SourceExecutionContextId(state.context)
    const visitKey = `${id}:${state.address}`
    if (visited.has(visitKey)) continue
    visited.add(visitKey)
    contexts.set(id, { id, ...state.context })
    const siteId = `site-${state.address}-${id}`
    sites.set(siteId, { id: siteId, address: state.address, contextId: id })
    siteIdsByAddress[state.address]!.push(siteId)
    const command = commands[state.address]!
    for (const edge of outgoing.get(state.address) ?? []) {
      if (!shouldFollowR13SourceExecutionEdge(command, edge)) continue
      queue.push({
        address: edge.to,
        context: advanceR13SourceExecutionContext(state.context, state.address, command, edge),
      })
    }
    addAutoZeroRateSelfLoop(queue, state, command)
  }

  const instructionEntries = commands.map((command, address): R13SourceInstructionCensusEntry => {
    const executionSiteIds = [...siteIdsByAddress[address]!].sort(stableStringCompare)
    return {
      address,
      sourceCommandSha256: stableJsonSha256(command),
      op: commandName(command),
      ...(command.op === 'raw' && command.opcode !== undefined ? { opcode: command.opcode } : {}),
      reachable: executionSiteIds.length > 0,
      executionSiteIds,
    }
  })
  const contextEntries = [...contexts.values()].sort((left, right) =>
    stableStringCompare(left.id, right.id),
  )
  const siteEntries = [...sites.values()].sort(
    (left, right) =>
      left.address - right.address || stableStringCompare(left.contextId, right.contextId),
  )
  const sourceDigest = sourceDigestOverride ?? stableJsonSha256({ commands, entries: entryRecords })
  const withoutDigest = {
    kind: 'r13-source-execution-census' as const,
    version: 1 as const,
    methodVersion: R13_SOURCE_EXECUTION_CENSUS_METHOD,
    generator: { sourceDigest },
    entries: entryRecords,
    contexts: contextEntries,
    instructions: instructionEntries,
    sites: siteEntries,
    summary: {
      instructions: instructionEntries.length,
      reachableInstructions: instructionEntries.filter((entry) => entry.reachable).length,
      unreachableInstructions: instructionEntries.filter((entry) => !entry.reachable).length,
      entrySites: entryRecords.length,
      contexts: contextEntries.length,
      executionSites: siteEntries.length,
      sitesByChannel: {
        auto: siteEntries.filter((site) => contexts.get(site.contextId)?.channel === 'auto').length,
        trigger: siteEntries.filter((site) => contexts.get(site.contextId)?.channel === 'trigger')
          .length,
      },
    },
  }
  return { ...withoutDigest, digest: stableJsonSha256(withoutDigest) }
}

export function assertR13SourceExecutionCensus(
  census: R13SourceExecutionCensusV1,
  sources?: PalMigrationSources,
): void {
  if (
    census.kind !== 'r13-source-execution-census' ||
    census.version !== 1 ||
    census.methodVersion !== R13_SOURCE_EXECUTION_CENSUS_METHOD
  )
    throw new Error('R13 source census: header 漂移')
  if (!/^[0-9a-f]{64}$/.test(census.generator.sourceDigest))
    throw new Error('R13 source census: source digest 非 sha256')
  const entryIds = new Set<string>()
  const rootContextIds = new Map<string, string>()
  for (const [index, entry] of census.entries.entries()) {
    if (entryIds.has(entry.sourceId))
      throw new Error(`R13 source census: 重复 entry ${entry.sourceId}`)
    entryIds.add(entry.sourceId)
    if (entry.entry < 0 || entry.entry >= census.instructions.length)
      throw new Error(`R13 source census: entry 越界 ${entry.sourceId}`)
    if (index > 0) {
      const previous = census.entries[index - 1]!
      const order =
        stableStringCompare(previous.sourceId, entry.sourceId) ||
        previous.entry - entry.entry ||
        stableStringCompare(previous.channel, entry.channel) ||
        stableStringCompare(previous.owner, entry.owner) ||
        stableStringCompare(previous.kind, entry.kind)
      if (order >= 0) throw new Error('R13 source census: entries 排序漂移')
    }
  }
  const contexts = new Map<string, R13SourceExecutionContext>()
  for (const [index, context] of census.contexts.entries()) {
    if (contexts.has(context.id)) throw new Error(`R13 source census: 重复 context ${context.id}`)
    const { id, ...payload } = context
    if (r13SourceExecutionContextId(payload) !== id)
      throw new Error(`R13 source census: context id/payload 漂移 ${id}`)
    if (index > 0 && stableStringCompare(census.contexts[index - 1]!.id, context.id) >= 0)
      throw new Error('R13 source census: contexts 排序漂移')
    contexts.set(context.id, context)
    if (context.host.sourceId === context.entrySiteId) {
      const rootKey = [context.entrySiteId, context.channel, context.owner, context.host.kind].join(
        '\0',
      )
      if (rootContextIds.has(rootKey))
        throw new Error(`R13 source census: 重复 root context ${rootKey}`)
      rootContextIds.set(rootKey, context.id)
    }
  }
  const siteIds = new Set<string>()
  const sitesById = new Map<string, R13SourceExecutionSite>()
  const siteReferenceCounts = new Map<string, number>()
  const usedContexts = new Set<string>()
  const sitePayloadKeys = new Set<string>()
  const siteCountsByChannel: Record<R13SourceExecutionChannel, number> = {
    auto: 0,
    trigger: 0,
  }
  for (const [index, site] of census.sites.entries()) {
    if (siteIds.has(site.id)) throw new Error(`R13 source census: 重复 site ${site.id}`)
    siteIds.add(site.id)
    sitesById.set(site.id, site)
    const context = contexts.get(site.contextId)
    if (!context) throw new Error(`R13 source census: site ${site.id} 缺 context ${site.contextId}`)
    if (site.id !== `site-${site.address}-${site.contextId}`)
      throw new Error(`R13 source census: site id/payload 漂移 ${site.id}`)
    if (site.address < 0 || site.address >= census.instructions.length)
      throw new Error(`R13 source census: site address 越界 ${site.id}`)
    if (index > 0) {
      const previous = census.sites[index - 1]!
      const order =
        previous.address - site.address || stableStringCompare(previous.contextId, site.contextId)
      if (order >= 0) throw new Error('R13 source census: sites 排序漂移')
    }
    usedContexts.add(site.contextId)
    sitePayloadKeys.add(`${site.address}\0${site.contextId}`)
    siteCountsByChannel[context.channel]++
  }
  for (const instruction of census.instructions) {
    if (instruction.address < 0 || census.instructions[instruction.address] !== instruction)
      throw new Error(`R13 source census: instruction address 不连续 ${instruction.address}`)
    if (!/^[0-9a-f]{64}$/.test(instruction.sourceCommandSha256))
      throw new Error(`R13 source census: instruction hash 非 sha256 ${instruction.address}`)
    if (instruction.reachable !== instruction.executionSiteIds.length > 0)
      throw new Error(`R13 source census: instruction reachability 漂移 ${instruction.address}`)
    const localIds = new Set<string>()
    for (const [index, siteId] of instruction.executionSiteIds.entries()) {
      if (localIds.has(siteId))
        throw new Error(`R13 source census: instruction ${instruction.address} 重复 site ${siteId}`)
      localIds.add(siteId)
      if (index > 0 && stableStringCompare(instruction.executionSiteIds[index - 1]!, siteId) >= 0)
        throw new Error(`R13 source census: instruction ${instruction.address} site 排序漂移`)
      const site = sitesById.get(siteId)
      if (!site)
        throw new Error(`R13 source census: instruction ${instruction.address} 缺 site ${siteId}`)
      if (site.address !== instruction.address)
        throw new Error(
          `R13 source census: instruction ${instruction.address} 跨地址引用 ${siteId}`,
        )
      siteReferenceCounts.set(siteId, (siteReferenceCounts.get(siteId) ?? 0) + 1)
    }
  }
  for (const siteId of siteIds)
    if (siteReferenceCounts.get(siteId) !== 1)
      throw new Error(`R13 source census: site ${siteId} 反向引用不唯一`)
  for (const contextIdValue of contexts.keys())
    if (!usedContexts.has(contextIdValue))
      throw new Error(`R13 source census: 未使用 context ${contextIdValue}`)
  for (const entry of census.entries) {
    const rootContextId = rootContextIds.get(
      [entry.sourceId, entry.channel, entry.owner, entry.kind].join('\0'),
    )
    if (!rootContextId)
      throw new Error(`R13 source census: entry ${entry.sourceId} 缺 root context`)
    if (!sitePayloadKeys.has(`${entry.entry}\0${rootContextId}`))
      throw new Error(`R13 source census: entry ${entry.sourceId} 缺入口 site`)
  }
  const summary = {
    instructions: census.instructions.length,
    reachableInstructions: census.instructions.filter((entry) => entry.reachable).length,
    unreachableInstructions: census.instructions.filter((entry) => !entry.reachable).length,
    entrySites: census.entries.length,
    contexts: census.contexts.length,
    executionSites: census.sites.length,
    sitesByChannel: siteCountsByChannel,
  }
  if (stableJsonSha256(summary) !== stableJsonSha256(census.summary))
    throw new Error('R13 source census: summary 漂移')
  const { digest, ...withoutDigest } = census
  if (stableJsonSha256(withoutDigest) !== digest) throw new Error('R13 source census: digest 漂移')
  if (sources) {
    const rebuilt = buildR13SourceExecutionCensus(sources)
    if (stableJsonSha256(rebuilt) !== stableJsonSha256(census))
      throw new Error('R13 source census: source-backed rebuild 漂移')
  }
}

export function prepareR13SourceExecutionCensus(
  sources: PalMigrationSources,
): PreparedR13SourceExecutionCensus {
  const census = buildR13SourceExecutionCensus(sources)
  assertR13SourceExecutionCensus(census)
  const dependencies = Object.freeze({
    migrate: sources.migrate,
    commands: sources.migrate.commands,
    scenes: sources.scenes,
    items: sources.migrate.items,
    spells: sources.migrate.spells,
    enemyObjects: sources.migrate.enemyObjects,
    objectPlayers: sources.objectPlayers,
  })
  for (const dependency of [
    dependencies.commands,
    dependencies.scenes,
    dependencies.items,
    dependencies.spells,
    dependencies.enemyObjects,
    dependencies.objectPlayers,
  ])
    if (dependency) deepFreezePreparedValue(dependency)
  deepFreezePreparedValue(census)
  const prepared = Object.freeze({
    sources,
    commands: dependencies.commands,
    census,
    censusDigest: census.digest,
  })
  preparedR13SourceExecutionCensuses.add(prepared)
  preparedR13SourceExecutionCensusDependencies.set(prepared, dependencies)
  return prepared
}

export function assertPreparedR13SourceExecutionCensus(
  prepared: PreparedR13SourceExecutionCensus,
  sources: PalMigrationSources,
  census: R13SourceExecutionCensusV1,
): void {
  const dependencies = preparedR13SourceExecutionCensusDependencies.get(prepared)
  if (!preparedR13SourceExecutionCensuses.has(prepared) || !dependencies)
    throw new Error('R13 source census: prepared context 来源无效')
  if (
    prepared.sources !== sources ||
    dependencies.migrate !== sources.migrate ||
    dependencies.commands !== sources.migrate.commands ||
    dependencies.scenes !== sources.scenes ||
    dependencies.items !== sources.migrate.items ||
    dependencies.spells !== sources.migrate.spells ||
    dependencies.enemyObjects !== sources.migrate.enemyObjects ||
    dependencies.objectPlayers !== sources.objectPlayers ||
    prepared.commands !== dependencies.commands ||
    prepared.census !== census
  )
    throw new Error('R13 source census: prepared context 输入身份漂移')
  if (census.digest !== prepared.censusDigest)
    throw new Error('R13 source census: prepared context 摘要漂移')
}
