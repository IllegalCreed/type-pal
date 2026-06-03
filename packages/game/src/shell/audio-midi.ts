/**
 * M6b BGM 后端 —— SpessaSynth 运行时 MIDI 合成(WorkletSynthesizer + Sequencer)。
 *
 * 浏览器不能裸播 MIDI(只有音符,要 soundfont 音色库)。SpessaSynth 在 AudioWorklet 里跑 SF2/SF3
 * 软合成,直接播提取的 `Musics/{NNN}.mid` —— 开箱即响(对比离线 OGG 渲染需 build 步)。
 *
 * **运行前置(user 一次性)**:
 *   1. `pnpm --filter @type-pal/game add spessasynth_lib`(已装)。
 *   2. worklet 文件 `spessasynth_processor.min.js` 已 vendored 到 public/(随 lib 更新需重拷)。
 *   3. **放一个 GM SoundFont** 到 `packages/game/public/soundfont.sf3`(或 .sf2)—— 任意免费 GM
 *      soundfont(licensing / 音色听感 user 定;sf3 压缩体积小)。缺失 → init 失败 + warn,BGM 静默
 *      (不阻塞游戏)。
 *
 * SpessaSynth 4.3.x API:`new WorkletSynthesizer(ctx)` → `connect` → `soundBankManager.addSoundBank`
 * → `await isReady` → `new Sequencer(synth)` → `loadNewSongList([{binary,fileName}])` / `play` / `pause`
 * / `loopCount`(Infinity = 循环)。
 */
import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib'
import type { MusicBackend } from './audio.js'

export interface SpessaSynthBackendOptions {
  /** MIDI 资源 base(`{baseUrl}/music/{NNN}.mid`)。约定 '/extracted'。 */
  baseUrl: string
  /** AudioWorklet processor url(public/ 下,约定 '/spessasynth_processor.min.js')。 */
  workletUrl: string
  /** GM SoundFont url(public/ 下,user 提供,约定 '/soundfont.sf3')。 */
  soundfontUrl: string
}

export function createSpessaSynthBackend(opts: SpessaSynthBackendOptions): MusicBackend {
  const { baseUrl, workletUrl, soundfontUrl } = opts
  const w = typeof window !== 'undefined' ? (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }) : undefined
  const AudioCtor = w?.AudioContext ?? w?.webkitAudioContext
  if (!AudioCtor) return { play() {}, stop() {} } // SSR / 测试无 Web Audio → no-op

  const ctx = new AudioCtor()
  let seq: Sequencer | undefined
  let ready = false
  let pending: { track: number; loop: boolean } | undefined

  async function doPlay(track: number, loop: boolean): Promise<void> {
    if (!seq) return
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    const url = `${baseUrl}/music/${track.toString().padStart(3, '0')}.mid`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[audio] MIDI track ${track} 取不到(${url} HTTP ${res.status})`)
      return
    }
    seq.loadNewSongList([{ binary: await res.arrayBuffer(), fileName: `${track}.mid` }])
    seq.loopCount = loop ? Infinity : 0
    seq.play()
    console.log(`[audio] MIDI ▶ track ${track}(ctx=${ctx.state}, loop=${loop})`)
  }

  // 异步初始化:worklet + synth + soundfont + sequencer。分步日志,失败 → warn 静默(不阻塞)。
  void (async () => {
    try {
      await ctx.audioWorklet.addModule(workletUrl)
      console.log('[audio] MIDI: worklet 已载')
      const synth = new WorkletSynthesizer(ctx)
      synth.connect(ctx.destination)
      const sf = await fetch(soundfontUrl)
      if (!sf.ok) throw new Error(`soundfont ${soundfontUrl} 取不到(HTTP ${sf.status})—— 放一个 GM .sf3/.sf2 到 packages/game/public/soundfont.sf3`)
      const sfBytes = await sf.arrayBuffer()
      console.log(`[audio] MIDI: soundfont 已下载(${(sfBytes.byteLength / 1024 / 1024).toFixed(1)}MB),载入中…`)
      await synth.soundBankManager.addSoundBank(sfBytes, 'main')
      await synth.isReady
      seq = new Sequencer(synth, { skipToFirstNoteOn: true })
      ready = true
      console.log('[audio] MIDI BGM 后端就绪 ✓')
      if (pending) {
        void doPlay(pending.track, pending.loop)
        pending = undefined
      }
    } catch (err) {
      console.warn('[audio] ✗ MIDI BGM 后端初始化失败 → BGM 静默。多半是没放 soundfont(public/soundfont.sf3):', err)
    }
  })()

  return {
    play(track, loop) {
      if (!ready) {
        pending = { track, loop } // 初始化未完 → 暂存最后一次请求,ready 后补播
        return
      }
      void doPlay(track, loop)
    },
    stop() {
      seq?.pause()
    },
  }
}
