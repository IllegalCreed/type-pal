import type { AssetId, RuntimeSceneDef, WorldScriptState, WorldState } from '@type-pal/content'
import { asyncIntentAbortError } from './async-intent.js'
import { captureRuntimeSceneBehaviorDependencies } from './runtime-project-view.js'

export interface SceneActorSpriteOverride {
  def: { id: string; asset: AssetId }
}

export interface SceneSwitchDependencies {
  sceneId: string
  mapOverride: string | null
  party: Array<{
    template: string
    spriteId: string | null
    equipment: Array<[string, string]>
  }>
  followers: string[]
  inventory: Array<[string, number]>
  behavior: ReturnType<typeof captureRuntimeSceneBehaviorDependencies>
  actorOverrides: Array<[string, string | null, AssetId | null]>
}

function sortedEquipment(equipment: Readonly<Record<string, string>>): Array<[string, string]> {
  return Object.entries(equipment).sort(([left], [right]) => left.localeCompare(right))
}

/**
 * 冻结场景预检实际消费的可变世界依赖。无关的金钱/flags 变化不应取消切场景；队伍、装备、
 * inventory、编外跟随者、目标场景脚本/阶段、底图覆写和临时角色换装必须全部参与。
 */
export function captureSceneSwitchDependencies(
  world: WorldState,
  script: WorldScriptState,
  scene: RuntimeSceneDef,
  actorOverrides: ReadonlyMap<string, SceneActorSpriteOverride>,
  useActorOverrides: boolean,
): SceneSwitchDependencies {
  const party = world.party.map((character) => ({
    template: character.template,
    spriteId: character.appearance?.spriteId ?? null,
    equipment: sortedEquipment(character.equipment),
  }))
  const maps = script.mapOverride
  return {
    sceneId: scene.id,
    mapOverride: maps && Object.hasOwn(maps, scene.id) ? (maps[scene.id] ?? null) : null,
    party,
    followers: [...(script.followers ?? [])],
    inventory: world.inventory
      .map<[string, number]>(({ itemId, count }) => [itemId, count])
      .sort(([leftId, leftCount], [rightId, rightCount]) =>
        leftId === rightId ? leftCount - rightCount : leftId.localeCompare(rightId),
      ),
    behavior: captureRuntimeSceneBehaviorDependencies(scene, script),
    actorOverrides: useActorOverrides
      ? party.map(({ template }) => {
          const override = actorOverrides.get(template)
          return [template, override?.def.id ?? null, override?.def.asset ?? null]
        })
      : [],
  }
}

export function sceneSwitchDependenciesEqual(
  left: SceneSwitchDependencies,
  right: SceneSwitchDependencies,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function assertSceneSwitchDependenciesCurrent(
  expected: SceneSwitchDependencies,
  actual: SceneSwitchDependencies,
  message: string,
): void {
  if (!sceneSwitchDependenciesEqual(expected, actual)) throw asyncIntentAbortError(message)
}

export interface SceneSwitchTransactionHooks<TPlan> {
  prepare(): Promise<TPlan>
  assertCurrent(plan: TPlan): void
  present(plan: TPlan): Promise<void>
  commit(plan: TPlan): void
  shouldCleanup(): boolean
  cleanup(): void
}

/**
 * 预检结束与呈现结束后各核一次请求身份；只有仍属当前请求的方案才同步提交。
 * 出错时由宿主判断呈现归属，避免旧请求的收尾清掉接管后的画面。
 */
export async function prepareAndCommitSceneSwitch<TPlan>(
  hooks: SceneSwitchTransactionHooks<TPlan>,
): Promise<TPlan> {
  try {
    const plan = await hooks.prepare()
    hooks.assertCurrent(plan)
    await hooks.present(plan)
    hooks.assertCurrent(plan)
    hooks.commit(plan)
    return plan
  } catch (error) {
    if (hooks.shouldCleanup()) hooks.cleanup()
    throw error
  }
}
