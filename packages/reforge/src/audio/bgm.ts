/**
 * 游戏 MIDI 选曲、淡变和 autoplay 的状态由播放器持有。
 * 浏览器适配器创建 AudioContext，首次需要曲目时才加载共享的合成器、worklet 和工程音色库。
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
  /** Preload one score silently and return its playback request for the reveal boundary. */
  prepare(asset: AssetId, signal: AbortSignal): Promise<() => void>
  /** fadeOutMs>0 = 淡出后停;默认 0 = 现行为立即停。 */
  stop(fadeOutMs?: number): void
  /** 用户手势里调:解 autoplay 锁并补播当前曲。 */
  resume(): void
  /**
   * 音乐开关(系统菜单;一阶段 AudioManager.setMusicEnabled 语义):
   * 关 → 停播但保留当前曲记账(play 调用照记);开 → 重播记账曲。幂等。
   */
  setEnabled(on: boolean): void
  /** End this owner permanently, including its AudioContext and any late initialization. */
  dispose(): Promise<void>
}

export interface BgmSequencerAdapter {
  pause(): void
  loadNewSongList(songs: Array<{ binary: ArrayBuffer; fileName: string }>): void
  loopCount: number
  play(): void
  /** The browser adapter owns the AudioParam and its scheduled gain. */
  fadeTo(value: number, ms: number): void
  /** Cancel the scheduled ramp and anchor the gain at its current value. */
  cancelFade(): void
}

/** 同一时长用于战斗音乐的进出过渡。 */
export const BATTLE_MUSIC_TRANSITION_MS = 300
// Optional music can use the entry window, but unavailable browser audio cannot stall battle.
const BGM_PREPARATION_TIMEOUT_MS = 1000

export interface BgmRuntimeAdapter {
  context: {
    readonly state: AudioContextState
    resume(): Promise<void>
  }
  initialize(): Promise<BgmSequencerAdapter>
  dispose?(): Promise<void> | void
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
  let disposed = false
  return {
    context: ctx,
    async dispose() {
      disposed = true
      if (ctx.state !== 'closed') await ctx.close()
    },
    async initialize() {
      const { Sequencer } = await import('spessasynth_lib')
      if (disposed) throw new Error('BGM owner 已释放')
      const gain = ctx.createGain()
      gain.gain.value = 1
      gain.connect(ctx.destination)
      const synth = await initializeBrowserSpessaSynth(ctx, resolver, gain, 'main')
      if (disposed) throw new Error('BGM owner 已释放')
      // Preserve the authored silence at the beginning of the score, including in loops.
      const seq = new Sequencer(synth, { skipToFirstNoteOn: false })
      const cancelFade = (): void => {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
      }
      const fadeTo = (value: number, ms: number): void => {
        cancelFade()
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
        cancelFade,
      }
    },
  }
}

/** Coordinates playback against the supplied runtime, including a browser with no MIDI backend. */
export function createBgmPlayerWithRuntime(
  resolver: AudioAssetReader,
  runtime: BgmRuntimeAdapter | undefined,
): BgmPlayer {
  if (!runtime)
    return {
      play() {},
      async prepare() {
        return () => {}
      },
      stop() {},
      resume() {},
      setEnabled() {},
      async dispose() {},
    }

  const ctx = runtime.context
  let sequencer: BgmSequencerAdapter | undefined
  // Keep the selection while muted or waiting for autoplay. It can differ from the audible track.
  let requestedTrack: { asset: AssetId; loop: boolean; fadeInMs: number } | undefined
  let playingAsset: AssetId | undefined
  let resuming = false
  let enabled = true // 音乐开关(系统菜单);关时 play 只记账不出声
  let requestSerial = 0
  let disposed = false
  let disposal: Promise<void> | undefined
  let finishFadeWait: (() => void) | undefined

  // A superseded/disposed request releases its timer and settles its waiter;
  // the existing serial guard then prevents that continuation from committing.
  const nextRequest = (): number => {
    const serial = ++requestSerial
    finishFadeWait?.()
    return serial
  }
  const waitForFade = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      const finish = (): void => {
        clearTimeout(timer)
        finishFadeWait = undefined
        resolve()
      }
      const timer = setTimeout(finish, ms)
      finishFadeWait = finish
    })

  const isCurrent = (serial: number, asset: AssetId, loop: boolean): boolean =>
    serial === requestSerial &&
    enabled &&
    requestedTrack?.asset === asset &&
    requestedTrack.loop === loop

  async function readScore(asset: AssetId, signal?: AbortSignal): Promise<ArrayBuffer | undefined> {
    try {
      return await resolver.readBytes(asset, 'music')
    } catch (error) {
      if (!signal?.aborted && !disposed) console.warn(`[bgm] MIDI AssetId ${asset} 读取失败`, error)
      return undefined
    }
  }

  async function doPlay(
    asset: AssetId,
    loop: boolean,
    serial: number,
    fadeInMs: number,
    prepared?: ArrayBuffer,
  ): Promise<void> {
    if (!sequencer || !enabled) return
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    if (!isCurrent(serial, asset, loop)) return
    const binary = prepared ?? (await readScore(asset))
    if (!binary || !isCurrent(serial, asset, loop)) return
    const swap = (): void => {
      const player = sequencer
      if (!player) return
      player.loadNewSongList([{ binary, fileName: asset }])
      player.loopCount = loop ? Infinity : 0
      player.play()
      playingAsset = asset
      // Even an immediate switch must restore gain after a stopped fade.
      player.fadeTo(1, fadeInMs)
    }
    const needFadeOut = playingAsset !== undefined && playingAsset !== asset && fadeInMs > 0
    if (!needFadeOut) {
      swap()
      return
    }
    sequencer.fadeTo(0, fadeInMs)
    await waitForFade(fadeInMs)
    if (!isCurrent(serial, asset, loop)) return // 被新请求接管:放弃换曲(新请求自行处理)
    swap()
  }

  function playCurrent(prepared?: ArrayBuffer): void {
    if (!sequencer || !enabled || !requestedTrack) return
    const current = requestedTrack
    const serial = nextRequest()
    void doPlay(current.asset, current.loop, serial, current.fadeInMs, prepared).catch(
      (error: unknown) => {
        if (isCurrent(serial, current.asset, current.loop))
          console.warn(`[bgm] MIDI AssetId ${current.asset} 播放失败`, error)
      },
    )
  }

  // Cache the initialization attempt, including failure, for this player instance.
  let initialization: Promise<void> | undefined
  const ensureInit = (): Promise<void> => {
    initialization ??= runtime
      .initialize()
      .then((initialized) => {
        if (disposed) {
          initialized.pause()
          return
        }
        sequencer = initialized
        playCurrent()
      })
      .catch((err: unknown) => {
        if (!disposed) console.warn('[bgm] ✗ MIDI 后端初始化失败 → BGM 静默:', err)
      })
    return initialization
  }

  function play(asset: AssetId, loop = true, fadeInMs = 0, prepared?: ArrayBuffer): void {
    if (disposed) return
    if (playingAsset === asset && ctx.state === 'running') {
      requestedTrack = { asset, loop, fadeInMs }
      // 同曲也是一次完整接管：取消换曲/stop 的旧 serial 与仍在 AudioParam 上的 ramp，
      // 恢复全增益，但绝不 reload/restart 当前 MIDI。
      nextRequest()
      sequencer?.cancelFade()
      sequencer?.fadeTo(1, 0)
      return // 同曲不重启(场景间共曲不打断)
    }
    requestedTrack = { asset, loop, fadeInMs }
    if (!enabled) return
    if (sequencer) playCurrent(prepared)
    else void ensureInit()
  }

  return {
    play,
    async prepare(asset, signal) {
      const commit = (score?: ArrayBuffer) => () => {
        if (!signal.aborted) play(asset, true, 0, score)
      }
      // Leave autoplay and mute bookkeeping to the usual play/resume path.
      if (disposed || !enabled || ctx.state !== 'running' || signal.aborted) return commit()

      const score = await new Promise<ArrayBuffer | undefined>((resolve) => {
        const finish = (bytes?: ArrayBuffer) => {
          clearTimeout(timer)
          signal.removeEventListener('abort', abort)
          resolve(bytes)
        }
        const abort = () => finish()
        const timer = setTimeout(abort, BGM_PREPARATION_TIMEOUT_MS)
        signal.addEventListener('abort', abort, { once: true })
        void Promise.all([ensureInit(), readScore(asset, signal)]).then(([, bytes]) =>
          finish(sequencer && enabled && !signal.aborted ? bytes : undefined),
        )
      })
      return commit(score)
    },
    stop(fadeOutMs = 0) {
      if (disposed) return
      const serial = nextRequest()
      requestedTrack = undefined
      if (!sequencer || playingAsset === undefined || fadeOutMs <= 0) {
        sequencer?.pause()
        playingAsset = undefined
        return
      }
      // A newer request may take over during the fade and must survive this stop.
      sequencer.fadeTo(0, fadeOutMs)
      void waitForFade(fadeOutMs).then(() => {
        if (serial === requestSerial && sequencer && playingAsset !== undefined) {
          sequencer.pause()
          playingAsset = undefined
        }
      })
    },
    setEnabled(on) {
      if (disposed) return
      if (on === enabled) return // 幂等:无变化不重启/不重停(一阶段同款守卫)
      enabled = on
      if (!on) {
        nextRequest()
        sequencer?.cancelFade()
        sequencer?.fadeTo(0, 0)
        sequencer?.pause()
        playingAsset = undefined
      } else if (requestedTrack) {
        if (sequencer) playCurrent()
        else void ensureInit()
      }
    },
    resume() {
      if (disposed || resuming || ctx.state !== 'suspended') return
      resuming = true
      void ctx
        .resume()
        .then(() => {
          resuming = false
          if (!disposed) playCurrent()
        })
        .catch(() => {
          resuming = false
        })
    },
    dispose() {
      if (disposal) return disposal
      disposed = true
      enabled = false
      nextRequest()
      requestedTrack = undefined
      playingAsset = undefined
      sequencer?.cancelFade()
      sequencer?.pause()
      disposal = Promise.resolve().then(() => runtime.dispose?.())
      return disposal
    },
  }
}

export function createBgmPlayer(resolver: AudioAssetReader): BgmPlayer {
  return createBgmPlayerWithRuntime(resolver, createBrowserBgmRuntime(resolver))
}
