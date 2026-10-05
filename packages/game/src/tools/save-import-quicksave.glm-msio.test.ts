// TEST-GLM-GAME-MENU-SAVE-IO-1 — save-io 坏导入守卫臂 + quick-save 键拦截与结果反馈。
//
// MSIO-D1:parseImportedSave 必填守卫的 wNumScene 臂(save-io.ts:21
//   `typeof gs.wNumScene !== 'number'`)。旧测只打 partyMembers 臂;wNumScene 缺失/非数
//   的拒绝未证明 —— 坏导入必须被拒且原状态不受影响是卡面重点。
// MSIO-E1:F5/F9 必须 preventDefault 拦截浏览器刷新/恢复(quick-save.ts:26-33)。F5 不拦
//   = 按快存键直接丢游戏,用户可见;旧测只证 deps 被调,未证拦截与非目标键放行。
// MSIO-E2:F5 存档 IO 失败 → 错误 toast 反馈且不外抛(可恢复失败;catch 分支)。
// MSIO-E3:F9 读档空槽/成功 → 对应错误/成功 toast(ok 三元两臂)。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState, type GameState } from '../core/game-state.js'
import { type QuickSaveDeps, setupQuickSave } from './quick-save.js'
import { parseImportedSave } from './save-io.js'

function mkGs(): GameState {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' }) // explore 无对话无菜单 → 可快存
}

function press(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }))
}

function toastText(): string {
  return document.getElementById('tp-toast-container')?.textContent ?? ''
}

let dispose: (() => void) | undefined

function bind(deps: QuickSaveDeps): void {
  dispose?.()
  dispose = setupQuickSave(deps)
}

afterEach(() => {
  dispose?.()
  dispose = undefined
  document.getElementById('tp-toast-container')?.remove()
})

describe('TEST-GLM-GAME-MENU-SAVE-IO-1 坏导入守卫与快存反馈', () => {
  it('MSIO-D1 parseImportedSave:partyMembers 合法但 wNumScene 缺失/非数 → 拒(缺必要字段)', () => {
    const missing = JSON.stringify({
      format: 'type-pal-save',
      version: 1,
      gs: { partyMembers: [0] },
    })
    expect(() => parseImportedSave(missing)).toThrow(/存档缺必要字段/)
    const notNumber = JSON.stringify({
      format: 'type-pal-save',
      version: 1,
      gs: { partyMembers: [0], wNumScene: '5' },
    })
    expect(() => parseImportedSave(notNumber)).toThrow(/存档缺必要字段/)
  })

  it('MSIO-E1 F5/F9 keydown 被 preventDefault 拦浏览器刷新,非目标键(F6)放行', () => {
    bind({ getGs: () => mkGs(), saveSlot: async () => {}, loadSlotIntoGame: async () => true })

    const f5 = new KeyboardEvent('keydown', { code: 'F5', cancelable: true })
    window.dispatchEvent(f5)
    expect(f5.defaultPrevented).toBe(true)

    const f9 = new KeyboardEvent('keydown', { code: 'F9', cancelable: true })
    window.dispatchEvent(f9)
    expect(f9.defaultPrevented).toBe(true)

    const f6 = new KeyboardEvent('keydown', { code: 'F6', cancelable: true })
    window.dispatchEvent(f6)
    expect(f6.defaultPrevented).toBe(false)
  })

  it('MSIO-E2 F5 存档失败(saveSlot 拒绝)→ 错误 toast 带原因,不外抛未捕获异常', async () => {
    bind({
      getGs: () => mkGs(),
      saveSlot: async () => {
        throw new Error('磁盘已满')
      },
      loadSlotIntoGame: async () => true,
    })

    press('F5') // doQuickSave 内部 catch → showToast,handler 不再外抛

    await vi.waitFor(() => {
      expect(toastText()).toContain('存档失败:磁盘已满')
    })
    expect(document.querySelector('#tp-toast-container .tp-toast-error')).not.toBeNull()
  })

  it('MSIO-E3 F9 读档:空槽 → 错误 toast「存档位 1 为空」;成功 → 成功 toast「已从存档位 1 读取」', async () => {
    bind({ getGs: () => mkGs(), saveSlot: async () => {}, loadSlotIntoGame: async () => false })

    press('F9')
    await vi.waitFor(() => {
      expect(toastText()).toContain('存档位 1 为空')
    })
    expect(document.querySelector('#tp-toast-container .tp-toast-error')).not.toBeNull()

    document.getElementById('tp-toast-container')?.remove() // 两臂互不污染
    bind({ getGs: () => mkGs(), saveSlot: async () => {}, loadSlotIntoGame: async () => true })

    press('F9')
    await vi.waitFor(() => {
      expect(toastText()).toContain('已从存档位 1 读取')
    })
    expect(document.querySelector('#tp-toast-container .tp-toast-success')).not.toBeNull()
  })
})
