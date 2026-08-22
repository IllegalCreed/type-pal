import type { AssetCatalogV1, AssetId, AssetRecordV1 } from '@type-pal/content'
import { SfxPlayer } from '@type-pal/reforge'
import { useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  DsControlGroup,
  type DsControlSize,
  DsIconButton,
  DsSelect,
} from './design-system/controls.js'

export interface SoundAsset {
  id: AssetId
  record: AssetRecordV1
}

export function soundAssets(catalog: AssetCatalogV1): SoundAsset[] {
  return Object.entries(catalog.assets)
    .filter(([, record]) => record.kind === 'sound')
    .map(([id, record]) => ({ id, record }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function soundLabel(asset: SoundAsset): string {
  return asset.record.label ? `${asset.record.label} (${asset.id})` : asset.id
}

let previewReader: EditorAssetReader | undefined
let previewPlayer: SfxPlayer | undefined
const previewFingerprints = new Map<AssetId, string>()

async function playerFor(reader: EditorAssetReader): Promise<SfxPlayer> {
  if (!previewPlayer || previewReader !== reader) {
    const previous = previewPlayer
    previewReader = reader
    previewPlayer = new SfxPlayer(reader)
    previewFingerprints.clear()
    await previous?.dispose()
  }
  return previewPlayer
}

export async function prepareSoundPreview(
  reader: EditorAssetReader,
  asset: AssetId,
): Promise<SfxPlayer> {
  const record = reader.record(asset, 'sound')
  const player = await playerFor(reader)
  const previous = previewFingerprints.get(asset)
  if (previous !== undefined && previous !== record.sha256) player.invalidate(asset)
  previewFingerprints.set(asset, record.sha256)
  await player.resume()
  await player.prepare([asset])
  return player
}

export async function previewSound(reader: EditorAssetReader, asset: AssetId): Promise<void> {
  const player = await prepareSoundPreview(reader, asset)
  player.play(asset)
}

export async function disposeSoundPreview(reader?: EditorAssetReader): Promise<void> {
  if (reader && previewReader !== reader) return
  const player = previewPlayer
  previewPlayer = undefined
  previewReader = undefined
  previewFingerprints.clear()
  await player?.dispose()
}

const UNSET = '__unset__'

export function SoundPreviewButton(props: {
  asset?: AssetId
  reader: EditorAssetReader
  disabled?: boolean
  size?: DsControlSize
}) {
  const [error, setError] = useState('')
  return (
    <span className="sound-preview-control">
      <DsIconButton
        variant="secondary"
        size={props.size}
        icon="play"
        label={props.asset ? `试听 ${props.asset}` : '未选择音效'}
        disabled={props.disabled || !props.asset}
        onClick={() => {
          if (!props.asset) return
          setError('')
          void previewSound(props.reader, props.asset).catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : String(cause))
          })
        }}
      />
      {error ? <span className="sound-preview-error">{error}</span> : null}
    </span>
  )
}

export function SoundPicker(props: {
  id?: string
  value: AssetId | undefined
  onChange: (value: AssetId | undefined) => void
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  allowUnset?: boolean
  ariaLabel?: string
  onOpenAsset?: (asset: AssetId) => void
  size?: DsControlSize
}) {
  const options = soundAssets(props.catalog)
  const current = props.value ? props.catalog.assets[props.value] : undefined
  const currentValid = current?.kind === 'sound'
  const selected = props.value ?? UNSET
  return (
    <DsControlGroup
      className="music-picker sound-picker"
      control={
        <DsSelect
          id={props.id}
          size={props.size}
          aria-label={props.ariaLabel ?? '音效'}
          value={selected}
          onValueChange={(value) => props.onChange(value === UNSET ? undefined : value)}
          options={[
            ...(props.allowUnset ? [{ value: UNSET, label: '(无音效)' }] : []),
            ...(props.value && !currentValid
              ? [{ value: props.value, label: `⚠ ${props.value}（缺失或类型错误）` }]
              : []),
            ...options.map((asset) => ({ value: asset.id, label: soundLabel(asset) })),
            ...(!options.length && !props.allowUnset
              ? [{ value: UNSET, label: '项目没有可用音效' }]
              : []),
          ]}
        />
      }
      actions={
        <>
          <SoundPreviewButton
            asset={props.value && currentValid ? props.value : undefined}
            reader={props.reader}
            size={props.size}
          />
          {props.value && props.onOpenAsset ? (
            <DsIconButton
              variant="secondary"
              size={props.size}
              icon="open"
              label={`在音效库打开 ${props.value}`}
              onClick={() => {
                if (props.value) props.onOpenAsset?.(props.value)
              }}
            />
          ) : null}
        </>
      }
    />
  )
}
