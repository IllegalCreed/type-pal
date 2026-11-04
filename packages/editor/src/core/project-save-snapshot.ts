import type { FileSource } from '@type-pal/reforge'
import type { EditorState, EditSession } from './edit-session.js'
import { projectFileSnapshot, serializeProjectWithMapCopies } from './project-io.js'
import type { ScriptEditorState, ScriptEditSession } from './script-editor.js'
import { mergeEditorProjectionWithCurrentAuthorState } from './script-editor-projection.js'

export interface EditorSaveSnapshot {
  state: EditorState
  script: ScriptEditorState
  scriptVersion: number
  editedMaps: EditorState['maps']
}

/** Freeze author state and map dirty status at the caller's capture point, before serialization IO. */
export function captureEditorSaveSnapshot(
  main: EditSession,
  script: ScriptEditSession,
): EditorSaveSnapshot {
  const state = main.getState()
  return {
    state,
    script: script.getState(),
    scriptVersion: script.getVersion(),
    editedMaps: Object.fromEntries(
      Object.entries(state.maps).filter(([id]) => {
        const status = main.getMapDocumentStatus(id)
        return status.state === 'ready' && status.dirty
      }),
    ),
  }
}

export function serializeEditorSaveSnapshot(
  snapshot: EditorSaveSnapshot,
  source: FileSource,
  previous?: ReadonlyMap<string, string>,
): Promise<Record<string, unknown>> {
  return serializeProjectWithMapCopies(
    mergeEditorProjectionWithCurrentAuthorState(snapshot.script, {
      ...snapshot.state,
      maps: snapshot.editedMaps,
    }),
    source,
    previous,
  )
}

/**
 * Capture at session mount, before editing. This normalized output baseline never authorizes IO:
 * AuthorDiskBaseline separately checks exact source/target bytes. Resolve lazily, then release the
 * opening author objects; keep only output signatures/text for retries against another valid target.
 */
export function captureOpeningSaveBaseline(
  main: EditSession,
  script: ScriptEditSession,
  source: FileSource,
): () => Promise<Map<string, string>> {
  let opening: EditorSaveSnapshot | undefined = captureEditorSaveSnapshot(main, script)
  let baseline: Map<string, string> | undefined
  return async () => {
    if (!baseline) {
      if (!opening) throw new Error('缺少编辑前保存快照，请重新打开工程')
      baseline = await projectFileSnapshot(await serializeEditorSaveSnapshot(opening, source))
      opening = undefined
    }
    // writeProject advances its own copy after each successful close; opening evidence is immutable.
    return new Map(baseline)
  }
}
