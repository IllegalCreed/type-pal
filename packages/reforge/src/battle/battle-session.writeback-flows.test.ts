/**
 * TEST-BATTLE-WORKFLOWS-1 W6：写回与隔离（非空变更版）。
 * - 库存：真实战斗消耗一件 healHp 物品 → writeBackInventory 写回 count-1、count 0 清项；
 * - HP/MP：真实战斗后 writeBackHp 把会话终值写进 world 队员（胜/逃至少 1）；
 * - 成长：encounterChoreo 的 applyActorGrowth 产生非空 fixedCharacterGrowth →
 *   writeBackPersistentEffects 真实改 world 队员等级/属性 → 二次调用幂等（先证变化再证幂等）；
 * - skillUse：lifetimeLimit 技能真实施放 → world.skillUseCounts 入账。
 */

import type { WorldState } from '@type-pal/content'
import { buildWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  wfActorDef,
  wfEnemy,
  wfHealItem,
  wfLifetimeSkill,
  wfPlayer,
} from '../__tests__/battle-workflows/catalog.js'
import {
  makeWfSession,
  makeWfSessionFromWorld,
} from '../__tests__/battle-workflows/session-driver.js'

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

const wfWorld = (partyIds: readonly string[]): WorldState =>
  buildWorld(
    { party: [...partyIds], money: 0, inventory: [] },
    Object.fromEntries(partyIds.map((id) => [id, wfActorDef(id)])),
  )

describe('W6 写回与隔离', () => {
  test('writeBackInventory：真实消耗一件物品后写回 count-1；未持有项保留；count 0 清项', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { hp: 50, maxHp: 100 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        items: { 'wf-tonic': wfHealItem('wf-tonic', 30) },
        inventory: [{ itemId: 'wf-tonic', count: 2 }],
      },
    })
    h.press(['e', 'E']) // 真实使用一件
    h.press([' '])
    h.press([' '])
    h.idle(500)
    for (let i = 0; i < 40; i += 1) h.idle(500)
    const inv = [
      { itemId: 'wf-tonic', count: 5 },
      { itemId: 'wf-keep', count: 1 }, // 战斗未持有 → 保留
    ]
    h.session.writeBackInventory(inv)
    expect(inv).toEqual([
      { itemId: 'wf-tonic', count: 1 }, // 2-1 真实消耗
      { itemId: 'wf-keep', count: 1 },
    ])
    // count 0 清项：另一会话消耗唯一一件后写回
    const last = makeWfSession({
      players: [wfPlayer('p1', { hp: 50, maxHp: 100 })],
      enemies: [wfEnemy('e2', { health: 500, attackStrength: 1 })],
      extraOpts: {
        items: { 'wf-tonic': wfHealItem('wf-tonic', 30) },
        inventory: [{ itemId: 'wf-tonic', count: 1 }],
      },
    })
    last.press(['e', 'E'])
    last.press([' '])
    last.press([' '])
    last.idle(500)
    for (let i = 0; i < 40; i += 1) last.idle(500)
    const inv2 = [{ itemId: 'wf-tonic', count: 9 }]
    last.session.writeBackInventory(inv2)
    expect(inv2).toEqual([]) // 战斗态已 0 → 清除
  })

  test('writeBackHp：真实战斗后把会话 HP/MP 终值写进 world 队员（胜/逃至少留 1）', async () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
    })
    h.press([' '])
    h.press([' '])
    h.idle(500)
    for (let i = 0; i < 40; i += 1) h.idle(500)
    const world = buildWorld(
      { party: ['p1'], money: 0, inventory: [], seedStats: { p1: { hp: 100, mp: 40 } } },
      { p1: wfActorDef('p1') },
    )
    const before = structuredClone(world.party[0]!)
    h.session.writeBackHp(world.party)
    const after = world.party[0]!
    expect(after.hp).toBeLessThan(before.hp) // 敌真实反击的 HP 终值写入
    expect(after.mp).toBe(before.mp) // 未施法：MP 不变
    expect(after.hp).toBeGreaterThanOrEqual(1) // 胜/逃至少 1 合同
  })

  test('真实成长写回：choreo applyActorGrowth → world 队员等级/属性真实提升；二次调用幂等', async () => {
    const growth = {
      level: 2,
      maxHP: 12,
      maxMP: 6,
      attack: 3,
      magicAttack: 2,
      defense: 2,
      speed: 1,
      luck: 1,
    }
    // 生产路径构造（buildWorld → createBattlePlayers）：persistentProgress 由真派生填充
    const { harness: h, world } = makeWfSessionFromWorld({
      actorIds: ['p1'],
      enemies: [wfEnemy('e1', { health: 20, defense: 0, attackStrength: 1 })],
      extraOpts: {
        worldPartyIdentities: [{ id: 'p1', template: 'p1' }],
        encounterChoreo: [
          {
            at: 'battleStart',
            body: [{ kind: 'applyActorGrowth', actor: 'p1', delta: growth }],
          },
        ],
      },
    })
    h.press([' '])
    h.press([' '])
    h.idle(500)
    await flush()
    for (let i = 0; i < 100 && h.session.debugReadiness().phase !== 'over'; i += 1) {
      h.idle(500)
      await flush()
    }
    const before = structuredClone(world.party[0]!)
    h.session.writeBackPersistentEffects(world)
    const afterFirst = structuredClone(world.party[0]!)
    // 先证真实变化：等级+maxHP+attack 等按 delta 提升（非空 mutation 生效）
    expect(afterFirst.level).toBe(before.level + growth.level)
    expect(afterFirst.maxHP).toBe(before.maxHP + growth.maxHP)
    expect(afterFirst.attack).toBe(before.attack + growth.attack)
    expect(afterFirst.maxMP).toBe(before.maxMP + growth.maxMP)
    expect(afterFirst.defense).toBe(before.defense + growth.defense)
    // 再证幂等：二次调用不重复叠加
    h.session.writeBackPersistentEffects(world)
    expect(world.party[0]).toEqual(afterFirst)
    // 未参与字段不变
    expect(world.money).toBe(0)
    expect(world.inventory).toEqual([])
  })

  test('skillUse 写回：lifetimeLimit 技能真实施放一次 → world.skillUseCounts 入账', async () => {
    const { harness: h, world: skillWorld } = makeWfSessionFromWorld({
      actorIds: ['p1'],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      initialMagic: ['wf-once'],
      seedStats: { p1: { hp: 100, mp: 10 } },
      extraOpts: { skills: { 'wf-once': wfLifetimeSkill('wf-once', 5) } },
    })
    h.press(['ArrowLeft'])
    h.press([' ']) // 法术列表
    h.press([' ']) // 目标
    h.press([' ']) // 施放
    h.idle(500)
    for (let i = 0; i < 60; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(skillWorld.skillUseCounts).toBeUndefined() // 写回前无计数
    h.session.writeBackPersistentEffects(skillWorld)
    expect(skillWorld.skillUseCounts?.p1?.['wf-once']).toBe(1) // 真实入账一次
  })

  test('写回幂等基线：无 mutation 会话二次写回 world 深快照不变', () => {
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [wfEnemy('e1')] })
    const world = wfWorld(['p1'])
    const before = structuredClone(world)
    h.session.writeBackPersistentEffects(world)
    h.session.writeBackInventory(world.inventory)
    expect(world).toEqual(before)
  })
})
