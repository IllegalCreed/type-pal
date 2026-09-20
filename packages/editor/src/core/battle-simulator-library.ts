/** Editor-only named presets. Runtime receives a resolved BattleTrialConfig, never this registry. */
import type { AssetCatalogV1, CurrentManifest, MapIndexV1, SceneIndexV1 } from '@type-pal/content'
import {
  type BattleTrialConfig,
  type FileSource,
  parseBattleTrialConfig,
  parseTrialBag,
  parseTrialEnemies,
  parseTrialParty,
  type TrialBag,
  type TrialEnemies,
  type TrialParty,
  trialArray,
  trialId,
  trialObject,
} from '@type-pal/reforge'

export const BATTLE_SIMULATOR_PATH = 'editor/battle-simulator.json'
/** The sidecar must not alias any declared author file or catalog resource, even before first use. */
export function assertBattleSimulatorPathAvailable(project: {
  manifest: CurrentManifest
  mapIndex: MapIndexV1
  sceneIndex: SceneIndexV1
  assetCatalog: AssetCatalogV1
}): void {
  const paths = [
    project.manifest.assets.catalog,
    ...Object.entries(project.manifest.content).flatMap(([key, path]) =>
      typeof path === 'string'
        ? [key === 'scenes' ? `${path.replace(/\/?$/, '/')}index.json` : path]
        : [],
    ),
    ...project.mapIndex.maps.map((entry) => entry.path),
    ...project.sceneIndex.scenes.map((entry) => entry.path),
    ...Object.values(project.assetCatalog.assets).map((entry) => entry.path),
  ]
  for (const path of paths) {
    const key = path.toLowerCase()
    if (
      key === BATTLE_SIMULATOR_PATH ||
      key.startsWith(`${BATTLE_SIMULATOR_PATH}/`) ||
      BATTLE_SIMULATOR_PATH.startsWith(`${key}/`)
    )
      throw new Error(`战斗模拟器保留路径冲突：${BATTLE_SIMULATOR_PATH} 与 ${path}`)
  }
}
export interface TrialPreset<T> {
  id: string
  name: string
  description: string
  config: T
}
export type TrialSource<T> = { kind: 'preset'; presetId: string } | { kind: 'inline'; config: T }
export interface TrialPlan extends Omit<BattleTrialConfig, 'party' | 'enemies' | 'bag'> {
  party: TrialSource<TrialParty>
  enemies: TrialSource<TrialEnemies>
  bag: TrialSource<TrialBag>
  /** Explicit whole-section replacements. Referenced presets remain untouched. */
  overrides: { party?: TrialParty; enemies?: TrialEnemies; bag?: TrialBag }
}
export interface BattleSimulatorLibrary {
  kind: 'type-pal-battle-simulator'
  version: 1
  allies: TrialPreset<TrialParty>[]
  enemies: TrialPreset<TrialEnemies>[]
  bags: TrialPreset<TrialBag>[]
  plans: TrialPreset<TrialPlan>[]
}
export function emptyBattleSimulatorLibrary(): BattleSimulatorLibrary {
  return {
    kind: 'type-pal-battle-simulator',
    version: 1,
    allies: [],
    enemies: [],
    bags: [],
    plans: [],
  }
}
export function isBattleSimulatorEmpty(library: BattleSimulatorLibrary): boolean {
  return (
    !library.allies.length &&
    !library.enemies.length &&
    !library.bags.length &&
    !library.plans.length
  )
}
/** Explicit removals also cover the first save after reopening, when no output diff exists yet. */
export function battleSimulatorRemovalPaths(library: BattleSimulatorLibrary | undefined): string[] {
  return library === undefined || isBattleSimulatorEmpty(parseBattleSimulatorLibrary(library))
    ? [BATTLE_SIMULATOR_PATH]
    : []
}
function source<T>(
  value: unknown,
  parse: (v: unknown, where: string) => T,
  where: string,
): TrialSource<T> {
  const v = trialObject(value, ['kind', 'presetId', 'config'], where)
  if (v.kind === 'preset') {
    trialObject(v, ['kind', 'presetId'], where)
    return { kind: 'preset', presetId: trialId(v.presetId, `${where}.presetId`) }
  }
  if (v.kind !== 'inline') throw new Error(`${where}.kind: 无效配置来源`)
  trialObject(v, ['kind', 'config'], where)
  return { kind: 'inline', config: parse(v.config, `${where}.config`) }
}
function parsePlan(value: unknown, where: string): TrialPlan {
  const v = trialObject(
    value,
    ['party', 'enemies', 'bag', 'fieldId', 'music', 'money', 'auto', 'boss', 'overrides'],
    where,
  )
  const party = source(v.party, parseTrialParty, `${where}.party`)
  const enemies = source(v.enemies, parseTrialEnemies, `${where}.enemies`)
  const bag = source(v.bag, parseTrialBag, `${where}.bag`)
  const overrides = trialObject(v.overrides, ['party', 'enemies', 'bag'], `${where}.overrides`)
  const parsedOverrides: TrialPlan['overrides'] = {}
  if (Object.hasOwn(overrides, 'party'))
    parsedOverrides.party = parseTrialParty(overrides.party, `${where}.overrides.party`)
  if (Object.hasOwn(overrides, 'enemies'))
    parsedOverrides.enemies = parseTrialEnemies(overrides.enemies, `${where}.overrides.enemies`)
  if (Object.hasOwn(overrides, 'bag'))
    parsedOverrides.bag = parseTrialBag(overrides.bag, `${where}.overrides.bag`)
  const settings = parseBattleTrialConfig(
    {
      party: { members: [] },
      enemies: { kind: 'slots', slots: [null, null, null, null, null] },
      bag: { items: [] },
      fieldId: v.fieldId,
      music: v.music,
      money: v.money,
      auto: v.auto,
      boss: v.boss,
    },
    where,
  )
  return { ...settings, party, enemies, bag, overrides: parsedOverrides }
}
function records<T>(
  value: unknown,
  parse: (v: unknown, where: string) => T,
  where: string,
): TrialPreset<T>[] {
  const seen = new Set<string>()
  return trialArray(value, where).map((entry, i) => {
    const at = `${where}[${i}]`
    const v = trialObject(entry, ['id', 'name', 'description', 'config'], at)
    const id = trialId(v.id, `${at}.id`)
    if (seen.has(id)) throw new Error(`${at}.id: 重复预设ID ${id}`)
    seen.add(id)
    if (typeof v.name !== 'string' || !v.name.trim()) throw new Error(`${at}.name: 名称不能为空`)
    if (typeof v.description !== 'string') throw new Error(`${at}.description: 期望说明文本`)
    return { id, name: v.name, description: v.description, config: parse(v.config, `${at}.config`) }
  })
}
/** Parse and detach every nested mutable value. Missing references are diagnosed separately. */
export function parseBattleSimulatorLibrary(value: unknown): BattleSimulatorLibrary {
  const v = trialObject(
    value,
    ['kind', 'version', 'allies', 'enemies', 'bags', 'plans'],
    BATTLE_SIMULATOR_PATH,
  )
  if (v.kind !== 'type-pal-battle-simulator' || v.version !== 1)
    throw new Error(`${BATTLE_SIMULATOR_PATH}: 仅支持当前kind/type-pal-battle-simulator与version/1`)
  return {
    kind: 'type-pal-battle-simulator',
    version: 1,
    allies: records(v.allies, parseTrialParty, 'allies'),
    enemies: records(v.enemies, parseTrialEnemies, 'enemies'),
    bags: records(v.bags, parseTrialBag, 'bags'),
    plans: records(v.plans, parsePlan, 'plans'),
  }
}
export class BattleSimulatorDocumentError extends Error {
  constructor(cause: unknown) {
    super(
      `战斗模拟器配置 ${BATTLE_SIMULATOR_PATH} 无效或无法读取，请修复后重新打开项目：${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    )
    this.name = 'BattleSimulatorDocumentError'
  }
}
export async function loadBattleSimulatorDocument(
  source: FileSource,
): Promise<{ library: BattleSimulatorLibrary; bytes: ArrayBuffer } | undefined> {
  let bytes: ArrayBuffer
  try {
    bytes = await source.readBytes(BATTLE_SIMULATOR_PATH)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return undefined
    throw new BattleSimulatorDocumentError(error)
  }
  try {
    return {
      library: parseBattleSimulatorLibrary(
        JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
      ),
      bytes,
    }
  } catch (error) {
    throw new BattleSimulatorDocumentError(error)
  }
}
export async function loadBattleSimulatorLibrary(
  source: FileSource,
): Promise<BattleSimulatorLibrary | undefined> {
  return (await loadBattleSimulatorDocument(source))?.library
}
/** Resolve into a fresh value; even overridden dangling preset references must be repaired. */
export function resolveBattleSimulatorPlan(
  library: BattleSimulatorLibrary,
  id: string,
): BattleTrialConfig {
  const parsed = parseBattleSimulatorLibrary(library)
  const plan = parsed.plans.find((entry) => entry.id === id)?.config
  if (!plan) throw new Error(`试打方案不存在：${id}`)
  function resolve<T>(value: TrialSource<T>, presets: TrialPreset<T>[], label: string): T {
    if (value.kind === 'inline') return value.config
    const found = presets.find((entry) => entry.id === value.presetId)
    if (!found) throw new Error(`${label}预设不存在：${value.presetId}`)
    return found.config
  }
  const party = resolve(plan.party, parsed.allies, '我方')
  const enemies = resolve(plan.enemies, parsed.enemies, '敌方')
  const bag = resolve(plan.bag, parsed.bags, '背包')
  return parseBattleTrialConfig({
    party: plan.overrides.party ?? party,
    enemies: plan.overrides.enemies ?? enemies,
    bag: plan.overrides.bag ?? bag,
    fieldId: plan.fieldId,
    music: plan.music,
    money: plan.money,
    auto: plan.auto,
    boss: plan.boss,
  })
}
