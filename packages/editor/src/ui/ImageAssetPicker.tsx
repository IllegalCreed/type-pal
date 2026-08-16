import type { AssetCatalogV1, AssetId, AssetRecordV1 } from '@type-pal/content'
import { useEffect, useMemo, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { StaticImageKind } from '../core/static-image.js'
import { DsControlGroup, DsIconButton, DsSelect } from './design-system/controls.js'

const UNSET = '__unset__'

export interface ImageAssetOption {
  id: AssetId
  record: AssetRecordV1
}

export function imageAssets(catalog: AssetCatalogV1, kind: StaticImageKind): ImageAssetOption[] {
  return Object.entries(catalog.assets)
    .filter(([, record]) => record.kind === kind)
    .map(([id, record]) => ({ id, record }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function imageAssetLabel(asset: ImageAssetOption): string {
  return asset.record.label ? `${asset.record.label} (${asset.id})` : asset.id
}

type PaletteColors = readonly (readonly [number, number, number])[]

async function thumbnailBlob(
  bytes: ArrayBuffer,
  mediaType: string,
  kind: StaticImageKind,
  paletteColors: PaletteColors | undefined,
): Promise<Blob> {
  if (kind !== 'battle-background' || !paletteColors) return new Blob([bytes], { type: mediaType })
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mediaType }))
  try {
    if (bitmap.width !== 320 || bitmap.height !== 200)
      throw new Error(`战场背景必须是 320×200，实际 ${bitmap.width}×${bitmap.height}`)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('浏览器无法创建战场背景缩略图')
    context.drawImage(bitmap, 0, 0)
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) {
      const offset = pixel * 4
      const index = image.data[offset] ?? 0
      if (
        image.data[offset + 1] !== index ||
        image.data[offset + 2] !== index ||
        image.data[offset + 3] !== 255
      )
        throw new Error(`战场背景像素 ${pixel} 不满足工程索引图契约`)
      const color = paletteColors[index] ?? [0, 0, 0]
      image.data[offset] = color[0]
      image.data[offset + 1] = color[1]
      image.data[offset + 2] = color[2]
      image.data[offset + 3] = 255
    }
    context.putImageData(image, 0, 0)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('无法编码战场背景缩略图'))),
        'image/png',
      ),
    )
  } finally {
    bitmap.close()
  }
}

/**
 * 编辑器图片缩略图。始终从 EditorAssetReader 读 bytes，因此未保存 blob、FSA 工程与
 * HTTP 工程走同一条路径；组件拥有并释放 object URL，不把临时 URL 泄漏给调用方。
 */
export function ImageAssetThumbnail(props: {
  asset?: AssetId
  kind: StaticImageKind
  reader: EditorAssetReader
  /** 同 AssetId 替换后的内容版本；通常传 AssetRecord.sha256。 */
  revision?: string
  /** 战场背景的工程标准色；有值时缩略图显示运行时着色效果，不暴露灰度索引图。 */
  paletteColors?: PaletteColors
  alt?: string
  className?: string
}) {
  const { asset, kind, reader } = props
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // revision 不参与读取参数，但必须令同 AssetId 替换后的 object URL 失效并重建。
    void props.revision
    let alive = true
    let objectUrl = ''
    setUrl('')
    setError('')
    if (!asset) return () => undefined
    void reader
      .readBytes(asset, kind)
      .then(async (bytes) => {
        if (!alive) return
        const record = reader.record(asset, kind)
        const blob = await thumbnailBlob(bytes, record.mediaType, kind, props.paletteColors)
        if (!alive) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [asset, kind, props.paletteColors, props.revision, reader])

  if (!asset) return <span className={`image-asset-thumb empty ${props.className ?? ''}`} />
  if (error)
    return (
      <span className={`image-asset-thumb error ${props.className ?? ''}`} title={error}>
        !
      </span>
    )
  return (
    <span className={`image-asset-thumb ${props.className ?? ''}`}>
      {url ? (
        <img src={url} alt={props.alt ?? ''} />
      ) : (
        <span className="image-asset-loading">…</span>
      )}
    </span>
  )
}

export function ImageAssetPicker(props: {
  id?: string
  value: AssetId | undefined
  kind: StaticImageKind
  onChange: (value: AssetId | undefined) => void
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  allowUnset?: boolean
  ariaLabel?: string
  onOpenAsset?: (asset: AssetId) => void
  showThumbnail?: boolean
}) {
  const options = useMemo(() => imageAssets(props.catalog, props.kind), [props.catalog, props.kind])
  const current = props.value ? props.catalog.assets[props.value] : undefined
  const currentValid = current?.kind === props.kind
  const selected = props.value ?? UNSET
  return (
    <DsControlGroup
      className="image-asset-picker"
      leading={
        props.showThumbnail !== false ? (
          <ImageAssetThumbnail
            asset={props.value && currentValid ? props.value : undefined}
            kind={props.kind}
            reader={props.reader}
            revision={currentValid ? current?.sha256 : undefined}
          />
        ) : undefined
      }
      control={
        <DsSelect
          id={props.id}
          aria-label={props.ariaLabel ?? `${props.kind} 图片`}
          invalid={!!props.value && !currentValid}
          value={selected}
          onValueChange={(value) =>
            props.onChange(value === UNSET ? undefined : value)
          }
          options={[
            ...(props.allowUnset ? [{ value: UNSET, label: '(无)' }] : []),
            ...(props.value && !currentValid
              ? [{ value: props.value, label: `⚠ ${props.value}（缺失或类型错误）` }]
              : []),
            ...options.map((asset) => ({ value: asset.id, label: imageAssetLabel(asset) })),
            ...(!options.length && !props.allowUnset
              ? [{ value: UNSET, label: '工程没有可用图片' }]
              : []),
          ]}
        />
      }
      actions={
        props.value && props.onOpenAsset ? (
          <DsIconButton
            variant="secondary"
            icon="open"
            label={`在图片库打开 ${props.value}`}
            onClick={() => {
              if (props.value) props.onOpenAsset?.(props.value)
            }}
          />
        ) : undefined
      }
    />
  )
}
