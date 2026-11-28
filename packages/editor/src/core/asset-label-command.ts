import { type AssetId, type AssetRecordV1, findAssetRecord } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

/** Change the label without changing the catalog identity or the asset's bytes. */
export class UpdateAssetLabelCommand implements Command {
  readonly label = '修改资源名称'
  private readonly next: string | undefined
  private previous: string | undefined
  private captured = false

  constructor(
    private readonly assetId: AssetId,
    label: string | undefined,
  ) {
    this.next = label || undefined
  }

  apply(state: EditorState): EditorState {
    const current = findAssetRecord(state.assetCatalog, this.assetId)
    if (!current) return state
    if (!this.captured) {
      this.previous = current.label
      this.captured = true
    }
    return this.withLabel(state, current, this.next)
  }

  invert(state: EditorState): EditorState {
    const current = findAssetRecord(state.assetCatalog, this.assetId)
    return current && this.captured ? this.withLabel(state, current, this.previous) : state
  }

  private withLabel(
    state: EditorState,
    current: AssetRecordV1,
    label: string | undefined,
  ): EditorState {
    const record = { ...current, label }
    if (label === undefined) delete record.label
    return {
      ...state,
      assetCatalog: {
        ...state.assetCatalog,
        assets: { ...state.assetCatalog.assets, [this.assetId]: record },
      },
    }
  }
}
