/**
 * TEST-GLM-PHASE1-LEAVES-3 L01（primitives.ts）— 去重表：
 *  - __tests__/primitives.test（defaultCursor clamp/环绕/停 disabled/pageOffset 推进/Confirm/Triple/Switch 主干）→ 不重复
 *  - primitives.boundaries.test（空表/单项/入参不改写/跨页视窗）→ 不重复
 *  - 新差异：test-only pageUp/pageDown 的查找/钳制现状、全 disabled 的现状落点、
 *    负 defaultCursor 归 0、TripleMenu 自定义 defaultSel 环绕、SwitchMenu current 越上界 clamp、
 *    空 getSelected undefined、primitive 透传 rightText 不消费（同一对象 identity）。
 * PAL_ReadMenu(ui.c:510-572)只对应逐项移动；没有 PgUp/PgDn 分支。
 * pageUp/pageDown 当前无生产 caller；以下为现状特征，不证明 SDLPal 机制或期望产品行为。
 */
import { describe, expect, it } from 'vitest'
import {
  createConfirmMenu,
  createSelectionMenu,
  createSwitchMenu,
  createTripleMenu,
  getSelected,
  moveTripleDown,
  pageDown,
  pageUp,
  type SelectionMenuItem,
  switchLeft,
} from './primitives.js'

describe('L01 test-only pageUp/pageDown 查找与钳制现状', () => {
  it('pageDown 目标位 disabled → 落点被钳回目标位（target 钳制优先于跳过禁用）', () => {
    // C5 更正(2026-10-15)：原 fixture target=2 是 enabled，"跳禁用"路径从未执行，标题与
    // 行为不符。真实语义：findNextSelectable 越过 target 找到的可选项(3)会被
    // `if (cursor > target) cursor = target` 钳回 disabled 的 target —— 与 pageUp 方向
    // 不对称（pageUp 只从下方钳，可越过 disabled target 落到其后可选项，见下一条）。
    // 本测试钉住当前真实行为；仅当环绕找到 <target 的可选项时跳过才生效（见环绕条）。
    const items: SelectionMenuItem[] = [
      { id: 0, label: 'a' },
      { id: 1, label: 'b', disabled: true },
      { id: 2, label: 'c', disabled: true },
      { id: 3, label: 'd' },
    ]
    const s = createSelectionMenu(items, 2)
    pageDown(s) // target = min(3, 0+2) = 2（disabled）；skip 找到 3 但被钳回 2
    expect(s.cursor).toBe(2)
    expect(getSelected(s)?.disabled).toBe(true)
  })

  it('pageDown 目标位及之后全 disabled → 环绕回前面可选项', () => {
    const items: SelectionMenuItem[] = [
      { id: 0, label: 'a' },
      { id: 1, label: 'b', disabled: true },
      { id: 2, label: 'c', disabled: true },
    ]
    const s = createSelectionMenu(items, 2)
    pageDown(s) // target = 2；从 1 向后找 → 环绕到 0
    expect(s.cursor).toBe(0)
  })

  it('pageUp 目标位 disabled → 落到其后第一个可选项（pageUp 方向可越过 disabled target）', () => {
    const items: SelectionMenuItem[] = [
      { id: 0, label: 'a' },
      { id: 1, label: 'b', disabled: true },
      { id: 2, label: 'c' },
      { id: 3, label: 'd' },
    ]
    const s = createSelectionMenu(items, 2)
    s.cursor = 3
    pageUp(s) // target = max(0, 3-2) = 1（disabled）；从 0 向后找可选 → 2
    expect(s.cursor).toBe(2)
    expect(getSelected(s)?.id).toBe(2)
  })

  it('全 disabled 时返回 target-1，再由各自边界钳制（现状记录）', () => {
    const items: SelectionMenuItem[] = [
      { id: 0, label: 'a', disabled: true },
      { id: 1, label: 'b', disabled: true },
      { id: 2, label: 'c', disabled: true },
      { id: 3, label: 'd', disabled: true },
    ]
    const s = createSelectionMenu(items, 2)
    pageDown(s) // findNextSelectable 无可选 → 返回 from=target-1；pageDown 只钳上界不抬
    expect(s.cursor).toBe(1)
    s.cursor = 3
    pageUp(s) // target = 1；无可选 → 返回 0；pageUp 钳下界 → 抬回 target
    expect(s.cursor).toBe(1)
  })
})

describe('L01 primitives 零散边界', () => {
  it('负 defaultCursor 归 0（Math.max 下界分支）', () => {
    const s = createSelectionMenu(
      [
        { id: 1, label: 'a' },
        { id: 2, label: 'b' },
      ],
      8,
      -3,
    )
    expect(s.cursor).toBe(0)
  })

  it('空菜单 getSelected 返回 undefined', () => {
    expect(getSelected(createSelectionMenu([]))).toBeUndefined()
  })

  it('createTripleMenu 自定义 defaultSel=2，Down 环绕回 0', () => {
    const s = createTripleMenu(['上', '下', '取消'], 2)
    expect(s.selection).toBe(2)
    moveTripleDown(s)
    expect(s.selection).toBe(0)
  })

  it('createSwitchMenu current 越上界 clamp 到末项', () => {
    const s = createSwitchMenu(['a', 'b', 'c'], 5)
    expect(s.current).toBe(2)
    switchLeft(s)
    expect(s.current).toBe(1)
  })

  it('ConfirmMenu 保存原文 message', () => {
    expect(createConfirmMenu('要存档吗？', false)).toEqual({
      message: '要存档吗？',
      selection: 'no',
    })
  })

  it('SwitchMenu 保留非零初始 current', () => {
    expect(createSwitchMenu(['关', '开'], 1).current).toBe(1)
  })

  it('primitive 透传 rightText 不消费：getSelected 返回同一 item 对象（identity）', () => {
    const items: SelectionMenuItem[] = [
      { id: 1, label: '草药', rightText: '×3' },
      { id: 2, label: '木剑', rightText: '×1' },
    ]
    const s = createSelectionMenu(items, 8)
    expect(s.items).toBe(items) // 不复制数组
    expect(getSelected(s)).toBe(items[0]) // 同一对象引用
    expect(getSelected(s)?.rightText).toBe('×3') // primitive 层不解析 rightText
  })
})
