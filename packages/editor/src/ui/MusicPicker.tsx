/** catalog 驱动的 BGM 选择器与全局单路 MIDI 试听。 */
import type { AssetCatalogV1, AssetId, AssetRecordV1 } from '@type-pal/content'
import { type AudioAssetReader, createBgmPlayer } from '@type-pal/reforge'
import { useSyncExternalStore } from 'react'
import { DsControlGroup, DsIconButton, DsSelect } from './design-system/controls.js'

export interface MusicAsset {
  id: AssetId
  record: AssetRecordV1
}

export function musicAssets(catalog: AssetCatalogV1): MusicAsset[] {
  return Object.entries(catalog.assets)
    .filter(([, record]) => record.kind === 'music')
    .map(([id, record]) => ({ id, record }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

let player: ReturnType<typeof createBgmPlayer> | undefined
let playerReader: AudioAssetReader | undefined
let playingAsset: AssetId | null = null
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function stopPreview(): void {
  player?.stop()
  playingAsset = null
  notify()
}

function togglePreview(reader: AudioAssetReader, asset: AssetId): void {
  if (playingAsset === asset) {
    stopPreview()
    return
  }
  if (!player || playerReader !== reader) {
    player?.stop()
    player = createBgmPlayer(reader)
    playerReader = reader
  }
  player.play(asset, true)
  playingAsset = asset
  notify()
}

function usePlayingAsset(): AssetId | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => playingAsset,
  )
}

export function PreviewButton(props: {
  asset?: AssetId
  resolver: AudioAssetReader
  disabled?: boolean
}) {
  const playing = usePlayingAsset() === props.asset
  const label = playing ? `停止试听 ${props.asset}` : `试听 ${props.asset ?? ''}`
  return (
    <DsIconButton
      variant="secondary"
      icon={playing ? 'stop' : 'play'}
      label={label}
      aria-pressed={playing}
      disabled={props.disabled || !props.asset}
      onClick={() => props.asset && togglePreview(props.resolver, props.asset)}
    />
  )
}

export function musicLabel(asset: MusicAsset): string {
  return asset.record.label ? `${asset.record.label} (${asset.id})` : asset.id
}

const UNSET = '__unset__'
const STOP = '__stop__'

export function MusicPicker(props: {
  id?: string
  value: AssetId | null | undefined
  onChange: (value: AssetId | null | undefined) => void
  catalog: AssetCatalogV1
  resolver: AudioAssetReader
  allowUnset?: boolean
  allowStop?: boolean
  ariaLabel?: string
}) {
  const {
    id,
    value,
    onChange,
    catalog,
    resolver,
    allowUnset,
    allowStop,
    ariaLabel = '音乐',
  } = props
  const options = musicAssets(catalog)
  const selected = value === undefined ? UNSET : value === null ? STOP : value
  return (
    <DsControlGroup
      className="music-picker"
      control={
        <DsSelect
          id={id}
          aria-label={ariaLabel}
          value={selected}
          onValueChange={(next) => {
            onChange(next === UNSET ? undefined : next === STOP ? null : next)
          }}
          options={[
            ...(allowUnset ? [{ value: UNSET, label: '(延续上一曲)' }] : []),
            ...(allowStop ? [{ value: STOP, label: '(停止音乐)' }] : []),
            ...options.map((asset) => ({ value: asset.id, label: musicLabel(asset) })),
            ...(!options.length && !allowUnset && !allowStop
              ? [{ value: UNSET, label: '项目没有可用音乐' }]
              : []),
          ]}
        />
      }
      actions={
        <PreviewButton asset={typeof value === 'string' ? value : undefined} resolver={resolver} />
      }
    />
  )
}
