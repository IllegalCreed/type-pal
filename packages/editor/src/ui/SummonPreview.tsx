import type { BattleSpriteDef } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { BattleSpriteInlinePreview } from './BattleSpriteInlinePreview.js'

export function SummonPreview(props: {
  assetBase: AssetBase
  assetReader: EditorAssetReader
  definition?: BattleSpriteDef
  speed?: number
}) {
  return (
    <BattleSpriteInlinePreview
      assetBase={props.assetBase}
      assetReader={props.assetReader}
      definition={props.definition}
      expected="summon"
      playAllFrames
      frameMs={(props.speed ?? 0) + 5 > 0 ? ((props.speed ?? 0) + 5) * 10 : 50}
    />
  )
}
