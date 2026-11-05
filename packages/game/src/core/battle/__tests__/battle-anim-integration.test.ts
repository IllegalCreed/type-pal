/** Real tick ownership of animation completion and post-item fighter restoration. */
import type { Item, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { battleInput, startTestBattle } from '../battle-start.test-fixtures.js'
import { getBattleLiveRoles, tickBattle } from '../battle-system.js'

function makeRole(options: Partial<PlayerRole> = {}): PlayerRole {
  return makeRoleRecord(options.id ?? 0, {
    maxHP: 200,
    hp: 200,
    maxMP: 30,
    mp: 30,
    attackStrength: 100,
    magicStrength: 0,
    defense: 50,
    dexterity: 50,
    fleeRate: 50,
    ...options,
  })
}
function makeEnemy(options: Parameters<typeof makeEnemyRecord>[0] = {}) {
  return makeEnemyRecord({
    health: 100,
    idleFrames: 1,
    idleAnimSpeed: 1,
    attackStrength: 10,
    magicStrength: 0,
    fleeRate: 0,
    ...options,
  })
}

function bootstrap(options: Parameters<typeof startTestBattle>[0] = {}) {
  const fixture = startTestBattle({
    roles: [makeRole()],
    enemies: [makeEnemy({ health: 60000 })],
    ...options,
  })
  return { ...fixture, emptyInput: battleInput() }
}

describe('D17a 时间线驱动 — player 物理攻击', () => {
  it('攻击后多 tick:currentActionIndex 不变(播放中)+ battleAnim.idx 递增;播完 ++ 且复位', () => {
    const { gs, bus, emptyInput } = bootstrap({ roles: [makeRole({ dexterity: 100 })] })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    const state = gs.battleState!
    state.pendingActions.set(0, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus) // selectAction → performAction(actionQueue built)
    expect(state.actionQueue[0], 'this test requires the player action first').toMatchObject({
      isEnemy: false,
      idx: 0,
    })

    const enemyHpBefore = state.enemies[0]!.e.health
    // The selected queue has a proven player-first entry; the animation must belong to it.
    let started = false
    let safety = 50
    while (!started && safety-- > 0 && gs.battleState?.phase === 'performAction') {
      tickBattle(gs, emptyInput, bus)
      if (gs.battleState?.battleAnim) {
        started = true
        break
      }
    }
    expect(started, 'player 攻击应建时间线').toBe(true)

    const s = gs.battleState!
    expect(s.currentActionIndex).toBe(0)
    expect(s.enemies[0]!.e.health).toBeLessThan(enemyHpBefore)
    const idxAtStart = s.currentActionIndex
    const animIdx0 = s.battleAnim!.idx
    // 记 player fighter posOriginal
    const playerOrig = { ...s.players[0]!.posOriginal! }

    // 播放中:连续 tick → currentActionIndex 不变;battleAnim.idx 单调不减
    let prevAnimIdx = animIdx0
    let sawAdvance = false
    let guard = 60
    while (s.battleAnim && guard-- > 0) {
      tickBattle(gs, emptyInput, bus)
      if (!s.battleAnim) break
      expect(s.currentActionIndex).toBe(idxAtStart) // 播放中不推进
      expect(s.battleAnim.idx).toBeGreaterThanOrEqual(prevAnimIdx)
      if (s.battleAnim.idx > animIdx0) sawAdvance = true
      prevAnimIdx = s.battleAnim.idx
    }
    expect(sawAdvance, 'battleAnim.idx 应递增过').toBe(true)
    // 播完:battleAnim 清空 + currentActionIndex 推进
    expect(s.battleAnim).toBeUndefined()
    expect(s.currentActionIndex).toBe(idxAtStart + 1)
    // 复位:player pos == posOriginal,iColorShift == 0
    expect(s.players[0]!.pos).toEqual(playerOrig)
    expect(s.players[0]!.iColorShift).toBe(0)
    // 目标 enemy 也复位 iColorShift==0 + pos==posOriginal
    expect(s.enemies[0]!.iColorShift).toBe(0)
    expect(s.enemies[0]!.pos).toEqual(s.enemies[0]!.posOriginal)
  })
})

describe('actions without timelines advance immediately', () => {
  it('defend action:battleAnim 仍 undefined + currentActionIndex 立刻 ++', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // → selectAction
    const state = gs.battleState!
    state.pendingActions.set(0, { type: 'defend', target: -1 })
    tickBattle(gs, emptyInput, bus) // → performAction

    // 找到 player 的 queue 位,执行 defend 那 tick:battleAnim 必须保持 undefined
    let guard = 30
    let observedDefendTick = false
    while (gs.battleState?.phase === 'performAction' && guard-- > 0) {
      const before = gs.battleState.currentActionIndex
      tickBattle(gs, emptyInput, bus)
      const st = gs.battleState
      if (!st) break
      // defend 不建时间线 → 每个非攻击 action tick 后 battleAnim 仍 undefined
      if (st.players[0]!.defending && st.phase === 'performAction') {
        observedDefendTick = true
        expect(st.battleAnim).toBeUndefined()
        expect(st.currentActionIndex).toBe(before + 1) // 即时推进
        break
      }
    }
    expect(observedDefendTick).toBe(true)
  })

  it('pass action(enemy 死)不卡:phase 正常推进到 postAction', () => {
    // 1 只 enemy hp=1,player attackStrength 巨大 → 一击秒;之后 enemy 行动变 pass(死敌 skip)
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1 })],
      roles: [makeRole({ id: 0, attackStrength: 9999 })],
    })
    tickBattle(gs, emptyInput, bus) // → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    // 跑到战斗结束 — 不应死循环
    let guard = 300
    while (gs.mode === 'battle' && guard-- > 0) {
      const st = gs.battleState
      if (st?.phase === 'selectAction') st.pendingActions.set(0, { type: 'attack', target: 0 })
      tickBattle(gs, emptyInput, bus)
      bus.drain()
    }
    expect(gs.mode).toBe('explore') // won → finalize,没卡死
  })
})

function makeHealItem(opts: Partial<Item> = {}): Item {
  return {
    id: 1,
    _name: '回血药',
    bitmap: 0,
    price: 0,
    scriptOnUse: 1, // commands[1] 起跑
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      equipable: false,
      throwable: false,
      consuming: true,
      applyToAll: false,
      sellable: true,
      equipableBy: [false, false, false, false, false, false],
    },
    ...opts,
  }
}

describe('濒死队员吃回血道具 — 收尾帧据回血后 HP 复位(对齐 sdlpal fight.c:4385-4406)', () => {
  it('回满血后动画播完,该队员 currentFrame=站立帧 0(非残留濒死帧 1)', () => {
    // maxHP=200 → 濒死阈值 min(100,floor(200/5)=40)=40;hp=10<40 濒死。dex 拉满保证先手,
    // 第一条时间线即玩家吃药(避免敌人先手干扰)。enemy attackStrength=0 不致命。
    const { gs, bus, emptyInput } = bootstrap({
      roles: [makeRole({ id: 0, maxHP: 200, hp: 10, dexterity: 9999 })],
      enemies: [makeEnemy({ id: 100, health: 60000, attackStrength: 0, dexterity: 1 })],
      items: [makeHealItem()],
      // ip1:0x1B 单体(op0=0)回血 9999 → clamp 回满 200
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x1b, operands: [0, 9999, 0] }, { op: 'end' }],
    })
    gs.inventory.push({ itemId: 1, count: 9 })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    gs.battleState!.pendingActions.set(0, {
      type: 'item',
      actionId: 1,
      target: 0,
      targetSide: 'player',
    })
    tickBattle(gs, emptyInput, bus) // selectAction → performAction

    // 推进到玩家吃药时间线建立
    let safety = 50
    while (
      safety-- > 0 &&
      gs.battleState?.phase === 'performAction' &&
      !gs.battleState.battleAnim
    ) {
      tickBattle(gs, emptyInput, bus)
    }
    expect(gs.battleState!.battleAnim, '吃药应建治疗时间线').toBeTruthy()

    // 播完吃药时间线(收尾 performItem 回血 + 复位帧)
    const s = gs.battleState!
    let guard = 120
    while (s.battleAnim && guard-- > 0) tickBattle(gs, emptyInput, bus)

    // 回血确已生效(排除"脚本没跑"的假阴性)
    expect(getBattleLiveRoles(gs)!.roles[0]!.hp).toBe(200)
    // bug:收尾 resetFightersAfterAction 在 performItem(回血)之前跑 → 据旧 HP=10 把 currentFrame
    //   钉成濒死帧 1;别人行动(battleAnim 活跃)时 present 读 p.currentFrame 显示濒死姿,直到自己再行动。
    //   修复后顺序对齐 sdlpal(RunTriggerScript 回血 → UpdateFighters 复位)→ 据 HP=200 复位站立帧 0。
    expect(gs.battleState!.players[0]!.currentFrame).toBe(0)
  })
})
