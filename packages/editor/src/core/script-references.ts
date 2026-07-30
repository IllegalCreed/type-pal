import type { Command, ScriptRef, SharedScriptSelf } from '@type-pal/content'
import { checkScriptLibrary, deriveScriptChunk, isScriptRef } from '@type-pal/content'
import type { EditorState } from './edit-session.js'

export type ScriptReferenceKind = 'call' | 'jump' | 'binding'

export type ScriptReferenceCaller =
  | { type: 'scene'; sceneId: string; sourceKey: string; label: string }
  | { type: 'script'; scriptId: string; label: string }
  | { type: 'global'; sourceKey: string; label: string }

export interface ScriptReferenceEntry {
  target: ScriptRef
  kind: ScriptReferenceKind
  caller: ScriptReferenceCaller
  path: string
  explicitSelf?: string
}

export interface SceneEntryReferenceEntry {
  targetSceneId: string
  entryId: string
  caller: ScriptReferenceCaller
  path: string
}

export interface ScriptProjectDiagnostics {
  references: Map<string, ScriptReferenceEntry[]>
  sceneEntryReferences: Map<string, SceneEntryReferenceEntry[]>
  errors: string[]
  warnings: string[]
}

type SelfAvailability = 'always' | 'maybe' | 'none' | 'unknown'

interface ScanContext {
  caller: ScriptReferenceCaller
  self: SelfAvailability
  callerScriptId?: string
}

export function sceneEntryReferenceKey(sceneId: string, entryId: string): string {
  return JSON.stringify([sceneId, entryId])
}

function pushRef(
  map: Map<string, ScriptReferenceEntry[]>,
  ref: ScriptRef,
  entry: Omit<ScriptReferenceEntry, 'target'>,
): void {
  const refs = map.get(ref.id) ?? []
  refs.push({ ...entry, target: ref })
  map.set(ref.id, refs)
}

function selfAvailability(contract: SharedScriptSelf | undefined): SelfAvailability {
  if (contract === 'required') return 'always'
  if (contract === 'optional') return 'maybe'
  if (contract === 'none') return 'none'
  return 'unknown'
}

/**
 * 全工程脚本图。调用方只在保存/删除/打开引用面板时执行；PAL 全库约 8MiB，禁止放进输入热路径。
 */
export function buildScriptReferenceIndex(state: EditorState): ScriptProjectDiagnostics {
  const references = new Map<string, ScriptReferenceEntry[]>()
  const sceneEntryReferences = new Map<string, SceneEntryReferenceEntry[]>()
  const errors: string[] = []
  const warnings: string[] = []
  const bodies = new Map<string, { chunk: string; body: Command[] }>()
  const callEdges = new Map<string, Set<string>>()
  const chunks = state.scriptChunks ?? {}
  const scenesById = new Map(state.scenes.map((scene) => [scene.id, scene]))

  if (state.scriptIndex) {
    try {
      checkScriptLibrary(state.scriptIndex, chunks)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  } else if (Object.keys(chunks).length) {
    errors.push('存在 scriptChunks，但 manifest/index 没有脚本索引')
  }

  for (const [chunkId, chunk] of Object.entries(chunks)) {
    for (const [id, body] of Object.entries(chunk.scripts)) {
      if (bodies.has(id)) errors.push(`脚本 id 重复 ${id}`)
      else bodies.set(id, { chunk: chunkId, body })
    }
  }

  const resolveRef = (ref: ScriptRef, where: string): void => {
    if (!state.scriptIndex) {
      errors.push(`${where}: 工程没有脚本 index，无法解析 ${ref.id}`)
      return
    }
    const derived = deriveScriptChunk(ref.id, state.scriptIndex.shards)
    if (!chunks[ref.chunk]?.scripts[ref.id] && !(derived && chunks[derived]?.scripts[ref.id]))
      errors.push(`${where}: 孤儿 ref ${ref.chunk}:${ref.id}(derived=${derived ?? 'none'})`)
  }

  const walk = (node: unknown, path: string, context: ScanContext): void => {
    if (Array.isArray(node)) {
      node.forEach((value, index) => {
        walk(value, `${path}/${index}`, context)
      })
      return
    }
    if (!node || typeof node !== 'object') return
    const command = node as Partial<Command> & Record<string, unknown>
    const kind = command.kind

    if (kind === 'loadScene') {
      const sceneId = command.scene
      const entryId = command.entryId
      const pos = command.pos
      if ('entry' in command)
        errors.push(`${context.caller.label}${path}: loadScene.entry 已退役，请使用 entryId`)
      if (entryId !== undefined && pos !== undefined)
        errors.push(`${context.caller.label}${path}: loadScene.entryId 与 pos 不能同时存在`)
      if (typeof sceneId !== 'string' || !scenesById.has(sceneId)) {
        errors.push(`${context.caller.label}${path}: loadScene 目标场景 ${String(sceneId)} 不存在`)
      } else if (entryId !== undefined) {
        if (typeof entryId !== 'string' || !entryId) {
          errors.push(`${context.caller.label}${path}: loadScene.entryId 必须是非空字符串`)
        } else {
          const key = sceneEntryReferenceKey(sceneId, entryId)
          const entries = sceneEntryReferences.get(key) ?? []
          entries.push({ targetSceneId: sceneId, entryId, caller: context.caller, path })
          sceneEntryReferences.set(key, entries)
          if (!scenesById.get(sceneId)?.entries?.[entryId])
            errors.push(`${context.caller.label}${path}: 命名落点 ${sceneId}/${entryId} 不存在`)
        }
      }
    }

    if ((kind === 'callScript' || kind === 'jumpScript') && isScriptRef(command.ref)) {
      const refKind: ScriptReferenceKind = kind === 'callScript' ? 'call' : 'jump'
      pushRef(references, command.ref, {
        kind: refKind,
        caller: context.caller,
        path,
        ...(typeof command.self === 'string' ? { explicitSelf: command.self } : {}),
      })
      resolveRef(command.ref, `${context.caller.label}${path}`)
      if (kind === 'callScript' && context.callerScriptId) {
        const edges = callEdges.get(context.callerScriptId) ?? new Set<string>()
        edges.add(command.ref.id)
        callEdges.set(context.callerScriptId, edges)
      }
      const targetSelf = state.scriptIndex?.library?.[command.ref.id]?.self
      if (
        kind === 'callScript' &&
        targetSelf === 'required' &&
        typeof command.self !== 'string' &&
        context.self !== 'always' &&
        context.self !== 'unknown'
      ) {
        errors.push(`${context.caller.label}${path}: 调用 ${command.ref.id} 需要显式 self`)
      }
    }

    if (
      (kind === 'setEntityAuto' ||
        kind === 'setEntityTrigger' ||
        kind === 'setSceneOnEnter' ||
        kind === 'setSceneOnTeleport') &&
      isScriptRef(command.script)
    ) {
      pushRef(references, command.script, {
        kind: 'binding',
        caller: context.caller,
        path: `${path}/script`,
      })
      resolveRef(command.script, `${context.caller.label}${path}/script`)
    }

    if (
      context.caller.type === 'script' &&
      state.scriptIndex?.library?.[context.caller.scriptId] &&
      typeof command.entity === 'string' &&
      /^e\d+$/.test(command.entity)
    ) {
      warnings.push(
        `${context.caller.label}${path}: 硬编码场景实体 ${command.entity}，跨场景调用可能无效`,
      )
    }

    for (const [key, value] of Object.entries(command)) {
      if (key === 'ref' || key === 'script') continue
      if (key === 'kind' || key === 'entity' || key === 'self') continue
      walk(value, `${path}/${key}`, context)
    }
  }

  const walkStages = (stages: unknown, context: ScanContext): void => walk(stages, '', context)
  for (const scene of state.scenes) {
    if (scene.onEnter)
      walkStages(scene.onEnter, {
        caller: {
          type: 'scene',
          sceneId: scene.id,
          sourceKey: '__onEnter__',
          label: `${scene.id} 进场脚本`,
        },
        self: 'none',
      })
    if (scene.onTeleport)
      walkStages(scene.onTeleport, {
        caller: {
          type: 'scene',
          sceneId: scene.id,
          sourceKey: '__onTeleport__',
          label: `${scene.id} 传送出口`,
        },
        self: 'none',
      })
    for (const entity of scene.entities) {
      entity.pages?.forEach((page, pageIndex) => {
        if (page.trigger)
          walkStages(page.trigger.stages, {
            caller: {
              type: 'scene',
              sceneId: scene.id,
              sourceKey: `${entity.id}:trigger`,
              label: `${scene.id}/${entity.id} 触发[p${pageIndex}]`,
            },
            self: 'always',
          })
        if (page.auto)
          walkStages(page.auto.stages, {
            caller: {
              type: 'scene',
              sceneId: scene.id,
              sourceKey: `${entity.id}:auto`,
              label: `${scene.id}/${entity.id} 巡逻[p${pageIndex}]`,
            },
            self: 'always',
          })
      })
      if (Array.isArray(entity.hostile?.onLose))
        walk(entity.hostile.onLose, '', {
          caller: {
            type: 'scene',
            sceneId: scene.id,
            sourceKey: `${entity.id}:hostile`,
            label: `${scene.id}/${entity.id} 战败命令`,
          },
          self: 'unknown',
        })
    }
  }

  for (const [id, entry] of bodies) {
    const meta = state.scriptIndex?.library?.[id]
    walk(entry.body, '', {
      caller: { type: 'script', scriptId: id, label: meta?.name ? `${meta.name}(${id})` : id },
      callerScriptId: id,
      self: selfAvailability(meta?.self),
    })
  }

  const authored = new Set(Object.keys(state.scriptIndex?.library ?? {}))
  const stateById = new Map<string, 'visiting' | 'done'>()
  const stack: string[] = []
  const reportedCycles = new Set<string>()
  const visit = (id: string): void => {
    if (stateById.get(id) === 'done') return
    if (stateById.get(id) === 'visiting') return
    stateById.set(id, 'visiting')
    stack.push(id)
    for (const next of callEdges.get(id) ?? []) {
      if (stateById.get(next) === 'visiting') {
        const start = stack.lastIndexOf(next)
        const cycle = [...stack.slice(start), next]
        if (cycle.some((entry) => authored.has(entry))) {
          const key = [...new Set(cycle)].sort().join('|')
          if (!reportedCycles.has(key)) {
            reportedCycles.add(key)
            errors.push(`作者脚本 call 环: ${cycle.join(' -> ')}`)
          }
        }
      } else visit(next)
    }
    stack.pop()
    stateById.set(id, 'done')
  }
  for (const id of bodies.keys()) visit(id)

  return {
    references,
    sceneEntryReferences,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  }
}

export function findScriptReferences(state: EditorState, scriptId: string): ScriptReferenceEntry[] {
  return buildScriptReferenceIndex(state).references.get(scriptId) ?? []
}

export function findSceneEntryReferences(
  state: EditorState,
  sceneId: string,
  entryId: string,
): SceneEntryReferenceEntry[] {
  return (
    buildScriptReferenceIndex(state).sceneEntryReferences.get(
      sceneEntryReferenceKey(sceneId, entryId),
    ) ?? []
  )
}

export function assertScriptProjectValid(state: EditorState): ScriptProjectDiagnostics {
  const diagnostics = buildScriptReferenceIndex(state)
  if (diagnostics.errors.length)
    throw new Error(`脚本工程校验失败:\n${diagnostics.errors.join('\n')}`)
  return diagnostics
}
