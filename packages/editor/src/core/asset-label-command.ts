/**
 * 资源显示名命令。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { AssetId } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

/** 改资源显示名；AssetId/path/引用保持不变。 */
export class UpdateAssetLabelCommand implements Command {
  readonly label = '修改资源名称'
  private readonly assetId: AssetId
  private readonly next: string | undefined
  private old: string | undefined
  private captured = false

  constructor(assetId: AssetId, label: string | undefined) {
    this.assetId = assetId
    this.next = label || undefined
  }

  apply(state: EditorState): EditorState {
    const current = state.assetCatalog.assets[this.assetId]
    if (!current) return state
    if (!this.captured) {
      this.captured = true
      this.old = current.label
    }
    const record = { ...current, label: this.next }
    if (!this.next) delete record.label
    return {
      ...state,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.assetId]: record },
      },
    }
  }

  invert(state: EditorState): EditorState {
    const current = state.assetCatalog.assets[this.assetId]
    if (!current) return state
    const record = { ...current, label: this.old }
    if (!this.old) delete record.label
    return {
      ...state,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.assetId]: record },
      },
    }
  }
}
