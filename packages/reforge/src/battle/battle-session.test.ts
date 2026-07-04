/**
 * BattleSession 表现层钩子测试(M4d-3)—— headless tick 驱动,假 SfxPlayer 记录调用。
 * 只验「时机 → play(id)」接线;真实解码/发声浏览器验。
 */
import type { EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { GlyphTable } from '../assets.js'
import type { SfxPlayer } from '../audio/sfx.js'
import type { BattlePlayerState } from './battle-core.js'
import { BattleSession, type BattleSessionAssets } from './battle-session.js'

function mkEnemy(
  id: string,
  o: Partial<EnemyDef['stats']> = {},
  extra: Partial<EnemyDef> = {},
): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    spriteNum: 1,
    stats: {
      health: 30,
      level: 1,
      exp: 5,
      cash: 3,
      attackStrength: 20,
      magicStrength: 0,
      defense: 10,
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
    anim: {
      idleFrames: 2,
      magicFrames: 0,
      attackFrames: 2,
      idleAnimSpeed: 5,
      actWaitFrames: 1,
      yPosOffset: 0,
    },
    sounds: { attack: 355, action: 300, magic: 0, death: 30, call: 2 },
    ...extra,
  }
}
const player = (
  roleId: string,
  o: Partial<BattlePlayerState> = {},
): Omit<BattlePlayerState, 'status' | 'defending'> => ({
  roleId,
  hp: 100,
  maxHp: 100,
  mp: 30,
  maxMp: 30,
  attackStrength: 40,
  defense: 30,
  magicStrength: 20,
  baseDexterity: 50,
  skills: [],
  fleeRate: 20,
  ...o,
})

const stubGlyphs = { has: () => false, get: () => undefined } as unknown as GlyphTable

function makeSession(
  enemy: EnemyDef,
  playerOverrides: Partial<BattlePlayerState> = {},
  extraOpts: { auto?: boolean } = {},
) {
  const plays: number[] = []
  const sfx = { play: (id: number) => plays.push(id) } as unknown as SfxPlayer
  const assets: BattleSessionAssets = {
    palette: { colors: [], cycles: [] } as unknown as import('@type-pal/shared').Palette,
    glyphs: stubGlyphs,
    enemySprites: [undefined],
    playerSprites: [undefined],
    sfx,
  }
  const session = new BattleSession(
    [player('li', playerOverrides)],
    [enemy],
    assets,
    (id) => id,
    () => 0,
    extraOpts,
  )
  return { session, plays }
}

/** 空格确认两下(菜单默认攻击 → 选敌确认),再空跑 N 个 acting tick。 */
function driveOneRound(session: BattleSession, ticks = 12): void {
  session.tick(16, new Set([' ']))
  session.tick(16, new Set([' ']))
  for (let i = 0; i < ticks; i++) session.tick(500, new Set())
}

describe('M4d-3/M4d-2 战斗音效接线(时间线帧挂载)', () => {
  test('敌人物攻 → 时间线播 action(接近)+ call(命中)音', () => {
    // 玩家打不死敌(高防高血),敌必反击
    const { session, plays } = makeSession(
      mkEnemy('tank', { health: 999, defense: 999, attackStrength: 10 }),
      { attackStrength: 1 },
    )
    driveOneRound(session)
    expect(plays).toContain(300) // action(fixture)
    expect(plays).toContain(2) // call
  })

  test('击杀敌人 → 播 sounds.death', () => {
    const { session, plays } = makeSession(mkEnemy('slime', { health: 10, defense: 0 }), {
      attackStrength: 400,
    })
    driveOneRound(session)
    expect(plays).toContain(30)
  })

  test('choreography playSound → 直接播', () => {
    const enemy = mkEnemy(
      'bard',
      { health: 999, defense: 999 },
      {
        choreography: [{ at: 'battleStart', body: [{ kind: 'playSound', soundId: 77 }] }],
      },
    )
    const { session, plays } = makeSession(enemy, { attackStrength: 1 })
    session.tick(16, new Set()) // battleStart 演出:collect + pump(playSound 无横幅,直接消费)
    expect(plays).toContain(77)
  })
})

describe('B9 特殊战斗形态', () => {
  test('endBattle terminate:choreography 撑到 turn → 战斗终止无奖励(林天南 7 回合)', async () => {
    // 打不死的敌 + turn≥2 触发 endBattle terminate;不主动攻击也会终止
    const enemy = mkEnemy(
      'lin',
      { health: 99999, defense: 99999, attackStrength: 0 },
      {
        choreography: [
          {
            at: 'turnStart',
            once: true,
            when: { kind: 'turn', op: '>=', value: 2 },
            body: [{ kind: 'endBattle', result: 'terminate' }],
          },
        ],
      },
    )
    const { session } = makeSession(enemy, { attackStrength: 0, defense: 9999 })
    // 回合 1:防御推进(攻 0 杀不死);回合 2 起手 → endBattle
    let guard = 0
    const result = await Promise.race([
      session.done,
      new Promise<string>((res) => {
        const pump = () => {
          if (guard++ > 400) return res('timeout')
          session.tick(50, new Set([' '])) // 空格推进横幅/确认默认攻击(攻 0 无害)
          setTimeout(pump, 0)
        }
        pump()
      }),
    ])
    expect(result).toBe('win') // terminate → done('win');enemyFled 标记免奖励
    expect(session.enemyFled()).toBe(true) // terminate = 无奖励语义
  })

  test('auto 战斗:无按键输入自动推进到出结果(石长老过场战)', async () => {
    const enemy = mkEnemy('weakling', { health: 20, defense: 0 })
    const { session } = makeSession(enemy, { attackStrength: 100 }, { auto: true })
    let guard = 0
    const result = await Promise.race([
      session.done,
      new Promise<string>((res) => {
        const pump = () => {
          if (guard++ > 400) return res('timeout')
          session.tick(50, new Set()) // 关键:空输入集,auto 自动派攻击
          setTimeout(pump, 0)
        }
        pump()
      }),
    ])
    expect(result).toBe('win') // 玩家不出菜单,AI 代打秒杀
  })
})
