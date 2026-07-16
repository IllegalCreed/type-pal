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

export interface AudioAssetReader {
  readBytes(asset: AssetId, expectedKind?: AssetKind): Promise<ArrayBuffer>
  readRoleBytes(role: AssetRole): Promise<ArrayBuffer>
}

export interface BgmPlayer {
  /**
   * 按稳定 AssetId 播放 catalog 中的 MIDI；loop 默认 true。同曲重复调用不重启。
   */
  play(asset: AssetId, loop?: boolean): void
  stop(): void
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
}

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
      const { Sequencer, WorkletSynthesizer } = await import('spessasynth_lib')
      if (!ctx.audioWorklet) {
        const secure = typeof window !== 'undefined' ? window.isSecureContext : false
        throw new Error(
          `AudioWorklet 不可用:非 secure context(isSecureContext=${secure})。` +
            '多半是 http:// 局域网 IP 访问 → 改 https:// 或 http://localhost。',
        )
      }
      await ctx.audioWorklet.addModule('/spessasynth_processor.min.js')
      const synth = new WorkletSynthesizer(ctx)
      synth.connect(ctx.destination)
      const sfBytes = await resolver.readRoleBytes('audio.midiSoundfont')
      const magic = String.fromCharCode(...new Uint8Array(sfBytes.slice(0, 4)))
      if (magic !== 'RIFF') {
        throw new Error(
          `soundfont 非 RIFF(魔数 "${magic}",${sfBytes.byteLength} 字节)—— 多半文件缺失、` +
            '资源角色 audio.midiSoundfont 指向了错误文件，请检查工程 assets/index.json',
        )
      }
      await synth.soundBankManager.addSoundBank(sfBytes, 'main')
      await synth.isReady
      const REVERB_CC = 91 as Parameters<typeof synth.controllerChange>[1]
      for (let ch = 0; ch < 16; ch++) {
        synth.controllerChange(ch, REVERB_CC, 0)
        synth.midiChannels[ch]?.lockController(REVERB_CC, true)
      }
      return new Sequencer(synth, { skipToFirstNoteOn: false })
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
  let last: { asset: AssetId; loop: boolean } | undefined
  let playing: AssetId | undefined
  let resuming = false
  let enabled = true // 音乐开关(系统菜单);关时 play 只记账不出声
  let requestSerial = 0

  function stopPlayback(): void {
    requestSerial++
    seq?.pause()
    last = undefined
    playing = undefined
  }

  const isCurrent = (serial: number, asset: AssetId, loop: boolean): boolean =>
    serial === requestSerial && enabled && last?.asset === asset && last.loop === loop

  async function doPlay(asset: AssetId, loop: boolean, serial: number): Promise<void> {
    if (!seq || !enabled) return
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
    seq.loadNewSongList([{ binary, fileName: asset }])
    seq.loopCount = loop ? Infinity : 0
    seq.play()
    playing = asset
  }

  function playCurrent(): void {
    if (!seq || !enabled || !last) return
    const current = last
    const serial = ++requestSerial
    void doPlay(current.asset, current.loop, serial)
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
    play(asset, loop = true) {
      if (playing === asset && ctx.state === 'running') {
        last = { asset, loop }
        return // 同曲不重启(场景间共曲不打断)
      }
      last = { asset, loop }
      if (!enabled) return // 关着:只记账(开时重播记账曲),连 init 都不拉
      if (ready) playCurrent()
      else void ensureInit() // 懒初始化;init 尾部按 last 补播
    },
    stop() {
      stopPlayback()
    },
    setEnabled(on) {
      if (on === enabled) return // 幂等:无变化不重启/不重停(一阶段同款守卫)
      enabled = on
      if (!on) {
        requestSerial++
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
