// timer.ts —— 速通计时状态机:wall-clock 主时钟 + 依序打点 + 整跑 PB + 香蕉暂停/3秒倒计时恢复。
//   纯逻辑(无 DOM):由 (snapshot, nowMs) 驱动,可被测试注入。
import type { BananaConfig, Checkpoint } from './checkpoints.js'
import type { DetectorMem } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'
import type { BestTimes } from './store.js'

export type RunPhase = 'idle' | 'running' | 'paused' | 'finished'

export interface RunState {
  phase: RunPhase
  elapsedMs: number
  stepIndex: number // 0..N;==N 表示全部完成
  splits: (number | null)[] // 逐点累计 ms
  bananaPaused: boolean
  hasUnCheated: boolean
  countdownEndMs: number | null
}

export class SpeedrunTimer {
  private run: RunState
  private prevSnap: ProgressSnapshot | null = null
  private lastNowMs: number | null = null
  private mems: DetectorMem[]
  private justResumed = false
  private bestsDirty = false

  constructor(
    private readonly checkpoints: readonly Checkpoint[],
    private readonly banana: BananaConfig,
    private bests: BestTimes,
  ) {
    this.run = this.freshRun()
    this.mems = checkpoints.map(() => ({}))
  }

  private freshRun(): RunState {
    return {
      phase: 'idle',
      elapsedMs: 0,
      stepIndex: 0,
      splits: this.checkpoints.map(() => null),
      bananaPaused: false,
      hasUnCheated: false,
      countdownEndMs: null,
    }
  }

  reset(): void {
    this.run = this.freshRun()
    this.mems = this.checkpoints.map(() => ({}))
    this.prevSnap = null
    this.lastNowMs = null
    this.justResumed = false
  }

  getRun(): Readonly<RunState> {
    return this.run
  }
  getBests(): Readonly<BestTimes> {
    return this.bests
  }
  getCountdownRemainingSec(): number | null {
    if (this.run.countdownEndMs == null || this.lastNowMs == null) return null
    const rem = this.run.countdownEndMs - this.lastNowMs
    return rem > 0 ? Math.ceil(rem / 1000) : 0
  }
  /** 一次性读:本帧刚结束倒计时恢复(供 index 弹"开始!" toast)。 */
  consumeJustResumed(): boolean {
    const v = this.justResumed
    this.justResumed = false
    return v
  }
  /** 一次性读:bests 本帧被改(供 index 决定是否 saveBests)。 */
  consumeBestsDirty(): boolean {
    const v = this.bestsDirty
    this.bestsDirty = false
    return v
  }

  /** 用本局当前 splits 整条覆盖 bests(手动"设为最佳")。 */
  setBestsFromCurrentRun(): void {
    const next: BestTimes = {}
    this.checkpoints.forEach((cp, i) => {
      next[cp.id] = this.run.splits[i] ?? null
    })
    this.bests = next
    this.bestsDirty = true
  }
  clearBests(): void {
    const next: BestTimes = {}
    for (const cp of this.checkpoints) next[cp.id] = null
    this.bests = next
    this.bestsDirty = true
  }
  setBest(id: string, ms: number | null): void {
    this.bests = { ...this.bests, [id]: ms }
    this.bestsDirty = true
  }

  tick(snap: ProgressSnapshot, nowMs: number, opts: { bananaEnabled: boolean }): void {
    const run = this.run
    let dt = this.lastNowMs == null ? 0 : nowMs - this.lastNowMs
    this.lastNowMs = nowMs

    if (run.phase === 'idle') {
      if (snap.scene > 0) {
        run.phase = 'running'
        dt = 0 // 起表帧不计时:本帧作为时钟起点,dt 从下帧开始累积
      } else {
        this.prevSnap = snap
        return
      }
    }
    if (run.phase === 'finished') {
      this.prevSnap = snap
      return
    }

    // 香蕉树(反作弊/中场休息):开关开 + 本局未做过
    if (opts.bananaEnabled && !run.hasUnCheated) {
      if (!run.bananaPaused && this.atBananaTree(snap)) run.bananaPaused = true
      if (snap.inventory.has(this.banana.itemId)) {
        run.hasUnCheated = true
        if (run.bananaPaused) run.countdownEndMs = nowMs + 3000 // 拿到香蕉 → 起 3 秒倒计时
      }
    }
    // 倒计时到点 → 恢复
    if (run.countdownEndMs != null && nowMs >= run.countdownEndMs) {
      run.countdownEndMs = null
      run.bananaPaused = false
      this.justResumed = true
    }

    const live = run.phase === 'running' && !run.bananaPaused
    if (live) run.elapsedMs += Math.max(0, dt)

    // 依序打点:每帧至多推进一个节点
    if (live && run.stepIndex < this.checkpoints.length) {
      const cp = this.checkpoints[run.stepIndex]!
      if (cp.detector(snap, this.prevSnap, this.mems[run.stepIndex]!)) {
        run.splits[run.stepIndex] = run.elapsedMs
        run.stepIndex += 1
        if (run.stepIndex >= this.checkpoints.length) {
          run.phase = 'finished'
          this.maybeUpdatePB()
        }
      }
    }

    this.prevSnap = snap
  }

  private atBananaTree(snap: ProgressSnapshot): boolean {
    if (snap.scene !== this.banana.scene) return false
    return this.banana.cells.some(
      ([x, y]) => Math.abs(snap.partyX - x) <= this.banana.tolX && Math.abs(snap.partyY - y) <= this.banana.tolY,
    )
  }

  /** 通关时:本局总时间破纪录(或基准空)→ 用本局 splits 整条覆盖 bests。 */
  private maybeUpdatePB(): void {
    const lastId = this.checkpoints[this.checkpoints.length - 1]!.id
    const total = this.run.splits[this.run.splits.length - 1]
    if (total == null) return
    const pb = this.bests[lastId]
    if (pb == null || total < pb) this.setBestsFromCurrentRun()
  }
}
