/**
 * D14-2 CutsceneController——演出意图协议的执行器。
 *
 * - run(cutscene, signal):顺序执行;统一取消 = AbortSignal 贯穿(K3:无孤儿状态)。
 * - busy()(K1):呈现占用 = intent 在途 ∪ runner 活跃——脚本 runner 在跑但当前无 intent
 *   (纯逻辑段)时输入仍锁;替代 main.ts 里 runner/dialogBox.active 的拼装判定。
 * - K5 并发语义 = **资源分域**(不全局 supersede):互斥资源(fade/cameraPan/frameAnimation/
 *   video)沿用各自 supersede(fade-driver owner 先例、cameraPanFx 替换);dialog 走 slot
 *   共存不 supersede。controller 只负责顺序执行 + 统一取消收敛。
 * - K6:计时源保持在 executor 内(nowMs tick / 世界拍),控制器不换墙钟。
 */
import type { AssetId, DialogueCue, GridPos } from '@type-pal/content'
import type { Cutscene, FadeColor, PresentationIntent } from './presentation-intent.js'

export interface CutsceneExecutor {
  dialog(cue: DialogueCue, signal: AbortSignal): Promise<void>
  clearDialog(): void
  fade(dir: 'in' | 'out', ms: number, color: FadeColor | undefined, signal: AbortSignal): Promise<void>
  cameraPan(dx: number, dy: number, frames: number, signal: AbortSignal): Promise<void>
  cameraSnap(to: GridPos | undefined): void
  frameAnimation(
    opts: { asset: AssetId; startFrame?: number; endFrame?: number; frameRate?: number },
    signal: AbortSignal,
  ): Promise<void>
  video(asset: AssetId, signal: AbortSignal): Promise<void>
  wait(ms: number, signal: AbortSignal): Promise<void>
  /** K3:abortScript 呈现复位(fade→透明 / camera→(0,0) / dialog→close / 动画→reset)。 */
  resetPresentation(): void
}

export class CutsceneController {
  private readonly activeRuns = new Set<AbortSignal>()
  private readonly isRunnerActive: () => boolean

  constructor(
    private readonly exec: CutsceneExecutor,
    opts: { isRunnerActive(): boolean },
  ) {
    this.isRunnerActive = opts.isRunnerActive
  }

  /** K1:呈现占用 = intent 在途 ∪ runner 活跃。 */
  busy(): boolean {
    return this.activeRuns.size > 0 || this.isRunnerActive()
  }

  /** 顺序执行 cutscene;任一 intent AbortSignal 取消 → 整条中止(无孤儿)。 */
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
        return this.exec.cameraPan(intent.dx, intent.dy, intent.frames, signal)
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
          },
          signal,
        )
      case 'video':
        return this.exec.video(intent.asset, signal)
      case 'wait':
        return this.exec.wait(intent.ms, signal)
    }
  }
}
