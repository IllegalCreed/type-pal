import { type AssetCatalogV1, type AssetId, type AssetRecordV1 } from '@type-pal/content'
import { type AssetBase, loadStandardPalette } from '@type-pal/reforge'
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react'
import { type EditorAssetDiagnostic, editorAssetCatalogTitle } from '../core/asset-diagnostics.js'
import { DeleteAssetCommand, UpsertAssetCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import {
  nextAuthoredImageId,
  type PreparedImageImport,
  prepareAuthoredImage,
} from '../core/image-import.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import type { CurrentProjectReferenceIndexProvider } from '../core/project-reference-adapters.js'
import { STATIC_IMAGE_KINDS, type StaticImageKind } from '../core/static-image.js'
import {
  DsButton,
  DsCatalogControls,
  DsCatalogRow,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsFileInput,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsPropertyGrid,
  DsPropertyRow,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsTabs,
  DsTag,
  DsZoomToolbar,
} from './design-system/index.js'
import { ImageAssetThumbnail, imageAssets } from './ImageAssetPicker.js'
import { MediaAssetConfirmDialog, MediaAssetNameField } from './MediaAssetLifecycle.js'
import {
  clampMediaPreviewZoom,
  fitMediaPreviewZoom,
  MEDIA_PREVIEW_MAX_ZOOM,
  MEDIA_PREVIEW_MIN_ZOOM,
  stepMediaPreviewZoom,
} from './media-preview-viewport.js'

const KIND_LABEL: Record<StaticImageKind, string> = {
  portrait: '立绘',
  face: '战斗头像',
  'item-icon': '物品图标',
  'battle-background': '战场背景',
}

const ORIGIN_LABEL: Readonly<Record<AssetRecordV1['origin']['kind'], string>> = {
  'legacy-migrated': '原版迁移',
  authored: '项目创作',
  generated: '生成资源',
  licensed: '授权资源',
}

type ImageInspectorTab = 'resource' | 'references' | 'diagnostics'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function ImageWorkspacePreview(props: {
  assetId: AssetId
  kind: StaticImageKind
  reader: EditorAssetReader
  assetBase: AssetBase
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const panGesture = useRef<{
    pointerId: number
    clientX: number
    clientY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)
  const [error, setError] = useState('')
  const [size, setSize] = useState<{ width: number; height: number }>()
  const [fit, setFit] = useState(true)
  const [fitZoom, setFitZoom] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [panning, setPanning] = useState(false)
  useEffect(() => {
    let alive = true
    setError('')
    setSize(undefined)
    void Promise.all([
      props.reader.readBytes(props.assetId, props.kind),
      props.kind === 'battle-background' ? loadStandardPalette(props.assetBase) : undefined,
    ])
      .then(async ([bytes, palette]) => {
        const record = props.reader.record(props.assetId, props.kind)
        const bitmap = await createImageBitmap(new Blob([bytes], { type: record.mediaType }))
        if (!alive) {
          bitmap.close()
          return
        }
        if (props.kind === 'battle-background' && (bitmap.width !== 320 || bitmap.height !== 200)) {
          bitmap.close()
          throw new Error(`战场背景必须是 320×200，实际 ${bitmap.width}×${bitmap.height}`)
        }
        const canvas = canvasRef.current
        if (!canvas) {
          bitmap.close()
          return
        }
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) {
          bitmap.close()
          throw new Error('浏览器无法创建图片预览画布')
        }
        context.imageSmoothingEnabled = false
        context.drawImage(bitmap, 0, 0)
        bitmap.close()
        if (palette) {
          const image = context.getImageData(0, 0, canvas.width, canvas.height)
          for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) {
            const offset = pixel * 4
            const index = image.data[offset] ?? 0
            if (
              image.data[offset + 1] !== index ||
              image.data[offset + 2] !== index ||
              image.data[offset + 3] !== 255
            )
              throw new Error(`像素 ${pixel} 不是有效的项目战场背景`)
            const color = palette.colors[index] ?? [0, 0, 0]
            image.data[offset] = color[0]
            image.data[offset + 1] = color[1]
            image.data[offset + 2] = color[2]
            image.data[offset + 3] = 255
          }
          context.putImageData(image, 0, 0)
        }
        setSize({ width: canvas.width, height: canvas.height })
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      alive = false
    }
  }, [props.assetBase, props.assetId, props.kind, props.reader])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !size) return
    const update = (): void => {
      setFitZoom(
        fitMediaPreviewZoom({
          viewportWidth: stage.clientWidth,
          viewportHeight: stage.clientHeight,
          mediaWidth: size.width,
          mediaHeight: size.height,
        }),
      )
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [size])

  const renderedZoom = fit ? fitZoom : zoom

  const applyZoom = (value: number, anchor?: { clientX: number; clientY: number }): void => {
    const next = clampMediaPreviewZoom(value)
    const stage = stageRef.current
    const canvas = canvasRef.current
    const stageRect = stage?.getBoundingClientRect()
    const canvasRect = canvas?.getBoundingClientRect()
    const clientX = anchor?.clientX ?? (stageRect ? stageRect.left + stageRect.width / 2 : 0)
    const clientY = anchor?.clientY ?? (stageRect ? stageRect.top + stageRect.height / 2 : 0)
    const relativeX = canvasRect?.width ? (clientX - canvasRect.left) / canvasRect.width : 0.5
    const relativeY = canvasRect?.height ? (clientY - canvasRect.top) / canvasRect.height : 0.5
    setFit(false)
    setZoom(next)
    if (!stage || !canvas) return
    window.requestAnimationFrame(() => {
      const nextCanvasRect = canvas.getBoundingClientRect()
      stage.scrollLeft += nextCanvasRect.left + relativeX * nextCanvasRect.width - clientX
      stage.scrollTop += nextCanvasRect.top + relativeY * nextCanvasRect.height - clientY
    })
  }

  const fitPreview = (): void => {
    setFit(true)
    window.requestAnimationFrame(() => stageRef.current?.scrollTo({ left: 0, top: 0 }))
  }

  const onWheel = (event: WheelEvent<HTMLElement>): void => {
    event.preventDefault()
    applyZoom(renderedZoom * Math.exp(-event.deltaY * 0.0015), {
      clientX: event.clientX,
      clientY: event.clientY,
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      applyZoom(stepMediaPreviewZoom(renderedZoom, 1))
    } else if (event.key === '-') {
      event.preventDefault()
      applyZoom(stepMediaPreviewZoom(renderedZoom, -1))
    } else if (event.key === '0') {
      event.preventDefault()
      applyZoom(1)
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault()
      fitPreview()
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>): void => {
    if (fit || event.button !== 0) return
    panGesture.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPanning(true)
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>): void => {
    const gesture = panGesture.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    event.currentTarget.scrollLeft = gesture.scrollLeft - (event.clientX - gesture.clientX)
    event.currentTarget.scrollTop = gesture.scrollTop - (event.clientY - gesture.clientY)
  }

  const endPan = (event: PointerEvent<HTMLElement>): void => {
    if (panGesture.current?.pointerId !== event.pointerId) return
    panGesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    setPanning(false)
  }

  return (
    <div className="image-workspace-preview">
      <div className="image-preview-toolbar">
        <span className="image-preview-size">
          {size ? `${size.width} × ${size.height}` : '读取图片…'}
        </span>
        <span className="spacer" />
        <DsZoomToolbar
          label="图片预览缩放"
          value={clampMediaPreviewZoom(renderedZoom)}
          fitted={fit}
          min={MEDIA_PREVIEW_MIN_ZOOM}
          max={MEDIA_PREVIEW_MAX_ZOOM}
          onChange={applyZoom}
          onStep={(direction) => applyZoom(stepMediaPreviewZoom(renderedZoom, direction))}
          onFit={fitPreview}
          onActualSize={() => applyZoom(1)}
        />
      </div>
      <section
        ref={stageRef}
        className={`image-preview-stage${fit ? ' fit' : ' zoomed'}${panning ? ' panning' : ''}`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: This named scroll/zoom region already supports F/0 and pointer navigation; keyboard users must be able to focus it.
        tabIndex={0}
        aria-label="图片预览；滚轮缩放，放大后拖拽平移，按 F 适合窗口，按 0 恢复原始大小"
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div
          className="image-preview-surface"
          style={
            size
              ? {
                  width: `max(100%, ${size.width * renderedZoom + 48}px)`,
                  height: `max(100%, ${size.height * renderedZoom + 48}px)`,
                }
              : undefined
          }
        >
          <canvas
            ref={canvasRef}
            className={!size || error ? 'hidden' : undefined}
            style={
              size
                ? {
                    width: `${size.width * renderedZoom}px`,
                    height: `${size.height * renderedZoom}px`,
                  }
                : undefined
            }
          />
        </div>
        {error ? <div className="cf-err image-preview-error">{error}</div> : null}
      </section>
    </div>
  )
}

function useBufferUrl(bytes: ArrayBuffer | undefined): string {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!bytes) {
      setUrl('')
      return () => undefined
    }
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [bytes])
  return url
}

interface PendingBattleImport {
  id: AssetId
  prepared: PreparedImageImport
  previousBytes?: ArrayBuffer
}

function BattleImportReview(props: {
  pending: PendingBattleImport
  onConfirm(): void
  onCancel(): void
}) {
  const sourceUrl = useBufferUrl(props.pending.prepared.sourceBytes)
  const effectUrl = useBufferUrl(props.pending.prepared.effectPreviewBytes)
  return (
    <section className="image-import-review" aria-labelledby="battle-import-review-title">
      <div className="image-import-review-head">
        <strong id="battle-import-review-title">确认项目色彩适配</strong>
        <span>保存的是右侧效果；运行时仍保留召唤换色能力。</span>
      </div>
      <div className="image-import-compare">
        <figure>
          {sourceUrl ? <img src={sourceUrl} alt="上传原图" /> : null}
          <figcaption>上传原图</figcaption>
        </figure>
        <figure>
          {effectUrl ? <img src={effectUrl} alt="项目内效果" /> : null}
          <figcaption>项目内效果</figcaption>
        </figure>
      </div>
      <div className="image-import-review-actions">
        <DsButton variant="secondary" onClick={props.onCancel}>
          取消
        </DsButton>
        <DsButton variant="primary" onClick={props.onConfirm}>
          使用适配结果
        </DsButton>
      </div>
    </section>
  )
}

export function ImageTab(props: {
  assetBase: AssetBase
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  session: EditSession
  tabBar?: React.ReactNode
  focusObjectId?: AssetId
  onObjectFocus?: (id: string | undefined) => void
  assetDiagnostics: readonly EditorAssetDiagnostic[]
  referenceIndex?: ProjectReferenceIndex
  referenceStatus: EditorDerivedStatus
  getCurrentReferenceIndex: CurrentProjectReferenceIndexProvider
  onOpenReference?: (reference: ProjectReferenceEdge) => void
}) {
  const {
    assetBase,
    catalog,
    reader,
    session,
    tabBar,
    focusObjectId,
    onObjectFocus,
    assetDiagnostics,
    referenceIndex,
    referenceStatus,
    getCurrentReferenceIndex,
    onOpenReference,
  } = props
  const effectiveReferenceStatus =
    referenceStatus === 'current' && !referenceIndex ? 'failed' : referenceStatus
  const referenceScanError =
    effectiveReferenceStatus === 'current'
      ? undefined
      : effectiveReferenceStatus === 'failed'
        ? '派生引用检查失败'
        : effectiveReferenceStatus === 'stale'
          ? '引用正在刷新，当前仅保留上一版结果'
          : '引用正在检查'
  const focusedReference = focusObjectId
    ? referenceIndex
        ?.referencesTo({ kind: 'asset', id: focusObjectId })
        .find((reference) => reference.relation.kind === 'asset-use')
    : undefined
  const focusedReferenceKind =
    focusedReference?.relation.kind === 'asset-use'
      ? focusedReference.relation.expectedKind
      : undefined
  const focusedKind = focusObjectId
    ? ((catalog.assets[focusObjectId]?.kind ?? focusedReferenceKind) as StaticImageKind | undefined)
    : undefined
  const [kind, setKind] = useState<StaticImageKind>(
    focusedKind && STATIC_IMAGE_KINDS.includes(focusedKind) ? focusedKind : 'portrait',
  )
  const [filter, setFilter] = useState('')
  const [inspectorTab, setInspectorTab] = useState<ImageInspectorTab>('resource')
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<AssetId | null>(focusObjectId ?? null)
  const [deleteTargetId, setDeleteTargetId] = useState<AssetId | undefined>()
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [pendingBattle, setPendingBattle] = useState<PendingBattleImport | undefined>()
  const [battlePaletteColors, setBattlePaletteColors] = useState<
    readonly (readonly [number, number, number])[] | undefined
  >()
  const importInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const replaceTargetRef = useRef<AssetId | undefined>(undefined)
  const entries = useMemo(() => imageAssets(catalog, kind), [catalog, kind])
  const shown = entries.filter(
    (entry) =>
      !filter ||
      entry.id.toLowerCase().includes(filter.toLowerCase()) ||
      (entry.record.label ?? '').toLowerCase().includes(filter.toLowerCase()),
  )
  const missingFocusedId =
    focusObjectId && selectedId === focusObjectId && !catalog.assets[focusObjectId]
      ? focusObjectId
      : undefined
  const selected =
    entries.find((entry) => entry.id === selectedId) ??
    (missingFocusedId ? undefined : (shown[0] ?? entries[0]))
  const references = useMemo(() => {
    const result = new Map<AssetId, ProjectReferenceEdge[]>()
    if (!referenceIndex) return result
    for (const entry of entries)
      result.set(entry.id, referenceIndex.referencesTo({ kind: 'asset', id: entry.id }))
    return result
  }, [entries, referenceIndex])
  const closureIssues = assetDiagnostics

  useEffect(() => {
    if (!focusObjectId) return
    const record = catalog.assets[focusObjectId]
    const targetKind = record?.kind ?? focusedReferenceKind
    if (targetKind && STATIC_IMAGE_KINDS.includes(targetKind as StaticImageKind))
      setKind(targetKind as StaticImageKind)
    setSelectedId(focusObjectId)
  }, [catalog, focusObjectId, focusedReferenceKind])
  useEffect(() => {
    if (
      !selectedId ||
      (!entries.some((entry) => entry.id === selectedId) && selectedId !== missingFocusedId)
    )
      setSelectedId(entries[0]?.id ?? null)
  }, [entries, missingFocusedId, selectedId])
  useEffect(() => {
    let alive = true
    setBattlePaletteColors(undefined)
    if (kind !== 'battle-background') return () => undefined
    void loadStandardPalette(assetBase).then(
      (palette) => {
        if (alive) setBattlePaletteColors(palette.colors)
      },
      (cause: unknown) => {
        if (alive)
          setError(
            `无法读取项目标准色彩：${cause instanceof Error ? cause.message : String(cause)}`,
          )
      },
    )
    return () => {
      alive = false
    }
  }, [assetBase, kind])

  const commitImport = (pending: PendingBattleImport): void => {
    session.dispatch(
      new UpsertAssetCommand(
        pending.id,
        pending.prepared.record,
        pending.prepared.bytes,
        pending.previousBytes,
      ),
    )
    setSelectedId(pending.id)
    onObjectFocus?.(pending.id)
    setPendingBattle(undefined)
  }

  const importFile = async (file: File, targetId?: AssetId): Promise<void> => {
    try {
      setError('')
      const previous = targetId ? catalog.assets[targetId] : undefined
      if (previous && previous.kind !== kind)
        throw new Error(`不能用 ${kind} 替换 ${previous.kind} 资源`)
      const previousBytes = targetId ? await reader.readBytes(targetId, kind) : undefined
      const palette =
        kind === 'battle-background' ? await loadStandardPalette(assetBase) : undefined
      const prepared = await prepareAuthoredImage(file, kind, palette?.colors, previous?.label)
      const id = targetId ?? nextAuthoredImageId(catalog, kind, prepared.hash)
      const pending = { id, prepared, previousBytes }
      if (kind === 'battle-background') setPendingBattle(pending)
      else commitImport(pending)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const selectedReferences = selected ? (references.get(selected.id) ?? []) : []
  const selectedReferenceCount = selectedReferences.length
  const selectedIssues = selected
    ? closureIssues.filter((issue) => issue.assetId === selected.id)
    : []

  const deleteTarget = deleteTargetId
    ? entries.find((entry) => entry.id === deleteTargetId)
    : undefined
  const deleteSelectedImage = async (): Promise<void> => {
    if (!deleteTarget) return
    const targetId = deleteTarget.id
    const targetKind = deleteTarget.record.kind as StaticImageKind
    setDeleteBusy(true)
    try {
      const previousBytes = await reader.readBytes(targetId, targetKind)
      const targetIndex = entries.findIndex((entry) => entry.id === targetId)
      const remaining = entries.filter((entry) => entry.id !== targetId)
      const next = remaining[Math.min(targetIndex, remaining.length - 1)]
      session.dispatch(new DeleteAssetCommand(targetId, getCurrentReferenceIndex, previousBytes))
      setSelectedId(next?.id ?? null)
      onObjectFocus?.(next?.id)
      setDeleteTargetId(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <>
      <div className="outliner outliner--split data-outliner image-library-outliner">
        {tabBar}
        <DsCatalogControls
          title="图像"
          count={shown.length}
          unit="项"
          actions={[
            {
              id: 'import-image',
              label: '导入 PNG',
              icon: 'add',
              onClick: () => importInputRef.current?.click(),
            },
          ]}
          scope={
            <DsTabs
              size="compact"
              label="图像类型"
              items={STATIC_IMAGE_KINDS.map((value) => ({ id: value, label: KIND_LABEL[value] }))}
              activeId={kind}
              onChange={(value) => {
                setKind(value as StaticImageKind)
                setSelectedId(null)
              }}
            />
          }
          search={{
            'aria-label': '搜索图像',
            placeholder: '搜索名称或 AssetId',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
        />
        {error ? <div className="cf-err">{error}</div> : null}
        <DsFileInput
          ref={importInputRef}
          accept=".png,image/png"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
            event.target.value = ''
          }}
        />
        <DsFileInput
          ref={replaceInputRef}
          accept=".png,image/png"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            const targetId = replaceTargetRef.current
            replaceTargetRef.current = undefined
            if (file && targetId) void importFile(file, targetId)
            event.target.value = ''
          }}
        />
        <div className="image-asset-list">
          {shown.map((entry) => (
            <DsCatalogRow
              key={entry.id}
              selected={selected?.id === entry.id}
              leading={
                <ImageAssetThumbnail
                  asset={entry.id}
                  kind={kind}
                  reader={reader}
                  revision={entry.record.sha256}
                  paletteColors={battlePaletteColors}
                />
              }
              title={editorAssetCatalogTitle(entry.record)}
              meta={entry.id}
              onClick={() => {
                setSelectedId(entry.id)
                onObjectFocus?.(entry.id)
              }}
            />
          ))}
          {!shown.length ? (
            <div className="insp-empty">
              {entries.length ? '没有匹配的图片。' : `此项目还没有${KIND_LABEL[kind]}。`}
            </div>
          ) : null}
        </div>
      </div>
      <div className="canvas-wrap data-body image-workspace">
        {pendingBattle ? (
          <BattleImportReview
            pending={pendingBattle}
            onCancel={() => setPendingBattle(undefined)}
            onConfirm={() => commitImport(pendingBattle)}
          />
        ) : missingFocusedId ? (
          <div className="cf-err image-missing-target">
            引用目标 AssetId“{missingFocusedId}”不在项目 catalog；已停留在该问题，不会跳到其他图片。
          </div>
        ) : selected ? (
          <>
            <DsObjectHero
              className="media-asset-hero"
              eyebrow={KIND_LABEL[kind]}
              title={selected.record.label || '未命名'}
              objectId={selected.id}
              meta={
                <>
                  <DsTag tone="neutral">{KIND_LABEL[kind]}</DsTag>
                  <DsTag tone="neutral">{ORIGIN_LABEL[selected.record.origin.kind]}</DsTag>
                </>
              }
              actions={
                <>
                  <DsButton
                    size="compact"
                    variant="secondary"
                    icon="upload"
                    onClick={() => {
                      replaceTargetRef.current = selected.id
                      replaceInputRef.current?.click()
                    }}
                  >
                    替换
                  </DsButton>
                  <DsButton
                    size="compact"
                    variant="danger"
                    icon="delete"
                    title={
                      referenceScanError
                        ? '查看删除阻断原因'
                        : selectedReferenceCount
                          ? `查看 ${selectedReferenceCount} 处阻断引用`
                          : '删除当前图片'
                    }
                    onClick={() => setDeleteTargetId(selected.id)}
                  >
                    删除
                  </DsButton>
                </>
              }
            />
            <ImageWorkspacePreview
              key={`${selected.id}:${selected.record.sha256}`}
              assetId={selected.id}
              kind={kind}
              reader={reader}
              assetBase={assetBase}
            />
          </>
        ) : (
          <div className="insp-empty">导入或选择一张{KIND_LABEL[kind]}。</div>
        )}
      </div>
      <DsInspectorHost className="inspector inspector--tabbed music-inspector image-inspector">
        {missingFocusedId ? (
          <div className="section">
            <h4>缺失资源</h4>
            <code>{missingFocusedId}</code>
            <p className="project-copy">
              这是诊断定位到的具体引用目标。请修正引用，或用同一个 AssetId 恢复资源记录。
            </p>
          </div>
        ) : selected ? (
          <DsInspectorTabs
            id="image-inspector"
            label="图片检查器"
            activeId={inspectorTab}
            onChange={(id) => setInspectorTab(id as ImageInspectorTab)}
            items={[
              {
                id: 'resource',
                label: '属性',
                panel: (
                  <DsInspectorSection title="基本信息">
                    <MediaAssetNameField
                      assetId={selected.id}
                      label={selected.record.label}
                      session={session}
                    />
                    <DsPropertyGrid>
                      <DsPropertyRow label="AssetId">
                        <code>{selected.id}</code>
                      </DsPropertyRow>
                      <DsPropertyRow label="文件">
                        <code>{selected.record.path}</code>
                      </DsPropertyRow>
                      <DsPropertyRow label="来源">
                        {ORIGIN_LABEL[selected.record.origin.kind]}
                      </DsPropertyRow>
                      <DsPropertyRow label="大小">
                        {formatBytes(selected.record.bytes)}
                      </DsPropertyRow>
                    </DsPropertyGrid>
                  </DsInspectorSection>
                ),
              },
              {
                id: 'references',
                label: '引用',
                count: selectedReferenceCount,
                panel: (
                  <DsInspectorSection title="引用" className="asset-reference-section">
                    <DsReferencePanel
                      state={
                        referenceScanError ? 'error' : selectedReferenceCount ? 'ready' : 'empty'
                      }
                      count={
                        referenceScanError
                          ? { kind: 'unknown' }
                          : { kind: 'exact', value: selectedReferenceCount }
                      }
                      impact={{
                        kind: 'blocking',
                        description: referenceScanError
                          ? `引用扫描失败：${referenceScanError}。为防止误删，删除已关闭。`
                          : selectedReferenceCount
                            ? '替换图片会保留这些引用；解除全部引用后才能删除。'
                            : '当前项目没有引用这张图片。',
                      }}
                    >
                      {selectedReferences.length ? (
                        <DsReferenceList>
                          {selectedReferences.map((reference) => (
                            <DsReferenceRow
                              key={reference.id}
                              title={reference.source.label}
                              path={reference.where}
                              action={
                                reference.locator.kind !== 'unavailable' && onOpenReference
                                  ? {
                                      label: '打开',
                                      ariaLabel: `打开引用：${reference.source.label}`,
                                      onActivate: () => onOpenReference(reference),
                                    }
                                  : undefined
                              }
                              status={
                                reference.locator.kind !== 'unavailable' && onOpenReference
                                  ? undefined
                                  : {
                                      label: '只读',
                                      reason:
                                        reference.locator.kind === 'unavailable'
                                          ? reference.locator.reason
                                          : '当前引用没有可编辑的精确位置。',
                                    }
                              }
                            />
                          ))}
                        </DsReferenceList>
                      ) : null}
                    </DsReferencePanel>
                  </DsInspectorSection>
                ),
              },
              {
                id: 'diagnostics',
                label: '诊断',
                count: referenceScanError ? 1 : selectedIssues.length,
                panel: (
                  <DsInspectorSection title="诊断">
                    <DsDiagnosticPanel
                      state={
                        referenceScanError ? 'failure' : selectedIssues.length ? 'ready' : 'clear'
                      }
                      count={
                        referenceScanError
                          ? { kind: 'unknown' }
                          : {
                              kind: 'exact',
                              errors: selectedIssues.filter((issue) => issue.severity === 'error')
                                .length,
                              warnings: selectedIssues.filter((issue) => issue.severity === 'warn')
                                .length,
                            }
                      }
                      summary={
                        referenceScanError
                          ? '资源引用检查失败'
                          : selectedIssues.length
                            ? undefined
                            : '资源类型与引用闭包正常'
                      }
                      description={referenceScanError}
                    >
                      {!referenceScanError && selectedIssues.length ? (
                        <DsDiagnosticList>
                          {selectedIssues.map((issue) => (
                            <DsDiagnosticRow
                              key={`${issue.code}:${issue.where}`}
                              severity={issue.severity === 'error' ? 'error' : 'warning'}
                              title={issue.title}
                              statusLabel="仅提示"
                            />
                          ))}
                        </DsDiagnosticList>
                      ) : null}
                    </DsDiagnosticPanel>
                  </DsInspectorSection>
                ),
              },
            ]}
          />
        ) : (
          <div className="insp-empty">选择一张图片查看资源与引用。</div>
        )}
      </DsInspectorHost>
      <MediaAssetConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除图片"
        objectLabel={deleteTarget ? deleteTarget.record.label || deleteTarget.id : ''}
        impact="移除资源记录和项目内文件；可通过全局撤销恢复。"
        referenceCount={
          referenceScanError
            ? 'unknown'
            : deleteTarget
              ? (references.get(deleteTarget.id)?.length ?? 0)
              : 0
        }
        confirmLabel="删除图片"
        confirmVariant="danger"
        busy={deleteBusy}
        confirmDisabled={
          Boolean(referenceScanError) ||
          Boolean(deleteTarget && references.get(deleteTarget.id)?.length)
        }
        onClose={() => setDeleteTargetId(undefined)}
        onConfirm={() => void deleteSelectedImage()}
      />
    </>
  )
}
