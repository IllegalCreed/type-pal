import type { Palette, RleFrame } from '@type-pal/reforge'
import { bakeFrame } from '@type-pal/reforge'
import { memo, useLayoutEffect, useRef } from 'react'

export interface TilePickerGridProps {
  ariaLabel: string
  entries: readonly (readonly [number, RleFrame])[]
  palette: Palette
  selectedTileId: number
  onPick: (tileId: number) => void
}

const TilePickerItem = memo(function TilePickerItem(props: {
  tileId: number
  frame: RleFrame
  palette: Palette
  selected: boolean
  onPick: (tileId: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bakeFrame(props.frame, props.palette), 0, 0)
  }, [props.frame, props.palette])

  return (
    <button
      type="button"
      className={`tile-picker-item${props.selected ? ' is-selected' : ''}`}
      title={`瓦片 #${props.tileId}`}
      aria-label={`瓦片 #${props.tileId}`}
      aria-pressed={props.selected}
      onClick={() => props.onPick(props.tileId)}
    >
      <span aria-hidden="true">
        <canvas ref={canvasRef} width={props.frame.width} height={props.frame.height} />
      </span>
    </button>
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
