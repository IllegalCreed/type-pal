/**
 * TEST-BATTLE-WORKFLOWS-1 薄 fixture：session 驱动器。
 * 真实 `new BattleSession(...)` + 公开 `tick(dt, pressed, gameplayNow)` 驱动；观测只用公开
 * debugLog/debugReadiness/debugPlayers/done/render 缺省 headless。不 mock
 * BattleSession/battle-core/battle-anim；渲染资产替身仅代 LoadedBattleSpriteDefinition 帧。
 */
import type { EnemyDef } from '@type-pal/content'
import type { CreatePlayerInput } from '../../battle-core.js'
import { BattleSession } from '../../battle-session.js'
import type { BattleSessionAssets } from '../../battle-session.js'
import type { LoadedBattleSpriteDefinition } from '../../../assets.js'
import { PLAYER_PROFILE, enemyProfile } from './catalog.js'
import { stubGlyphs, stubPalette } from './controlled-io.js'

function loadedBattleSprite(
  id: string,
  profile: ReturnType<typeof enemyProfile> | typeof PLAYER_PROFILE,
): LoadedBattleSpriteDefinition {
  return {
    definition: { id, label: id, asset: `asset.${id}`, profile },
    sprite: {
      frames: Array.from({ length: 11 }, () => ({})),
      anchorX: 0,
      anchorY: 0,
      profile: 'canonical',
      decode: { declaredSlots: 11, trailingSentinel: false, skippedLegacyTailSlots: 0 },
    },
  } as unknown as LoadedBattleSpriteDefinition
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
}

export function makeWfSession(args: WfSessionArgs): WfHarness {
  const playerSpriteId = 'battle-sprite.player'
  const spriteEntries = new Map<string, LoadedBattleSpriteDefinition>([
    [playerSpriteId, loadedBattleSprite(playerSpriteId, PLAYER_PROFILE)],
  ])
  for (const enemy of args.enemies)
    if (enemy)
      spriteEntries.set(
        enemy.battleSprite,
        loadedBattleSprite(enemy.battleSprite, enemyProfile(enemy.battleSprite)),
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
    (_id: string) => _id,
    () => 0,
    args.extraOpts,
  )
  return {
    session,
    assets,
    idle: (dtMs = 16) => session.tick(dtMs, new Set<string>()),
    press: (keys, dtMs = 16) => session.tick(dtMs, new Set(keys)),
  }
}

/** 空格确认两下（菜单默认攻击 → 选敌确认）后空跑 acting 帧——与旧 driveOneRound 同型。 */
export function driveOneRound(h: WfHarness, actingTicks = 12): void {
  h.press([' '])
  h.press([' '])
  for (let i = 0; i < actingTicks; i += 1) h.idle(500)
}

/** fixture 合法门：驱动器必须真实构造 BattleSession（防将来被改成 mock 壳）。 */
export function assertWfDriverFixtureLegal(): void {
  const h = makeWfSession({
    players: [
      {
        roleId: 'probe',
        actorTemplateId: 'probe',
        hp: 10,
        maxHp: 10,
        mp: 0,
        maxMp: 0,
        attackStrength: 5,
        defense: 5,
        magicStrength: 0,
        baseDexterity: 5,
        skills: [],
        fleeRate: 0,
      },
    ],
    enemies: [
      {
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
      },
    ],
  })
  if (!(h.session instanceof BattleSession)) throw new Error('wf driver 未构造真实 BattleSession')
  if (typeof h.session.debugPlayers !== 'function') throw new Error('wf driver 公共观测缺失')
}
