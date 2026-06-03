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
  /** 混响量 CC91 reverb send(0~127,锁定防 MIDI 覆盖)。默认 0=全干(仙剑原 OPL/MIDI 偏干);
   *  嫌太干想回一点把这调成低值(如 12)。 */
  reverbAmount?: number
}

export function createSpessaSynthBackend(opts: SpessaSynthBackendOptions): MusicBackend {
  const { baseUrl, workletUrl, soundfontUrl, reverbAmount = 0 } = opts
  const w = typeof window !== 'undefined' ? (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }) : undefined
  const AudioCtor = w?.AudioContext ?? w?.webkitAudioContext
  if (!AudioCtor) return { play() {}, stop() {} } // SSR / 测试无 Web Audio → no-op

  const ctx = new AudioCtor()
  let seq: Sequencer | undefined
  let ready = false
  // 当前想播的曲(play 写入)。用于:① init 完成后补播 ② autoplay 解锁(resume)后补播。
  let last: { track: number; loop: boolean } | undefined

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
      // 守卫:soundfont(SF2/SF3/DLS)都是 RIFF 容器(魔数 "RIFF")。文件不存在时 vite dev server 会回
      //   SPA fallback(index.html,几 KB),sf.ok=true 但内容是 HTML → 这里识破,给清晰报错而非卡死解析。
      const head = new Uint8Array(sfBytes.slice(0, 4))
      const magic = String.fromCharCode(...head)
      if (magic !== 'RIFF') {
        throw new Error(
          `${soundfontUrl} 不是有效 soundfont(取到 ${sfBytes.byteLength} 字节,魔数 "${magic}" 非 "RIFF")。`
          + `多半是文件不存在 → dev server 回了 index.html。请把一个真 GM soundfont(.sf2/.sf3,通常 MB 级)`
          + `放到 packages/game/public/soundfont.sf3`,
        )
      }
      console.log(`[audio] MIDI: soundfont 已下载(${(sfBytes.byteLength / 1024 / 1024).toFixed(1)}MB),载入中…`)
      await synth.soundBankManager.addSoundBank(sfBytes, 'main')
      await synth.isReady
      // user 报"混响太严重"。仙剑原 OPL/MIDI 本就偏干 → 关混响:每 channel 设 reverb send(CC91)=0
      //   + lockController 锁住,防 MIDI 自带的 CC91 把混响重新拉高。reverbAmount(0~127)可调:0=全干,
      //   想回一点混响把 0 改成低值(如 12)。chorus(CC93)暂不动(user 只提混响)。
      const REVERB_CC = 91 as Parameters<typeof synth.controllerChange>[1]
      for (let ch = 0; ch < 16; ch++) {
        synth.controllerChange(ch, REVERB_CC, reverbAmount)
        synth.midiChannels[ch]?.lockController(REVERB_CC, true)
      }
      // skipToFirstNoteOn: false —— **不**跳 MIDI 头部静音。作曲者在曲头设的那段静音就是循环间隔;
      //   设 true 会把它跳掉 → 循环显赶(user 报)。默认 false,显式写明意图。
      seq = new Sequencer(synth, { skipToFirstNoteOn: false })
      ready = true
      console.log('[audio] MIDI BGM 后端就绪 ✓')
      if (last) void doPlay(last.track, last.loop) // 就绪前已请求的曲 → 补播
    } catch (err) {
      console.warn('[audio] ✗ MIDI BGM 后端初始化失败 → BGM 静默。多半是没放 soundfont(public/soundfont.sf3):', err)
    }
  })()

  return {
    play(track, loop) {
      last = { track, loop } // 记当前曲(就绪前 init 补播 / autoplay 解锁后 resume 补播都用)
      if (ready) void doPlay(track, loop)
    },
    stop() {
      seq?.pause()
      last = undefined
    },
    resume() {
      // 用户手势里调(bootstrap keydown → AudioManager.resume → 此):resume 本后端 AudioContext 解
      //   autoplay。此前曲被 autoplay 挡掉没出声 → resume 后重播当前曲一次确保发声。
      if (ctx.state !== 'suspended') return
      void ctx.resume().then(() => {
        if (ready && last) void doPlay(last.track, last.loop)
      }).catch(() => {})
    },
  }
}
