import type { AbstractKey, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState } from '../core/game-state.js'
import { createInGameMenu } from '../core/menu/in-game-menu.js'
import { openMenu, tickMenu } from '../core/menu/menu-mode.js'
import { walkableTilemap } from './__tests__/loop-tilemap.js'
import { ReplayInputSource } from './input.js'
import type { LoopContext } from './main-loop.js'
import { tickN } from './main-loop.js'

function menuSnapshot(
  held: AbstractKey[],
  pressed: AbstractKey[],
  frameNum: number,
): InputSnapshot {
  return { held: new Set(held), pressed: new Set(pressed), frameNum }
}

function menuLoopContext(input: ReplayInputSource): {
  ctx: LoopContext
  gs: ReturnType<typeof createInitialGameState>
} {
  // 与 main-loop 行走用例使用相同合法起点,flat 全通 tilemap。
  const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' })
  const ctx: LoopContext = {
    gs,
    bus: createCommandBus(),
    input,
    tilemap: walkableTilemap(20, 20),
    onPresent: () => {},
  }
  return { ctx, gs }
}
describe('menu input freezes and resumes world movement', () => {
  it('菜单打开期间按住右:party 冻结在原地,hub 光标吃掉输入(cursor 0→1)', () => {
    const input = new ReplayInputSource([
      menuSnapshot(['Right'], ['Right'], 0),
      menuSnapshot(['Right'], [], 1),
      menuSnapshot(['Right'], [], 2),
    ])
    const { ctx, gs } = menuLoopContext(input)
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

  it('菜单按 Menu 关闭后,下一 tick 起方向输入恢复驱动 party(2 步 East)', () => {
    const input = new ReplayInputSource([
      menuSnapshot(['Right'], ['Right'], 0),
      menuSnapshot(['Right'], ['Right'], 1),
    ])
    const { ctx, gs } = menuLoopContext(input)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })

    // 关菜单走真实帧 caller tickMenu(Menu → 关 hub → 栈空 → resumeAfterMenusClosed 切 explore)
    tickMenu(gs, menuSnapshot([], ['Menu'], 0))
    expect(gs.menuStack).toHaveLength(0)
    expect(gs.mode).toBe('explore')

    tickN(2, ctx)
    // 锁释放:Right 行走恢复(scene.c:804 East +16/+8 ×2);若 resume 误切非 explore,则整程不走或少走
    expect(gs.party.x).toBe(16 * 16 + 2 * 16)
    expect(gs.party.y).toBe(16 * 8 + 2 * 8)
  })
})
