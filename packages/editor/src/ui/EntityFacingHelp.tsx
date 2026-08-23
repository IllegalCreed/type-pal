import type { Facing } from '@type-pal/content'
import { DsHelpTip } from './design-system/index.js'

export const ENTITY_FACING_OPTIONS: readonly {
  value: Facing
  label: string
  description: string
}[] = [
  { value: 'down', label: '下', description: '屏幕左下' },
  { value: 'left', label: '左', description: '屏幕左上' },
  { value: 'up', label: '上', description: '屏幕右上' },
  { value: 'right', label: '右', description: '屏幕右下' },
]

/**
 * 等距地图的逻辑方向沿菱形轴，而不是沿屏幕正交轴。
 * 图示只保留方向骨架，避免人物和箭头喧宾夺主。
 */
export function EntityFacingHelpTip() {
  return (
    <DsHelpTip label="场景实体朝向">
      <span className="entity-facing-help">
        <svg
          className="entity-facing-help__diagram"
          viewBox="0 0 176 120"
          role="img"
          aria-label="等距地图方向：左在左上，上在右上，下在左下，右在右下"
          focusable="false"
        >
          <path className="entity-facing-help__grid" d="M88 25 136 60 88 95 40 60Z" />
          <text className="entity-facing-help__label" x="12" y="24">
            左
          </text>
          <text className="entity-facing-help__label" x="150" y="24">
            上
          </text>
          <text className="entity-facing-help__label" x="12" y="108">
            下
          </text>
          <text className="entity-facing-help__label" x="150" y="108">
            右
          </text>
        </svg>
      </span>
    </DsHelpTip>
  )
}
