// C5(2026-10-15) 重写：真实 GameState（createInitialGameState）替代 as never 残缺对象；
// fake timers + afterEach 清理 toast 容器与计时器；补 preventDefault / 解绑 / 三条异步
// 反馈 oracle（save reject、load false、load reject）。相邻 tools/toast.test.ts 证明
// 展示原语；本文件证明 quick-save 的时机门与反馈选择，不重复像素级断言。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState, type GameState } from '../core/game-state.js'
import { canQuickSave, type QuickSaveDeps, setupQuickSave } from './quick-save.js'

const CONTAINER_ID = 'tp-toast-container'

/** 真实初始 GameState（mode='explore'/无对话/空栈 = 可快存形态），可选字段覆盖。 */
function exploreGs(over: Partial<GameState> = {}): GameState {
  return Object.assign(createInitialGameState({ x: 0, y: 0, facing: 'down' }), over)
}

function mkDeps(over: Partial<QuickSaveDeps> = {}): QuickSaveDeps {
  return {
    getGs: () => exploreGs(),
    saveSlot: vi.fn(async () => {}),
    loadSlotIntoGame: vi.fn(async () => true),
    ...over,
  }
}

let dispose: (() => void) | undefined
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.getElementById(CONTAINER_ID)?.remove() // 清 toast 容器 DOM
  vi.clearAllTimers() // 清未走完的 2s/220ms 计时器
  vi.useRealTimers()
})

/** 派键并推进微任务，让 fire-and-forget 的 doQuickSave/Load 跑到 toast。
 * cancelable:true 必须显式给 —— KeyboardEvent 默认不可取消,preventDefault 无效。 */
async function press(code: 'F5' | 'F9'): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', { code, cancelable: true })
  window.dispatchEvent(event)
  await vi.advanceTimersByTimeAsync(0)
  return event
}

function toastText(): string {
  return document.getElementById(CONTAINER_ID)?.textContent ?? ''
}

describe('quick-save', () => {
  it('canQuickSave:explore 无对话无菜单 → true;战斗/对话/菜单 → false', () => {
    expect(canQuickSave(exploreGs())).toBe(true)
    expect(canQuickSave(exploreGs({ mode: 'battle' }))).toBe(false)
    expect(
      canQuickSave(
        exploreGs({
          dialogBox: {
            titleText: undefined,
            shownLines: [],
            currentLineText: '在',
            typingFrames: 0,
            charsRevealed: 0,
            dialogLineCount: 1,
            phase: 'typing',
            style: 'bottom',
            fontColor: 0x4f,
            shadow: true,
            keyIconBlink: false,
          },
        }),
      ),
    ).toBe(false)
    expect(
      canQuickSave(
        exploreGs({
          menuStack: [
            {
              kind: 'in-game',
              state: { selection: { items: [], cursor: 0, pageSize: 2, pageOffset: 0 } },
            },
          ],
        }),
      ),
    ).toBe(false)
  })

  it('F5 可存态 → saveSlot(1, gs) + 成功 toast;F5/F9 均 preventDefault', async () => {
    const saveSlot = vi.fn(async () => {})
    const gs = exploreGs()
    dispose = setupQuickSave(mkDeps({ saveSlot, getGs: () => gs }))
    // 直接检查真实事件；无需另装一个跨用例残留的观察监听器。
    const f5 = await press('F5')
    expect(saveSlot).toHaveBeenCalledWith(1, gs)
    expect(toastText()).toContain('已存到存档位 1')
    const f9 = await press('F9')
    expect(f5.defaultPrevented).toBe(true)
    expect(f9.defaultPrevented).toBe(true)
  })

  it('F5 不可存态(战斗) → 不调 saveSlot + 错误 toast', async () => {
    const saveSlot = vi.fn(async () => {})
    dispose = setupQuickSave(mkDeps({ saveSlot, getGs: () => exploreGs({ mode: 'battle' }) }))
    await press('F5')
    expect(saveSlot).not.toHaveBeenCalled()
    expect(toastText()).toContain('当前无法存档')
  })

  it('F5 saveSlot reject → 存档失败 toast 带原因', async () => {
    dispose = setupQuickSave(
      mkDeps({
        saveSlot: vi.fn(async () => {
          throw new Error('quota-exceeded')
        }),
      }),
    )
    await press('F5')
    expect(toastText()).toContain('存档失败')
    expect(toastText()).toContain('quota-exceeded')
  })

  it('F9 → loadSlotIntoGame(1) + 成功 toast', async () => {
    const loadSlotIntoGame = vi.fn(async () => true)
    dispose = setupQuickSave(mkDeps({ loadSlotIntoGame }))
    await press('F9')
    expect(loadSlotIntoGame).toHaveBeenCalledWith(1)
    expect(toastText()).toContain('已从存档位 1 读取')
  })

  it('F9 空槽(false) → "为空"错误 toast', async () => {
    dispose = setupQuickSave(mkDeps({ loadSlotIntoGame: vi.fn(async () => false) }))
    await press('F9')
    expect(toastText()).toContain('存档位 1 为空')
  })

  it('F9 loadSlotIntoGame reject → "读档失败"错误 toast 带原因', async () => {
    dispose = setupQuickSave(
      mkDeps({
        loadSlotIntoGame: vi.fn(async () => {
          throw new Error('crc-bad')
        }),
      }),
    )
    await press('F9')
    expect(toastText()).toContain('读档失败')
    expect(toastText()).toContain('crc-bad')
  })

  it('解绑后 F5/F9 不再触发 save/load(解绑 oracle)', async () => {
    const saveSlot = vi.fn(async () => {})
    const loadSlotIntoGame = vi.fn(async () => true)
    dispose = setupQuickSave(mkDeps({ saveSlot, loadSlotIntoGame }))
    dispose()
    dispose = undefined
    await press('F5')
    await press('F9')
    expect(saveSlot).not.toHaveBeenCalled()
    expect(loadSlotIntoGame).not.toHaveBeenCalled()
    expect(toastText()).toBe('')
  })
})
