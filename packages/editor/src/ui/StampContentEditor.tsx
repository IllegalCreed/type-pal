import type { AssetCatalogV1, StampTemplateV1 } from '@type-pal/content'
import type { AssetBase, Palette, RleFrame, TilesetDef } from '@type-pal/reforge'
import { bakeFrame } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { GridPointRef } from '../core/map-selection.js'
import { latticeU, nudgeIsometricLattice } from '../core/map-transform.js'
import {
  addStampDraftLayer,
  canonicalizeStampDraft,
  deleteStampDraftLayer,
  eraseStampDraftCollision,
  eraseStampDraftVisual,
  moveStampDraftLayer,
  moveStampDraftSelection,
  nextStampLayerSlotId,
  openStampDraft,
  reanchorStampDraft,
  setStampDraftCollision,
  setStampDraftVisual,
  stampDraftBounds,
  stampDraftPoint,
  stampDraftPointKey,
  updateStampDraftLayer,
} from '../core/stamp-draft.js'
import {
  DsButton,
  DsDialog,
  DsIconButton,
  DsNumberInput,
  DsSelect,
  DsTabs,
  DsTag,
  DsTextInput,
} from './design-system/index.js'
import {
  loadStampPreviewAssets,
  type StampPreviewAssets,
  StampPreviewCanvas,
} from './StampPreviewCanvas.js'

type StampDraftTool = 'paint' | 'erase' | 'select'
type StampDraftChannelKind = 'visual' | 'collision'

function TileFrameButton(props: {
  tileId: number
  frame: RleFrame
  palette: Palette
  selected: boolean
  onPick: () => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bakeFrame(props.frame, props.palette), 0, 0)
  }, [props.frame, props.palette])
  return (
    <button
      type="button"
      className={`stamp-draft-tile${props.selected ? ' selected' : ''}`}
      aria-label={`瓦片 #${props.tileId}`}
      aria-pressed={props.selected}
      onClick={props.onPick}
    >
      <span aria-hidden="true">
        <canvas ref={ref} width={props.frame.width} height={props.frame.height} />
      </span>
      <small>#{props.tileId}</small>
    </button>
  )
}

function parsePointKey(key: string): GridPointRef {
  const [row, col] = key.split(':').map(Number)
  return { row: row!, col: col! }
}

export function StampContentEditor(props: {
  template: StampTemplateV1
  mode: 'create' | 'edit'
  tilesets: readonly TilesetDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase: AssetBase
  onSave: (template: StampTemplateV1, takeOwnership: boolean) => void
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [baseline] = useState(() => openStampDraft(props.template))
  const [draft, setDraft] = useState(() => openStampDraft(props.template))
  const [activeSlotId, setActiveSlotId] = useState(props.template.layerSlots[0]?.id ?? '')
  const [channel, setChannel] = useState<StampDraftChannelKind>('visual')
  const [tool, setTool] = useState<StampDraftTool>('paint')
  const [selectedTileId, setSelectedTileId] = useState(props.template.visual[0]?.tileId ?? 0)
  const [height, setHeight] = useState(props.template.visual[0]?.height ?? 0)
  const [collisionValue, setCollisionValue] = useState(1)
  const [selectedPointKeys, setSelectedPointKeys] = useState<Set<string>>(() => new Set())
  const [assets, setAssets] = useState<StampPreviewAssets>()
  const [assetError, setAssetError] = useState('')
  const [error, setError] = useState('')
  const [tileQuery, setTileQuery] = useState('')
  const [tileLimit, setTileLimit] = useState(120)
  const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<string>()
  const [takeoverOpen, setTakeoverOpen] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)
  const tileset = props.tilesets.find((candidate) => candidate.id === draft.tilesetId)
  const revision = tileset
    ? (props.assetCatalog.assets[tileset.asset]?.sha256 ?? 'missing')
    : 'missing'
  const activeSlot = draft.layerSlots.find((slot) => slot.id === activeSlotId)

  useEffect(() => props.onDirtyChange?.(dirty), [dirty, props.onDirtyChange])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent): void => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    if (activeSlot?.depthMode === 'flat') setHeight(0)
  }, [activeSlot?.depthMode])
  // biome-ignore lint/correctness/useExhaustiveDependencies: selection belongs to the active channel/slot identity and must reset when either changes.
  useEffect(() => {
    setSelectedPointKeys(new Set())
  }, [activeSlotId, channel])

  useEffect(() => {
    let alive = true
    setAssets(undefined)
    setAssetError('')
    if (!tileset) {
      setAssetError(`来源瓦片集 “${draft.tilesetId}” 不存在。`)
      return
    }
    void loadStampPreviewAssets(props.assetBase, props.assetReader, tileset, revision).then(
      (next) => {
        if (!alive) return
        setAssets(next)
        const firstTileId = [...next.frames.keys()].sort((left, right) => left - right)[0]
        if (firstTileId === undefined) {
          setAssetError(`瓦片集 “${draft.tilesetId}” 没有可用瓦片。`)
          return
        }
        setSelectedTileId((current) => (next.frames.has(current) ? current : firstTileId))
        if (props.mode === 'create' && draft.visual.length === 0 && activeSlotId)
          setDraft((current) =>
            current.visual.length
              ? current
              : setStampDraftVisual(current, activeSlotId, { row: 0, col: 0 }, firstTileId, 0),
          )
      },
      (cause) => {
        if (alive) setAssetError(cause instanceof Error ? cause.message : String(cause))
      },
    )
    return () => {
      alive = false
    }
  }, [
    activeSlotId,
    draft.tilesetId,
    draft.visual.length,
    props.assetBase,
    props.assetReader,
    props.mode,
    revision,
    tileset,
  ])

  const update = (produce: (current: StampTemplateV1) => StampTemplateV1): void => {
    try {
      setDraft((current) => produce(current))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const selectedPoints = useMemo(
    () => [...selectedPointKeys].map(parsePointKey),
    [selectedPointKeys],
  )
  const activeVisualByPoint = useMemo(
    () =>
      new Map(
        draft.visual
          .filter((member) => member.layerSlotId === activeSlotId)
          .map((member) => [stampDraftPointKey(stampDraftPoint(member.offset)), member] as const),
      ),
    [activeSlotId, draft.visual],
  )
  const collisionByPoint = useMemo(
    () =>
      new Map(
        draft.collision.map(
          (member) => [stampDraftPointKey(stampDraftPoint(member.offset)), member] as const,
        ),
      ),
    [draft.collision],
  )
  const bounds = useMemo(() => stampDraftBounds(draft, 2), [draft])
  const latticePoints = useMemo(() => {
    const points: GridPointRef[] = []
    for (let row = bounds.minRow; row <= bounds.maxRow; row += 1)
      for (let col = bounds.minCol; col <= bounds.maxCol; col += 1) points.push({ row, col })
    return points
  }, [bounds])
  const stageWidth = (bounds.maxU - bounds.minU) * 26 + 64
  const stageHeight = (bounds.maxRow - bounds.minRow) * 30 + 64
  const tileEntries = useMemo(() => {
    const needle = tileQuery.trim()
    return [...(assets?.frames.entries() ?? [])]
      .filter(([tileId]) => !needle || String(tileId).includes(needle))
      .sort((left, right) => left[0] - right[0])
  }, [assets, tileQuery])

  const handleCell = (point: GridPointRef): void => {
    const key = stampDraftPointKey(point)
    if (tool === 'select') {
      setSelectedPointKeys((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
      return
    }
    if (channel === 'collision') {
      update((current) =>
        tool === 'erase'
          ? eraseStampDraftCollision(current, point)
          : setStampDraftCollision(current, point, collisionValue),
      )
      return
    }
    if (!activeSlotId) {
      setError('请先选择一个视觉层。')
      return
    }
    update((current) =>
      tool === 'erase'
        ? eraseStampDraftVisual(current, activeSlotId, point)
        : setStampDraftVisual(
            current,
            activeSlotId,
            point,
            selectedTileId,
            activeSlot?.depthMode === 'height' ? height : 0,
          ),
    )
  }

  const moveSelection = (direction: 'up' | 'down' | 'left' | 'right'): void => {
    if (!selectedPoints.length) {
      setError('请先用“选择”工具选中一个或多个格子。')
      return
    }
    update((current) =>
      moveStampDraftSelection(
        current,
        channel === 'collision'
          ? { kind: 'collision' }
          : { kind: 'visual', layerSlotId: activeSlotId },
        selectedPoints,
        direction,
      ),
    )
    setSelectedPointKeys(
      new Set(
        selectedPoints.map((point) => stampDraftPointKey(nudgeIsometricLattice(point, direction))),
      ),
    )
  }

  const save = (takeOwnership: boolean): void => {
    try {
      if (!assets) throw new Error(assetError || '瓦片集尚未载入，暂时不能保存。')
      const canonical = canonicalizeStampDraft(
        {
          ...draft,
          origin: baseline.origin === 'migrated' ? 'authored' : draft.origin,
        },
        new Set(assets.frames.keys()),
      )
      props.onSave(canonical, takeOwnership)
      setError('')
      setTakeoverOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setTakeoverOpen(false)
    }
  }

  return (
    <div className="stamp-content-editor" data-dirty={dirty || undefined}>
      <header className="stamp-content-editor__header">
        <div>
          <span className="stamp-eyebrow">
            {props.mode === 'create' ? '新建组合' : '编辑组合内容'}
          </span>
          <h2>{draft.name || '未命名组合'}</h2>
          <p className="mono">{draft.id}</p>
        </div>
        <DsTag tone={dirty ? 'warning' : 'neutral'}>{dirty ? '未保存' : '无更改'}</DsTag>
        <DsButton onClick={props.onCancel}>取消</DsButton>
        <DsButton
          variant="primary"
          icon="save"
          onClick={() => (baseline.origin === 'migrated' ? setTakeoverOpen(true) : save(false))}
        >
          保存组合
        </DsButton>
      </header>

      {error || assetError ? (
        <div className="stamp-content-editor__error" role="alert">
          {error || assetError}
        </div>
      ) : null}

      <div className="stamp-content-editor__metadata">
        <DsTextInput
          size="compact"
          aria-label="组合名称"
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
        <DsTextInput
          size="compact"
          aria-label="组合分类"
          placeholder="未分类"
          value={draft.category ?? ''}
          onChange={(event) =>
            setDraft((current) => ({ ...current, category: event.target.value || undefined }))
          }
        />
        <span className="mono">瓦片集 · {draft.tilesetId}</span>
        <span>保存只影响未来放置；地图中的既有组合保持不变。</span>
      </div>

      <section className="stamp-draft-layers" aria-label="组合视觉层">
        <header>
          <div>
            <strong>视觉层</strong>
            <span>{draft.layerSlots.length} 层 · 每层使用稳定 ID</span>
          </div>
          <DsButton
            size="compact"
            icon="add"
            onClick={() => {
              const id = nextStampLayerSlotId(draft)
              update((current) =>
                addStampDraftLayer(current, {
                  id,
                  name: `图层 ${current.layerSlots.length + 1}`,
                  depthMode: 'height',
                }),
              )
              setActiveSlotId(id)
              setChannel('visual')
              setTool('paint')
            }}
          >
            新增图层
          </DsButton>
        </header>
        <div className="stamp-draft-layer-list">
          {draft.layerSlots.map((slot, index) => {
            const count = draft.visual.filter((member) => member.layerSlotId === slot.id).length
            return (
              <article
                key={slot.id}
                className={`stamp-draft-layer${slot.id === activeSlotId ? ' active' : ''}`}
              >
                <button
                  type="button"
                  className="stamp-draft-layer__pick"
                  aria-pressed={slot.id === activeSlotId}
                  onClick={() => {
                    setActiveSlotId(slot.id)
                    setChannel('visual')
                  }}
                >
                  <span>{index + 1}</span>
                  <code>{slot.id}</code>
                  <small>{count} 格</small>
                </button>
                <DsTextInput
                  size="compact"
                  aria-label={`图层 ${slot.id} 名称`}
                  value={slot.name}
                  onChange={(event) =>
                    update((current) =>
                      updateStampDraftLayer(current, slot.id, { name: event.target.value }),
                    )
                  }
                />
                <DsSelect
                  size="compact"
                  aria-label={`图层 ${slot.id} 高度模式`}
                  value={slot.depthMode}
                  options={[
                    { value: 'flat', label: '平面层' },
                    { value: 'height', label: '高度层' },
                  ]}
                  onValueChange={(value) =>
                    update((current) =>
                      updateStampDraftLayer(current, slot.id, {
                        depthMode: value as 'flat' | 'height',
                      }),
                    )
                  }
                />
                <div className="stamp-draft-layer__actions">
                  <DsIconButton
                    size="compact"
                    label="上移图层"
                    icon="chevron-up"
                    disabled={index === 0}
                    onClick={() => update((current) => moveStampDraftLayer(current, slot.id, -1))}
                  />
                  <DsIconButton
                    size="compact"
                    label="下移图层"
                    icon="chevron-down"
                    disabled={index === draft.layerSlots.length - 1}
                    onClick={() => update((current) => moveStampDraftLayer(current, slot.id, 1))}
                  />
                  <DsIconButton
                    size="compact"
                    label="删除图层"
                    icon="delete"
                    variant="danger"
                    onClick={() => setPendingDeleteSlotId(slot.id)}
                  />
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="stamp-draft-workbench">
        <header className="stamp-draft-toolbar">
          <DsTabs
            label="组合编辑通道"
            size="compact"
            activeId={channel}
            onChange={(value) => setChannel(value as StampDraftChannelKind)}
            items={[
              { id: 'visual', label: '视觉层', count: activeVisualByPoint.size },
              { id: 'collision', label: '碰撞', count: draft.collision.length },
            ]}
          />
          <fieldset className="stamp-draft-tools">
            <legend className="map-a11y-legend">组合编辑工具</legend>
            {(
              [
                ['paint', channel === 'visual' ? '绘制瓦片' : '写碰撞'],
                ['erase', '擦除'],
                ['select', '选择 / 移动'],
              ] as const
            ).map(([id, label]) => (
              <DsButton
                key={id}
                size="compact"
                variant={tool === id ? 'primary' : 'quiet'}
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
              >
                {label}
              </DsButton>
            ))}
          </fieldset>
          {channel === 'visual' ? (
            <span className="stamp-draft-inline-field">
              <span>高度</span>
              <DsNumberInput
                size="compact"
                aria-label="绘制高度"
                min={0}
                disabled={activeSlot?.depthMode !== 'height'}
                value={activeSlot?.depthMode === 'height' ? height : 0}
                onChange={(event) => setHeight(Math.max(0, Number(event.target.value) || 0))}
              />
            </span>
          ) : (
            <DsSelect
              size="compact"
              aria-label="碰撞值"
              value={String(collisionValue)}
              options={[
                { value: '0', label: '0 · 显式可通行' },
                { value: '1', label: '1 · 阻挡' },
              ]}
              onValueChange={(value) => setCollisionValue(Number(value))}
            />
          )}
        </header>

        <div className="stamp-draft-stage-scroll">
          <fieldset
            className="stamp-draft-stage"
            style={{ width: stageWidth, height: stageHeight }}
          >
            <legend className="map-a11y-legend">组合局部 lattice 画布</legend>
            {latticePoints.map((point) => {
              const key = stampDraftPointKey(point)
              const visual = activeVisualByPoint.get(key)
              const collision = collisionByPoint.get(key)
              const selected = selectedPointKeys.has(key)
              const isAnchor = point.row === 0 && point.col === 0
              return (
                <button
                  key={key}
                  type="button"
                  className={`stamp-draft-cell${visual ? ' has-visual' : ''}${collision ? ' has-collision' : ''}${selected ? ' selected' : ''}${isAnchor ? ' anchor' : ''}`}
                  style={{
                    left: (latticeU(point) - bounds.minU) * 26 + 6,
                    top: (point.row - bounds.minRow) * 30 + 6,
                  }}
                  data-point-key={key}
                  aria-label={`格子 r${point.row} c${point.col}${visual ? `，瓦片 ${visual.tileId}，高度 ${visual.height}` : ''}${collision ? `，碰撞 ${collision.value}` : ''}${isAnchor ? '，当前锚点' : ''}`}
                  aria-pressed={selected}
                  onClick={() => handleCell(point)}
                  onKeyDown={(event) => {
                    const directions = {
                      ArrowUp: 'up',
                      ArrowDown: 'down',
                      ArrowLeft: 'left',
                      ArrowRight: 'right',
                    } as const
                    const direction = directions[event.key as keyof typeof directions]
                    if (!direction) return
                    event.preventDefault()
                    const next = nudgeIsometricLattice(point, direction)
                    const selector = `[data-point-key="${stampDraftPointKey(next)}"]`
                    event.currentTarget.parentElement?.querySelector<HTMLElement>(selector)?.focus()
                  }}
                >
                  {visual ? (
                    <span>
                      <strong>#{visual.tileId}</strong>
                      <small>H{visual.height}</small>
                    </span>
                  ) : null}
                  {collision ? <b>C{collision.value}</b> : null}
                  {isAnchor ? <i aria-hidden="true" /> : null}
                </button>
              )
            })}
          </fieldset>
        </div>

        <footer className="stamp-draft-selection-bar">
          <span>
            {selectedPoints.length
              ? `已选 ${selectedPoints.length} 格`
              : '选择格子后可移动或设为锚点'}
          </span>
          <div>
            <DsIconButton
              size="compact"
              label="向左上移动"
              icon="chevron-left"
              onClick={() => moveSelection('left')}
            />
            <DsIconButton
              size="compact"
              label="向右上移动"
              icon="chevron-up"
              onClick={() => moveSelection('up')}
            />
            <DsIconButton
              size="compact"
              label="向左下移动"
              icon="chevron-down"
              onClick={() => moveSelection('down')}
            />
            <DsIconButton
              size="compact"
              label="向右下移动"
              icon="chevron-right"
              onClick={() => moveSelection('right')}
            />
            <DsButton
              size="compact"
              disabled={selectedPoints.length !== 1}
              onClick={() => {
                update((current) => reanchorStampDraft(current, selectedPoints[0]!))
                setSelectedPointKeys(new Set(['0:0']))
              }}
            >
              设为锚点
            </DsButton>
          </div>
        </footer>
      </section>

      <section className="stamp-draft-preview">
        <StampPreviewCanvas
          template={draft}
          tilesets={props.tilesets}
          assetCatalog={props.assetCatalog}
          assetReader={props.assetReader}
          assetBase={props.assetBase}
        />
      </section>

      <section className="stamp-draft-palette" aria-label="组合瓦片面板">
        <header>
          <div>
            <strong>瓦片</strong>
            <span>
              {assets ? `${assets.frames.size} 块 · 当前 #${selectedTileId}` : '正在载入瓦片…'}
            </span>
          </div>
          <DsTextInput
            size="compact"
            aria-label="筛选组合瓦片"
            placeholder="筛选 tileId…"
            value={tileQuery}
            onChange={(event) => {
              setTileQuery(event.target.value)
              setTileLimit(120)
            }}
          />
        </header>
        <div className="stamp-draft-tile-grid">
          {tileEntries.slice(0, tileLimit).map(([tileId, frame]) => (
            <TileFrameButton
              key={tileId}
              tileId={tileId}
              frame={frame}
              palette={assets!.palette}
              selected={tileId === selectedTileId}
              onPick={() => {
                setSelectedTileId(tileId)
                setChannel('visual')
                setTool('paint')
              }}
            />
          ))}
        </div>
        {tileEntries.length > tileLimit ? (
          <DsButton size="compact" onClick={() => setTileLimit((current) => current + 120)}>
            再显示 120 个
          </DsButton>
        ) : null}
      </section>

      {pendingDeleteSlotId ? (
        <DsDialog
          open
          title="删除视觉层？"
          description="该层的全部瓦片成员会从当前草稿移除；保存前仍可取消整个编辑。"
          onClose={() => setPendingDeleteSlotId(undefined)}
          footer={
            <>
              <DsButton onClick={() => setPendingDeleteSlotId(undefined)}>取消</DsButton>
              <DsButton
                variant="danger"
                onClick={() => {
                  const slotId = pendingDeleteSlotId
                  update((current) => deleteStampDraftLayer(current, slotId))
                  setPendingDeleteSlotId(undefined)
                  const next = draft.layerSlots.find((slot) => slot.id !== slotId)
                  if (next) setActiveSlotId(next.id)
                }}
              >
                删除图层
              </DsButton>
            </>
          }
        >
          <p>
            将删除“{draft.layerSlots.find((slot) => slot.id === pendingDeleteSlotId)?.name}”及其中的{' '}
            {draft.visual.filter((member) => member.layerSlotId === pendingDeleteSlotId).length}{' '}
            个成员。
          </p>
        </DsDialog>
      ) : null}

      {takeoverOpen ? (
        <DsDialog
          open
          title="接管预置组合？"
          description="确认保存后整项转为作者内容，迁移不再覆盖；撤销可恢复。"
          onClose={() => setTakeoverOpen(false)}
          footer={
            <>
              <DsButton onClick={() => setTakeoverOpen(false)}>取消</DsButton>
              <DsButton variant="primary" onClick={() => save(true)}>
                接管并保存
              </DsButton>
            </>
          }
        >
          <p>既有地图放置组仍是快照，不会随模板更新。</p>
        </DsDialog>
      ) : null}
    </div>
  )
}
