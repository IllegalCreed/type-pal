import type { EditorState } from './edit-session.js'
import type {
  EditorDerivedData,
  EditorDerivedInput,
  EditorDerivedReply,
  EditorDerivedRequest,
  EditorDerivedRevision,
  IdArrayPatch,
  RecordPatch,
} from './editor-derived-contract.js'
import { sameEditorDerivedRevision } from './editor-derived-contract.js'
import { collectEditorDiagnosticsSnapshot } from './project-diagnostics.js'

function applyIdArrayPatch<T extends { id: string }>(
  current: readonly T[],
  patch: IdArrayPatch<T>,
): T[] {
  const records = new Map(current.map((record) => [record.id, record]))
  for (const record of patch.upserts) records.set(record.id, record)
  return patch.order.map((id) => {
    const record = records.get(id)
    if (!record) throw new Error(`派生状态 patch 缺少记录 ${id}`)
    return record
  })
}

function applyRecordPatch<T>(current: Record<string, T>, patch: RecordPatch<T>): Record<string, T> {
  const records = { ...current, ...patch.upserts }
  return Object.fromEntries(
    patch.keys.map((key) => {
      const record = records[key]
      if (record === undefined) throw new Error(`派生状态 patch 缺少记录 ${key}`)
      return [key, record]
    }),
  )
}

function materializeEditorState(input: EditorDerivedInput): EditorState {
  return {
    ...input.state,
    maps: {},
    assetBlobs: {},
    tilesetBlobs: {},
  }
}

function collect(input: EditorDerivedInput): EditorDerivedData {
  const state = materializeEditorState(input)
  const snapshot = collectEditorDiagnosticsSnapshot(state, input.canonical)
  return {
    statusIssues: snapshot.statusIssues,
    projectIssues: snapshot.projectIssues,
    projectReferences: snapshot.projectReferences,
    assetReferences: snapshot.assetSnapshot.references,
    assetDiagnostics: snapshot.assetDiagnostics,
    worldVariableReferences: snapshot.worldVariableReferences,
    canonicalBehaviorReferences: [...snapshot.canonicalSchemeReferenceIndexes.behavior],
    canonicalSceneHookReferences: [...snapshot.canonicalSchemeReferenceIndexes.sceneHook],
  }
}

export interface EditorDerivedWorkerRuntime {
  handle(request: EditorDerivedRequest): EditorDerivedReply
}

/** Stateful worker-side runtime. The large project snapshot is initialized once, then patched. */
export function createEditorDerivedWorkerRuntime(): EditorDerivedWorkerRuntime {
  let input: EditorDerivedInput | undefined
  let revision: EditorDerivedRevision | undefined
  let data: EditorDerivedData | undefined
  return {
    handle(request) {
      try {
        if (request.kind === 'init') {
          input = request.input
        } else {
          if (!input || !revision || !sameEditorDerivedRevision(revision, request.baseRevision))
            throw new Error('派生 Worker base revision 不匹配，请重试全量初始化')
          if (request.kind === 'patch') {
            const nextState: EditorDerivedInput['state'] = {
              ...input.state,
              ...request.main.replace,
              ...(request.main.scenes
                ? { scenes: applyIdArrayPatch(input.state.scenes, request.main.scenes) }
                : {}),
              ...(request.main.items
                ? { items: applyIdArrayPatch(input.state.items, request.main.items) }
                : {}),
            }
            for (const key of request.main.removeKeys ?? [])
              delete (nextState as unknown as Record<string, unknown>)[key]
            input = {
              state: nextState,
              canonical: {
                ...input.canonical,
                ...(request.script.scenes
                  ? {
                      scenes: applyIdArrayPatch(input.canonical.scenes, request.script.scenes),
                    }
                  : {}),
                ...(request.script.items
                  ? { items: applyIdArrayPatch(input.canonical.items, request.script.items) }
                  : {}),
                ...(request.script.sharedScripts
                  ? {
                      sharedScripts: applyRecordPatch(
                        input.canonical.sharedScripts,
                        request.script.sharedScripts,
                      ),
                    }
                  : {}),
              },
            }
          }
        }
        revision = request.revision
        if (request.kind !== 'advance' || !data) data = collect(input)
        return {
          kind: 'ready',
          epoch: request.epoch,
          jobId: request.jobId,
          revision: request.revision,
          data,
        }
      } catch (cause) {
        return {
          kind: 'failed',
          epoch: request.epoch,
          jobId: request.jobId,
          revision: request.revision,
          message: cause instanceof Error ? cause.message : String(cause),
        }
      }
    },
  }
}
