/**
 * BGM 播放器(W5/X2)—— SpessaSynth 运行时 MIDI 合成(移植一阶段 audio-midi.ts 工程知识)。
 * 浏览器不能裸播 MIDI(要 soundfont 音色)。资产:/spessasynth_processor.min.js(worklet)+
 * /soundfont.sf3(TimGM6mb ~6MB,作者拍板"更像原版,别换大库";拷自一阶段,LICENSE 同目录)。
 *
 * 一阶段考证守卫(全带):
 * - AudioWorklet 仅 secure context(http 局域网 IP 会"有音效没 BGM")→ 识破给准确提示
 * - soundfont 缺失时 vite SPA fallback 回 HTML → RIFF 魔数守卫识破
 * - 仙剑原 OPL/MIDI 偏干 → CC91 混响 = 0 并 lockController(防 MIDI 自带 CC91 拉高)
 * - skipToFirstNoteOn: false —— 曲头静音是作曲者设的循环间隔,跳掉会循环显赶
 * - autoplay:play 记 last,ctx 解锁(用户手势 resume)后补播;resume 防重入
 * - 懒初始化:首次 play 才拉 worklet+soundfont —— 不放曲的工程(demo)零开销
 */
import type { Sequencer } from 'spessasynth_lib'

export interface BgmPlayer {
  /**
   * 播 track(<track,3位零填充>.mid);loop 默认 true。同曲重复调用不重启。
   * track<=0 = 停曲(原版 AUDIO_PlayMusic(0) 语义;场景 musicId:0 / playMusic 0 依赖)。
   */
  play(track: number, loop?: boolean): void
  stop(): void
  /** 用户手势里调:解 autoplay 锁并补播当前曲。 */
  resume(): void
  /**
   * 音乐开关(系统菜单;一阶段 AudioManager.setMusicEnabled 语义):
   * 关 → 停播但保留当前曲记账(play 调用照记);开 → 重播记账曲。幂等。
   */
  setEnabled(on: boolean): void
}

export function createBgmPlayer(baseUrl = '/extracted/music'): BgmPlayer {
  const w =
    typeof window !== 'undefined'
      ? (window as unknown as {
          AudioContext?: typeof AudioContext
          webkitAudioContext?: typeof AudioContext
        })
      : undefined
  const AudioCtor = w?.AudioContext ?? w?.webkitAudioContext
  if (!AudioCtor) return { play() {}, stop() {}, resume() {}, setEnabled() {} } // 单测/无 Web Audio → no-op

  const ctx = new AudioCtor()
  let seq: Sequencer | undefined
  let ready = false
  let last: { track: number; loop: boolean } | undefined
  let playing: number | undefined // 当前在播 track(同曲不重启)
  let resuming = false
  let enabled = true // 音乐开关(系统菜单);关时 play 只记账不出声

  function stopPlayback(): void {
    seq?.pause()
    last = undefined
    playing = undefined
  }

  async function doPlay(track: number, loop: boolean): Promise<void> {
    if (!seq || !enabled) return
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    const url = `${baseUrl}/${track.toString().padStart(3, '0')}.mid`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[bgm] MIDI track ${track} 取不到(${url} HTTP ${res.status})`)
      return
    }
    seq.loadNewSongList([{ binary: await res.arrayBuffer(), fileName: `${track}.mid` }])
    seq.loopCount = loop ? Infinity : 0
    seq.play()
    playing = track
  }

  // 懒初始化:首次真要播才拉合成器库 + worklet + soundfont(~6MB)——不放曲的工程(demo)
  // 零开销,放曲工程首屏 bundle 也不背合成器。
  let initP: Promise<void> | null = null
  const ensureInit = (): Promise<void> => {
    initP ??= (async () => {
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
      const sf = await fetch('/soundfont.sf3')
      if (!sf.ok) throw new Error(`soundfont 取不到(HTTP ${sf.status})`)
      const sfBytes = await sf.arrayBuffer()
      const magic = String.fromCharCode(...new Uint8Array(sfBytes.slice(0, 4)))
      if (magic !== 'RIFF') {
        throw new Error(
          `soundfont 非 RIFF(魔数 "${magic}",${sfBytes.byteLength} 字节)—— 多半文件缺失、` +
            'dev server 回了 index.html。放真 GM soundfont 到 packages/reforge/public/soundfont.sf3',
        )
      }
      await synth.soundBankManager.addSoundBank(sfBytes, 'main')
      await synth.isReady
      // 仙剑原声偏干:混响 CC91=0 + 锁(一阶段作者实测拍板)
      const REVERB_CC = 91 as Parameters<typeof synth.controllerChange>[1]
      for (let ch = 0; ch < 16; ch++) {
        synth.controllerChange(ch, REVERB_CC, 0)
        synth.midiChannels[ch]?.lockController(REVERB_CC, true)
      }
      seq = new Sequencer(synth, { skipToFirstNoteOn: false })
      ready = true
      if (last) void doPlay(last.track, last.loop)
    })().catch((err: unknown) => {
      console.warn('[bgm] ✗ MIDI 后端初始化失败 → BGM 静默:', err)
    })
    return initP
  }

  return {
    play(track, loop = true) {
      if (track <= 0) {
        stopPlayback() // 原版 AUDIO_PlayMusic(0) = 停曲
        return
      }
      if (playing === track && ctx.state === 'running') {
        last = { track, loop }
        return // 同曲不重启(场景间共曲不打断)
      }
      last = { track, loop }
      if (!enabled) return // 关着:只记账(开时重播记账曲),连 init 都不拉
      if (ready) void doPlay(track, loop)
      else void ensureInit() // 懒初始化;init 尾部按 last 补播
    },
    stop() {
      stopPlayback()
    },
    setEnabled(on) {
      if (on === enabled) return // 幂等:无变化不重启/不重停(一阶段同款守卫)
      enabled = on
      if (!on) {
        seq?.pause()
        playing = undefined // 停播;last 保留 → 重开续当前记账曲
      } else if (last) {
        if (ready) void doPlay(last.track, last.loop)
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
          if (ready && last) void doPlay(last.track, last.loop)
        })
        .catch(() => {
          resuming = false
        })
    },
  }
}
