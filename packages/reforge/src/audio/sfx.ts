/**
 * 音效播放器(M4d-3)。wav(RIFF PCM,提取自原版 SOUNDS.MKF)→ decodeAudioData → 即放。
 *
 * - AudioContext 惰性建(浏览器 autoplay 策略:首次 play 通常已有按键手势;suspended 时 resume)。
 * - 解码结果按 id 缓存(Promise 缓存,并发同 id 只 fetch 一次)。
 * - id<=0 = 无音效(原版 0 空槽语义);fetch/decode 失败静默(音效缺失不阻断战斗)。
 */
import { expectDefined } from '../defined.js'

export class SfxPlayer {
  private ctx: AudioContext | null = null
  private readonly cache = new Map<number, Promise<AudioBuffer | null>>()
  private enabled = true // 音效开关(系统菜单)
  /** 同 id 最近触发时刻(同拍折叠;一阶段 bus drain 同 tick 去重语义)。 */
  private readonly lastStart = new Map<number, number>()

  /** @param baseUrl 音效目录前缀(assetBase.sounds,如 `/extracted/sounds`)。 */
  constructor(private readonly baseUrl: string) {}

  /** 音效开关:关 → play no-op(一阶段 AudioManager.setSfxEnabled 语义)。 */
  setEnabled(on: boolean): void {
    this.enabled = on
  }

  /** 播一发(fire-and-forget)。 */
  play(id: number): void {
    if (id <= 0 || !this.enabled) return
    // 同拍(16ms 内)同 id 折叠成一响:同 tick 同音叠播 = 音量翻倍破音(一阶段坑;
    // 双击/群攻的两声各自挂不同动画帧,不靠叠播)
    const now = performance.now()
    const last = this.lastStart.get(id)
    if (last !== undefined && now - last < 16) return
    this.lastStart.set(id, now)
    const ctx = this.ensureCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    void this.load(id).then((buf) => {
      if (!buf) return
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start()
    })
  }

  private warned = false

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      this.ctx = new AudioContext()
    } catch (err) {
      if (!this.warned) {
        this.warned = true
        console.warn('[reforge] AudioContext 不可用,音效静默(无音频设备/自动化环境):', err)
      }
      return null
    }
    return this.ctx
  }

  private load(id: number): Promise<AudioBuffer | null> {
    let p = this.cache.get(id)
    if (!p) {
      p = (async () => {
        try {
          const res = await fetch(`${this.baseUrl}/${id}.wav`)
          if (!res.ok) return null
          const raw = await res.arrayBuffer()
          return await expectDefined(this.ctx).decodeAudioData(raw)
        } catch {
          return null
        }
      })()
      this.cache.set(id, p)
    }
    return p
  }
}
