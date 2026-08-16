import { resolveSpriteActionPosition } from '@type-pal/reforge'
import {
  type DragEvent as ReactDragEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DsButton, DsIconButton, DsTag } from './design-system/controls.js'
import { DsObjectHero } from './design-system/recipes.js'

export interface SpriteFrameView {
  canvas: HTMLCanvasElement | undefined
  width: number
  height: number
}

export interface SemanticFrameRow {
  id: string
  label: string
  actionId?: string
  active?: boolean
  /** 按作者语义展示的具体帧序。 */
  frames: readonly number[]
  /** 引擎真正的播放步序；缺省时与 frames 相同。 */
  playbackFrames?: readonly number[]
  /** 各帧可使用不同停留时间；实例脚本预览用它表达显式 wait。 */
  playbackSteps?: readonly { frame: number; holdMs: number }[]
  /** 有值时播到末尾回到该步；缺省表示单次并停在末帧。 */
  loopFrom?: number
  frameMs?: number
  note?: string
}

export interface SemanticFrameGroup {
  id: string
  label: string
  typeLabel: string
  active?: boolean
  rows: readonly SemanticFrameRow[]
}

export interface InstanceBehaviorFrameRow extends SemanticFrameRow {
  instanceCount: number
  sceneCount: number
}

export interface InstanceBehaviorFrameGroup {
  id: string
  label: string
  /** 同一随机行为可拆成多行可能路径，实例数不能按行重复相加。 */
  instanceCount?: number
  rows: readonly InstanceBehaviorFrameRow[]
}

function drawFrame(
  target: HTMLCanvasElement,
  source: HTMLCanvasElement | undefined,
  width: number,
  height: number,
  maxScale: number,
): void {
  const context = target.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, width, height)
  if (!source) return
  context.imageSmoothingEnabled = false
  const scale = Math.min((width - 8) / source.width, (height - 8) / source.height, maxScale)
  const drawWidth = source.width * scale
  const drawHeight = source.height * scale
  context.drawImage(source, (width - drawWidth) / 2, height - 4 - drawHeight, drawWidth, drawHeight)
}

export function SpriteFrameCanvas(props: {
  source: HTMLCanvasElement | undefined
  width: number
  height: number
  maxScale: number
  label?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) drawFrame(ref.current, props.source, props.width, props.height, props.maxScale)
  }, [props.height, props.maxScale, props.source, props.width])
  return (
    <canvas
      ref={ref}
      width={props.width}
      height={props.height}
      className="sprite-frame-canvas"
      role={props.label ? 'img' : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : true}
    />
  )
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const update = (): void => setReduced(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return reduced
}

function AnimatedFrameCanvas(props: {
  frames: readonly SpriteFrameView[]
  steps: readonly { frame: number; holdMs: number }[]
  loopFrom?: number
  label: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    const target = ref.current
    if (!target || !props.frames.length || !props.steps.length) return
    const action = {
      label: props.label,
      steps: props.steps.map((step) => ({
        frame: step.frame,
        durationMs: step.holdMs,
      })),
      ...(props.loopFrom === undefined ? {} : { loopFrom: props.loopFrom }),
    }
    const loop = props.loopFrom !== undefined
    const startedAt = window.performance.now()
    let timer: number | undefined
    const paint = (): void => {
      const elapsedMs = reducedMotion ? 0 : Math.max(0, window.performance.now() - startedAt)
      const position = resolveSpriteActionPosition(action, elapsedMs, loop)
      const step = action.steps[position.stepIndex]
      const requested = position.frame
      const safeIndex = requested >= 0 && requested < props.frames.length ? requested : 0
      drawFrame(target, props.frames[safeIndex]?.canvas, 72, 72, 3)
      if (!reducedMotion && !position.finished && props.steps.length > 1)
        timer = window.setTimeout(
          paint,
          Math.max(16, (step?.durationMs ?? 200) - position.elapsedInStepMs),
        )
    }
    paint()
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [props.frames, props.label, props.loopFrom, props.steps, reducedMotion])
  return (
    <canvas
      ref={ref}
      width={72}
      height={72}
      className="sprite-frame-canvas"
      role="img"
      aria-label={props.label}
    />
  )
}

function FrameCell(props: {
  frames: readonly SpriteFrameView[]
  index: number
  selected?: boolean
  onSelect?: (index: number) => void
  draggable?: boolean
  onDragStart?: (event: ReactDragEvent<HTMLButtonElement>, index: number) => void
}) {
  const exists = props.index >= 0 && props.index < props.frames.length
  const safeIndex = exists ? props.index : 0
  const frame = props.frames[safeIndex]
  const body = (
    <>
      <SpriteFrameCanvas source={frame?.canvas} width={72} height={72} maxScale={3} />
      <span className="sprite-frame-cell-caption">
        <b>#{props.index}</b>
        <small>{exists ? `${frame?.width ?? 0}×${frame?.height ?? 0}` : '缺失→#0'}</small>
      </span>
    </>
  )
  if (!props.onSelect)
    return <figure className={`sprite-frame-cell${exists ? '' : ' missing'}`}>{body}</figure>
  return (
    <button
      type="button"
      className={`sprite-frame-cell${props.selected ? ' selected' : ''}${exists ? '' : ' missing'}`}
      aria-pressed={props.selected}
      aria-label={
        exists
          ? `选择源帧 ${props.index}，${frame?.width ?? 0} × ${frame?.height ?? 0} 像素`
          : `帧 ${props.index} 缺失，运行时回退到第 0 帧`
      }
      draggable={props.draggable}
      onDragStart={(event) => props.onDragStart?.(event, props.index)}
      onClick={() => props.onSelect?.(props.index)}
    >
      {body}
    </button>
  )
}

export function RawFrameInspector(props: {
  label: string
  asset: string
  frames: readonly SpriteFrameView[]
  selectedFrame: number
  consumerCount: number
  onSelect: (index: number) => void
  onAppend?: () => void
  onReplace?: () => void
  onDelete?: () => void
  busy?: boolean
  editorMessage?: string
  editorMessageKind?: 'info' | 'error'
  editorPanel?: React.ReactNode
  showHero?: boolean
  onFrameDragStart?: (event: ReactDragEvent<HTMLButtonElement>, index: number) => void
}) {
  const listId = useId()
  const total = props.frames.length
  const safeFrame = Math.min(Math.max(0, props.selectedFrame), Math.max(0, total - 1))
  const frame = props.frames[safeFrame]
  return (
    <section className="sprite-raw-inspector" aria-label="源帧检查器">
      {props.showHero === false ? null : (
        <DsObjectHero
          eyebrow="源帧资源"
          title={props.label}
          objectId={props.asset}
          meta={
            <DsTag tone="neutral">
              {total} 帧 · {props.consumerCount} 个用途定义
            </DsTag>
          }
        />
      )}
      <div className="sprite-raw-toolbar" role="toolbar" aria-label="源帧编辑">
        <span>
          当前帧 <b>#{safeFrame}</b>
        </span>
        <span className="spacer" />
        {props.onAppend ? (
          <DsButton variant="secondary" icon="add" disabled={props.busy} onClick={props.onAppend}>
            追加帧…
          </DsButton>
        ) : null}
        {props.onReplace ? (
          <DsButton variant="secondary" disabled={props.busy} onClick={props.onReplace}>
            替换当前帧…
          </DsButton>
        ) : null}
        {props.onDelete ? (
          <DsButton
            variant="danger"
            icon="delete"
            disabled={props.busy || total <= 1}
            title={total <= 1 ? '源帧至少保留一帧' : '删除当前帧'}
            onClick={props.onDelete}
          >
            删除当前帧
          </DsButton>
        ) : null}
      </div>
      {props.editorMessage ? (
        <p
          className={`sprite-raw-editor-message${props.editorMessageKind === 'error' ? ' error' : ''}`}
          role={props.editorMessageKind === 'error' ? 'alert' : 'status'}
        >
          {props.editorMessage}
        </p>
      ) : null}
      {props.editorPanel}
      <div className="sprite-resource-viewer-body">
        <section className="sprite-resource-current" aria-label="当前源帧">
          <div className="sprite-resource-current-stage">
            <SpriteFrameCanvas
              source={frame?.canvas}
              width={220}
              height={220}
              maxScale={6}
              label={`${props.label} 第 ${safeFrame} 帧`}
            />
          </div>
          <div className="sprite-resource-current-info">
            <div>
              <strong>帧 #{safeFrame}</strong>
              <span>{frame ? `${frame.width} × ${frame.height} px` : '尺寸未知'}</span>
            </div>
            <fieldset className="sprite-resource-frame-nav">
              <legend className="sprite-image-viewer-tools-label">切换当前帧</legend>
              <DsIconButton
                variant="secondary"
                icon="chevron-left"
                label="上一帧"
                disabled={safeFrame <= 0}
                onClick={() => props.onSelect(Math.max(0, safeFrame - 1))}
              />
              <output aria-live="polite">
                {safeFrame + 1} / {total}
              </output>
              <DsIconButton
                variant="secondary"
                icon="chevron-right"
                label="下一帧"
                disabled={safeFrame >= total - 1}
                onClick={() => props.onSelect(Math.min(total - 1, safeFrame + 1))}
              />
            </fieldset>
          </div>
          <p>
            {props.consumerCount
              ? `这 ${total} 帧由 ${props.consumerCount} 个用途共享；修改源帧会同时影响它们。`
              : `这 ${total} 帧尚未设置用途，仍可直接编辑、保留或删除源资源。`}
          </p>
        </section>
        <section className="sprite-resource-frames" aria-labelledby={listId}>
          <div className="sprite-resource-frames-head">
            <div>
              <strong id={listId}>全部源帧</strong>
              <span>
                {props.onFrameDragStart
                  ? '点击选中帧；也可拖入右侧动作阶段槽'
                  : '点击任一帧选中，再替换或删除'}
              </span>
            </div>
            <b>{total}</b>
          </div>
          <div className="sprite-resource-frame-grid">
            {props.frames.map((_, index) => (
              <FrameCell
                key={index}
                frames={props.frames}
                index={index}
                selected={index === safeFrame}
                onSelect={props.onSelect}
                draggable={!!props.onFrameDragStart}
                onDragStart={props.onFrameDragStart}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function FrameRowView(props: {
  groupLabel: string
  row: SemanticFrameRow
  frames: readonly SpriteFrameView[]
  onFrameSelect?: (index: number) => void
  action?: React.ReactNode
  emptyLabel?: string
  onActivate?: () => void
}) {
  const playback = props.row.playbackFrames ?? props.row.frames
  const playbackSteps =
    props.row.playbackSteps ??
    playback.map((frame) => ({ frame, holdMs: props.row.frameMs ?? 200 }))
  const animated = playbackSteps.length > 1
  return (
    <div className={`semantic-frame-row${props.row.active ? ' active' : ''}`}>
      <div className="semantic-frame-row-label">
        {props.onActivate ? (
          <button type="button" onClick={props.onActivate}>
            {props.row.label}
          </button>
        ) : (
          <b>{props.row.label}</b>
        )}
        {props.row.note ? <span>{props.row.note}</span> : null}
        {props.action}
      </div>
      <div className="semantic-frame-track">
        {animated ? (
          <figure className="sprite-frame-cell animated">
            <AnimatedFrameCanvas
              frames={props.frames}
              steps={playbackSteps}
              loopFrom={props.row.loopFrom}
              label={`${props.groupLabel} ${props.row.label}动态预览`}
            />
            <span className="sprite-frame-cell-caption">
              <b>▶</b>
              <small>动态</small>
            </span>
          </figure>
        ) : null}
        {props.row.frames.length ? (
          props.row.frames.map((index, position) => (
            <FrameCell
              key={`${position}:${index}`}
              frames={props.frames}
              index={index}
              onSelect={props.onFrameSelect}
            />
          ))
        ) : (
          <span className="semantic-frame-unconfigured">{props.emptyLabel ?? '尚未设置'}</span>
        )}
      </div>
    </div>
  )
}

export function SemanticFrameShelf(props: {
  frames: readonly SpriteFrameView[]
  groups: readonly SemanticFrameGroup[]
  onGroupSelect?: (id: string) => void
  onActionSelect?: (groupId: string, actionId: string) => void
  onFrameSelect?: (index: number) => void
}) {
  const groupIds = useMemo(() => new Set(props.groups.map((group) => group.id)), [props.groups])
  if (!props.groups.length)
    return (
      <section className="semantic-frame-shelf empty" aria-label="用途定义与动作">
        <div>
          <strong>用途定义与动作</strong>
          <span>尚未创建用途定义；源帧资源本身仍完整保留。</span>
        </div>
      </section>
    )
  return (
    <section className="semantic-frame-shelf" aria-label="用途定义与动作">
      <header>
        <div>
          <strong>用途定义与动作</strong>
          <span>每个用途如何解释同一组源帧；场景实例脚本行为在下方单独列出。</span>
        </div>
        <b>{groupIds.size} 个用途定义</b>
      </header>
      <div className="semantic-frame-groups">
        {props.groups.map((group) => (
          <article
            key={group.id}
            className={`semantic-frame-group${group.active ? ' active' : ''}`}
          >
            <button
              type="button"
              className="semantic-frame-group-head"
              aria-pressed={group.active}
              onClick={() => props.onGroupSelect?.(group.id)}
            >
              <span>
                <b>{group.label}</b>
                <code>{group.id}</code>
              </span>
              <em>{group.typeLabel}</em>
            </button>
            <div className="semantic-frame-rows">
              {group.rows.map((row) => (
                <FrameRowView
                  key={row.id}
                  groupLabel={group.label}
                  row={row}
                  frames={props.frames}
                  onFrameSelect={props.onFrameSelect}
                  onActivate={
                    row.actionId ? () => props.onActionSelect?.(group.id, row.actionId!) : undefined
                  }
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function InstanceBehaviorShelf(props: {
  frames: readonly SpriteFrameView[]
  groups: readonly InstanceBehaviorFrameGroup[]
  onFrameSelect?: (index: number) => void
  onOpenLocations?: (definitionId: string) => void
}) {
  if (!props.groups.length) return null
  const instanceCount = props.groups.reduce(
    (total, group) =>
      total +
      (group.instanceCount ??
        group.rows.reduce((groupTotal, row) => groupTotal + row.instanceCount, 0)),
    0,
  )
  return (
    <section className="instance-behavior-shelf" aria-label="场景实例自动行为">
      <header>
        <div>
          <strong>场景实例自动行为</strong>
          <span>从场景第 0 页自动脚本派生；只读展示，不会改写用途定义。</span>
        </div>
        <b>{instanceCount} 个实例</b>
      </header>
      <div className="instance-behavior-groups">
        {props.groups.map((group) => {
          const groupInstanceCount =
            group.instanceCount ?? group.rows.reduce((total, row) => total + row.instanceCount, 0)
          return (
            <article className="instance-behavior-group" key={group.id}>
              <div className="instance-behavior-group-head">
                <span>
                  <b>{group.label}</b>
                  <code>{group.id}</code>
                </span>
                <div className="instance-behavior-group-actions">
                  <em>实例脚本</em>
                  {props.onOpenLocations ? (
                    <button
                      type="button"
                      className="instance-behavior-location-link"
                      onClick={() => props.onOpenLocations?.(group.id)}
                    >
                      查看全部 {groupInstanceCount} 个使用位置 ↗
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="semantic-frame-rows">
                {group.rows.map((row) => (
                  <FrameRowView
                    key={row.id}
                    groupLabel={group.label}
                    row={row}
                    frames={props.frames}
                    onFrameSelect={props.onFrameSelect}
                    emptyLabel="脚本行为无法安全生成帧预览"
                  />
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
