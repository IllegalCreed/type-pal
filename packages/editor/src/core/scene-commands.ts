/**
 * 场景命令族：改场景字段/落点，以及场景新建/复制/改名/删除。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { SceneAssetDefV1, SceneDef, SceneEntryPoint } from '@type-pal/content'
import { rewriteExplicitSceneReferences, validateSceneIndex } from '@type-pal/content'
import type { Command } from './command-contract.js'
import { findScene, withScene } from './command-scene-state.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

/** UpdateScene 的 patch 范围(entry / music / entries / mapId / battleFieldId)。 */
export type ScenePatch = Partial<
  Pick<SceneDef, 'entry' | 'music' | 'entries' | 'mapId' | 'battleFieldId'>
>

/**
 * 改场景字段(mapId/entry/music)。apply 记下旧值,invert 还原。语义同 UpdateEntityCommand。
 * entry 是对象,patch 传整个新 entry(整体替换,非深合并)。
 * music 传 undefined =「延续上一曲」；null = 显式停曲；AssetId = 指定曲。
 */
export class UpdateSceneCommand implements Command {
  readonly label = '修改场景'
  private readonly sceneId: string
  private readonly patch: ScenePatch
  private oldPatch: ScenePatch | undefined

  constructor(sceneId: string, patch: ScenePatch) {
    this.sceneId = sceneId
    // entry 若有,深拷贝(独立于外部入参,防回写)。
    // ⚠ 不能无条件写 entry 键:patch 只有 music 时,旧写法把 entry:undefined
    //   显式塞进 patch → spread 把必填 scene.entry 覆成 undefined → 渲染 entry.facing 崩。
    this.patch = { ...patch }
    if (this.patch.entry) this.patch.entry = structuredClone(this.patch.entry)
    if (this.patch.entries) this.patch.entries = structuredClone(this.patch.entries)
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (!this.oldPatch) this.oldPatch = this.captureOld(scene)
    return withScene(state, this.sceneId, { ...scene, ...this.patch })
  }

  /** 按 this.patch 出现的键,从 scene 上摘旧值(entry 深拷贝)。 */
  private captureOld(scene: SceneDef): ScenePatch {
    const old: ScenePatch = {}
    if ('music' in this.patch) old.music = scene.music
    if ('entry' in this.patch && this.patch.entry) {
      old.entry = scene.entry ? structuredClone(scene.entry) : undefined
    }
    if ('entries' in this.patch)
      old.entries = scene.entries ? structuredClone(scene.entries) : undefined
    if ('mapId' in this.patch) old.mapId = scene.mapId
    if ('battleFieldId' in this.patch) old.battleFieldId = scene.battleFieldId
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    return withScene(state, this.sceneId, { ...scene, ...this.oldPatch })
  }
}

/** 新增或修改一个命名落点；稳定 id 是 record key，不随 label 修改。 */
export class UpsertSceneEntryCommand implements Command {
  readonly label = '修改落点'
  private previous: SceneEntryPoint | undefined
  private existed: boolean | undefined

  constructor(
    private readonly sceneId: string,
    private readonly entryId: string,
    private readonly entry: SceneEntryPoint,
  ) {
    if (!entryId) throw new Error('落点 id 不能为空')
    this.entry = structuredClone(entry)
  }

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene) return state
    if (this.existed === undefined) {
      this.existed = scene.entries?.[this.entryId] !== undefined
      this.previous = scene.entries?.[this.entryId]
        ? structuredClone(scene.entries[this.entryId])
        : undefined
    }
    return withScene(state, this.sceneId, {
      ...scene,
      entries: { ...(scene.entries ?? {}), [this.entryId]: structuredClone(this.entry) },
    })
  }

  invert(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene || this.existed === undefined) return state
    const entries = { ...(scene.entries ?? {}) }
    if (this.existed && this.previous) entries[this.entryId] = structuredClone(this.previous)
    else delete entries[this.entryId]
    return withScene(state, this.sceneId, {
      ...scene,
      entries: Object.keys(entries).length ? entries : undefined,
    })
  }
}

export class SceneEntryInUseError extends Error {
  constructor(
    readonly sceneId: string,
    readonly entryId: string,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(`落点 ${sceneId}/${entryId} 正被 ${references.length} 处脚本引用`)
    this.name = 'SceneEntryInUseError'
  }
}

/** 删除未引用的命名落点；引用保护在 Command 层，键盘、按钮与未来调用方行为一致。 */
export class DeleteSceneEntryCommand implements Command {
  readonly label = '删除落点'
  private removed: SceneEntryPoint | undefined

  constructor(
    private readonly sceneId: string,
    private readonly entryId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    const entry = scene?.entries?.[this.entryId]
    if (!scene || !entry) return state
    const references = this.currentReferences(state).deletionImpact({
      kind: 'scene-entry',
      sceneId: this.sceneId,
      entryId: this.entryId,
    }).blockers
    if (references.length) throw new SceneEntryInUseError(this.sceneId, this.entryId, references)
    if (!this.removed) this.removed = structuredClone(entry)
    const entries = { ...(scene.entries ?? {}) }
    delete entries[this.entryId]
    return withScene(state, this.sceneId, {
      ...scene,
      entries: Object.keys(entries).length ? entries : undefined,
    })
  }

  invert(state: EditorState): EditorState {
    const scene = findScene(state, this.sceneId)
    if (!scene || !this.removed) return state
    return withScene(state, this.sceneId, {
      ...scene,
      entries: {
        ...(scene.entries ?? {}),
        [this.entryId]: structuredClone(this.removed),
      },
    })
  }
}

/**
 * 新建场景 shell + SceneIndex 元数据；canonical 正文由同一跨会话事务的脚本命令持有。
 */
function validateEditorSceneIndex(
  state: EditorState,
  scenes: readonly SceneAssetDefV1[],
): EditorState['sceneIndex'] {
  const dir = state.manifest.content.scenes?.replace(/\/?$/, '/') ?? 'content/scenes/'
  return validateSceneIndex({ version: 1, scenes }, `${dir}index.json`)
}

export class AddSceneCommand implements Command {
  readonly label = '新建场景'
  private readonly asset: SceneAssetDefV1
  private readonly scene: SceneDef
  private added = false

  constructor(asset: SceneAssetDefV1, scene: SceneDef) {
    this.asset = structuredClone(asset)
    this.scene = structuredClone(scene)
  }

  apply(state: EditorState): EditorState {
    if (
      state.scenes.some((scene) => scene.id === this.scene.id) ||
      state.sceneIndex.scenes.some((asset) => asset.id === this.asset.id)
    )
      throw new Error(`场景 id "${this.scene.id}" 已存在`)
    if (this.asset.id !== this.scene.id)
      throw new Error(`场景 index/id 不符 "${this.asset.id}" / "${this.scene.id}"`)
    const sceneIndex = validateEditorSceneIndex(state, [...state.sceneIndex.scenes, this.asset])
    this.added = true
    return {
      ...state,
      sceneIndex,
      scenes: [...state.scenes, structuredClone(this.scene)],
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return {
      ...state,
      sceneIndex: {
        version: 1,
        scenes: state.sceneIndex.scenes.filter((asset) => asset.id !== this.asset.id),
      },
      scenes: state.scenes.filter((scene) => scene.id !== this.scene.id),
    }
  }
}

/** 复制场景 shell；脚本作者态由 DuplicateSceneDefinitionCommand 在同一事务中复制。 */
export class DuplicateSceneCommand implements Command {
  readonly label = '复制场景'
  private added = false

  constructor(
    private readonly sourceSceneId: string,
    private readonly asset: SceneAssetDefV1,
  ) {}

  apply(state: EditorState): EditorState {
    const source = state.scenes.find((scene) => scene.id === this.sourceSceneId)
    if (!source) throw new Error(`场景不存在 ${this.sourceSceneId}`)
    if (
      state.scenes.some((scene) => scene.id === this.asset.id) ||
      state.sceneIndex.scenes.some((asset) => asset.id === this.asset.id)
    )
      throw new Error(`场景 id "${this.asset.id}" 已存在`)
    const copy = rewriteExplicitSceneReferences(source, this.sourceSceneId, this.asset.id)
    copy.id = this.asset.id
    const sceneIndex = validateEditorSceneIndex(state, [...state.sceneIndex.scenes, this.asset])
    this.added = true
    return { ...state, sceneIndex, scenes: [...state.scenes, copy] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return {
      ...state,
      sceneIndex: {
        version: 1,
        scenes: state.sceneIndex.scenes.filter((asset) => asset.id !== this.asset.id),
      },
      scenes: state.scenes.filter((scene) => scene.id !== this.asset.id),
    }
  }
}

/** 可重做的场景名称快照命令。 */
export class UpdateSceneNameCommand implements Command {
  readonly label = '修改场景名称'
  private previous?: string

  constructor(
    private readonly sceneId: string,
    private readonly name: string,
  ) {}

  private replace(state: EditorState, name: string): EditorState {
    const index = state.sceneIndex.scenes.findIndex((asset) => asset.id === this.sceneId)
    if (index < 0) throw new Error(`场景不存在 ${this.sceneId}`)
    const scenes = [...state.sceneIndex.scenes]
    scenes[index] = { ...scenes[index]!, name }
    return { ...state, sceneIndex: validateEditorSceneIndex(state, scenes) }
  }

  apply(state: EditorState): EditorState {
    const asset = state.sceneIndex.scenes.find((candidate) => candidate.id === this.sceneId)
    if (!asset) throw new Error(`场景不存在 ${this.sceneId}`)
    const name = this.name.trim()
    if (!name) throw new Error('场景显示名不能为空')
    if (asset.name === name) return state
    this.previous ??= asset.name
    return this.replace(state, name)
  }

  invert(state: EditorState): EditorState {
    if (this.previous === undefined) return state
    return this.replace(state, this.previous)
  }
}

export class SceneInUseError extends Error {
  constructor(
    readonly sceneId: string,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(`场景 "${sceneId}" 仍有 ${references.length} 个外部引用`)
    this.name = 'SceneInUseError'
  }
}

/** 删除场景 shell + SceneIndex；每次 apply/redo 都用 current ED-3 index 再验真。 */
export class DeleteSceneCommand implements Command {
  readonly label = '删除场景'
  private before?: EditorState

  constructor(
    private readonly sceneId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    if (!state.scenes.some((scene) => scene.id === this.sceneId))
      throw new Error(`场景不存在 ${this.sceneId}`)
    if (!state.sceneIndex.scenes.some((asset) => asset.id === this.sceneId))
      throw new Error(`SceneIndex 未登记场景 ${this.sceneId}`)
    const target = { kind: 'scene' as const, id: this.sceneId }
    const impact = collectCurrentProjectDeletionImpact(this.currentReferences, state, target)
    if (impact.blockers.length) throw new SceneInUseError(this.sceneId, impact.blockers)
    this.before = state
    return {
      ...state,
      sceneIndex: {
        version: 1,
        scenes: state.sceneIndex.scenes.filter((asset) => asset.id !== this.sceneId),
      },
      scenes: state.scenes.filter((scene) => scene.id !== this.sceneId),
    }
  }

  invert(_state: EditorState): EditorState {
    if (!this.before) throw new Error(`${this.label}: 尚未 apply`)
    return this.before
  }
}
