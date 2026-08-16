/** A7-3 过场资源工作台：工程内视频与完整帧动画的 CRUD、预览、编辑、引用和诊断。 */
import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  type AssetReferenceSite,
  FRAME_SEQUENCE_MEDIA_TYPE,
  groupAssetReferencesBySite,
  validateAssetReferenceClosure,
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
import {
  DeleteAssetCommand,
  UpdateAssetLabelCommand,
  UpsertAssetCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectEditorAssetReferences } from '../core/editor-asset-references.js'
import type { FrameAnimationEncodeFrame } from '../core/frame-animation-codec.js'
import type { FrameQuantization } from '../core/frame-animation-draft.js'
import { decodeFrameImages, sortFrameImageFiles } from '../core/frame-animation-images.js'
import {
  encodeFrameAnimationInWorker,
  quantizeFrameAnimationInWorker,
} from '../core/frame-animation-worker-client.js'
import { mp4HasAudioTrack } from '../core/video-metadata.js'
import {
  DsCatalogControls,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsIconButton,
  DsInspectorTabs,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsTag,
} from './design-system/index.js'
import { FrameAnimationEditor, type FrameAnimationMetadata } from './FrameAnimationEditor.js'

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

const ORIGIN_LABELS: Readonly<Record<AssetRecordV1['origin']['kind'], string>> = {
  'legacy-migrated': '原版迁移',
  authored: '工程创作',
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
  kindLabel: string
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
      <div className="cutscene-library-head">
        <strong>{props.title}</strong>
        <DsTag tone="neutral" monospace>
          {shown.length} 项
        </DsTag>
        <DsIconButton
          label={`导入${props.title}`}
          icon="add"
          variant="secondary"
          size="compact"
          onClick={props.onImport}
        />
      </div>
      <div className="cutscene-asset-list">
        {shown.length ? (
          shown.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={`cutscene-asset-row${props.selectedId === entry.id ? ' selected' : ''}`}
              onClick={() => props.onSelect(entry.id)}
            >
              <span className="cutscene-kind-mark" aria-hidden="true">
                {entry.record.kind === 'video' ? '▶' : '▦'}
              </span>
              <span className="cutscene-asset-name">{entry.record.label || entry.id}</span>
              <span
                className="cutscene-origin-dot"
                title={ORIGIN_LABELS[entry.record.origin.kind]}
              />
              <small>{props.kindLabel}</small>
            </button>
          ))
        ) : (
          <div className="cutscene-list-empty">没有匹配资源</div>
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

function EditableAssetName(props: { asset: AssetEntry; session: EditSession }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      className="in"
      value={draft ?? props.asset.record.label ?? ''}
      placeholder="未命名"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== (props.asset.record.label ?? ''))
          props.session.dispatch(new UpdateAssetLabelCommand(props.asset.id, draft))
        setDraft(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
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
  if (roleLabel) return { kind: roleLabel, owner: '工程清单' }
  const entryPoint = /^entryPoints\[(\d+)]\.introVideo$/.exec(where)
  if (entryPoint)
    return {
      kind: '入口剧情视频',
      owner: `入口点 ${state.manifest.entryPoints?.[Number(entryPoint[1])]?.id ?? `#${entryPoint[1]}`}`,
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
}) {
  const { assetBase, catalog, reader, session, tabBar, focusObjectId, onObjectFocus } = props
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
  const [pendingFrames, setPendingFrames] = useState<PendingFrameImport>()
  const [importTreatment, setImportTreatment] = useState<'preserve' | 'project-standard'>(
    'preserve',
  )
  const [importQuantization, setImportQuantization] = useState<FrameQuantization>('nearest')
  const [importFps, setImportFps] = useState(25)
  const videoImportRef = useRef<HTMLInputElement>(null)
  const videoReplaceRef = useRef<HTMLInputElement>(null)
  const frameImportRef = useRef<HTMLInputElement>(null)
  const frameReplaceRef = useRef<HTMLInputElement>(null)

  const allEntries = useMemo(() => [...videos, ...animations], [videos, animations])
  const selected = allEntries.find((entry) => entry.id === selectedId)
  const confirmDiscardFrameEdits = useCallback(
    () =>
      !frameEditorDirty ||
      window.confirm('当前帧动画有未保存修改，切换资源将丢弃这些修改。是否继续？'),
    [frameEditorDirty],
  )
  const selectAsset = useCallback(
    (nextId: AssetId): boolean => {
      if (nextId === selectedId) return true
      if (!confirmDiscardFrameEdits()) return false
      setSelectedId(nextId)
      setFrameEditorDirty(false)
      onObjectFocus?.(nextId)
      return true
    },
    [confirmDiscardFrameEdits, onObjectFocus, selectedId],
  )
  useEffect(() => {
    if (!focusObjectId || !allEntries.some((entry) => entry.id === focusObjectId)) return
    if (focusObjectId === selectedId) return
    if (!confirmDiscardFrameEdits()) {
      onObjectFocus?.(selectedId)
      return
    }
    setSelectedId(focusObjectId)
    setFrameEditorDirty(false)
  }, [allEntries, confirmDiscardFrameEdits, focusObjectId, onObjectFocus, selectedId])
  useEffect(() => {
    if (!selected && allEntries[0]) setSelectedId(allEntries[0].id)
  }, [allEntries, selected])

  const state = session.getState()
  const references = useMemo(() => {
    const result = new Map<AssetId, AssetReferenceSite[]>()
    for (const reference of groupAssetReferencesBySite(collectEditorAssetReferences(state))) {
      const list = result.get(reference.asset) ?? []
      list.push(reference)
      result.set(reference.asset, list)
    }
    return result
  }, [state])
  const closureIssues = useMemo(
    () => validateAssetReferenceClosure(catalog, collectEditorAssetReferences(state)),
    [catalog, state],
  )
  const selectedReferences = selected ? (references.get(selected.id) ?? []) : []
  const selectedReferenceCount = selectedReferences.reduce(
    (total, reference) => total + reference.occurrences,
    0,
  )
  const selectedIssues = selected
    ? closureIssues.filter(
        (issue) =>
          issue.where.includes(JSON.stringify(selected.id)) ||
          issue.message.includes(`"${selected.id}"`),
      )
    : []

  const onFrameMetadata = useCallback((metadata?: FrameAnimationMetadata) => {
    setFrameMetadata(metadata)
  }, [])
  const onVideoMetadata = useCallback((metadata?: VideoMetadata) => {
    setVideoMetadata(metadata)
  }, [])

  const importVideo = async (file: File, replaceId?: AssetId): Promise<void> => {
    if (!confirmDiscardFrameEdits()) return
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
    if (!confirmDiscardFrameEdits()) return
    try {
      setBusy('正在读取图片序列…')
      setError('')
      const decoded = await decodeFrameImages(pendingFrames.files, { preserveOrder: true })
      let colors: readonly (readonly [number, number, number])[] | undefined
      if (importTreatment === 'project-standard') {
        setBusy('正在贴合工程标准色彩…')
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

  const movePendingFrame = (index: number, delta: -1 | 1): void => {
    setPendingFrames((current) => {
      if (!current) return current
      const target = index + delta
      if (target < 0 || target >= current.files.length) return current
      const files = [...current.files]
      const [file] = files.splice(index, 1)
      if (!file) return current
      files.splice(target, 0, file)
      return { ...current, files }
    })
  }

  const removePendingFrame = (index: number): void => {
    setPendingFrames((current) => {
      if (!current) return current
      const files = current.files.filter((_file, fileIndex) => fileIndex !== index)
      return files.length ? { ...current, files } : undefined
    })
  }

  const deleteSelected = async (): Promise<void> => {
    if (!selected || selectedReferences.length) return
    if (
      window.confirm(
        `删除“${selected.record.label || selected.id}”？\n这会移除资源记录和工程内文件，可通过全局撤销恢复。`,
      )
    ) {
      try {
        const previousBytes = await reader.readBytes(selected.id, selected.record.kind)
        session.dispatch(new DeleteAssetCommand(selected.id, previousBytes))
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
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
        <AssetList
          title="视频"
          kindLabel="视频"
          entries={videos}
          filter={filter}
          selectedId={selectedId}
          onSelect={selectAsset}
          onImport={() => videoImportRef.current?.click()}
        />
        <AssetList
          title="帧动画"
          kindLabel="完整帧"
          entries={animations}
          filter={filter}
          selectedId={selectedId}
          onSelect={selectAsset}
          onImport={() => frameImportRef.current?.click()}
        />
        {busy ? <div className="cutscene-busy">{busy}</div> : null}
        {error ? <div className="cutscene-side-error cf-err">{error}</div> : null}
        <input
          ref={videoImportRef}
          hidden
          type="file"
          accept="video/mp4,video/webm"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importVideo(file)
            event.target.value = ''
          }}
        />
        <input
          ref={frameImportRef}
          hidden
          multiple
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => onFrameFiles(event)}
        />
      </div>

      <div className="canvas-wrap data-body cutscene-main">
        {selected?.record.kind === 'video' ? (
          <EmbeddedVideo asset={selected} reader={reader} onMetadata={onVideoMetadata} />
        ) : selected?.record.kind === 'frame-animation' ? (
          <FrameAnimationEditor
            asset={selected}
            reader={reader}
            assetBase={assetBase}
            session={session}
            onMetadata={onFrameMetadata}
            onDirtyChange={setFrameEditorDirty}
          />
        ) : (
          <div className="cutscene-empty-workspace">
            <strong>还没有过场资源</strong>
            <span>从左侧导入视频，或用图片序列新建帧动画。</span>
          </div>
        )}
      </div>

      <div className="inspector inspector--tabbed cutscene-inspector">
        {selected ? (
          <>
            <div className="insp-head">
              <div className="what">
                {selected.record.kind === 'video' ? '选中视频' : '选中帧动画'}
              </div>
              <EditableAssetName asset={selected} session={session} />
            </div>
            <DsInspectorTabs
              id="cutscene-inspector"
              label="过场资源检查器"
              activeId={inspectorTab}
              onChange={(id) => setInspectorTab(id as CutsceneInspectorTab)}
              items={[
                {
                  id: 'resource',
                  label: '资源',
                  panel: (
                    <>
                      <div className="section">
                        <h4>资源</h4>
                        <div className="music-meta-row">
                          <span>AssetId</span>
                          <code title={selected.id}>{selected.id}</code>
                        </div>
                        <div className="music-meta-row">
                          <span>来源</span>
                          <strong>{ORIGIN_LABELS[selected.record.origin.kind]}</strong>
                        </div>
                        <div className="music-meta-row">
                          <span>文件</span>
                          <code title={selected.record.path}>{selected.record.path}</code>
                        </div>
                        <div className="music-meta-row">
                          <span>格式</span>
                          <strong>{selected.record.mediaType}</strong>
                        </div>
                        <div className="music-meta-row">
                          <span>大小</span>
                          <strong>{formatBytes(selected.record.bytes)}</strong>
                        </div>
                      </div>
                      {selected.record.kind === 'video' ? (
                        <div className="section">
                          <h4>媒体</h4>
                          <div className="music-meta-row">
                            <span>分辨率</span>
                            <strong>
                              {videoMetadata
                                ? `${videoMetadata.width} × ${videoMetadata.height}`
                                : '读取中'}
                            </strong>
                          </div>
                          <div className="music-meta-row">
                            <span>时长</span>
                            <strong>
                              {videoMetadata ? formatDuration(videoMetadata.duration) : '读取中'}
                            </strong>
                          </div>
                          <div className="music-meta-row">
                            <span>音轨</span>
                            <strong>
                              {videoMetadata?.audio === 'yes'
                                ? '有'
                                : videoMetadata?.audio === 'no'
                                  ? '无'
                                  : '浏览器未报告'}
                            </strong>
                          </div>
                        </div>
                      ) : (
                        <div className="section">
                          <h4>动画</h4>
                          <div className="music-meta-row">
                            <span>画布</span>
                            <strong>
                              {frameMetadata
                                ? `${frameMetadata.width} × ${frameMetadata.height}`
                                : '读取中'}
                            </strong>
                          </div>
                          <div className="music-meta-row">
                            <span>帧数</span>
                            <strong>{frameMetadata?.frameCount ?? '读取中'}</strong>
                          </div>
                          <div className="music-meta-row">
                            <span>时长</span>
                            <strong>
                              {frameMetadata
                                ? formatDuration(frameMetadata.durationMs / 1000)
                                : '读取中'}
                            </strong>
                          </div>
                          <div className="music-meta-row">
                            <span>色彩</span>
                            <strong>
                              {frameMetadata?.colorTreatment === 'project-standard'
                                ? '工程标准色彩'
                                : '保留原色'}
                            </strong>
                          </div>
                        </div>
                      )}
                      <div className="section cutscene-actions-section">
                        <h4>内容</h4>
                        {selected.record.kind === 'video' ? (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => videoReplaceRef.current?.click()}
                          >
                            替换视频
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => frameReplaceRef.current?.click()}
                          >
                            用图片序列替换
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn danger"
                          disabled={selectedReferences.length > 0}
                          title={
                            selectedReferences.length
                              ? `有 ${selectedReferences.length} 处引用，不能删除`
                              : '删除资源'
                          }
                          onClick={() => void deleteSelected()}
                        >
                          删除资源
                        </button>
                        <input
                          ref={videoReplaceRef}
                          hidden
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void importVideo(file, selected.id)
                            event.target.value = ''
                          }}
                        />
                        <input
                          ref={frameReplaceRef}
                          hidden
                          multiple
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => onFrameFiles(event, selected.id)}
                        />
                      </div>
                    </>
                  ),
                },
                {
                  id: 'references',
                  label: '引用',
                  count: selectedReferenceCount,
                  panel: (
                    <div className="section asset-reference-section">
                      <DsReferencePanel
                        state={selectedReferenceCount ? 'ready' : 'empty'}
                        count={{ kind: 'exact', value: selectedReferenceCount }}
                        impact={{
                          kind: 'blocking',
                          description: selectedReferenceCount
                            ? '替换资源会保留这些引用；解除全部引用后才能删除。'
                            : '当前工程没有引用此资源。',
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
                    </div>
                  ),
                },
                {
                  id: 'diagnostics',
                  label: '诊断',
                  count: selectedIssues.length,
                  panel: (
                    <div className="section">
                      <DsDiagnosticPanel
                        state={selectedIssues.length ? 'ready' : 'clear'}
                        count={{
                          kind: 'exact',
                          errors: selectedIssues.filter((issue) => issue.severity === 'error')
                            .length,
                          warnings: selectedIssues.filter((issue) => issue.severity === 'warn')
                            .length,
                        }}
                        summary={selectedIssues.length ? undefined : '资源类型与引用闭包正常'}
                      >
                        {selectedIssues.length ? (
                          <DsDiagnosticList>
                            {selectedIssues.map((issue) => (
                              <DsDiagnosticRow
                                key={`${issue.code}-${issue.where}`}
                                severity={issue.severity === 'error' ? 'error' : 'warning'}
                                title={issue.message}
                                code={issue.code}
                                path={issue.where}
                                statusLabel="仅提示"
                              />
                            ))}
                          </DsDiagnosticList>
                        ) : null}
                      </DsDiagnosticPanel>
                    </div>
                  ),
                },
              ]}
            />
          </>
        ) : (
          <div className="insp-empty">选择一个过场资源查看属性与引用。</div>
        )}
      </div>

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
            <ol className="cutscene-import-files" aria-label="图片序列顺序">
              {pendingFrames.files.map((file, index) => (
                <li className="cutscene-import-file" key={`${file.name}-${file.size}-${index}`}>
                  <span>{index + 1}</span>
                  <code title={file.name}>{file.name}</code>
                  <button
                    type="button"
                    className="mini-icon"
                    title="上移"
                    disabled={index === 0}
                    onClick={() => movePendingFrame(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="mini-icon"
                    title="下移"
                    disabled={index === pendingFrames.files.length - 1}
                    onClick={() => movePendingFrame(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="mini-icon danger"
                    title="排除此帧"
                    onClick={() => removePendingFrame(index)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            <label>
              默认帧率
              <input
                className="in"
                type="number"
                min="0.1"
                step="0.1"
                value={importFps}
                onChange={(event) => setImportFps(Number(event.target.value))}
              />
            </label>
            <label>
              色彩处理
              <select
                className="sel"
                value={importTreatment}
                onChange={(event) =>
                  setImportTreatment(event.target.value as 'preserve' | 'project-standard')
                }
              >
                <option value="preserve">保留原色</option>
                <option value="project-standard">贴合工程标准色彩</option>
              </select>
            </label>
            {importTreatment === 'project-standard' ? (
              <label>
                转换方式
                <select
                  className="sel"
                  value={importQuantization}
                  onChange={(event) =>
                    setImportQuantization(event.target.value as FrameQuantization)
                  }
                >
                  <option value="nearest">最近色</option>
                  <option value="floyd-steinberg">误差扩散</option>
                </select>
              </label>
            ) : null}
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                disabled={Boolean(busy)}
                onClick={() => setPendingFrames(undefined)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={
                  Boolean(busy) ||
                  pendingFrames.files.length === 0 ||
                  !Number.isFinite(importFps) ||
                  importFps <= 0
                }
                onClick={() => void createFrameAnimation()}
              >
                {busy || '创建'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
