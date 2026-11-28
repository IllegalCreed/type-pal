/** Authoring commands for the layout, actions and lifetime of sprite definitions. */
import type { AssetCatalogV1, AssetId, SpriteDef } from '@type-pal/content'
import {
  firstNewUnavailableSpriteFrame,
  spriteDefinitionFrameDemand,
  spriteDefinitionFrameIndices,
  validateSprites,
} from '@type-pal/content'
import { INDEXED_RLE_MAX_FRAME_SLOTS } from '@type-pal/reforge'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

/** 不可变:替换 spriteId 精灵;旁精灵同引用。 */
function withSprite(state: EditorState, spriteId: string, newSprite: SpriteDef): EditorState {
  let hit = false
  const sprites = state.sprites.map((s) => {
    if (s.id !== spriteId) return s
    hit = true
    return newSprite
  })
  return hit ? { ...state, sprites } : state
}

/** UpdateSprite 的 patch 范围(布局 / 命名姿势 / 标签)。 */
export type SpritePatch = Partial<Pick<SpriteDef, 'layout' | 'poses' | 'label'>>

/** 布局/姿势编辑在预览时解码出的资源事实；SHA 防止预览后资源已被替换。 */
export interface SpriteLayoutEditProof {
  asset: AssetId
  sha256: string
  actualFrameCount: number
}

function assertCurrentLayoutProof(
  catalog: AssetCatalogV1,
  asset: AssetId,
  proof: SpriteLayoutEditProof | undefined,
): asserts proof is SpriteLayoutEditProof {
  const record = catalog.assets[asset]
  if (record?.kind !== 'sprite' || proof?.asset !== asset || proof.sha256 !== record.sha256)
    throw new Error('精灵布局证明缺失或已过期，请等待帧资源重新载入')
  if (!Number.isInteger(proof.actualFrameCount) || proof.actualFrameCount <= 0)
    throw new Error('精灵布局证明的实际帧数非法')
}

export class SpriteInUseError extends Error {
  constructor(
    readonly targetLabel: string,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(
      `${targetLabel} 仍被 ${references.length} 处引用：\n${references
        .slice(0, 20)
        .map((reference) => `${reference.source.label} · ${reference.where}`)
        .join('\n')}`,
    )
    this.name = 'SpriteInUseError'
  }
}

/** Validate the edited layout and poses before applying each command's frame policy. */
export function assertSpriteEditShape(sprite: Pick<SpriteDef, 'id' | 'layout' | 'poses'>): void {
  if (
    sprite.layout.kind === 'loop' ||
    (sprite.layout.kind === 'directional' &&
      (!Number.isInteger(sprite.layout.framesPerDir) || sprite.layout.framesPerDir <= 0))
  )
    throw new Error(`精灵 ${sprite.id} 的布局非法；自动循环请创建预制动作`)
  for (const [actionId, action] of Object.entries(sprite.poses ?? {})) {
    if (
      !actionId ||
      !action.label.trim() ||
      action.steps.length === 0 ||
      action.steps.some(
        (step) =>
          !Number.isInteger(step.frame) ||
          step.frame < 0 ||
          !Number.isInteger(step.durationMs) ||
          step.durationMs <= 0 ||
          step.cues?.some((cue) => cue.kind !== 'sound' || !cue.asset),
      ) ||
      (action.order !== undefined && (!Number.isInteger(action.order) || action.order < 0)) ||
      (action.loopFrom !== undefined &&
        (!Number.isInteger(action.loopFrom) ||
          action.loopFrom < 0 ||
          action.loopFrom >= action.steps.length))
    )
      throw new Error(`精灵 ${sprite.id} 的预制动作 ${actionId} 非法`)
  }
}

function assertDoesNotAddMissingFrames(
  previous: SpriteDef,
  next: SpriteDef,
  actualFrameCount: number,
): void {
  const firstMissing = firstNewUnavailableSpriteFrame(previous, next, actualFrameCount)
  if (firstMissing === undefined) return

  // Preserve the exact slot list for materializable layouts. Wider declarations are compared as
  // ranges so that a rejected edit does not allocate or print a frame list that cannot exist.
  if (
    spriteDefinitionFrameDemand({ layout: previous.layout }) > INDEXED_RLE_MAX_FRAME_SLOTS ||
    spriteDefinitionFrameDemand({ layout: next.layout }) > INDEXED_RLE_MAX_FRAME_SLOTS
  )
    throw new Error(`布局会新增越界帧 ${firstMissing}（首个），资源实际只有 ${actualFrameCount} 帧`)

  const previousFrames = spriteDefinitionFrameIndices(previous)
  const added = [...spriteDefinitionFrameIndices(next)].filter(
    (frame) => frame >= actualFrameCount && !previousFrames.has(frame),
  )
  throw new Error(`布局会新增越界帧 ${added.join(', ')}，资源实际只有 ${actualFrameCount} 帧`)
}

/**
 * 改精灵字段(layout/poses/label)。语义同 UpdateEntityCommand:首次 apply 捕获旧值,invert 还原。
 * layout/poses 是对象 → 深拷贝入参 + 捕获时深拷贝旧值(防回写)。
 */
export class UpdateSpriteCommand implements Command {
  readonly label = '修改精灵'
  private readonly spriteId: string
  private readonly patch: SpritePatch
  private oldPatch: SpritePatch | undefined

  constructor(
    spriteId: string,
    patch: SpritePatch,
    private readonly proof?: SpriteLayoutEditProof,
    private readonly currentReferences?: CurrentProjectReferenceIndexProvider,
  ) {
    this.spriteId = spriteId
    this.patch = structuredClone(patch)
  }

  apply(state: EditorState): EditorState {
    const sp = state.sprites.find((s) => s.id === this.spriteId)
    if (!sp) return state
    if ('layout' in this.patch || 'poses' in this.patch) {
      const proof = this.proof
      assertCurrentLayoutProof(state.assetCatalog, sp.asset, proof)
      const next = { ...sp, ...this.patch }
      assertSpriteEditShape(next)
      if ('poses' in this.patch) {
        const removedActionIds = Object.keys(sp.poses ?? {}).filter(
          (actionId) => !next.poses?.[actionId],
        )
        if (removedActionIds.length) {
          if (!this.currentReferences)
            throw new Error('删除预制动作前无法读取 current-author 引用索引')
          const referenceIndex = this.currentReferences(state)
          const blocking = removedActionIds.flatMap(
            (actionId) =>
              referenceIndex.deletionImpact({
                kind: 'world-sprite-action',
                spriteId: sp.id,
                actionId,
              }).blockers,
          )
          if (blocking.length)
            throw new SpriteInUseError(
              `精灵 ${sp.id} 的动作 ${removedActionIds.join('、')}`,
              blocking,
            )
        }
      }
      assertDoesNotAddMissingFrames(sp, next, proof.actualFrameCount)
    }
    if (!this.oldPatch) this.oldPatch = this.captureOld(sp)
    return withSprite(state, this.spriteId, { ...sp, ...this.patch })
  }

  private captureOld(sp: SpriteDef): SpritePatch {
    const old: SpritePatch = {}
    if ('layout' in this.patch) old.layout = structuredClone(sp.layout)
    if ('poses' in this.patch) old.poses = sp.poses ? structuredClone(sp.poses) : undefined
    if ('label' in this.patch) old.label = sp.label
    return old
  }

  invert(state: EditorState): EditorState {
    if (!this.oldPatch) return state
    const sp = state.sprites.find((s) => s.id === this.spriteId)
    if (!sp) return state
    return withSprite(state, this.spriteId, { ...sp, ...this.oldPatch })
  }
}

/**
 * 给已经入库的帧资源增加一种语义用途。
 *
 * 与 AddSpriteCommand 不同，这里不创建或重写 catalog/blob；实际帧数证明把新用途
 * 约束在已经成功解码的资源事实内，避免给项目新增越界布局债。
 */
export class AddSpriteDefinitionCommand implements Command {
  readonly label = '新增精灵用途'
  private readonly definition: SpriteDef
  private added = false

  constructor(
    definition: SpriteDef,
    private readonly proof: SpriteLayoutEditProof,
  ) {
    this.definition = structuredClone(definition)
  }

  apply(state: EditorState): EditorState {
    if (state.sprites.some((sprite) => sprite.id === this.definition.id))
      throw new Error(`精灵定义 id 已存在: ${this.definition.id}`)
    assertCurrentLayoutProof(state.assetCatalog, this.definition.asset, this.proof)
    validateSprites([this.definition], state.assetCatalog)
    const demand = spriteDefinitionFrameDemand(this.definition)
    if (demand > this.proof.actualFrameCount)
      throw new Error(
        `精灵用途 ${this.definition.id} 需要 ${demand} 帧，资源实际只有 ${this.proof.actualFrameCount} 帧`,
      )
    this.added = true
    return { ...state, sprites: [...state.sprites, structuredClone(this.definition)] }
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return {
      ...state,
      sprites: state.sprites.filter((sprite) => sprite.id !== this.definition.id),
    }
  }
}

/** 删除语义定义；资产是独立对象，绝不随定义静默级联。 */
export class RemoveSpriteDefinitionCommand implements Command {
  readonly label = '删除精灵定义'
  private removed: SpriteDef | undefined
  private removedIndex: number | undefined

  constructor(
    private readonly spriteId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.sprites.findIndex((s) => s.id === this.spriteId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'world-sprite',
      id: this.spriteId,
    }).blockers
    if (references.length) throw new SpriteInUseError(`精灵定义 ${this.spriteId}`, references)
    if (!this.removed) {
      this.removed = structuredClone(state.sprites[index]!)
      this.removedIndex = index
    }
    return {
      ...state,
      sprites: state.sprites.filter((s) => s.id !== this.spriteId),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const sprites = [...state.sprites]
    sprites.splice(this.removedIndex, 0, this.removed)
    return { ...state, sprites }
  }
}
