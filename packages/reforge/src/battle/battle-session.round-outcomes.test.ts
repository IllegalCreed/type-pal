import type { ItemData, PoisonDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { makeWfSession, type WfHarness } from '../__tests__/battle-workflows/session-driver.js'
import type { BattleResult } from './battle-result.js'

async function resultAfterFrames(
  h: WfHarness,
  advance: () => void,
): Promise<BattleResult | undefined> {
  let result: BattleResult | undefined
  let rejection: { error: unknown } | undefined
  void h.session.done.then(
    (settled) => {
      result = settled
    },
    (error) => {
      rejection = { error }
    },
  )
  for (let frame = 0; frame < 80 && result === undefined && rejection === undefined; frame++) {
    advance()
    await Promise.resolve()
  }
  if (rejection) throw rejection.error
  return result
}

test('末敌死于回合末毒发，零后续输入进入胜利并只记一次战果', async () => {
  const poison: PoisonDef = {
    id: 601,
    name: '赤毒',
    curability: 'common',
    color: 0,
    enemyTicks: [{ hpDelta: -10 }, { hpDelta: -20 }],
  }
  const venom: ItemData = {
    id: 'venom',
    name: 'name.venom',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    throw: { target: 'oneEnemy', effects: [{ kind: 'applyPoison', poisonId: '601' }] },
  }
  const h = makeWfSession({
    players: [wfPlayer('p1', { attackStrength: 1 })],
    enemies: [
      wfEnemy(
        'e1',
        { health: 30, attackStrength: 1, exp: 5, cash: 3 },
        {
          ai: { resistanceToSorcery: 0 },
        },
      ),
    ],
    extraOpts: {
      items: { venom },
      inventory: [{ itemId: 'venom', count: 1 }],
      poisonDefs: { 601: poison },
    },
  })
  h.press(['w'])
  expect(h.session.debugReadiness().phase).toBe('throwItem')
  h.press(['Enter'])
  h.press(['Enter'])

  expect(await resultAfterFrames(h, () => h.idle(200))).toBe('victory')
  expect(h.session.debugLog().filter((line) => line === '601 赤毒 发作')).toHaveLength(2)
  expect(h.session.rewards()).toEqual({ exp: 5, cash: 3 })
})

test('回合末毒发全灭后直接结束，不再为下一轮准备音效', async () => {
  const preparedTurns: number[] = []
  const poison: PoisonDef = {
    id: 602,
    name: '赤毒',
    curability: 'common',
    color: 0,
    playerTicks: [{ hpDelta: -10 }],
  }
  const h = makeWfSession({
    players: [wfPlayer('p1', { hp: 10, maxHp: 10, poisons: [{ poisonId: 602, tickIndex: 0 }] })],
    enemies: [wfEnemy('e1', { health: 500, attackStrength: 0 })],
    extraOpts: {
      poisonDefs: { 602: poison },
      prepareTurnSounds: async ({ turn }) => {
        preparedTurns.push(turn)
      },
    },
  })
  h.press(['d'])

  expect(await resultAfterFrames(h, () => h.idle(200))).toBe('defeat')
  expect(h.session.debugLog()).toContain('p1 赤毒 发作')
  expect(preparedTurns).toEqual([1])
  expect(h.session.rewards()).toEqual({ exp: 0, cash: 0 })
})

test('逃跑失败后可以接续下一轮，胜利后正常计奖', async () => {
  const h = makeWfSession({
    players: [wfPlayer('p1', { fleeRate: 20, attackStrength: 200 })],
    enemies: [wfEnemy('e1', { health: 30, attackStrength: 1, exp: 5, cash: 3 })],
    rng: () => 0.999999,
  })
  h.press(['q'])

  const result = await resultAfterFrames(h, () => {
    if (h.session.debugReadiness().phase === 'menu') h.press(['Enter'], 200)
    else if (h.session.debugReadiness().phase === 'target') h.press(['Enter'], 200)
    else h.idle(200)
  })
  expect(result).toBe('victory')
  expect(h.session.debugLog().some((line) => line.startsWith('p1 逃跑失败'))).toBe(true)
  expect(h.session.rewards()).toEqual({ exp: 5, cash: 3 })
})

test('敌人选择逃走后交回 enemyFled，已有奖励值不会强制打开结算', async () => {
  const deserter = wfEnemy('deserter', { health: 200, attackStrength: 0 })
  deserter.ai = { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'flee' } }] }
  const h = makeWfSession({
    players: [wfPlayer('p1')],
    enemies: [deserter],
    rng: () => 0.99,
    extraOpts: {
      buildSettlement: () => {
        throw new Error('enemy retreat must not build rewards')
      },
    },
  })
  h.press(['d'])

  expect(await resultAfterFrames(h, () => h.idle(200))).toBe('enemyFled')
  expect(h.session.debugLog()).toContain('deserter 逃走了')
  expect(h.session.rewards()).toEqual({ exp: 0, cash: 0 })
})
