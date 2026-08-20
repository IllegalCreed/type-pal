import type {
  ActivePoison,
  AssetId,
  BattlerSounds,
  EnemyDef,
  ItemData,
  ManifestAssetConfig,
  PoisonDef,
  SceneDef,
  SkillData,
  SpriteDef,
} from '@type-pal/content'
import {
  collectCommandAssetReferences,
  resolveSkillExecution,
  SOUND_ASSET_ROLES,
  visitScriptRefs,
} from '@type-pal/content'
import type { BattleAction } from '../battle/battle-core.js'
import {
  collectReachableEnemyDefs,
  collectReachableEnemySkillIds,
} from '../battle/enemy-closure.js'
import type { ScriptResolver } from '../script-chunk-store.js'

function add(out: Set<AssetId>, asset: AssetId | undefined): void {
  if (asset) out.add(asset)
}

function addBattlerSounds(out: Set<AssetId>, sounds: BattlerSounds | undefined): void {
  if (!sounds) return
  add(out, sounds.attack)
  add(out, sounds.critical)
  add(out, sounds.weapon)
  add(out, sounds.magic)
  add(out, sounds.cover)
  add(out, sounds.dying)
  add(out, sounds.death)
}

function addSkillSounds(
  out: Set<AssetId>,
  skill: SkillData | undefined,
  side: 'player' | 'enemy',
): void {
  if (!skill) return
  const execution = resolveSkillExecution(skill, side)
  add(out, execution.animation.sound)
  for (const effect of execution.effects) if (effect.kind === 'summon') add(out, effect.sound)
}

function addItemSounds(out: Set<AssetId>, item: ItemData | undefined): void {
  add(out, item?.use?.sound)
  add(out, item?.throw?.sound)
  if (item?.throw?.presentation?.kind === 'magic') add(out, item.throw.presentation.animation.sound)
}

function addSpriteActionSounds(
  out: Set<AssetId>,
  spritesById: Readonly<Record<string, SpriteDef>> | undefined,
  spriteId: string,
  actionId: string,
  where: string,
): void {
  if (!spritesById) throw new Error(`SFX readiness ${where}: 无 sprites 注册表，无法解析动作音效`)
  const sprite = spritesById[spriteId]
  if (!sprite) throw new Error(`SFX readiness ${where}: SpriteDef "${spriteId}" 不存在`)
  const action = sprite.poses?.[actionId]
  if (!action) throw new Error(`SFX readiness ${where}: 动作 "${spriteId}/${actionId}" 不存在`)
  for (const step of action.steps)
    for (const cue of step.cues ?? []) if (cue.kind === 'sound') out.add(cue.asset)
}

/** 只找命令树中的语义动作引用；页默认 binding 由场景 collector 显式加入。 */
function collectActionCommandSounds(
  node: unknown,
  out: Set<AssetId>,
  spritesById: Readonly<Record<string, SpriteDef>> | undefined,
  where: string,
): void {
  const stack: unknown[] = [node]
  const seen = new WeakSet<object>()
  while (stack.length) {
    const current = stack.pop()
    if (!current || typeof current !== 'object') continue
    if (seen.has(current)) continue
    seen.add(current)
    if (!Array.isArray(current)) {
      const record = current as Record<string, unknown>
      if (
        record.kind === 'playEntityAction' &&
        typeof record.sprite === 'string' &&
        typeof record.action === 'string'
      )
        addSpriteActionSounds(out, spritesById, record.sprite, record.action, where)
      stack.push(...Object.values(record))
    } else stack.push(...current)
  }
}

/**
 * 收集命令树及其 ScriptRef 闭包中的音效。所有 lease 都在返回/抛错前释放；ref.id 是
 * 稳定身份，既用于环检测，也避免同一脚本因不同 chunk hint 被重复加载。
 */
export async function collectScriptSoundAssets(
  roots: readonly unknown[],
  resolver: ScriptResolver | undefined,
  signal: AbortSignal,
  spritesById?: Readonly<Record<string, SpriteDef>>,
): Promise<Set<AssetId>> {
  const sounds = new Set<AssetId>()
  const seen = new Set<string>()

  const visit = async (node: unknown, where: string): Promise<void> => {
    for (const reference of collectCommandAssetReferences(node, where))
      if (reference.expectedKind === 'sound') sounds.add(reference.asset)
    collectActionCommandSounds(node, sounds, spritesById, where)

    const refs: import('@type-pal/content').ScriptRef[] = []
    visitScriptRefs(node, (ref) => refs.push(ref))
    for (const ref of refs) {
      if (seen.has(ref.id)) continue
      seen.add(ref.id)
      if (!resolver)
        throw new Error(`SFX readiness 无 ScriptResolver，无法解析 ScriptRef "${ref.id}"`)
      const resolved = await resolver.resolve(ref, signal)
      try {
        await visit(resolved.body, `script:${resolved.ref.id}`)
      } finally {
        resolved.release()
      }
    }
  }

  for (const [index, root] of roots.entries()) await visit(root, `root[${index}]`)
  return sounds
}

export async function collectSceneSoundAssets(input: {
  scene: SceneDef
  /** 存档中的场景脚本覆写等动态命令根。 */
  additionalRoots?: readonly unknown[]
  inventoryItems?: readonly ItemData[]
  spritesById?: Readonly<Record<string, SpriteDef>>
  resolver?: ScriptResolver
  signal: AbortSignal
}): Promise<Set<AssetId>> {
  const sounds = await collectScriptSoundAssets(
    [input.scene, ...(input.additionalRoots ?? [])],
    input.resolver,
    input.signal,
    input.spritesById,
  )
  for (const entity of input.scene.entities) {
    const binding = entity.pages?.[0]?.animation
    if (binding)
      addSpriteActionSounds(
        sounds,
        input.spritesById,
        binding.sprite,
        binding.action,
        `scene:${input.scene.id}:entity:${entity.id}:pages[0].animation`,
      )
  }
  for (const item of input.inventoryItems ?? []) addItemSounds(sounds, item)
  return sounds
}

export type PoisonSoundSide = 'player' | 'enemy'

interface BattleSoundTables {
  skills: Readonly<Record<string, SkillData>>
  itemsById: Readonly<Record<string, ItemData>>
  poisonDefs?: Readonly<Record<number, PoisonDef>>
}

export interface BattleBaseSoundInput extends BattleSoundTables {
  playerSounds: readonly (BattlerSounds | undefined)[]
  cooperativeSkillIds?: readonly string[]
  enemyDefs: readonly EnemyDef[]
  enemiesById: Readonly<Record<string, EnemyDef>>
  /** 敌人偷取所得可在后续回合使用；只补本场敌闭包可获得的物品，不扫描全项目。 */
  /** 进战时已在敌我身上的毒；两侧 tick 表不同，身份不得只用 poisonId。 */
  activePlayerPoisons?: readonly ActivePoison[]
  activeEnemyPoisons?: readonly ActivePoison[]
  roles: ManifestAssetConfig['roles']
  encounterChoreography?: readonly unknown[]
  resolver?: ScriptResolver
  signal: AbortSignal
}

export interface TurnActionSoundInput extends BattleSoundTables {
  pendingActions: Iterable<BattleAction>
  activePlayerPoisons?: readonly ActivePoison[]
  activeEnemyPoisons?: readonly ActivePoison[]
}

interface PoisonSeed {
  side: PoisonSoundSide
  poisonId: number
  tickIndex: number
}

/** base/turn 共用一套 poison→grantItem→item→poison walker，避免两级闭包语义分叉。 */
class BattleSoundClosure {
  readonly sounds = new Set<AssetId>()
  private readonly poisonStarts = new Map<string, PoisonSeed>()
  private readonly poisonQueue: string[] = []
  private readonly processedStarts = new Map<string, number>()

  constructor(private readonly tables: BattleSoundTables) {}

  enqueuePoison(side: PoisonSoundSide, poisonId: string | number, tickIndex = 0): void {
    const id = Number(poisonId)
    if (!Number.isInteger(id)) return
    const start = Math.max(0, Math.floor(tickIndex))
    const key = `${side}:${id}`
    const previous = this.poisonStarts.get(key)
    if (previous && previous.tickIndex <= start) return
    this.poisonStarts.set(key, { side, poisonId: id, tickIndex: start })
    this.poisonQueue.push(key)
  }

  includeSkill(
    skill: SkillData | undefined,
    executionSide: 'player' | 'enemy',
    poisonSide?: PoisonSoundSide,
  ): void {
    addSkillSounds(this.sounds, skill, executionSide)
    if (!poisonSide) return
    for (const effect of skill ? resolveSkillExecution(skill, executionSide).effects : [])
      if (effect.kind === 'applyPoison') this.enqueuePoison(poisonSide, effect.poisonId)
  }

  includeItemAbility(
    item: ItemData | undefined,
    ability: 'use' | 'throw',
    poisonSide: PoisonSoundSide,
    includeSound = true,
  ): void {
    const capability = item?.[ability]
    if (!capability) return
    if (includeSound) add(this.sounds, capability.sound)
    if (includeSound && ability === 'throw' && item?.throw?.presentation?.kind === 'magic')
      add(this.sounds, item.throw.presentation.animation.sound)
    for (const effect of capability.effects)
      if (effect.kind === 'applyPoison') this.enqueuePoison(poisonSide, effect.poisonId)
  }

  /** 获得物品后可能选择 use 或 throw；两条能力的施毒目标侧不同，必须分开走。 */
  includeReachableItem(item: ItemData | undefined, includeSounds = true): void {
    this.includeItemAbility(item, 'use', 'player', includeSounds)
    this.includeItemAbility(item, 'throw', 'enemy', includeSounds)
  }

  drainPoisons(): void {
    while (this.poisonQueue.length) {
      const key = this.poisonQueue.shift()
      if (!key) continue
      const seed = this.poisonStarts.get(key)
      if (!seed) continue
      const processed = this.processedStarts.get(key)
      if (processed !== undefined && processed <= seed.tickIndex) continue
      this.processedStarts.set(key, seed.tickIndex)
      const def = this.tables.poisonDefs?.[seed.poisonId]
      const ticks = seed.side === 'player' ? (def?.playerTicks ?? []) : (def?.enemyTicks ?? [])
      // core 到达末 tick 后会重复末项；超长 tickIndex 仍须保留末项可达声音。
      const from = Math.min(seed.tickIndex, Math.max(0, ticks.length - 1))
      for (let index = from; index < ticks.length; index++) {
        const itemId = ticks[index]?.grantItem
        if (itemId) this.includeReachableItem(this.tables.itemsById[itemId])
      }
    }
  }
}

function playerSkillPoisonSide(skill: SkillData | undefined): PoisonSoundSide | undefined {
  return skill?.target === 'oneEnemy' || skill?.target === 'allEnemies' ? 'enemy' : undefined
}

/**
 * 战斗第一屏障：只收固定队员音、合击、敌 BFS/AI、roles、双侧活跃毒和遭遇脚本；
 * 普通已学技能与整包背包刻意不在这里，避免作者规模绑定进战工作集。
 */
export async function collectBattleBaseSounds(input: BattleBaseSoundInput): Promise<Set<AssetId>> {
  const closure = new BattleSoundClosure(input)
  for (const player of input.playerSounds) addBattlerSounds(closure.sounds, player)
  for (const skillId of input.cooperativeSkillIds ?? []) {
    const skill = input.skills[skillId]
    closure.includeSkill(skill, 'player', playerSkillPoisonSide(skill))
  }
  for (const poison of input.activePlayerPoisons ?? [])
    closure.enqueuePoison('player', poison.poisonId, poison.tickIndex)
  for (const poison of input.activeEnemyPoisons ?? [])
    closure.enqueuePoison('enemy', poison.poisonId, poison.tickIndex)
  for (const role of Object.keys(SOUND_ASSET_ROLES) as Array<keyof typeof SOUND_ASSET_ROLES>)
    add(closure.sounds, input.roles[role])

  const scriptRoots: unknown[] = [...(input.encounterChoreography ?? [])]
  const reachableEnemyDefs = collectReachableEnemyDefs(input.enemyDefs, input.enemiesById)
  for (const enemy of reachableEnemyDefs) {
    add(closure.sounds, enemy.sounds.attack)
    add(closure.sounds, enemy.sounds.action)
    add(closure.sounds, enemy.sounds.magic)
    add(closure.sounds, enemy.sounds.death)
    add(closure.sounds, enemy.sounds.call)
    closure.includeReachableItem(enemy.steal ? input.itemsById[enemy.steal.itemId] : undefined)
    // 敌普攻附带道具只执行 use.effects，且不播放该物品自身声音。
    closure.includeItemAbility(
      enemy.attackEquivItem ? input.itemsById[enemy.attackEquivItem.itemId] : undefined,
      'use',
      'player',
      false,
    )
    scriptRoots.push(enemy.choreography, enemy.onDefeated, enemy.ai.hooks)
  }
  for (const skillId of collectReachableEnemySkillIds(input.enemyDefs, input.enemiesById)) {
    const skill = input.skills[skillId]
    // enemy oneEnemy/allEnemies 反转作用于玩家；其他目标的 applyPoison 在 core 中无目标。
    closure.includeSkill(
      skill,
      'enemy',
      skill?.target === 'oneEnemy' || skill?.target === 'allEnemies' ? 'player' : undefined,
    )
  }

  closure.drainPoisons()

  const scripted = await collectScriptSoundAssets(scriptRoots, input.resolver, input.signal)
  for (const asset of scripted) closure.sounds.add(asset)
  return closure.sounds
}

/** 战斗第二屏障：只收本轮实际提交动作与敌我当前活跃毒；battleBase 由调用方并集后 prepare。 */
export function collectTurnActionSounds(input: TurnActionSoundInput): Set<AssetId> {
  const closure = new BattleSoundClosure(input)
  for (const action of input.pendingActions) {
    switch (action.kind) {
      case 'cast': {
        const skill = input.skills[action.skillId]
        closure.includeSkill(skill, 'player', playerSkillPoisonSide(skill))
        break
      }
      case 'item':
        closure.includeItemAbility(input.itemsById[action.itemId], 'use', 'player')
        break
      case 'throw':
        closure.includeItemAbility(input.itemsById[action.itemId], 'throw', 'enemy')
        break
      // 合击音/毒链已在 battleBase；attack/flee 固定音也由 battler/roles 保证。
      case 'coop':
      case 'attack':
      case 'defend':
      case 'flee':
        break
    }
  }
  for (const poison of input.activePlayerPoisons ?? [])
    closure.enqueuePoison('player', poison.poisonId, poison.tickIndex)
  for (const poison of input.activeEnemyPoisons ?? [])
    closure.enqueuePoison('enemy', poison.poisonId, poison.tickIndex)
  closure.drainPoisons()
  return closure.sounds
}
