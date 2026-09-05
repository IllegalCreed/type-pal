import type { EditorState, EditSession } from './edit-session.js'
import type {
  EditorDerivedData,
  EditorDerivedInput,
  EditorDerivedReply,
  EditorDerivedRequest,
  EditorDerivedRevision,
  EditorDiagnosticState,
  EditorDiagnosticStatePatch,
  IdArrayPatch,
  RecordPatch,
  ScriptEditorStatePatch,
} from './editor-derived-contract.js'
import { sameEditorDerivedRevision } from './editor-derived-contract.js'
import { createEditorDerivedWorkerRuntime } from './editor-derived-core.js'
import type {
  ScriptEditorAffectedRecords,
  ScriptEditorState,
  ScriptEditSession,
} from './script-editor.js'

export interface EditorDerivedPublishedSnapshot {
  revision: EditorDerivedRevision
  data: EditorDerivedData
}

export type EditorDerivedStoreSnapshot =
  | { status: 'checking'; targetRevision: EditorDerivedRevision }
  | {
      status: 'stale'
      targetRevision: EditorDerivedRevision
      lastKnown: EditorDerivedPublishedSnapshot
    }
  | { status: 'current'; revision: EditorDerivedRevision; data: EditorDerivedData }
  | {
      status: 'failed'
      targetRevision: EditorDerivedRevision
      message: string
      lastKnown?: EditorDerivedPublishedSnapshot
    }

export function isEditorDerivedSnapshotCurrent(
  snapshot: EditorDerivedStoreSnapshot,
  currentRevision: EditorDerivedRevision,
): snapshot is Extract<EditorDerivedStoreSnapshot, { status: 'current' }> {
  return (
    snapshot.status === 'current' && sameEditorDerivedRevision(snapshot.revision, currentRevision)
  )
}

/**
 * Resolve the user-facing state against the sessions' exact current revision.
 * A failed/checking result for an older target must not leak into the next render frame.
 */
export function effectiveEditorDerivedStatus(
  snapshot: EditorDerivedStoreSnapshot,
  currentRevision: EditorDerivedRevision,
): EditorDerivedStoreSnapshot['status'] {
  const snapshotRevision =
    snapshot.status === 'current' ? snapshot.revision : snapshot.targetRevision
  if (sameEditorDerivedRevision(snapshotRevision, currentRevision)) return snapshot.status
  if (
    snapshot.status === 'current' ||
    snapshot.status === 'stale' ||
    (snapshot.status === 'failed' && snapshot.lastKnown)
  )
    return 'stale'
  return 'checking'
}

export interface EditorDerivedWorkerPort {
  onmessage: ((event: { data: EditorDerivedReply }) => void) | null
  onerror: ((event: { message?: string }) => void) | null
  onmessageerror: ((event: { data?: unknown }) => void) | null
  postMessage(message: EditorDerivedRequest): void
  terminate(): void
}

export type EditorDerivedWorkerFactory = () => EditorDerivedWorkerPort

class InlineEditorDerivedWorker implements EditorDerivedWorkerPort {
  onmessage: ((event: { data: EditorDerivedReply }) => void) | null = null
  onerror: ((event: { message?: string }) => void) | null = null
  onmessageerror: ((event: { data?: unknown }) => void) | null = null
  private active = true
  private readonly runtime = createEditorDerivedWorkerRuntime()

  postMessage(message: EditorDerivedRequest): void {
    const request = structuredClone(message)
    setTimeout(() => {
      if (!this.active) return
      try {
        const reply = structuredClone(this.runtime.handle(request))
        this.onmessage?.({ data: reply })
      } catch (cause) {
        this.onerror?.({ message: cause instanceof Error ? cause.message : String(cause) })
      }
    }, 0)
  }

  terminate(): void {
    this.active = false
  }
}

function defaultWorkerFactory(): EditorDerivedWorkerPort {
  if (typeof Worker === 'undefined') return new InlineEditorDerivedWorker()
  return new Worker(new URL('./editor-derived.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as EditorDerivedWorkerPort
}

export function editorDiagnosticState(state: EditorState): EditorDiagnosticState {
  const { maps: _maps, assetBlobs: _assetBlobs, tilesetBlobs: _tilesetBlobs, ...diagnostic } = state
  return diagnostic
}

function revision(main: EditSession, script: ScriptEditSession): EditorDerivedRevision {
  return {
    mainHistoryVersion: main.getHistoryVersion(),
    scriptHistoryVersion: script.getHistoryVersion(),
  }
}

function arrayPatch<T extends { id: string }>(
  before: readonly T[],
  after: readonly T[],
  affectedIds?: ReadonlySet<string>,
): IdArrayPatch<T> | undefined {
  if (before === after && !affectedIds?.size) return undefined
  const previous = new Map(before.map((record) => [record.id, record]))
  const upserts = after.filter((record) =>
    affectedIds ? affectedIds.has(record.id) : previous.get(record.id) !== record,
  )
  const beforeOrder = before.map((record) => record.id)
  const order = after.map((record) => record.id)
  const orderChanged =
    beforeOrder.length !== order.length || beforeOrder.some((id, index) => order[index] !== id)
  if (!upserts.length && !orderChanged) return undefined
  return { order, upserts }
}

function recordPatch<T>(
  before: Record<string, T>,
  after: Record<string, T>,
  affectedIds: ReadonlySet<string>,
): RecordPatch<T> | undefined {
  const keys = Object.keys(after)
  const orderChanged =
    Object.keys(before).length !== keys.length || Object.keys(before).some((key) => !(key in after))
  const upserts = Object.fromEntries(
    keys.flatMap((key) => (affectedIds.has(key) ? [[key, after[key]!] as const] : [])),
  )
  if (!orderChanged && !Object.keys(upserts).length) return undefined
  return { keys, upserts }
}

function mainPatch(before: EditorState, after: EditorState): EditorDiagnosticStatePatch {
  const left = editorDiagnosticState(before) as unknown as Record<string, unknown>
  const right = editorDiagnosticState(after) as unknown as Record<string, unknown>
  const replace: Record<string, unknown> = {}
  const removeKeys: string[] = []
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    if (key === 'scenes' || key === 'items') continue
    if (!(key in right)) removeKeys.push(key)
    else if (left[key] !== right[key]) replace[key] = right[key]
  }
  const scenes =
    before.scenes === after.scenes ? undefined : arrayPatch(before.scenes, after.scenes)
  const items = before.items === after.items ? undefined : arrayPatch(before.items, after.items)
  return {
    replace: replace as EditorDiagnosticStatePatch['replace'],
    ...(removeKeys.length
      ? { removeKeys: removeKeys as NonNullable<EditorDiagnosticStatePatch['removeKeys']> }
      : {}),
    ...(scenes ? { scenes } : {}),
    ...(items ? { items } : {}),
  }
}

function scriptPatch(
  before: ScriptEditorState,
  after: ScriptEditorState,
  affected: ScriptEditorAffectedRecords,
): ScriptEditorStatePatch {
  const all = affected.all === true
  const sceneIds = new Set(all ? after.scenes.map((record) => record.id) : affected.scenes)
  const itemIds = new Set(all ? after.items.map((record) => record.id) : affected.items)
  const scriptIds = new Set(all ? Object.keys(after.sharedScripts) : affected.sharedScripts)
  const scenes =
    all || sceneIds.size ? arrayPatch(before.scenes, after.scenes, sceneIds) : undefined
  const items = all || itemIds.size ? arrayPatch(before.items, after.items, itemIds) : undefined
  const sharedScripts =
    all || scriptIds.size
      ? recordPatch(before.sharedScripts, after.sharedScripts, scriptIds)
      : undefined
  return {
    ...(scenes ? { scenes } : {}),
    ...(items ? { items } : {}),
    ...(sharedScripts ? { sharedScripts } : {}),
  }
}

function hasPatch(main: EditorDiagnosticStatePatch, script: ScriptEditorStatePatch): boolean {
  return (
    Object.keys(main.replace).length > 0 ||
    (main.removeKeys?.length ?? 0) > 0 ||
    main.scenes !== undefined ||
    main.items !== undefined ||
    script.scenes !== undefined ||
    script.items !== undefined ||
    script.sharedScripts !== undefined
  )
}

export function createEditorDerivedStore(options: {
  mainSession: EditSession
  scriptSession: ScriptEditSession
  workerFactory?: EditorDerivedWorkerFactory
}) {
  const { mainSession, scriptSession } = options
  const listeners = new Set<() => void>()
  let snapshot: EditorDerivedStoreSnapshot = {
    status: 'checking',
    targetRevision: revision(mainSession, scriptSession),
  }
  let lastKnown: EditorDerivedPublishedSnapshot | undefined
  let lastSentMain: EditorState | undefined
  let lastSentScript: ScriptEditorState | undefined
  let lastSentRevision: EditorDerivedRevision | undefined
  let port: EditorDerivedWorkerPort | undefined
  let stopMain: (() => void) | undefined
  let stopScript: (() => void) | undefined
  let scheduled = false
  let inFlight = false
  let epoch = 0
  let jobId = 0
  let activeJobId = 0
  let running = false

  const emit = (): void => {
    for (const listener of listeners) listener()
  }

  const targetRevision = (): EditorDerivedRevision => revision(mainSession, scriptSession)

  const setPendingSnapshot = (target: EditorDerivedRevision): void => {
    snapshot = lastKnown
      ? { status: 'stale', targetRevision: target, lastKnown }
      : { status: 'checking', targetRevision: target }
    emit()
  }

  const fail = (message: string): void => {
    if (!running) return
    inFlight = false
    port?.terminate()
    port = undefined
    snapshot = {
      status: 'failed',
      targetRevision: targetRevision(),
      message,
      ...(lastKnown ? { lastKnown } : {}),
    }
    emit()
  }

  const startWorker = (): void => {
    if (!running) return
    port?.terminate()
    epoch += 1
    inFlight = false
    lastSentMain = undefined
    lastSentScript = undefined
    lastSentRevision = undefined
    setPendingSnapshot(targetRevision())
    try {
      const nextPort = (options.workerFactory ?? defaultWorkerFactory)()
      const workerEpoch = epoch
      port = nextPort
      nextPort.onmessage = (event) => {
        if (port !== nextPort || epoch !== workerEpoch) return
        receive(event.data)
      }
      nextPort.onerror = (event) => {
        if (port !== nextPort || epoch !== workerEpoch) return
        fail(event.message ?? '派生 Worker 运行失败')
      }
      nextPort.onmessageerror = () => {
        if (port !== nextPort || epoch !== workerEpoch) return
        fail('派生 Worker 返回了无法解析的数据')
      }
      sendLatest()
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const sendLatest = (): void => {
    if (!port || inFlight) return
    const nextRevision = targetRevision()
    const nextMain = mainSession.getState()
    const nextScript = scriptSession.getStateSnapshot()
    const nextJobId = ++jobId
    let request: EditorDerivedRequest
    if (!lastSentMain || !lastSentScript || !lastSentRevision) {
      const input: EditorDerivedInput = {
        state: editorDiagnosticState(nextMain),
        canonical: nextScript,
      }
      request = {
        kind: 'init',
        epoch,
        jobId: nextJobId,
        revision: nextRevision,
        input,
      }
    } else {
      const main = mainPatch(lastSentMain, nextMain)
      const affected = scriptSession.getAffectedRecordsSince(lastSentRevision.scriptHistoryVersion)
      const script = scriptPatch(lastSentScript, nextScript, affected)
      request = hasPatch(main, script)
        ? {
            kind: 'patch',
            epoch,
            jobId: nextJobId,
            baseRevision: lastSentRevision,
            revision: nextRevision,
            main,
            script,
          }
        : {
            kind: 'advance',
            epoch,
            jobId: nextJobId,
            baseRevision: lastSentRevision,
            revision: nextRevision,
          }
    }
    lastSentMain = nextMain
    lastSentScript = nextScript
    lastSentRevision = nextRevision
    activeJobId = nextJobId
    inFlight = true
    try {
      port.postMessage(request)
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const refresh = (): void => {
    scheduled = false
    if (!running) return
    const target = targetRevision()
    const currentTarget =
      snapshot.status === 'current' ? snapshot.revision : snapshot.targetRevision
    if (sameEditorDerivedRevision(target, currentTarget)) return
    if (!port) {
      startWorker()
      return
    }
    setPendingSnapshot(target)
    sendLatest()
  }

  const scheduleRefresh = (): void => {
    if (!running) return
    if (scheduled) return
    scheduled = true
    queueMicrotask(refresh)
  }

  const receive = (reply: EditorDerivedReply): void => {
    if (!running) return
    if (reply.epoch !== epoch || reply.jobId !== activeJobId) return
    inFlight = false
    const currentRevision = targetRevision()
    if (!sameEditorDerivedRevision(reply.revision, currentRevision)) {
      if (reply.kind === 'failed') startWorker()
      else {
        setPendingSnapshot(currentRevision)
        sendLatest()
      }
      return
    }
    if (reply.kind === 'failed') {
      fail(reply.message)
      return
    }
    lastKnown = { revision: reply.revision, data: reply.data }
    snapshot = { status: 'current', revision: reply.revision, data: reply.data }
    emit()
  }

  const stop = (): void => {
    running = false
    epoch += 1
    stopMain?.()
    stopScript?.()
    stopMain = undefined
    stopScript = undefined
    port?.terminate()
    port = undefined
    inFlight = false
  }

  const start = (): (() => void) => {
    stopMain?.()
    stopScript?.()
    running = true
    stopMain = mainSession.subscribe(scheduleRefresh)
    stopScript = scriptSession.subscribe(scheduleRefresh)
    startWorker()
    return stop
  }

  return {
    start,
    retry(): void {
      if (running) startWorker()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot(): EditorDerivedStoreSnapshot {
      return snapshot
    },
  }
}

export type EditorDerivedStore = ReturnType<typeof createEditorDerivedStore>
