/**
 * TEST-BATTLE-WORKFLOWS-1 W6：写回与隔离（完整结果 + 非目标保真版，闭 C1/N1）。
 * - 库存：真实战斗消耗一件 healHp 物品 → writeBackInventory 写回 count-1、count 0 清项；
 * - HP/MP：终值**精确**写回——无伤胜利=100、败=0（lost 分支允许 0）、多轮受击=100−Σ(敌伤害行)、
 *   **多队员胜利含阵亡成员：非败终局把 0 HP 队员钳制为 1**（[1,100] 精确；seedStats 合法 hp=0，
 *   败北判据为全队无可战斗成员，单人阵亡不判负——r3"不可达"论证撤回）；
 * - 成长：fixedCharacterGrowth **8 字段全部**按独立快照 before+delta 对账；非目标保真
 *   （未参战队员/money/**非空库存** 深快照不变）；奖励入账后二次写回与**独立预期快照**全等
 *   （幂等由独立快照钉住，非同一对象自比较）；
 * - skillUse：lifetimeLimit 技能施放满限 → 计数入账 **且从 learnedSkills 移除**；
 * - 无 mutation 会话：二次写回 world 深快照不变（幂等基线）。
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

  test('writeBackHp 终值精确写回：无伤胜利=100；败=0（lost 允许 0）；多轮受击=100−Σ敌伤害', async () => {
    // ① 无伤一击致胜：会话 HP/MP 全程未被触碰 → 终值精确 100/40
    const won = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60, mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('one-hit', { health: 20, defense: 0, attackStrength: 1 })],
    })
    won.press([' '])
    won.press([' '])
    won.idle(500)
    for (let i = 0; i < 80 && won.session.debugReadiness().phase !== 'over'; i += 1) {
      won.idle(500)
      await flush()
    }
    for (let screen = 0; screen < 6; screen += 1) {
      won.idle(350)
      won.press([' '])
      await flush()
    }
    await expect(won.session.done).resolves.toBe('victory') // 战斗真实结束
    const wonWorld = buildWorld(
      { party: ['p1'], money: 0, inventory: [], seedStats: { p1: { hp: 100, mp: 40 } } },
      { p1: wfActorDef('p1') },
    )
    won.session.writeBackHp(wonWorld.party)
    expect(wonWorld.party[0]!.hp).toBe(100) // 精确终值（硬写任何别的数即红）
    expect(wonWorld.party[0]!.mp).toBe(40)

    // ② 败：玩家被一击打死 → lost 分支允许写 0（与胜/逃 ≥1 是不同分支）
    const lost = makeWfSession({
      players: [wfPlayer('p1', { hp: 5, maxHp: 5, defense: 0 })],
      enemies: [wfEnemy('killer', { health: 500, attackStrength: 300 })],
    })
    lost.press([' '])
    lost.press([' '])
    lost.idle(500)
    for (let i = 0; i < 80 && lost.session.debugReadiness().phase !== 'over'; i += 1) {
      lost.idle(500)
      await flush()
    }
    for (let screen = 0; screen < 6; screen += 1) {
      lost.idle(350)
      lost.press([' '])
      await flush()
    }
    await expect(lost.session.done).resolves.toBe('defeat')
    const lostWorld = buildWorld(
      { party: ['p1'], money: 0, inventory: [], seedStats: { p1: { hp: 5 } } },
      { p1: wfActorDef('p1') },
    )
    lost.session.writeBackHp(lostWorld.party)
    expect(lostWorld.party[0]!.hp).toBe(0) // 败写 0（lost 分支）

    // ③ 多轮受击：终值 = 100 − Σ(敌「e1 攻击 p1 造成 N」行)——预期由战斗事件构造，非终值自证
    const hurt = makeWfSession({
      players: [wfPlayer('p1', { mp: 40, maxMp: 40, attackStrength: 1 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 7, defense: 999, dexterity: 50 })],
    })
    for (let round = 0; round < 3; round += 1) {
      hurt.press([' '])
      hurt.press([' '])
      hurt.idle(500)
      for (let i = 0; i < 60 && hurt.session.debugReadiness().phase !== 'menu'; i += 1) {
        hurt.idle(500)
        await flush()
      }
    }
    const damages = hurt.session
      .debugLog()
      .filter((line) => line.startsWith('e1 ') && line.includes('攻击') && line.includes('造成'))
      .map((line) => Number.parseInt(line.slice(line.lastIndexOf('造成') + 2).trim(), 10))
      .filter((n) => Number.isFinite(n))
    expect(damages.length).toBeGreaterThanOrEqual(1) // 敌每轮真实反击
    const expected = 100 - damages.reduce((sum, n) => sum + n, 0)
    const hurtWorld = buildWorld(
      { party: ['p1'], money: 0, inventory: [], seedStats: { p1: { hp: 100, mp: 40 } } },
      { p1: wfActorDef('p1') },
    )
    hurt.session.writeBackHp(hurtWorld.party)
    expect(hurtWorld.party[0]!.hp).toBe(Math.max(expected, 0)) // 终值=事件推导值（精确）
    expect(hurtWorld.party[0]!.mp).toBe(40) // 未施法：MP 精确不变
  })

  test('多队员胜利含阵亡成员：writeBackHp 对非败终局把 0 HP 队员钳制为 1（[1,100] 精确）', async () => {
    // seedStats 合法 hp=0；败北判据是**全队**无可战斗成员（battle-core.ts:1182-1186），
    // 单人阵亡不判负 → p2 可独自取胜，非 lost 终局 + p1 hp=0 即 ≥1 钳制臂的公开可达输入
    // （r3 回执"HP0 即判负、不可达"的域论证错误， hereby 撤回）。
    const { harness: h, world } = makeWfSessionFromWorld({
      actorIds: ['p1', 'p2'],
      enemies: [wfEnemy('one-hit', { health: 20, defense: 0, attackStrength: 1 })],
      seedStats: { p1: { hp: 0 }, p2: { hp: 100 } },
    })
    expect(world.party.map((member) => member.hp)).toEqual([0, 100]) // 合法 seedStats 真实生效
    // p1 阵亡不出菜单（needsManualSelect 要求 hp>0）：p2 一击致胜
    h.press([' '])
    h.press([' '])
    h.idle(500)
    await flush()
    for (let i = 0; i < 100 && h.session.debugReadiness().phase !== 'over'; i += 1) {
      h.idle(500)
      await flush()
    }
    for (let screen = 0; screen < 6; screen += 1) {
      h.idle(350)
      h.press([' '])
      await flush()
    }
    await expect(h.session.done).resolves.toBe('victory') // 阵亡成员在场仍真实胜利
    expect(h.session.debugPlayers().map((player) => player.hp)).toEqual([0, 100]) // 会话侧终值
    h.session.writeBackHp(world.party)
    // 非败终局钳制：p1 0→1；p2 无伤保持 100——钳制臂改 0 时此处 [0,100] 即红
    expect(world.party.map((member) => member.hp)).toEqual([1, 100])
  })

  test('真实成长写回：8 字段对账；未参战队员/money/非空库存保真；奖励后二次写回与独立预期全等', async () => {
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
    // 生产路径构造：world 队伍含未参战的 p2、money=77、**非空库存哨兵**（非目标保真正控）
    const { harness: h, world } = makeWfSessionFromWorld({
      actorIds: ['p1'],
      worldPartyIds: ['p1', 'p2'],
      enemies: [wfEnemy('e1', { health: 20, defense: 0, attackStrength: 1 })],
      worldMoney: 77,
      worldInventory: [{ itemId: 'wf-world-tonic', count: 3 }],
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
    // 独立深快照（structuredClone，非别名）：幂等/保真断言全部对照独立副本
    const worldBefore = structuredClone(world)
    const p1Before = structuredClone(world.party[0]!)
    h.session.writeBackPersistentEffects(world)
    const p1AfterFirst = structuredClone(world.party[0]!)
    // 完整预期：全部 8 字段 = before + delta（预期由操作前实际输入快照+业务变化构造）
    expect(p1AfterFirst.level).toBe(p1Before.level + growth.level)
    expect(p1AfterFirst.maxHP).toBe(p1Before.maxHP + growth.maxHP)
    expect(p1AfterFirst.maxMP).toBe(p1Before.maxMP + growth.maxMP)
    expect(p1AfterFirst.attack).toBe(p1Before.attack + growth.attack)
    expect(p1AfterFirst.magicAttack).toBe(p1Before.magicAttack + growth.magicAttack)
    expect(p1AfterFirst.defense).toBe(p1Before.defense + growth.defense)
    expect(p1AfterFirst.speed).toBe(p1Before.speed + growth.speed)
    expect(p1AfterFirst.luck).toBe(p1Before.luck + growth.luck)
    // 非目标保真：除 p1 的 8 字段外，整个 world（含未参战 p2、money=77、非空库存、learnedSkills）不变
    const expectedFirst = worldBefore
    const target = expectedFirst.party[0]!
    target.level = p1AfterFirst.level
    target.maxHP = p1AfterFirst.maxHP
    target.maxMP = p1AfterFirst.maxMP
    target.attack = p1AfterFirst.attack
    target.magicAttack = p1AfterFirst.magicAttack
    target.defense = p1AfterFirst.defense
    target.speed = p1AfterFirst.speed
    target.luck = p1AfterFirst.luck
    expect(world).toEqual(expectedFirst)
    // 奖励后保留：胜利结算入账（exp/money 变化）后，取**独立预期快照**再二次写回——
    // 全等比较钉住幂等（移除生产幂等门会二次叠加成长，在此即红），且不覆盖奖励
    world.party[0]!.exp += 50
    world.money += 99
    const expectedAfterRewards = structuredClone(world)
    h.session.writeBackPersistentEffects(world)
    expect(world).toEqual(expectedAfterRewards) // 整 world 独立全等：奖励保留 + 成长不重复叠加
  })

  test('skillUse 写回：满限计数入账 且 技能从 learnedSkills 移除', async () => {
    const { harness: h, world: skillWorld } = makeWfSessionFromWorld({
      actorIds: ['p1'],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      initialMagic: ['wf-once'],
      seedStats: { p1: { hp: 100, mp: 10 } },
      extraOpts: { skills: { 'wf-once': wfLifetimeSkill('wf-once', 5) } },
    })
    expect(skillWorld.learnedSkills.p1).toEqual(['wf-once']) // buildWorld 按演员 initialMagic 播种
    h.press(['ArrowLeft'])
    h.press([' ']) // 法术列表
    h.press([' ']) // 目标
    h.press([' ']) // 施放（lifetimeLimit=1：本次即满限）
    h.idle(500)
    for (let i = 0; i < 60; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(skillWorld.skillUseCounts).toBeUndefined() // 写回前无计数
    h.session.writeBackPersistentEffects(skillWorld)
    expect(skillWorld.skillUseCounts?.p1?.['wf-once']).toBe(1) // 真实入账一次
    expect(skillWorld.learnedSkills.p1).toEqual([]) // 满限 → 从 learnedSkills 真实移除
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
