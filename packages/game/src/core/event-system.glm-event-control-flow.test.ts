import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import { buildLabelMap, OP_GOTO_IF_NO, OP_SET_CAMERA, tickEventSystem } from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

/**
 * TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 — 事件解释器控制流残差合同。
 *
 * 排重账(docs/ops/evidence/TEST-GLM-GAME-EVENT-CONTROL-FLOW-1/dedup-ledger.md)结论:
 * runOneAutoOp end/callStack/goto/reset/random-rate/wait、0x7F 主路径(yield/完成/回正/绝对/负数/
 * 0x6E 对)、OP_PLACE_USED_ITEM、0x0A confirm 主流程、goto 缺失终止、ip 越界终止、event-opcode-player
 * 全族均已证(REG);本文件只承接两处全仓零覆盖的新合同:
 *   1) resolveConfirmGoto fail-closed(event-system.ts:3442-3452)——0x0A 否/Cancel 提交时
 *      operand[0] 目标不在 labelMap → 终止脚本 + 清问句 + 回 explore;
 *   2) 0x7F[0,0,0xFFFF] 回正豁免(event-system.ts:2388-2391)——sdlpal script.c:2314 唯一跳过
 *      PAL_MakeScene 的参数组合,空 body 残留 box 与 currentDialogPortraitIcon 保留。
 * fixture 复用旧测 657(scene-145)与 1684(0x0A)的公开 tickEventSystem 真实对话链形态,不碰私有 cursor。
 */

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function loadEvent(gs: GameState, commands: Command[], startIp = 0): void {
  gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: startIp }
  gs.mode = 'event'
}

describe('TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 控制流残差合同', () => {
  it('resolveConfirmGoto fail-closed(3442-3452):0x0A 否提交时 operand[0] 目标不在 labelMap → 清问句 + 终止脚本回 explore(不落是分支)', () => {
    // sdlpal script.c:3382 `wScriptEntry = operand[0]` 无目标保护;TS 侧目标解不出时按
    // goto 越界同款 fail-closed:清 cursor/问句、消费 pendingItem、复位 iCurEquipPart、
    // restoreModeAfterScript,返回 false 让 tickEventSystem 停在本 tick(1637-1639)。
    // 对照:目标在 labelMap 的否分支跳转续跑已证(event-system.test.ts:1663);本合同只钉
    // 目标缺失臂的终止与清理,合法 typed 输入 = 0x0A operand[0] 指向无 L_<n> 标签的 entry。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '要不要' },
      { op: 'raw', opcode: OP_GOTO_IF_NO, operands: [9, 0, 0] }, // L_9 不在 labelMap → fail-closed
      { op: 'showDialog', messageIndex: 1, text: '不该看到' },
      { op: 'end' },
    ])
    // 问句逐字打完自动推进到 0x0A,进 confirm(问句留屏,同旧测 1684 形态)。
    gs.nowMs = 1000
    let enteredConfirm = false
    for (let i = 0; i < 24 && gs.eventCursor !== undefined; i++) {
      gs.nowMs += 100
      tickEventSystem(gs, snap([]), bus)
      if (gs.eventCursor?.waiting === 'confirm') {
        enteredConfirm = true
        break
      }
    }
    expect(enteredConfirm).toBe(true)
    expect(gs.dialogBox?.currentLineText).toBe('要不要') // 前提:问句在屏(confirm 期保留)
    expect(gs.mode).toBe('event')
    // 默认 否 + Confirm 提交 → resolveConfirmGoto 解不出 L_9 → fail-closed 终止。
    gs.nowMs += 100
    tickEventSystem(gs, snap(['Confirm']), bus)
    expect(gs.eventCursor).toBeUndefined() // 脚本终止(不是续跑到 0x0A 之后)
    expect(gs.mode).toBe('explore') // restoreModeAfterScript 收口
    expect(gs.dialogBox).toBeUndefined() // 问句被 clearDialogBoxes 清掉
    expect(gs.dialogBoxKept).toBeUndefined()
    expect(gs.dialogHistory?.some((line) => line.text === '不该看到')).toBe(false) // 是分支未跑
  })

  it('0x7F[0,0,0xFFFF] 回正豁免(2388-2391,script.c:2314):唯一不清屏组合 —— 残留 box/立绘保留,后续无 setDialogStyle 对话 append 继承 portrait 90;[0,0,0] 清屏后新建无立绘', () => {
    // sdlpal script.c:2314:回正(op0==0&&op1==0)且 op2==0xFFFF 时跳过 PAL_MakeScene →
    // 屏上对话像素(问句+立绘)不被重画擦除;其余任何 0x7F 组合都 MakeScene 擦屏。
    // 真数据锚:all.json idx 9001(林天南序列,全库唯一 0x7F[0,0,0xFFFF] 实例,前面是
    // loadScene 40→0x46→0x7F[0,0,0xFFFF]→end advance)。fixture 沿用旧测 657 的 scene-145
    // 五行翻页序列形态(翻页后空 body 残留 box 是唯一能活着见到 0x7F 开火位置的对话状态,
    // pre-op clear 因 body 空不触发),把 idx45 的 [0,0,0] 换成豁免参数,再以一句无
    // setDialogStyle 的后续对话做观察点:豁免 → append 继承 portrait 90;清屏 → 新建无立绘
    // (对照臂与旧测 657 同机制,那里 0x7F 时 box 已不在,本对照补 box 在场变体)。
    for (const [flag, wantPortrait] of [
      [0, undefined],
      [0xffff, 90],
    ] as const) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const bus = createCommandBus()
      gs.party = { x: 300, y: 200, facing: 'down' }
      gs.camera = { x: -999, y: -999 }
      gs.eventCursor = {
        commands: [
          { op: 'setDialogStyleBottom', arg0: 90 }, // 赵灵儿立绘 90
          { op: 'showDialog', messageIndex: 0, text: '我只是丑陋的蛇女' },
          { op: 'showDialog', messageIndex: 1, text: '又失去化成人形的能力' },
          { op: 'showDialog', messageIndex: 2, text: '活着对我来说．．已经' },
          { op: 'showDialog', messageIndex: 3, text: '没有意义' },
          { op: 'showDialog', messageIndex: 4, text: '你．．又何必犯险来救我~80' }, // 第 5 行 → 翻页
          { op: 'raw', opcode: OP_SET_CAMERA, operands: [0, 0, flag] },
          { op: 'showDialog', messageIndex: 5, text: '第二句观察' }, // 观察点:append vs 新建
          { op: 'end' },
        ],
        labelMap: {},
        ip: 0,
      }
      gs.mode = 'event'
      let lingerPortrait: number | undefined
      let observed = false
      for (let i = 0; i < 200 && gs.eventCursor !== undefined; i++) {
        gs.nowMs += 100
        tickEventSystem(gs, snap(['Confirm']), bus)
        if (gs.eventCursor?.waiting === 'delay') gs.eventCursor.delayUntilMs = 0
        if (gs.dialogBox?.currentLineText?.includes('蛇女'))
          lingerPortrait = gs.dialogBox.portraitIcon
        if (gs.dialogBox?.currentLineText === '第二句观察') {
          observed = true
          expect(gs.camera).toEqual({ x: 140, y: 88 }) // 两臂都回正(party-(160,112))
          expect(gs.dialogBox.portraitIcon).toBe(wantPortrait) // ★豁免边界:90 保留 vs undefined 清空
          break
        }
      }
      expect(lingerPortrait).toBe(90) // 前提:立绘阶段正常显示 90
      expect(observed).toBe(true)
    }
  })
})
