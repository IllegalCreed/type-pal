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
  index: Map<string, BlockingAmbienceReference[]>,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, entryIndex) => {
      scanChunkCommands(entry, `${where}[${entryIndex}]`, index)
    })
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (record.kind === 'setAmbience' && typeof record.ambience === 'string')
    pushReference(index, record.ambience, {
      ambienceId: record.ambience,
      kind: 'set-ambience',
      where: `${where}.ambience`,
      label: `脚本块中的“切氛围 ${record.ambience}”`,
    })
  if (record.kind === 'toggleDayNight')
    for (const ambienceId of ['day', 'night'])
      pushReference(index, ambienceId, {
        ambienceId,
        kind: 'toggle-day-night',
        where,
        label: `脚本块中的“切换昼夜”（隐式使用 ${ambienceId}）`,
      })
  for (const [key, child] of Object.entries(record))
    scanChunkCommands(child, `${where}.${key}`, index)
}

function pushReference(
  index: Map<string, BlockingAmbienceReference[]>,
  ambienceId: string,
  reference: BlockingAmbienceReference,
): void {
  const references = index.get(ambienceId) ?? []
  references.push(reference)
  index.set(ambienceId, references)
}

/**
 * 当前作者快照的氛围引用单一索引。目录计数、Inspector 与删除预检必须共用它，
 * 不能按每个氛围各自重扫一次全项目。
 */
export function collectAmbienceReferenceIndex(
  state: EditorState,
  canonicalState?: ScriptEditorState,
): Map<string, BlockingAmbienceReference[]> {
  const index = new Map<string, BlockingAmbienceReference[]>()
  const canonical = canonicalState ?? scriptStateFromEditorState(state)
  visitCanonicalScriptCommands(canonical, (command, path, locator) => {
    const ids =
      command.kind === 'setAmbience'
        ? [command.ambience]
        : command.kind === 'toggleDayNight'
          ? ['day', 'night']
          : []
    for (const ambienceId of ids) {
      const explicit = command.kind === 'setAmbience'
      const reference: CanonicalScriptReference = {
        kind: 'command',
        path: explicit ? `${path}.ambience` : path,
        locator,
      }
      pushReference(index, ambienceId, {
        ambienceId,
        kind: explicit ? 'set-ambience' : 'toggle-day-night',
        where: reference.path,
        label: `${describeCanonicalScriptReference(canonical, reference)} / ${
          explicit ? `切氛围 ${ambienceId}` : `切换昼夜（隐式使用 ${ambienceId}）`
        }`,
        locator: reference,
      })
    }
  })

  // AuthorScript 与分片 ScriptChunk 是两个独立持久化输入域。传入 live canonicalState
  // 只覆盖前者，不能因此跳过 chunk；否则编辑器展示 0 引用，删除门禁也会漏掉真实引用。
  for (const [chunkId, chunk] of Object.entries(state.scriptChunks ?? {}))
    for (const [scriptId, body] of Object.entries(chunk.scripts))
      scanChunkCommands(
        body,
        `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
        index,
      )

  state.worlds?.forEach((world, worldIndex) => {
    if (!world.ambience) return
    pushReference(index, world.ambience, {
      ambienceId: world.ambience,
      kind: 'world-state',
      where: `worlds[${worldIndex}].ambience`,
      label: `运行态/存档 ${worldIndex + 1} 的当前氛围`,
    })
  })
  return index
}

/** 删除门禁使用的完整氛围引用；缺失定义仍沿用运行时恒等白降级，不改变保存兼容语义。 */
export function blockingAmbienceReferences(
  state: EditorState,
  ambienceId: string,
  canonicalState?: ScriptEditorState,
): BlockingAmbienceReference[] {
  return collectAmbienceReferenceIndex(state, canonicalState).get(ambienceId) ?? []
}
