/** TEST-GLM-GAME-DIALOGUE-PAGINATION-1 — 对话分页/等待输入/边界文本合同(GLM r1)。
 *
 * 范围:`event-system.ts` 公开分页/推进 caller(tickEventSystem 驱动的 dialogBox 相位机;
 * 卡面 `event-dialogue-pagination.ts` 为本测试家族名,分页实体在 event-system.ts +
 * present/dialog-box.ts,同 AssetInspectorTabs 判例)。
 *
 * 旧证去重(逐项锚点见 docs/ops/evidence/TEST-GLM-GAME-DIALOGUE-PAGINATION-1/dedup-ledger.md):
 * - event-dialogue-pagination.test.ts:跨页第 5 行保留 / 三样式连续翻页无漏行 / 分页边界接续副作用;
 * - event-system.test.ts:Confirm 释放 end-key(366)、`~` 收尾全程不等键(386)、快按 Confirm
 *   连锁停段末(508)、pendingStyle 翻页(596)、0x05 翻页(2262/2911)、DM20/21 首行 $00(1281)、
 *   narration 任意键(3653);
 * - event-system.cov85.test.ts:577 end 前 count>0 等 end-key / count=0 直接清(手搭 box);
 * - dialog-box.test.ts:confirmDialog 四态 / userSkip 复位 / shouldWaitPageKey(单元层直调)。
 * 本文件只补 tick 层未证轴:DM18 等键/跳字键集、恰 4 行末页边界、段中空行占页位、
 * 跳字连锁停在翻页边界与新页复位。
 */

import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { createCommandBus } from './command-bus.js'
import { buildLabelMap, tickEventSystem } from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

// 24 字 ≈ 24ms/字 × 24 = 576ms 打字时间,100ms/tick 下需要 6 tick 才打完 → 可稳定观察 typing 相位。
const LONG_LINE = '这是一句二十四字的长对话用来保证打字需要好几个帧'

function startRun(commands: Command[]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.mode = 'event'
  gs.nowMs = 1000
  gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
  return gs
}

/** 单逻辑帧:墙钟 +100ms(同 event-system.test tickWithTime 语义)+ 真命令总线。 */
function step(gs: GameState, pressed: AbstractKey[] = []): void {
  gs.nowMs += 100
  const input: InputSnapshot = {
    held: new Set(),
    pressed: new Set(pressed),
    frameNum: Math.floor(gs.nowMs / 100),
  }
  tickEventSystem(gs, input, createCommandBus())
}

function dialogLines(
  prefix: string,
  count: number,
  startMessageIndex = 0,
  startDigit = 0,
): Command[] {
  const digits = ['一', '二', '三', '四', '五', '六', '七', '八']
  return Array.from({ length: count }, (_, i): Command => {
    const text = `${prefix}${digits[startDigit + i]}句`
    return { op: 'showDialog', messageIndex: startMessageIndex + i, text }
  })
}

/** 无键推进直到 dialogBox 进入指定相位(或超界返回),供边界观察。 */
function stepUntilPhase(gs: GameState, phase: string, maxTicks = 60): number {
  for (let tick = 0; tick < maxTicks; tick++) {
    if (gs.dialogBox?.phase === phase) return tick
    step(gs)
  }
  return -1
}

describe('TEST-GLM-GAME-DIALOGUE-PAGINATION-1', () => {
  test('DM18 翻页等键吞任意键:Cancel/Down 与 Confirm 同效翻页,第 5 行独占新页(event-system.ts:1708-1715,text.c:1433)', () => {
    for (const key of ['Cancel', 'Down'] as const) {
      const gs = startRun([...dialogLines('甲', 4), ...dialogLines('乙', 1, 4, 4), { op: 'end' }])
      // 无键打完前 4 行 → 第 5 行 showDialog 触发 waiting-page-key(ip 保留在第 5 行上)
      expect(stepUntilPhase(gs, 'waiting-page-key')).toBeGreaterThanOrEqual(0)
      expect(gs.eventCursor?.ip).toBe(4) // 第 5 条 showDialog 未被消费
      expect(gs.dialogBox?.shownLines).toEqual(['甲一句', '甲二句', '甲三句'])
      expect(gs.dialogBox?.currentLineText).toBe('甲四句')
      // 非 Confirm 键同样翻页:text.c:1433 等键期 dwKeyPress!=0 吞任意键
      step(gs, [key])
      expect(gs.dialogBox?.phase).toBe('typing') // 翻页后第 5 行重新开始打字
      expect(gs.dialogBox?.shownLines).toEqual([]) // 新页从空 body 起
      expect(gs.dialogBox?.currentLineText).toBe('乙五句') // 保留的 ip 重入本条 showDialog
      expect(gs.eventCursor?.waiting).toBe('dialog')
    }
  })

  test('末页边界:恰 4 行后遇 end 只等段末键(不触发翻页键),末页 3 行 Confirm 关闭(event-system.ts:1879-1890,script.c:3475)', () => {
    const lines = [...dialogLines('甲', 4), ...dialogLines('乙', 3, 4, 4)]
    const gs = startRun([...lines, { op: 'end' }])
    let pageKeyHits = 0
    // 只在翻页等键时按 Confirm,段末键到来即停;段中 typing 不按键
    for (let tick = 0; tick < 60 && gs.dialogBox?.phase !== 'waiting-end-key'; tick++) {
      if (gs.dialogBox?.phase === 'waiting-page-key') {
        pageKeyHits++
        step(gs, ['Confirm'])
      } else {
        step(gs)
      }
    }
    // 恰 4 行边界:第 5 个 op 是 end 而非 showDialog → 走段末键,不再翻页
    expect(pageKeyHits).toBe(1)
    expect(gs.dialogBox?.phase).toBe('waiting-end-key')
    expect(gs.dialogBox?.shownLines).toEqual(['乙五句', '乙六句']) // 末页是不满 4 行的残页
    expect(gs.dialogBox?.currentLineText).toBe('乙七句')
    expect(gs.dialogBox?.dialogLineCount).toBe(3)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(
      lines.map((cmd) => (cmd.op === 'showDialog' ? cmd.text : '')),
    )
    // Confirm 关闭段末 → end 收尾清 cursor 回 explore
    step(gs, ['Confirm'])
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })

  test('DM18 反向:typing 中 Cancel/Up 不跳字,相位/已显字数/ip 全不动(event-system.ts:1712-1714,text.c:1602 kKeySearch|kKeyMenu)', () => {
    for (const key of ['Cancel', 'Up'] as const) {
      const gs = startRun([{ op: 'showDialog', messageIndex: 0, text: LONG_LINE }, { op: 'end' }])
      step(gs) // tick1:typing,0-1 字
      expect(gs.dialogBox?.phase).toBe('typing')
      step(gs, [key]) // tick2:非跳字键 → 不瞬显
      expect(gs.dialogBox?.phase).toBe('typing') // 仍逐字
      expect(gs.dialogBox?.charsRevealed).toBeLessThan(LONG_LINE.length)
      expect(gs.dialogBox?.userSkip).toBeFalsy()
      expect(gs.eventCursor?.ip).toBe(0) // 仍在首条 showDialog 上
      expect(gs.eventCursor?.waiting).toBe('dialog')
    }
  })

  test('DM18 跳字键集:typing 中 Menu(kKeyMenu)与 Confirm 同效瞬显并连锁到段末等键(event-system.ts:1712-1714,text.c:1602)', () => {
    const gs = startRun([{ op: 'showDialog', messageIndex: 0, text: LONG_LINE }, { op: 'end' }])
    step(gs) // typing
    step(gs, ['Menu']) // Menu = kKeyMenu 跳字 → fUserSkip 同帧连锁推进过本行
    expect(gs.dialogBox?.charsRevealed).toBe(LONG_LINE.length) // 整行瞬显
    expect(gs.dialogBox?.userSkip).toBe(true) // fUserSkip 置位(跨行语义)
    expect(gs.eventCursor?.ip).toBe(1) // 同 tick 连锁推进到 end(段末等键本体属 Confirm 轴,Bug2 已证)
    expect(gs.eventCursor?.waiting).toBe('dialog')
  })

  test('空页位:$00 段中空行占一页行位,翻页边界提前到第 4 真行;空行不入历史(event-system.ts:2017-2040,text.c:1745-1746 行计数无条件 ++)', () => {
    const gs = startRun([
      { op: 'showDialog', messageIndex: 0, text: '甲起句' },
      { op: 'showDialog', messageIndex: 1, text: '$00' }, // 纯控制符行:占一空行 + 瞬显变速
      { op: 'showDialog', messageIndex: 2, text: '乙二句' },
      { op: 'showDialog', messageIndex: 3, text: '乙三句' },
      { op: 'showDialog', messageIndex: 4, text: '乙四句' },
      { op: 'end' },
    ])
    expect(stepUntilPhase(gs, 'waiting-page-key')).toBeGreaterThanOrEqual(0)
    // 空行占据第 2 行位:3 真行 + 1 空行 = 满 4 行 → 第 4 真行(乙四句)触发翻页
    expect(gs.eventCursor?.ip).toBe(4)
    expect(gs.dialogBox?.shownLines).toEqual(['甲起句', '', '乙二句'])
    expect(gs.dialogBox?.currentLineText).toBe('乙三句')
    // 空行不进历史(纯控制符分支不入 pushDialogHistory;历史只含已消费真行)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(['甲起句', '乙二句', '乙三句'])
    step(gs, ['Confirm'])
    expect(gs.dialogBox?.shownLines).toEqual([]) // 翻页清 body
    expect(gs.dialogBox?.currentLineText).toBe('乙四句') // 保留 ip 重入
    expect(gs.dialogBox?.dialogLineCount).toBe(1) // 新页行计数从 0 重计
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual([
      '甲起句',
      '乙二句',
      '乙三句',
      '乙四句',
    ])
  })

  test('L2 跳字连锁停在翻页边界:Confirm 一次瞬显前 4 行、第 5 行保留 ip 等键;翻页后 userSkip 复位新页重新逐字(event-system.ts:2053-2058,dialog-box.ts:594-595,text.c:1447/1607)', () => {
    const digits = ['一', '二', '三', '四', '五', '六', '七', '八']
    const texts = digits.map((digit) => `${LONG_LINE}${digit}`)
    const lines = texts.map((text, i): Command => ({ op: 'showDialog', messageIndex: i, text }))
    const gs = startRun([...lines, { op: 'end' }])
    step(gs) // tick1:第 1 行 typing
    step(gs, ['Confirm']) // 跳字 → fUserSkip 连锁瞬显 2-4 行 → 第 5 行撞满页停在翻页等键
    expect(gs.dialogBox?.phase).toBe('waiting-page-key')
    expect(gs.eventCursor?.ip).toBe(4) // 连锁停在未消费的第 5 条 showDialog 上
    expect(gs.dialogBox?.shownLines).toEqual([texts[0], texts[1], texts[2]])
    expect(gs.dialogBox?.currentLineText).toBe(texts[3])
    expect(gs.dialogBox?.userSkip).toBe(true) // 翻页前 fUserSkip 仍在
    step(gs, ['Confirm']) // 翻页:page-advance 复位 fUserSkip + 清 body + 重入第 5 行
    expect(gs.dialogBox?.userSkip).toBe(false) // text.c:1447 翻页等键后复位
    expect(gs.dialogBox?.phase).toBe('typing')
    expect(gs.dialogBox?.charsRevealed).toBe(0) // 新页第 5 行从头逐字
    expect(gs.dialogBox?.shownLines).toEqual([])
    expect(gs.dialogBox?.currentLineText).toBe(texts[4])
    step(gs) // 再一帧:逐字真的在推进(非瞬显、非冻结)
    expect(gs.dialogBox?.charsRevealed).toBeGreaterThan(0)
    expect(gs.dialogBox?.charsRevealed).toBeLessThan(texts[4]!.length)
  })
})
