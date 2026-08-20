import { createHash } from 'node:crypto'
import type { Command, ScriptChunkV1, ScriptIndexV1, ScriptRef } from '@type-pal/content'
import { checkScriptIndex, stableScriptHash } from '@type-pal/content'
import type { SourceCmd } from './migrate-content.js'
import type { MigrationFileSet, PalMigrationSources } from './pal-migration.js'
import {
  analyzeScriptGraph,
  extractPalSourceScriptEdges,
  makeGlobalScriptRoots,
  type ScriptEdge,
  type ScriptEdgeKind,
} from './script-graph.js'
import type { ScriptRegistryDialogueStateAudit } from './translate-events.js'

export const SCRIPT_CONTROL_FLOW_AUDIT_METHOD = 'n3-p0-v1' as const

type SourceExecutionChannel = 'auto' | 'trigger'
type BodyCategory = 'scene-root' | 'scene-internal' | 'shared-scc' | 'shared-author'
type ProductReferenceKind = 'callScript' | 'jumpScript' | 'setEntityAuto' | 'setEntityTrigger'
type FoldedCategory = 'sprite-action' | 'hostile-behavior'
type ProductSeedDomain = 'scenes' | 'items' | 'skills' | 'enemies' | 'actors'

export interface SourceEntrySite {
  kind:
    | 'scene-on-enter'
    | 'scene-on-teleport'
    | 'entity-trigger'
    | 'entity-auto'
    | 'item'
    | 'skill'
    | 'enemy'
    | 'actor'
  sourceId: string
  owner: string
  entry: number
  channel: SourceExecutionChannel
}

export interface SourceAddressZeroSite {
  address?: number
  sourceId?: string
  opcode?: number
  operand?: number
  disposition:
    | 'empty-pointer'
    | 'absent-branch'
    | 'no-failure-branch'
    | 'clear-binding'
    | 'absent-scene-hook'
    | 'clear-scene-hooks'
    | 'stop-branch'
    | 'auto-self-loop'
    | 'trigger-stop'
    | 'context-dependent'
    | 'unowned-context'
  contexts?: SourceExecutionChannel[]
}

export interface SemanticSourceEdgeSite {
  from: string
  to: string
  kind: ScriptEdgeKind
}

export interface SemanticSourceGraphAudit {
  nodes: number
  nodesByChannel: Record<SourceExecutionChannel, number>
  edges: Record<ScriptEdgeKind, number>
  edgeSites: SemanticSourceEdgeSite[]
  components: number
  cyclicComponents: number
  cyclicNodes: number
  componentOf: Array<[node: string, componentId: number]>
  cyclicComponentIds: number[]
}

export interface ProductReferenceSite {
  callerBodyId: string
  path: string
  kind: ProductReferenceKind
  flow: 'execution' | 'deferred-binding'
  targetId: string
  targetChunk: string
}

export interface ProductEntrySite {
  kind: 'scene-stage-root' | 'scene-direct-binding' | 'item-run-script' | 'content-command'
  source: string
  path: string
  commandKind: string
  targetId: string
  targetChunk: string
}

export interface SceneHookBindingAudit {
  callerBodyId: string
  path: string
  sourceAddress?: number
  kind: 'setSceneOnEnter' | 'setSceneOnTeleport'
  targetScene: string
  targetIds: string[]
}

export interface ScriptBodyAudit {
  id: string
  chunk: string
  category: BodyCategory
  astKindNodes: number
  reachable: boolean
  runtimeEntryKinds: ProductEntrySite['kind'][]
  foldedFrom: FoldedCategory[]
  outgoingReferenceSites: number
  incomingPredecessorBodyIds: string[]
  sharedTail: boolean
  productComponent: { id: number; size: number; cyclic: boolean }
  source: {
    entryAddress?: number
    /** 该 body 直接翻译过的源命令地址；callee 归入自己的 body。 */
    addresses: number[]
    /** addresses 中所有“目标操作数为 0”的逐 opcode 语义判定。 */
    addressZeroSites: SourceAddressZeroSite[]
    owner?: string
    legacyComponent?: { id: number; size: number; cyclic: boolean }
  }
  derivation?: {
    kind:
      | 'translated-target'
      | 'legacy-alias'
      | 'content-entry'
      | 'folded-sprite-entry'
      | 'scene-hook-override'
    sources: string[]
  }
  dialogue?: {
    hash: string
    entry: ScriptRegistryDialogueStateAudit
    exit?: ScriptRegistryDialogueStateAudit
  }
  sceneHookContexts: Array<{
    targetScene: string
    slot: 'on-enter' | 'on-teleport'
    installerBodyId: string
    installerPath: string
    installerSourceAddress?: number
  }>
}

export interface ScriptControlFlowAuditV1 {
  version: 1
  methodVersion: typeof SCRIPT_CONTROL_FLOW_AUDIT_METHOD
  generator: {
    sourceDigest: string
    productDigest: string
    countingRules: {
      sourceRoots: string
      sourceScc: string
      productEntries: string
      productReferences: string
      productScc: string
      runtimeReachability: string
      sharedTail: string
      foldedBodies: string
    }
  }
  summary: {
    sourceCommands: number
    sourceEntrySites: number
    sourceGraphSeeds: number
    legacyRawEdges: number
    legacyRawComponents: number
    legacyRawCyclicComponents: number
    productBodies: number
    productReferenceSites: number
    productEntrySites: number
    runtimeReachableBodies: number
    unreachableBodies: number
    productCyclicComponents: number
    productCyclicBodies: number
    sharedTails: number
  }
  source: {
    entries: {
      sites: SourceEntrySite[]
      byKind: Record<string, number>
      graphSeeds: number
      duplicateGlobalSites: number
    }
    legacyRawGraph: {
      edges: Record<ScriptEdgeKind, number>
      edgeSites: ScriptEdge[]
      components: number
      cyclicComponents: number
      cyclicNodes: number
      componentOf: number[]
      cyclicComponentIds: number[]
    }
    semanticGraph: SemanticSourceGraphAudit
    addressZero: {
      sites: SourceAddressZeroSite[]
      byDisposition: Record<string, number>
      unknown: number
    }
    sceneHookPatches: Array<{
      address: number
      targetScene: string
      onEnter?: number
      onTeleport?: number
      clearsBoth: boolean
    }>
  }
  product: {
    categories: Record<BodyCategory, number>
    entries: {
      sites: ProductEntrySite[]
      byKind: Record<string, { sites: number; distinctTargets: number }>
      distinctTargets: number
      libraryDeclarations: string[]
      seedCoverage: {
        finalContent: Array<{
          domain: ProductSeedDomain
          sites: number
          distinctTargets: number
        }>
        libraryDeclarations: { sites: number; distinctTargets: number }
        allSeedSites: number
        allDistinctTargets: number
      }
    }
    references: {
      sites: ProductReferenceSite[]
      byKind: Record<
        ProductReferenceKind,
        { sites: number; distinctTargets: number; distinctCallers: number }
      >
      byFlow: Record<
        ProductReferenceSite['flow'],
        { sites: number; distinctTargets: number; distinctCallers: number }
      >
    }
    reachability: {
      reachable: number
      unreachable: number
      rootTargets: string[]
      reachableByCategory: Record<BodyCategory, number>
      unreachableByCategory: Record<BodyCategory, number>
    }
    components: {
      count: number
      cyclic: number
      cyclicBodies: number
      size1: number
      size2: number
      size3Plus: number
      reachableCyclic: number
      reachableCyclicBodies: number
      unreachableCyclic: number
      unreachableCyclicBodies: number
      mixedCyclic: number
    }
    folded: {
      spriteAction: { entities: number; bodies: string[] }
      hostileBehavior: { entities: number; bodies: string[] }
      overlap: string[]
      unclassifiedUnreachable: string[]
    }
    sceneHookBindings: {
      sites: SceneHookBindingAudit[]
      onEnter: number
      onTeleport: number
      clearCommands: number
      stageTargets: number
    }
    dialogueStates: {
      bodies: number
      distinctHashes: number
      baseIdentities: number
      multiEntryStateIdentities: Array<{ baseId: string; bodyIds: string[] }>
      defaultHashBodies: number
    }
    sharedTails: string[]
    bodies: ScriptBodyAudit[]
  }
  canaries: {
    s018: ProductEntrySite[]
    e2493: {
      triggerRootTargets: string[]
      autoRootTargets: string[]
      dynamicTriggerTargets: string[]
    }
    e2495: {
      triggerRootTargets: string[]
      autoRootTargets: string[]
      dynamicTriggerTargets: string[]
    }
    authorRoots: Array<{
      id: string
      aliasTargetId?: string
      bridgeOnly: boolean
    }>
    misleadingSccBodies: Array<{
      id: string
      reachable: boolean
      productCyclic: boolean
      sourceCyclic?: boolean
    }>
    sharedSccTails: string[]
  }
  debts: Array<{
    id: string
    message: string
    bodyIds?: string[]
  }>
  issues: string[]
  digest: string
}

type SemanticEdge = SemanticSourceEdgeSite

interface StringComponents {
  components: string[][]
  componentOf: Map<string, number>
  cyclic: Set<number>
}

const BODY_REFERENCE_KINDS = new Set<ProductReferenceKind>([
  'callScript',
  'jumpScript',
  'setEntityAuto',
  'setEntityTrigger',
])

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

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function countBy<T>(values: readonly T[], key: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const value of values) {
    const name = key(value)
    counts[name] = (counts[name] ?? 0) + 1
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  )
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort()
}

function addressFromLabel(label: string | undefined): number | undefined {
  const match = label ? /(?:^|#)L_(\d+)$/.exec(label) : null
  return match?.[1] === undefined ? undefined : Number(match[1])
}

function bodyCategory(id: string): BodyCategory | undefined {
  if (/^scene\/[^/]+\/root\//.test(id)) return 'scene-root'
  if (id.startsWith('scene/')) return 'scene-internal'
  if (id.startsWith('shared/scc-')) return 'shared-scc'
  if (id.startsWith('shared/user/')) return 'shared-author'
  return undefined
}

function isScriptRef(value: unknown): value is ScriptRef {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<ScriptRef>
  return typeof record.id === 'string' && typeof record.chunk === 'string'
}

function astKindNodeCount(node: unknown): number {
  if (Array.isArray(node)) return node.reduce((sum, value) => sum + astKindNodeCount(value), 0)
  if (!node || typeof node !== 'object') return 0
  const record = node as Record<string, unknown>
  let count = typeof record.kind === 'string' ? 1 : 0
  for (const value of Object.values(record)) count += astKindNodeCount(value)
  return count
}

function walkObjects(
  node: unknown,
  path: string,
  visit: (record: Record<string, unknown>, path: string) => void,
): void {
  if (Array.isArray(node)) {
    node.forEach((value, index) => {
      walkObjects(value, `${path}/${index}`, visit)
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  visit(record, path)
  for (const [key, value] of Object.entries(record)) walkObjects(value, `${path}/${key}`, visit)
}

function walkObjectsWithFlow(
  node: unknown,
  path: string,
  deferred: boolean,
  visit: (record: Record<string, unknown>, path: string, deferred: boolean) => void,
): void {
  if (Array.isArray(node)) {
    node.forEach((value, index) => {
      walkObjectsWithFlow(value, `${path}/${index}`, deferred, visit)
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  const nestedDeferred =
    deferred ||
    record.kind === 'setSceneOnEnter' ||
    record.kind === 'setSceneOnTeleport' ||
    record.kind === 'setEntityAuto' ||
    record.kind === 'setEntityTrigger'
  visit(record, path, nestedDeferred)
  for (const [key, value] of Object.entries(record))
    walkObjectsWithFlow(value, `${path}/${key}`, nestedDeferred, visit)
}

function refFromCommand(
  record: Record<string, unknown>,
): { kind: ProductReferenceKind; ref: ScriptRef } | undefined {
  const kind = record.kind
  if (!BODY_REFERENCE_KINDS.has(kind as ProductReferenceKind)) return undefined
  const key = kind === 'callScript' || kind === 'jumpScript' ? 'ref' : 'script'
  const ref = record[key]
  return isScriptRef(ref) ? { kind: kind as ProductReferenceKind, ref } : undefined
}

function refsInBody(body: unknown, callerBodyId: string): ProductReferenceSite[] {
  const sites: ProductReferenceSite[] = []
  walkObjectsWithFlow(body, '', false, (record, path, deferred) => {
    const hit = refFromCommand(record)
    if (!hit) return
    sites.push({
      callerBodyId,
      path: path || '/',
      kind: hit.kind,
      flow:
        deferred || hit.kind === 'setEntityAuto' || hit.kind === 'setEntityTrigger'
          ? 'deferred-binding'
          : 'execution',
      targetId: hit.ref.id,
      targetChunk: hit.ref.chunk,
    })
  })
  return sites.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.kind.localeCompare(right.kind) ||
      left.targetId.localeCompare(right.targetId),
  )
}

function tarjanStrings(nodes: readonly string[], edges: readonly SemanticEdge[]): StringComponents {
  const outgoing = new Map<string, string[]>()
  for (const node of nodes) outgoing.set(node, [])
  for (const edge of edges) {
    if (edge.kind === 'binding') continue
    const list = outgoing.get(edge.from)
    if (list && outgoing.has(edge.to)) list.push(edge.to)
  }
  for (const list of outgoing.values()) list.sort()
  const at = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const raw: string[][] = []
  let clock = 0
  const visit = (node: string): void => {
    at.set(node, clock)
    low.set(node, clock)
    clock++
    stack.push(node)
    onStack.add(node)
    for (const next of outgoing.get(node) ?? []) {
      if (!at.has(next)) {
        visit(next)
        low.set(node, Math.min(low.get(node)!, low.get(next)!))
      } else if (onStack.has(next)) low.set(node, Math.min(low.get(node)!, at.get(next)!))
    }
    if (low.get(node) !== at.get(node)) return
    const component: string[] = []
    while (stack.length) {
      const current = stack.pop()!
      onStack.delete(current)
      component.push(current)
      if (current === node) break
    }
    component.sort()
    raw.push(component)
  }
  for (const node of [...nodes].sort()) if (!at.has(node)) visit(node)
  const components = raw.sort((left, right) => left[0]!.localeCompare(right[0]!))
  const componentOf = new Map<string, number>()
  components.forEach((component, id) => {
    component.forEach((node) => {
      componentOf.set(node, id)
    })
  })
  const selfLoops = new Set(
    edges
      .filter((edge) => edge.kind !== 'binding' && edge.from === edge.to)
      .map((edge) => edge.from),
  )
  const cyclic = new Set<number>()
  components.forEach((component, id) => {
    if (component.length > 1 || selfLoops.has(component[0]!)) cyclic.add(id)
  })
  return { components, componentOf, cyclic }
}

export function collectSourceEntrySites(sources: PalMigrationSources): {
  sites: SourceEntrySite[]
  emptyPointers: SourceAddressZeroSite[]
} {
  const sites: SourceEntrySite[] = []
  const emptyPointers: SourceAddressZeroSite[] = []
  const add = (entry: number | undefined, site: Omit<SourceEntrySite, 'entry'>): void => {
    if (entry && entry > 0) sites.push({ ...site, entry })
    else emptyPointers.push({ sourceId: site.sourceId, disposition: 'empty-pointer' })
  }
  for (const scene of sources.scenes) {
    const owner = `s${String(scene.sceneId).padStart(3, '0')}`
    const onEnter = addressFromLabel(scene.onEnterLabel)
    if (onEnter !== undefined)
      add(onEnter, {
        kind: 'scene-on-enter',
        sourceId: `${owner}/on-enter`,
        owner,
        channel: 'trigger',
      })
    const onTeleport = addressFromLabel(scene.onTeleportLabel)
    if (onTeleport !== undefined)
      add(onTeleport, {
        kind: 'scene-on-teleport',
        sourceId: `${owner}/on-teleport`,
        owner,
        channel: 'trigger',
      })
    for (const entity of scene.eventObjects) {
      const trigger = addressFromLabel(entity.triggerLabel)
      if (trigger !== undefined)
        add(trigger, {
          kind: 'entity-trigger',
          sourceId: `${owner}/e${entity.id}/trigger`,
          owner,
          channel: 'trigger',
        })
      const auto = addressFromLabel(entity.autoLabel)
      if (auto !== undefined)
        add(auto, {
          kind: 'entity-auto',
          sourceId: `${owner}/e${entity.id}/auto`,
          owner,
          channel: 'auto',
        })
    }
  }
  const global = (
    kind: SourceEntrySite['kind'],
    owner: string,
    rows: ReadonlyArray<Record<string, unknown>>,
    fields: readonly string[],
    identityOf: (row: Readonly<Record<string, unknown>>, index: number) => string = (row, index) =>
      String(row.id ?? index),
  ): void => {
    rows.forEach((row, index) => {
      const identity = identityOf(row, index)
      for (const field of fields) {
        const value = Number(row[field] ?? 0)
        add(value, {
          kind,
          sourceId: `${owner}/${identity}/${field}`,
          owner,
          channel: 'trigger',
        })
      }
    })
  }
  global(
    'item',
    'global/items',
    sources.migrate.items as unknown as Array<Record<string, unknown>>,
    ['scriptOnUse', 'scriptOnEquip', 'scriptOnThrow', 'scriptDesc'],
  )
  global(
    'skill',
    'global/skills',
    sources.migrate.spells as unknown as Array<Record<string, unknown>>,
    ['scriptOnUse', 'scriptOnSuccess', 'scriptDesc'],
  )
  global(
    'enemy',
    'global/enemies',
    (sources.migrate.enemyObjects ?? []) as unknown as Array<Record<string, unknown>>,
    ['scriptOnTurnStart', 'scriptOnBattleEnd', 'scriptOnReady'],
    (row, index) => {
      const objectIndex = row.objectIndex
      if (typeof objectIndex !== 'number' || !Number.isSafeInteger(objectIndex) || objectIndex < 0)
        throw new Error(`enemyObjects[${index}] 缺稳定 objectIndex`)
      return String(objectIndex)
    },
  )
  global(
    'actor',
    'global/actors',
    sources.objectPlayers as unknown as Array<Record<string, unknown>>,
    ['scriptOnFriendDeath', 'scriptOnDying'],
  )
  sites.sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.sourceId.localeCompare(right.sourceId) ||
      left.entry - right.entry,
  )
  emptyPointers.sort((left, right) => (left.sourceId ?? '').localeCompare(right.sourceId ?? ''))
  return { sites, emptyPointers }
}

function semanticSourceGraph(
  commands: readonly SourceCmd[],
  roots: readonly SourceEntrySite[],
): {
  audit: SemanticSourceGraphAudit
  contextsByAddress: Map<number, Set<SourceExecutionChannel>>
} {
  const rawEdges = extractPalSourceScriptEdges(commands)
  const byFrom = new Map<number, ScriptEdge[]>()
  for (const edge of rawEdges) {
    const list = byFrom.get(edge.from) ?? []
    list.push(edge)
    byFrom.set(edge.from, list)
  }
  const keyOf = (address: number, channel: SourceExecutionChannel): string =>
    `${channel}:${address}`
  const queue = roots.map((root) => ({ address: root.entry, channel: root.channel }))
  const visited = new Set<string>()
  const contextsByAddress = new Map<number, Set<SourceExecutionChannel>>()
  const semanticEdges: SemanticEdge[] = []
  const edgeKeys = new Set<string>()
  const addEdge = (
    fromAddress: number,
    fromChannel: SourceExecutionChannel,
    toAddress: number,
    toChannel: SourceExecutionChannel,
    kind: ScriptEdgeKind,
  ): void => {
    if (toAddress < 0 || toAddress >= commands.length) return
    const from = keyOf(fromAddress, fromChannel)
    const to = keyOf(toAddress, toChannel)
    const key = `${from}|${to}|${kind}`
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key)
      semanticEdges.push({ from, to, kind })
    }
    queue.push({ address: toAddress, channel: toChannel })
  }
  while (queue.length) {
    const current = queue.pop()!
    if (current.address < 0 || current.address >= commands.length) continue
    const currentKey = keyOf(current.address, current.channel)
    if (visited.has(currentKey)) continue
    visited.add(currentKey)
    const contexts = contextsByAddress.get(current.address) ?? new Set<SourceExecutionChannel>()
    contexts.add(current.channel)
    contextsByAddress.set(current.address, contexts)
    const command = commands[current.address] as SourceCmd & {
      opcode?: number
      operands?: number[]
    }
    const isZeroRateJump =
      command.op === 'raw' && command.opcode === 0x06 && (command.operands?.[1] ?? 0) === 0
    for (const edge of byFrom.get(current.address) ?? []) {
      if (isZeroRateJump && edge.reason === '0x6') continue
      const targetOperand =
        command.op === 'raw' && command.opcode !== undefined
          ? TARGET_OPERAND[command.opcode]
          : undefined
      const zeroTarget =
        targetOperand !== undefined && (command.operands?.[targetOperand] ?? 0) === 0
      const zeroSpecial =
        command.op === 'raw' &&
        command.opcode === 0x07 &&
        ((edge.reason === '0x07.lose' && (command.operands?.[1] ?? 0) === 0) ||
          (edge.reason === '0x07.flee' && (command.operands?.[2] ?? 0) === 0))
      const zeroSceneHook =
        command.op === 'raw' &&
        command.opcode === 0x6d &&
        ((edge.reason === '0x6d.onEnter' && (command.operands?.[1] ?? 0) === 0) ||
          (edge.reason === '0x6d.onTeleport' && (command.operands?.[2] ?? 0) === 0))
      if ((zeroTarget && edge.reason !== 'fallthrough') || zeroSpecial || zeroSceneHook) continue
      let nextChannel = current.channel
      if (edge.reason === '0x4') nextChannel = 'trigger'
      if (edge.reason === '0x24') nextChannel = 'auto'
      if (
        edge.reason === '0x25' ||
        edge.reason === '0x6d.onEnter' ||
        edge.reason === '0x6d.onTeleport'
      )
        nextChannel = 'trigger'
      addEdge(current.address, current.channel, edge.to, nextChannel, edge.kind)
    }
    if (isZeroRateJump && current.channel === 'auto')
      addEdge(current.address, current.channel, current.address, current.channel, 'execution')
  }
  semanticEdges.sort(
    (left, right) =>
      left.from.localeCompare(right.from) ||
      left.to.localeCompare(right.to) ||
      left.kind.localeCompare(right.kind),
  )
  const components = tarjanStrings([...visited].sort(), semanticEdges)
  const cyclicNodes = [...components.cyclic].reduce(
    (sum, id) => sum + components.components[id]!.length,
    0,
  )
  return {
    audit: {
      nodes: visited.size,
      nodesByChannel: {
        auto: [...visited].filter((node) => node.startsWith('auto:')).length,
        trigger: [...visited].filter((node) => node.startsWith('trigger:')).length,
      },
      edges: {
        execution: semanticEdges.filter((edge) => edge.kind === 'execution').length,
        binding: semanticEdges.filter((edge) => edge.kind === 'binding').length,
        recovery: semanticEdges.filter((edge) => edge.kind === 'recovery').length,
      },
      edgeSites: semanticEdges,
      components: components.components.length,
      cyclicComponents: components.cyclic.size,
      cyclicNodes,
      componentOf: [...components.componentOf].sort(([left], [right]) => left.localeCompare(right)),
      cyclicComponentIds: [...components.cyclic].sort((left, right) => left - right),
    },
    contextsByAddress,
  }
}

function sourceAddressZeroSites(
  commands: readonly SourceCmd[],
  emptyPointers: readonly SourceAddressZeroSite[],
  contextsByAddress: ReadonlyMap<number, ReadonlySet<SourceExecutionChannel>>,
): { sites: SourceAddressZeroSite[]; unknown: number } {
  const sites = [...emptyPointers]
  let unknown = 0
  commands.forEach((source, address) => {
    const command = source as SourceCmd & { opcode?: number; operands?: number[] }
    if (command.op !== 'raw' || command.opcode === undefined) return
    const opcode = command.opcode
    const operands = command.operands ?? []
    if (opcode === 0x07) {
      for (const operand of [1, 2])
        if ((operands[operand] ?? 0) === 0)
          sites.push({ address, opcode, operand, disposition: 'absent-branch' })
    }
    if (opcode === 0x6d) {
      const both = (operands[1] ?? 0) === 0 && (operands[2] ?? 0) === 0
      for (const operand of [1, 2])
        if ((operands[operand] ?? 0) === 0)
          sites.push({
            address,
            opcode,
            operand,
            disposition: both ? 'clear-scene-hooks' : 'absent-scene-hook',
          })
      return
    }
    const targetOperand = TARGET_OPERAND[opcode]
    if (targetOperand === undefined || (operands[targetOperand] ?? 0) !== 0) return
    if (opcode === 0x06) {
      const contexts = [...(contextsByAddress.get(address) ?? [])].sort()
      const disposition =
        contexts.length === 0
          ? 'unowned-context'
          : contexts.length > 1
            ? 'context-dependent'
            : contexts[0] === 'auto'
              ? 'auto-self-loop'
              : 'trigger-stop'
      if (disposition === 'unowned-context') unknown++
      sites.push({ address, opcode, operand: targetOperand, disposition, contexts })
    } else if (opcode === 0x24 || opcode === 0x25)
      sites.push({ address, opcode, operand: targetOperand, disposition: 'clear-binding' })
    else if (opcode === 0x1e || opcode === 0x20)
      sites.push({ address, opcode, operand: targetOperand, disposition: 'no-failure-branch' })
    else if ([0x5e, 0x68, 0x91, 0x94, 0x9c, 0x9e].includes(opcode))
      sites.push({ address, opcode, operand: targetOperand, disposition: 'stop-branch' })
    else {
      unknown++
    }
  })
  sites.sort(
    (left, right) =>
      (left.address ?? -1) - (right.address ?? -1) ||
      (left.sourceId ?? '').localeCompare(right.sourceId ?? '') ||
      (left.operand ?? -1) - (right.operand ?? -1),
  )
  return { sites, unknown }
}

function productScripts(
  index: ScriptIndexV1,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
  issues: string[],
): Map<string, { chunk: string; body: Command[] }> {
  checkScriptIndex(index)
  const scripts = new Map<string, { chunk: string; body: Command[] }>()
  for (const [chunkId, chunk] of Object.entries(chunks).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    for (const [id, body] of Object.entries(chunk.scripts).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      if (scripts.has(id)) issues.push(`duplicate-body:${id}`)
      scripts.set(id, { chunk: chunkId, body })
    }
  }
  return scripts
}

function productEntrySites(
  files: ReadonlyMap<string, unknown>,
  scripts: ReadonlyMap<string, unknown>,
  issues: string[],
): ProductEntrySite[] {
  const sites: ProductEntrySite[] = []
  for (const [file, value] of [...files].sort(([left], [right]) => left.localeCompare(right))) {
    if (!file.startsWith('content/') || file.startsWith('content/scripts/')) continue
    walkObjects(value, file, (record, path) => {
      const kind = String(record.kind ?? '')
      let ref: ScriptRef | undefined
      let commandKind = kind
      if (kind === 'runScript' && isScriptRef(record.script)) ref = record.script
      else {
        const hit = refFromCommand(record)
        if (hit) {
          ref = hit.ref
          commandKind = hit.kind
        }
      }
      if (!ref) return
      const category = bodyCategory(ref.id)
      const entryKind: ProductEntrySite['kind'] =
        file.startsWith('content/items') && kind === 'runScript'
          ? 'item-run-script'
          : file.startsWith('content/scenes/') &&
              commandKind === 'callScript' &&
              category === 'scene-root'
            ? 'scene-stage-root'
            : file.startsWith('content/scenes/') &&
                (commandKind === 'setEntityAuto' || commandKind === 'setEntityTrigger')
              ? 'scene-direct-binding'
              : 'content-command'
      if (!scripts.has(ref.id)) issues.push(`dangling-external-ref:${file}:${path}:${ref.id}`)
      sites.push({
        kind: entryKind,
        source: file,
        path,
        commandKind,
        targetId: ref.id,
        targetChunk: ref.chunk,
      })
    })
  }
  return sites.sort(
    (left, right) =>
      left.source.localeCompare(right.source) ||
      left.path.localeCompare(right.path) ||
      left.targetId.localeCompare(right.targetId),
  )
}

function productSeedDomain(source: string): ProductSeedDomain | undefined {
  if (source.startsWith('content/scenes/')) return 'scenes'
  if (source === 'content/items.json') return 'items'
  if (source === 'content/skills.json') return 'skills'
  if (source === 'content/enemies.json') return 'enemies'
  if (source === 'content/actors.json') return 'actors'
  return undefined
}

function reachableBodies(
  seeds: Iterable<string>,
  refsByCaller: ReadonlyMap<string, readonly ProductReferenceSite[]>,
  knownBodies: ReadonlySet<string>,
): { bodies: Set<string>; entryKinds: Map<string, Set<ProductEntrySite['kind']>> } {
  const bodies = new Set<string>()
  const entryKinds = new Map<string, Set<ProductEntrySite['kind']>>()
  const queue = [...seeds]
  while (queue.length) {
    const id = queue.pop()!
    if (!knownBodies.has(id) || bodies.has(id)) continue
    bodies.add(id)
    for (const ref of refsByCaller.get(id) ?? []) queue.push(ref.targetId)
  }
  return { bodies, entryKinds }
}

function closure(
  seeds: Iterable<string>,
  refsByCaller: ReadonlyMap<string, readonly ProductReferenceSite[]>,
  knownBodies: ReadonlySet<string>,
): Set<string> {
  return reachableBodies(seeds, refsByCaller, knownBodies).bodies
}

function refsFromSyntheticRoots(
  roots: ReadonlyArray<{ id: string; body: readonly Command[] }>,
): string[] {
  return sortedUnique(
    roots.flatMap((root) => refsInBody(root.body, root.id).map((site) => site.targetId)),
  )
}

function dialogueHash(state: ScriptRegistryDialogueStateAudit): string {
  const summary = JSON.stringify({
    slot: state.slot,
    portrait: state.portrait,
    speaker: state.activeSpeaker,
    awaiting: state.speakerAwaitingBody,
    color: state.color,
    speed: state.speed,
  })
  return stableScriptHash(summary).toString(16).padStart(8, '0')
}

function sourceSceneHookPatches(commands: readonly SourceCmd[]) {
  return commands.flatMap((source, address) => {
    const command = source as SourceCmd & { opcode?: number; operands?: number[] }
    if (command.op !== 'raw' || command.opcode !== 0x6d) return []
    const [rawScene = 0, onEnter = 0, onTeleport = 0] = command.operands ?? []
    return [
      {
        address,
        targetScene:
          rawScene > 0 ? `s${String(rawScene - 1).padStart(3, '0')}` : `invalid-scene:${rawScene}`,
        ...(onEnter ? { onEnter } : {}),
        ...(onTeleport ? { onTeleport } : {}),
        clearsBoth: onEnter === 0 && onTeleport === 0,
      },
    ]
  })
}

function sourceHookInstallerCandidates(
  patches: ReturnType<typeof sourceSceneHookPatches>,
  bodyAddresses: ReadonlySet<number>,
  kind: SceneHookBindingAudit['kind'],
  targetScene: string,
  targetIds: readonly string[],
) {
  const targetAddresses = new Set(
    targetIds.flatMap((targetId) => {
      const match = /\/override\/(?:on-enter|on-teleport)\/L-(\d+)\//.exec(targetId)
      return match?.[1] === undefined ? [] : [Number(match[1])]
    }),
  )
  const slot = kind === 'setSceneOnEnter' ? 'onEnter' : 'onTeleport'
  return patches.filter((patch) => {
    const targetAddress = patch[slot]
    return (
      bodyAddresses.has(patch.address) &&
      patch.targetScene === targetScene &&
      targetAddress !== undefined &&
      targetAddresses.has(targetAddress)
    )
  })
}

function scriptDataFromMigration(migration: MigrationFileSet): {
  index: ScriptIndexV1
  chunks: Record<string, ScriptChunkV1>
} {
  const index = migration.files.get('content/scripts/index.json') as unknown as ScriptIndexV1
  const chunks: Record<string, ScriptChunkV1> = {}
  for (const [chunkId, meta] of Object.entries(index.chunks)) {
    const chunk = migration.files.get(`content/scripts/${meta.path}`) as unknown as
      | ScriptChunkV1
      | undefined
    if (!chunk) throw new Error(`script control flow audit: missing chunk ${chunkId}`)
    chunks[chunkId] = chunk
  }
  return { index, chunks }
}

export function auditPalScriptControlFlow(
  sources: PalMigrationSources,
  migration: MigrationFileSet,
): ScriptControlFlowAuditV1 {
  const issues: string[] = []
  const commands = sources.migrate.commands
  const sourceEntries = collectSourceEntrySites(sources)
  const sceneEntrySites = sourceEntries.sites.filter((site) => site.owner.startsWith('s'))
  const globalRoots = makeGlobalScriptRoots({
    items: sourceEntries.sites.filter((site) => site.kind === 'item').map((site) => site.entry),
    skills: sourceEntries.sites.filter((site) => site.kind === 'skill').map((site) => site.entry),
    enemies: sourceEntries.sites.filter((site) => site.kind === 'enemy').map((site) => site.entry),
    actors: sourceEntries.sites.filter((site) => site.kind === 'actor').map((site) => site.entry),
  })
  const legacyRoots = [
    ...sceneEntrySites.map((site) => ({
      entry: site.entry,
      owner: site.owner,
      kind: 'scene' as const,
    })),
    ...globalRoots,
  ]
  const legacyGraph = analyzeScriptGraph(commands, legacyRoots)
  const legacySelfLoops = new Set(
    legacyGraph.edges
      .filter((edge) => edge.kind !== 'binding' && edge.from === edge.to)
      .map((edge) => edge.from),
  )
  const legacyCyclicIds = new Set(
    legacyGraph.components.flatMap((component, id) =>
      component.length > 1 || legacySelfLoops.has(component[0]!) ? [id] : [],
    ),
  )
  const semantic = semanticSourceGraph(commands, sourceEntries.sites)
  const zero = sourceAddressZeroSites(
    commands,
    sourceEntries.emptyPointers,
    semantic.contextsByAddress,
  )
  if (zero.unknown) issues.push(`unknown-address-zero-semantics:${zero.unknown}`)
  const sourcePatches = sourceSceneHookPatches(commands)
  for (const patch of sourcePatches)
    if (patch.targetScene.startsWith('invalid-scene:'))
      issues.push(`invalid-scene-hook-target:${patch.address}:${patch.targetScene}`)

  const { index, chunks } = scriptDataFromMigration(migration)
  const scripts = productScripts(index, chunks, issues)
  const references = [...scripts]
    .flatMap(([id, record]) => refsInBody(record.body, id))
    .sort(
      (left, right) =>
        left.callerBodyId.localeCompare(right.callerBodyId) ||
        left.path.localeCompare(right.path) ||
        left.kind.localeCompare(right.kind),
    )
  for (const reference of references)
    if (!scripts.has(reference.targetId))
      issues.push(
        `dangling-body-ref:${reference.callerBodyId}:${reference.path}:${reference.targetId}`,
      )
  const refsByCaller = new Map<string, ProductReferenceSite[]>()
  const predecessors = new Map<string, Set<string>>()
  for (const reference of references) {
    const list = refsByCaller.get(reference.callerBodyId) ?? []
    list.push(reference)
    refsByCaller.set(reference.callerBodyId, list)
    const incoming = predecessors.get(reference.targetId) ?? new Set<string>()
    incoming.add(reference.callerBodyId)
    predecessors.set(reference.targetId, incoming)
  }

  const entries = productEntrySites(
    migration.files as ReadonlyMap<string, unknown>,
    scripts,
    issues,
  )
  const libraryDeclarations = Object.keys(index.library ?? {}).sort()
  const bodyIds = [...scripts.keys()].sort()
  const knownBodies = new Set(bodyIds)
  const rootTargets = sortedUnique([
    ...entries.map((entry) => entry.targetId),
    ...libraryDeclarations,
  ])
  for (const root of rootTargets)
    if (!knownBodies.has(root)) issues.push(`dangling-runtime-root:${root}`)
  const reachable = closure(rootTargets, refsByCaller, knownBodies)
  const runtimeEntryKinds = new Map<string, Set<ProductEntrySite['kind']>>()
  for (const entry of entries) {
    const descendants = closure([entry.targetId], refsByCaller, knownBodies)
    for (const id of descendants) {
      const kinds = runtimeEntryKinds.get(id) ?? new Set<ProductEntrySite['kind']>()
      kinds.add(entry.kind)
      runtimeEntryKinds.set(id, kinds)
    }
  }

  const productEdges: SemanticEdge[] = references.map((reference) => ({
    from: reference.callerBodyId,
    to: reference.targetId,
    kind: reference.flow === 'deferred-binding' ? 'binding' : 'execution',
  }))
  const productComponents = tarjanStrings(bodyIds, productEdges)

  const spriteSyntheticRoots = migration.report.foldedSpriteRoots.flatMap((site) => site.roots)
  const spriteSeeds = refsFromSyntheticRoots(spriteSyntheticRoots)
  for (const seed of spriteSeeds)
    if (!knownBodies.has(seed)) issues.push(`dangling-folded-sprite-ref:${seed}`)
  const spriteClosure = closure(spriteSeeds, refsByCaller, knownBodies)
  const hostileSyntheticRoots = migration.report.foldedHostileRoots.flatMap((site) => site.roots)
  const hostileSeeds = refsFromSyntheticRoots(hostileSyntheticRoots)
  for (const seed of hostileSeeds)
    if (!knownBodies.has(seed)) issues.push(`dangling-folded-hostile-ref:${seed}`)
  const hostileClosure = closure(hostileSeeds, refsByCaller, knownBodies)
  const unreachable = new Set(bodyIds.filter((id) => !reachable.has(id)))
  const foldedSpriteBodies = new Set([...spriteClosure].filter((id) => unreachable.has(id)))
  const foldedHostileBodies = new Set([...hostileClosure].filter((id) => unreachable.has(id)))
  const foldedOverlap = [...foldedSpriteBodies].filter((id) => foldedHostileBodies.has(id)).sort()
  const unclassifiedUnreachable = [...unreachable]
    .filter((id) => !foldedSpriteBodies.has(id) && !foldedHostileBodies.has(id))
    .sort()
  if (foldedOverlap.length) issues.push(`folded-origin-overlap:${foldedOverlap.length}`)
  if (unclassifiedUnreachable.length)
    issues.push(`unclassified-unreachable:${unclassifiedUnreachable.length}`)
  const classifiedUnreachable = new Set([...foldedSpriteBodies, ...foldedHostileBodies])
  if (classifiedUnreachable.size + unclassifiedUnreachable.length !== unreachable.size)
    issues.push(
      `folded-origin-conservation:${classifiedUnreachable.size}+${unclassifiedUnreachable.length}!=${unreachable.size}`,
    )

  const categoryById = new Map<string, BodyCategory>()
  for (const id of bodyIds) {
    const category = bodyCategory(id)
    if (!category) issues.push(`unclassified-body:${id}`)
    else categoryById.set(id, category)
  }

  const registryById = new Map(migration.report.scriptRegistry.map((record) => [record.id, record]))
  for (const id of bodyIds) if (!registryById.has(id)) issues.push(`missing-provenance:${id}`)
  for (const record of migration.report.scriptRegistry)
    if (!scripts.has(record.id)) issues.push(`orphan-provenance:${record.id}`)
  const entrySourcesByTarget = new Map<string, Set<string>>()
  const noteDerivedEntry = (targetId: string, source: string): void => {
    const sites = entrySourcesByTarget.get(targetId) ?? new Set<string>()
    sites.add(source)
    entrySourcesByTarget.set(targetId, sites)
  }
  for (const entry of entries) noteDerivedEntry(entry.targetId, `${entry.source}:${entry.path}`)
  for (const root of spriteSyntheticRoots)
    for (const targetId of refsInBody(root.body, root.id).map((site) => site.targetId))
      noteDerivedEntry(targetId, root.id)

  const sourceHookInstallerAddress = (
    callerBodyId: string,
    kind: SceneHookBindingAudit['kind'],
    targetScene: string,
    targetIds: readonly string[],
  ): number | undefined => {
    const provenance = registryById.get(callerBodyId)
    const bodyAddresses = new Set([
      ...(provenance?.source?.addresses ?? []),
      ...(provenance?.origin?.sourceAddresses ?? []),
    ])
    const candidates = sourceHookInstallerCandidates(
      sourcePatches,
      bodyAddresses,
      kind,
      targetScene,
      targetIds,
    )
    if (candidates.length > 1)
      issues.push(
        `ambiguous-scene-hook-installer:${callerBodyId}:${kind}:${targetScene}:${candidates
          .map((candidate) => candidate.address)
          .join(',')}`,
      )
    return candidates[0]?.address
  }

  const hookBindings: SceneHookBindingAudit[] = []
  const hookContexts = new Map<
    string,
    Array<{
      targetScene: string
      slot: 'on-enter' | 'on-teleport'
      installerBodyId: string
      installerPath: string
      installerSourceAddress?: number
    }>
  >()
  let clearSceneScripts = 0
  for (const [callerBodyId, record] of scripts) {
    walkObjects(record.body, '', (command, path) => {
      if (command.kind === 'clearSceneScripts') clearSceneScripts++
      if (command.kind !== 'setSceneOnEnter' && command.kind !== 'setSceneOnTeleport') return
      const targetScene = String(command.scene ?? '')
      const targetIds = refsInBody(command.stages, `${callerBodyId}:${path}`)
        .map((site) => site.targetId)
        .sort()
      const installerSourceAddress = sourceHookInstallerAddress(
        callerBodyId,
        command.kind,
        targetScene,
        targetIds,
      )
      const binding: SceneHookBindingAudit = {
        callerBodyId,
        path: path || '/',
        ...(installerSourceAddress === undefined ? {} : { sourceAddress: installerSourceAddress }),
        kind: command.kind,
        targetScene,
        targetIds: sortedUnique(targetIds),
      }
      hookBindings.push(binding)
      if (installerSourceAddress === undefined)
        issues.push(`unresolved-scene-hook-installer:${callerBodyId}:${path || '/'}`)
      const slot = command.kind === 'setSceneOnEnter' ? 'on-enter' : 'on-teleport'
      for (const targetId of binding.targetIds) {
        for (const descendant of closure([targetId], refsByCaller, knownBodies)) {
          const contexts = hookContexts.get(descendant) ?? []
          contexts.push({
            targetScene,
            slot,
            installerBodyId: callerBodyId,
            installerPath: path || '/',
            ...(installerSourceAddress === undefined ? {} : { installerSourceAddress }),
          })
          hookContexts.set(descendant, contexts)
        }
      }
      if (!targetScene || !targetIds.length)
        issues.push(`scene-hook-without-context:${callerBodyId}:${path}`)
    })
  }
  hookBindings.sort(
    (left, right) =>
      left.callerBodyId.localeCompare(right.callerBodyId) || left.path.localeCompare(right.path),
  )
  const hookSourceAddressesByBody = new Map<string, number[]>()
  for (const binding of hookBindings) {
    if (binding.sourceAddress === undefined) continue
    const addresses = hookSourceAddressesByBody.get(binding.callerBodyId) ?? []
    addresses.push(binding.sourceAddress)
    hookSourceAddressesByBody.set(binding.callerBodyId, addresses)
  }

  const zeroSitesByAddress = new Map<number, SourceAddressZeroSite[]>()
  for (const site of zero.sites) {
    if (site.address === undefined) continue
    const sites = zeroSitesByAddress.get(site.address) ?? []
    sites.push(site)
    zeroSitesByAddress.set(site.address, sites)
  }

  const legacyComponentCyclic = (id: number): boolean => legacyCyclicIds.has(id)
  const bodyAudits: ScriptBodyAudit[] = bodyIds.map((id) => {
    const script = scripts.get(id)!
    const componentId = productComponents.componentOf.get(id)!
    const component = productComponents.components[componentId]!
    const provenance = registryById.get(id)
    const sourceAddress = provenance?.source?.address
    // entryAddress 是入口身份，不等于 body 直接消费过该地址。legacy-alias 只含一条
    // callScript bridge；把入口混进 addresses 会让它冒充 translated-target 的逐指令证据。
    const sourceAddresses = [
      ...new Set([
        ...(provenance?.source?.addresses ?? []),
        ...(provenance?.origin?.sourceAddresses ?? []),
        ...(hookSourceAddressesByBody.get(id) ?? []),
      ]),
    ].sort((left, right) => left - right)
    const addressZeroSites = sourceAddresses
      .flatMap((address) => zeroSitesByAddress.get(address) ?? [])
      .map((site) => ({ ...site }))
    const legacyComponentId =
      sourceAddress === undefined ? undefined : legacyGraph.componentOf[sourceAddress]
    const dialogueMatch = /\/d-([0-9a-f]+)$/.exec(id)
    let dialogue: ScriptBodyAudit['dialogue']
    if (dialogueMatch?.[1]) {
      if (!provenance?.dialogueEntry) issues.push(`missing-dialogue-entry-state:${id}`)
      else {
        const expected = dialogueHash(provenance.dialogueEntry)
        if (expected !== dialogueMatch[1]) issues.push(`dialogue-hash-mismatch:${id}:${expected}`)
        dialogue = {
          hash: dialogueMatch[1],
          entry: provenance.dialogueEntry,
          ...(provenance.dialogueExit ? { exit: provenance.dialogueExit } : {}),
        }
      }
    }
    const contexts = (hookContexts.get(id) ?? [])
      .map((context) => ({ ...context }))
      .sort(
        (left, right) =>
          left.targetScene.localeCompare(right.targetScene) ||
          left.slot.localeCompare(right.slot) ||
          left.installerBodyId.localeCompare(right.installerBodyId) ||
          left.installerPath.localeCompare(right.installerPath),
      )
    const directSources = [...(entrySourcesByTarget.get(id) ?? [])].sort()
    const overrideAddress = /^scene\/[^/]+\/override\/[^/]+\/L-(\d+)\//.exec(id)?.[1]
    const derivation: ScriptBodyAudit['derivation'] | undefined =
      provenance?.kind === 'translated-target' && provenance.source
        ? { kind: 'translated-target', sources: [provenance.source.label] }
        : provenance?.kind === 'legacy-alias' && provenance.source
          ? { kind: 'legacy-alias', sources: [provenance.source.label] }
          : provenance?.origin
            ? {
                kind: provenance.origin.kind,
                sources: [...provenance.origin.sources].sort(),
              }
            : directSources.length
              ? {
                  kind: directSources.some((source) => source.startsWith('folded/sprite-action/'))
                    ? 'folded-sprite-entry'
                    : 'content-entry',
                  sources: directSources,
                }
              : overrideAddress
                ? {
                    kind: 'scene-hook-override',
                    sources: [`source-address:${overrideAddress}`],
                  }
                : undefined
    if (!derivation) issues.push(`unproved-body-origin:${id}`)
    return {
      id,
      chunk: script.chunk,
      category: categoryById.get(id) ?? 'scene-internal',
      astKindNodes: astKindNodeCount(script.body),
      reachable: reachable.has(id),
      runtimeEntryKinds: [...(runtimeEntryKinds.get(id) ?? [])].sort(),
      foldedFrom: [
        ...(foldedSpriteBodies.has(id) ? (['sprite-action'] as const) : []),
        ...(foldedHostileBodies.has(id) ? (['hostile-behavior'] as const) : []),
      ],
      outgoingReferenceSites: refsByCaller.get(id)?.length ?? 0,
      incomingPredecessorBodyIds: [...(predecessors.get(id) ?? [])].sort(),
      sharedTail: reachable.has(id) && (predecessors.get(id)?.size ?? 0) > 1,
      productComponent: {
        id: componentId,
        size: component.length,
        cyclic: productComponents.cyclic.has(componentId),
      },
      source: {
        ...(sourceAddress === undefined ? {} : { entryAddress: sourceAddress }),
        addresses: sourceAddresses,
        addressZeroSites,
        ...(provenance?.source?.owner ? { owner: provenance.source.owner } : {}),
        ...(legacyComponentId === undefined
          ? {}
          : {
              legacyComponent: {
                id: legacyComponentId,
                size: legacyGraph.components[legacyComponentId]!.length,
                cyclic: legacyComponentCyclic(legacyComponentId),
              },
            }),
      },
      ...(dialogue ? { dialogue } : {}),
      ...(derivation ? { derivation } : {}),
      sceneHookContexts: contexts,
    }
  })

  const sharedTails = bodyAudits.filter((body) => body.sharedTail).map((body) => body.id)
  const categoryCounts = countBy(bodyAudits, (body) => body.category) as Record<
    BodyCategory,
    number
  >
  for (const category of ['scene-root', 'scene-internal', 'shared-scc', 'shared-author'] as const)
    categoryCounts[category] ??= 0
  const reachableByCategory = countBy(
    bodyAudits.filter((body) => body.reachable),
    (body) => body.category,
  ) as Record<BodyCategory, number>
  const unreachableByCategory = countBy(
    bodyAudits.filter((body) => !body.reachable),
    (body) => body.category,
  ) as Record<BodyCategory, number>
  for (const category of Object.keys(categoryCounts) as BodyCategory[]) {
    reachableByCategory[category] ??= 0
    unreachableByCategory[category] ??= 0
  }

  const referenceKinds = {} as ScriptControlFlowAuditV1['product']['references']['byKind']
  for (const kind of ['callScript', 'jumpScript', 'setEntityAuto', 'setEntityTrigger'] as const) {
    const sites = references.filter((reference) => reference.kind === kind)
    referenceKinds[kind] = {
      sites: sites.length,
      distinctTargets: new Set(sites.map((site) => site.targetId)).size,
      distinctCallers: new Set(sites.map((site) => site.callerBodyId)).size,
    }
  }
  const referenceFlows = {} as ScriptControlFlowAuditV1['product']['references']['byFlow']
  for (const flow of ['execution', 'deferred-binding'] as const) {
    const sites = references.filter((reference) => reference.flow === flow)
    referenceFlows[flow] = {
      sites: sites.length,
      distinctTargets: new Set(sites.map((site) => site.targetId)).size,
      distinctCallers: new Set(sites.map((site) => site.callerBodyId)).size,
    }
  }
  const entryKinds: ScriptControlFlowAuditV1['product']['entries']['byKind'] = {}
  for (const kind of [
    'scene-stage-root',
    'scene-direct-binding',
    'item-run-script',
    'content-command',
  ] as const) {
    const sites = entries.filter((entry) => entry.kind === kind)
    entryKinds[kind] = {
      sites: sites.length,
      distinctTargets: new Set(sites.map((site) => site.targetId)).size,
    }
  }
  const finalSeedCoverage = (['scenes', 'items', 'skills', 'enemies', 'actors'] as const).map(
    (domain) => {
      const sites = entries.filter((entry) => productSeedDomain(entry.source) === domain)
      return {
        domain,
        sites: sites.length,
        distinctTargets: new Set(sites.map((site) => site.targetId)).size,
      }
    },
  )

  const productCyclicBodies = [...productComponents.cyclic].reduce(
    (sum, id) => sum + productComponents.components[id]!.length,
    0,
  )
  let reachableCyclic = 0
  let reachableCyclicBodies = 0
  let unreachableCyclic = 0
  let unreachableCyclicBodies = 0
  let mixedCyclic = 0
  for (const id of productComponents.cyclic) {
    const component = productComponents.components[id]!
    const reachableCount = component.filter((body) => reachable.has(body)).length
    if (reachableCount === component.length) {
      reachableCyclic++
      reachableCyclicBodies += component.length
    } else if (reachableCount === 0) {
      unreachableCyclic++
      unreachableCyclicBodies += component.length
    } else mixedCyclic++
  }

  const dialogueBodies = bodyAudits.filter((body) => body.dialogue)
  const dialogueByBase = new Map<string, string[]>()
  for (const body of dialogueBodies) {
    const base = body.id.replace(/\/d-[0-9a-f]+$/, '')
    const list = dialogueByBase.get(base) ?? []
    list.push(body.id)
    dialogueByBase.set(base, list)
  }
  const multiEntryStateIdentities = [...dialogueByBase]
    .filter(([, ids]) => new Set(ids.map((id) => id.match(/\/d-([0-9a-f]+)$/)?.[1])).size > 1)
    .map(([baseId, ids]) => ({ baseId, bodyIds: ids.sort() }))
    .sort((left, right) => left.baseId.localeCompare(right.baseId))

  const authorRoots = libraryDeclarations.map((id) => {
    const body = scripts.get(id)?.body ?? []
    const record = registryById.get(id)
    return {
      id,
      ...(record?.aliasTargetId ? { aliasTargetId: record.aliasTargetId } : {}),
      bridgeOnly:
        body.length === 1 &&
        body[0]?.kind === 'callScript' &&
        Boolean(record?.aliasTargetId && body[0].ref.id === record.aliasTargetId),
    }
  })
  const misleadingSccBodies = bodyAudits
    .filter((body) => body.category === 'shared-scc')
    .map((body) => ({
      id: body.id,
      reachable: body.reachable,
      productCyclic: body.productComponent.cyclic,
      ...(body.source.legacyComponent ? { sourceCyclic: body.source.legacyComponent.cyclic } : {}),
    }))
  const s018 = entries.filter(
    (entry) => entry.source === 'content/scenes/s018.json' && entry.kind === 'scene-direct-binding',
  )
  const rootsForEntity = (entityId: string, channel: 'auto' | 'trigger'): string[] =>
    entries
      .filter(
        (entry) =>
          entry.source === 'content/scenes/s154.json' &&
          entry.targetId.includes(`entity-${entityId}/`) &&
          entry.targetId.includes(`/${channel}/`),
      )
      .map((entry) => entry.targetId)
      .sort()
  const dynamicTargets = (entityId: string): string[] => {
    const targets: string[] = []
    for (const [caller, script] of scripts)
      walkObjects(script.body, caller, (record) => {
        if (
          record.kind === 'setEntityTrigger' &&
          record.entity === entityId &&
          isScriptRef(record.script)
        )
          targets.push(record.script.id)
      })
    return sortedUnique(targets)
  }

  const legacyEdges = {
    execution: legacyGraph.edges.filter((edge) => edge.kind === 'execution').length,
    binding: legacyGraph.edges.filter((edge) => edge.kind === 'binding').length,
    recovery: legacyGraph.edges.filter((edge) => edge.kind === 'recovery').length,
  }
  const legacyEdgeSites = [...legacyGraph.edges].sort(
    (left, right) =>
      left.from - right.from ||
      left.to - right.to ||
      left.kind.localeCompare(right.kind) ||
      left.reason.localeCompare(right.reason),
  )
  const sourceDigest = digest({
    commands,
    entries: sourceEntries.sites,
    emptyPointers: sourceEntries.emptyPointers,
  })
  const productDigest = digest({
    index,
    scripts: bodyIds.map((id) => [id, scripts.get(id)]),
    entries,
    folded: {
      sprite: [...foldedSpriteBodies].sort(),
      hostile: [...foldedHostileBodies].sort(),
    },
    auditEvidence: {
      registry: migration.report.scriptRegistry,
      spriteRoots: migration.report.foldedSpriteRoots,
      hostileRoots: migration.report.foldedHostileRoots,
    },
  })
  const withoutDigest: Omit<ScriptControlFlowAuditV1, 'digest'> = {
    version: 1,
    methodVersion: SCRIPT_CONTROL_FLOW_AUDIT_METHOD,
    generator: {
      sourceDigest,
      productDigest,
      countingRules: {
        sourceRoots:
          'entry sites are non-zero source bindings; source CFG seeds deduplicate global domain+address only',
        sourceScc:
          'legacy source SCC spans all 43,503 command addresses and excludes deferred binding edges; semantic SCC splits each reachable address by auto/trigger execution channel and removes zero-pointer phantom edges',
        productEntries:
          'runtime sites are final scene stage refs, direct scene bindings, item runScript, or other final content commands; author library declarations are retention roots reported separately, while final skill/actor/hostile models contain zero ScriptRef',
        productReferences:
          'one recursive AST scan per stored body; call sites, distinct targets, and distinct callers are separate',
        productScc:
          'SCC spans stored product bodies over synchronous call/jump execution only; dynamic entity bindings and scene-hook stage refs are deferred and excluded',
        runtimeReachability:
          'union of final content ScriptRef sites and author library declarations, then fixed point over four body reference kinds',
        sharedTail:
          'runtime reachable body with more than one distinct predecessor body; external entries and duplicate sites do not count',
        foldedBodies:
          'only unreachable bodies in explicit SpriteAction or HostileBehavior removed-root closures',
      },
    },
    summary: {
      sourceCommands: commands.length,
      sourceEntrySites: sourceEntries.sites.length,
      sourceGraphSeeds: legacyRoots.length,
      legacyRawEdges: legacyGraph.edges.length,
      legacyRawComponents: legacyGraph.components.length,
      legacyRawCyclicComponents: legacyCyclicIds.size,
      productBodies: bodyIds.length,
      productReferenceSites: references.length,
      productEntrySites: entries.length,
      runtimeReachableBodies: reachable.size,
      unreachableBodies: unreachable.size,
      productCyclicComponents: productComponents.cyclic.size,
      productCyclicBodies,
      sharedTails: sharedTails.length,
    },
    source: {
      entries: {
        sites: sourceEntries.sites,
        byKind: countBy(sourceEntries.sites, (site) => site.kind),
        graphSeeds: legacyRoots.length,
        duplicateGlobalSites:
          sourceEntries.sites.filter((site) => site.owner.startsWith('global/')).length -
          globalRoots.length,
      },
      legacyRawGraph: {
        edges: legacyEdges,
        edgeSites: legacyEdgeSites,
        components: legacyGraph.components.length,
        cyclicComponents: legacyCyclicIds.size,
        cyclicNodes: [...legacyCyclicIds].reduce(
          (sum, id) => sum + legacyGraph.components[id]!.length,
          0,
        ),
        componentOf: legacyGraph.componentOf,
        cyclicComponentIds: [...legacyCyclicIds].sort((left, right) => left - right),
      },
      semanticGraph: semantic.audit,
      addressZero: {
        sites: zero.sites,
        byDisposition: countBy(zero.sites, (site) => site.disposition),
        unknown: zero.unknown,
      },
      sceneHookPatches: sourcePatches,
    },
    product: {
      categories: categoryCounts,
      entries: {
        sites: entries,
        byKind: entryKinds,
        distinctTargets: new Set(entries.map((entry) => entry.targetId)).size,
        libraryDeclarations,
        seedCoverage: {
          finalContent: finalSeedCoverage,
          libraryDeclarations: {
            sites: libraryDeclarations.length,
            distinctTargets: new Set(libraryDeclarations).size,
          },
          allSeedSites: entries.length + libraryDeclarations.length,
          allDistinctTargets: rootTargets.length,
        },
      },
      references: { sites: references, byKind: referenceKinds, byFlow: referenceFlows },
      reachability: {
        reachable: reachable.size,
        unreachable: unreachable.size,
        rootTargets,
        reachableByCategory,
        unreachableByCategory,
      },
      components: {
        count: productComponents.components.length,
        cyclic: productComponents.cyclic.size,
        cyclicBodies: productCyclicBodies,
        size1: [...productComponents.cyclic].filter(
          (id) => productComponents.components[id]!.length === 1,
        ).length,
        size2: [...productComponents.cyclic].filter(
          (id) => productComponents.components[id]!.length === 2,
        ).length,
        size3Plus: [...productComponents.cyclic].filter(
          (id) => productComponents.components[id]!.length >= 3,
        ).length,
        reachableCyclic,
        reachableCyclicBodies,
        unreachableCyclic,
        unreachableCyclicBodies,
        mixedCyclic,
      },
      folded: {
        spriteAction: {
          entities: migration.report.foldedSpriteRoots.length,
          bodies: [...foldedSpriteBodies].sort(),
        },
        hostileBehavior: {
          entities: migration.report.foldedHostileRoots.length,
          bodies: [...foldedHostileBodies].sort(),
        },
        overlap: foldedOverlap,
        unclassifiedUnreachable,
      },
      sceneHookBindings: {
        sites: hookBindings,
        onEnter: hookBindings.filter((binding) => binding.kind === 'setSceneOnEnter').length,
        onTeleport: hookBindings.filter((binding) => binding.kind === 'setSceneOnTeleport').length,
        clearCommands: clearSceneScripts,
        stageTargets: hookBindings.reduce((sum, binding) => sum + binding.targetIds.length, 0),
      },
      dialogueStates: {
        bodies: dialogueBodies.length,
        distinctHashes: new Set(dialogueBodies.map((body) => body.dialogue!.hash)).size,
        baseIdentities: dialogueByBase.size,
        multiEntryStateIdentities,
        defaultHashBodies: dialogueBodies.filter((body) => body.dialogue!.hash === '0a386828')
          .length,
      },
      sharedTails,
      bodies: bodyAudits,
    },
    canaries: {
      s018,
      e2493: {
        triggerRootTargets: rootsForEntity('e2493', 'trigger'),
        autoRootTargets: rootsForEntity('e2493', 'auto'),
        dynamicTriggerTargets: dynamicTargets('e2493'),
      },
      e2495: {
        triggerRootTargets: rootsForEntity('e2495', 'trigger'),
        autoRootTargets: rootsForEntity('e2495', 'auto'),
        dynamicTriggerTargets: dynamicTargets('e2495'),
      },
      authorRoots,
      misleadingSccBodies,
      sharedSccTails: sharedTails.filter((id) => id.startsWith('shared/scc-')),
    },
    debts: [
      {
        id: 'misleading-shared-scc-name',
        message:
          'shared/scc-* is assigned to every owner-ambiguous Tarjan component, including singleton acyclic bodies',
        bodyIds: misleadingSccBodies.map((body) => body.id),
      },
      {
        id: 'legacy-author-alias-shells',
        message: 'stable shared/user roots still bridge to migration-derived internal targets',
        bodyIds: authorRoots.filter((root) => root.bridgeOnly).map((root) => root.id),
      },
      {
        id: 's018-cross-scene-internal-binding',
        message:
          's018 on-enter entry.prepare installs an internal s015/e204 trigger body without a named behavior slot',
        bodyIds: s018.map((entry) => entry.targetId),
      },
      {
        id: 'registry-identity-context-omissions',
        message:
          'migration body identity includes dialogue entry state but not pendingAuto or lastRngChunk; P3 must prove merge compatibility',
      },
    ],
    issues: [...new Set(issues)].sort(),
  }
  return { ...withoutDigest, digest: digest(withoutDigest) }
}

export function assertScriptControlFlowAudit(report: ScriptControlFlowAuditV1): void {
  if (report.issues.length)
    throw new Error(`script control flow audit failed:\n${report.issues.join('\n')}`)
}

export function semanticSourceGraphForTest(
  commands: readonly SourceCmd[],
  roots: readonly SourceEntrySite[],
): SemanticSourceGraphAudit {
  return semanticSourceGraph(commands, roots).audit
}

export function sourceAddressZeroSitesForTest(
  commands: readonly SourceCmd[],
  roots: readonly SourceEntrySite[],
): SourceAddressZeroSite[] {
  const semantic = semanticSourceGraph(commands, roots)
  return sourceAddressZeroSites(commands, [], semantic.contextsByAddress).sites
}

export function sourceSceneHookPatchesForTest(commands: readonly SourceCmd[]) {
  return sourceSceneHookPatches(commands)
}

export function sourceHookInstallerAddressesForTest(
  commands: readonly SourceCmd[],
  bodyAddresses: readonly number[],
  kind: SceneHookBindingAudit['kind'],
  targetScene: string,
  targetIds: readonly string[],
): number[] {
  return sourceHookInstallerCandidates(
    sourceSceneHookPatches(commands),
    new Set(bodyAddresses),
    kind,
    targetScene,
    targetIds,
  ).map((candidate) => candidate.address)
}

export function productReferenceSitesForTest(body: readonly Command[]): ProductReferenceSite[] {
  return refsInBody(body, 'test')
}

export function productComponentAuditForTest(bodies: Readonly<Record<string, Command[]>>): {
  cyclicComponents: number
  cyclicBodies: number
} {
  const ids = Object.keys(bodies).sort()
  const references = ids.flatMap((id) => refsInBody(bodies[id]!, id))
  const components = tarjanStrings(
    ids,
    references.map((reference) => ({
      from: reference.callerBodyId,
      to: reference.targetId,
      kind: reference.flow === 'deferred-binding' ? 'binding' : 'execution',
    })),
  )
  return {
    cyclicComponents: components.cyclic.size,
    cyclicBodies: [...components.cyclic].reduce(
      (sum, id) => sum + components.components[id]!.length,
      0,
    ),
  }
}
