import type { SceneReveal } from '@type-pal/content'

export type SceneEntryPhase = 'preparing' | 'revealing'

export interface ActiveSceneEntry<T> {
  token: number
  sourceSceneId: string
  targetSceneId: string
  sourceFrame: T
  reveal: SceneReveal
  phase: SceneEntryPhase
}

export interface SceneEntryRevealHandle<T> extends ActiveSceneEntry<T> {
  phase: 'revealing'
}

function sameReveal(left: SceneReveal, right: SceneReveal): boolean {
  if (left.kind !== right.kind) return false
  switch (left.kind) {
    case 'dither':
      return right.kind === 'dither' && left.ms === right.ms && left.source === right.source
    case 'fade':
      return right.kind === 'fade' && left.outMs === right.outMs && left.inMs === right.inMs
    case 'cut':
      return right.kind === 'cut'
  }
}

/**
 * 跨场景呈现事务的单一生命周期状态。它只持有“已经呈现的旧帧”和目标入场契约，
 * 不加载资产、不执行脚本；宿主在 prepare/reveal/abort 边界显式推进或收口。
 */
export class SceneEntrySession<T> {
  #nextToken = 1
  #active: ActiveSceneEntry<T> | null = null

  get active(): Readonly<ActiveSceneEntry<T>> | null {
    return this.#active
  }

  begin(sourceSceneId: string, targetSceneId: string, sourceFrame: T, reveal: SceneReveal): number {
    const token = this.#nextToken++
    this.#active = {
      token,
      sourceSceneId,
      targetSceneId,
      sourceFrame,
      reveal,
      phase: 'preparing',
    }
    return token
  }

  /** prepare 从 preflight 起始终冻结旧 presented frame；fade curtain 由 compositor 叠在它上面。 */
  get heldFrame(): T | null {
    const active = this.#active
    return active?.phase === 'preparing' ? active.sourceFrame : null
  }

  startReveal(sceneId: string, reveal: SceneReveal): SceneEntryRevealHandle<T> | null {
    const active = this.#active
    // boot/读档直达没有 previous presented frame：prepare 仍执行，reveal 按 cut 处理。
    if (!active) return null
    if (active.targetSceneId !== sceneId)
      throw new Error(
        `SceneEntrySession: reveal 场景不匹配，期望 ${active.targetSceneId}，收到 ${sceneId}`,
      )
    if (!sameReveal(active.reveal, reveal))
      throw new Error(`SceneEntrySession: ${sceneId} 的 reveal 与 preflight 契约不一致`)
    active.phase = 'revealing'
    return active as SceneEntryRevealHandle<T>
  }

  complete(token: number): void {
    if (this.#active?.token === token) this.#active = null
  }

  cancel(): void {
    this.#active = null
  }
}
