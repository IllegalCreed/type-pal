import { type StampTemplate, validateStampTemplates } from '@type-pal/content'
import type { Command } from './commands.js'
import type { EditorState } from './edit-session.js'

const STAMPS_CONTENT_PATH = 'content/stamps.json'

function cloneTemplate(template: StampTemplate): StampTemplate {
  return structuredClone(template)
}

function validateNext(templates: readonly StampTemplate[]): StampTemplate[] {
  return validateStampTemplates(templates.map(cloneTemplate))
}

export class AddStampTemplateCommand implements Command {
  readonly label = '新增图章模板'
  private readonly template: StampTemplate
  private added = false
  private previousManifestPath: string | undefined
  private manifestPathCaptured = false

  constructor(template: StampTemplate) {
    this.template = validateNext([template])[0]!
  }

  apply(state: EditorState): EditorState {
    if (state.stamps.some((candidate) => candidate.id === this.template.id))
      throw new Error(`图章模板 id "${this.template.id}" 已存在。`)
    const stamps = validateNext([...state.stamps, this.template])
    if (!this.manifestPathCaptured) {
      this.previousManifestPath = state.manifest.content.stamps
      this.manifestPathCaptured = true
    }
    this.added = true
    return {
      ...state,
      stamps,
      manifest: state.manifest.content.stamps
        ? state.manifest
        : {
            ...state.manifest,
            content: { ...state.manifest.content, stamps: STAMPS_CONTENT_PATH },
          },
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    const content = { ...state.manifest.content }
    if (this.previousManifestPath === undefined) delete content.stamps
    else content.stamps = this.previousManifestPath
    return {
      ...state,
      stamps: state.stamps.filter((candidate) => candidate.id !== this.template.id),
      manifest: { ...state.manifest, content },
    }
  }
}

export interface ReplaceStampTemplateOptions {
  /** migrated 模板只有在 UI 明示确认后才能整项接管为 authored。 */
  takeOwnership?: boolean
}

export class ReplaceStampTemplateCommand implements Command {
  readonly label = '更新图章模板'
  private readonly template: StampTemplate
  private readonly takeOwnership: boolean
  private previous: StampTemplate | undefined

  constructor(template: StampTemplate, options: ReplaceStampTemplateOptions = {}) {
    this.template = validateNext([template])[0]!
    this.takeOwnership = options.takeOwnership === true
  }

  apply(state: EditorState): EditorState {
    const index = state.stamps.findIndex((candidate) => candidate.id === this.template.id)
    if (index < 0) throw new Error(`图章模板 "${this.template.id}" 不存在。`)
    const current = state.stamps[index]!
    if (current.origin === 'migrated' && !this.takeOwnership)
      throw new Error(`预置图章 "${current.id}" 必须显式接管后才能修改。`)
    if (current.origin === 'migrated' && this.template.origin !== 'authored')
      throw new Error(`接管预置图章 "${current.id}" 后 origin 必须为 authored。`)
    if (current.origin === 'authored' && this.template.origin !== 'authored')
      throw new Error(`作者图章 "${current.id}" 不能改回 migrated。`)
    if (this.previous === undefined) this.previous = cloneTemplate(current)
    if (JSON.stringify(current) === JSON.stringify(this.template)) return state
    const stamps = [...state.stamps]
    stamps[index] = this.template
    return { ...state, stamps: validateNext(stamps) }
  }

  invert(state: EditorState): EditorState {
    if (!this.previous) return state
    const index = state.stamps.findIndex((candidate) => candidate.id === this.template.id)
    if (index < 0) return state
    const stamps = [...state.stamps]
    stamps[index] = this.previous
    return { ...state, stamps: validateNext(stamps) }
  }
}

/** 复制永远创建新的 authored 模板；不会与来源模板保持链接。 */
export class DuplicateStampTemplateCommand implements Command {
  readonly label = '复制图章模板'
  private readonly sourceId: string
  private readonly targetId: string
  private readonly targetName: string | undefined
  private delegate: AddStampTemplateCommand | undefined

  constructor(sourceId: string, targetId: string, targetName?: string) {
    this.sourceId = sourceId
    this.targetId = targetId.trim()
    this.targetName = targetName?.trim() || undefined
  }

  apply(state: EditorState): EditorState {
    if (!this.delegate) {
      const source = state.stamps.find((candidate) => candidate.id === this.sourceId)
      if (!source) throw new Error(`图章模板 "${this.sourceId}" 不存在。`)
      this.delegate = new AddStampTemplateCommand({
        ...cloneTemplate(source),
        id: this.targetId,
        name: this.targetName ?? `${source.name} 副本`,
        origin: 'authored',
      })
    }
    return this.delegate.apply(state)
  }

  invert(state: EditorState): EditorState {
    return this.delegate?.invert(state) ?? state
  }
}

export class DeleteStampTemplateCommand implements Command {
  readonly label = '删除图章模板'
  private readonly templateId: string
  private removed: { template: StampTemplate; index: number } | undefined

  constructor(templateId: string) {
    this.templateId = templateId
  }

  apply(state: EditorState): EditorState {
    const index = state.stamps.findIndex((candidate) => candidate.id === this.templateId)
    if (index < 0) return state
    if (!this.removed) this.removed = { template: cloneTemplate(state.stamps[index]!), index }
    return {
      ...state,
      stamps: state.stamps.filter((_, candidateIndex) => candidateIndex !== index),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || state.stamps.some((candidate) => candidate.id === this.templateId))
      return state
    const stamps = [...state.stamps]
    stamps.splice(this.removed.index, 0, this.removed.template)
    return { ...state, stamps: validateNext(stamps) }
  }
}
