import type { SaveSnapshot } from '../core/save/data.js'
import { localize } from '../localization/language.js'
import { parseImportedSave, serializeSave } from './save-io.js'
import { showToast } from './toast.js'
import { button, muted, sectionTitle } from './tools-panel-dom.js'

export interface SaveSlotActions {
  /** 写存档位(导入用)。 */
  saveSlot: (slot: number, gs: SaveSnapshot) => Promise<void>
  /** 读存档位(导出用);该位无存档 → null。 */
  loadSlot: (slot: number) => Promise<SaveSnapshot | null>
}

/**
 * Desktop system-page file controls. The selected action completes independently
 * of tab rerenders; bootstrap owns the Save IO and the panel lives for the page.
 */
export function renderSaveSlots(parent: HTMLElement, deps: SaveSlotActions): void {
  // ── 存档(5 个存档位各自导入/导出) ──
  sectionTitle(parent, '存档导入导出')
  muted(parent, '每个存档位可单独导出为文件、或从文件导入(导入后在读档菜单载入)')
  for (let slot = 1; slot <= 5; slot++) {
    const row = document.createElement('div')
    row.className = 'tp-save-row'
    const lbl = document.createElement('span')
    lbl.className = 'tp-save-label'
    lbl.textContent = localize(`存档位 ${slot}`, `Slot ${slot}`)
    row.appendChild(lbl)
    button(row, '导出', () => {
      void (async (): Promise<void> => {
        try {
          const g = await deps.loadSlot(slot)
          if (!g) {
            showToast(localize(`存档位 ${slot} 暂无存档`, `Slot ${slot} is empty`), {
              type: 'error',
            })
            return
          }
          const blob = new Blob([serializeSave(g)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          try {
            const a = document.createElement('a')
            a.href = url
            a.download = `type-pal-save-slot${slot}.json`
            a.click()
          } finally {
            URL.revokeObjectURL(url)
          }
          showToast(localize(`已导出存档位 ${slot}`, `Exported slot ${slot}`), { type: 'success' })
        } catch (err) {
          showToast(
            `${localize('导出失败:', 'Export failed: ')}${err instanceof Error || err instanceof DOMException ? err.message : String(err)}`,
            { type: 'error' },
          )
        }
      })()
    })
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.json,application/json'
    fileInput.style.display = 'none'
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (): void => {
        void (async (): Promise<void> => {
          try {
            await deps.saveSlot(slot, parseImportedSave(String(reader.result)))
            showToast(localize(`已导入到存档位 ${slot}`, `Imported to slot ${slot}`), {
              type: 'success',
            })
          } catch (err) {
            showToast(
              `${localize('导入失败:', 'Import failed: ')}${err instanceof Error ? err.message : String(err)}`,
              {
                type: 'error',
              },
            )
          }
        })()
      }
      reader.onerror = (): void => {
        showToast(`${localize('导入失败:', 'Import failed: ')}${reader.error?.message ?? ''}`, {
          type: 'error',
        })
      }
      reader.readAsText(file)
      fileInput.value = '' // 允许重复导入同名文件
    })
    button(row, '导入', () => fileInput.click())
    row.appendChild(fileInput)
    parent.appendChild(row)
  }
}
