import type { EditorState } from './edit-session.js'
import {
  type CanonicalScriptReference,
  describeCanonicalScriptReference,
  type ScriptEditorState,
  visitCanonicalScriptCommands,
} from './script-editor.js'

export type AmbienceReferenceKind = 'set-ambience' | 'toggle-day-night' | 'world-state'

export interface BlockingAmbienceReference {
  ambienceId: string
  kind: AmbienceReferenceKind
  where: string
  label: string
  locator?: CanonicalScriptReference
}

function scriptStateFromEditorState(state: EditorState): ScriptEditorState {
  return {
    scenes: state.scenes as unknown as ScriptEditorState['scenes'],
    items: state.items as unknown as ScriptEditorState['items'],
    sharedScripts: (state.sharedScripts ?? {}) as unknown as ScriptEditorState['sharedScripts'],
  }
}

function scanChunkCommands(
  value: unknown,
  where: string,
  ambienceId: string,
  references: BlockingAmbienceReference[],
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      scanChunkCommands(entry, `${where}[${index}]`, ambienceId, references)
    })
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (record.kind === 'setAmbience' && record.ambience === ambienceId)
    references.push({
      ambienceId,
      kind: 'set-ambience',
      where: `${where}.ambience`,
      label: `脚本块中的“切氛围 ${ambienceId}”`,
    })
  if ((ambienceId === 'day' || ambienceId === 'night') && record.kind === 'toggleDayNight')
    references.push({
      ambienceId,
      kind: 'toggle-day-night',
      where,
      label: `脚本块中的“切换昼夜”（隐式使用 ${ambienceId}）`,
    })
  for (const [key, child] of Object.entries(record))
    scanChunkCommands(child, `${where}.${key}`, ambienceId, references)
}

/** 删除门禁使用的完整氛围引用；缺失定义仍沿用运行时恒等白降级，不改变保存兼容语义。 */
export function blockingAmbienceReferences(
  state: EditorState,
  ambienceId: string,
  canonicalState?: ScriptEditorState,
): BlockingAmbienceReference[] {
  const references: BlockingAmbienceReference[] = []
  const canonical = canonicalState ?? scriptStateFromEditorState(state)
  visitCanonicalScriptCommands(canonical, (command, path, locator) => {
    const explicit = command.kind === 'setAmbience' && command.ambience === ambienceId
    const implicitDayNight =
      (ambienceId === 'day' || ambienceId === 'night') && command.kind === 'toggleDayNight'
    if (!explicit && !implicitDayNight) return
    const reference: CanonicalScriptReference = {
      kind: 'command',
      path: explicit ? `${path}.ambience` : path,
      locator,
    }
    references.push({
      ambienceId,
      kind: explicit ? 'set-ambience' : 'toggle-day-night',
      where: reference.path,
      label: `${describeCanonicalScriptReference(canonical, reference)} / ${
        explicit ? `切氛围 ${ambienceId}` : `切换昼夜（隐式使用 ${ambienceId}）`
      }`,
      locator: reference,
    })
  })

  if (!canonicalState)
    for (const [chunkId, chunk] of Object.entries(state.scriptChunks ?? {}))
      for (const [scriptId, body] of Object.entries(chunk.scripts))
        scanChunkCommands(
          body,
          `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
          ambienceId,
          references,
        )

  state.worlds?.forEach((world, index) => {
    if (world.ambience !== ambienceId) return
    references.push({
      ambienceId,
      kind: 'world-state',
      where: `worlds[${index}].ambience`,
      label: `运行态/存档 ${index + 1} 的当前氛围`,
    })
  })
  return references
}
