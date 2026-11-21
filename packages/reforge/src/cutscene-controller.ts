import type { AssetId, DialogueCue, GridPos } from '@type-pal/content'
import type { Cutscene, FadeColor, PresentationIntent } from './presentation-intent.js'

export interface CutsceneExecutor {
  dialog(cue: DialogueCue, signal: AbortSignal): Promise<void>
  clearDialog(): void
  fade(
    dir: 'in' | 'out',
    ms: number,
    color: FadeColor | undefined,
    signal: AbortSignal,
  ): Promise<void>
  cameraPan(
    dx: number,
    dy: number,
    frames: number,
    signal: AbortSignal,
    startImmediately?: true,
  ): Promise<void>
  cameraSnap(to: GridPos | undefined): void
  frameAnimation(
    opts: {
      asset: AssetId
      startFrame?: number
      endFrame?: number
      frameRate?: number
      holdLastFrame?: boolean
      initialFadeInMs?: number
    },
    signal: AbortSignal,
  ): Promise<void>
  video(asset: AssetId, signal: AbortSignal): Promise<void>
  clearFrameAnimation(): void
  wait(ms: number, signal: AbortSignal): Promise<void>
  /** K3:abortScript 呈现复位(fade→透明 / camera→(0,0) / dialog→close / 动画→reset)。 */
  resetPresentation(): void
}

/** Dispatches each caller’s effects in order. Executors own their own media, clock and cancellation. */
export class CutsceneController {
  private readonly activeRuns = new Set<AbortSignal>()
  private readonly isRunnerActive: () => boolean

  constructor(
    private readonly exec: CutsceneExecutor,
    opts: { isRunnerActive(): boolean },
  ) {
    this.isRunnerActive = opts.isRunnerActive
  }

  /** Holds presentation during a run and while the host runner moves between effects. */
  busy(): boolean {
    return this.activeRuns.size > 0 || this.isRunnerActive()
  }

  /** Runs effects sequentially; an abort is checked before dispatch and passed to the executor. */
  async run(cutscene: Cutscene, signal: AbortSignal): Promise<void> {
    this.activeRuns.add(signal)
    try {
      for (const intent of cutscene) {
        signal.throwIfAborted()
        await this.execute(intent, signal)
      }
    } finally {
      this.activeRuns.delete(signal)
    }
  }

  /**
   * 后台逻辑等待共用同一个 gameplay-clock executor 和 AbortSignal，但不声明呈现占用。
   *
   * auto 实体、重生计时等都会走宿主 wait；若把纯等待加入 activeRuns，任一常驻 auto
   * 脚本就会永久冻结明雷追逐与生命周期世界拍。交互脚本仍由 isRunnerActive() 保持 busy，
   * 真正的 cutscene wait 仍应通过 run([{ kind: 'wait', ... }]) 计入呈现占用。
   */
  waitPassive(ms: number, signal: AbortSignal): Promise<void> {
    return this.exec.wait(ms, signal)
  }

  /**
   * K3:abortScript 呈现收口——调用方已中止在途 run 的信号(scriptAbort 链),此处执行
   * 呈现复位(幂等);非协议演出态(screenHold/dither/worldShake 等)由 abortScript 兜底。
   */
  cancelAll(): void {
    this.exec.resetPresentation()
  }

  private execute(intent: PresentationIntent, signal: AbortSignal): Promise<void> {
    switch (intent.kind) {
      case 'dialog':
        return this.exec.dialog(intent.cue, signal)
      case 'clearDialog':
        this.exec.clearDialog()
        return Promise.resolve()
      case 'fade':
        return this.exec.fade(intent.dir, intent.ms ?? 300, intent.color, signal)
      case 'cameraPan':
        return intent.startImmediately
          ? this.exec.cameraPan(intent.dx, intent.dy, intent.frames, signal, true)
          : this.exec.cameraPan(intent.dx, intent.dy, intent.frames, signal)
      case 'cameraSnap':
        this.exec.cameraSnap(intent.to)
        return Promise.resolve()
      case 'frameAnimation':
        return this.exec.frameAnimation(
          {
            asset: intent.asset,
            ...(intent.startFrame !== undefined ? { startFrame: intent.startFrame } : {}),
            ...(intent.endFrame !== undefined ? { endFrame: intent.endFrame } : {}),
            ...(intent.frameRate !== undefined ? { frameRate: intent.frameRate } : {}),
            ...(intent.holdLastFrame !== undefined ? { holdLastFrame: intent.holdLastFrame } : {}),
            ...(intent.initialFadeInMs !== undefined
              ? { initialFadeInMs: intent.initialFadeInMs }
              : {}),
          },
          signal,
        )
      case 'clearFrameAnimation':
        this.exec.clearFrameAnimation()
        return Promise.resolve()
      case 'video':
        return this.exec.video(intent.asset, signal)
      case 'wait':
        return this.exec.wait(intent.ms, signal)
    }
  }
}
