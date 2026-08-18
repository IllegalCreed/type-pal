import type { ReactNode } from 'react'
import { DsButton, DsMenuBar } from './design-system/index.js'

export type IsometricEditorTool =
  | 'pan'
  | 'select'
  | 'eyedropper'
  | 'brush'
  | 'rect'
  | 'fill'
  | 'erase'
  | 'collision'

const TOOL_DEFINITIONS: readonly {
  id: IsometricEditorTool
  label: string
  title: string
  group: 'navigate' | 'paint' | 'collision'
}[] = [
  { id: 'pan', label: '✋ 平移', title: '平移画布', group: 'navigate' },
  { id: 'select', label: '⛶ 选择', title: '选择已有内容', group: 'navigate' },
  { id: 'eyedropper', label: '◉ 取样', title: '取样瓦片与实例高度', group: 'paint' },
  { id: 'brush', label: '🖌 笔刷', title: '绘制选中瓦片', group: 'paint' },
  { id: 'rect', label: '▭ 矩形', title: '矩形铺瓦', group: 'paint' },
  { id: 'fill', label: '🪣 填充', title: '填充连通区域', group: 'paint' },
  { id: 'erase', label: '⌫ 擦除', title: '擦除瓦片', group: 'paint' },
  { id: 'collision', label: '⛔ 碰撞', title: '绘制独立碰撞层', group: 'collision' },
]

export function IsometricEditorToolbar(props: {
  activeTool?: IsometricEditorTool
  onToolChange: (tool: IsometricEditorTool) => void
  disabledTools?: Partial<Record<IsometricEditorTool, boolean>>
  selectionAriaLabel?: string
  selectionOptions?: ReactNode
  collisionPaint: 'set' | 'clear'
  onCollisionPaintChange: (paint: 'set' | 'clear') => void
  collisionOptions?: ReactNode
  showGrid: boolean
  onShowGridChange: (show: boolean) => void
  showCollision: boolean
  onShowCollisionChange: (show: boolean) => void
}) {
  const renderTools = (group: 'navigate' | 'paint' | 'collision'): ReactNode =>
    TOOL_DEFINITIONS.filter((tool) => tool.group === group).map((tool) => (
      <DsButton
        key={tool.id}
        size="compact"
        variant="quiet"
        aria-pressed={props.activeTool === tool.id}
        aria-label={tool.id === 'select' ? (props.selectionAriaLabel ?? '选择地图内容') : undefined}
        onClick={() => props.onToolChange(tool.id)}
        disabled={props.disabledTools?.[tool.id]}
        title={tool.title}
      >
        {tool.label}
      </DsButton>
    ))

  return (
    <>
      <div className="tool-group">
        {renderTools('navigate')}
        {props.activeTool === 'select' && props.selectionOptions ? (
          <fieldset className="map-inline-option">
            <legend className="visually-hidden">选择工具选项</legend>
            {props.selectionOptions}
          </fieldset>
        ) : null}
      </div>
      <div className="tool-group">{renderTools('paint')}</div>
      <div className="tool-group">
        {renderTools('collision')}
        {props.activeTool === 'collision' ? (
          <fieldset className="map-inline-option map-collision-options">
            <legend className="visually-hidden">碰撞工具选项</legend>
            <DsButton
              size="compact"
              variant={props.collisionPaint === 'set' ? 'primary' : 'quiet'}
              aria-pressed={props.collisionPaint === 'set'}
              onClick={() => props.onCollisionPaintChange('set')}
              disabled={props.disabledTools?.collision}
              title="标记阻挡"
            >
              标记
            </DsButton>
            <DsButton
              size="compact"
              variant={props.collisionPaint === 'clear' ? 'primary' : 'quiet'}
              aria-pressed={props.collisionPaint === 'clear'}
              onClick={() => props.onCollisionPaintChange('clear')}
              disabled={props.disabledTools?.collision}
              title="清除阻挡"
            >
              清除
            </DsButton>
            {props.collisionOptions}
          </fieldset>
        ) : null}
      </div>
      <div className="tool-group map-view-menu">
        <DsMenuBar
          label="画布显示"
          menus={[
            {
              id: 'view',
              label: '视图',
              items: [
                {
                  id: 'grid',
                  label: '显示网格',
                  checked: props.showGrid,
                  onSelect: () => props.onShowGridChange(!props.showGrid),
                },
                {
                  id: 'collision',
                  label: '显示碰撞',
                  checked: props.showCollision,
                  onSelect: () => props.onShowCollisionChange(!props.showCollision),
                },
              ],
            },
          ]}
        />
      </div>
    </>
  )
}
