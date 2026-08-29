/** A7-3 过场资源工作台：项目内视频与完整帧动画的 CRUD、预览、编辑、引用和诊断。 */
import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  type AssetReference,
  type AssetReferenceSite,
  FRAME_SEQUENCE_MEDIA_TYPE,
  groupAssetReferencesBySite,
} from '@type-pal/content'
import { type AssetBase, loadStandardPalette } from '@type-pal/reforge'
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DeleteAssetCommand, UpsertAssetCommand } from '../core/commands.js'
import {
  editorAssetCatalogTitle,
  type EditorAssetDiagnostic,
} from '../core/asset-diagnostics.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { tryCollectEditorAssetReferenceSnapshot } from '../core/editor-asset-references.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { FrameAnimationEncodeFrame } from '../core/frame-animation-codec.js'
import type { FrameQuantization } from '../core/frame-animation-draft.js'
import { decodeFrameImages, sortFrameImageFiles } from '../core/frame-animation-images.js'
import {
  encodeFrameAnimationInWorker,
  quantizeFrameAnimationInWorker,
} from '../core/frame-animation-worker-client.js'
import type { ScriptEditorState } from '../core/script-editor.js'
import { mp4HasAudioTrack } from '../core/video-metadata.js'
import {
  DsButton,
  DsCatalogControls,
  DsCatalogGroupEmpty,
  DsCatalogGroupHeader,
  DsCatalogGroupList,
  DsCatalogRow,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsFileInput,
  DsFieldGroup,
  DsIconButton,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsNumberField,
  DsObjectHero,
  DsPropertyGrid,
  DsPropertyRow,
  DsReorderCollection,
  DsReorderItem,
  DsReorderMoveButton,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelectField,
  DsTag,
  reorderDsItems,
  type DsReorderIntent,
  useDsReorderKeys,
} from './design-system/index.js'
import { FrameAnimationEditor, type FrameAnimationMetadata } from './FrameAnimationEditor.js'
import { MediaAssetConfirmDialog, MediaAssetNameField } from './MediaAssetLifecycle.js'

interface AssetEntry {
  id: AssetId
  record: AssetRecordV1
}

interface VideoMetadata {
  width: number
  height: number
  duration: number
  audio: 'yes' | 'no' | 'unknown'
}

interface PendingFrameImport {
  files: File[]
  replaceId?: AssetId
}

type CutsceneInspectorTab = 'resource' | 'references' | 'diagnostics'

type CutsceneLifecycleRequest =
  | {
      kind: 'discard'
      objectLabel: string
      nextActionLabel: string
      action: () => void
      onCancel?: () => void
    }
  | {
      kind: 'delete'
      targetId: AssetId
      objectLabel: string
    }

const ORIGIN_LABELS: Readonly<Record<AssetRecordV1['origin']['kind'], string>> = {
  'legacy-migrated': '原版迁移',
  authored: '项目创作',
  generated: '生成资源',
  licensed: '授权资源',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '未知'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds - minutes * 60
  return minutes ? `${minutes}:${rest.toFixed(1).padStart(4, '0')}` : `${rest.toFixed(2)} 秒`
}

function sourceArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function entriesOf(catalog: AssetCatalogV1, kind: 'video' | 'frame-animation'): AssetEntry[] {
  return Object.entries(catalog.assets)
    .filter(([, record]) => record.kind === kind)
    .map(([id, record]) => ({ id, record }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const source = bytes instanceof Uint8Array ? new Uint8Array(bytes).buffer : bytes.slice(0)
  const digest = await crypto.subtle.digest('SHA-256', source)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function nextAssetId(
  catalog: AssetCatalogV1,
  kind: 'video' | 'frame-animation',
  hash: string,
): AssetId {
  const base = `${kind}.authored.${hash.slice(0, 16)}`
  if (!catalog.assets[base]) return base
  for (let suffix = 2; ; suffix++) {
    const id = `${base}-${suffix}`
    if (!catalog.assets[id]) return id
  }
}

function videoExtension(
  file: File,
  bytes: Uint8Array,
): { extension: 'mp4' | 'webm'; mediaType: string } {
  const lower = file.name.toLowerCase()
  const mp4 =
    (lower.endsWith('.mp4') || file.type === 'video/mp4') &&
    String.fromCharCode(...bytes.subarray(4, 8)) === 'ftyp'
  const webm =
    (lower.endsWith('.webm') || file.type === 'video/webm') &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  if (mp4) return { extension: 'mp4', mediaType: 'video/mp4' }
  if (webm) return { extension: 'webm', mediaType: 'video/webm' }
  throw new Error(`${file.name}: 只支持有效的 MP4 或 WebM`)
}

function AssetList(props: {
  title: string
  entries: readonly AssetEntry[]
  selectedId?: AssetId
  filter: string
  onSelect(id: AssetId): void
  onImport(): void
}) {
  const shown = props.entries.filter(
    (entry) =>
      !props.filter ||
      entry.id.toLowerCase().includes(props.filter.toLowerCase()) ||
      (entry.record.label ?? '').toLowerCase().includes(props.filter.toLowerCase()),
  )
  return (
    <section className="cutscene-library-section">
      <DsCatalogGroupHeader
        title={props.title}
        count={shown.length}
        actions={
          <DsIconButton
            label={`导入${props.title}`}
            icon="add"
            variant="secondary"
            size="compact"
            onClick={props.onImport}
          />
        }
      />
      <div className="cutscene-asset-list">
        {shown.length ? (
          shown.map((entry) => (
            <DsCatalogRow
              key={entry.id}
              selected={props.selectedId === entry.id}
              title={editorAssetCatalogTitle(entry.record)}
              meta={entry.id}
              trailing={<DsTag tone="neutral">{ORIGIN_LABELS[entry.record.origin.kind]}</DsTag>}
              onClick={() => props.onSelect(entry.id)}
            />
          ))
        ) : (
          <DsCatalogGroupEmpty>
            {props.entries.length ? `没有匹配的${props.title}。` : `此项目还没有${props.title}。`}
          </DsCatalogGroupEmpty>
        )}
      </div>
    </section>
  )
}

function EmbeddedVideo(props: {
  asset: AssetEntry
  reader: EditorAssetReader
  onMetadata(metadata?: VideoMetadata): void
}) {
  const { asset, reader, onMetadata } = props
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [containerAudio, setContainerAudio] = useState<'yes' | 'no' | 'unknown'>('unknown')
  useEffect(() => {
    let alive = true
    let objectUrl = ''
    setUrl('')
    setError('')
    setContainerAudio('unknown')
    onMetadata(undefined)
    void reader.readBytes(asset.id, 'video').then(
      (bytes) => {
        if (!alive) return
        const parsedAudio = mp4HasAudioTrack(new Uint8Array(bytes))
        setContainerAudio(parsedAudio === true ? 'yes' : parsedAudio === false ? 'no' : 'unknown')
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: asset.record.mediaType }))
        setUrl(objectUrl)
      },
      (cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      },
    )
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [asset.id, asset.record.mediaType, onMetadata, reader])

  return (
    <div className="cutscene-video-workspace">
      <div className="cutscene-video-stage">
        {url ? (
          // biome-ignore lint/a11y/useMediaCaption: 这是作者素材原样预览，字幕由剧情脚本而非视频资产承载。
          <video
            key={url}
            src={url}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              const element = event.currentTarget as HTMLVideoElement & {
                audioTracks?: { length: number }
                mozHasAudio?: boolean
                webkitAudioDecodedByteCount?: number
              }
              const audio = element.audioTracks
                ? element.audioTracks.length > 0
                  ? 'yes'
                  : 'no'
                : element.mozHasAudio || (element.webkitAudioDecodedByteCount ?? 0) > 0
                  ? 'yes'
                  : containerAudio
              onMetadata({
                width: element.videoWidth,
                height: element.videoHeight,
                duration: element.duration,
                audio,
              })
            }}
          />
        ) : error ? (
          <div className="cf-err">{error}</div>
        ) : (
          <div className="insp-empty">正在读取视频…</div>
        )}
      </div>
    </div>
  )
}

const CUTSCENE_ROLE_LABELS: Readonly<Record<string, string>> = {
  'manifest.assets.roles.video.startupTrademark': '启动商标视频',
  'manifest.assets.roles.video.startupSplash': '启动开场视频',
}

function describeReference(
  reference: AssetReferenceSite,
  state: ReturnType<EditSession['getState']>,
): { kind: string; owner: string } {
  const where = reference.where
  const roleLabel = CUTSCENE_ROLE_LABELS[where]
  if (roleLabel) return { kind: roleLabel, owner: '项目清单' }
  const entryPoint = /^entryPoints\[(\d+)]\.introVideo$/.exec(where)
  if (entryPoint)
    return {
      kind: '入口剧情视频',
      owner: `入口点 ${state.manifest.entryPoints[Number(entryPoint[1])]?.id ?? `#${entryPoint[1]}`}`,
    }
  const commandKind = reference.expectedKind === 'video' ? '播放视频' : '播放帧动画'
  const scene = /^scenes\[(\d+)](.*)$/.exec(where)
  if (scene)
    return {
      kind: commandKind,
      owner: `场景 ${state.scenes[Number(scene[1])]?.id ?? `#${scene[1]}`}`,
    }
  const chunk = /^scriptChunks\[(?:"([^"]+)"|(\d+))]\.scripts\[(?:"([^"]+)"|(\d+))]/.exec(where)
  if (chunk) {
    const chunkId = chunk[1] ?? chunk[2] ?? '#?'
    const scriptId = chunk[3] ?? chunk[4] ?? '#?'
    return {
      kind: commandKind,
      owner: `脚本 ${scriptId}（${chunkId}）`,
    }
  }
  const enemy = /^enemies\[(\d+)](.*)$/.exec(where)
  if (enemy)
    return {
      kind: commandKind,
      owner: `敌人 ${state.enemies?.[Number(enemy[1])]?.id ?? `#${enemy[1]}`}`,
    }
  return { kind: '过场引用', owner: where }
}

export function CutsceneTab(props: {
  assetBase: AssetBase
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  session: EditSession
  tabBar?: ReactNode
  focusObjectId?: AssetId
  onObjectFocus?: (id: string | undefined) => void
  currentAuthor?: ScriptEditorState
  getCurrentAuthor?: () => ScriptEditorState | undefined
  assetReferences?: readonly AssetReference[]
  assetDiagnostics: readonly EditorAssetDiagnostic[]
  assetReferenceStatus?: EditorDerivedStatus
  assetReferenceMessage?: string
}) {
  const {
    assetBase,
    catalog,
    reader,
    session,
    tabBar,
    focusObjectId,
    onObjectFocus,
    currentAuthor,
    getCurrentAuthor,
    assetReferences = [],
    assetDiagnostics,
    assetReferenceStatus = 'checking',
    assetReferenceMessage,
  } = props
  const videos = useMemo(() => entriesOf(catalog, 'video'), [catalog])
  const animations = useMemo(() => entriesOf(catalog, 'frame-animation'), [catalog])
  const [selectedId, setSelectedId] = useState<AssetId | undefined>(
    focusObjectId &&
      (catalog.assets[focusObjectId]?.kind === 'video' ||
        catalog.assets[focusObjectId]?.kind === 'frame-animation')
      ? focusObjectId
      : (videos[0]?.id ?? animations[0]?.id),
  )
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [inspectorTab, setInspectorTab] = useState<CutsceneInspectorTab>('resource')
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata>()
  const [frameMetadata, setFrameMetadata] = useState<FrameAnimationMetadata>()
  const [frameEditorDirty, setFrameEditorDirty] = useState(false)
  const [lifecycleRequest, setLifecycleRequest] = useState<CutsceneLifecycleRequest>()
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [pendingFrames, setPendingFrames] = useState<PendingFrameImport>()
  const pendingFrameReorderKeys = useDsReorderKeys(pendingFrames?.files ?? [])
  const [importTreatment, setImportTreatment] = useState<'preserve' | 'project-standard'>(
    'preserve',
  )
  const [importQuantization, setImportQuantization] = useState<FrameQuantization>('nearest')
  const [importFps, setImportFps] = useState(25)
  const videoImportRef = useRef<HTMLInputElement>(null)
  const videoReplaceRef = useRef<HTMLInputElement>(null)
  const frameImportRef = useRef<HTMLInputElement>(null)
  const frameReplaceRef = useRef<HTMLInputElement>(null)
  const videoReplaceTargetRef = useRef<AssetId | undefined>(undefined)
  const frameReplaceTargetRef = useRef<AssetId | undefined>(undefined)

  const allEntries = useMemo(() => [...videos, ...animations], [videos, animations])
  const selected = allEntries.find((entry) => entry.id === selectedId)
  const performSelect = useCallback(
    (nextId: AssetId) => {
      setSelectedId(nextId)
      setFrameEditorDirty(false)
      onObjectFocus?.(nextId)
    },
    [onObjectFocus],
  )
  const requestTransition = useCallback(
    (nextActionLabel: string, action: () => void, onCancel?: () => void): boolean => {
      if (!frameEditorDirty) {
        action()
        return true
      }
      setLifecycleRequest({
        kind: 'discard',
        objectLabel: selected?.record.label || selected?.id || '当前帧动画',
        nextActionLabel,
        action,
        ...(onCancel ? { onCancel } : {}),
      })
      return false
    },
    [frameEditorDirty, selected],
  )
  const selectAsset = useCallback(
    (nextId: AssetId): boolean => {
      if (nextId === selectedId) return true
      const next = allEntries.find((entry) => entry.id === nextId)
      return requestTransition(next?.record.label || nextId, () => performSelect(nextId))
    },
    [allEntries, performSelect, requestTransition, selectedId],
  )
  useEffect(() => {
    if (!focusObjectId || !allEntries.some((entry) => entry.id === focusObjectId)) return
    if (focusObjectId === selectedId) return
    if (lifecycleRequest) return
    const next = allEntries.find((entry) => entry.id === focusObjectId)
    requestTransition(
      next?.record.label || focusObjectId,
      () => performSelect(focusObjectId),
      () => onObjectFocus?.(selectedId),
    )
  }, [
    allEntries,
    focusObjectId,
    lifecycleRequest,
    onObjectFocus,
    performSelect,
    requestTransition,
    selectedId,
  ])
  useEffect(() => {
    if (!selected && allEntries[0]) setSelectedId(allEntries[0].id)
  }, [allEntries, selected])

  const state = session.getState()
  const allReferences = assetReferences
  const referenceScanError =
    assetReferenceStatus === 'current'
      ? undefined
      : assetReferenceStatus === 'failed'
        ? (assetReferenceMessage ?? '派生引用检查失败')
        : assetReferenceStatus === 'stale'
          ? '引用正在刷新，当前仅保留上一版结果'
          : '引用正在检查'
  const references = useMemo(() => {
    const result = new Map<AssetId, AssetReferenceSite[]>()
    for (const reference of groupAssetReferencesBySite(allReferences)) {
      const list = result.get(reference.asset) ?? []
      list.push(reference)
      result.set(reference.asset, list)
    }
    return result
  }, [allReferences])
  const closureIssues = assetDiagnostics
  const selectedReferences = selected ? (references.get(selected.id) ?? []) : []
  const selectedReferenceCount = selectedReferences.reduce(
    (total, reference) => total + reference.occurrences,
    0,
  )
  const selectedIssues = selected
    ? closureIssues.filter((issue) => issue.assetId === selected.id)
    : []

  const onFrameMetadata = useCallback((metadata?: FrameAnimationMetadata) => {
    setFrameMetadata(metadata)
  }, [])
  const onVideoMetadata = useCallback((metadata?: VideoMetadata) => {
    setVideoMetadata(metadata)
  }, [])

  const importVideo = async (file: File, replaceId?: AssetId): Promise<void> => {
    try {
      setBusy('正在导入视频…')
      setError('')
      const bytes = await file.arrayBuffer()
      const type = videoExtension(file, new Uint8Array(bytes))
      const hash = await sha256Hex(bytes)
      const previous = replaceId ? catalog.assets[replaceId] : undefined
      const previousBytes = replaceId ? await reader.readBytes(replaceId, 'video') : undefined
      const id = replaceId ?? nextAssetId(catalog, 'video', hash)
      const record: AssetRecordV1 = {
        kind: 'video',
        path: `assets/authored/video/${hash}.${type.extension}`,
        mediaType: type.mediaType,
        bytes: bytes.byteLength,
        sha256: hash,
        label: previous?.label || file.name.replace(/\.(mp4|webm)$/i, ''),
        origin: { kind: 'authored', ref: file.name },
      }
      session.dispatch(new UpsertAssetCommand(id, record, bytes, previousBytes))
      setSelectedId(id)
      setFrameEditorDirty(false)
      onObjectFocus?.(id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy('')
    }
  }

  const createFrameAnimation = async (): Promise<void> => {
    if (!pendingFrames) return
    try {
      setBusy('正在读取图片序列…')
      setError('')
      const decoded = await decodeFrameImages(pendingFrames.files, { preserveOrder: true })
      let colors: readonly (readonly [number, number, number])[] | undefined
      if (importTreatment === 'project-standard') {
        setBusy('正在贴合项目标准色彩…')
        colors = (await loadStandardPalette(assetBase)).colors
      }
      const pixels = colors
        ? await quantizeFrameAnimationInWorker({
            width: decoded[0]!.width,
            height: decoded[0]!.height,
            colors,
            mode: importQuantization,
            frames: decoded.map((frame) => sourceArrayBuffer(frame.rgba)),
          })
        : decoded.map((frame) => frame.rgba)
      const frames: FrameAnimationEncodeFrame[] = pixels.map((rgba) => ({
        rgba: sourceArrayBuffer(rgba),
      }))
      setBusy('正在后台压缩完整帧…')
      const encoded = await encodeFrameAnimationInWorker({
        width: decoded[0]!.width,
        height: decoded[0]!.height,
        defaultFrameMs: 1000 / importFps,
        colorTreatment: importTreatment,
        frames,
      })
      const hash = await sha256Hex(encoded)
      const previous = pendingFrames.replaceId ? catalog.assets[pendingFrames.replaceId] : undefined
      const previousBytes = pendingFrames.replaceId
        ? await reader.readBytes(pendingFrames.replaceId, 'frame-animation')
        : undefined
      const id = pendingFrames.replaceId ?? nextAssetId(catalog, 'frame-animation', hash)
      const firstName = sortFrameImageFiles(pendingFrames.files)[0]?.name ?? '帧动画'
      const record: AssetRecordV1 = {
        kind: 'frame-animation',
        path: `assets/authored/frame-animation/${hash}.tpfs`,
        mediaType: FRAME_SEQUENCE_MEDIA_TYPE,
        bytes: encoded.byteLength,
        sha256: hash,
        label:
          previous?.label || firstName.replace(/[-_ ]?\d*\.(png|jpe?g|webp)$/i, '') || '帧动画',
        origin: { kind: 'authored', ref: `${pendingFrames.files.length} 张图片` },
      }
      session.dispatch(
        new UpsertAssetCommand(
          id,
          record,
          encoded.buffer.slice(
            encoded.byteOffset,
            encoded.byteOffset + encoded.byteLength,
          ) as ArrayBuffer,
          previousBytes,
        ),
      )
      setSelectedId(id)
      setFrameEditorDirty(false)
      onObjectFocus?.(id)
      setPendingFrames(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy('')
    }
  }

  const onFrameFiles = (event: ChangeEvent<HTMLInputElement>, replaceId?: AssetId): void => {
    const files = sortFrameImageFiles([...(event.target.files ?? [])])
    if (files.length) setPendingFrames({ files, ...(replaceId ? { replaceId } : {}) })
    event.target.value = ''
  }

  const reorderPendingFrames = (intent: DsReorderIntent): boolean => {
    if (!pendingFrames) return false
    const files = reorderDsItems(pendingFrames.files, intent)
    if (files === pendingFrames.files) return false
    pendingFrameReorderKeys.move(intent)
    setPendingFrames({ ...pendingFrames, files: [...files] })
    return true
  }

  const removePendingFrame = (index: number): void => {
    setPendingFrames((current) => {
      if (!current) return current
      const files = current.files.filter((_file, fileIndex) => fileIndex !== index)
      return files.length ? { ...current, files } : undefined
    })
  }

  const deleteTarget =
    lifecycleRequest?.kind === 'delete'
      ? allEntries.find((entry) => entry.id === lifecycleRequest.targetId)
      : undefined
  const deleteSelected = async (): Promise<void> => {
    if (!deleteTarget) return
    const targetId = deleteTarget.id
    const scan = (): ReturnType<typeof tryCollectEditorAssetReferenceSnapshot> =>
      tryCollectEditorAssetReferenceSnapshot(
        session.getState(),
        getCurrentAuthor?.() ?? currentAuthor,
      )
    const firstScan = scan()
    if (firstScan.status === 'error') {
      setError(`引用扫描失败，未删除：${firstScan.message}`)
      return
    }
    if (firstScan.snapshot.references.some((reference) => reference.asset === targetId)) {
      setError('资源已有引用，未删除。')
      return
    }
    setDeleteBusy(true)
    try {
      const previousBytes = await reader.readBytes(targetId, deleteTarget.record.kind)
      const finalScan = scan()
      if (finalScan.status === 'error')
        throw new Error(`引用扫描失败，未删除：${finalScan.message}`)
      if (finalScan.snapshot.references.some((reference) => reference.asset === targetId))
        throw new Error('读取资源期间新增了引用，未删除。')
      const targetIndex = allEntries.findIndex((entry) => entry.id === targetId)
      const remaining = allEntries.filter((entry) => entry.id !== targetId)
      const next = remaining[Math.min(targetIndex, remaining.length - 1)]
      session.dispatch(new DeleteAssetCommand(targetId, previousBytes))
      setFrameEditorDirty(false)
      setSelectedId(next?.id)
      onObjectFocus?.(next?.id)
      setLifecycleRequest(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <>
      <div className="outliner data-outliner cutscene-outliner">
        {tabBar}
        <DsCatalogControls
          title="过场"
          count={videos.length + animations.length}
          unit="项"
          search={{
            'aria-label': '搜索过场资源',
            placeholder: '搜索名称或 AssetId',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
        />
        <DsCatalogGroupList label="过场资源分组">
          <AssetList
            title="视频"
            entries={videos}
            filter={filter}
            selectedId={selectedId}
            onSelect={selectAsset}
            onImport={() => requestTransition('导入视频', () => videoImportRef.current?.click())}
          />
          <AssetList
            title="帧动画"
            entries={animations}
            filter={filter}
            selectedId={selectedId}
            onSelect={selectAsset}
            onImport={() => requestTransition('新建帧动画', () => frameImportRef.current?.click())}
          />
        </DsCatalogGroupList>
        {busy ? <div className="cutscene-busy">{busy}</div> : null}
        {error ? <div className="cutscene-side-error cf-err">{error}</div> : null}
        <DsFileInput
          ref={videoImportRef}
          hidden
          accept="video/mp4,video/webm"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importVideo(file)
            event.target.value = ''
          }}
        />
        <DsFileInput
          ref={frameImportRef}
          hidden
          multiple
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => onFrameFiles(event)}
        />
        <DsFileInput
          ref={videoReplaceRef}
          hidden
          accept="video/mp4,video/webm"
          onChange={(event) => {
            const file = event.target.files?.[0]
            const targetId = videoReplaceTargetRef.current
            videoReplaceTargetRef.current = undefined
            if (file && targetId) void importVideo(file, targetId)
            event.target.value = ''
          }}
        />
        <DsFileInput
          ref={frameReplaceRef}
          hidden
          multiple
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const targetId = frameReplaceTargetRef.current
            frameReplaceTargetRef.current = undefined
            onFrameFiles(event, targetId)
          }}
        />
      </div>

      <div className="canvas-wrap data-body cutscene-main">
        {selected ? (
          <DsObjectHero
            className="media-asset-hero"
            eyebrow={selected.record.kind === 'video' ? '视频资源' : '帧动画资源'}
            title={selected.record.label || '未命名'}
            objectId={selected.id}
            meta={
              <>
                <DsTag tone="neutral">{ORIGIN_LABELS[selected.record.origin.kind]}</DsTag>
                <DsTag tone="neutral">{selected.record.mediaType}</DsTag>
              </>
            }
            actions={
              <>
                <DsButton
                  size="compact"
                  variant="secondary"
                  icon="upload"
                  onClick={() =>
                    requestTransition(`替换 ${selected.record.label || selected.id}`, () => {
                      if (selected.record.kind === 'video') {
                        videoReplaceTargetRef.current = selected.id
                        videoReplaceRef.current?.click()
                      } else {
                        frameReplaceTargetRef.current = selected.id
                        frameReplaceRef.current?.click()
                      }
                    })
                  }
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
                        : '删除当前过场资源'
                  }
                  onClick={() =>
                    setLifecycleRequest({
                      kind: 'delete',
                      targetId: selected.id,
                      objectLabel: selected.record.label || selected.id,
                    })
                  }
                >
                  删除
                </DsButton>
              </>
            }
          />
        ) : null}
        {selected?.record.kind === 'video' ? (
          <div className="cutscene-workspace-content">
            <EmbeddedVideo asset={selected} reader={reader} onMetadata={onVideoMetadata} />
          </div>
        ) : selected?.record.kind === 'frame-animation' ? (
          <div className="cutscene-workspace-content">
            <FrameAnimationEditor
              asset={selected}
              reader={reader}
              assetBase={assetBase}
              session={session}
              onMetadata={onFrameMetadata}
              onDirtyChange={setFrameEditorDirty}
            />
          </div>
        ) : (
          <div className="cutscene-empty-workspace">
            <strong>还没有过场资源</strong>
            <span>从左侧导入视频，或用图片序列新建帧动画。</span>
          </div>
        )}
      </div>

      <DsInspectorHost className="inspector inspector--tabbed cutscene-inspector">
        {selected ? (
          <DsInspectorTabs
            id="cutscene-inspector"
            label="过场资源检查器"
            activeId={inspectorTab}
            onChange={(id) => setInspectorTab(id as CutsceneInspectorTab)}
            items={[
              {
                id: 'resource',
                label: '属性',
                panel: (
                  <>
                    <DsInspectorSection title="基本信息">
                      <MediaAssetNameField
                        key={selected.id}
                        assetId={selected.id}
                        label={selected.record.label}
                        session={session}
                      />
                      <DsPropertyGrid>
                        <DsPropertyRow label="AssetId">
                          <code title={selected.id}>{selected.id}</code>
                        </DsPropertyRow>
                        <DsPropertyRow label="来源">
                          {ORIGIN_LABELS[selected.record.origin.kind]}
                        </DsPropertyRow>
                        <DsPropertyRow label="文件">
                          <code title={selected.record.path}>{selected.record.path}</code>
                        </DsPropertyRow>
                        <DsPropertyRow label="格式">{selected.record.mediaType}</DsPropertyRow>
                        <DsPropertyRow label="大小">
                          {formatBytes(selected.record.bytes)}
                        </DsPropertyRow>
                      </DsPropertyGrid>
                    </DsInspectorSection>
                    <DsInspectorSection title={selected.record.kind === 'video' ? '媒体' : '动画'}>
                      <DsPropertyGrid>
                        {selected.record.kind === 'video' ? (
                          <>
                            <DsPropertyRow label="分辨率">
                              {videoMetadata
                                ? `${videoMetadata.width} × ${videoMetadata.height}`
                                : '读取中'}
                            </DsPropertyRow>
                            <DsPropertyRow label="时长">
                              {videoMetadata ? formatDuration(videoMetadata.duration) : '读取中'}
                            </DsPropertyRow>
                            <DsPropertyRow label="音轨">
                              {videoMetadata?.audio === 'yes'
                                ? '有'
                                : videoMetadata?.audio === 'no'
                                  ? '无'
                                  : '浏览器未报告'}
                            </DsPropertyRow>
                          </>
                        ) : (
                          <>
                            <DsPropertyRow label="画布">
                              {frameMetadata
                                ? `${frameMetadata.width} × ${frameMetadata.height}`
                                : '读取中'}
                            </DsPropertyRow>
                            <DsPropertyRow label="帧数">
                              {frameMetadata?.frameCount ?? '读取中'}
                            </DsPropertyRow>
                            <DsPropertyRow label="时长">
                              {frameMetadata
                                ? formatDuration(frameMetadata.durationMs / 1000)
                                : '读取中'}
                            </DsPropertyRow>
                            <DsPropertyRow label="色彩">
                              {frameMetadata?.colorTreatment === 'project-standard'
                                ? '项目标准色彩'
                                : '保留原色'}
                            </DsPropertyRow>
                          </>
                        )}
                      </DsPropertyGrid>
                    </DsInspectorSection>
                  </>
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
                            ? '替换资源会保留这些引用；解除全部引用后才能删除。'
                            : '当前项目没有引用此资源。',
                      }}
                    >
                      {selectedReferences.length ? (
                        <DsReferenceList>
                          {selectedReferences.map((reference) => {
                            const description = describeReference(reference, state)
                            return (
                              <DsReferenceRow
                                key={`${reference.site}:${reference.where}`}
                                title={description.owner}
                                path={reference.where}
                                labels={[{ label: description.kind }]}
                                occurrenceCount={reference.occurrences}
                                status={{
                                  label: '只读',
                                  reason: '过场引用暂不支持从资源页精确定位。',
                                }}
                              />
                            )
                          })}
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
                              key={`${issue.code}-${issue.where}`}
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
          <div className="insp-empty">选择一个过场资源查看属性与引用。</div>
        )}
      </DsInspectorHost>

      <MediaAssetConfirmDialog
        open={Boolean(lifecycleRequest)}
        title={lifecycleRequest?.kind === 'delete' ? '删除过场资源' : '放弃未保存修改'}
        objectLabel={lifecycleRequest?.objectLabel ?? ''}
        impact={
          lifecycleRequest?.kind === 'delete'
            ? `移除资源记录和项目内文件${frameEditorDirty ? '，并放弃当前帧动画修改' : ''}；可通过全局撤销恢复。`
            : lifecycleRequest
              ? `放弃当前帧动画修改，然后继续“${lifecycleRequest.nextActionLabel}”。`
              : ''
        }
        referenceCount={
          lifecycleRequest?.kind === 'delete' && referenceScanError
            ? 'unknown'
            : lifecycleRequest?.kind === 'delete'
              ? (references.get(lifecycleRequest.targetId) ?? []).reduce(
                  (total, reference) => total + reference.occurrences,
                  0,
                )
              : 0
        }
        confirmLabel={lifecycleRequest?.kind === 'delete' ? '删除资源' : '放弃并继续'}
        confirmVariant={lifecycleRequest?.kind === 'delete' ? 'danger' : 'primary'}
        busy={deleteBusy}
        confirmDisabled={
          lifecycleRequest?.kind === 'delete' &&
          (Boolean(referenceScanError) ||
            Boolean(references.get(lifecycleRequest.targetId)?.length))
        }
        onClose={() => {
          const request = lifecycleRequest
          setLifecycleRequest(undefined)
          if (request?.kind === 'discard') request.onCancel?.()
        }}
        onConfirm={() => {
          const request = lifecycleRequest
          if (!request) return
          if (request.kind === 'delete') {
            void deleteSelected()
            return
          }
          setLifecycleRequest(undefined)
          request.action()
        }}
      />

      {pendingFrames ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="cutscene-import-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="frame-import-title"
          >
            <div className="modal-title" id="frame-import-title">
              {pendingFrames.replaceId ? '替换帧动画' : '新建帧动画'}
            </div>
            <p>{pendingFrames.files.length} 张图片。当前清单顺序就是动画帧顺序。</p>
            <DsReorderCollection
              adoptionId="asset/cutscene-import-frames"
              scopeKey={`cutscene-import:${pendingFrames.replaceId ?? 'new'}`}
              entries={pendingFrames.files.map((file, index) => ({
                key: pendingFrameReorderKeys.keys[index]!,
                label: file.name,
              }))}
              revision={pendingFrames.files}
              onReorder={reorderPendingFrames}
            >
              <ol className="cutscene-import-files" aria-label="图片序列顺序">
                {pendingFrames.files.map((file, index) => {
                  const reorderKey = pendingFrameReorderKeys.keys[index]!
                  return (
                    <DsReorderItem
                      as="li"
                      className="cutscene-import-file"
                      contentClassName="cutscene-import-file-content"
                      itemKey={reorderKey}
                      key={reorderKey}
                    >
                      <span>{index + 1}</span>
                      <code title={file.name}>{file.name}</code>
                      <DsReorderMoveButton
                        itemKey={reorderKey}
                        direction="backward"
                        label={`上移 ${file.name}`}
                      />
                      <DsReorderMoveButton
                        itemKey={reorderKey}
                        direction="forward"
                        label={`下移 ${file.name}`}
                      />
                      <DsButton
                        title="排除此帧"
                        onClick={() => removePendingFrame(index)}
                        size="compact"
                        variant="danger"
                      >
                        ×
                      </DsButton>
                    </DsReorderItem>
                  )
                })}
              </ol>
            </DsReorderCollection>
            <DsFieldGroup>
              <DsNumberField
                id="cutscene-import-fps"
                label="默认帧率"
                min="0.1"
                step="0.1"
                value={importFps}
                onChange={(event) => setImportFps(Number(event.target.value))}
              />
              <DsSelectField
                id="cutscene-import-treatment"
                label="色彩处理"
                size="compact"
                value={importTreatment}
                options={[
                  { value: 'preserve', label: '保留原色' },
                  { value: 'project-standard', label: '贴合项目标准色彩' },
                ]}
                onValueChange={(value) =>
                  setImportTreatment(value as 'preserve' | 'project-standard')
                }
              />
              {importTreatment === 'project-standard' ? (
                <DsSelectField
                  id="cutscene-import-quantization"
                  label="转换方式"
                  size="compact"
                  value={importQuantization}
                  options={[
                    { value: 'nearest', label: '最近色' },
                    { value: 'floyd-steinberg', label: '误差扩散' },
                  ]}
                  onValueChange={(value) => setImportQuantization(value as FrameQuantization)}
                />
              ) : null}
            </DsFieldGroup>
            <div className="modal-actions">
              <DsButton
                disabled={Boolean(busy)}
                onClick={() => setPendingFrames(undefined)}
                size="compact"
                variant="secondary"
              >
                取消
              </DsButton>
              <DsButton
                disabled={
                  Boolean(busy) ||
                  pendingFrames.files.length === 0 ||
                  !Number.isFinite(importFps) ||
                  importFps <= 0
                }
                onClick={() => void createFrameAnimation()}
                size="compact"
                variant="primary"
              >
                {busy || '创建'}
              </DsButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
