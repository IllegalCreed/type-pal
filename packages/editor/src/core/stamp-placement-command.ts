import type { Command } from './commands.js'
import type { EditorState } from './edit-session.js'
import { applyPreparedProjectMapPatch } from './map-patch.js'
import type { StampPlacementPlan } from './stamp-placement.js'
import { applyStampPlacementMutation } from './stamp-placement-mutation.js'

export class StampPlacementCommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StampPlacementCommandError'
  }
}

/** 普通矩阵 + placement metadata 的单一、可逆 history 原子。 */
export class PlaceStampCommand implements Command {
  readonly label: string
  private readonly mapId: string
  private readonly beforeMap: StampPlacementPlan['baseMap']
  private readonly afterMap: StampPlacementPlan['baseMap']

  constructor(plan: StampPlacementPlan) {
    if (!plan.canApply || !plan.preparedPatch)
      throw new StampPlacementCommandError(
        plan.issues[0]?.message ??
          (plan.conflicts.length
            ? `图章目标有 ${plan.conflicts.length} 处普通内容冲突。`
            : '图章放置计划不可提交。'),
      )
    this.label = `放置图章“${plan.template.name}”`
    this.mapId = plan.mapId
    this.beforeMap = plan.baseMap

    // 顺序不可交换：先写普通值，再登记指向非空视觉槽的 placement。
    const withValues = applyPreparedProjectMapPatch(
      this.beforeMap,
      structuredClone(plan.preparedPatch),
      'next',
    )
    this.afterMap = applyStampPlacementMutation(this.beforeMap, withValues, {
      upsertPlacements: [structuredClone(plan.placement)],
    })
  }

  apply(state: EditorState): EditorState {
    const current = state.maps[this.mapId]
    if (!current) throw new StampPlacementCommandError(`地图 "${this.mapId}" 尚未加载或不存在。`)
    if (current !== this.beforeMap)
      throw new StampPlacementCommandError('图章放置计划已过期；请按当前地图重新预览后提交。')
    return { ...state, maps: { ...state.maps, [this.mapId]: this.afterMap } }
  }

  invert(state: EditorState): EditorState {
    const current = state.maps[this.mapId]
    if (!current) throw new StampPlacementCommandError(`地图 "${this.mapId}" 尚未加载或不存在。`)
    // 线性 history 会先撤销后续命令；后续命令 invert 通常产生语义相同但引用不同的新 map，
    // 因此这里不能用 afterMap 引用守卫。精确恢复 beforeMap 仍保持 metadata/矩阵无中间非法态。
    return { ...state, maps: { ...state.maps, [this.mapId]: this.beforeMap } }
  }
}
