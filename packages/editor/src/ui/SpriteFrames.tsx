/**
 * 角色页的大世界精灵只读预览。
 * 语义行与资源库同源，展示层与战斗动作预览共用 embedded shelf。
 */

import type { SpriteDef } from '@type-pal/content'
import type { AssetBase, LoadedSprite } from '@type-pal/reforge'
import { bakeFrame, loadStandardPalette } from '@type-pal/reforge'
import { useEffect, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { loadEditorSprite } from '../core/sprite-assets.js'
import { DsStatus } from './design-system/controls.js'
import { SemanticFrameShelf, type SpriteFrameView } from './SpriteFrameWorkbench.js'
import { worldSpriteSemanticGroups } from './world-sprite-action-preview.js'

interface LoadedPreview {
  sprite: LoadedSprite
  frames: SpriteFrameView[]
  revision: string
}

export function SpriteFrames(props: {
  sprite: SpriteDef
  assetBase: AssetBase
  assetReader: EditorAssetReader
}) {
  const { sprite, assetBase, assetReader } = props
  const revision = assetReader.record(sprite.asset, 'sprite').sha256
  const [loadedResult, setLoadedResult] = useState<LoadedPreview | null>(null)
  const [error, setError] = useState('')
  const loaded = loadedResult?.revision === revision ? loadedResult : null

  useEffect(() => {
    let alive = true
    setLoadedResult(null)
    setError('')
    void Promise.all([loadEditorSprite(assetReader, sprite.asset), loadStandardPalette(assetBase)])
      .then(([loadedSprite, palette]) => {
        if (!alive) return
        setLoadedResult({
          sprite: loadedSprite,
          revision,
          frames: loadedSprite.frames.map((frame) => ({
            canvas: bakeFrame(frame, palette),
            width: frame.width,
            height: frame.height,
          })),
        })
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : String(caught))
      })
    return () => {
      alive = false
    }
  }, [assetBase, assetReader, revision, sprite.asset])

  if (error)
    return (
      <div className="sprite-frames actor-world-sprite-preview">
        <DsStatus tone="error">精灵加载失败：{error}</DsStatus>
      </div>
    )
  if (!loaded)
    return (
      <div className="sprite-frames actor-world-sprite-preview">
        <DsStatus>正在载入精灵 {sprite.asset}…</DsStatus>
      </div>
    )

  const total = loaded.sprite.frames.length
  const layout = sprite.layout
  const declaredDemand = Math.max(
    layout.kind === 'directional'
      ? layout.framesPerDir * 4
      : layout.kind === 'loop'
        ? layout.frameCount
        : 1,
    ...Object.values(sprite.poses ?? {}).flatMap((action) =>
      action.steps.map((step) => step.frame + 1),
    ),
  )

  return (
    <div className="sprite-frames actor-world-sprite-preview">
      {declaredDemand > total ? (
        <DsStatus tone="warning">
          历史布局声明需要 {declaredDemand} 帧，资源实际 {total} 帧；缺失槽按运行时真值回退第 0
          帧，请前往资源库修复。
        </DsStatus>
      ) : null}
      <SemanticFrameShelf
        ariaLabel="四向行走与动作帧预览"
        frames={loaded.frames}
        groups={worldSpriteSemanticGroups([sprite], sprite.id)}
        presentation="embedded"
      />
    </div>
  )
}
