import type { WorldState } from '@type-pal/content'
import { buildWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { wfActorDef, wfEnemy } from '../__tests__/battle-workflows/catalog.js'
import { makeSoloSession } from '../__tests__/battle-workflows/session-driver.js'
import { expectDefined } from '../defined.js'
import type { CreatePlayerInput } from './battle-core.js'
import type { BattleSession } from './battle-session.js'

function driveOneRound(session: BattleSession, ticks = 12): void {
  session.tick(16, new Set([' ']))
  session.tick(16, new Set([' ']))
  for (let i = 0; i < ticks; i++) session.tick(500, new Set())
}

function growthWorld(
  actor: string,
  progress: NonNullable<CreatePlayerInput['persistentProgress']>,
): WorldState {
  const world = buildWorld(
    { party: [actor], money: 0, inventory: [] },
    { [actor]: wfActorDef(actor) },
  )
  Object.assign(expectDefined(world.party[0]), progress, { id: 'li' })
  return world
}

describe('敌方脚本调用与状态交接', () => {
  test('turnStart 立刻开始音乐淡出，用 gameplay clock 等待换曲', () => {
    const enemy = wfEnemy('music-hook', { attackStrength: 0, health: 9999 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'intro',
        states: {
          intro: {
            body: [
              { kind: 'stopMusic', fadeMs: 3000 },
              { kind: 'playSound', asset: 'sound.pal.213' },
              { kind: 'wait', ms: 1600 },
              { kind: 'playMusic', asset: 'music.pal.038' },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const music: string[] = []
    const { session, plays } = makeSoloSession(
      enemy,
      {},
      {
        playMusic: (asset) => music.push(`play:${asset}`),
        stopMusic: (fadeMs) => music.push(`stop:${fadeMs}`),
      },
    )

    session.tick(0, new Set(), 0) // 排队并激活 turnStart
    session.tick(0, new Set(), 0) // stopMusic(fade=3000)
    session.tick(0, new Set(), 0) // sound 213
    session.tick(0, new Set(), 0) // wait 1600
    session.tick(1000, new Set(), 0) // real dt 前进，gameplay clock 冻结
    session.tick(0, new Set(), 1599)
    expect(music).toEqual(['stop:3000'])
    session.tick(0, new Set(), 1600)
    expect(plays).toContain('sound.pal.213')
    expect(music).toEqual(['stop:3000', 'play:music.pal.038'])
    session.tick(0, new Set(), 3000)
    expect(music).toEqual(['stop:3000', 'play:music.pal.038'])
  })

  test('ready hook 每个行动 entry 先执行，完成后同一敌人仍正常行动', () => {
    const enemy = wfEnemy('ready-hook', {
      attackStrength: 5,
      health: 9999,
      dexterity: 10,
    })
    enemy.ai.hooks = {
      ready: {
        initial: 'ready',
        states: {
          ready: {
            body: [{ kind: 'playSound', asset: 'sound.ready' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const { session, plays } = makeSoloSession(enemy, {
      attackStrength: 0,
      defense: 9999,
    })
    driveOneRound(session, 40)
    expect(plays).toContain('sound.ready')
    expect(session.debugLog().some((line) => line.includes('ready-hook 攻击'))).toBe(true)
  })

  test('fleeBattle 立即播放逃跑演出，但当前 hook closure 排净后才结算', async () => {
    const enemy = wfEnemy('flee-hook', { attackStrength: 0, health: 9999 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'escape',
        states: {
          escape: {
            body: [{ kind: 'fleeBattle' }, { kind: 'playSound', asset: 'sound.after-flee' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const { session, plays } = makeSoloSession(enemy)
    for (let index = 0; index < 40; index += 1) session.tick(1000, new Set())
    const result = await Promise.race([
      session.done,
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100)),
    ])
    expect(result).toBe('enemyFled')
    expect(plays).toContain('sound.after-flee')
  })

  test('固定成长先严格定位，再同步战斗快照并保持 exp，复活与回满读取新上限', () => {
    const actor = 'zhao-linger'
    const enemy = wfEnemy('growth-hook', { attackStrength: 0, health: 9999 })
    const delta = {
      level: 11,
      maxHP: 170,
      maxMP: 190,
      attack: 100,
      magicAttack: 155,
      defense: 55,
      speed: 80,
      luck: 30,
    }
    enemy.ai.hooks = {
      turnStart: {
        initial: 'growth',
        states: {
          growth: {
            body: [
              { kind: 'applyActorGrowth', actor, delta },
              { kind: 'revivePartyAll', tenths: 1 },
              { kind: 'increaseHpMp', delta: 9999, pools: 'both' },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const progress = {
      level: 5,
      exp: 77,
      maxHP: 100,
      maxMP: 30,
      attack: 20,
      magicAttack: 15,
      defense: 12,
      speed: 10,
      luck: 8,
    }
    const { session } = makeSoloSession(
      enemy,
      {
        actorTemplateId: actor,
        hp: 0,
        maxHp: 100,
        mp: 0,
        maxMp: 30,
        attackStrength: 20,
        magicStrength: 15,
        defense: 12,
        baseDexterity: 10,
        fleeRate: 8,
        persistentProgress: { ...progress },
      },
      {
        worldPartyIdentities: [{ id: 'li', template: actor }],
      },
    )
    for (let index = 0; index < 6; index += 1) session.tick(0, new Set(), 0)
    // Battle pool writes reflect growth and revive in source order. The separate world
    // writeback starts from the original character, including an independent experience value.
    const pools = [{ id: 'li', hp: 0, mp: 0 }]
    session.writeBackHp(pools)
    expect(pools).toEqual([{ id: 'li', hp: 270, mp: 220 }])
    const world = growthWorld(actor, progress)
    session.writeBackPersistentEffects(world)
    expect(world.party[0]).toMatchObject({
      level: 16,
      exp: 77,
      maxHP: 270,
      maxMP: 220,
      attack: 120,
      magicAttack: 170,
      defense: 67,
      speed: 90,
      luck: 38,
    })
  })

  test('固定成长定位失败时在任何 mutation 前 fail-loud', () => {
    const enemy = wfEnemy('bad-growth', { attackStrength: 0, health: 9999 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'growth',
        states: {
          growth: {
            body: [
              {
                kind: 'applyActorGrowth',
                actor: 'zhao-linger',
                delta: {
                  level: 1,
                  maxHP: 1,
                  maxMP: 1,
                  attack: 1,
                  magicAttack: 1,
                  defense: 1,
                  speed: 1,
                  luck: 1,
                },
              },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const progress = {
      level: 1,
      exp: 9,
      maxHP: 100,
      maxMP: 30,
      attack: 20,
      magicAttack: 15,
      defense: 12,
      speed: 10,
      luck: 8,
    }
    const { session } = makeSoloSession(enemy, {
      actorTemplateId: 'zhao-linger',
      persistentProgress: { ...progress },
    })
    const world = growthWorld('zhao-linger', progress)
    const before = structuredClone(world)
    session.tick(0, new Set(), 0)
    expect(() => session.tick(0, new Set(), 0)).toThrow('在世界队伍中期望恰好 1 个实例')
    session.writeBackPersistentEffects(world)
    expect(world).toEqual(before)
  })
})
