import type { StampTemplateV1 } from '@type-pal/content'
import type { ProjectMap } from '@type-pal/reforge'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EditSession } from '../core/edit-session.js'
import type { MapSelection } from '../core/map-selection.js'
import { AddStampTemplateCommand, ReplaceStampTemplateCommand } from '../core/stamp-commands.js'
import {
  buildStampTemplateFromSelection,
  defaultStampTemplateAnchor,
  nextStampTemplateId,
} from '../core/stamp-template.js'

type CellsSelection = Extract<MapSelection, { kind: 'cells' }>
type InvalidField = 'id' | 'name' | 'anchor-row' | 'anchor-col' | 'target'

export function StampTemplateDialog(props: {
  map: ProjectMap
  selection: CellsSelection
  stamps: readonly StampTemplateV1[]
  session: EditSession
  initialMode?: 'create' | 'update'
  initialTargetId?: string
  onClose: () => void
  onSaved: (id: string, mode: 'create' | 'update') => void
}) {
  const { map, selection, stamps, session, onClose, onSaved, initialMode, initialTargetId } = props
  const compatible = useMemo(
    () => stamps.filter((template) => template.tilesetId === map.tilesetId),
    [map.tilesetId, stamps],
  )
  const suggestedAnchor = defaultStampTemplateAnchor(selection) ?? { row: 0, col: 0 }
  const sourceLayers = useMemo(
    () =>
      map.layers.flatMap((layer) => {
        const count = selection.visualSlots.filter(
          (ref) => ref.layerId === layer.id && layer.tiles[ref.row]?.[ref.col] != null,
        ).length
        return count ? [{ id: layer.id, name: layer.name, depthMode: layer.depthMode, count }] : []
      }),
    [map.layers, selection.visualSlots],
  )
  const exactInitialTarget = initialTargetId
    ? compatible.find((template) => template.id === initialTargetId)
    : undefined
  const initialTarget = initialMode === 'update' ? exactInitialTarget : compatible[0]
  const sourceSlotNames = useMemo(
    () => Object.fromEntries(sourceLayers.map((layer) => [layer.id, layer.name])),
    [sourceLayers],
  )
  const [mode, setMode] = useState<'create' | 'update'>(initialMode ?? 'create')
  const [targetId, setTargetId] = useState(initialTarget?.id ?? '')
  const [name, setName] = useState(
    initialMode === 'update' && initialTarget ? initialTarget.name : '新图章',
  )
  const [id, setId] = useState(() =>
    nextStampTemplateId(
      'stamp',
      stamps.map((item) => item.id),
    ),
  )
  const [category, setCategory] = useState(
    initialMode === 'update' && initialTarget ? (initialTarget.category ?? '') : '',
  )
  const [slotNames, setSlotNames] = useState<Record<string, string>>(() =>
    initialMode === 'update' && initialTarget
      ? Object.fromEntries(
          sourceLayers.map((layer) => [
            layer.id,
            initialTarget.layerSlots.find((slot) => slot.id === layer.id)?.name ?? layer.name,
          ]),
        )
      : sourceSlotNames,
  )
  const [anchorRow, setAnchorRow] = useState(String(suggestedAnchor.row))
  const [anchorCol, setAnchorCol] = useState(String(suggestedAnchor.col))
  const [includeCollision, setIncludeCollision] = useState(false)
  const [takeOwnership, setTakeOwnership] = useState(false)
  const [error, setError] = useState('')
  const [invalidField, setInvalidField] = useState<InvalidField>()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const idRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const anchorRowRef = useRef<HTMLInputElement>(null)
  const anchorColRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<HTMLSelectElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const errorId = useId()
  const target = compatible.find((template) => template.id === targetId)
  const collisionZeroCount = selection.gridPoints.filter(
    (point) => map.collision[point.row]?.[point.col] === 0,
  ).length
  const nonEmptyVisualCount = selection.visualSlots.filter((ref) => {
    const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
    return layer?.tiles[ref.row]?.[ref.col] != null
  }).length

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    if (!dialog.open) dialog.showModal()
    nameRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
      returnFocusRef.current?.focus()
    }
  }, [])

  const selectTarget = (nextId: string): void => {
    setTargetId(nextId)
    setTakeOwnership(false)
    setError('')
    setInvalidField(undefined)
    const next = compatible.find((template) => template.id === nextId)
    if (!next) return
    setName(next.name)
    setCategory(next.category ?? '')
    setSlotNames(
      Object.fromEntries(
        sourceLayers.map((layer) => [
          layer.id,
          next.layerSlots.find((slot) => slot.id === layer.id)?.name ?? layer.name,
        ]),
      ),
    )
  }

  const switchMode = (nextMode: 'create' | 'update'): void => {
    setMode(nextMode)
    setError('')
    setInvalidField(undefined)
    setTakeOwnership(false)
    if (nextMode === 'create') {
      setName('新图章')
      setCategory('')
      setSlotNames(sourceSlotNames)
      return
    }
    const nextTarget = target ?? compatible[0]
    if (nextTarget) {
      setTargetId(nextTarget.id)
      setName(nextTarget.name)
      setCategory(nextTarget.category ?? '')
      setSlotNames(
        Object.fromEntries(
          sourceLayers.map((layer) => [
            layer.id,
            nextTarget.layerSlots.find((slot) => slot.id === layer.id)?.name ?? layer.name,
          ]),
        ),
      )
    }
  }

  const reportError = (message: string, field: InvalidField, focus: () => void): void => {
    setError(message)
    setInvalidField(field)
    window.setTimeout(focus, 0)
  }

  const submit = (): void => {
    setError('')
    setInvalidField(undefined)
    const row = Number(anchorRow)
    const col = Number(anchorCol)
    if (mode === 'create' && (!id.trim() || id.includes('/'))) {
      reportError("ID 不能为空且不得含 '/'。", 'id', () => idRef.current?.focus())
      return
    }
    if (mode === 'create' && stamps.some((template) => template.id === id.trim())) {
      reportError(`ID “${id.trim()}” 已存在。`, 'id', () => idRef.current?.focus())
      return
    }
    if (!name.trim()) {
      reportError('名称不能为空。', 'name', () => nameRef.current?.focus())
      return
    }
    if (!Number.isSafeInteger(row)) {
      reportError('锚点行必须是整数。', 'anchor-row', () => anchorRowRef.current?.focus())
      return
    }
    if (!Number.isSafeInteger(col)) {
      reportError('锚点列必须是整数。', 'anchor-col', () => anchorColRef.current?.focus())
      return
    }
    if (mode === 'update' && !target) {
      reportError('请选择要更新的模板。', 'target', () => targetRef.current?.focus())
      return
    }
    if (mode === 'update' && target?.origin === 'migrated' && !takeOwnership) {
      setError('预置图章必须先明确接管，才能用当前选区替换。')
      return
    }
    try {
      const template = buildStampTemplateFromSelection({
        map,
        selection,
        id: mode === 'create' ? id.trim() : target!.id,
        name: name.trim(),
        ...(category.trim() ? { category: category.trim() } : {}),
        anchor: { row, col },
        includeCollision,
        ...(mode === 'update' ? { expectedTilesetId: target!.tilesetId } : {}),
        layerSlotNames: slotNames,
      })
      if (mode === 'create') session.dispatch(new AddStampTemplateCommand(template))
      else
        session.dispatch(
          new ReplaceStampTemplateCommand(template, {
            takeOwnership: target!.origin === 'migrated' && takeOwnership,
          }),
        )
      onSaved(template.id, mode)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setInvalidField(undefined)
      window.setTimeout(() => errorRef.current?.focus(), 0)
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="stamp-template-dialog"
      aria-labelledby={titleId}
      aria-describedby={error ? errorId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <header className="stamp-dialog-head">
          <div>
            <span>地图选区 → 可复用模板</span>
            <h2 id={titleId}>保存为图章</h2>
          </div>
          <button type="button" aria-label="关闭保存图章对话框" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="stamp-dialog-body">
          <fieldset className="stamp-dialog-mode">
            <legend className="stamp-sr-only">保存方式</legend>
            <button
              type="button"
              className={mode === 'create' ? 'active' : ''}
              aria-pressed={mode === 'create'}
              onClick={() => switchMode('create')}
            >
              新建模板
            </button>
            <button
              type="button"
              className={mode === 'update' ? 'active' : ''}
              aria-pressed={mode === 'update'}
              disabled={compatible.length === 0}
              onClick={() => switchMode('update')}
            >
              更新已有模板
            </button>
          </fieldset>

          {mode === 'update' ? (
            <label className="stamp-dialog-field">
              <span>目标模板</span>
              <select
                ref={targetRef}
                name="stamp-target"
                value={targetId}
                aria-invalid={invalidField === 'target'}
                aria-describedby={invalidField === 'target' ? errorId : undefined}
                onChange={(event) => selectTarget(event.target.value)}
              >
                {compatible.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.id}
                    {template.origin === 'migrated' ? '（预置）' : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="stamp-dialog-field">
              <span>
                ID <small>创建后保持稳定</small>
              </span>
              <input
                ref={idRef}
                className="mono"
                name="stamp-id"
                value={id}
                aria-invalid={invalidField === 'id'}
                aria-describedby={invalidField === 'id' ? errorId : undefined}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) => {
                  setId(event.target.value)
                  if (invalidField === 'id') setInvalidField(undefined)
                }}
              />
            </label>
          )}

          <div className="stamp-dialog-grid">
            <label className="stamp-dialog-field">
              <span>名称</span>
              <input
                ref={nameRef}
                name="stamp-name"
                value={name}
                aria-invalid={invalidField === 'name'}
                aria-describedby={invalidField === 'name' ? errorId : undefined}
                autoComplete="off"
                onChange={(event) => {
                  setName(event.target.value)
                  if (invalidField === 'name') setInvalidField(undefined)
                }}
              />
            </label>
            <label className="stamp-dialog-field">
              <span>
                分类 <small>可选</small>
              </span>
              <input
                name="stamp-category"
                value={category}
                autoComplete="off"
                placeholder="例如 建筑、植被"
                onChange={(event) => setCategory(event.target.value)}
              />
            </label>
          </div>

          <fieldset className="stamp-anchor-fields">
            <legend>显式锚点</legend>
            <label>
              <span>行</span>
              <input
                ref={anchorRowRef}
                className="mono"
                name="stamp-anchor-row"
                type="number"
                step={1}
                inputMode="numeric"
                value={anchorRow}
                aria-invalid={invalidField === 'anchor-row'}
                aria-describedby={invalidField === 'anchor-row' ? errorId : undefined}
                onChange={(event) => {
                  setAnchorRow(event.target.value)
                  if (invalidField === 'anchor-row') setInvalidField(undefined)
                }}
              />
            </label>
            <label>
              <span>列</span>
              <input
                ref={anchorColRef}
                className="mono"
                name="stamp-anchor-col"
                type="number"
                step={1}
                inputMode="numeric"
                value={anchorCol}
                aria-invalid={invalidField === 'anchor-col'}
                aria-describedby={invalidField === 'anchor-col' ? errorId : undefined}
                onChange={(event) => {
                  setAnchorCol(event.target.value)
                  if (invalidField === 'anchor-col') setInvalidField(undefined)
                }}
              />
            </label>
            <p>默认取选区最左上的错排格；放置时光标将对准这里。</p>
          </fieldset>

          <fieldset className="stamp-slot-fields">
            <legend>局部图层槽</legend>
            <p>槽 ID 固定复用源图层稳定 ID；名称可编辑，放置时再显式映射到目标地图图层。</p>
            {sourceLayers.map((layer) => (
              <label key={layer.id}>
                <span>
                  <strong>{layer.id}</strong>
                  <small>
                    {layer.depthMode === 'height' ? '高度' : '平面'} · {layer.count} 成员
                  </small>
                </span>
                <input
                  name={`stamp-slot-${layer.id}`}
                  value={slotNames[layer.id] ?? ''}
                  aria-label={`${layer.id} 局部槽名称`}
                  onChange={(event) =>
                    setSlotNames((current) => ({ ...current, [layer.id]: event.target.value }))
                  }
                />
              </label>
            ))}
          </fieldset>

          <label className="stamp-collision-choice">
            <input
              type="checkbox"
              name="stamp-include-collision"
              checked={includeCollision}
              onChange={(event) => setIncludeCollision(event.target.checked)}
            />
            <span>
              <strong>同时快照碰撞通道</strong>
              <small>
                {selection.gridPoints.length} 个格点，其中 {collisionZeroCount} 个值为 0；勾选后 0
                也会被显式保留。
              </small>
            </span>
          </label>

          {mode === 'update' && target?.origin === 'migrated' ? (
            <label className="stamp-takeover-choice">
              <input
                type="checkbox"
                name="stamp-take-ownership"
                checked={takeOwnership}
                onChange={(event) => setTakeOwnership(event.target.checked)}
              />
              <span>
                <strong>接管这个预置图章</strong>
                <small>整项转为作者内容；之后迁移不会再覆盖。撤销可恢复预置状态。</small>
              </span>
            </label>
          ) : null}

          <div className="stamp-dialog-summary">
            <span>
              <strong>{nonEmptyVisualCount}</strong> 视觉成员
            </span>
            <span>
              <strong>{sourceLayers.length}</strong> 图层
            </span>
            <span>
              <strong>{includeCollision ? selection.gridPoints.length : 0}</strong> 碰撞成员
            </span>
            <span className="mono">{map.tilesetId}</span>
          </div>
          {mode === 'update' && target ? (
            <p className="stamp-replace-summary">
              整项替换：{target.layerSlots.length} 层 / {target.visual.length} 视觉 /{' '}
              {target.collision.length} 碰撞
              {' → '}
              {sourceLayers.length} 层 / {nonEmptyVisualCount} 视觉 /{' '}
              {includeCollision ? selection.gridPoints.length : 0} 碰撞
            </p>
          ) : null}
          {error ? (
            <p
              ref={errorRef}
              id={errorId}
              className="stamp-dialog-error"
              role="alert"
              tabIndex={-1}
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="stamp-dialog-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="primary">
            {mode === 'create' ? '创建图章' : '替换模板内容'}
          </button>
        </footer>
      </form>
    </dialog>,
    document.body,
  )
}
