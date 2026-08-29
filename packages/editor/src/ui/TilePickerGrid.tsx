import type { Palette, RleFrame } from '@type-pal/reforge'
import { bakeFrame } from '@type-pal/reforge'
import { memo, useLayoutEffect, useRef } from 'react'
import { DsButton, DsSelect, DsPressable } from './design-system/index.js'

export interface TilePickerGridProps {
  ariaLabel: string
  entries: readonly (readonly [number, RleFrame])[]
  palette: Palette
  selectedTileId: number
  onPick: (tileId: number) => void
}

export interface TilePalettePickerProps extends TilePickerGridProps {
  tilesetAriaLabel: string
  tilesetOptions: readonly { value: string; label: string }[]
  selectedTilesetId: string
  onSelectTileset: (tilesetId: string) => void
}

export const TileFramePreview = memo(function TileFramePreview(props: {
  frame?: RleFrame
  palette?: Palette
  className?: 'map-current-paint-tile__preview'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !props.frame || !props.palette) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bakeFrame(props.frame, props.palette), 0, 0)
  }, [props.frame, props.palette])

  return (
    <span
      className={
        props.className === 'map-current-paint-tile__preview'
          ? 'tile-frame-preview map-current-paint-tile__preview'
          : 'tile-frame-preview'
      }
      data-unavailable={!props.frame || !props.palette || undefined}
      aria-hidden="true"
    >
      {props.frame && props.palette ? (
        <canvas ref={canvasRef} width={props.frame.width} height={props.frame.height} />
      ) : (
        <span>—</span>
      )}
    </span>
  )
})

export const CurrentPaintTileButton = memo(function CurrentPaintTileButton(props: {
  tilesetId?: string
  tilesetName?: string
  tileId?: number
  frame?: RleFrame
  palette?: Palette
  onOpenPicker: () => void
}) {
  const available = Boolean(props.tilesetId && props.frame && props.palette)
  const tilesetLabel = props.tilesetId
    ? props.tilesetName && props.tilesetName !== props.tilesetId
      ? `${props.tilesetName}（${props.tilesetId}）`
      : props.tilesetId
    : '未选择瓦片集'
  const tileLabel = props.tileId === undefined ? '未选择瓦片' : `瓦片 #${props.tileId}`
  const identity = `${tilesetLabel} · ${tileLabel}`

  return (
    <DsButton
      size="compact"
      variant="secondary"
      className="map-current-paint-tile"
      aria-label={
        available ? `当前绘制瓦片：${identity}；打开瓦片面板` : `当前绘制瓦片不可用：${identity}`
      }
      title={
        available ? `当前绘制：${identity}；点击打开瓦片面板` : '暂无可绘制瓦片，请在绘制面板选择'
      }
      disabled={!available}
      onClick={props.onOpenPicker}
    >
      <TileFramePreview
        frame={props.frame}
        palette={props.palette}
        className="map-current-paint-tile__preview"
      />
      <span className="map-current-paint-tile__id">
        {props.tileId === undefined ? '—' : `#${props.tileId}`}
      </span>
    </DsButton>
  )
})

const TilePickerItem = memo(function TilePickerItem(props: {
  tileId: number
  frame: RleFrame
  palette: Palette
  selected: boolean
  onPick: (tileId: number) => void
}) {
  return (
    <DsPressable
      type="button"
      className={`tile-picker-item${props.selected ? ' is-selected' : ''}`}
      title={`瓦片 #${props.tileId}`}
      aria-label={`瓦片 #${props.tileId}`}
      aria-pressed={props.selected}
      onClick={() => props.onPick(props.tileId)}
    >
      <TileFramePreview frame={props.frame} palette={props.palette} />
    </DsPressable>
  )
})

export const TilePickerGrid = memo(function TilePickerGrid(props: TilePickerGridProps) {
  return (
    <fieldset className="tile-picker-grid">
      <legend className="map-a11y-legend">{props.ariaLabel}</legend>
      {props.entries.map(([tileId, frame]) => (
        <TilePickerItem
          key={tileId}
          tileId={tileId}
          frame={frame}
          palette={props.palette}
          selected={tileId === props.selectedTileId}
          onPick={props.onPick}
        />
      ))}
    </fieldset>
  )
})

export const TilePalettePicker = memo(function TilePalettePicker(props: TilePalettePickerProps) {
  return (
    <div className="tile-palette-picker">
      <DsSelect
        searchable
        size="compact"
        aria-label={props.tilesetAriaLabel}
        value={props.selectedTilesetId}
        options={props.tilesetOptions}
        onValueChange={props.onSelectTileset}
      />
      <TilePickerGrid
        ariaLabel={props.ariaLabel}
        entries={props.entries}
        palette={props.palette}
        selectedTileId={props.selectedTileId}
        onPick={props.onPick}
      />
    </div>
  )
})
