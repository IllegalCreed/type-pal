import type { StampTemplate } from '@type-pal/content'
import type { ProjectMap } from '@type-pal/reforge'
import { useId, useMemo, useRef, useState } from 'react'
import type { EditSession } from '../core/edit-session.js'
import type { MapSelection } from '../core/map-selection.js'
import { AddStampTemplateCommand, ReplaceStampTemplateCommand } from '../core/stamp-commands.js'
import {
  buildStampTemplateFromSelection,
  defaultStampTemplateAnchor,
  nextStampTemplateId,
} from '../core/stamp-template.js'
import {
  DsButton,
  DsCheckbox,
  DsDialog,
  DsField,
  DsFieldGroup,
  DsFieldMeasure,
  DsNumberInput,
  DsSelect,
  DsTextInput,
} from './design-system/index.js'

type CellsSelection = Extract<MapSelection, { kind: 'cells' }>
type InvalidField = 'id' | 'name' | 'anchor-row' | 'anchor-col' | 'target'

export function StampTemplateDialog(props: {
  map: ProjectMap
  selection: CellsSelection
  stamps: readonly StampTemplate[]
  session: EditSession
  initialMode?: 'create' | 'update'
  initialTargetId?: string
  onClose: () => void
  onSaved: (id: string, mode: 'create' | 'update') => void
}) {
  const { map, selection, stamps, session, onClose, onSaved, initialMode, initialTargetId } = props
  const compatible = stamps
  const suggestedAnchor = defaultStampTemplateAnchor(selection) ?? { row: 0, col: 0 }
  const sourceLayers = useMemo(
    () =>
      map.layers.flatMap((layer) => {
        const count = selection.visualSlots.filter(
          (ref) => ref.layerId === layer.id && layer.tiles[ref.row]?.[ref.col] != null,
        ).length
        return count ? [{ id: layer.id, name: layer.name, count }] : []
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
    initialMode === 'update' && initialTarget ? initialTarget.name : '新组合',
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
            initialTarget.layers.find((slot) => slot.id === layer.id)?.name ?? layer.name,
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
  const idRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const anchorRowRef = useRef<HTMLInputElement>(null)
  const anchorColRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<HTMLButtonElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const errorId = useId()
  const target = compatible.find((template) => template.id === targetId)
  const collisionZeroCount = selection.gridPoints.filter(
    (point) => map.collision[point.row]?.[point.col] === 0,
  ).length
  const nonEmptyVisualCount = selection.visualSlots.filter((ref) => {
    const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
    return layer?.tiles[ref.row]?.[ref.col] != null
  }).length

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
          next.layers.find((slot) => slot.id === layer.id)?.name ?? layer.name,
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
      setName('新组合')
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
            nextTarget.layers.find((slot) => slot.id === layer.id)?.name ?? layer.name,
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
      setError('预置组合必须先明确接管，才能用当前选区替换。')
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

  return (
    <DsDialog
      open
      title="保存为组合"
      description="地图选区 → 可复用模板"
      className="stamp-template-dialog"
      closeLabel="关闭保存组合对话框"
      onClose={onClose}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="stamp-dialog-body">
          <fieldset className="stamp-dialog-mode">
            <legend className="stamp-sr-only">保存方式</legend>
            <DsButton
              size="compact"
              variant={mode === 'create' ? 'primary' : 'secondary'}
              aria-pressed={mode === 'create'}
              onClick={() => switchMode('create')}
            >
              新建模板
            </DsButton>
            <DsButton
              size="compact"
              variant={mode === 'update' ? 'primary' : 'secondary'}
              aria-pressed={mode === 'update'}
              disabled={compatible.length === 0}
              onClick={() => switchMode('update')}
            >
              更新已有模板
            </DsButton>
          </fieldset>

          {mode === 'update' ? (
            <div className="stamp-dialog-field">
              <span>目标模板</span>
              <DsSelect
                ref={targetRef}
                aria-label="目标模板"
                value={targetId}
                invalid={invalidField === 'target'}
                aria-describedby={invalidField === 'target' ? errorId : undefined}
                options={compatible.map((template) => ({
                  value: template.id,
                  label: template.name,
                  description: `${template.id}${template.origin === 'migrated' ? ' · 预置' : ''}`,
                }))}
                onValueChange={selectTarget}
              />
            </div>
          ) : (
            <label className="stamp-dialog-field">
              <span>
                ID <small>创建后保持稳定</small>
              </span>
              <DsTextInput
                ref={idRef}
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
                monospace
              />
            </label>
          )}

          <div className="stamp-dialog-grid">
            <label className="stamp-dialog-field">
              <span>名称</span>
              <DsTextInput
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
              <DsTextInput
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
            <DsFieldGroup>
              <DsField id="stamp-anchor-row" label="行">
                {(field) => (
                  <DsFieldMeasure measure="short-number">
                    <DsNumberInput
                      {...field}
                      ref={anchorRowRef}
                      name="stamp-anchor-row"
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
                  </DsFieldMeasure>
                )}
              </DsField>
              <DsField id="stamp-anchor-col" label="列">
                {(field) => (
                  <DsFieldMeasure measure="short-number">
                    <DsNumberInput
                      {...field}
                      ref={anchorColRef}
                      name="stamp-anchor-col"
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
                  </DsFieldMeasure>
                )}
              </DsField>
            </DsFieldGroup>
            <p>默认取选区最左上的错排格；放置时光标将对准这里。</p>
          </fieldset>

          <fieldset className="stamp-slot-fields">
            <legend>局部图层槽</legend>
            <p>槽 ID 固定复用源图层稳定 ID；名称可编辑，放置时再显式映射到目标地图图层。</p>
            <DsFieldGroup layout="stacked">
              {sourceLayers.map((layer) => (
                <DsField
                  id={`stamp-slot-${layer.id}`}
                  key={layer.id}
                  label={layer.id}
                  help={`${layer.count} 个成员`}
                >
                  {(field) => (
                    <DsTextInput
                      {...field}
                      name={`stamp-slot-${layer.id}`}
                      value={slotNames[layer.id] ?? ''}
                      aria-label={`${layer.id} 局部槽名称`}
                      onChange={(event) =>
                        setSlotNames((current) => ({ ...current, [layer.id]: event.target.value }))
                      }
                    />
                  )}
                </DsField>
              ))}
            </DsFieldGroup>
          </fieldset>

          <div className="stamp-collision-choice">
            <DsCheckbox
              label={
                <>
                  <strong>同时快照碰撞通道</strong>
                  <small>
                    {selection.gridPoints.length} 个格点，其中 {collisionZeroCount} 个值为 0；勾选后
                    0 也会被显式保留。
                  </small>
                </>
              }
              name="stamp-include-collision"
              checked={includeCollision}
              onChange={(event) => setIncludeCollision(event.currentTarget.checked)}
            />
          </div>

          {mode === 'update' && target?.origin === 'migrated' ? (
            <div className="stamp-takeover-choice">
              <DsCheckbox
                label={
                  <>
                    <strong>接管这个预置组合</strong>
                    <small>整项转为作者内容；之后迁移不会再覆盖。撤销可恢复预置状态。</small>
                  </>
                }
                name="stamp-take-ownership"
                checked={takeOwnership}
                onChange={(event) => setTakeOwnership(event.currentTarget.checked)}
              />
            </div>
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
            <span className="mono">{map.tilesetRefs.join('、')}</span>
          </div>
          {mode === 'update' && target ? (
            <p className="stamp-replace-summary">
              整项替换：{target.layers.length} 层 /{' '}
              {target.layers.reduce(
                (count, layer) =>
                  count +
                  layer.tiles.reduce(
                    (sum, row) => sum + row.filter((tile) => tile !== null).length,
                    0,
                  ),
                0,
              )}{' '}
              视觉 /{' '}
              {target.collision.reduce(
                (count, row) => count + row.filter((value) => value !== null).length,
                0,
              )}{' '}
              碰撞
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
          <DsButton size="compact" variant="secondary" onClick={onClose}>
            取消
          </DsButton>
          <DsButton type="submit" size="compact" variant="primary">
            {mode === 'create' ? '创建组合' : '替换模板内容'}
          </DsButton>
        </footer>
      </form>
    </DsDialog>
  )
}
