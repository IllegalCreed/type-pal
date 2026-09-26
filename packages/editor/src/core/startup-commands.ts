/**
 * 启动入口与 manifest 资源角色命令。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { AssetId, AssetRole, EntryPoint } from '@type-pal/content'
import { validateStartWorld } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

/** 更新 manifest.assets.roles 的一个或多个稳定 AssetId；undefined 表示清除角色绑定。 */
export class UpdateManifestAssetRolesCommand implements Command {
  readonly label = '改项目资源角色'
  private readonly patch: Partial<Record<AssetRole, AssetId | undefined>>
  private old: Partial<Record<AssetRole, AssetId | undefined>> | undefined

  constructor(patch: Partial<Record<AssetRole, AssetId | undefined>>) {
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    if (!this.old) {
      this.old = {}
      for (const role of Object.keys(this.patch) as AssetRole[])
        this.old[role] = state.manifest.assets.roles[role]
    }
    const roles = { ...state.manifest.assets.roles }
    for (const [role, assetId] of Object.entries(this.patch) as [
      AssetRole,
      AssetId | undefined,
    ][]) {
      if (assetId === undefined) delete roles[role]
      else roles[role] = assetId
    }
    const assets = { ...state.manifest.assets, roles }
    return { ...state, manifest: { ...state.manifest, assets } }
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    const roles = { ...state.manifest.assets.roles }
    for (const [role, assetId] of Object.entries(this.old) as [AssetRole, AssetId | undefined][]) {
      if (assetId === undefined) delete roles[role]
      else roles[role] = assetId
    }
    return {
      ...state,
      manifest: { ...state.manifest, assets: { ...state.manifest.assets, roles } },
    }
  }
}

export interface StartupEntryConfig {
  defaultEntryId: string
  entryPoints: EntryPoint[]
}

function cloneStartupEntryConfig(config: StartupEntryConfig): StartupEntryConfig {
  const defaultEntryId = config.defaultEntryId.trim()
  if (!defaultEntryId || defaultEntryId !== config.defaultEntryId)
    throw new Error('直接启动入口 id 必须是无首尾空格的非空字符串')
  if (config.entryPoints.length === 0) throw new Error('入口点列表不能为空，至少保留一个入口')
  const ids = new Set<string>()
  const entryPoints = config.entryPoints.map((entry, index) => {
    const id = entry.id.trim()
    if (!id) throw new Error('入口点 id 不能为空')
    if (id !== entry.id) throw new Error(`入口点 id "${entry.id}" 不得包含首尾空格`)
    if (ids.has(id)) throw new Error(`入口点 id "${id}" 重复`)
    ids.add(id)
    if (!entry.label.trim()) throw new Error(`入口点 "${id}" 的名称不能为空`)
    if (!entry.scene.trim()) throw new Error(`入口点 "${id}" 的场景不能为空`)
    const copy = structuredClone(entry)
    copy.startWorld = validateStartWorld(copy.startWorld, `entryPoints[${index}].startWorld`)
    if (copy.introVideo === undefined) delete copy.introVideo
    return copy
  })
  if (!ids.has(defaultEntryId)) throw new Error(`直接启动入口 "${defaultEntryId}" 不存在`)
  return { defaultEntryId, entryPoints }
}

function cloneNonEmptyEntryPoints(entries: readonly EntryPoint[]): [EntryPoint, ...EntryPoint[]] {
  if (entries.length === 0) throw new Error('入口点列表不能为空，至少保留一个入口')
  return structuredClone(entries) as [EntryPoint, ...EntryPoint[]]
}

/**
 * 原子替换直接启动入口选择器与全部真实入口。next 必须满足当前 schema；old 则按
 * 原样快照，以便编辑器可以用同一条可撤销命令修复已载入的悬空/旧引用。
 */
export class SetStartupEntriesCommand implements Command {
  readonly label = '编辑启动入口'
  private readonly next: StartupEntryConfig
  private old: StartupEntryConfig | undefined
  private captured = false

  constructor(next: StartupEntryConfig) {
    this.next = cloneStartupEntryConfig(next)
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.old = {
        defaultEntryId: state.manifest.defaultEntryId,
        entryPoints: cloneNonEmptyEntryPoints(state.manifest.entryPoints),
      }
      this.captured = true
    }
    return {
      ...state,
      manifest: {
        ...state.manifest,
        defaultEntryId: this.next.defaultEntryId,
        entryPoints: cloneNonEmptyEntryPoints(this.next.entryPoints),
      },
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    return {
      ...state,
      manifest: {
        ...state.manifest,
        defaultEntryId: this.old.defaultEntryId,
        entryPoints: cloneNonEmptyEntryPoints(this.old.entryPoints),
      },
    }
  }
}
