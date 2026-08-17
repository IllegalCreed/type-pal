import type { AssetCatalogV1, MapIndexV1, ProjectMap, StampTemplateV1 } from '@type-pal/content'
import type { AssetBase, TilesetDef } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  AddStampTemplateCommand,
  DeleteStampTemplateCommand,
  DuplicateStampTemplateCommand,
  ReplaceStampTemplateCommand,
} from '../core/stamp-commands.js'
import { createBlankStampDraft } from '../core/stamp-draft.js'
import type { StampSelectionSource } from '../core/stamp-template.js'
import { collectStampTemplateUsage, nextStampTemplateId } from '../core/stamp-template.js'
import {
  DsButton,
  DsCatalogControls,
  DsDialog,
  DsInspectorTabs,
  DsReferenceGroup,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelect,
  DsSequenceIndex,
  DsTextInput,
} from './design-system/index.js'
import { StampContentEditor } from './StampContentEditor.js'
import { StampMiniPreview, StampPreviewCanvas } from './StampPreviewCanvas.js'
import { StampTemplateDialog } from './StampTemplateDialog.js'

interface UsageScan {
  maps: Record<string, ProjectMap>
  completed: number
  total: number
  failures: Array<{ mapId: string; message: string }>
  done: boolean
}

const EMPTY_SCAN: UsageScan = { maps: {}, completed: 0, total: 0, failures: [], done: false }
const STAMP_PAGE_SIZE = 100

type StampInspectorTab = 'properties' | 'references' | 'actions'
type StampContentEditorState = {
  mode: 'create' | 'edit'
  template: StampTemplateV1
}
type StampLeaveIntent = { kind: 'close' } | { kind: 'select'; id: string }

export function StampLibraryTab(props: {
  stamps: readonly StampTemplateV1[]
  tilesets: readonly TilesetDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase: AssetBase
  session: EditSession
  mapIndex: MapIndexV1
  selectionSource?: StampSelectionSource
  tabBar?: React.ReactNode
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenMap?: (mapId: string) => void
  onOpenTileset?: (tilesetId: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const {
    stamps,
    tilesets,
    assetCatalog,
    assetReader,
    assetBase,
    session,
    mapIndex,
    selectionSource,
    tabBar,
    focusObjectId,
    onObjectFocus,
    onOpenMap,
    onOpenTileset,
    onStatusNotice,
  } = props
  const [selectedId, setSelectedId] = useState(focusObjectId ?? stamps[0]?.id ?? '')
  const [inspectorTab, setInspectorTab] = useState<StampInspectorTab>('properties')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState<'all' | StampTemplateV1['origin']>('all')
  const [page, setPage] = useState(0)
  const [scan, setScan] = useState<UsageScan>(() => ({
    ...EMPTY_SCAN,
    total: mapIndex.maps.length,
  }))
  const [scanRevision, setScanRevision] = useState(0)
  const [draftName, setDraftName] = useState('')
  const [draftCategory, setDraftCategory] = useState('')
  const [confirmAction, setConfirmAction] = useState<'takeover' | 'delete'>()
  const [error, setError] = useState('')
  const [selectionDialogMap, setSelectionDialogMap] = useState<ProjectMap>()
  const [selectionLoading, setSelectionLoading] = useState(false)
  const [contentEditor, setContentEditor] = useState<StampContentEditorState>()
  const [contentDirty, setContentDirty] = useState(false)
  const [leaveIntent, setLeaveIntent] = useState<StampLeaveIntent>()
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createId, setCreateId] = useState('')
  const [createTilesetId, setCreateTilesetId] = useState(tilesets[0]?.id ?? '')
  const [createError, setCreateError] = useState('')
  const metadataSaveRef = useRef<HTMLButtonElement>(null)
  const takeoverCancelRef = useRef<HTMLButtonElement>(null)
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const deleteCancelRef = useRef<HTMLButtonElement>(null)

  const selected = stamps.find((template) => template.id === selectedId)
  const categories = useMemo(
    () =>
      [
        ...new Set(stamps.flatMap((template) => (template.category ? [template.category] : []))),
      ].sort(),
    [stamps],
  )
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return stamps.filter(
      (template) =>
        (categoryFilter === 'all' || template.category === categoryFilter) &&
        (originFilter === 'all' || template.origin === originFilter) &&
        (!needle ||
          template.name.toLowerCase().includes(needle) ||
          template.id.toLowerCase().includes(needle) ||
          template.tilesetId.toLowerCase().includes(needle)),
    )
  }, [categoryFilter, originFilter, query, stamps])
  const pageCount = Math.max(1, Math.ceil(shown.length / STAMP_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pagedShown = shown.slice(safePage * STAMP_PAGE_SIZE, (safePage + 1) * STAMP_PAGE_SIZE)

  useEffect(() => {
    if (focusObjectId !== undefined) setSelectedId(focusObjectId)
  }, [focusObjectId])
  useEffect(() => {
    if (selectedId && stamps.some((template) => template.id === selectedId)) return
    const next = stamps[0]?.id ?? ''
    setSelectedId(next)
    onObjectFocus?.(next || undefined)
  }, [onObjectFocus, selectedId, stamps])
  useEffect(() => {
    const selectedIndex = shown.findIndex((template) => template.id === selectedId)
    if (selectedIndex >= 0) setPage(Math.floor(selectedIndex / STAMP_PAGE_SIZE))
    else setPage((current) => Math.min(current, pageCount - 1))
  }, [pageCount, selectedId, shown])
  useEffect(() => {
    setDraftName(selected?.name ?? '')
    setDraftCategory(selected?.category ?? '')
    setConfirmAction(undefined)
    setError('')
  }, [selected])

  useEffect(() => {
    void scanRevision
    let alive = true
    const run = async (): Promise<void> => {
      onStatusNotice?.(undefined)
      const maps: Record<string, ProjectMap> = {}
      const failures: UsageScan['failures'] = []
      setScan({ maps, completed: 0, total: mapIndex.maps.length, failures, done: false })
      for (const asset of mapIndex.maps) {
        try {
          maps[asset.id] = await session.ensureMapLoaded(asset.id)
        } catch (cause) {
          failures.push({
            mapId: asset.id,
            message: cause instanceof Error ? cause.message : String(cause),
          })
        }
        if (!alive) return
        setScan({
          maps: { ...maps },
          completed: Object.keys(maps).length + failures.length,
          total: mapIndex.maps.length,
          failures: [...failures],
          done: false,
        })
      }
      if (alive)
        setScan({
          maps: { ...maps },
          completed: mapIndex.maps.length,
          total: mapIndex.maps.length,
          failures: [...failures],
          done: true,
        })
      if (alive)
        onStatusNotice?.(
          failures.length
            ? {
                kind: 'error',
                message: `组合来源扫描不完整：${failures.length} 张地图读取失败。`,
              }
            : undefined,
        )
    }
    void run()
    return () => {
      alive = false
      onStatusNotice?.(undefined)
    }
  }, [mapIndex, onStatusNotice, scanRevision, session])
  useEffect(() => {
    if (confirmAction === 'delete') deleteCancelRef.current?.focus()
    if (confirmAction === 'takeover') takeoverCancelRef.current?.focus()
  }, [confirmAction])

  const usage = useMemo(() => collectStampTemplateUsage(scan.maps, stamps), [scan.maps, stamps])
  const scanComplete = scan.done && scan.failures.length === 0
  const selectedUsage = selected ? usage.byStampId[selected.id] : undefined
  const metadataChanged = Boolean(
    selected &&
      (draftName.trim() !== selected.name || draftCategory.trim() !== (selected.category ?? '')),
  )

  const focusTemplate = (id: string): void => {
    setSelectedId(id)
    onObjectFocus?.(id)
  }
  const requestFocusTemplate = (id: string): void => {
    if (!contentEditor || contentEditor.template.id === id) {
      focusTemplate(id)
      return
    }
    if (contentDirty) {
      setLeaveIntent({ kind: 'select', id })
      return
    }
    setContentEditor(undefined)
    focusTemplate(id)
  }
  const requestCloseContentEditor = (): void => {
    if (contentDirty) {
      setLeaveIntent({ kind: 'close' })
      return
    }
    setContentEditor(undefined)
  }
  const openContentEditor = (template: StampTemplateV1): void => {
    setContentDirty(false)
    setContentEditor({ mode: 'edit', template: structuredClone(template) })
  }
  const openCreate = (): void => {
    const id = nextStampTemplateId(
      'stamp-user',
      stamps.map((template) => template.id),
    )
    setCreateName('')
    setCreateId(id)
    setCreateTilesetId(tilesets[0]?.id ?? '')
    setCreateError('')
    setCreateOpen(true)
  }
  const beginCreate = (): void => {
    const name = createName.trim()
    const id = createId.trim()
    if (!name) {
      setCreateError('请输入组合名称。')
      return
    }
    if (!id) {
      setCreateError('请输入稳定 ID。')
      return
    }
    if (id.includes('/')) {
      setCreateError("稳定 ID 不得包含 '/'。")
      return
    }
    if (stamps.some((template) => template.id === id)) {
      setCreateError(`稳定 ID “${id}” 已存在。`)
      return
    }
    if (!createTilesetId) {
      setCreateError('请选择瓦片集。')
      return
    }
    setContentDirty(false)
    setContentEditor({
      mode: 'create',
      template: createBlankStampDraft(id, name, createTilesetId),
    })
    setCreateOpen(false)
  }
  const saveContent = (
    next: StampTemplateV1,
    takeOwnership: boolean,
    editor: StampContentEditorState,
  ): void => {
    if (editor.mode === 'create') session.dispatch(new AddStampTemplateCommand(next))
    else session.dispatch(new ReplaceStampTemplateCommand(next, { takeOwnership }))
    setContentDirty(false)
    setContentEditor(undefined)
    focusTemplate(next.id)
    onStatusNotice?.({ kind: 'info', message: `已保存组合“${next.name}”；既有地图放置保持不变。` })
  }
  const saveMetadata = (takeOwnership: boolean): void => {
    if (!selected || !metadataChanged) return
    if (selected.origin === 'migrated' && !takeOwnership) {
      setConfirmAction('takeover')
      return
    }
    try {
      session.dispatch(
        new ReplaceStampTemplateCommand(
          {
            ...selected,
            name: draftName.trim(),
            ...(draftCategory.trim()
              ? { category: draftCategory.trim() }
              : { category: undefined }),
            ...(selected.origin === 'migrated' ? { origin: 'authored' as const } : {}),
          },
          { takeOwnership },
        ),
      )
      setConfirmAction(undefined)
      setError('')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(message)
      onStatusNotice?.({ kind: 'error', message })
    }
  }
  const duplicate = (): void => {
    if (!selected) return
    try {
      const id = nextStampTemplateId(
        `${selected.id}-copy`,
        stamps.map((template) => template.id),
      )
      session.dispatch(new DuplicateStampTemplateCommand(selected.id, id, `${selected.name} 副本`))
      focusTemplate(id)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(message)
      onStatusNotice?.({ kind: 'error', message })
    }
  }
  const remove = (): void => {
    if (!selected) return
    const nextId = stamps.find((template) => template.id !== selected.id)?.id
    setSelectedId(nextId ?? '')
    onObjectFocus?.(nextId)
    session.dispatch(new DeleteStampTemplateCommand(selected.id))
    setConfirmAction(undefined)
    setError('')
  }
  const updateFromSelection = async (): Promise<void> => {
    if (!selectionSource || !selected) return
    setSelectionLoading(true)
    setError('')
    try {
      const map =
        session.getState().maps[selectionSource.mapId] ??
        (await session.ensureMapLoaded(selectionSource.mapId))
      if (map.tilesetId !== selected.tilesetId)
        throw new Error(
          `当前选区使用 tileset “${map.tilesetId}”，不能更新 tileset “${selected.tilesetId}” 的组合。`,
        )
      setSelectionDialogMap(map)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(message)
      onStatusNotice?.({ kind: 'error', message })
    } finally {
      setSelectionLoading(false)
    }
  }
  const sourceDiagnostics = usage.missingSources.length ? (
    <section className="stamp-source-info">
      <strong>悬空来源引用（信息）</strong>
      <p>
        这些已放置组仍能按普通地图值运行，只是原模板已不存在。
        {!scanComplete ? ' 当前扫描尚不完整。' : ''}
      </p>
      {usage.missingSources.map((item) => (
        <div key={item.sourceStampId} className="stamp-missing-source">
          <span>
            <code>{item.sourceStampId}</code> ·{' '}
            {scanComplete ? item.placementCount : `至少 ${item.placementCount}`} 处
          </span>
          <div>
            {item.mapIds.map((mapId) => (
              <button key={mapId} type="button" onClick={() => onOpenMap?.(mapId)}>
                {mapIndex.maps.find((asset) => asset.id === mapId)?.name ?? mapId}
                <span>打开 ↗</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  ) : null

  return (
    <>
      <div className="outliner data-outliner stamp-outliner">
        {tabBar}
        <DsCatalogControls
          title="组合库"
          count={stamps.length}
          unit="项"
          actions={[{ id: 'create-stamp', label: '新建组合', icon: '＋', onClick: openCreate }]}
          search={{
            'aria-label': '搜索组合模板',
            value: query,
            autoComplete: 'off',
            placeholder: '搜索名称、ID 或瓦片集…',
            onChange: (event) => setQuery(event.target.value),
          }}
          filters={[
            <DsSelect
              key="category"
              size="compact"
              aria-label="筛选组合分类"
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={[
                { value: 'all', label: '全部分类' },
                ...categories.map((category) => ({ value: category, label: category })),
              ]}
            />,
            <DsSelect
              key="origin"
              size="compact"
              aria-label="筛选组合来源"
              value={originFilter}
              onValueChange={(value) => setOriginFilter(value as typeof originFilter)}
              options={[
                { value: 'all', label: '全部来源' },
                { value: 'authored', label: '作者' },
                { value: 'migrated', label: '预置' },
              ]}
            />,
          ]}
        />
        <section className="stamp-library-list" aria-label="组合模板列表">
          {stamps.length === 0 ? (
            <div className="stamp-list-empty">
              <span aria-hidden="true">▦</span>
              <strong>还没有组合</strong>
              <small>直接新建组合，或从地图选区导入已有内容。</small>
              <DsButton size="compact" icon="add" onClick={openCreate}>
                新建组合
              </DsButton>
            </div>
          ) : shown.length === 0 ? (
            <div className="stamp-list-empty">
              <strong>没有匹配项</strong>
              <small>调整搜索或筛选条件。</small>
            </div>
          ) : null}
          {pagedShown.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`stamp-library-row${selected?.id === template.id ? ' selected' : ''}`}
              aria-current={selected?.id === template.id ? 'true' : undefined}
              data-stamp-id={template.id}
              tabIndex={
                template.id ===
                (pagedShown.some((candidate) => candidate.id === selected?.id)
                  ? selected?.id
                  : pagedShown[0]?.id)
                  ? 0
                  : -1
              }
              onClick={() => requestFocusTemplate(template.id)}
              onKeyDown={(event) => {
                if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const rows = [
                  ...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                    '.stamp-library-row',
                  ),
                ]
                const index = rows.indexOf(event.currentTarget)
                const next =
                  event.key === 'Home'
                    ? rows[0]
                    : event.key === 'End'
                      ? rows.at(-1)
                      : rows[
                          Math.max(
                            0,
                            Math.min(rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
                          )
                        ]
                if (next?.dataset.stampId) {
                  next.focus()
                  requestFocusTemplate(next.dataset.stampId)
                }
              }}
            >
              <span className="stamp-row-thumb" aria-hidden="true">
                <StampMiniPreview
                  template={template}
                  tilesets={tilesets}
                  assetCatalog={assetCatalog}
                  assetReader={assetReader}
                  assetBase={assetBase}
                />
              </span>
              <span className="stamp-row-copy">
                <strong>{template.name}</strong>
                <span className="mono">{template.id}</span>
              </span>
              <span className={`stamp-origin-badge ${template.origin}`}>
                {template.origin === 'migrated' ? '预置' : '作者'}
              </span>
            </button>
          ))}
        </section>
        {pageCount > 1 ? (
          <nav className="stamp-library-pages" aria-label="组合模板分页">
            <button
              type="button"
              aria-label="上一页组合模板"
              disabled={safePage === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              ‹
            </button>
            <span className="mono">
              {safePage + 1}/{pageCount}
            </span>
            <button
              type="button"
              aria-label="下一页组合模板"
              disabled={safePage === pageCount - 1}
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            >
              ›
            </button>
          </nav>
        ) : null}
      </div>

      <main className="center stamp-center">
        {contentEditor ? (
          <StampContentEditor
            key={`${contentEditor.mode}:${contentEditor.template.id}`}
            template={contentEditor.template}
            mode={contentEditor.mode}
            tilesets={tilesets}
            assetCatalog={assetCatalog}
            assetReader={assetReader}
            assetBase={assetBase}
            onDirtyChange={setContentDirty}
            onCancel={requestCloseContentEditor}
            onSave={(next, takeOwnership) => saveContent(next, takeOwnership, contentEditor)}
          />
        ) : selected ? (
          <div className="stamp-workspace-scroll">
            <header className="stamp-workspace-head">
              <div>
                <span className="stamp-eyebrow">组合地物模板</span>
                <h2>{selected.name}</h2>
                <p className="mono">{selected.id}</p>
              </div>
              <div className="stamp-workspace-head__actions">
                <span className={`stamp-origin-badge ${selected.origin}`}>
                  {selected.origin === 'migrated' ? '迁移预置' : '作者模板'}
                </span>
                <DsButton size="compact" onClick={() => openContentEditor(selected)}>
                  编辑内容
                </DsButton>
              </div>
            </header>
            <StampPreviewCanvas
              template={selected}
              tilesets={tilesets}
              assetCatalog={assetCatalog}
              assetReader={assetReader}
              assetBase={assetBase}
            />
            <section className="stamp-composition-card">
              <header>
                <strong>组成</strong>
                <span>模板是快照，已放置内容不会随模板变化</span>
              </header>
              <div className="stamp-metric-grid">
                <div>
                  <strong>{selected.layerSlots.length}</strong>
                  <span>视觉层</span>
                </div>
                <div>
                  <strong>{selected.visual.length}</strong>
                  <span>视觉成员</span>
                </div>
                <div>
                  <strong>{selected.collision.length}</strong>
                  <span>碰撞成员</span>
                </div>
                <div>
                  <strong>{new Set(selected.visual.map((member) => member.tileId)).size}</strong>
                  <span>不同瓦片</span>
                </div>
              </div>
              <ul className="stamp-slot-list">
                {selected.layerSlots.map((slot, index) => (
                  <li key={slot.id}>
                    <DsSequenceIndex
                      value={index + 1}
                      accessibleLabel={`第 ${index + 1} 个视觉层`}
                    />
                    <span>
                      <strong>{slot.name}</strong>
                      <small className="mono">{slot.id}</small>
                    </span>
                    <span>{slot.depthMode === 'height' ? '高度层' : '平面层'}</span>
                    <b>
                      {selected.visual.filter((member) => member.layerSlotId === slot.id).length}
                    </b>
                  </li>
                ))}
              </ul>
            </section>
            {sourceDiagnostics}
          </div>
        ) : (
          <div className="stamp-workspace-scroll">
            <div className="stamp-workspace-empty">
              <span aria-hidden="true">▦</span>
              <strong>{stamps.length ? '选择一个组合' : '创建第一个组合'}</strong>
              <small>组合可以同时包含多个视觉层和独立碰撞通道。</small>
              {!stamps.length ? (
                <DsButton size="compact" icon="add" onClick={openCreate}>
                  新建组合
                </DsButton>
              ) : null}
            </div>
            {sourceDiagnostics}
          </div>
        )}
      </main>

      <aside className="inspector inspector--tabbed stamp-inspector">
        <div className="insp-head">
          <div className="what">组合模板</div>
          <div className="who">
            {contentEditor?.template.name ?? selected?.name ?? selected?.id ?? '未选择'}
          </div>
        </div>
        {contentEditor ? (
          <div className="stamp-content-inspector">
            <section className="section">
              <h4>内容编辑</h4>
              <p>当前所有修改只存在于内存草稿；点击“保存组合”后才会作为一笔可撤销命令写入工程。</p>
              <dl>
                <div>
                  <dt>稳定 ID</dt>
                  <dd className="mono">{contentEditor.template.id}</dd>
                </div>
                <div>
                  <dt>瓦片集</dt>
                  <dd className="mono">{contentEditor.template.tilesetId}</dd>
                </div>
                <div>
                  <dt>地图放置</dt>
                  <dd>保持原快照，不随模板变化</dd>
                </div>
              </dl>
              <DsButton
                size="compact"
                variant="secondary"
                icon="open"
                onClick={() => onOpenTileset?.(contentEditor.template.tilesetId)}
              >
                打开来源瓦片集
              </DsButton>
              <DsButton size="compact" onClick={requestCloseContentEditor}>
                退出内容编辑
              </DsButton>
            </section>
          </div>
        ) : selected ? (
          <DsInspectorTabs
            id="stamp-inspector"
            label="组合模板检查器"
            activeId={inspectorTab}
            onChange={(id) => setInspectorTab(id as StampInspectorTab)}
            items={[
              {
                id: 'properties',
                label: '属性',
                panel: (
                  <>
                    {error ? <div className="stamp-error">{error}</div> : null}
                    <section className="section">
                      <DsButton variant="primary" onClick={() => openContentEditor(selected)}>
                        编辑组合内容
                      </DsButton>
                      <h4>登记</h4>
                      <label className="field">
                        <span className="field-label">名称</span>
                        <input
                          className="in"
                          name="stamp-name"
                          autoComplete="off"
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">分类</span>
                        <input
                          className="in"
                          name="stamp-category"
                          autoComplete="off"
                          value={draftCategory}
                          placeholder="未分类"
                          onChange={(event) => setDraftCategory(event.target.value)}
                        />
                      </label>
                      <div className="field">
                        <span className="field-label">ID</span>
                        <div className="in mono stamp-readonly" title={selected.id}>
                          {selected.id}
                        </div>
                      </div>
                      <div className="field">
                        <span className="field-label">瓦片集</span>
                        <button
                          type="button"
                          className="in mono stamp-readonly stamp-resource-link"
                          title={`打开瓦片集 ${selected.tilesetId}`}
                          onClick={() => onOpenTileset?.(selected.tilesetId)}
                        >
                          {selected.tilesetId}
                          <span aria-hidden="true">↗</span>
                        </button>
                      </div>
                      <div className="field">
                        <span className="field-label">来源</span>
                        <span>
                          {selected.origin === 'migrated' ? '迁移预置（只读）' : '作者内容'}
                        </span>
                      </div>
                      <button
                        ref={metadataSaveRef}
                        type="button"
                        className="stamp-primary-action"
                        disabled={!metadataChanged || !draftName.trim()}
                        onClick={() => saveMetadata(false)}
                      >
                        保存名称与分类
                      </button>
                      <button
                        type="button"
                        className="stamp-secondary-action"
                        disabled={!selectionSource || selectionLoading}
                        title={
                          selectionSource
                            ? `使用地图 ${selectionSource.mapId} 的暂存选区`
                            : '先到地图编辑中建立一个选区'
                        }
                        onClick={() => void updateFromSelection()}
                      >
                        {selectionLoading ? '正在读取地图…' : '用当前地图选区更新…'}
                      </button>
                      <p className="stamp-selection-source-note">
                        {selectionSource
                          ? `会话选区：${mapIndex.maps.find((asset) => asset.id === selectionSource.mapId)?.name ?? selectionSource.mapId}`
                          : '尚无会话选区；到地图编辑中选择内容后再返回。'}
                      </p>
                      {confirmAction === 'takeover' ? (
                        <div className="stamp-inline-confirm warning">
                          <strong>接管预置组合？</strong>
                          <p>整项转为作者内容，迁移不再覆盖；撤销可恢复。</p>
                          <div>
                            <button
                              ref={takeoverCancelRef}
                              type="button"
                              onKeyDown={(event) => {
                                if (event.key !== 'Escape') return
                                setConfirmAction(undefined)
                                window.setTimeout(() => metadataSaveRef.current?.focus(), 0)
                              }}
                              onClick={() => {
                                setConfirmAction(undefined)
                                metadataSaveRef.current?.focus()
                              }}
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              className="primary"
                              onKeyDown={(event) => {
                                if (event.key !== 'Escape') return
                                setConfirmAction(undefined)
                                window.setTimeout(() => metadataSaveRef.current?.focus(), 0)
                              }}
                              onClick={() => saveMetadata(true)}
                            >
                              确认接管
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  </>
                ),
              },
              {
                id: 'references',
                label: '引用',
                count: scanComplete ? (selectedUsage?.placementCount ?? 0) : undefined,
                panel: (
                  <>
                    {error ? <div className="stamp-error">{error}</div> : null}
                    <section className="section stamp-usage-section">
                      <DsReferencePanel
                        state={
                          scanComplete
                            ? (selectedUsage?.placementCount ?? 0) > 0
                              ? 'ready'
                              : 'empty'
                            : scan.done
                              ? 'partial'
                              : 'loading'
                        }
                        count={
                          scanComplete
                            ? { kind: 'exact', value: selectedUsage?.placementCount ?? 0 }
                            : { kind: 'at-least', value: selectedUsage?.placementCount ?? 0 }
                        }
                        impact={{
                          kind: 'informational',
                          label: '来源快照',
                          description: scanComplete
                            ? `已扫描 ${scan.completed}/${scan.total} 张地图；删除或修改模板不会改动这些已放置内容。`
                            : scan.done
                              ? `扫描不完整：${scan.failures.length} 张地图读取失败；引用数未知，当前结果只是下界。`
                              : `正在扫描 ${scan.completed}/${scan.total} 张地图；当前结果只是下界。`,
                        }}
                        action={
                          scan.failures.length ? (
                            <DsButton
                              size="compact"
                              variant="secondary"
                              onClick={() => setScanRevision((value) => value + 1)}
                            >
                              重试扫描
                            </DsButton>
                          ) : undefined
                        }
                      >
                        {(selectedUsage?.mapIds.length ?? 0) > 0 ? (
                          <DsReferenceGroup
                            title="已放置地图"
                            count={selectedUsage?.placementCount ?? 0}
                          >
                            <DsReferenceList>
                              {(selectedUsage?.mapIds ?? []).map((mapId) => (
                                <DsReferenceRow
                                  key={mapId}
                                  title={
                                    mapIndex.maps.find((asset) => asset.id === mapId)?.name ?? mapId
                                  }
                                  detail={mapId}
                                  labels={[{ label: '来源快照' }]}
                                  action={
                                    onOpenMap
                                      ? {
                                          label: '打开地图 ↗',
                                          onActivate: () => onOpenMap(mapId),
                                        }
                                      : undefined
                                  }
                                  status={
                                    onOpenMap
                                      ? undefined
                                      : {
                                          label: '暂不可定位',
                                          reason: '当前宿主没有提供地图定位能力。',
                                          tone: 'warning',
                                        }
                                  }
                                />
                              ))}
                            </DsReferenceList>
                          </DsReferenceGroup>
                        ) : null}
                      </DsReferencePanel>
                    </section>
                  </>
                ),
              },
              {
                id: 'actions',
                label: '动作',
                panel: (
                  <>
                    {error ? <div className="stamp-error">{error}</div> : null}
                    <section className="section stamp-inspector-actions">
                      <button type="button" className="stamp-secondary-action" onClick={duplicate}>
                        复制为作者模板
                      </button>
                      <button
                        ref={deleteTriggerRef}
                        type="button"
                        className="stamp-danger-action"
                        onClick={() => setConfirmAction('delete')}
                      >
                        删除模板…
                      </button>
                      {confirmAction === 'delete' ? (
                        <div className="stamp-inline-confirm danger">
                          <strong>只删除模板？</strong>
                          <p>
                            {scanComplete
                              ? `检测到 ${selectedUsage?.placementCount ?? 0} 处来源引用；`
                              : '完整来源数量仍未知；'}
                            已放置地图值和组身份都会保留。
                          </p>
                          <div>
                            <button
                              ref={deleteCancelRef}
                              type="button"
                              onKeyDown={(event) => {
                                if (event.key !== 'Escape') return
                                setConfirmAction(undefined)
                                window.setTimeout(() => deleteTriggerRef.current?.focus(), 0)
                              }}
                              onClick={() => {
                                setConfirmAction(undefined)
                                deleteTriggerRef.current?.focus()
                              }}
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              className="danger"
                              disabled={!scanComplete}
                              onKeyDown={(event) => {
                                if (event.key !== 'Escape') return
                                setConfirmAction(undefined)
                                window.setTimeout(() => deleteTriggerRef.current?.focus(), 0)
                              }}
                              onClick={remove}
                            >
                              确认删除
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  </>
                ),
              },
            ]}
          />
        ) : (
          <div className="insp-empty">选择组合后编辑属性和查看来源引用。</div>
        )}
      </aside>
      {createOpen ? (
        <DsDialog
          open
          title="新建组合"
          description="先登记稳定 ID 与来源瓦片集；进入工作区后再绘制多层内容。"
          onClose={() => setCreateOpen(false)}
          footer={
            <>
              <DsButton onClick={() => setCreateOpen(false)}>取消</DsButton>
              <DsButton variant="primary" onClick={beginCreate}>
                进入内容编辑
              </DsButton>
            </>
          }
        >
          <div className="stamp-create-form">
            <DsTextInput
              autoFocus
              aria-label="新组合名称"
              placeholder="例如：村口门楼"
              value={createName}
              onChange={(event) => {
                setCreateName(event.target.value)
                setCreateError('')
              }}
            />
            <DsTextInput
              aria-label="新组合稳定 ID"
              monospace
              value={createId}
              onChange={(event) => {
                setCreateId(event.target.value)
                setCreateError('')
              }}
            />
            <DsSelect
              aria-label="新组合瓦片集"
              value={createTilesetId}
              options={tilesets.map((tileset) => ({
                value: tileset.id,
                label: `${tileset.name} · ${tileset.id}`,
              }))}
              onValueChange={(value) => {
                setCreateTilesetId(value)
                setCreateError('')
              }}
              placeholder={tilesets.length ? undefined : '没有可用瓦片集'}
            />
            {createError ? (
              <p className="stamp-error" role="alert">
                {createError}
              </p>
            ) : null}
          </div>
        </DsDialog>
      ) : null}
      {leaveIntent ? (
        <DsDialog
          open
          title="放弃未保存的组合修改？"
          description="草稿尚未写入工程；放弃后无法通过工程撤销恢复。"
          onClose={() => setLeaveIntent(undefined)}
          footer={
            <>
              <DsButton onClick={() => setLeaveIntent(undefined)}>继续编辑</DsButton>
              <DsButton
                variant="danger"
                onClick={() => {
                  const intent = leaveIntent
                  setLeaveIntent(undefined)
                  setContentDirty(false)
                  setContentEditor(undefined)
                  if (intent.kind === 'select') focusTemplate(intent.id)
                }}
              >
                放弃草稿
              </DsButton>
            </>
          }
        >
          <p>地图、MapIndex 与已放置组合均未被当前草稿修改。</p>
        </DsDialog>
      ) : null}
      {selectionDialogMap && selectionSource && selected ? (
        <StampTemplateDialog
          map={selectionDialogMap}
          selection={selectionSource.selection}
          stamps={stamps}
          session={session}
          initialMode="update"
          initialTargetId={selected.id}
          onClose={() => setSelectionDialogMap(undefined)}
          onSaved={(id) => focusTemplate(id)}
        />
      ) : null}
    </>
  )
}
