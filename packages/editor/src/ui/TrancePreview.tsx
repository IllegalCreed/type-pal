import type { BattleSpriteDef } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { BattleSpriteInlinePreview } from './BattleSpriteInlinePreview.js'

export function TrancePreview(props: {
  assetBase: AssetBase
  assetReader: EditorAssetReader
  definition?: BattleSpriteDef
}) {
  return (
    <BattleSpriteInlinePreview
      assetBase={props.assetBase}
      assetReader={props.assetReader}
      definition={props.definition}
      expected="player-fighter"
    />
  )
}
