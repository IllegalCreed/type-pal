import type { AssetCatalogV1, MapIndexV1, StampTemplate } from '@type-pal/content'
import type { AssetBase, TilesetDef } from '@type-pal/reforge'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  AddStampTemplateCommand,
  DeleteStampTemplateCommand,
  DuplicateStampTemplateCommand,
  ReplaceStampTemplateCommand,
} from '../core/stamp-commands.js'
import { createBlankStampDraft } from '../core/stamp-draft.js'
import { nextStampTemplateId } from '../core/stamp-template.js'
import {
  DsButton,
  DsCatalogControls,
  DsDialog,
  DsIconButton,
  DsInspectorTabs,
  DsReferenceGroup,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelect,
  DsTextInput,
} from './design-system/index.js'
import { StampContentEditor } from './StampContentEditor.js'
import { StampMiniPreview } from './StampPreviewCanvas.js'

const STAMP_PAGE_SIZE = 100

type StampInspectorTab = 'properties' | 'references' | 'tiles'
type StampContentEditorState = {
  mode: 'create' | 'edit'
  template: StampTemplate
}

export function StampLibraryTab(props: {
  stamps: readonly StampTemplate[]
  tilesets: readonly TilesetDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase: AssetBase
  session: EditSession
  mapIndex: MapIndexV1
  tabBar?: React.ReactNode
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenMap?: (mapId: string) => void
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
    tabBar,
    focusObjectId,
    onObjectFocus,
    onOpenMap,
    onStatusNotice,
  } = props
  const initialSelectedId = focusObjectId ?? stamps[0]?.id ?? ''
  const initialSelected = stamps.find((template) => template.id === initialSelectedId)
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [inspectorTab, setInspectorTab] = useState<StampInspectorTab>('properties')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState<'all' | StampTemplate['origin']>('all')
  const [page, setPage] = useState(0)
  const [deleteTargetId, setDeleteTargetId] = useState<string>()
  const [error, setError] = useState('')
  const [contentEditor, setContentEditor] = useState<StampContentEditorState | undefined>(() =>
    initialSelected ? { mode: 'edit', template: structuredClone(initialSelected) } : undefined,
  )
  const [paletteHost, setPaletteHost] = useState<HTMLDivElement | null>(null)
  const [propertiesHost, setPropertiesHost] = useState<HTMLDivElement | null>(null)
  const [layersHost, setLayersHost] = useState<HTMLDivElement | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createId, setCreateId] = useState('')
  const [createTilesetId, setCreateTilesetId] = useState(tilesets[0]?.id ?? '')
  const [createError, setCreateError] = useState('')
  const deleteTriggerRef = useRef<HTMLElement | null>(null)
  const deleteCancelRef = useRef<HTMLButtonElement>(null)

  const subscribeStampUsage = useCallback(
    (listener: () => void) => session.subscribeStampUsage(listener),
    [session],
  )
  const readStampUsageVersion = useCallback(() => session.getStampUsageVersion(), [session])
  useSyncExternalStore(subscribeStampUsage, readStampUsageVersion, readStampUsageVersion)

  const selected = stamps.find((template) => template.id === selectedId)
  const inspectorTemplate = contentEditor?.template ?? selected
  const bindPaletteHost = useCallback((node: HTMLDivElement | null) => setPaletteHost(node), [])
  const bindPropertiesHost = useCallback(
    (node: HTMLDivElement | null) => setPropertiesHost(node),
    [],
  )
  const bindLayersHost = useCallback((node: HTMLDivElement | null) => setLayersHost(node), [])
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
          template.id.toLowerCase().includes(needle)),
    )
  }, [categoryFilter, originFilter, query, stamps])
  const pageCount = Math.max(1, Math.ceil(shown.length / STAMP_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pagedShown = shown.slice(safePage * STAMP_PAGE_SIZE, (safePage + 1) * STAMP_PAGE_SIZE)

  useEffect(() => {
    if (focusObjectId === undefined || focusObjectId === selectedId) return
    focusTemplate(focusObjectId)
  }, [focusObjectId, selectedId])
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
    void selectedId
    setError('')
  }, [selectedId])

  useEffect(() => {
    void mapIndex
    void session.ensureStampUsageIndexed()
  }, [mapIndex, session])
  const scan = session.getStampUsageScanSnapshot()
  useEffect(() => {
    onStatusNotice?.(
      scan.done && scan.failures.length
        ? {
            kind: 'error',
            message: `组合来源扫描不完整：${scan.failures.length} 张地图读取失败。`,
          }
        : undefined,
    )
  }, [onStatusNotice, scan.done, scan.failures.length])
  useEffect(
    () => () => {
      onStatusNotice?.(undefined)
    },
    [onStatusNotice],
  )
  useEffect(() => {
    if (deleteTargetId) deleteCancelRef.current?.focus()
  }, [deleteTargetId])

  const usage = session.getStampTemplateUsageIndex(stamps)
  const scanComplete = scan.done && scan.failures.length === 0
  const selectedUsage = selected ? usage.byStampId[selected.id] : undefined
  const focusTemplate = (id: string): void => {
    const template = stamps.find((candidate) => candidate.id === id)
    setSelectedId(id)
    onObjectFocus?.(id)
    setContentEditor(template ? { mode: 'edit', template: structuredClone(template) } : undefined)
  }
  const requestFocusTemplate = (id: string): void => {
    if (!contentEditor || contentEditor.template.id === id) {
      focusTemplate(id)
      return
    }
    setContentEditor(undefined)
    focusTemplate(id)
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
    const next = createBlankStampDraft(id, name, createTilesetId)
    setSelectedId(id)
    onObjectFocus?.(id)
    setContentEditor({ mode: 'create', template: structuredClone(next) })
    setCreateOpen(false)
    onStatusNotice?.({ kind: 'info', message: `正在创建组合“${name}”；首次绘制后进入全局撤销与保存。` })
  }
  const updateContent = (next: StampTemplate, takeOwnership: boolean): void => {
    const hasVisual = next.layers.some((layer) =>
      layer.tiles.some((row) => row.some((tileId) => tileId !== null)),
    )
    if (contentEditor?.mode === 'create') {
      if (!hasVisual) {
        setContentEditor({ mode: 'create', template: structuredClone(next) })
        return
      }
      session.dispatch(new AddStampTemplateCommand(next))
    } else session.dispatch(new ReplaceStampTemplateCommand(next, { takeOwnership }))
    setSelectedId(next.id)
    onObjectFocus?.(next.id)
    setContentEditor({ mode: 'edit', template: structuredClone(next) })
  }
  const duplicate = (template: StampTemplate): void => {
    try {
      const id = nextStampTemplateId(
        `${template.id}-copy`,
        stamps.map((template) => template.id),
      )
      session.dispatch(
        new DuplicateStampTemplateCommand(template.id, id, `${template.name} 副本`),
      )
      requestFocusTemplate(id)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(message)
      onStatusNotice?.({ kind: 'error', message })
    }
  }
  const remove = (id: string): void => {
    const nextId = stamps.find((template) => template.id !== id)?.id
    session.dispatch(new DeleteStampTemplateCommand(id))
    if (selected?.id === id) {
      setSelectedId(nextId ?? '')
      onObjectFocus?.(nextId)
      const next = stamps.find((template) => template.id === nextId)
      setContentEditor(next ? { mode: 'edit', template: structuredClone(next) } : undefined)
    }
    setDeleteTargetId(undefined)
    setError('')
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

  useEffect(() => {
    if (!selected) return
    if (
      contentEditor?.template.id === selected.id &&
      JSON.stringify(contentEditor.template) === JSON.stringify(selected)
    )
      return
    setContentEditor({ mode: 'edit', template: structuredClone(selected) })
  }, [contentEditor?.mode, contentEditor?.template, selected])

  return (
    <>
      <div className="outliner data-outliner stamp-outliner">
        {tabBar}
        <DsCatalogControls
          title="组合库"
          count={stamps.length}
          unit="项"
          actions={[{ id: 'create-stamp', label: '新建组合', icon: 'add', onClick: openCreate }]}
          search={{
            'aria-label': '搜索组合模板',
            value: query,
            autoComplete: 'off',
            placeholder: '搜索名称或稳定 ID…',
            onChange: (event) => setQuery(event.target.value),
          }}
          filters={[
            <DsSelect
              key="category"
              size="compact"
              aria-label="筛选组合标签"
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={[
                { value: 'all', label: '全部标签' },
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
              <small>新建组合后，直接在中央画布中绘制多层内容。</small>
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
          {pagedShown.map((template) => {
            const isSelected = selected?.id === template.id
            return (
              <div
                key={template.id}
                className={`stamp-library-entry${isSelected ? ' selected' : ''}`}
              >
                <button
                  type="button"
                  className={`stamp-library-row${isSelected ? ' selected' : ''}`}
                  aria-current={isSelected ? 'true' : undefined}
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
                      ...event.currentTarget
                        .closest('.stamp-library-list')!
                        .querySelectorAll<HTMLButtonElement>('.stamp-library-row'),
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
                                Math.min(
                                  rows.length - 1,
                                  index + (event.key === 'ArrowDown' ? 1 : -1),
                                ),
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
                <div className="stamp-library-row-actions" aria-label={`${template.name} 操作`}>
                  <DsIconButton
                    size="compact"
                    variant="secondary"
                    icon="copy"
                    label={`复制组合 ${template.name}`}
                    onClick={() => duplicate(template)}
                  />
                  <DsIconButton
                    size="compact"
                    variant="danger"
                    icon="delete"
                    label={`删除组合 ${template.name}`}
                    onClick={(event) => {
                      deleteTriggerRef.current = event.currentTarget
                      setDeleteTargetId(template.id)
                    }}
                  />
                </div>
              </div>
            )
          })}
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
        {contentEditor ? <div ref={bindLayersHost} className="stamp-layer-host" /> : null}
      </div>

      <main className="center stamp-center">
        {contentEditor ? (
          <StampContentEditor
            key={contentEditor.template.id}
            template={contentEditor.template}
            tilesets={tilesets}
            assetCatalog={assetCatalog}
            assetReader={assetReader}
            assetBase={assetBase}
            paletteHost={paletteHost}
            propertiesHost={propertiesHost}
            layersHost={layersHost}
            onChange={updateContent}
          />
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
        {inspectorTemplate ? (
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
                    <section className="section stamp-properties-section">
                      <h4>基本信息</h4>
                      <div ref={bindPropertiesHost} className="stamp-inspector-properties-host" />
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
                              onClick={() =>
                                void session.ensureStampUsageIndexed({ retryFailures: true })
                              }
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
                      {sourceDiagnostics}
                    </section>
                  </>
                ),
              },
              {
                id: 'tiles',
                label: '瓦片',
                panel: <div ref={bindPaletteHost} className="stamp-inspector-palette-host" />,
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
          description="先登记稳定 ID 并选择初始绘制瓦片集；进入工作区后可继续切换其他瓦片集。"
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
              aria-label="新组合初始绘制瓦片集"
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
      {deleteTargetId ? (
        <DsDialog
          open
          title={`删除组合“${stamps.find((template) => template.id === deleteTargetId)?.name ?? deleteTargetId}”？`}
          description={
            scanComplete
              ? `检测到 ${usage.byStampId[deleteTargetId]?.placementCount ?? 0} 处来源引用；已放置地图内容会保留为快照。`
              : '引用扫描尚未完成，当前不能安全删除。'
          }
          onClose={() => {
            setDeleteTargetId(undefined)
            deleteTriggerRef.current?.focus()
          }}
          footer={
            <>
              <DsButton
                ref={deleteCancelRef}
                onClick={() => {
                  setDeleteTargetId(undefined)
                  deleteTriggerRef.current?.focus()
                }}
              >
                取消
              </DsButton>
              <DsButton
                variant="danger"
                disabled={!scanComplete}
                onClick={() => remove(deleteTargetId)}
              >
                确认删除
              </DsButton>
            </>
          }
        >
          <p>删除只影响组合库条目，不会回写已经放置到地图中的快照。</p>
        </DsDialog>
      ) : null}
    </>
  )
}
