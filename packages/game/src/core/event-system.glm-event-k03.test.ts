/**
 * TEST-GLM-EVENT-WAVE-K-1 · K03 物品、金钱、商店及队伍状态
 *
 * 审计行(组 K03):
 * - 现行 caller:mode.ts:63(tickEventSystem 撞 0x26/0x27 → waiting='shop' 切 menu;菜单关闭由
 *   menu-mode resume 清 waiting 切回 'event')、event-system.ts:2196-2206(shop opcode 内联分支)、
 *   bootstrap setShopMenuHandler 注入。
 * - 旧测证据(排重):
 *   - core/menu/shop-menu.test.ts:131-140 `0x0026 → 开 shop-buy menu + waiting=shop + mode=menu +
 *     ip 续到下条`(0x26 买侧 handler 合同端到端已证)。
 *   - **0x27 卖出侧 opcode 全仓零断言**(grep OP_SELL_MENU 仅 shop-menu.test.ts import,无用例);
 *   - **handler 未注入的降级 skip(two opcodes)** 零断言(对照同类防御合同:0x07 :1340、
 *     0x37 :5348、0x76 :5480 均有"未注入 → skip + ip++ 不卡死"旧证,shop 侧缺)。
 * - 一手真值:reference/sdlpal/script.c:1157-1173(case 0x0026 `PAL_BuyMenu(operand[0])`;
 *   case 0x0027 `PAL_SellMenu()` —— 阻塞 modal,玩家退出才返回后继续脚本;0x27 **不读 operand**)。
 * - 缺口结论:0x27 handler 合同与 0x26/0x27 无 handler 降级可达且无旧证 → 新增;
 *   0x26 handler 端到端、买卖菜单内部交互、钱/物品结算已证不重做(见 shop-menu.test.ts)。
 */
import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import {
  buildLabelMap,
  OP_BUY_MENU,
  OP_NOOP_A7,
  OP_SELL_MENU,
  type ShopMenuHandlerInput,
  setShopMenuHandler,
  tickEventSystem,
} from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function loadRaw(gs: GameState, ops: Command[]): void {
  gs.eventCursor = { commands: ops, labelMap: buildLabelMap(ops), ip: 0 }
  gs.mode = 'event'
}

describe('K03 opcode 0x27 sellMenu:handler 注入 → mode=sell + waiting=shop + ip 预推进(sdlpal script.c:1168-1173)', () => {
  // 0x27 真值:script.c:1168-1173 `PAL_SellMenu()` **不读 operand**(卖出菜单无 store 概念);
  // bootstrap sell 分支同样忽略 storeNum。故本组不断言卖出侧 storeNum 语义,只用两个合法
  // operand 值作单轴对照,证明 mode/停驻行为与 operand 无关。
  // 0x27 真值:script.c:1168-1173 `PAL_SellMenu()` **不读 operand**(卖出菜单无 store 概念);
  // bootstrap sell 分支同样忽略 storeNum。故本组不断言卖出侧 storeNum 语义,而在同一 it 内用
  // 两个合法 operand 值(4/9)作单轴对照,证明 mode/停驻行为与 operand 无关。
  it('0x27 → handler 一次({mode:sell});cursor 停在 waiting=shop、ip=1;operand 4/9 行为一致(卖出侧不读 operand)', () => {
    for (const operand0 of [4, 9] as const) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const calls: ShopMenuHandlerInput[] = []
      const commands: Command[] = [
        { op: 'raw', opcode: OP_SELL_MENU, operands: [operand0, 0, 0] }, // ip0
        { op: 'raw', opcode: OP_NOOP_A7, operands: [0, 0, 0] }, // ip1:菜单关后从此续跑
        { op: 'end' }, // ip2
      ]
      try {
        setShopMenuHandler((input) => {
          calls.push(input)
        })
        loadRaw(gs, commands)
        tickEventSystem(gs, snap(), createCommandBus())
        // 单次调用;mode='sell' 是菜单开卖出侧的唯一依据(PAL_SellMenu 无 operand 合同)
        expect(calls.length).toBe(1)
        expect(calls[0]?.mode).toBe('sell')
        // 脚本停驻合同:waiting='shop' + ip 已预推进到下一条(菜单关后续跑)
        expect(gs.mode).toBe('event') // 测试 handler 不开菜单,mode 不变(真 handler 由 bootstrap 开)
        expect(gs.eventCursor?.waiting).toBe('shop')
        expect(gs.eventCursor?.ip).toBe(1)
      } finally {
        setShopMenuHandler(null)
      }
    }
  })
})

describe('K03 shop opcode 无 handler 注入:两条 opcode 均降级 skip + ip++(不卡死,对齐 0x07/0x37/0x76 防御合同)', () => {
  it('0x26 与 0x27 同 tick 连续 skip → 无 waiting、脚本跑完回 explore(单轴对照:注入 handler 则停 shop)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const commands: Command[] = [
      { op: 'raw', opcode: OP_BUY_MENU, operands: [1, 0, 0] }, // ip0
      { op: 'raw', opcode: OP_SELL_MENU, operands: [2, 0, 0] }, // ip1
      { op: 'end' }, // ip2
    ]
    try {
      setShopMenuHandler(null) // 显式置空 = bootstrap 未注入(非 bootstrap 路径/测试)
      loadRaw(gs, commands)
      tickEventSystem(gs, snap(), createCommandBus())
      // 两个 shop op 各 skip + ip++,同 tick 跑到 end → 收尾回 explore(若任一 opcode 停驻
      // waiting='shop',这里会停在 'event' + cursor 残留 —— 即上一测的正控形态)
      expect(gs.mode).toBe('explore')
      expect(gs.eventCursor).toBeUndefined()
    } finally {
      setShopMenuHandler(null)
    }
  })
})
