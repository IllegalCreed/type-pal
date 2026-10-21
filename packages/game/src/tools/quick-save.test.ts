// 快捷键准入、IO 完成后的反馈和解绑；toast 的显示时长由 toast.test.ts 验证。
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

function deferred<T>() {
  // Promise 的 executor 同步执行，返回控制器时回调已赋值。
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
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

  it('F5 拦截刷新，保存完成前不报成功，完成后提示 slot 1', async () => {
    const commit = deferred<void>()
    const saveSlot = vi.fn(() => commit.promise)
    const gs = exploreGs()
    dispose = setupQuickSave(mkDeps({ saveSlot, getGs: () => gs }))
    try {
      const f5 = await press('F5')
      expect(f5.defaultPrevented).toBe(true)
      expect(saveSlot).toHaveBeenCalledExactlyOnceWith(1, gs)
      expect(toastText()).toBe('')
    } finally {
      commit.resolve()
      await vi.advanceTimersByTimeAsync(0)
    }
    expect(document.querySelector('.tp-toast-success')?.textContent).toBe('✓ 已存到存档位 1')
  })

  it('F5 不可存态(战斗) → 不调 saveSlot + 错误 toast', async () => {
    const saveSlot = vi.fn(async () => {})
    dispose = setupQuickSave(mkDeps({ saveSlot, getGs: () => exploreGs({ mode: 'battle' }) }))
    expect((await press('F5')).defaultPrevented).toBe(true)
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
    expect(document.querySelector('.tp-toast-error')?.textContent).toBe('✗ 存档失败:quota-exceeded')
    expect(document.querySelector('.tp-toast-success')).toBeNull()
  })

  it('F9 拦截浏览器默认行为，读档完成后才显示成功', async () => {
    const load = deferred<boolean>()
    const loadSlotIntoGame = vi.fn(() => load.promise)
    dispose = setupQuickSave(mkDeps({ loadSlotIntoGame }))
    try {
      const f9 = await press('F9')
      expect(f9.defaultPrevented).toBe(true)
      expect(loadSlotIntoGame).toHaveBeenCalledExactlyOnceWith(1)
      expect(toastText()).toBe('')
    } finally {
      load.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    }
    expect(document.querySelector('.tp-toast-success')?.textContent).toBe('✓ 已从存档位 1 读取')
  })

  it('F9 空槽(false) → "为空"错误 toast', async () => {
    dispose = setupQuickSave(mkDeps({ loadSlotIntoGame: vi.fn(async () => false) }))
    await press('F9')
    expect(document.querySelector('.tp-toast-error')?.textContent).toBe('✗ 存档位 1 为空')
    expect(document.querySelector('.tp-toast-success')).toBeNull()
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
    expect(document.querySelector('.tp-toast-error')?.textContent).toBe('✗ 读档失败:crc-bad')
    expect(document.querySelector('.tp-toast-success')).toBeNull()
  })

  it('F6 放行浏览器默认行为，不触发存读档或提示', async () => {
    const saveSlot = vi.fn(async () => {})
    const loadSlotIntoGame = vi.fn(async () => true)
    dispose = setupQuickSave(mkDeps({ saveSlot, loadSlotIntoGame }))
    const event = new KeyboardEvent('keydown', { code: 'F6', cancelable: true })
    window.dispatchEvent(event)
    await vi.advanceTimersByTimeAsync(0)
    expect(event.defaultPrevented).toBe(false)
    expect(saveSlot).not.toHaveBeenCalled()
    expect(loadSlotIntoGame).not.toHaveBeenCalled()
    expect(toastText()).toBe('')
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
