import { describe, expect, test } from 'vitest'
import { wfEnemy } from '../__tests__/battle-workflows/catalog.js'
import { makeSoloSession } from '../__tests__/battle-workflows/session-driver.js'

describe('撤离与脚本终态', () => {
  test('玩家逃跑成功返回 playerFled，且不进入胜利结算', async () => {
    const buildSettlementCalls: string[] = []
    const { session } = makeSoloSession(
      wfEnemy('flee-target', { health: 9999, fleeRate: 0, attackStrength: 0 }),
      { fleeRate: 9999, defense: 9999 },
      {
        buildSettlement: () => {
          buildSettlementCalls.push('called')
          return []
        },
      },
    )

    session.tick(16, new Set(['q']))
    for (let index = 0; index < 40; index += 1) session.tick(1000, new Set())

    await expect(session.done).resolves.toBe('playerFled')
    expect(buildSettlementCalls).toEqual([])
  })

  test('玩家逃跑播放完 16 帧后立即兑现终态', async () => {
    const { session } = makeSoloSession(
      wfEnemy('flee-timing', { health: 9999, fleeRate: 0, attackStrength: 0 }),
      { fleeRate: 999, defense: 999, baseDexterity: 500 },
    )
    let result: string | undefined
    void session.done.then((done) => {
      result = done
    })
    session.tick(16, new Set(['q']))
    for (let i = 0; i < 20 && !session.debugLog().includes('全队逃跑'); i++)
      session.tick(40, new Set())
    expect(session.debugLog()).toContain('全队逃跑')

    for (let frame = 0; frame < 16; frame++) session.tick(40, new Set())
    await Promise.resolve()
    expect(result).toBeUndefined()
    session.tick(16, new Set())
    await Promise.resolve()
    expect(result).toBe('playerFled')
  })

  test('endBattle lost 返回 defeat，且不进入胜利结算', async () => {
    const buildSettlementCalls: string[] = []
    const { session } = makeSoloSession(
      wfEnemy('forced-defeat', { health: 9999, attackStrength: 0 }),
      { defense: 9999 },
      {
        encounterChoreo: [
          {
            at: 'turnStart',
            once: true,
            body: [{ kind: 'endBattle', result: 'lost' }],
          },
        ],
        buildSettlement: () => {
          buildSettlementCalls.push('called')
          return []
        },
      },
    )

    for (let index = 0; index < 40; index += 1) session.tick(1000, new Set())

    await expect(session.done).resolves.toBe('defeat')
    expect(buildSettlementCalls).toEqual([])
  })

  test('endBattle terminate:choreography 撑到 turn → 战斗终止无奖励(林天南 7 回合)', async () => {
    // 打不死的敌 + turn≥2 触发 endBattle terminate;不主动攻击也会终止
    const enemy = wfEnemy('lin', { health: 99999, defense: 99999, attackStrength: 0 })
    const { session } = makeSoloSession(
      enemy,
      { attackStrength: 0, defense: 9999 },
      {
        encounterChoreo: [
          {
            at: 'turnStart',
            once: true,
            when: { kind: 'turn', op: '>=', value: 2 },
            body: [{ kind: 'endBattle', result: 'terminate' }],
          },
        ],
      },
    )
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
    expect(result).toBe('terminated') // terminate 是独立终态，不借 enemyFled 布尔
  })

  test('auto 战斗:无按键输入自动推进到出结果(石长老过场战)', async () => {
    const enemy = wfEnemy('weakling', { health: 20, defense: 0 })
    const { session } = makeSoloSession(enemy, { attackStrength: 100 }, { auto: true })
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
    expect(result).toBe('victory') // 玩家不出菜单,AI 代打秒杀
  })
})
