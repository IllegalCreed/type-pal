import {
  type AssetCatalogV1,
  type AssetId,
  type AssetKind,
  type AssetRecordV1,
  type AssetReferenceSite,
  groupAssetReferencesBySite,
  validateAssetReferenceClosure,
} from '@type-pal/content'
import type { MidiNoteActivity, MidiPreviewTransport } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AudioPreviewCache,
  type PcmPeaks,
  type WavPreviewTransport,
} from '../core/audio-preview.js'
import { DeleteAssetCommand, UpsertAssetCommand } from '../core/commands.js'
import type { EditSession, EditorState } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { tryCollectEditorAssetReferenceSnapshot } from '../core/editor-asset-references.js'
import type { ScriptEditorState } from '../core/script-editor.js'
import {
  DsButton,
  DsCatalogControls,
  DsCatalogRow,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsFileInput,
  DsIconButton,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsPropertyGrid,
  DsPropertyRow,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsRangeInput,
  DsStatus,
  DsTag,
  DsVirtualList,
  DsWorkbenchSection,
} from './design-system/index.js'
import { MediaAssetConfirmDialog, MediaAssetNameField } from './MediaAssetLifecycle.js'

export type AudioTimeline = MidiNoteActivity | PcmPeaks

export interface AudioWorkbenchTransport {
  load(asset: AssetId, cacheKey?: string, cachedTimeline?: AudioTimeline): Promise<AudioTimeline>
  play(): Promise<void>
  pause(): void
  stop(): void
  seek(seconds: number): void
  snapshot(): { currentTime: number; duration: number; paused: boolean }
  dispose(): void
}

export interface PreparedAudioImport {
  bytes: ArrayBuffer
  hash: string
  record: AssetRecordV1
}

export interface AudioAssetWorkbenchStrategy {
  kind: Extract<AssetKind, 'music' | 'sound'>
  title: string
  unit: string
  formatLabel: string
  importLabel: string
  accept: string
  emptyLabel: string
  prepareImport(file: File, previousLabel?: string): Promise<PreparedAudioImport>
  allocateId(catalog: AssetCatalogV1, hash: string): AssetId
  createTransport(reader: EditorAssetReader): AudioWorkbenchTransport
  describeReference(
    reference: AssetReferenceSite,
    state: EditorState,
  ): { title: string; kind: string }
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

function formatTime(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const minutes = Math.floor(safe / 60)
  return `${minutes}:${Math.floor(safe % 60)
    .toString()
    .padStart(2, '0')}`
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError'
}

function AudioTimelineGraphic(props: { timeline?: AudioTimeline; progress: number }) {
  const timeline = props.timeline
  if (!timeline)
    return <div className="audio-timeline__empty">选择资源后读取时间轴。</div>
  const progressX = Math.max(0, Math.min(1, props.progress)) * 160
  return (
    <div className="audio-timeline__graphic">
      <svg viewBox="0 0 160 64" preserveAspectRatio="none" aria-hidden="true">
        {timeline.kind === 'note-activity'
          ? timeline.buckets.map((value, index) => (
              <rect
                key={index}
                x={(index / timeline.buckets.length) * 160}
                y={32 - value * 28}
                width={Math.max(0.5, 160 / timeline.buckets.length - 0.25)}
                height={value * 56}
                rx="0.25"
              />
            ))
          : timeline.maximums.map((maximum, index) => {
              const minimum = timeline.minimums[index] ?? 0
              const y1 = 32 - maximum * 28
              const y2 = 32 - minimum * 28
              return (
                <line
                  key={index}
                  x1={(index / timeline.maximums.length) * 160}
                  x2={(index / timeline.maximums.length) * 160}
                  y1={y1}
                  y2={y2}
                />
              )
            })}
        <line className="audio-timeline__progress" x1={progressX} x2={progressX} y1="0" y2="64" />
      </svg>
      <DsTag tone="neutral">
        {timeline.kind === 'note-activity' ? '音符活动' : 'PCM 波形'}
      </DsTag>
    </div>
  )
}

function AudioAssetPlayer(props: {
  assetId: AssetId
  sha256: string
  reader: EditorAssetReader
  strategy: AudioAssetWorkbenchStrategy
}) {
  const transport = useMemo(
    () => props.strategy.createTransport(props.reader),
    [props.reader, props.strategy],
  )
  const generationRef = useRef(0)
  const playRequestRef = useRef(0)
  const transportLifecycleRef = useRef<{
    transport: AudioWorkbenchTransport
    token: object
  } | undefined>(undefined)
  const analysisCacheRef = useRef(new AudioPreviewCache<AudioTimeline>(16))
  const [timeline, setTimeline] = useState<AudioTimeline>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [clock, setClock] = useState({ currentTime: 0, duration: 0, paused: true })
  const identity = `${props.reader.projectId}\0${props.assetId}\0${props.sha256}`

  useEffect(() => {
    const generation = ++generationRef.current
    playRequestRef.current++
    transport.stop()
    setPlaying(false)
    setClock({ currentTime: 0, duration: 0, paused: true })
    const cached = analysisCacheRef.current.get(identity)
    setTimeline(cached)
    setStatus('loading')
    setError('')
    const load = (retryCanceledInflight: boolean): void => {
      const cachedTimeline = analysisCacheRef.current.get(identity)
      const loading = cachedTimeline
        ? transport.load(props.assetId, identity, cachedTimeline)
        : analysisCacheRef.current.load(identity, () =>
            transport.load(props.assetId, identity),
          )
      void loading
        .then((result) => {
          if (generation !== generationRef.current) return
          setTimeline(result)
          setClock(transport.snapshot())
          setStatus('ready')
        })
        .catch((cause: unknown) => {
          if (generation !== generationRef.current) return
          if (isAbortError(cause) && retryCanceledInflight) {
            load(false)
            return
          }
          if (isAbortError(cause)) return
          setStatus('error')
          setError(cause instanceof Error ? cause.message : String(cause))
        })
    }
    load(true)
    return () => {
      generationRef.current++
      playRequestRef.current++
      transport.stop()
    }
  }, [identity, props.assetId, transport])

  useEffect(() => {
    const previous = transportLifecycleRef.current
    if (previous && previous.transport !== transport) previous.transport.dispose()
    const token = {}
    transportLifecycleRef.current = { transport, token }
    return () => {
      queueMicrotask(() => {
        if (transportLifecycleRef.current?.token !== token) return
        transport.dispose()
        transportLifecycleRef.current = undefined
      })
    }
  }, [transport])
  useEffect(
    () => () => analysisCacheRef.current.clear(),
    [props.reader.projectId],
  )

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const updateClock = () => {
      if (document.visibilityState === 'hidden') {
        frame = 0
        return
      }
      const next = transport.snapshot()
      setClock(next)
      if (next.paused) {
        setPlaying(false)
        return
      }
      frame = window.requestAnimationFrame(updateClock)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (frame) window.cancelAnimationFrame(frame)
        frame = 0
        return
      }
      if (!frame) frame = window.requestAnimationFrame(updateClock)
    }
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [playing, transport])

  const seek = (value: number): void => {
    playRequestRef.current++
    transport.seek(value)
    setClock(transport.snapshot())
  }

  const duration = timeline?.duration ?? clock.duration
  return (
    <div className="audio-player" data-audio-kind={props.strategy.kind}>
      <AudioTimelineGraphic
        timeline={timeline}
        progress={duration > 0 ? clock.currentTime / duration : 0}
      />
      <DsRangeInput
        className="audio-timeline__range"
        type="range"
        aria-label={`${props.strategy.title}试听进度`}
        aria-valuetext={`${formatTime(clock.currentTime)} / ${formatTime(duration)}`}
        min={0}
        max={Math.max(duration, 0.001)}
        step={0.01}
        value={Math.min(clock.currentTime, Math.max(duration, 0.001))}
        disabled={status !== 'ready' || duration <= 0}
        onChange={(event) => seek(Number(event.target.value))}
      />
      <div className="audio-player__transport">
        <DsIconButton
          icon={playing ? 'pause' : 'play'}
          label={playing ? '暂停' : '播放'}
          variant="secondary"
          disabled={status !== 'ready'}
          onClick={() => {
            if (playing) {
              playRequestRef.current++
              transport.pause()
              setPlaying(false)
              setClock(transport.snapshot())
              return
            }
            setError('')
            const request = ++playRequestRef.current
            void transport
              .play()
              .then(() => {
                if (request !== playRequestRef.current) return
                setPlaying(true)
                setClock(transport.snapshot())
              })
              .catch((cause: unknown) => {
                if (request !== playRequestRef.current || isAbortError(cause)) return
                setError(cause instanceof Error ? cause.message : String(cause))
              })
          }}
        />
        <DsIconButton
          icon="stop"
          label="停止"
          variant="secondary"
          disabled={status === 'loading'}
          onClick={() => {
            playRequestRef.current++
            transport.stop()
            setPlaying(false)
            setClock(transport.snapshot())
          }}
        />
        <output className="audio-player__time" aria-live="off">
          {formatTime(clock.currentTime)} / {formatTime(duration)}
        </output>
        <span className="audio-player__spacer" />
        <span className="audio-player__state">
          {status === 'loading'
            ? '正在读取…'
            : status === 'error'
              ? '读取失败'
              : playing
                ? '正在播放'
                : '就绪'}
        </span>
      </div>
      {error ? <DsStatus tone="error">{error}</DsStatus> : null}
    </div>
  )
}

export function AudioAssetWorkbench(props: {
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  session: EditSession
  strategy: AudioAssetWorkbenchStrategy
  tabBar?: React.ReactNode
  focusObjectId?: AssetId
  onObjectFocus?: (id: string | undefined) => void
  currentAuthor?: ScriptEditorState
  getCurrentAuthor?: () => ScriptEditorState | undefined
}) {
  const {
    catalog,
    reader,
    session,
    strategy,
    tabBar,
    focusObjectId,
    onObjectFocus,
    currentAuthor,
    getCurrentAuthor,
  } = props
  const state = session.getState()
  const entries = useMemo(
    () =>
      Object.entries(catalog.assets)
        .filter((entry): entry is [AssetId, AssetRecordV1] => entry[1].kind === strategy.kind)
        .map(([id, record]) => ({ id, record })),
    [catalog.assets, strategy.kind],
  )
  const referenceResult = useMemo(
    () => tryCollectEditorAssetReferenceSnapshot(state, currentAuthor),
    [currentAuthor, state],
  )
  const allReferences =
    referenceResult.status === 'ready' ? referenceResult.snapshot.references : []
  const referenceScanError =
    referenceResult.status === 'error' ? referenceResult.message : undefined
  const references = useMemo(() => {
    const byAsset = new Map<AssetId, AssetReferenceSite[]>()
    for (const reference of groupAssetReferencesBySite(allReferences)) {
      const list = byAsset.get(reference.asset) ?? []
      list.push(reference)
      byAsset.set(reference.asset, list)
    }
    return byAsset
  }, [allReferences])
  const closureIssues = useMemo(
    () => validateAssetReferenceClosure(catalog, allReferences),
    [allReferences, catalog],
  )
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [inspectorTab, setInspectorTab] = useState<'references' | 'diagnostics'>('references')
  const [selectedId, setSelectedId] = useState<AssetId | null>(() =>
    focusObjectId && entries.some((entry) => entry.id === focusObjectId)
      ? focusObjectId
      : (entries[0]?.id ?? null),
  )
  const [deleteTargetId, setDeleteTargetId] = useState<AssetId>()
  const [deleteBusy, setDeleteBusy] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const replaceTargetRef = useRef<AssetId | undefined>(undefined)
  const normalizedFilter = filter.trim().toLowerCase()
  const shown = entries.filter(
    (entry) =>
      !normalizedFilter ||
      entry.id.toLowerCase().includes(normalizedFilter) ||
      (entry.record.label ?? '').toLowerCase().includes(normalizedFilter),
  )
  const missingFocusedId =
    focusObjectId && !entries.some((entry) => entry.id === focusObjectId)
      ? focusObjectId
      : undefined
  const selected = missingFocusedId
    ? undefined
    : entries.find((entry) => entry.id === selectedId) ?? entries[0]

  useEffect(() => {
    if (!focusObjectId) return
    if (entries.some((entry) => entry.id === focusObjectId)) setSelectedId(focusObjectId)
  }, [entries, focusObjectId])
  useEffect(() => {
    if (selectedId && !entries.some((entry) => entry.id === selectedId))
      setSelectedId(entries[0]?.id ?? null)
  }, [entries, selectedId])

  const selectedReferences = selected ? (references.get(selected.id) ?? []) : []
  const selectedReferenceCount = selectedReferences.reduce(
    (total, reference) => total + reference.occurrences,
    0,
  )
  const selectedIssues = selected
    ? closureIssues.filter((issue) => issue.message.includes(`"${selected.id}"`))
    : []
  const deleteTarget = deleteTargetId
    ? entries.find((entry) => entry.id === deleteTargetId)
    : undefined

  const select = (id: AssetId): void => {
    setSelectedId(id)
    onObjectFocus?.(id)
  }

  const importFile = async (file: File, targetId?: AssetId): Promise<void> => {
    try {
      setError('')
      const previous = targetId ? catalog.assets[targetId] : undefined
      if (previous && previous.kind !== strategy.kind)
        throw new Error(`不能用 ${strategy.kind} 替换 ${previous.kind} 资源`)
      const previousBytes = targetId
        ? await reader.readBytes(targetId, strategy.kind)
        : undefined
      const prepared = await strategy.prepareImport(file, previous?.label)
      const id = targetId ?? strategy.allocateId(catalog, prepared.hash)
      session.dispatch(new UpsertAssetCommand(id, prepared.record, prepared.bytes, previousBytes))
      select(id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

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
      const previousBytes = await reader.readBytes(targetId, strategy.kind)
      const finalScan = scan()
      if (finalScan.status === 'error')
        throw new Error(`引用扫描失败，未删除：${finalScan.message}`)
      if (finalScan.snapshot.references.some((reference) => reference.asset === targetId))
        throw new Error('读取资源期间新增了引用，未删除。')
      const targetIndex = entries.findIndex((entry) => entry.id === targetId)
      const remaining = entries.filter((entry) => entry.id !== targetId)
      const next = remaining[Math.min(targetIndex, remaining.length - 1)]
      session.dispatch(new DeleteAssetCommand(targetId, previousBytes))
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
      <div className="outliner data-outliner audio-library-outliner">
        {tabBar}
        <DsCatalogControls
          title={strategy.title}
          count={shown.length}
          unit={strategy.unit}
          actions={[
            {
              id: `import-${strategy.kind}`,
              label: strategy.importLabel,
              icon: 'add',
              onClick: () => importInputRef.current?.click(),
            },
          ]}
          search={{
            'aria-label': `搜索${strategy.title}`,
            placeholder: '搜索名称或 AssetId',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
        />
        {error ? <DsStatus tone="error">{error}</DsStatus> : null}
        <DsFileInput
          ref={importInputRef}
          accept={strategy.accept}
          aria-label={`导入${strategy.title}`}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
            event.target.value = ''
          }}
        />
        <DsFileInput
          ref={replaceInputRef}
          accept={strategy.accept}
          aria-label={`替换${strategy.title}`}
          onChange={(event) => {
            const file = event.target.files?.[0]
            const targetId = replaceTargetRef.current
            replaceTargetRef.current = undefined
            if (file && targetId) void importFile(file, targetId)
            event.target.value = ''
          }}
        />
        {shown.length ? (
          <DsVirtualList
            label={`${strategy.title}目录`}
            items={shown}
            itemHeight={68}
            height={720}
            fill
            overscan={5}
            getKey={(entry) => entry.id}
            selectedKey={selected?.id}
            onSelect={(entry) => select(entry.id)}
            renderItem={(entry, _index, control) => {
              const count = (references.get(entry.id) ?? []).reduce(
                (total, reference) => total + reference.occurrences,
                0,
              )
              return (
                <DsCatalogRow
                  tabIndex={control.tabIndex}
                  onFocus={control.onFocus}
                  selected={selected?.id === entry.id}
                  title={entry.record.label || entry.id}
                  meta={entry.id}
                  trailing={count ? <DsTag tone="neutral">{count}</DsTag> : undefined}
                  onClick={() => select(entry.id)}
                />
              )
            }}
          />
        ) : (
          <div className="insp-empty">{entries.length ? '没有匹配的资源。' : strategy.emptyLabel}</div>
        )}
      </div>
      <div className="canvas-wrap data-body audio-workspace">
        {missingFocusedId ? (
          <DsStatus tone="error">
            引用目标 AssetId“{missingFocusedId}”不在项目 catalog；不会跳到其他资源。
          </DsStatus>
        ) : selected ? (
          <>
            <DsObjectHero
              className="media-asset-hero audio-asset-hero"
              eyebrow={strategy.title}
              title={selected.record.label || '未命名'}
              objectId={selected.id}
              summary={selected.record.path}
              meta={
                <>
                  <DsTag tone="neutral">{strategy.formatLabel}</DsTag>
                  <DsTag tone="neutral">{selectedReferenceCount} 处引用</DsTag>
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
                          : `删除当前${strategy.title}`
                    }
                    onClick={() => setDeleteTargetId(selected.id)}
                  >
                    删除
                  </DsButton>
                </>
              }
            />
            <div className="audio-workspace__scroll">
              <DsWorkbenchSection title="基本信息" description="名称可修改；稳定 ID 与文件信息保持只读。">
                <MediaAssetNameField
                  assetId={selected.id}
                  label={selected.record.label}
                  session={session}
                />
                <DsPropertyGrid>
                  <DsPropertyRow label="AssetId">
                    <code>{selected.id}</code>
                  </DsPropertyRow>
                  <DsPropertyRow label="格式">{selected.record.mediaType}</DsPropertyRow>
                  <DsPropertyRow label="文件">
                    <code>{selected.record.path}</code>
                  </DsPropertyRow>
                  <DsPropertyRow label="来源">
                    {ORIGIN_LABELS[selected.record.origin.kind]}
                  </DsPropertyRow>
                  <DsPropertyRow label="大小">{formatBytes(selected.record.bytes)}</DsPropertyRow>
                </DsPropertyGrid>
              </DsWorkbenchSection>
              <DsWorkbenchSection
                title="试听"
                description={
                  strategy.kind === 'music'
                    ? '时间轴显示 MIDI 音符活动，不代表 PCM 振幅。'
                    : '时间轴来自当前 WAV 解码后的真实 PCM 峰值。'
                }
              >
                <AudioAssetPlayer
                  assetId={selected.id}
                  sha256={selected.record.sha256}
                  reader={reader}
                  strategy={strategy}
                />
              </DsWorkbenchSection>
            </div>
          </>
        ) : (
          <div className="insp-empty">{strategy.emptyLabel}</div>
        )}
      </div>
      <div className="inspector inspector--tabbed music-inspector audio-inspector">
        {selected ? (
          <DsInspectorTabs
            id={`${strategy.kind}-inspector`}
            label={`${strategy.title}检查器`}
            activeId={inspectorTab}
            onChange={(id) => setInspectorTab(id as typeof inspectorTab)}
            items={[
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
                            ? `替换${strategy.title}会保留引用；解除全部引用后才能删除。`
                            : `当前项目没有引用这个${strategy.title}。`,
                      }}
                    >
                      {selectedReferences.length ? (
                        <DsReferenceList>
                          {selectedReferences.map((reference) => {
                            const description = strategy.describeReference(reference, state)
                            return (
                              <DsReferenceRow
                                key={`${reference.site}:${reference.where}`}
                                title={description.title}
                                path={reference.where}
                                labels={[{ label: description.kind }]}
                                occurrenceCount={reference.occurrences}
                                status={{
                                  label: '只读',
                                  reason: `${strategy.title}引用暂不支持从资源页精确定位。`,
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
                              key={`${issue.code}:${issue.where}`}
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
                  </DsInspectorSection>
                ),
              },
            ]}
          />
        ) : (
          <div className="insp-empty">选择资源查看引用与诊断。</div>
        )}
      </div>
      <MediaAssetConfirmDialog
        open={Boolean(deleteTarget)}
        title={`删除${strategy.title}`}
        objectLabel={deleteTarget ? deleteTarget.record.label || deleteTarget.id : ''}
        impact="移除资源记录和项目内文件；可通过全局撤销恢复。"
        referenceCount={
          referenceScanError
            ? 'unknown'
            : deleteTarget
              ? (references.get(deleteTarget.id) ?? []).reduce(
                  (total, reference) => total + reference.occurrences,
                  0,
                )
              : 0
        }
        confirmLabel={`删除${strategy.title}`}
        confirmVariant="danger"
        busy={deleteBusy}
        confirmDisabled={
          Boolean(referenceScanError) ||
          Boolean(deleteTarget && references.get(deleteTarget.id)?.length)
        }
        onClose={() => setDeleteTargetId(undefined)}
        onConfirm={() => void deleteSelected()}
      />
    </>
  )
}

export function asAudioWorkbenchTransport(
  transport: MidiPreviewTransport | WavPreviewTransport,
): AudioWorkbenchTransport {
  return transport
}
