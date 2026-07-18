import type { MapIndexV1, ProjectMap, StampTemplateV1 } from '@type-pal/content'
import type { AssetBase, TilesetDef } from '@type-pal/reforge'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { EditSession } from '../core/edit-session.js'
import {
  DeleteStampTemplateCommand,
  DuplicateStampTemplateCommand,
  ReplaceStampTemplateCommand,
} from '../core/stamp-commands.js'
import type { StampSelectionSource } from '../core/stamp-template.js'
import { collectStampTemplateUsage, nextStampTemplateId } from '../core/stamp-template.js'
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

export function StampLibraryTab(props: {
  stamps: readonly StampTemplateV1[]
  tilesets: readonly TilesetDef[]
  tilesetBlobs: Record<string, ArrayBuffer>
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
    tilesetBlobs,
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
  const searchId = useId()
  const categoryId = useId()
  const originId = useId()
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
        <div className="pane-h stamp-library-head">
          <span className="t">组合库</span>
          <span className="spacer" />
          <span className="stamp-library-count">
            {shown.length}/{stamps.length}
          </span>
        </div>
        <div className="stamp-library-tools">
          <label className="stamp-search-field" htmlFor={searchId}>
            <span className="stamp-search-icon" aria-hidden="true" />
            <input
              id={searchId}
              className="in"
              type="search"
              aria-label="搜索组合模板"
              value={query}
              autoComplete="off"
              placeholder="搜索名称、ID 或瓦片集…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="stamp-filter-grid">
            <label htmlFor={categoryId}>
              <span>分类</span>
              <select
                id={categoryId}
                className="in"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">全部</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={originId}>
              <span>来源</span>
              <select
                id={originId}
                className="in"
                value={originFilter}
                onChange={(event) => setOriginFilter(event.target.value as typeof originFilter)}
              >
                <option value="all">全部</option>
                <option value="authored">作者</option>
                <option value="migrated">预置</option>
              </select>
            </label>
          </div>
        </div>
        <section className="stamp-library-list" aria-label="组合模板列表">
          {stamps.length === 0 ? (
            <div className="stamp-list-empty">
              <span aria-hidden="true">▦</span>
              <strong>还没有组合</strong>
              <small>到“地图编辑”选中一个或多个瓦片，再从检查器保存为组合。</small>
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
              onClick={() => focusTemplate(template.id)}
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
                  focusTemplate(next.dataset.stampId)
                }
              }}
            >
              <span className="stamp-row-thumb" aria-hidden="true">
                <StampMiniPreview
                  template={template}
                  tilesets={tilesets}
                  tilesetBlobs={tilesetBlobs}
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
        {selected ? (
          <div className="stamp-workspace-scroll">
            <header className="stamp-workspace-head">
              <div>
                <span className="stamp-eyebrow">组合地物模板</span>
                <h2>{selected.name}</h2>
                <p className="mono">{selected.id}</p>
              </div>
              <span className={`stamp-origin-badge ${selected.origin}`}>
                {selected.origin === 'migrated' ? '迁移预置' : '作者模板'}
              </span>
            </header>
            <StampPreviewCanvas
              template={selected}
              tilesets={tilesets}
              tilesetBlobs={tilesetBlobs}
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
                {selected.layerSlots.map((slot) => (
                  <li key={slot.id}>
                    <span className="stamp-slot-order">
                      {selected.layerSlots.indexOf(slot) + 1}
                    </span>
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
              <strong>{stamps.length ? '选择一个组合' : '从地图选区创建第一个组合'}</strong>
              <small>组合可以同时包含多个视觉层和独立碰撞通道。</small>
            </div>
            {sourceDiagnostics}
          </div>
        )}
      </main>

      <aside className="inspector stamp-inspector">
        {selected ? (
          <>
            <div className="insp-head">
              <div className="what">模板属性</div>
              <div className="who">{selected.id}</div>
            </div>
            <section className="section">
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
                <span>{selected.origin === 'migrated' ? '迁移预置（只读）' : '作者内容'}</span>
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
            <section className="section stamp-usage-section">
              <h4>
                来源引用 <span className="b2">已放置组</span>
              </h4>
              <div className="stamp-scan-status">
                <span className={scanComplete ? 'done' : scan.done ? 'failed' : ''} />
                {scanComplete
                  ? `已扫描 ${scan.completed}/${scan.total} 张地图`
                  : scan.done
                    ? `扫描不完整：${scan.failures.length} 张读取失败`
                    : `正在扫描 ${scan.completed}/${scan.total} 张地图…`}
              </div>
              {scan.failures.length ? (
                <p className="stamp-scan-error">
                  引用数未知；当前仅发现 {selectedUsage?.placementCount ?? 0} 处。
                  <button type="button" onClick={() => setScanRevision((value) => value + 1)}>
                    重试扫描
                  </button>
                </p>
              ) : null}
              <strong className="stamp-usage-count">
                {scanComplete
                  ? (selectedUsage?.placementCount ?? 0)
                  : `≥${selectedUsage?.placementCount ?? 0}`}
                <small> 处来源引用</small>
              </strong>
              <div className="stamp-usage-maps">
                {(selectedUsage?.mapIds ?? []).map((mapId) => (
                  <button key={mapId} type="button" onClick={() => onOpenMap?.(mapId)}>
                    {mapIndex.maps.find((asset) => asset.id === mapId)?.name ?? mapId}
                    <span>打开地图 ↗</span>
                  </button>
                ))}
              </div>
              <p className="stamp-usage-note">删除或修改模板不会改动这些已放置内容。</p>
            </section>
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
        ) : (
          <div className="insp-empty">选择组合后编辑属性和查看来源引用。</div>
        )}
        {error ? <div className="stamp-error">{error}</div> : null}
      </aside>
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
