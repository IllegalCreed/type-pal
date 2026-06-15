// 快速存档(F5)/读档(F9),固定存档位 1。canvas 之外纯快捷键 + toast 反馈。
//   快存限 explore 大世界态(无对话/菜单)防战斗/剧情中存出脏档;快读复用整套读档恢复
//   (bootstrap loadGameFromSlot:Save.loadSlot → Object.assign(gs) → 重载场景)。
//   F5 preventDefault 拦浏览器刷新。
import type { GameState } from '../core/game-state.js'
import { showToast } from './toast.js'

const QUICK_SLOT = 1

export interface QuickSaveDeps {
  getGs: () => GameState
  saveSlot: (slot: number, gs: GameState) => Promise<void>
  /** 整套读档恢复(= bootstrap loadGameFromSlot);返回 false = slot 空。 */
  loadSlotIntoGame: (slot: number) => Promise<boolean>
}

/** 可快存时机:explore 大世界 + 无对话框 + 无菜单弹窗(否则存出战斗/剧情脏档,读回会乱)。 */
export function canQuickSave(gs: GameState): boolean {
  return gs.mode === 'explore' && !gs.dialogBox && gs.menuStack.length === 0
}

/** 绑 F5 快存 / F9 快读;返回解绑函数(测试/重绑用)。 */
export function setupQuickSave(deps: QuickSaveDeps): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: KeyboardEvent): void => {
    if (e.code === 'F5') {
      e.preventDefault() // 拦浏览器刷新
      void doQuickSave(deps)
    } else if (e.code === 'F9') {
      e.preventDefault()
      void doQuickLoad(deps)
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}

async function doQuickSave(deps: QuickSaveDeps): Promise<void> {
  const gs = deps.getGs()
  if (!canQuickSave(gs)) {
    showToast('当前无法存档(非大世界状态)', { type: 'error' })
    return
  }
  try {
    await deps.saveSlot(QUICK_SLOT, gs)
    showToast(`已存到存档位 ${QUICK_SLOT}`, { type: 'success' })
  } catch (err) {
    showToast(`存档失败:${err instanceof Error ? err.message : String(err)}`, { type: 'error' })
  }
}

async function doQuickLoad(deps: QuickSaveDeps): Promise<void> {
  try {
    const ok = await deps.loadSlotIntoGame(QUICK_SLOT)
    showToast(ok ? `已从存档位 ${QUICK_SLOT} 读取` : `存档位 ${QUICK_SLOT} 为空`, {
      type: ok ? 'success' : 'error',
    })
  } catch (err) {
    showToast(`读档失败:${err instanceof Error ? err.message : String(err)}`, { type: 'error' })
  }
}
