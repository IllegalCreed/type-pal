// TEST-GLM-GAME-MENU-SAVE-IO-1 — 菜单 modal 输入锁(main-loop 公开入口 tickN)。
//
// 合同:菜单打开期间方向输入只驱动菜单、不移动 party(世界冻结);菜单关闭后下一 tick
// 方向输入恢复驱动 party(锁释放)。caller 是 main-loop 的 headless 公开入口 tickN
// (singleTick → tickByMode → case 'menu' → tickMenu),与浏览器 startRafLoop 共用 singleTick。
// 旳 main-loop.test.ts 只证 explore 行走与 interval/present 门控;menu-mode.test.ts 只经
// tickMenu 证栈语义 —— 「菜单期间世界冻结 + 关闭后恢复行走」的整链未在任何旧测证明。
import type { AbstractKey, InputSnapshot, Tilemap } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState } from '../core/game-state.js'
import { createInGameMenu } from '../core/menu/in-game-menu.js'
import { openMenu, tickMenu } from '../core/menu/menu-mode.js'
import { ReplayInputSource } from './input.js'
import { type LoopContext, tickN } from './main-loop.js'

function flat(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tileset: 'fake' }
}

function snap(held: AbstractKey[], pressed: AbstractKey[], frameNum: number): InputSnapshot {
  return { held: new Set(held), pressed: new Set(pressed), frameNum }
}

function mkCtx(input: ReplayInputSource): {
  ctx: LoopContext
  gs: ReturnType<typeof createInitialGameState>
} {
  // 起点 col16/row16 合法区(main-loop.test.ts:41 已证可走),flat 全通 tilemap。
  const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' })
  const ctx: LoopContext = {
    gs,
    bus: createCommandBus(),
    input,
    tilemap: flat(20, 20),
    eventCommands: [],
    labelMap: {},
    onPresent: () => {},
  }
  return { ctx, gs }
}

describe('TEST-GLM-GAME-MENU-SAVE-IO-1 菜单 modal 输入锁(tickN 整链)', () => {
  it('MSIO-A1 菜单打开期间按住右:party 冻结在原地,hub 光标吃掉输入(cursor 0→1)', () => {
    const input = new ReplayInputSource([
      snap(['Right'], ['Right'], 0),
      snap(['Right'], [], 1),
      snap(['Right'], [], 2),
    ])
    const { ctx, gs } = mkCtx(input)
    const hub = createInGameMenu()
    openMenu(gs, { kind: 'in-game', state: hub })
    expect(gs.mode).toBe('menu')

    tickN(3, ctx)

    // 世界冻结:3 tick 按住右,party 一步未走(菜单 modal 锁;若 mode 路由漏锁则 East 步进 +16/+8×3)
    expect(gs.party.x).toBe(16 * 16)
    expect(gs.party.y).toBe(16 * 8)
    // 输入仍达菜单:首帧 pressed Right → inGameMenuDown(DL21 右=下),cursor 0(状态)→1(仙术)
    expect(hub.selection.cursor).toBe(1)
    // 菜单态保持,未被动过栈
    expect(gs.menuStack).toHaveLength(1)
    expect(gs.mode).toBe('menu')
  })

  it('MSIO-A2 菜单按 Menu 关闭后,下一 tick 起方向输入恢复驱动 party(2 步 East)', () => {
    const input = new ReplayInputSource([
      snap(['Right'], ['Right'], 0),
      snap(['Right'], ['Right'], 1),
    ])
    const { ctx, gs } = mkCtx(input)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })

    // 关菜单走真实帧 caller tickMenu(Menu → 关 hub → 栈空 → resumeAfterMenusClosed 切 explore)
    tickMenu(gs, snap([], ['Menu'], 0), ctx.bus)
    expect(gs.menuStack).toHaveLength(0)
    expect(gs.mode).toBe('explore')

    tickN(2, ctx)
    // 锁释放:Right 行走恢复(scene.c:804 East +16/+8 ×2);若 resume 误切非 explore,则整程不走或少走
    expect(gs.party.x).toBe(16 * 16 + 2 * 16)
    expect(gs.party.y).toBe(16 * 8 + 2 * 8)
  })
})
