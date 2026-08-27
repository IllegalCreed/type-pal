import type { ActorDef, AssetCatalogV1, ItemData } from '@type-pal/content'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { ImageAssetThumbnail } from './ImageAssetPicker.js'

export function itemAbilitySummary(item: ItemData): string | undefined {
  const abilities = [
    item.equip ? '装备' : '',
    item.use ? '使用' : '',
    item.throw ? '投掷' : '',
  ].filter(Boolean)
  return abilities.length ? abilities.join(' / ') : undefined
}

/** Picker 的第二行只放最有助于辨认用途的一条短说明，完整说明仍进入搜索。 */
export function itemPickerDescription(item: ItemData): string {
  const detail = [...(item.desc ?? [])]
    .reverse()
    .map((line) => line.trim())
    .find(Boolean)
  return detail ?? itemAbilitySummary(item) ?? '暂无说明'
}

export function itemPickerSearchText(item: ItemData): string[] {
  const ability = itemAbilitySummary(item)
  return [...(item.desc ?? []), ...(ability ? [ability] : [])]
}

function ThumbnailFallback(props: { label: '无图' | '缺图'; ariaLabel: string }) {
  return (
    <span
      className="ds-add-picker-option__thumbnail ds-add-picker-option__thumbnail--empty"
      role="img"
      aria-label={props.ariaLabel}
    >
      {props.label}
    </span>
  )
}

export function ItemPickerThumbnail(props: {
  item: ItemData
  catalog?: AssetCatalogV1
  reader?: EditorAssetReader
}) {
  const { item, catalog, reader } = props
  const record = item.icon ? catalog?.assets[item.icon] : undefined
  if (!item.icon || !reader || record?.kind !== 'item-icon') {
    return (
      <ThumbnailFallback
        label={item.icon ? '缺图' : '无图'}
        ariaLabel={item.icon ? `${item.name}的物品图标缺失` : `${item.name}没有物品图标`}
      />
    )
  }
  return (
    <ImageAssetThumbnail
      asset={item.icon}
      kind="item-icon"
      reader={reader}
      revision={record.sha256}
      alt=""
      className="ds-add-picker-option__thumbnail"
    />
  )
}

export function ActorPickerThumbnail(props: {
  actor: ActorDef
  actorName: string
  catalog?: AssetCatalogV1
  reader?: EditorAssetReader
}) {
  const { actor, actorName, catalog, reader } = props
  const faceRecord = actor.face ? catalog?.assets[actor.face] : undefined
  const portrait = actor.portraits?.default
  const portraitRecord = portrait ? catalog?.assets[portrait] : undefined
  if (reader && actor.face && faceRecord?.kind === 'face') {
    return (
      <ImageAssetThumbnail
        asset={actor.face}
        kind="face"
        reader={reader}
        revision={faceRecord.sha256}
        alt=""
        className="ds-add-picker-option__thumbnail"
      />
    )
  }
  if (reader && portrait && portraitRecord?.kind === 'portrait') {
    return (
      <ImageAssetThumbnail
        asset={portrait}
        kind="portrait"
        reader={reader}
        revision={portraitRecord.sha256}
        alt=""
        className="ds-add-picker-option__thumbnail"
      />
    )
  }
  return (
    <ThumbnailFallback
      label={actor.face || portrait ? '缺图' : '无图'}
      ariaLabel={
        actor.face || portrait ? `${actorName}的角色缩略图缺失` : `${actorName}没有角色缩略图`
      }
    />
  )
}
