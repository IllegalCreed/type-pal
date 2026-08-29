import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  ISOMETRIC_BRUSH_SIZES,
  type IsometricBrushSize,
  MAX_ISOMETRIC_BRUSH_SIZE,
} from '../core/isometric-brush.js'
import { DsButton, DsMenuBar } from './design-system/index.js'
import { DsFloatingLayer } from './design-system/floating-layer.js'

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

function BrushSizeGlyph(props: { size: IsometricBrushSize }) {
  return (
    <span className="map-brush-size-glyph" aria-hidden="true">
      {Array.from({ length: MAX_ISOMETRIC_BRUSH_SIZE ** 2 }, (_, index) => {
        const row = Math.floor(index / MAX_ISOMETRIC_BRUSH_SIZE)
        const col = index % MAX_ISOMETRIC_BRUSH_SIZE
        return <i key={index} data-active={row < props.size && col < props.size} />
      })}
    </span>
  )
}

function ToolOptionTray<T extends number>(props: {
  label: string
  title: string
  value: T
  options: readonly T[]
  disabled?: boolean
  align?: 'start' | 'end'
  renderIcon: (value: T) => ReactNode
  optionLabel: (value: T) => string
  onChange: (value: T) => void
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef(new Map<T, HTMLButtonElement>())

  useEffect(() => {
    if (props.disabled) setOpen(false)
  }, [props.disabled])

  useEffect(() => {
    if (open) focusOption(props.value)
  }, [open, props.value])

  function focusOption(value: T): void {
    requestAnimationFrame(() => optionRefs.current.get(value)?.focus())
  }

  function openTray(): void {
    if (props.disabled) return
    setOpen(true)
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>, direction: -1 | 1): void {
    const current = props.options.findIndex(
      (option) => optionRefs.current.get(option) === document.activeElement,
    )
    const next = (Math.max(0, current) + direction + props.options.length) % props.options.length
    const option = props.options[next]
    if (option !== undefined) optionRefs.current.get(option)?.focus()
    event.preventDefault()
  }

  return (
    <div
      className="map-tool-option"
      data-align={props.align ?? 'start'}
      data-open={open || undefined}
    >
      <DsButton
        ref={triggerRef}
        size="compact"
        variant="quiet"
        className="map-tool-option-trigger"
        aria-label={props.label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={props.disabled}
        title={`${props.title} · 当前 ${props.optionLabel(props.value)}`}
        onClick={() => {
          if (open) setOpen(false)
          else openTray()
        }}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
            openTray()
            event.preventDefault()
          }
        }}
      >
        {props.renderIcon(props.value)}
      </DsButton>
      <DsFloatingLayer
        open={open}
        anchorRef={triggerRef}
        layerRef={layerRef}
        className="map-tool-option-layer"
        width="content"
        align={props.align ?? 'start'}
        gap={7}
        maxHeight={360}
        onDismiss={() => {
          setOpen(false)
          triggerRef.current?.focus()
        }}
      >
        <div
          id={panelId}
          role="listbox"
          aria-label={`${props.label}选项`}
          aria-orientation="horizontal"
          className="map-tool-option-tray"
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') moveFocus(event, 1)
            else if (event.key === 'ArrowLeft') moveFocus(event, -1)
            else if (event.key === 'Home') {
              const option = props.options[0]
              if (option !== undefined) optionRefs.current.get(option)?.focus()
              event.preventDefault()
            } else if (event.key === 'End') {
              const option = props.options.at(-1)
              if (option !== undefined) optionRefs.current.get(option)?.focus()
              event.preventDefault()
            } else if (event.key === 'Escape') {
              setOpen(false)
              triggerRef.current?.focus()
              event.preventDefault()
            }
          }}
        >
          {props.options.map((option) => (
            <DsButton
              key={option}
              ref={(node) => {
                if (node) optionRefs.current.set(option, node)
                else optionRefs.current.delete(option)
              }}
              size="compact"
              variant={option === props.value ? 'primary' : 'quiet'}
              className="map-tool-option-choice"
              role="option"
              aria-selected={option === props.value}
              aria-label={props.optionLabel(option)}
              title={props.optionLabel(option)}
              onClick={() => {
                props.onChange(option)
                setOpen(false)
                triggerRef.current?.focus()
              }}
            >
              {props.renderIcon(option)}
            </DsButton>
          ))}
        </div>
      </DsFloatingLayer>
    </div>
  )
}

export function IsometricEditorToolbar(props: {
  activeTool?: IsometricEditorTool
  onToolChange: (tool: IsometricEditorTool) => void
  disabledTools?: Partial<Record<IsometricEditorTool, boolean>>
  selectionAriaLabel?: string
  selectionOptions?: ReactNode
  paintTileControl?: ReactNode
  brushSize: IsometricBrushSize
  onBrushSizeChange: (size: IsometricBrushSize) => void
  paintHeight: number
  maxPaintHeight: number
  paintHeightDisabled?: boolean
  onPaintHeightChange: (height: number) => void
  collisionPaint: 'set' | 'clear'
  onCollisionPaintChange: (paint: 'set' | 'clear') => void
  collisionOptions?: ReactNode
  showGrid: boolean
  onShowGridChange: (show: boolean) => void
  showCollision: boolean
  onShowCollisionChange: (show: boolean) => void
}) {
  const showPaintHeight =
    props.activeTool === 'brush' || props.activeTool === 'rect' || props.activeTool === 'fill'
  const paintHeightOptions = Array.from(
    { length: Math.max(0, Math.min(255, props.maxPaintHeight)) + 1 },
    (_, height) => height,
  )
  const renderTools = (group: 'navigate' | 'paint' | 'collision'): ReactNode[] =>
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
      <div className="tool-group">
        {renderTools('paint').slice(0, 1)}
        {props.paintTileControl}
      </div>
      <div className="tool-group">
        {TOOL_DEFINITIONS.filter((tool) => tool.group === 'paint' && tool.id !== 'eyedropper').map(
          (tool) => (
            <Fragment key={tool.id}>
              <DsButton
                size="compact"
                variant="quiet"
                aria-pressed={props.activeTool === tool.id}
                onClick={() => props.onToolChange(tool.id)}
                disabled={props.disabledTools?.[tool.id]}
                title={tool.title}
              >
                {tool.label}
              </DsButton>
              {tool.id === 'brush' && props.activeTool === 'brush' ? (
                <ToolOptionTray
                  label="笔刷面积"
                  title="选择笔刷一次绘制的格阵范围"
                  value={props.brushSize}
                  options={ISOMETRIC_BRUSH_SIZES}
                  renderIcon={(size) => <BrushSizeGlyph size={size} />}
                  optionLabel={(size) => `${size} × ${size}`}
                  onChange={props.onBrushSizeChange}
                />
              ) : null}
            </Fragment>
          ),
        )}
        {showPaintHeight ? (
          <ToolOptionTray
            label="绘制高度"
            title="选择笔刷、矩形和填充共用的实例高度"
            value={props.paintHeight}
            options={paintHeightOptions}
            disabled={props.paintHeightDisabled}
            align="end"
            renderIcon={(height) => <span className="map-paint-height-label">H{height}</span>}
            optionLabel={(height) => `H${height}`}
            onChange={props.onPaintHeightChange}
          />
        ) : null}
      </div>
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
          popupAlign="end"
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
