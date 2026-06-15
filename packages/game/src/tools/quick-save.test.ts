import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameState } from '../core/game-state.js'
import { canQuickSave, setupQuickSave, type QuickSaveDeps } from './quick-save.js'

const exploreGs = (over: Record<string, unknown> = {}): GameState =>
  ({ mode: 'explore', dialogBox: undefined, menuStack: [], ...over }) as never

function mkDeps(over: Partial<QuickSaveDeps> = {}): QuickSaveDeps {
  return {
    getGs: () => exploreGs(),
    saveSlot: vi.fn(async () => {}),
    loadSlotIntoGame: vi.fn(async () => true),
    ...over,
  }
}

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
})

describe('quick-save', () => {
  it('canQuickSave:explore 无对话无菜单 → true;战斗/对话/菜单 → false', () => {
    expect(canQuickSave(exploreGs())).toBe(true)
    expect(canQuickSave(exploreGs({ mode: 'battle' }))).toBe(false)
    expect(canQuickSave(exploreGs({ dialogBox: {} }))).toBe(false)
    expect(canQuickSave(exploreGs({ menuStack: [{}] }))).toBe(false)
  })

  it('F5 可存态 → saveSlot(1, gs)', async () => {
    const saveSlot = vi.fn(async () => {})
    dispose = setupQuickSave(mkDeps({ saveSlot }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F5' }))
    await vi.waitFor(() => expect(saveSlot).toHaveBeenCalledWith(1, expect.anything()))
  })

  it('F5 不可存态(战斗) → 不调 saveSlot', async () => {
    const saveSlot = vi.fn(async () => {})
    dispose = setupQuickSave(mkDeps({ saveSlot, getGs: () => exploreGs({ mode: 'battle' }) }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F5' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(saveSlot).not.toHaveBeenCalled()
  })

  it('F9 → loadSlotIntoGame(1)', async () => {
    const loadSlotIntoGame = vi.fn(async () => true)
    dispose = setupQuickSave(mkDeps({ loadSlotIntoGame }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F9' }))
    await vi.waitFor(() => expect(loadSlotIntoGame).toHaveBeenCalledWith(1))
  })
})
