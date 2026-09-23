/**
 * TEST-BATTLE-WORKFLOWS-1 薄 fixture：session 驱动器。
 * 真实 `new BattleSession(...)` + 公开 `tick(dt, pressed, gameplayNow)` 驱动；观测只用公开
 * debugLog/debugReadiness/debugPlayers/done/writeBackHp/writeBackInventory/
 * writeBackPersistentEffects/cancel。不 mock BattleSession/battle-core/battle-anim；
 * 帧资源为真实 RleFrame（catalog.realFrame）。
 */
import type { EnemyDef, WorldState } from '@type-pal/content'
import { buildWorld } from '@type-pal/content'
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

export function makeWfSession(args: WfSessionArgs): WfHarness {
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
    args.extraOpts,
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

/** 生产路径构造：buildWorld → createBattlePlayers（persistentProgress 等由真派生填充）。 */
export function makeWfSessionFromWorld(args: {
  actorIds: readonly string[]
  enemies: Array<EnemyDef | null>
  initialMagic?: readonly string[]
  seedStats?: Record<string, { hp?: number; mp?: number }>
  extraOpts?: NonNullable<ConstructorParameters<typeof BattleSession>[5]>
}): { harness: WfHarness; world: WorldState } {
  const actors = Object.fromEntries(
    args.actorIds.map((id) => [
      id,
      wfActorDef(id, { initialMagic: [...(args.initialMagic ?? [])] }),
    ]),
  )
  const world = buildWorld(
    {
      party: [...args.actorIds],
      money: 0,
      inventory: [],
      ...(args.seedStats ? { seedStats: args.seedStats } : {}),
    },
    actors,
  )
  const players = createBattlePlayers(world, { items: {}, actorsById: actors })
  const harness = makeWfSession({ players, enemies: args.enemies, extraOpts: args.extraOpts })
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
