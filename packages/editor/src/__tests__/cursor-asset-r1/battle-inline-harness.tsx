/**
 * BattleSpriteInlinePreview 合法挂载：真实解码 + Canvas2D，不 mock 产品组件。
 */
import type { BattleSpriteDef } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { BattleSpriteInlinePreview } from '../../ui/BattleSpriteInlinePreview.js'
import type { CursorBattleProject } from './battle-sprite-fixtures.js'

export interface MountedBattleInline {
  project: CursorBattleProject
  reader: EditorAssetReader
  host: HTMLDivElement
  root: Root
  primaryCanvas(): HTMLCanvasElement
  thumbCanvases(): HTMLCanvasElement[]
}

export async function mountBattleInline(
  project: CursorBattleProject,
  input: {
    definition?: BattleSpriteDef
    asset?: import('@type-pal/content').AssetId
    source?: FileSource
    showAllFrames?: boolean
    playAllFrames?: boolean
    frameMs?: number
    sequenceKey?: string
    frameSequence?: readonly number[]
    onFrameSelect?: (index: number) => void
    activeFrames?: readonly number[]
  },
): Promise<MountedBattleInline> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const reader = createEditorAssetReader(input.source ?? project.source, () => project.state)
  await act(async () => {
    root.render(
      <BattleSpriteInlinePreview
        definition={input.definition}
        asset={input.asset}
        assetBase={project.assetBase}
        assetReader={reader}
        showAllFrames={input.showAllFrames}
        playAllFrames={input.playAllFrames}
        frameMs={input.frameMs}
        sequenceKey={input.sequenceKey}
        frameSequence={input.frameSequence}
        onFrameSelect={input.onFrameSelect ?? (input.showAllFrames ? () => undefined : undefined)}
        activeFrames={input.activeFrames}
      />,
    )
    await Promise.resolve()
  })
  return {
    project,
    reader,
    host,
    root,
    primaryCanvas: () => {
      const canvas = host.querySelector<HTMLCanvasElement>('.battle-sprite-preview > canvas')
      if (!canvas) throw new Error('BattleSpriteInlinePreview 主画布未挂载')
      return canvas
    },
    thumbCanvases: () => [
      ...host.querySelectorAll<HTMLCanvasElement>('.battle-frame-thumb canvas'),
    ],
  }
}

export async function unmountBattleInline(mounted: MountedBattleInline): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}
