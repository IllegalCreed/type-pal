/**
 * BGM 播放器(W5/X2)—— SpessaSynth 运行时 MIDI 合成(移植一阶段 audio-midi.ts 工程知识)。
 * 浏览器不能裸播 MIDI(要 soundfont 音色)。worklet 属应用壳；TimGM6mb soundfont 属工程资源，
 * 由 manifest 具名角色经 AssetResolver 读取(作者拍板“更像原版，别换大库”)。
 *
 * 一阶段考证守卫(全带):
 * - AudioWorklet 仅 secure context(http 局域网 IP 会"有音效没 BGM")→ 识破给准确提示
 * - soundfont 缺失时 vite SPA fallback 回 HTML → RIFF 魔数守卫识破
 * - 仙剑原 OPL/MIDI 偏干 → CC91 混响 = 0 并 lockController(防 MIDI 自带 CC91 拉高)
 * - skipToFirstNoteOn: false —— 曲头静音是作曲者设的循环间隔,跳掉会循环显赶
 * - autoplay:play 记 last,ctx 解锁(用户手势 resume)后补播;resume 防重入
 * - 懒初始化:首次 play 才拉 worklet+soundfont —— 不放曲的工程(demo)零开销
 */
import type { AssetId, AssetKind, AssetRole } from '@type-pal/content'
import { initializeBrowserSpessaSynth } from './spessa-browser-runtime.js'

export interface AudioAssetReader {
  readBytes(asset: AssetId, expectedKind?: AssetKind): Promise<ArrayBuffer>
  readRoleBytes(role: AssetRole): Promise<ArrayBuffer>
}

export interface BgmPlayer {
  /**
   * 按稳定 AssetId 播放 catalog 中的 MIDI；loop 默认 true。同曲重复调用不重启。
   * fadeInMs>0 = 换曲串行过渡(旧曲 fade-out 后新曲 fade-in,时长同 fadeInMs);
   * 默认 0 = 现行为硬切(向后兼容)。
   */
  play(asset: AssetId, loop?: boolean, fadeInMs?: number): void
  /** fadeOutMs>0 = 淡出后停;默认 0 = 现行为立即停。 */
  stop(fadeOutMs?: number): void
  /** 用户手势里调:解 autoplay 锁并补播当前曲。 */
  resume(): void
  /**
   * 音乐开关(系统菜单;一阶段 AudioManager.setMusicEnabled 语义):
   * 关 → 停播但保留当前曲记账(play 调用照记);开 → 重播记账曲。幂等。
   */
  setEnabled(on: boolean): void
}

export interface BgmSequencerAdapter {
  pause(): void
  loadNewSongList(songs: Array<{ binary: ArrayBuffer; fileName: string }>): void
  loopCount: number
  play(): void
  /** D12-1:master gain 淡变(adapter 封装 AudioParam,player 层不碰)。 */
  fadeTo(value: number, ms: number): void
  /** D12-1:取消已调度 ramp 并从当前 gain 值锚定(K2b:接管时防爆音)。 */
  cancelFade(): void
}

/** D12-1 战斗音乐过渡常量(K4:集中一处,听感验收可调;涉及 fade 的调用点统一引用)。 */
export const BATTLE_MUSIC_TRANSITION_MS = 300

export interface BgmRuntimeAdapter {
  context: {
    readonly state: AudioContextState
    resume(): Promise<void>
  }
  initialize(): Promise<BgmSequencerAdapter>
}

function createBrowserBgmRuntime(resolver: AudioAssetReader): BgmRuntimeAdapter | undefined {
  const w =
    typeof window !== 'undefined'
      ? (window as unknown as {
          AudioContext?: typeof AudioContext
          webkitAudioContext?: typeof AudioContext
        })
      : undefined
  const AudioCtor = w?.AudioContext ?? w?.webkitAudioContext
  if (!AudioCtor) return undefined

  const ctx = new AudioCtor()
  return {
    context: ctx,
    async initialize() {
      const { Sequencer } = await import('spessasynth_lib')
      // D12-1:master gain —— synth → gain → destination;fade 走 gain(adapter 封装)。
      const gain = ctx.createGain()
      gain.gain.value = 1
      gain.connect(ctx.destination)
      const synth = await initializeBrowserSpessaSynth(ctx, resolver, gain, 'main')
      const seq = new Sequencer(synth, { skipToFirstNoteOn: false })
      const fadeTo = (value: number, ms: number): void => {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
        if (ms > 0) gain.gain.linearRampToValueAtTime(value, ctx.currentTime + ms / 1000)
        else gain.gain.setValueAtTime(value, ctx.currentTime)
      }
      return {
        pause: () => seq.pause(),
        loadNewSongList: (songs) => seq.loadNewSongList(songs),
        get loopCount() {
          return seq.loopCount
        },
        set loopCount(value: number) {
          seq.loopCount = value
        },
        play: () => seq.play(),
        fadeTo,
        cancelFade: () => {
          gain.gain.cancelScheduledValues(ctx.currentTime)
          gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
        },
      }
    },
  }
}

/** 测试入口：注入可控的异步后端，生产代码仍只走 createBgmPlayer。 */
export function createBgmPlayerWithRuntime(
  resolver: AudioAssetReader,
  runtime: BgmRuntimeAdapter | undefined,
): BgmPlayer {
  if (!runtime) return { play() {}, stop() {}, resume() {}, setEnabled() {} }

  const ctx = runtime.context
  let seq: BgmSequencerAdapter | undefined
  let ready = false
  let last: { asset: AssetId; loop: boolean; fadeInMs: number } | undefined
  let playing: AssetId | undefined
  /** K5:进行中的换曲目标(readBytes/fade-out 窗口);同曲守卫命中时用于取消换向其他曲的请求。 */
  let inflightTarget: AssetId | undefined
  let resuming = false
  let enabled = true // 音乐开关(系统菜单);关时 play 只记账不出声
  let requestSerial = 0

  const isCurrent = (serial: number, asset: AssetId, loop: boolean): boolean =>
    serial === requestSerial && enabled && last?.asset === asset && last.loop === loop

  async function doPlay(
    asset: AssetId,
    loop: boolean,
    serial: number,
    fadeInMs: number,
  ): Promise<void> {
    if (!seq || !enabled) return
    inflightTarget = asset
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    if (!isCurrent(serial, asset, loop)) return
    let binary: ArrayBuffer
    try {
      binary = await resolver.readBytes(asset, 'music')
    } catch (error) {
      console.warn(`[bgm] MIDI AssetId ${asset} 读取失败`, error)
      return
    }
    if (!isCurrent(serial, asset, loop)) return
    const swap = (): void => {
      const sequencer = seq
      if (!sequencer) return
      inflightTarget = undefined
      sequencer.loadNewSongList([{ binary, fileName: asset }])
      sequencer.loopCount = loop ? Infinity : 0
      sequencer.play()
      playing = asset
      // G3c 快捷路径:fadeInMs=0 也显式回全增益(此前 fade 可能把 gain 留在 0)。
      sequencer.fadeTo(1, fadeInMs)
    }
    // D12-1 串行近似换曲:旧曲 fade-out → 完成回调过 isCurrent 门(K2a)→ 换曲 + fade-in。
    // 首播 / 同曲 / fadeInMs=0 时跳过 fade-out,直接换(硬切向后兼容)。
    const needFadeOut = playing !== undefined && playing !== asset && fadeInMs > 0
    if (!needFadeOut) {
      swap()
      return
    }
    seq.fadeTo(0, fadeInMs)
    await new Promise<void>((resolve) => setTimeout(resolve, fadeInMs))
    if (!isCurrent(serial, asset, loop)) return // 被新请求接管:放弃换曲(新请求自行处理)
    swap()
  }

  function playCurrent(): void {
    if (!seq || !enabled || !last) return
    const current = last
    const serial = ++requestSerial
    void doPlay(current.asset, current.loop, serial, current.fadeInMs)
  }

  // 懒初始化:首次真要播才拉合成器库 + worklet + soundfont(~6MB)——不放曲的工程(demo)
  // 零开销,放曲工程首屏 bundle 也不背合成器。
  let initP: Promise<void> | null = null
  const ensureInit = (): Promise<void> => {
    initP ??= runtime
      .initialize()
      .then((initialized) => {
        seq = initialized
        ready = true
        playCurrent()
      })
      .catch((err: unknown) => {
        console.warn('[bgm] ✗ MIDI 后端初始化失败 → BGM 静默:', err)
      })
    return initP
  }

  return {
    play(asset, loop = true, fadeInMs = 0) {
      if (playing === asset && ctx.state === 'running') {
        last = { asset, loop, fadeInMs }
        // 同曲也是一次完整接管：取消换曲/stop 的旧 serial 与仍在 AudioParam 上的 ramp，
        // 恢复全增益，但绝不 reload/restart 当前 MIDI。
        requestSerial++
        if (inflightTarget !== undefined) inflightTarget = undefined
        seq?.cancelFade()
        seq?.fadeTo(1, 0)
        return // 同曲不重启(场景间共曲不打断)
      }
      last = { asset, loop, fadeInMs }
      if (!enabled) return // 关着:只记账(开时重播记账曲),连 init 都不拉
      if (ready) playCurrent()
      else void ensureInit() // 懒初始化;init 尾部按 last 补播
    },
    stop(fadeOutMs = 0) {
      const serial = ++requestSerial
      inflightTarget = undefined
      last = undefined
      if (!seq || playing === undefined || fadeOutMs <= 0) {
        if (seq) seq.pause()
        playing = undefined
        return
      }
      // 淡出后停;完成回调过 serial 门(K2a)——期间新 play 接管则不停旧曲。
      seq.fadeTo(0, fadeOutMs)
      void new Promise<void>((resolve) => setTimeout(resolve, fadeOutMs)).then(() => {
        if (serial === requestSerial && seq && playing !== undefined) {
          seq.pause()
          playing = undefined
        }
      })
    },
    setEnabled(on) {
      if (on === enabled) return // 幂等:无变化不重启/不重停(一阶段同款守卫)
      enabled = on
      if (!on) {
        requestSerial++
        inflightTarget = undefined
        seq?.cancelFade() // G2:fade 期间关音乐不残留 ramp
        seq?.fadeTo(0, 0)
        seq?.pause()
        playing = undefined // 停播;last 保留 → 重开续当前记账曲
      } else if (last) {
        if (ready) playCurrent()
        else void ensureInit()
      }
    },
    resume() {
      if (resuming || ctx.state !== 'suspended') return
      resuming = true
      void ctx
        .resume()
        .then(() => {
          resuming = false
          if (ready && last) playCurrent()
        })
        .catch(() => {
          resuming = false
        })
    },
  }
}

export function createBgmPlayer(resolver: AudioAssetReader): BgmPlayer {
  return createBgmPlayerWithRuntime(resolver, createBrowserBgmRuntime(resolver))
}
