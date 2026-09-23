/**
 * TEST-BATTLE-WORKFLOWS-1 薄 fixture：session 驱动器。
 * 真实 `new BattleSession(...)` + 公开 `tick(dt, pressed, gameplayNow)` 驱动；观测只用公开
 * debugLog/debugReadiness/debugPlayers/done/writeBackHp/writeBackInventory/
 * writeBackPersistentEffects/cancel。不 mock BattleSession/battle-core/battle-anim；
 * 帧资源为真实 RleFrame（catalog.realFrame）。
 * 会话入口即生产 guard 门：每次构造对**实际消费**的敌/技能/物品/精灵/演员数据跑现行校验器
 * （含钩子改造后的敌定义）——非法数据在构造时 throw，不靠单独的样本合法测试兜底。
 */
import type { EnemyDef, WorldState } from '@type-pal/content'
import {
  buildWorld,
  validateActors,
  validateEnemies,
  validateItems,
  validateSkills,
} from '@type-pal/content'
import type { LoadedBattleSpriteDefinition } from '../../assets.js'
import type { CreatePlayerInput } from '../../battle/battle-core.js'
import { createBattlePlayers } from '../../battle/battle-player-input.js'
import type { BattleSessionAssets } from '../../battle/battle-session.js'
import { BattleSession } from '../../battle/battle-session.js'
import { enemyProfile, PLAYER_PROFILE, realFrame, wfActorDef } from './catalog.js'
import { stubGlyphs, stubPalette } from './controlled-io.js'

/** 真实帧数组的 LoadedBattleSpriteDefinition（无空对象帧/资源强转）。 */
export function wfLoadedBattleSprite(
  id: string,
  profile: ReturnType<typeof enemyProfile> | typeof PLAYER_PROFILE,
): LoadedBattleSpriteDefinition {
  return {
    definition: { id, label: id, asset: `asset.${id}`, profile },
    sprite: {
      frames: Array.from({ length: 11 }, () => realFrame()),
      anchorX: 0,
      anchorY: 0,
      profile: 'canonical',
      decode: { declaredSlots: 11, trailingSentinel: false, skippedLegacyTailSlots: 0 },
    },
  }
}

export interface WfSessionArgs {
  players: CreatePlayerInput[]
  enemies: Array<EnemyDef | null>
  /** 变身/召唤敌表（opts.enemiesById）；其精灵一并注入 assets。 */
  enemiesById?: Record<string, EnemyDef>
  extraOpts?: NonNullable<ConstructorParameters<typeof BattleSession>[5]>
}

export interface WfHarness {
  session: BattleSession
  assets: BattleSessionAssets
  /** 公开 tick 驱动一帧（无按键）。 */
  idle: (dtMs?: number) => void
  /** 公开 tick 驱动一帧按键集合。 */
  press: (keys: readonly string[], dtMs?: number) => void
  /** 公开 writeBackHp 读出当前会话 HP/MP（真实读出路径，非只看 log）。 */
  readParty: () => Array<{ id: string; hp: number; mp: number }>
}

/** 会话入口守卫：对本次实际消费的全部 fixture 数据跑现行生产校验器。 */
function assertWfSessionInputsLegal(args: WfSessionArgs): void {
  const enemyDefs = [...args.enemies, ...Object.values(args.enemiesById ?? {})].filter(
    (enemy): enemy is EnemyDef => enemy !== null,
  )
  validateEnemies(enemyDefs) // 含 ai.hooks（checkEnemyHookFlow）改造后的真实变体
  const opts = args.extraOpts
  if (opts?.skills && Object.keys(opts.skills).length)
    validateSkills({ skills: Object.values(opts.skills), levelUp: {} })
  if (opts?.items && Object.keys(opts.items).length) validateItems(Object.values(opts.items))
  if (opts?.enemiesById && Object.keys(opts.enemiesById).length)
    validateEnemies(Object.values(opts.enemiesById))
}

export function makeWfSession(args: WfSessionArgs): WfHarness {
  assertWfSessionInputsLegal(args)
  const playerSpriteId = 'battle-sprite.player'
  const spriteEntries = new Map<string, LoadedBattleSpriteDefinition>([
    [playerSpriteId, wfLoadedBattleSprite(playerSpriteId, PLAYER_PROFILE)],
  ])
  for (const enemy of args.enemies)
    if (enemy)
      spriteEntries.set(
        enemy.battleSprite,
        wfLoadedBattleSprite(enemy.battleSprite, enemyProfile(enemy.battleSprite)),
      )
  for (const enemy of Object.values(args.enemiesById ?? {}))
    spriteEntries.set(
      enemy.battleSprite,
      wfLoadedBattleSprite(enemy.battleSprite, enemyProfile(enemy.battleSprite)),
    )
  const assets: BattleSessionAssets = {
    palette: stubPalette,
    glyphs: stubGlyphs,
    battleSprites: spriteEntries,
    playerBaseDefinitionIds: Array.from({ length: args.players.length }, () => playerSpriteId),
  }
  const session = new BattleSession(
    args.players,
    args.enemies,
    assets,
    (id) => id,
    () => 0,
    args.enemiesById
      ? { ...(args.extraOpts ?? {}), enemiesById: args.enemiesById }
      : args.extraOpts,
  )
  const readParty = (): Array<{ id: string; hp: number; mp: number }> => {
    const party = args.players.map((player) => ({
      id: player.roleId,
      hp: player.hp,
      mp: player.mp,
    }))
    session.writeBackHp(party)
    return party
  }
  return {
    session,
    assets,
    idle: (dtMs = 16) => session.tick(dtMs, new Set<string>()),
    press: (keys, dtMs = 16) => session.tick(dtMs, new Set(keys)),
    readParty,
  }
}

/** 生产路径构造：buildWorld → createBattlePlayers（persistentProgress 等由真派生填充）。
 * worldPartyIds 允许世界队伍大于实际参战阵容（非目标保真正控）。 */
export function makeWfSessionFromWorld(args: {
  actorIds: readonly string[]
  worldPartyIds?: readonly string[]
  enemies: Array<EnemyDef | null>
  enemiesById?: Record<string, EnemyDef>
  initialMagic?: readonly string[]
  seedStats?: Record<string, { hp?: number; mp?: number }>
  worldMoney?: number
  extraOpts?: NonNullable<ConstructorParameters<typeof BattleSession>[5]>
}): { harness: WfHarness; world: WorldState } {
  const partyIds = args.worldPartyIds ?? args.actorIds
  const actors = Object.fromEntries(
    partyIds.map((id) => [
      id,
      wfActorDef(id, {
        initialMagic: args.actorIds.includes(id) ? [...(args.initialMagic ?? [])] : [],
      }),
    ]),
  )
  validateActors(Object.values(actors)) // 实际演员数据（含 initialMagic 真实播种）
  const world = buildWorld(
    {
      party: [...partyIds],
      money: args.worldMoney ?? 0,
      inventory: [],
      ...(args.seedStats ? { seedStats: args.seedStats } : {}),
    },
    actors,
  )
  const players = createBattlePlayers(world, { items: {}, actorsById: actors })
  const harness = makeWfSession({
    players: players.filter((player) => args.actorIds.includes(player.roleId)),
    enemies: args.enemies,
    enemiesById: args.enemiesById,
    extraOpts: args.extraOpts,
  })
  return { harness, world }
}

/** fixture 合法门：驱动器必须真实构造 BattleSession 且公共读出可用。 */
export function assertWfDriverFixtureLegal(): void {
  const h = makeWfSession({
    players: [
      {
        roleId: 'probe',
        actorTemplateId: 'probe',
        hp: 10,
        maxHp: 10,
        mp: 4,
        maxMp: 4,
        attackStrength: 5,
        defense: 5,
        magicStrength: 0,
        baseDexterity: 5,
        skills: [],
        fleeRate: 0,
      },
    ],
    enemies: [wfProbeEnemy()],
  })
  if (!(h.session instanceof BattleSession)) throw new Error('wf driver 未构造真实 BattleSession')
  if (typeof h.session.debugPlayers !== 'function') throw new Error('wf driver 公共观测缺失')
  const party = h.readParty()
  if (party[0]?.id !== 'probe') throw new Error('wf driver 公共 HP/MP 读出失效')
}

function wfProbeEnemy(): EnemyDef {
  return {
    id: 'probe-enemy',
    name: 'probe',
    battleSprite: 'battle-sprite.probe-enemy',
    yPosOffset: 0,
    stats: {
      health: 5,
      level: 1,
      exp: 0,
      cash: 0,
      attackStrength: 1,
      magicStrength: 0,
      defense: 1,
      dexterity: 1,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
}
