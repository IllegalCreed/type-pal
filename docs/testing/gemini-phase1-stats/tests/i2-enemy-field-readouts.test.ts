/**
 * I2: collectEnemyStatusReadouts / collectFieldInfoReadout 敌方与战场投影
 * 重点核验 (去重说明: 旧测试已测 attackEquivPoison、collectValue 及非战斗空态，此处严格去重):
 * 1. 正式战斗态中的 defeated 标记、受击后当前HP与开战满血
 * 2. 偷取物品、金钱与不可偷的不同读出
 * 3. 敌人自身 debuff/buff 与敌人毒槽解析
 * 4. 战场 isBoss、screenWave 与有符号 magicEffect 正负场效
 */
import type { Item, ObjectPoisonView } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  collectEnemyStatusReadouts,
  collectFieldInfoReadout,
} from '../../../../packages/game/src/core/inspect/battle-inspect.js'
import {
  attachBattleState,
  makeBattleField,
  makeBattleStatus,
  makeEnemy,
  makeFreshGameState,
  makeItem,
  makeObjectPoison,
} from '../fixtures/stats-test-fixtures.js'

describe('I2: 敌方与战场只读快照投影', () => {
  it('I2-01 正式战斗态中战败标记、受击当前血量与开战满血独立显示', () => {
    const gs = makeFreshGameState()
    const state = attachBattleState(gs, [makeEnemy({ health: 80 })])
    state.enemies[0]!.e.health = 30
    state.enemies[0]!.defeated = true

    const readouts = collectEnemyStatusReadouts(gs)
    expect(readouts).toHaveLength(1)
    expect(readouts[0]!.defeated).toBe(true)
    expect(readouts[0]!.hp).toBe(30)
    expect(readouts[0]!.maxHp).toBe(80) // createBattleState 的开战满血，不是旧 fixture fallback
  })

  it('I2-02 敌方偷取判定: 偷物品与偷金钱的区分展示', () => {
    const gs = makeFreshGameState()

    const items: Item[] = [makeItem({ id: 201, _name: '灵山仙芝' })]

    // 敌 1: 可偷物品
    const e1 = makeEnemy({ stealItem: 201, stealItemCount: 3 })
    // 敌 2: 可偷金钱 (stealItem = 0)
    const e2 = makeEnemy({ stealItem: 0, stealItemCount: 150 })

    attachBattleState(gs, [e1, e2])

    const readouts = collectEnemyStatusReadouts(gs, [], items)
    expect(readouts[0]!.canSteal).toBe(true)
    expect(readouts[0]!.steal).toBe('灵山仙芝 ×3')

    expect(readouts[1]!.canSteal).toBe(true)
    expect(readouts[1]!.steal).toBe('金钱 ×150')
  })

  it('I2-03 敌方状态计数器与自带中毒解析', () => {
    const gs = makeFreshGameState()
    const state = attachBattleState(gs, [makeEnemy()])
    state.enemies[0]!.status = makeBattleStatus({ sleep: 2, bravery: 3 })
    state.enemies[0]!.poisons = [{ poisonId: 560, scriptEntry: 800 }]
    state.enemies[0]!.resistanceToSorcery = 5

    const poisons: ObjectPoisonView[] = [makeObjectPoison({ id: 560, level: 3 })]
    const items: Item[] = [makeItem({ id: 560, _name: '赤蝎毒' })]

    const readouts = collectEnemyStatusReadouts(gs, poisons, items)
    const r = readouts[0]!

    expect(r.statuses).toContainEqual({ name: '眠', kind: 'debuff', rounds: 2 })
    expect(r.statuses).toContainEqual({ name: '勇', kind: 'buff', rounds: 3 })
    expect(r.statuses).toContainEqual({ name: '赤蝎毒', kind: 'poison' })

    const sorceryRes = r.resistances.find((x) => x.label === '巫抗')
    expect(sorceryRes?.value).toBe(5)
  })

  it('I2-04 战场 isBoss、screenWave 与正负有符号五行元素场效', () => {
    const gs = makeFreshGameState()

    const field = makeBattleField({
      id: 9,
      screenWave: 6,
      magicEffect: {
        wind: 3,
        thunder: -2,
        water: 0,
        fire: 5,
        earth: -4,
      },
    })

    attachBattleState(gs, [], field, true)

    const info = collectFieldInfoReadout(gs)
    expect(info).not.toBeNull()
    expect(info!.isBoss).toBe(true)
    expect(info!.screenWave).toBe(6)

    const elemMap = new Map(info!.elements.map((e) => [e.label, e.value]))
    expect(elemMap.get('风')).toBe(3)
    expect(elemMap.get('雷')).toBe(-2)
    expect(elemMap.get('水')).toBe(0)
    expect(elemMap.get('火')).toBe(5)
    expect(elemMap.get('土')).toBe(-4)
  })
})
