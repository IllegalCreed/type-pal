/**
 * TEST-GLM-NEW-H-1 / H06 — battle-settlement 当前公开合同补测。
 *
 * buildBattleWonSettlement / tickBattleSettlement / settlementScreenTimeoutMs 在 battle/__tests__
 * 内只有间接推进,无直接断言。本文件按一手真值钉住:
 *  - 屏超时 boss exp 5500ms / 其余 3000ms(battle.c:1048/1218/1272/1324)
 *  - 屏序 exp-cash → per 队员 level-up → hidden-exp-up → learn-magic(battle.c:1025-1328)
 *  - cash 无条件入账(battle.c:1052-1055);战斗 HP/MP 先回写 runtime(battle.c:991 起)
 *  - 首帧不收键(PAL_WaitForAnyKey 语义)、任意键/超时翻屏
 *  - Phase E scriptOnBattleEnd 仅一次(battle.c:1334-1337)→ 半血恢复(battle.c:1342-1372)→ finalize
 */
import type { Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { emptyHSpell, makeHBattle, makeHRole } from '../../__tests__/glm-next-wave/H/harness.js'
import { type CommandBus, createCommandBus } from '../command-bus.js'
import type { BattleResources } from './battle-runtime-context.js'
import {
  buildBattleWonSettlement,
  settlementScreenTimeoutMs,
  tickBattleSettlement,
} from './battle-settlement.js'

const NO_KEY: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
const CONFIRM: InputSnapshot = { held: new Set(), pressed: new Set(['Confirm']), frameNum: 0 }

function makeRes(overrides: Partial<BattleResources> = {}): BattleResources {
  return {
    items: [],
    spells: [],
    magics: [],
    objectMagics: [],
    objectPoisons: [],
    objectPlayers: [],
    enemies: [],
    enemyObjects: [],
    playerRoles: { roles: [] },
    commands: [{ op: 'end' }] satisfies Command[],
    ...overrides,
  }
}

describe('settlementScreenTimeoutMs(battle.c:1048/1218/1272/1324 PAL_WaitForAnyKey)', () => {
  it('exp 屏 boss 5500ms / 普通战 3000ms;升级/隐藏涨点/练成屏一律 3000ms', () => {
    const expBoss: Parameters<typeof settlementScreenTimeoutMs>[0] = {
      kind: 'exp-cash',
      expGained: 1,
      cashGained: 0,
      isBoss: true,
    }
    const expNormal: Parameters<typeof settlementScreenTimeoutMs>[0] = {
      kind: 'exp-cash',
      expGained: 1,
      cashGained: 0,
      isBoss: false,
    }
    expect(settlementScreenTimeoutMs(expBoss)).toBe(5500)
    expect(settlementScreenTimeoutMs(expNormal)).toBe(3000)
    expect(
      settlementScreenTimeoutMs({
        kind: 'level-up',
        data: {
          roleId: 0,
          name: '李逍遥',
          level: { old: 1, cur: 2 },
          hp: { old: 10, oldMax: 100, cur: 100, curMax: 120 },
          mp: { old: 5, oldMax: 20, cur: 20, curMax: 25 },
          attack: { old: 10, cur: 14 },
          magic: { old: 8, cur: 12 },
          defense: { old: 6, cur: 8 },
          dexterity: { old: 9, cur: 11 },
          flee: { old: 3, cur: 5 },
        },
      }),
    ).toBe(3000)
    expect(
      settlementScreenTimeoutMs({
        kind: 'hidden-exp-up',
        data: { roleId: 0, name: '李逍遥', statLabelWord: 49, delta: 1 },
      }),
    ).toBe(3000)
    expect(
      settlementScreenTimeoutMs({
        kind: 'learn-magic',
        data: { roleId: 0, name: '李逍遥', magicName: '天师符法' },
      }),
    ).toBe(3000)
  })
})

describe('buildBattleWonSettlement(battle.c:991-1328 won 首 tick 战果处理)', () => {
  it('不升级:仅 exp-cash 一屏;cash 无条件入账;战斗 HP/MP 先回写 runtime', () => {
    const role = makeHRole(0, { hp: 300, maxHP: 500, mp: 10, maxMP: 40 })
    const { gs, state, playerRoles } = makeHBattle({ roles: [role] })
    state.expGained = 10
    state.cashGained = 50
    state.isBoss = false
    const cashBefore = gs.dwCash

    buildBattleWonSettlement(gs, state, makeRes({ playerRoles, levelUpExp: Array(100).fill(100) }))

    expect(state.settlement?.screens).toEqual([
      { kind: 'exp-cash', expGained: 10, cashGained: 50, isBoss: false },
    ])
    expect(state.settlement?.index).toBe(0)
    expect(state.settlement?.shownMs).toBe(0)
    expect(gs.dwCash).toBe(cashBefore + 50) // battle.c:1052-1055 无条件
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(300) // 战斗受伤回写持久层
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(10)
  })

  it('屏序:exp-cash → level-up → hidden-exp-up → learn-magic(battle.c 逐屏同序)', () => {
    const role = makeHRole(0, { hp: 50, maxHP: 100, mp: 5, maxMP: 40 })
    const { gs, state, playerRoles } = makeHBattle({ roles: [role] })
    // runtime 与 Exp 初值(升级读 runtime;主升级 1→2)
    gs.PlayerRolesRuntime.rgwLevel[0] = 1
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 40
    gs.Exp.rgPrimaryExp[0] = { wExp: 50, wLevel: 1, wCount: 0 }
    // 隐藏经验:health wCount=2 / attack wCount=1 → total 3;health 100×2/3→trunc=66×2=132 ≥100 涨 1 级
    gs.Exp.rgHealthExp[0] = { wExp: 0, wLevel: 0, wCount: 2 }
    gs.Exp.rgAttackExp[0] = { wExp: 0, wLevel: 0, wCount: 1 }
    state.expGained = 100
    state.cashGained = 0
    state.isBoss = false

    buildBattleWonSettlement(
      gs,
      state,
      makeRes({
        playerRoles,
        levelUpExp: Array(100).fill(100),
        levelUpMagic: [[{ level: 2, magic: 349 }]],
        spells: [emptyHSpell(349, '天师符法')],
      }),
    )

    const screens = state.settlement!.screens
    expect(screens.map((s) => s.kind)).toEqual([
      'exp-cash',
      'level-up',
      'hidden-exp-up',
      'learn-magic',
    ])
    const levelUp = screens[1]
    if (levelUp && levelUp.kind === 'level-up') {
      expect(levelUp.data.roleId).toBe(0)
      expect(levelUp.data.level).toEqual({ old: 1, cur: 2 })
      expect(levelUp.data.hp.curMax).toBeGreaterThan(100) // 主升级 maxHP +10~17
      expect(levelUp.data.hp.cur).toBe(levelUp.data.hp.curMax) // 升级回满
    } else {
      expect.unreachable('screens[1] 应为 level-up')
    }
    const hidden = screens[2]
    if (hidden && hidden.kind === 'hidden-exp-up') {
      // E04:隐藏涨点首屏 = CHECK_HIDDEN_EXP 首池 rgHealthExp(statLabelWord 49=体力)
      expect(hidden.data).toMatchObject({ roleId: 0, statLabelWord: 49, delta: 1 })
    } else {
      expect.unreachable('screens[2] 应为 hidden-exp-up')
    }
    const learn = screens[3]
    if (learn && learn.kind === 'learn-magic') {
      expect(learn.data).toMatchObject({ roleId: 0, magicName: '天师符法' })
    } else {
      expect.unreachable('screens[3] 应为 learn-magic')
    }
  })
})

describe('tickBattleSettlement(逐屏等键/超时 + Phase E + 半血收尾)', () => {
  it('首帧不收键;任意键次帧生效;无键 75 tick(3000ms)超时自动翻', () => {
    const { gs, state } = makeHBattle()
    state.settlement = {
      screens: [
        { kind: 'exp-cash', expGained: 1, cashGained: 0, isBoss: false },
        { kind: 'learn-magic', data: { roleId: 0, name: '李逍遥', magicName: 'X' } },
      ],
      index: 0,
      shownMs: 0,
    }
    const res = makeRes()
    const bus: CommandBus = createCommandBus()
    // 首帧(shownMs==40==BATTLE_DT)不收键 —— 防上个动作残留 Confirm 同帧误推
    expect(tickBattleSettlement(state, gs, CONFIRM, res, bus)).toBe(true)
    expect(state.settlement!.index).toBe(0)

    // 无键累计(重置首 tick 已走的 40ms):74 tick = 2960ms 不翻;累计 ≥3000ms 自动翻
    state.settlement!.shownMs = 0
    for (let i = 0; i < 74; i++) tickBattleSettlement(state, gs, NO_KEY, res, bus)
    expect(state.settlement!.index).toBe(0)
    tickBattleSettlement(state, gs, NO_KEY, res, bus)
    expect(state.settlement!.index).toBe(1)
    expect(state.settlement!.shownMs).toBe(0)

    // 第二屏:首帧键仍被吞;次帧任意键立即翻
    tickBattleSettlement(state, gs, CONFIRM, res, bus)
    expect(state.settlement!.index).toBe(1)
    tickBattleSettlement(state, gs, CONFIRM, res, bus)
    expect(state.settlement!.index).toBe(2)
  })

  it('屏放完 → Phase E scriptOnBattleEnd 仅跑一次;对话 hold 不收尾;清后 finalize 半血恢复', () => {
    // 战斗 A:Phase E 脚本排入对话 → 验「跑一次」+ hold
    const a = makeHBattle({ roles: [makeHRole(0, { hp: 300, maxHP: 500 })] })
    a.state.settlement = { screens: [], index: 0, shownMs: 0 } // 空屏序列 → 直接进 Phase E
    a.state.enemies[0]!.scriptOnBattleEnd = 1
    a.gs.wCollectValue = 0
    const resDialog = makeRes({
      playerRoles: a.playerRoles,
      commands: [
        { op: 'end' },
        { op: 'showDialog', messageIndex: 0, text: '战利品到手' },
        { op: 'end' },
      ],
    })
    expect(tickBattleSettlement(a.state, a.gs, NO_KEY, resDialog, createCommandBus())).toBe(true)
    expect(a.state.battleDialogQueue?.length).toBe(1) // Phase E 跑了(showDialog 入队)
    expect(a.state.settlement!.postBattleScriptsDone).toBe(true)
    expect(a.gs.battleState).toBeDefined() // 队列非空 → hold 不收尾(finalize 会清 battleState)
    expect(tickBattleSettlement(a.state, a.gs, NO_KEY, resDialog, createCommandBus())).toBe(true)
    expect(a.state.battleDialogQueue?.length).toBe(1) // postBattleScriptsDone 守卫:不再跑(否则 2 行)
    expect(a.gs.battleState).toBeDefined()
    a.state.battleDialogQueue = []
    expect(tickBattleSettlement(a.state, a.gs, NO_KEY, resDialog, createCommandBus())).toBe(true)
    expect(a.gs.battleState).toBeUndefined() // 对话清 → finishBattleWon + finalize

    // 战斗 B:无对话 → Phase E 后直接收尾(半血 + explore + 资源释放)
    const b = makeHBattle({ roles: [makeHRole(0, { hp: 300, maxHP: 500, mp: 10, maxMP: 40 })] })
    b.gs.PlayerRolesRuntime.rgwHP[0] = 300
    b.gs.PlayerRolesRuntime.rgwMaxHP[0] = 500
    b.gs.PlayerRolesRuntime.rgwMP[0] = 10
    b.gs.PlayerRolesRuntime.rgwMaxMP[0] = 40
    b.state.enemies[0]!.scriptOnBattleEnd = 1
    b.state.enemies[0]!.e.collectValue = 7
    b.state.settlement = { screens: [], index: 0, shownMs: 0 }
    b.state.phaseStallTicks = 999
    expect(
      tickBattleSettlement(
        b.state,
        b.gs,
        NO_KEY,
        makeRes({
          playerRoles: b.playerRoles,
          commands: [
            { op: 'end' },
            { op: 'raw', opcode: 0x33, operands: [0, 0, 0] },
            { op: 'end' },
          ],
        }),
        createCommandBus(),
      ),
    ).toBe(true)
    // battle.c:1342-1372 PAL_CLASSIC 半血:HP 300+⌊200/2⌋=400;MP 10+⌊30/2⌋=25
    expect(b.gs.PlayerRolesRuntime.rgwHP[0]).toBe(400)
    expect(b.gs.PlayerRolesRuntime.rgwMP[0]).toBe(25)
    expect(b.gs.mode).toBe('explore')
    expect(b.gs.battleState).toBeUndefined()
    expect(b.gs.fAutoBattle).toBe(false)
  })
})
