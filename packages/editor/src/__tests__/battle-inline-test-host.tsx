/**
 * BattleSpriteInlinePreview 合法挂载：真实解码 + Canvas2D，不 mock 产品组件。
 */
import type { FileSource } from '@type-pal/reforge'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { BattleSpriteInlinePreview } from '../ui/BattleSpriteInlinePreview.js'
import type { BattleSpriteProject } from './battle-sprite-project.js'

export interface MountedBattleInline {
  project: BattleSpriteProject
  reader: EditorAssetReader
  host: HTMLDivElement
  root: Root
  primaryCanvas(): HTMLCanvasElement
  thumbCanvases(): HTMLCanvasElement[]
}

export async function mountBattleInline(
  project: BattleSpriteProject,
  input: Omit<ComponentProps<typeof BattleSpriteInlinePreview>, 'assetBase' | 'assetReader'> & {
    source?: FileSource
  },
): Promise<MountedBattleInline> {
  const { source = project.source, ...preview } = input
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const reader = createEditorAssetReader(source, () => project.state)
  try {
    await act(async () => {
      root.render(
        <BattleSpriteInlinePreview
          {...preview}
          assetBase={project.assetBase}
          assetReader={reader}
        />,
      )
    })
  } catch (error) {
    try {
      await act(async () => root.unmount())
    } finally {
      host.remove()
    }
    throw error
  }
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
  try {
    await act(async () => mounted.root.unmount())
  } finally {
    mounted.host.remove()
  }
}
