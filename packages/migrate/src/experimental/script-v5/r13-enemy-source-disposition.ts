import {
  type EnemyDef,
  type EnemyHookChannel,
  type EnemyHookFlow,
  validateEnemies,
} from '@type-pal/content'
import type { EnemyMigrationResult, SourceEnemyObject } from '../../migrate-enemies.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, PalMigrationSources } from '../../pal-migration.js'
import type { SourceEntrySite } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import {
  assertR13SourceExecutionCensus,
  buildR13SourceExecutionCensusFromGraph,
  type R13SourceExecutionCensusV1,
} from './source-execution-census.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'

export const R13_ENEMY_SOURCE_DISPOSITION_METHOD = 'n3-p7-r13-enemy-source-disposition-v1' as const

export type R13EnemySourceDisposition = 'translated' | 'equivalent' | 'unreachable'
export type R13EnemySourceSiteScope = 'legacy-debt' | 'mandatory-non-pending' | 'reviewer-silent'
export type R13EnemySourceRootChannel = EnemyHookChannel | 'battleEnd'

export interface R13EnemySourceSiteOracle {
  scope: R13EnemySourceSiteScope
  enemyId: string
  channel: EnemyHookChannel
  rootAddress: number
  sourceAddress: number
  disposition: R13EnemySourceDisposition
}

/**
 * R13-5 设计签字冻结的旧 translator 31 个 pending execution site。
 *
 * 注意 42842 被 enemy-420 / enemy-422 两个 owner 分别执行，必须保留为两个 site，
 * 不能按 source address 去重成 30。
 */
export const R13_ENEMY_LEGACY_DEBT_ORACLE = [
  ['enemy-420', 'turnStart', 42840, 42842, 'equivalent'],
  ['enemy-421', 'ready', 42677, 42677, 'translated'],
  ['enemy-422', 'ready', 42634, 42634, 'equivalent'],
  ['enemy-422', 'turnStart', 42840, 42842, 'equivalent'],
  ['enemy-435', 'turnStart', 41533, 41555, 'unreachable'],
  ['enemy-463', 'ready', 42930, 42930, 'translated'],
  ['enemy-463', 'ready', 42930, 42931, 'translated'],
  ['enemy-463', 'ready', 42930, 42932, 'translated'],
  ['enemy-469', 'ready', 42428, 42428, 'translated'],
  ['enemy-469', 'ready', 42428, 42441, 'translated'],
  ['enemy-469', 'ready', 42428, 42447, 'translated'],
  ['enemy-483', 'turnStart', 41386, 41404, 'translated'],
  ['enemy-483', 'turnStart', 41386, 41409, 'translated'],
  ['enemy-483', 'turnStart', 41386, 41410, 'translated'],
  ['enemy-486', 'ready', 42457, 42457, 'translated'],
  ['enemy-499', 'turnStart', 40963, 40971, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42308, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42309, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42310, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42311, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42312, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42313, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42314, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42315, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42316, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42317, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42318, 'translated'],
  ['enemy-519', 'turnStart', 42237, 42319, 'translated'],
  ['enemy-539', 'turnStart', 42394, 42398, 'translated'],
  ['enemy-539', 'turnStart', 42394, 42399, 'translated'],
  ['enemy-547', 'ready', 42912, 42912, 'translated'],
] as const satisfies ReadonlyArray<
  readonly [string, EnemyHookChannel, number, number, R13EnemySourceDisposition]
>

/**
 * 旧 pending 账未捕获，但 R13-5 runtime 修复必须强制销账的非 pending site。
 */
export const R13_ENEMY_MANDATORY_NON_PENDING_ORACLE = [
  ['enemy-496', 'turnStart', 41432, 41432, 'translated'],
] as const satisfies ReadonlyArray<
  readonly [string, EnemyHookChannel, number, number, R13EnemySourceDisposition]
>

/**
 * 独立 reviewer 找出的 7 个静默漏迁移反例，不改写“31 个历史 debt site”口径。
 */
export const R13_ENEMY_REVIEWER_SILENT_ORACLE = [
  ['enemy-473', 'ready', 42509, 42524, 'translated'],
  ['enemy-473', 'ready', 42509, 42545, 'translated'],
  ['enemy-473', 'ready', 42509, 42554, 'translated'],
  ['enemy-546', 'ready', 42947, 42953, 'translated'],
  ['enemy-546', 'ready', 42947, 43006, 'translated'],
  ['enemy-546', 'ready', 42947, 43009, 'translated'],
  ['enemy-546', 'ready', 42947, 43012, 'translated'],
] as const satisfies ReadonlyArray<
  readonly [string, EnemyHookChannel, number, number, R13EnemySourceDisposition]
>

/**
 * 历史 12 个 pending enemy 的完整入口闭包：16 roots / 356 execution sites。
 * 旧 31-site 表只是反例样本，不能代替这张完整闭包表。
 */
export const R13_ENEMY_LEGACY_PENDING_ROOT_ORACLE = [
  [
    'enemy-420',
    'ready',
    42890,
    7,
    'bbf8bf87706b6cad6b7482ebb2dea84778abafbfaf41c37f7cc48e4e660fe326',
    'ce6e7abc8e77b61fe7a9a4a621fbd2f3f5d0a33381370a385f9e5971a9d607a8',
  ],
  [
    'enemy-420',
    'turnStart',
    42840,
    4,
    '2e00954a235523a0b72e281f478112cab6570b307a27c081b79683acbe408109',
    '9c63008a35a5a02fc25dca626a8fa271b8499230b00dda2c181794ad533fa5b6',
  ],
  [
    'enemy-421',
    'ready',
    42677,
    22,
    'a2d445089b965fc0cad11fbf2c957ed604bdf73df860c9d276922e254357f17d',
    '67494bc02d31ae8029cc682126bce57e964c32a333fe7a20caa8f993cc84e7a4',
  ],
  [
    'enemy-422',
    'ready',
    42634,
    7,
    '1561c90de93157a2705cf0c79a8afefb3982e44617fa4813a39a0a7c89ae5f5c',
    '3a8c6de9f10510585231cf02fdc092d89d2822f35b4b0ce58bcc960885700426',
  ],
  [
    'enemy-422',
    'turnStart',
    42840,
    4,
    '2e00954a235523a0b72e281f478112cab6570b307a27c081b79683acbe408109',
    '9c63008a35a5a02fc25dca626a8fa271b8499230b00dda2c181794ad533fa5b6',
  ],
  [
    'enemy-435',
    'turnStart',
    41533,
    22,
    'd80724a80d29e4801494ae3309971f1bf4f04c5065a8dae17bd737455dd0a611',
    'b3ec7ef0a50f2ea8b11b2c1491df9ef4854fa5c797fcfe24d54d68cea89a34f2',
  ],
  [
    'enemy-463',
    'ready',
    42930,
    11,
    '47a7945717ed151f47469e01b7ae8a88cfb8da87fad573d233611329081cf44b',
    'a493bb3e8787dd8411cbe5d92edcb4fda8c9486aadf4d117a11d818e3f3d9652',
  ],
  [
    'enemy-469',
    'ready',
    42428,
    28,
    '90496245d23d7a193722f9e2fc5c88db8b2050c86cf46f822f46fb197c1ffb60',
    '8e19024342903df40d2ae76cc5d49db02b5f393f8ffe7a36f784b1dca36f406a',
  ],
  [
    'enemy-483',
    'turnStart',
    41386,
    27,
    'b67c08150a64f19e867826c2f933c20deee47d648a22974ff66cf9b625f64c2e',
    'd1c0f7749af36f454999e340bf0b6a4665f22ab440adc8d5880892bd5231a9bb',
  ],
  [
    'enemy-486',
    'ready',
    42457,
    18,
    'ec1f1e45afe1f4521abf8a938504211e9e915281c7aabca72e6819f5617d7c9e',
    '4d786a4242e2f4d4b7d5c7c386f8059530704a44303c0796807cad9ea3fc1ab9',
  ],
  [
    'enemy-499',
    'turnStart',
    40963,
    17,
    '0d240bf20a247264be76e21e8f0f5dc27c3c68529d633da610ed48b52180b3cb',
    '266f30ae4d5ebb82e6ae615646a7957ed2da4aa4c8b689d26fce0d7f4b600af7',
  ],
  [
    'enemy-519',
    'ready',
    42384,
    10,
    '328785710a19907748b1df56df9c4c2db002016c041ff5b2de83d2718c9da209',
    '8167e23e14ead198f98fd98cc0f6bf610aea33ad404c3a32f44d06bf3fa12392',
  ],
  [
    'enemy-519',
    'turnStart',
    42237,
    146,
    'cce88b7fe4d2eee82022552c489329c14c3eda9fee0053db1a730042e9dd810b',
    'c84fcbe54e954ce1dee43dbf8e4013afa6bfdc99de29bf772a163529f82901c3',
  ],
  [
    'enemy-519',
    'battleEnd',
    42424,
    4,
    '2df42a7647f155dbc2bbf08d1dc9570ba5241a81e9e618c6e053f791d4737512',
    '3a5cb86a032bd7230270ee4d196c87654862d81b876584dbef72a3e45e3cb676',
  ],
  [
    'enemy-539',
    'turnStart',
    42394,
    12,
    '79e32d44f16457b01de8e57233192cc96134cde3b2c4d0d3e843a82f52d3baa7',
    'af565649764178c5e9c4b13e2afd89a1595b015fef439a20551bf589296a5de5',
  ],
  [
    'enemy-547',
    'ready',
    42912,
    17,
    '1313e94771693b666b81102b1a5ffcc5310abe9b5f6f7ca01c7c2f0a1cfa1b6e',
    'dae3545da5bc45635983a6f9f82605b3a5b78c30a6b575e637a954e2ff564aa4',
  ],
] as const satisfies ReadonlyArray<
  readonly [string, R13EnemySourceRootChannel, number, number, string, string]
>

/**
 * enemy-519 的初始成长演出结束后，L_42333..L_42382 构成一个跨回合持久游标环。
 *
 * 这不是旧 pending 31-site 账的一部分，不能倒灌修改历史口径；单列 trace 证明
 * bootstrap 边、25 个持久 state 与最终 reset 边在 raw/overlay/final 三层一致。
 */
export const R13_ENEMY_519_CURSOR_TRACE_ORACLE = Object.freeze({
  enemyId: 'enemy-519',
  channel: 'turnStart' as const,
  rootAddress: 42237,
  bootstrap: Object.freeze({
    stateRootAddress: 42299,
    terminatorAddress: 42332,
    nextStateRootAddress: 42333,
  }),
  edges: Object.freeze([
    [42333, 42334, 42335],
    [42335, 42336, 42337],
    [42337, 42338, 42339],
    [42339, 42339, 42340],
    [42340, 42341, 42342],
    [42342, 42343, 42344],
    [42344, 42345, 42346],
    [42346, 42347, 42348],
    [42348, 42349, 42350],
    [42350, 42351, 42352],
    [42352, 42353, 42354],
    [42354, 42355, 42356],
    [42356, 42357, 42358],
    [42358, 42361, 42362],
    [42362, 42363, 42364],
    [42364, 42365, 42366],
    [42366, 42367, 42368],
    [42368, 42368, 42369],
    [42369, 42370, 42371],
    [42371, 42372, 42373],
    [42373, 42374, 42375],
    [42375, 42376, 42377],
    [42377, 42377, 42378],
    [42378, 42380, 42381],
    [42381, 42382, 42333],
  ] as const),
})

type HookSourceOwner = NonNullable<EnemyMigrationResult['report']['hookSources']>[number]
type SourceEndCmd = SourceCmd & {
  advance?: boolean
  reset?: boolean
  resetTo?: number
  idleFrames?: number
}

export interface R13EnemySourceDispositionSite {
  id: string
  scope: R13EnemySourceSiteScope
  enemyId: string
  enemyName: string
  channel: EnemyHookChannel
  rootAddress: number
  sourceAddress: number
  sourceCommandSha256: string
  sourceClosureAddresses: number[]
  sourceClosureDigest: string
  disposition: R13EnemySourceDisposition
  sourceInClosure: boolean
  targetSelectors: string[]
  layers: {
    raw: { selectors: string[]; digest: string }
    overlay: { selectors: string[]; digest: string }
    final: { selectors: string[]; digest: string }
  }
}

export interface R13EnemyCursorTraceProof {
  id: string
  enemyId: string
  channel: EnemyHookChannel
  rootAddress: number
  bootstrap: {
    stateRootAddress: number
    terminatorAddress: number
    nextStateRootAddress: number
  }
  edges: Array<{
    stateRootAddress: number
    terminatorAddress: number
    nextStateRootAddress: number
    bodySourceAddresses: number[]
  }>
  sourceAddresses: number[]
  sourceDigest: string
  targetSelectors: string[]
  layers: {
    raw: { selectors: string[]; digest: string }
    overlay: { selectors: string[]; digest: string }
    final: { selectors: string[]; digest: string }
  }
}

export interface R13EnemySourceRootClosure {
  id: string
  enemyId: string
  channel: R13EnemySourceRootChannel
  rootAddress: number
  sourceRootId: string
  sourceAddresses: number[]
  sourceDigest: string
  targetSelectors: string[]
  layers: {
    raw: { selectors: string[]; digest: string }
    overlay: { selectors: string[]; digest: string }
    final: { selectors: string[]; digest: string }
  }
}

export interface R13EnemySourceDispositionV1 {
  kind: 'r13-enemy-source-disposition'
  version: 1
  methodVersion: typeof R13_ENEMY_SOURCE_DISPOSITION_METHOD
  generator: {
    sourceCommandsDigest: string
    enemyObjectsDigest: string
    enemyExecutionCensusDigest: string
    hookSourcesDigest: string
    rawEnemiesDigest: string
    overlayEnemiesDigest: string
    finalEnemiesDigest: string
  }
  sites: R13EnemySourceDispositionSite[]
  /** 12 个历史 pending enemy 的全部非零入口，而不是只覆盖旧 31-site 样本。 */
  legacyPendingRoots: R13EnemySourceRootClosure[]
  cursorTraces: R13EnemyCursorTraceProof[]
  summary: {
    legacyDebtSites: number
    mandatoryNonPendingSites: number
    reviewerSilentSites: number
    totalSites: number
    cursorTraceOwners: number
    cursorTraceStates: number
    cursorTraceEdges: number
    legacyPendingEnemies: number
    legacyPendingRoots: number
    legacyPendingExecutionSites: number
    byDisposition: Record<R13EnemySourceDisposition, number>
    scriptedEnemies: number
    hookOwners: number
    hookRoots: number
    battleEndRoots: number
    totalRoots: number
    rawEnemies: number
    overlayEnemies: number
    finalEnemies: number
  }
  digest: string
}

export interface R13EnemySourceDispositionBuildArgs {
  commands: readonly SourceCmd[]
  enemyObjects: readonly SourceEnemyObject[]
  hookSources: readonly HookSourceOwner[]
  rawEnemies: readonly EnemyDef[]
  overlayEnemies: readonly EnemyDef[]
  finalEnemies: readonly EnemyDef[]
}

export interface R13EnemySourceDispositionPalBuildArgs {
  sources: PalMigrationSources
  migration: MigrationFileSet
  final: MigrationSnapshot
}

function oracleRows(): R13EnemySourceSiteOracle[] {
  const expand = (
    scope: R13EnemySourceSiteScope,
    rows: ReadonlyArray<
      readonly [string, EnemyHookChannel, number, number, R13EnemySourceDisposition]
    >,
  ): R13EnemySourceSiteOracle[] =>
    rows.map(([enemyId, channel, rootAddress, sourceAddress, disposition]) => ({
      scope,
      enemyId,
      channel,
      rootAddress,
      sourceAddress,
      disposition,
    }))
  return [
    ...expand('legacy-debt', R13_ENEMY_LEGACY_DEBT_ORACLE),
    ...expand('mandatory-non-pending', R13_ENEMY_MANDATORY_NON_PENDING_ORACLE),
    ...expand('reviewer-silent', R13_ENEMY_REVIEWER_SILENT_ORACLE),
  ]
}

function siteId(site: R13EnemySourceSiteOracle): string {
  return `${site.scope}:${site.enemyId}:${site.channel}:L_${site.rootAddress}@${site.sourceAddress}`
}

function byId<T extends { id: string }>(values: readonly T[], label: string): Map<string, T> {
  const result = new Map<string, T>()
  for (const value of values) {
    if (result.has(value.id))
      throw new Error(`R13-5 enemy disposition: duplicate ${label} ${value.id}`)
    result.set(value.id, value)
  }
  return result
}

function sourceClosureDigest(commands: readonly SourceCmd[], addresses: readonly number[]): string {
  return stableJsonSha256(
    addresses.map((address) => {
      const command = commands[address]
      if (!command) throw new Error(`R13-5 enemy disposition: source L_${address} 越界`)
      return { address, sourceCommandSha256: stableJsonSha256(command) }
    }),
  )
}

function hookRootSourceId(enemy: SourceEnemyObject, channel: R13EnemySourceRootChannel): string {
  const field =
    channel === 'ready'
      ? 'scriptOnReady'
      : channel === 'turnStart'
        ? 'scriptOnTurnStart'
        : 'scriptOnBattleEnd'
  return `global/enemies/${enemy.objectIndex}/${field}`
}

function enemyHookEntries(enemyObjects: readonly SourceEnemyObject[]): SourceEntrySite[] {
  const entries: SourceEntrySite[] = []
  for (const enemy of enemyObjects)
    for (const [channel, entry] of [
      ['ready', enemy.scriptOnReady],
      ['turnStart', enemy.scriptOnTurnStart],
      ['battleEnd', enemy.scriptOnBattleEnd],
    ] as const)
      if (entry > 0)
        entries.push({
          kind: 'enemy',
          sourceId: hookRootSourceId(enemy, channel),
          owner: `enemy-${enemy.objectIndex}`,
          entry,
          channel: 'trigger',
        })
  return entries
}

function addressesByEntry(census: R13SourceExecutionCensusV1): Map<string, number[]> {
  const entryByContext = new Map(
    census.contexts.map((context) => [context.id, context.entrySiteId] as const),
  )
  const addresses = new Map<string, Set<number>>()
  for (const site of census.sites) {
    const entry = entryByContext.get(site.contextId)
    if (!entry) continue
    const found = addresses.get(entry) ?? new Set<number>()
    found.add(site.address)
    addresses.set(entry, found)
  }
  return new Map(
    [...addresses].map(([entry, found]) => [entry, [...found].sort((left, right) => left - right)]),
  )
}

function buildIndependentHookClosures(args: {
  commands: readonly SourceCmd[]
  enemyObjects: readonly SourceEnemyObject[]
  hookSources: readonly HookSourceOwner[]
}): {
  census: R13SourceExecutionCensusV1
  closures: Map<string, number[]>
} {
  const entries = enemyHookEntries(args.enemyObjects)
  const census = buildR13SourceExecutionCensusFromGraph(args.commands, entries)
  assertR13SourceExecutionCensus(census)
  const closures = addressesByEntry(census)
  const objectById = new Map<string, SourceEnemyObject>(
    args.enemyObjects.map((enemy) => [`enemy-${enemy.objectIndex}`, enemy] as const),
  )
  const witnessedEntries = new Set<string>()
  for (const owner of args.hookSources) {
    const object = objectById.get(owner.id)
    if (!object) throw new Error(`R13-5 enemy disposition: hook owner ${owner.id} 缺 source object`)
    for (const [channel, hook] of Object.entries(owner.hooks) as [
      EnemyHookChannel,
      HookSourceOwner['hooks'][EnemyHookChannel],
    ][]) {
      if (!hook) continue
      const sourceId = hookRootSourceId(object, channel)
      const independent = closures.get(sourceId)
      if (!independent)
        throw new Error(`R13-5 enemy disposition: ${sourceId} 缺独立 source closure`)
      witnessedEntries.add(sourceId)
      if (stableJsonSha256(independent) !== stableJsonSha256(hook.reachableSourceAddresses))
        throw new Error(`R13-5 enemy disposition: ${sourceId} translator/source census 闭包漂移`)
      const mapped = hook.sourceMappings.map((mapping) => mapping.sourceAddress)
      if (
        new Set(mapped).size !== mapped.length ||
        stableJsonSha256(mapped) !== stableJsonSha256(independent)
      )
        throw new Error(`R13-5 enemy disposition: ${sourceId} source mapping 覆盖漂移`)
    }
    if (owner.battleEnd) {
      const sourceId = hookRootSourceId(object, 'battleEnd')
      const closure = closures.get(sourceId)
      if (!closure) throw new Error(`R13-5 enemy disposition: ${sourceId} 缺独立 source closure`)
      witnessedEntries.add(sourceId)
      if (
        owner.battleEnd.rootAddress !== object.scriptOnBattleEnd ||
        stableJsonSha256(owner.battleEnd.reachableSourceAddresses) !== stableJsonSha256(closure)
      )
        throw new Error(`R13-5 enemy disposition: ${sourceId} battleEnd/source census 闭包漂移`)
    }
  }
  if (
    witnessedEntries.size !== entries.length ||
    [...entries].some((entry) => !witnessedEntries.has(entry.sourceId))
  )
    throw new Error('R13-5 enemy disposition: 67 个 enemy script root authority 漂移')
  return { census, closures }
}

function rootTargetLayer(args: { enemy: EnemyDef; channel: R13EnemySourceRootChannel }): {
  selectors: string[]
  digest: string
} {
  const selector =
    args.channel === 'battleEnd'
      ? `content/enemies.json#enemy(${args.enemy.id}).onDefeated`
      : `content/enemies.json#enemy(${args.enemy.id}).ai.hooks.${args.channel}`
  const target =
    args.channel === 'battleEnd' ? args.enemy.onDefeated : args.enemy.ai.hooks?.[args.channel]
  if (target === undefined)
    throw new Error(`R13-5 enemy disposition: legacy pending target 不存在 ${selector}`)
  return {
    selectors: [selector],
    digest: stableJsonSha256(target),
  }
}

function legacyPendingRootClosures(args: {
  commands: readonly SourceCmd[]
  enemyObjects: readonly SourceEnemyObject[]
  hookSources: readonly HookSourceOwner[]
  independentClosures: ReadonlyMap<string, number[]>
  rawById: ReadonlyMap<string, EnemyDef>
  overlayById: ReadonlyMap<string, EnemyDef>
  finalById: ReadonlyMap<string, EnemyDef>
}): R13EnemySourceRootClosure[] {
  const pendingEnemyIds = [...new Set(R13_ENEMY_LEGACY_DEBT_ORACLE.map((row) => row[0]))].sort(
    stableStringCompare,
  )
  const objectById = new Map(
    args.enemyObjects.map((enemy) => [`enemy-${enemy.objectIndex}`, enemy] as const),
  )
  const sourceById = new Map(args.hookSources.map((owner) => [owner.id, owner] as const))
  const closures: R13EnemySourceRootClosure[] = []
  for (const enemyId of pendingEnemyIds) {
    const object = objectById.get(enemyId)
    const source = sourceById.get(enemyId)
    const raw = args.rawById.get(enemyId)
    const overlay = args.overlayById.get(enemyId)
    const final = args.finalById.get(enemyId)
    if (!object || !source || !raw || !overlay || !final)
      throw new Error(`R13-5 enemy disposition: legacy pending owner 缺失 ${enemyId}`)
    for (const [channel, rootAddress] of [
      ['ready', object.scriptOnReady],
      ['turnStart', object.scriptOnTurnStart],
      ['battleEnd', object.scriptOnBattleEnd],
    ] as const) {
      if (rootAddress <= 0) continue
      const sourceRootId = hookRootSourceId(object, channel)
      const sourceAddresses = args.independentClosures.get(sourceRootId)
      const sourceAuthority = channel === 'battleEnd' ? source.battleEnd : source.hooks[channel]
      if (
        !sourceAddresses ||
        !sourceAuthority ||
        sourceAuthority.rootAddress !== rootAddress ||
        stableJsonSha256(sourceAuthority.reachableSourceAddresses) !==
          stableJsonSha256(sourceAddresses)
      )
        throw new Error(`R13-5 enemy disposition: legacy pending source 漂移 ${sourceRootId}`)
      const rawTarget = rootTargetLayer({ enemy: raw, channel })
      const overlayTarget = rootTargetLayer({ enemy: overlay, channel })
      const finalTarget = rootTargetLayer({ enemy: final, channel })
      if (
        stableJsonSha256(rawTarget) !== stableJsonSha256(overlayTarget) ||
        stableJsonSha256(rawTarget) !== stableJsonSha256(finalTarget)
      )
        throw new Error(`R13-5 enemy disposition: legacy pending target 漂移 ${sourceRootId}`)
      closures.push({
        id: `${enemyId}:${channel}:L_${rootAddress}:source-root`,
        enemyId,
        channel,
        rootAddress,
        sourceRootId,
        sourceAddresses: [...sourceAddresses],
        sourceDigest: sourceClosureDigest(args.commands, sourceAddresses),
        targetSelectors: [...rawTarget.selectors],
        layers: {
          raw: rawTarget,
          overlay: overlayTarget,
          final: finalTarget,
        },
      })
    }
  }
  return closures.sort((left, right) => stableStringCompare(left.id, right.id))
}

function resolveRelativeTarget(flow: EnemyHookFlow, selector: string): unknown {
  if (selector.includes('['))
    throw new Error(`R13-5 enemy disposition: target selector 禁止数组下标 ${selector}`)
  const next = /^states\.([^.]+)\.next$/.exec(selector)
  if (next) {
    const state = flow.states[next[1]!]
    if (!state) throw new Error(`R13-5 enemy disposition: target selector 不存在 ${selector}`)
    return state.next
  }
  const state = /^states\.([^.]+)$/.exec(selector)
  if (state) {
    const found = flow.states[state[1]!]
    if (!found) throw new Error(`R13-5 enemy disposition: target selector 不存在 ${selector}`)
    return found
  }
  throw new Error(`R13-5 enemy disposition: target selector 格式未知 ${selector}`)
}

function targetLayer(args: {
  enemy: EnemyDef
  channel: EnemyHookChannel
  relativeSelectors: readonly string[]
  unreachable: boolean
}): { selectors: string[]; digest: string } {
  const flow = args.enemy.ai.hooks?.[args.channel]
  if (!flow)
    throw new Error(`R13-5 enemy disposition: ${args.enemy.id}.ai.hooks.${args.channel} 不存在`)
  const prefix = `content/enemies.json#enemy(${args.enemy.id}).ai.hooks.${args.channel}`
  if (args.unreachable)
    return {
      selectors: [prefix],
      digest: stableJsonSha256([{ selector: prefix, value: flow }]),
    }
  const targets = [...args.relativeSelectors].sort(stableStringCompare).map((selector) => ({
    selector: `${prefix}.${selector}`,
    value: resolveRelativeTarget(flow, selector),
  }))
  if (!targets.length)
    throw new Error(`R13-5 enemy disposition: ${prefix} 缺 source target selector`)
  return { selectors: targets.map((entry) => entry.selector), digest: stableJsonSha256(targets) }
}

function cursorTraceLayer(args: {
  enemy: EnemyDef
  proof: Omit<R13EnemyCursorTraceProof, 'layers'>
}): { selectors: string[]; digest: string } {
  const { proof } = args
  const flow = args.enemy.ai.hooks?.[proof.channel]
  if (!flow)
    throw new Error(`R13-5 enemy disposition: ${proof.enemyId}.ai.hooks.${proof.channel} 不存在`)
  const bootstrapState = flow.states[`state-L_${proof.bootstrap.stateRootAddress}`]
  if (
    !bootstrapState ||
    stableJsonSha256(bootstrapState.next) !==
      stableJsonSha256({
        kind: 'advance',
        state: `state-L_${proof.bootstrap.nextStateRootAddress}`,
      })
  )
    throw new Error(`R13-5 enemy disposition: ${proof.id} bootstrap transition 漂移`)
  for (const edge of proof.edges) {
    const state = flow.states[`state-L_${edge.stateRootAddress}`]
    if (!state)
      throw new Error(`R13-5 enemy disposition: ${proof.id} 缺 state-L_${edge.stateRootAddress}`)
    if (state.body.length !== edge.bodySourceAddresses.length)
      throw new Error(
        `R13-5 enemy disposition: ${proof.id} state-L_${edge.stateRootAddress} body 长度漂移`,
      )
    if (
      stableJsonSha256(state.next) !==
      stableJsonSha256({
        kind: 'advance',
        state: `state-L_${edge.nextStateRootAddress}`,
      })
    )
      throw new Error(
        `R13-5 enemy disposition: ${proof.id} state-L_${edge.stateRootAddress} next 漂移`,
      )
  }
  const prefix = `content/enemies.json#enemy(${proof.enemyId}).ai.hooks.${proof.channel}`
  const relativeSelectors = [
    `states.state-L_${proof.bootstrap.stateRootAddress}.next`,
    ...proof.edges.map((edge) => `states.state-L_${edge.stateRootAddress}`),
  ].sort(stableStringCompare)
  const targets = relativeSelectors.map((selector) => ({
    selector: `${prefix}.${selector}`,
    value: resolveRelativeTarget(flow, selector),
  }))
  return { selectors: targets.map((entry) => entry.selector), digest: stableJsonSha256(targets) }
}

function buildEnemy519CursorTrace(args: {
  commands: readonly SourceCmd[]
  hookSourceById: Map<string, HookSourceOwner>
  rawById: Map<string, EnemyDef>
  overlayById: Map<string, EnemyDef>
  finalById: Map<string, EnemyDef>
}): R13EnemyCursorTraceProof {
  const oracle = R13_ENEMY_519_CURSOR_TRACE_ORACLE
  const id = `${oracle.enemyId}:${oracle.channel}:L_${oracle.rootAddress}:persistent-cycle`
  const hookSource = args.hookSourceById.get(oracle.enemyId)?.hooks[oracle.channel]
  if (!hookSource || hookSource.rootAddress !== oracle.rootAddress)
    throw new Error(`R13-5 enemy disposition: ${id} 缺 hook source`)
  const mappingByAddress = new Map(
    hookSource.sourceMappings.map((mapping) => [mapping.sourceAddress, mapping] as const),
  )
  const requireMapping = (address: number, selector: string): void => {
    const mapping = mappingByAddress.get(address)
    if (
      !mapping ||
      mapping.disposition !== 'translated' ||
      !mapping.targetSelectors.includes(selector)
    )
      throw new Error(
        `R13-5 enemy disposition: ${id} L_${address} 缺 translated selector ${selector}`,
      )
  }
  const bootstrapCommand = args.commands[oracle.bootstrap.terminatorAddress] as
    | SourceEndCmd
    | undefined
  if (bootstrapCommand?.op !== 'end' || bootstrapCommand.advance !== true)
    throw new Error(`R13-5 enemy disposition: ${id} bootstrap source END 漂移`)
  requireMapping(
    oracle.bootstrap.terminatorAddress,
    `states.state-L_${oracle.bootstrap.stateRootAddress}.next`,
  )

  const edges = oracle.edges.map(([stateRootAddress, terminatorAddress, nextStateRootAddress]) => {
    const bodySourceAddresses = Array.from(
      { length: terminatorAddress - stateRootAddress },
      (_, index) => stateRootAddress + index,
    )
    for (const address of bodySourceAddresses) {
      if (!args.commands[address] || args.commands[address]?.op === 'end')
        throw new Error(`R13-5 enemy disposition: ${id} L_${address} body source 漂移`)
      requireMapping(address, `states.state-L_${stateRootAddress}`)
    }
    const terminator = args.commands[terminatorAddress] as SourceEndCmd | undefined
    const isResetEdge = terminatorAddress === 42382
    if (
      terminator?.op !== 'end' ||
      (isResetEdge
        ? terminator.reset !== true ||
          terminator.resetTo !== nextStateRootAddress ||
          (terminator.idleFrames ?? 0) !== 0
        : terminator.advance !== true)
    )
      throw new Error(`R13-5 enemy disposition: ${id} L_${terminatorAddress} terminator 漂移`)
    requireMapping(terminatorAddress, `states.state-L_${stateRootAddress}.next`)
    return {
      stateRootAddress,
      terminatorAddress,
      nextStateRootAddress,
      bodySourceAddresses,
    }
  })
  const sourceAddresses = [
    oracle.bootstrap.terminatorAddress,
    ...edges.flatMap((edge) => [...edge.bodySourceAddresses, edge.terminatorAddress]),
  ]
  const expectedSourceAddresses = Array.from(
    {
      length: edges[edges.length - 1]!.terminatorAddress - oracle.bootstrap.terminatorAddress + 1,
    },
    (_, index) => oracle.bootstrap.terminatorAddress + index,
  )
  if (
    stableJsonSha256(sourceAddresses) !== stableJsonSha256(expectedSourceAddresses) ||
    sourceAddresses.some((address) => !hookSource.reachableSourceAddresses.includes(address))
  )
    throw new Error(`R13-5 enemy disposition: ${id} source trace 闭包漂移`)

  const proofWithoutLayers: Omit<R13EnemyCursorTraceProof, 'layers'> = {
    id,
    enemyId: oracle.enemyId,
    channel: oracle.channel,
    rootAddress: oracle.rootAddress,
    bootstrap: { ...oracle.bootstrap },
    edges,
    sourceAddresses,
    sourceDigest: sourceClosureDigest(args.commands, sourceAddresses),
    targetSelectors: [],
  }
  const rawEnemy = args.rawById.get(oracle.enemyId)
  const overlayEnemy = args.overlayById.get(oracle.enemyId)
  const finalEnemy = args.finalById.get(oracle.enemyId)
  if (!rawEnemy || !overlayEnemy || !finalEnemy)
    throw new Error(`R13-5 enemy disposition: ${id} 缺 raw/overlay/final enemy`)
  const raw = cursorTraceLayer({ enemy: rawEnemy, proof: proofWithoutLayers })
  const overlay = cursorTraceLayer({ enemy: overlayEnemy, proof: proofWithoutLayers })
  const final = cursorTraceLayer({ enemy: finalEnemy, proof: proofWithoutLayers })
  if (
    stableJsonSha256(raw.selectors) !== stableJsonSha256(overlay.selectors) ||
    stableJsonSha256(raw.selectors) !== stableJsonSha256(final.selectors) ||
    raw.digest !== overlay.digest ||
    raw.digest !== final.digest
  )
    throw new Error(`R13-5 enemy disposition: ${id} raw/overlay/final trace 漂移`)
  return {
    ...proofWithoutLayers,
    targetSelectors: raw.selectors,
    layers: { raw, overlay, final },
  }
}

function summaryOf(
  sites: readonly R13EnemySourceDispositionSite[],
  legacyPendingRoots: readonly R13EnemySourceRootClosure[],
  cursorTraces: readonly R13EnemyCursorTraceProof[],
  counts: {
    scriptedEnemies: number
    hookOwners: number
    hookRoots: number
    battleEndRoots: number
    raw: number
    overlay: number
    final: number
  },
): R13EnemySourceDispositionV1['summary'] {
  const byDisposition: Record<R13EnemySourceDisposition, number> = {
    translated: 0,
    equivalent: 0,
    unreachable: 0,
  }
  for (const site of sites) byDisposition[site.disposition]++
  return {
    legacyDebtSites: sites.filter((site) => site.scope === 'legacy-debt').length,
    mandatoryNonPendingSites: sites.filter((site) => site.scope === 'mandatory-non-pending').length,
    reviewerSilentSites: sites.filter((site) => site.scope === 'reviewer-silent').length,
    totalSites: sites.length,
    cursorTraceOwners: cursorTraces.length,
    cursorTraceStates: cursorTraces.reduce((total, trace) => total + trace.edges.length, 0),
    cursorTraceEdges: cursorTraces.reduce((total, trace) => total + trace.edges.length + 1, 0),
    legacyPendingEnemies: new Set(legacyPendingRoots.map((root) => root.enemyId)).size,
    legacyPendingRoots: legacyPendingRoots.length,
    legacyPendingExecutionSites: legacyPendingRoots.reduce(
      (total, root) => total + root.sourceAddresses.length,
      0,
    ),
    byDisposition,
    scriptedEnemies: counts.scriptedEnemies,
    hookOwners: counts.hookOwners,
    hookRoots: counts.hookRoots,
    battleEndRoots: counts.battleEndRoots,
    totalRoots: counts.hookRoots + counts.battleEndRoots,
    rawEnemies: counts.raw,
    overlayEnemies: counts.overlay,
    finalEnemies: counts.final,
  }
}

export function buildR13EnemySourceDisposition(
  args: R13EnemySourceDispositionBuildArgs,
): R13EnemySourceDispositionV1 {
  const rawById = byId(args.rawEnemies, 'raw enemy')
  const overlayById = byId(args.overlayEnemies, 'overlay enemy')
  const finalById = byId(args.finalEnemies, 'final enemy')
  const hookSourceById = byId(args.hookSources, 'hook source')
  const objectById = new Map<string, SourceEnemyObject>(
    args.enemyObjects.map((enemy) => [`enemy-${enemy.objectIndex}`, enemy] as const),
  )
  const independent = buildIndependentHookClosures(args)

  const sites = oracleRows()
    .map((oracle): R13EnemySourceDispositionSite => {
      const id = siteId(oracle)
      const object = objectById.get(oracle.enemyId)
      const hookOwner = hookSourceById.get(oracle.enemyId)
      const hookSource = hookOwner?.hooks[oracle.channel]
      if (!object || !hookOwner || !hookSource)
        throw new Error(`R13-5 enemy disposition: ${id} 缺 owner/hook source`)
      const expectedRoot =
        oracle.channel === 'ready' ? object.scriptOnReady : object.scriptOnTurnStart
      if (expectedRoot !== oracle.rootAddress || hookSource.rootAddress !== oracle.rootAddress)
        throw new Error(
          `R13-5 enemy disposition: ${id} root 漂移 source=${expectedRoot} ` +
            `translation=${hookSource.rootAddress}`,
        )
      const closure =
        independent.closures.get(hookRootSourceId(object, oracle.channel)) ??
        (() => {
          throw new Error(`R13-5 enemy disposition: ${id} 缺独立 source closure`)
        })()
      if (
        closure.some((address, index) => index > 0 && closure[index - 1]! >= address) ||
        new Set(closure).size !== closure.length
      )
        throw new Error(`R13-5 enemy disposition: ${id} source closure 未严格排序`)
      const sourceInClosure = closure.includes(oracle.sourceAddress)
      if (sourceInClosure === (oracle.disposition === 'unreachable'))
        throw new Error(`R13-5 enemy disposition: ${id} reachable/disposition 矛盾`)
      const mapping = hookSource.sourceMappings.find(
        (entry) => entry.sourceAddress === oracle.sourceAddress,
      )
      if (oracle.disposition === 'unreachable' ? mapping !== undefined : mapping === undefined)
        throw new Error(`R13-5 enemy disposition: ${id} source mapping 与 disposition 矛盾`)
      if (mapping && mapping.disposition !== oracle.disposition)
        throw new Error(
          `R13-5 enemy disposition: ${id} source mapping disposition ` +
            `${mapping.disposition} != ${oracle.disposition}`,
        )
      const relativeSelectors = mapping?.targetSelectors ?? []
      const raw = rawById.get(oracle.enemyId)
      const overlay = overlayById.get(oracle.enemyId)
      const final = finalById.get(oracle.enemyId)
      if (!raw || !overlay || !final)
        throw new Error(`R13-5 enemy disposition: ${id} 缺 raw/overlay/final enemy`)
      const rawTarget = targetLayer({
        enemy: raw,
        channel: oracle.channel,
        relativeSelectors,
        unreachable: oracle.disposition === 'unreachable',
      })
      const overlayTarget = targetLayer({
        enemy: overlay,
        channel: oracle.channel,
        relativeSelectors,
        unreachable: oracle.disposition === 'unreachable',
      })
      const finalTarget = targetLayer({
        enemy: final,
        channel: oracle.channel,
        relativeSelectors,
        unreachable: oracle.disposition === 'unreachable',
      })
      if (
        stableJsonSha256(rawTarget.selectors) !== stableJsonSha256(overlayTarget.selectors) ||
        stableJsonSha256(rawTarget.selectors) !== stableJsonSha256(finalTarget.selectors) ||
        rawTarget.digest !== overlayTarget.digest ||
        rawTarget.digest !== finalTarget.digest
      )
        throw new Error(`R13-5 enemy disposition: ${id} raw/overlay/final target 漂移`)
      const source = args.commands[oracle.sourceAddress]
      if (!source) throw new Error(`R13-5 enemy disposition: ${id} source command 越界`)
      return {
        id,
        scope: oracle.scope,
        enemyId: oracle.enemyId,
        enemyName: hookOwner.name,
        channel: oracle.channel,
        rootAddress: oracle.rootAddress,
        sourceAddress: oracle.sourceAddress,
        sourceCommandSha256: stableJsonSha256(source),
        sourceClosureAddresses: closure,
        sourceClosureDigest: sourceClosureDigest(args.commands, closure),
        disposition: oracle.disposition,
        sourceInClosure,
        targetSelectors: rawTarget.selectors,
        layers: {
          raw: rawTarget,
          overlay: overlayTarget,
          final: finalTarget,
        },
      }
    })
    .sort((left, right) => stableStringCompare(left.id, right.id))

  const generator = {
    sourceCommandsDigest: stableJsonSha256(args.commands),
    enemyObjectsDigest: stableJsonSha256(args.enemyObjects),
    enemyExecutionCensusDigest: independent.census.digest,
    hookSourcesDigest: stableJsonSha256(args.hookSources),
    rawEnemiesDigest: stableJsonSha256(args.rawEnemies),
    overlayEnemiesDigest: stableJsonSha256(args.overlayEnemies),
    finalEnemiesDigest: stableJsonSha256(args.finalEnemies),
  }
  const hookRoots = args.hookSources.reduce(
    (sum, owner) => sum + Object.values(owner.hooks).filter(Boolean).length,
    0,
  )
  const cursorTraces = [
    buildEnemy519CursorTrace({
      commands: args.commands,
      hookSourceById,
      rawById,
      overlayById,
      finalById,
    }),
  ]
  const legacyPendingRoots = legacyPendingRootClosures({
    commands: args.commands,
    enemyObjects: args.enemyObjects,
    hookSources: args.hookSources,
    independentClosures: independent.closures,
    rawById,
    overlayById,
    finalById,
  })
  const summary = summaryOf(sites, legacyPendingRoots, cursorTraces, {
    scriptedEnemies: args.enemyObjects.filter(
      (enemy) =>
        enemy.scriptOnReady > 0 || enemy.scriptOnTurnStart > 0 || enemy.scriptOnBattleEnd > 0,
    ).length,
    hookOwners: args.hookSources.filter((owner) => Object.values(owner.hooks).some(Boolean)).length,
    hookRoots,
    battleEndRoots: args.enemyObjects.filter((enemy) => enemy.scriptOnBattleEnd > 0).length,
    raw: args.rawEnemies.length,
    overlay: args.overlayEnemies.length,
    final: args.finalEnemies.length,
  })
  const withoutDigest = {
    kind: 'r13-enemy-source-disposition' as const,
    version: 1 as const,
    methodVersion: R13_ENEMY_SOURCE_DISPOSITION_METHOD,
    generator,
    sites,
    legacyPendingRoots,
    cursorTraces,
    summary,
  }
  return { ...withoutDigest, digest: stableJsonSha256(withoutDigest) }
}

function snapshotEnemies(snapshot: MigrationSnapshot): EnemyDef[] {
  const value = snapshot.files.get('content/enemies.json')
  return validateEnemies(value)
}

function migrationOverlayEnemies(migration: MigrationFileSet): EnemyDef[] {
  return validateEnemies(migration.files.get('content/enemies.json'))
}

export function buildR13EnemySourceDispositionFromPal(
  args: R13EnemySourceDispositionPalBuildArgs,
): R13EnemySourceDispositionV1 {
  const hookSources = args.migration.report.enemies?.hookSources
  if (!hookSources) throw new Error('R13-5 enemy disposition: migration report 缺 hookSources')
  return buildR13EnemySourceDisposition({
    commands: args.sources.migrate.commands,
    enemyObjects: args.sources.migrate.enemyObjects ?? [],
    hookSources,
    rawEnemies: args.migration.report.rawProjection.enemies,
    overlayEnemies: migrationOverlayEnemies(args.migration),
    finalEnemies: snapshotEnemies(args.final),
  })
}

export function assertR13EnemySourceDisposition(
  report: R13EnemySourceDispositionV1,
  source?: R13EnemySourceDispositionBuildArgs,
): void {
  if (
    report.kind !== 'r13-enemy-source-disposition' ||
    report.version !== 1 ||
    report.methodVersion !== R13_ENEMY_SOURCE_DISPOSITION_METHOD
  )
    throw new Error('R13-5 enemy disposition: header 漂移')
  const expectedSiteIds = oracleRows().map(siteId).sort(stableStringCompare)
  const oracleById = new Map(oracleRows().map((site) => [siteId(site), site] as const))
  const actualSiteIds = report.sites.map((site) => site.id)
  if (
    report.sites.length !== 39 ||
    new Set(actualSiteIds).size !== actualSiteIds.length ||
    stableJsonSha256(actualSiteIds) !== stableJsonSha256(expectedSiteIds)
  )
    throw new Error('R13-5 enemy disposition: 31 + 8 site authority 漂移')
  if (Object.values(report.generator).some((digest) => !/^[0-9a-f]{64}$/.test(digest)))
    throw new Error('R13-5 enemy disposition: generator digest 非 sha256')
  for (let index = 1; index < report.sites.length; index++)
    if (stableStringCompare(report.sites[index - 1]!.id, report.sites[index]!.id) >= 0)
      throw new Error('R13-5 enemy disposition: sites 排序漂移')
  for (const site of report.sites) {
    const oracle = oracleById.get(site.id)
    if (
      !oracle ||
      site.scope !== oracle.scope ||
      site.enemyId !== oracle.enemyId ||
      site.channel !== oracle.channel ||
      site.rootAddress !== oracle.rootAddress ||
      site.sourceAddress !== oracle.sourceAddress ||
      site.disposition !== oracle.disposition
    )
      throw new Error(`R13-5 enemy disposition: oracle payload 漂移 ${site.id}`)
    if (
      !/^[0-9a-f]{64}$/.test(site.sourceCommandSha256) ||
      !/^[0-9a-f]{64}$/.test(site.sourceClosureDigest) ||
      site.sourceClosureAddresses.some(
        (address, index) =>
          !Number.isSafeInteger(address) ||
          address < 0 ||
          (index > 0 && site.sourceClosureAddresses[index - 1]! >= address),
      ) ||
      site.sourceInClosure === (site.disposition === 'unreachable') ||
      site.targetSelectors.length === 0 ||
      new Set(site.targetSelectors).size !== site.targetSelectors.length ||
      site.targetSelectors.some(
        (selector) => !selector.startsWith('content/enemies.json#enemy(') || selector.includes('['),
      ) ||
      stableJsonSha256(site.layers.raw.selectors) !== stableJsonSha256(site.targetSelectors) ||
      stableJsonSha256(site.layers.overlay.selectors) !== stableJsonSha256(site.targetSelectors) ||
      stableJsonSha256(site.layers.final.selectors) !== stableJsonSha256(site.targetSelectors) ||
      Object.values(site.layers).some(
        (layer) =>
          new Set(layer.selectors).size !== layer.selectors.length ||
          layer.selectors.some(
            (selector, index) =>
              index > 0 && stableStringCompare(layer.selectors[index - 1]!, selector) >= 0,
          ),
      ) ||
      site.layers.raw.digest !== site.layers.overlay.digest ||
      site.layers.raw.digest !== site.layers.final.digest ||
      !/^[0-9a-f]{64}$/.test(site.layers.raw.digest)
    )
      throw new Error(`R13-5 enemy disposition: site proof 漂移 ${site.id}`)
  }
  const expectedPendingEnemyIds = [
    ...new Set(R13_ENEMY_LEGACY_DEBT_ORACLE.map((row) => row[0])),
  ].sort(stableStringCompare)
  const rootIds = report.legacyPendingRoots.map((root) => root.id)
  const rootSourceIds = report.legacyPendingRoots.map((root) => root.sourceRootId)
  const rootOracle = new Map(
    R13_ENEMY_LEGACY_PENDING_ROOT_ORACLE.map(
      ([enemyId, channel, rootAddress, sites, sourceDigest, targetDigest]) => [
        `${enemyId}:${channel}:L_${rootAddress}:source-root`,
        { enemyId, channel, rootAddress, sites, sourceDigest, targetDigest },
      ],
    ),
  )
  if (
    report.legacyPendingRoots.length !== 16 ||
    new Set(rootIds).size !== rootIds.length ||
    new Set(rootSourceIds).size !== rootSourceIds.length ||
    stableJsonSha256(
      [...new Set(report.legacyPendingRoots.map((root) => root.enemyId))].sort(stableStringCompare),
    ) !== stableJsonSha256(expectedPendingEnemyIds)
  )
    throw new Error('R13-5 enemy disposition: 12 enemy / 16 root authority 漂移')
  for (let index = 1; index < report.legacyPendingRoots.length; index++)
    if (
      stableStringCompare(
        report.legacyPendingRoots[index - 1]!.id,
        report.legacyPendingRoots[index]!.id,
      ) >= 0
    )
      throw new Error('R13-5 enemy disposition: legacy pending roots 排序漂移')
  for (const root of report.legacyPendingRoots) {
    const oracle = rootOracle.get(root.id)
    const expectedField =
      root.channel === 'ready'
        ? 'scriptOnReady'
        : root.channel === 'turnStart'
          ? 'scriptOnTurnStart'
          : 'scriptOnBattleEnd'
    const expectedSelector =
      root.channel === 'battleEnd'
        ? `content/enemies.json#enemy(${root.enemyId}).onDefeated`
        : `content/enemies.json#enemy(${root.enemyId}).ai.hooks.${root.channel}`
    if (
      !oracle ||
      root.enemyId !== oracle.enemyId ||
      root.channel !== oracle.channel ||
      root.rootAddress !== oracle.rootAddress ||
      root.sourceAddresses.length !== oracle.sites ||
      root.sourceDigest !== oracle.sourceDigest ||
      root.layers.raw.digest !== oracle.targetDigest ||
      root.id !== `${root.enemyId}:${root.channel}:L_${root.rootAddress}:source-root` ||
      root.sourceRootId !==
        `global/enemies/${root.enemyId.replace(/^enemy-/, '')}/${expectedField}` ||
      !Number.isSafeInteger(root.rootAddress) ||
      root.rootAddress <= 0 ||
      root.sourceAddresses.some(
        (address, index) =>
          !Number.isSafeInteger(address) ||
          address < 0 ||
          (index > 0 && root.sourceAddresses[index - 1]! >= address),
      ) ||
      !/^[0-9a-f]{64}$/.test(root.sourceDigest) ||
      stableJsonSha256(root.targetSelectors) !== stableJsonSha256([expectedSelector]) ||
      Object.values(root.layers).some(
        (layer) =>
          stableJsonSha256(layer.selectors) !== stableJsonSha256(root.targetSelectors) ||
          !/^[0-9a-f]{64}$/.test(layer.digest),
      ) ||
      root.layers.raw.digest !== root.layers.overlay.digest ||
      root.layers.raw.digest !== root.layers.final.digest
    )
      throw new Error(`R13-5 enemy disposition: legacy pending root 漂移 ${root.id}`)
  }
  if (!Array.isArray(report.cursorTraces) || report.cursorTraces.length !== 1)
    throw new Error('R13-5 enemy disposition: enemy-519 cursor trace 缺失')
  const trace = report.cursorTraces[0]!
  const oracle = R13_ENEMY_519_CURSOR_TRACE_ORACLE
  if (
    trace.enemyId !== oracle.enemyId ||
    trace.channel !== oracle.channel ||
    trace.rootAddress !== oracle.rootAddress ||
    stableJsonSha256(trace.bootstrap) !== stableJsonSha256(oracle.bootstrap) ||
    stableJsonSha256(
      trace.edges.map((edge) => [
        edge.stateRootAddress,
        edge.terminatorAddress,
        edge.nextStateRootAddress,
      ]),
    ) !== stableJsonSha256(oracle.edges) ||
    trace.sourceAddresses.length !== 51 ||
    trace.edges.length !== 25 ||
    trace.targetSelectors.length !== 26 ||
    !/^[0-9a-f]{64}$/.test(trace.sourceDigest) ||
    new Set(trace.sourceAddresses).size !== trace.sourceAddresses.length ||
    trace.sourceAddresses.some(
      (address, index) =>
        address !== oracle.bootstrap.terminatorAddress + index ||
        (index > 0 && trace.sourceAddresses[index - 1]! >= address),
    ) ||
    trace.edges.some(
      (edge) =>
        stableJsonSha256(edge.bodySourceAddresses) !==
        stableJsonSha256(
          Array.from(
            { length: edge.terminatorAddress - edge.stateRootAddress },
            (_, index) => edge.stateRootAddress + index,
          ),
        ),
    ) ||
    new Set(trace.targetSelectors).size !== trace.targetSelectors.length ||
    trace.targetSelectors.some(
      (selector, index) =>
        !selector.startsWith(
          `content/enemies.json#enemy(${oracle.enemyId}).ai.hooks.${oracle.channel}.states.`,
        ) ||
        selector.includes('[') ||
        (index > 0 && stableStringCompare(trace.targetSelectors[index - 1]!, selector) >= 0),
    ) ||
    stableJsonSha256(trace.layers.raw.selectors) !== stableJsonSha256(trace.targetSelectors) ||
    stableJsonSha256(trace.layers.overlay.selectors) !== stableJsonSha256(trace.targetSelectors) ||
    stableJsonSha256(trace.layers.final.selectors) !== stableJsonSha256(trace.targetSelectors) ||
    trace.layers.raw.digest !== trace.layers.overlay.digest ||
    trace.layers.raw.digest !== trace.layers.final.digest ||
    Object.values(trace.layers).some((layer) => !/^[0-9a-f]{64}$/.test(layer.digest))
  )
    throw new Error('R13-5 enemy disposition: enemy-519 cursor trace 漂移')
  const expectedSummary = summaryOf(report.sites, report.legacyPendingRoots, report.cursorTraces, {
    scriptedEnemies: report.summary.scriptedEnemies,
    hookOwners: report.summary.hookOwners,
    hookRoots: report.summary.hookRoots,
    battleEndRoots: report.summary.battleEndRoots,
    raw: report.summary.rawEnemies,
    overlay: report.summary.overlayEnemies,
    final: report.summary.finalEnemies,
  })
  if (
    stableJsonSha256(report.summary) !== stableJsonSha256(expectedSummary) ||
    report.summary.legacyDebtSites !== 31 ||
    report.summary.mandatoryNonPendingSites !== 1 ||
    report.summary.reviewerSilentSites !== 7 ||
    report.summary.cursorTraceOwners !== 1 ||
    report.summary.cursorTraceStates !== 25 ||
    report.summary.cursorTraceEdges !== 26 ||
    report.summary.legacyPendingEnemies !== 12 ||
    report.summary.legacyPendingRoots !== 16 ||
    report.summary.legacyPendingExecutionSites !== 356 ||
    report.summary.byDisposition.translated !== 35 ||
    report.summary.byDisposition.equivalent !== 3 ||
    report.summary.byDisposition.unreachable !== 1 ||
    report.summary.scriptedEnemies !== 54 ||
    report.summary.hookOwners !== 44 ||
    report.summary.hookRoots !== 52 ||
    report.summary.battleEndRoots !== 15 ||
    report.summary.totalRoots !== 67 ||
    report.summary.rawEnemies !== 153 ||
    report.summary.overlayEnemies !== 153 ||
    !Number.isSafeInteger(report.summary.finalEnemies) ||
    report.summary.finalEnemies < 0
  )
    throw new Error(`R13-5 enemy disposition: summary 漂移 ${JSON.stringify(report.summary)}`)
  const { digest, ...withoutDigest } = report
  if (stableJsonSha256(withoutDigest) !== digest)
    throw new Error('R13-5 enemy disposition: digest 漂移')
  if (source) {
    const rebuilt = buildR13EnemySourceDisposition(source)
    if (stableJsonSha256(rebuilt) !== stableJsonSha256(report))
      throw new Error('R13-5 enemy disposition: source-backed rebuild 漂移')
  }
}

export function assertR13EnemySourceDispositionFromPal(
  report: R13EnemySourceDispositionV1,
  args: R13EnemySourceDispositionPalBuildArgs,
): void {
  const rebuilt = buildR13EnemySourceDispositionFromPal(args)
  assertR13EnemySourceDisposition(report)
  if (stableJsonSha256(rebuilt) !== stableJsonSha256(report))
    throw new Error('R13-5 enemy disposition: PAL source-backed rebuild 漂移')
}
