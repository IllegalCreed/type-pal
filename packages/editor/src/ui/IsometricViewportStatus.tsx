import type { LatticePos } from '@type-pal/reforge'

/** 地图与组合画布共用的底部状态。格点坐标只表达倾斜轴 R/C，不猜测多图层实例高度。 */
export function IsometricViewportStatus(props: {
  context: string
  zoom: number
  pointer?: LatticePos | null
  loading?: boolean
}) {
  return (
    <>
      <span className="map-viewport-status map-viewport-status--context">{props.context}</span>
      <div className="map-viewport-status-cluster">
        <span className="map-viewport-status map-viewport-status--coordinate" title="鼠标格坐标">
          {props.pointer ? `R${props.pointer.row} · C${props.pointer.col}` : 'R— · C—'}
        </span>
        <span className="map-viewport-status map-viewport-status--zoom" title="画布缩放">
          {Math.round(props.zoom * 100)}%{props.loading ? ' · 载入中…' : ''}
        </span>
      </div>
    </>
  )
}
