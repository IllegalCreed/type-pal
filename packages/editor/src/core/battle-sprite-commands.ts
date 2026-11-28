/** Authoring commands for battle sprite profiles, definitions and enemy bindings. */
import type { AssetId, BattleSpriteDef } from '@type-pal/content'
import { battleSpriteDefinitionFrameDemand, validateBattleSprites } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import { withEnemy } from './enemy-commands.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'
import { SpriteInUseError } from './sprite-commands.js'

/** Validate the profile shape and its demand against the just-decoded frame source. */
export function assertBattleSpriteDefinition(
  definition: BattleSpriteDef,
  catalog: EditorState['assetCatalog'],
  actualFrameCount: number,
): void {
  validateBattleSprites([definition], catalog)
  if (!Number.isInteger(actualFrameCount) || actualFrameCount <= 0)
    throw new Error('战斗精灵实际帧数必须是正整数')
  const demand = battleSpriteDefinitionFrameDemand(definition, actualFrameCount)
  if (demand > actualFrameCount)
    throw new Error(
      `战斗精灵定义 ${definition.id} 需要 ${demand} 帧，资源实际只有 ${actualFrameCount} 帧`,
    )
}

export type BattleSpritePatch = Partial<Pick<BattleSpriteDef, 'label' | 'asset' | 'profile'>>

export interface BattleSpriteEditProof {
  asset: AssetId
  sha256: string
  actualFrameCount: number
}

/** 改定义标签/资源/profile；ABI 编辑必须绑定一次实际解码证明。 */
export class UpdateBattleSpriteDefinitionCommand implements Command {
  readonly label = '修改战斗精灵定义'
  private oldDefinition: BattleSpriteDef | undefined

  constructor(
    private readonly definitionId: string,
    private readonly patch: BattleSpritePatch,
    private readonly proof?: BattleSpriteEditProof,
    private readonly currentReferences?: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const current = state.battleSprites.find((entry) => entry.id === this.definitionId)
    if (!current) return state
    const next = { ...current, ...structuredClone(this.patch) }
    const record = state.assetCatalog.assets[next.asset]
    if (!record || record.kind !== 'battle-sprite')
      throw new Error(`战斗精灵 AssetId ${next.asset} 不在 catalog`)
    if ('asset' in this.patch || 'profile' in this.patch) {
      if (!this.proof || this.proof.asset !== next.asset || this.proof.sha256 !== record.sha256)
        throw new Error('战斗精灵 ABI 证明缺失或已过期，请等待资源重新载入')
      assertBattleSpriteDefinition(next, state.assetCatalog, this.proof.actualFrameCount)
    } else validateBattleSprites([next], state.assetCatalog)
    const profileKindChanged = next.profile.kind !== current.profile.kind
    if (profileKindChanged && !this.currentReferences)
      throw new Error('修改战斗精灵 profile 类型前无法读取 current-author 引用索引')
    const wrongReference = profileKindChanged
      ? this.currentReferences!(state)
          .referencesTo({ kind: 'battle-sprite', id: this.definitionId })
          .find(
            (reference) =>
              reference.relation.kind === 'battle-sprite-use' &&
              reference.relation.expectedProfile !== next.profile.kind,
          )
      : undefined
    if (wrongReference)
      throw new Error(
        `战斗精灵定义 ${this.definitionId} 的 profile 与引用 ${wrongReference.where} 不兼容`,
      )
    this.oldDefinition ??= structuredClone(current)
    return {
      ...state,
      battleSprites: state.battleSprites.map((entry) =>
        entry.id === this.definitionId ? next : entry,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.oldDefinition) return state
    return {
      ...state,
      battleSprites: state.battleSprites.map((entry) =>
        entry.id === this.definitionId ? this.oldDefinition! : entry,
      ),
    }
  }
}

/** 删除语义定义；仍有任意持久引用时 fail-loud，资产不静默级联。 */
export class RemoveBattleSpriteDefinitionCommand implements Command {
  readonly label = '删除战斗精灵定义'
  private removed: BattleSpriteDef | undefined
  private removedIndex: number | undefined

  constructor(
    private readonly definitionId: string,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const index = state.battleSprites.findIndex((entry) => entry.id === this.definitionId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'battle-sprite',
      id: this.definitionId,
    }).blockers
    if (references.length)
      throw new SpriteInUseError(`战斗精灵定义 ${this.definitionId}`, references)
    this.removed ??= structuredClone(state.battleSprites[index]!)
    this.removedIndex ??= index
    return {
      ...state,
      battleSprites: state.battleSprites.filter((entry) => entry.id !== this.definitionId),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed || this.removedIndex === undefined) return state
    const definitions = [...state.battleSprites]
    definitions.splice(this.removedIndex, 0, this.removed)
    return { ...state, battleSprites: definitions }
  }
}

/** 只切换敌人语义定义；上传新资产时由 CompositeCommand 与 AddBattleSpriteCommand 原子组合。 */
export class SetEnemyBattleSpriteCommand implements Command {
  readonly label = '设置敌人战斗精灵'
  private previous: string | undefined

  constructor(
    private readonly enemyId: string,
    private readonly definitionId: string,
  ) {}

  apply(state: EditorState): EditorState {
    const enemy = (state.enemies ?? []).find((entry) => entry.id === this.enemyId)
    if (!enemy) return state
    const definition = state.battleSprites.find((entry) => entry.id === this.definitionId)
    if (!definition || definition.profile.kind !== 'enemy')
      throw new Error(`敌人只能引用 enemy profile：${this.definitionId}`)
    this.previous ??= enemy.battleSprite
    return withEnemy(state, this.enemyId, { ...enemy, battleSprite: this.definitionId })
  }

  invert(state: EditorState): EditorState {
    if (this.previous === undefined) return state
    const enemy = (state.enemies ?? []).find((entry) => entry.id === this.enemyId)
    return enemy ? withEnemy(state, this.enemyId, { ...enemy, battleSprite: this.previous }) : state
  }
}
