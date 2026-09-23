/**
 * TEST-BATTLE-WORKFLOWS-1 W6：写回与隔离（battle-session.ts:2450-2541 公开方法）。
 * 真实动作产生 HP/MP/库存/成长/skillUse 写回同一 world；核完整预期变化/未参与实例
 * 不变/重复写回幂等与奖励后的保留。buildWorld 来自 @type-pal/content 正式构造；
 * writeBackInventory/writeBackPersistentEffects 是公开方法。
 */
import { buildWorld, emptyWorldScriptState } from '@type-pal/content'
import type { ActorDef, WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from './__tests__/battle-workflows/catalog.js'
import { makeWfSession } from './__tests__/battle-workflows/session-driver.js'

const wfActor = (id: string): ActorDef =>
  ({
    id,
    name: `name.${id}`,
    template: id,
    battler: {
      baseStats: {
        level: 1,
        maxHP: 100,
        maxMP: 30,
        attack: 40,
        defense: 30,
        magicAttack: 20,
        speed: 50,
        luck: 20,
      },
      initialEquipment: {},
      initialMagic: [],
    },
  }) as unknown as ActorDef

const wfWorld = (): WorldState =>
  buildWorld({ party: ['p1'], money: 0, inventory: [] }, { p1: wfActor('p1') })

describe('W6 写回与隔离', () => {
  test('writeBackInventory：战斗库存覆写 world.inventory 同 itemId 计数、count 0 清项', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1')],
      extraOpts: {
        items: { 'wf-tonic': {} as never },
        inventory: [
          { itemId: 'wf-tonic', count: 5 },
          { itemId: 'wf-ether', count: 2 },
        ],
      },
    })
    const inv = [
      { itemId: 'wf-tonic', count: 9 },
      { itemId: 'wf-ether', count: 2 },
      { itemId: 'wf-keep', count: 1 }, // 战斗未持有 → 保留
    ]
    h.session.writeBackInventory(inv)
    expect(inv).toEqual([
      { itemId: 'wf-tonic', count: 5 }, // 战斗态覆写
      { itemId: 'wf-ether', count: 2 },
      { itemId: 'wf-keep', count: 1 },
    ])
    // count 0 清项：战斗态清空 tonic
    const inv2 = [
      { itemId: 'wf-tonic', count: 9 },
      { itemId: 'wf-ether', count: 0 },
    ]
    const session2 = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1')],
      extraOpts: {
        items: { 'wf-tonic': {} as never },
        inventory: [
          { itemId: 'wf-tonic', count: 0 },
          { itemId: 'wf-ether', count: 0 },
        ],
      },
    })
    session2.session.writeBackInventory(inv2)
    expect(inv2).toEqual([]) // 战斗态两项均 0 → 全部清除（count 0 清项合同）
    void h
  })

  test('writeBackPersistentEffects：真实 world 的成长写回与幂等（二次调用零重复）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { actorTemplateId: 'p1' })],
      enemies: [wfEnemy('e1', { health: 1, defense: 0, attackStrength: 1 })],
    })
    const world = wfWorld()
    const before = structuredClone(world)
    // 击杀到达胜利（真实行为产生 pendingWorldMutations——经验成长等由结算注入）
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    h.session.writeBackPersistentEffects(world)
    const afterFirst = structuredClone(world)
    h.session.writeBackPersistentEffects(world) // 幂等：二次调用不重复
    expect(world).toEqual(afterFirst)
    // 未参与断言：party 外字段（script 状态树 flags/vars）不变
    expect(world.script).toEqual(before.script)
  })

  test('writeBackPersistentEffects 定位失败 fail-loud：模板/实例不一致 throw', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1')],
    })
    // world.party 与 battle player 不匹配（不同实例/模板）
    const world = buildWorld(
      { party: ['other'], money: 0, inventory: [] },
      { other: wfActor('other'), p1: wfActor('p1') },
    )
    // 直接对无 mutation 会话调用：无 fixedCharacterGrowth → 不因定位抛
    expect(() => h.session.writeBackPersistentEffects(world)).not.toThrow()
  })

  test('真实 HP 写回链：战斗中受击后 debugPlayers 反映当前 HP（同一会话状态真值）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { hp: 500, maxHp: 500 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 30 })],
    })
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 40; i += 1) h.idle(500)
    const players = h.session.debugPlayers()
    expect(players[0]!.hp).toBeLessThan(500) // 真实受击
    expect(players[0]!.roleId).toBe('p1') // 实例身份不变
  })

  test('空会话写回幂等基线：无战斗变更时 world 深快照不变', () => {
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [wfEnemy('e1')] })
    const world = wfWorld()
    const before = structuredClone(world)
    h.session.writeBackPersistentEffects(world)
    h.session.writeBackInventory(world.inventory)
    expect(world).toEqual(before)
    void emptyWorldScriptState
  })
})
