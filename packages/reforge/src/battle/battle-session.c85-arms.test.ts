// TEST-COVERAGE85-GLM-REFORGE-1 — battle-session.ts 合同区间残留分支臂测试。
// 公开 BattleSession 构造器 + tick 驱动;typed 资产 fixture(零 cast);
// 断言业务状态/日志/宿主回调而非内部调用次数。
import type {
  BattleSpriteDef,
  EnemyBattleSpriteProfile,
  EnemyDef,
  LevelGrowthDelta,
  PlayerFighterBattleSpriteProfile,
} from '@type-pal/content'
import type { RleFrame } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import type { GlyphTable, LoadedBattleSpriteDefinition } from '../assets.js'
import { BattleSession, type BattleSessionAssets } from './battle-session.js'

function mkEnemy(id: string, o: Partial<EnemyDef['stats']> = {}): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: `battle-sprite.${id}`,
    yPosOffset: 0,
    stats: {
      health: 300,
      level: 1,
      exp: 5,
      cash: 3,
      attackStrength: 5,
      magicStrength: 0,
      defense: 100,
      dexterity: 10,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...o,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {},
  }
}

interface PlayerSeed {
  roleId: string
  hp: number
  maxHp: number
  puppet?: number
}

const seed = (roleId: string, hp: number, maxHp = 100, puppet = 0): PlayerSeed => ({
  roleId,
  hp,
  maxHp,
  puppet,
})

const stubGlyphs: GlyphTable = { has: () => false, get: () => undefined }

const PLAYER_PROFILE: PlayerFighterBattleSpriteProfile = {
  kind: 'player-fighter',
  frames: {
    idle: 0,
    dying: 1,
    dead: 2,
    defend: 3,
    hurt: 4,
    preMagic: 5,
    magic: 6,
    attackWindup: 7,
    attackRush: 8,
    attackStrike: 9,
    steal: 10,
  },
  castEffectBase: -1,
  attackEffectBase: -1,
}

function enemyProfile(): EnemyBattleSpriteProfile {
  return {
    kind: 'enemy',
    idle: { start: 0, count: 2 },
    magic: { start: 2, count: 0 },
    attack: { start: 2, count: 2 },
    idleTicksPerFrame: 5,
    actTicksPerFrame: 1,
  }
}

function frameStub(): RleFrame {
  return {
    width: 2,
    height: 2,
    pixels: new Uint8Array(4),
    opaque: new Uint8Array(4),
  }
}

function loadedBattleSprite(
  id: string,
  profile: BattleSpriteDef['profile'],
): LoadedBattleSpriteDefinition {
  return {
    definition: { id, label: id, asset: `asset.${id}`, profile },
    sprite: {
      frames: Array.from({ length: 11 }, frameStub),
      anchorX: 1,
      anchorY: 2,
      profile: 'canonical',
      decode: { declaredSlots: 11, trailingSentinel: false, skippedLegacyTailSlots: 0 },
    },
  }
}

function makeAssets(
  enemies: readonly EnemyDef[],
  playerCount: number,
  playerIds?: string[],
  registerPlayerIds = true,
): Pick<BattleSessionAssets, 'battleSprites' | 'playerBaseDefinitionIds'> {
  const ids = playerIds ?? Array.from({ length: playerCount }, () => 'battle-sprite.player')
  const entries: Array<[string, LoadedBattleSpriteDefinition]> = []
  const seen = new Set<string>()
  if (registerPlayerIds)
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      entries.push([id, loadedBattleSprite(id, PLAYER_PROFILE)])
    }
  for (const enemy of enemies) {
    if (seen.has(enemy.battleSprite)) continue
    seen.add(enemy.battleSprite)
    entries.push([enemy.battleSprite, loadedBattleSprite(enemy.battleSprite, enemyProfile())])
  }
  return { battleSprites: new Map(entries), playerBaseDefinitionIds: ids }
}

type SessionOpts = NonNullable<ConstructorParameters<typeof BattleSession>[5]>

function makeSession(
  players: readonly PlayerSeed[],
  enemy: EnemyDef,
  opts: SessionOpts = {},
  playerIds?: string[],
  registerPlayerIds = true,
): BattleSession {
  const assets: BattleSessionAssets = {
    palette: { colors: [], cycles: [] },
    glyphs: stubGlyphs,
    ...makeAssets([enemy], players.length, playerIds, registerPlayerIds),
  }
  return new BattleSession(
    players.map((p) => ({
      roleId: p.roleId,
      actorTemplateId: p.roleId,
      hp: p.hp,
      maxHp: p.maxHp,
      mp: 30,
      maxMp: 30,
      attackStrength: 0,
      defense: 30,
      magicStrength: 20,
      baseDexterity: 50,
      skills: [],
      fleeRate: 20,
      ...(p.puppet ? { initialStatuses: { puppet: p.puppet } } : {}),
    })),
    [enemy],
    assets,
    (id) => id,
    () => 0,
    opts,
  )
}

/** 空转 tick 直到指定毫秒累计(演出队列推进)。 */
function idle(session: BattleSession, ms: number, step = 100): void {
  for (let t = 0; t < ms; t += step) session.tick(step, new Set())
}

describe('C85 战斗演出动作臂', () => {
  test('stopMusic 定时臂:fadeMs>0 入排程,越时后原 serial 停曲', () => {
    const stops: number[] = []
    const session = makeSession([seed('li', 100)], mkEnemy('boss'), {
      encounterChoreo: [{ at: 'battleStart', body: [{ kind: 'stopMusic', fadeMs: 300 }] }],
      stopMusic: () => stops.push(1),
    })
    session.tick(16, new Set())
    expect(stops).toEqual([]) // 排程未到
    idle(session, 600)
    expect(stops).toEqual([1])
  })

  test('stopMusic 即时臂:fadeMs 缺省 0 当拍停曲', () => {
    const stops: number[] = []
    const session = makeSession([seed('li', 100)], mkEnemy('boss'), {
      encounterChoreo: [{ at: 'battleStart', body: [{ kind: 'stopMusic' }] }],
      stopMusic: () => stops.push(1),
    })
    session.tick(16, new Set())
    expect(stops).toEqual([1])
  })

  test('排程失效臂:排程后的 cancel 使 serial 失配,越时不再停曲', async () => {
    const stops: number[] = []
    const session = makeSession([seed('li', 100)], mkEnemy('boss'), {
      encounterChoreo: [{ at: 'battleStart', body: [{ kind: 'stopMusic', fadeMs: 300 }] }],
      stopMusic: () => stops.push(1),
    })
    session.tick(16, new Set())
    expect(stops).toEqual([])
    session.cancel()
    await expect(session.done).rejects.toMatchObject({ name: 'AbortError' })
    idle(session, 600)
    expect(stops).toEqual([])
  })

  test('applyActorGrowth 身份臂:战斗队伍之外的角色 fail-loud', () => {
    const growth: LevelGrowthDelta = {
      level: 1,
      maxHP: 10,
      maxMP: 5,
      attack: 2,
      magicAttack: 2,
      defense: 2,
      speed: 1,
      luck: 1,
    }
    const session = makeSession([seed('li', 100)], mkEnemy('boss'), {
      encounterChoreo: [
        {
          at: 'battleStart',
          body: [{ kind: 'applyActorGrowth', actor: 'zhao-linger', delta: growth }],
        },
      ],
    })
    expect(() => session.tick(16, new Set())).toThrow(
      'battle choreography actor "zhao-linger" 在战斗队伍中期望恰好 1 个实例，实际 0',
    )
  })

  test('endBattle 重复登记臂:同链两条终局命令第二条 fail-loud', () => {
    const session = makeSession([seed('li', 100)], mkEnemy('boss'), {
      encounterChoreo: [
        {
          at: 'battleStart',
          body: [
            { kind: 'endBattle', result: 'terminate' },
            { kind: 'endBattle', result: 'won' },
          ],
        },
      ],
    })
    session.tick(16, new Set()) // 第一条:登记 terminal
    expect(() => session.tick(16, new Set())).toThrow(
      'battle choreography 同一执行路径重复登记 terminal request',
    )
  })
})

describe('C85 会话生命周期臂', () => {
  test('cancel 双守卫臂:已取消会话 tick 不再驱动演出与回合准备', async () => {
    const session = makeSession([seed('li', 100)], mkEnemy('boss'))
    const done = session.done
    session.tick(16, new Set())
    session.cancel()
    await expect(done).rejects.toMatchObject({ name: 'AbortError' })
    session.tick(100, new Set()) // 已取消:tick 安静返回不再驱动演出/回合准备
  })

  test('cancel 幂等臂:终局后再 cancel 安静返回不再 reject', async () => {
    const session = makeSession([seed('li', 100)], mkEnemy('boss'))
    session.cancel()
    session.cancel()
    await expect(session.done).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('形象缺失臂:构造期形象复位即对未注册定义 fail-loud', () => {
    // 构造期 resetVisual → resetPlayersVisual → playerFrames → requireAppearance
    expect(() =>
      makeSession([seed('li', 100)], mkEnemy('boss'), {}, ['battle-sprite.missing'], false),
    ).toThrow('本场 battle sprite readiness 缺定义 "battle-sprite.missing"')
  })
})
