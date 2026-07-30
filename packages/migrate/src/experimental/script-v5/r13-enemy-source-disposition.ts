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

type HookSourceOwner = EnemyMigrationResult['report']['hookSources'][number]

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
  summary: {
    legacyDebtSites: number
    mandatoryNonPendingSites: number
    reviewerSilentSites: number
    totalSites: number
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

function hookRootSourceId(enemy: SourceEnemyObject, channel: EnemyHookChannel): string {
  const field = channel === 'ready' ? 'scriptOnReady' : 'scriptOnTurnStart'
  return `global/enemies/${enemy.objectIndex}/${field}`
}

function enemyHookEntries(enemyObjects: readonly SourceEnemyObject[]): SourceEntrySite[] {
  const entries: SourceEntrySite[] = []
  for (const enemy of enemyObjects)
    for (const [channel, entry] of [
      ['ready', enemy.scriptOnReady],
      ['turnStart', enemy.scriptOnTurnStart],
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
  }
  if (
    witnessedEntries.size !== entries.length ||
    [...entries].some((entry) => !witnessedEntries.has(entry.sourceId))
  )
    throw new Error('R13-5 enemy disposition: 52 个 hook root authority 漂移')
  return { census, closures }
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

function summaryOf(
  sites: readonly R13EnemySourceDispositionSite[],
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
  const summary = summaryOf(sites, {
    scriptedEnemies: args.enemyObjects.filter(
      (enemy) =>
        enemy.scriptOnReady > 0 || enemy.scriptOnTurnStart > 0 || enemy.scriptOnBattleEnd > 0,
    ).length,
    hookOwners: args.hookSources.length,
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
  const expectedSummary = summaryOf(report.sites, {
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
    report.summary.finalEnemies !== 153
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
