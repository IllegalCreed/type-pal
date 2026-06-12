/**
 * M6b BGM 后端 —— SpessaSynth 运行时 MIDI 合成(WorkletSynthesizer + Sequencer)。
 *
 * 浏览器不能裸播 MIDI(只有音符,要 soundfont 音色库)。SpessaSynth 在 AudioWorklet 里跑 SF2/SF3
 * 软合成,直接播提取的 `Musics/{NNN}.mid` —— 开箱即响(对比离线 OGG 渲染需 build 步)。
 *
 * **运行前置**:
 *   1. `pnpm --filter @type-pal/game add spessasynth_lib`(已装)。
 *   2. worklet 文件 `spessasynth_processor.min.js` 已 vendored 到 public/(随 lib 更新需重拷)。
 *   3. `packages/game/public/soundfont.sf3` 已随仓库提供(TimGM6mb ~6MB,GPL-2;2026-06-12 从
 *      32MB GeneralUser GS 换轻量库压慢网启动等待,license/还原说明见同目录 soundfont-LICENSE.txt。
 *      文件名保持 .sf3 不动 URL,synth 按 RIFF 内容识别格式,SF2 装在 .sf3 名下兼容)。缺失或替换失败
 *      → init 失败 + warn,BGM 静默(不阻塞游戏)。
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
  /** GM SoundFont url(public/ 下,约定 '/soundfont.sf3')。 */
  soundfontUrl: string
  /**
   * 预取的 soundfont 数据(bootstrap 在 boot loading 阶段下载,计入启动进度)。
   * 提供时 init 不再二次 fetch(vite dev 对 public/ 无缓存头,二次 fetch 会整文件重下);
   * promise reject → 回退按 soundfontUrl 自取。
   */
  soundfontData?: Promise<ArrayBuffer>
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
  let resuming = false // resume() 防重入(解锁监听持续触发,ctx.resume() pending 期间不重复 doPlay)

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
  }

  // 异步初始化:worklet + synth + soundfont + sequencer。失败 → warn 静默(不阻塞)。
  void (async () => {
    try {
      // AudioWorklet 仅在 secure context 下存在(https / http://localhost)。用 http:// + 局域网 IP
      //   (如 http://192.168.x.x:5173)访问时 `ctx.audioWorklet` 为 undefined → addModule 会抛
      //   "Cannot read properties of undefined"。SFX 走 decodeAudioData/createBufferSource 不受此限,故
      //   会出现"有音效没 BGM"。先识破给准确提示,别让下面 catch 误报成"没放 soundfont"。
      if (!ctx.audioWorklet) {
        const secure = typeof window !== 'undefined' ? window.isSecureContext : false
        throw new Error(
          `AudioWorklet 不可用:当前非 secure context(isSecureContext=${secure})。`
          + '多半是用了 http:// 局域网 IP 访问。请改用 https:// 或 http://localhost 打开。',
        )
      }
      await ctx.audioWorklet.addModule(workletUrl)
      const synth = new WorkletSynthesizer(ctx)
      synth.connect(ctx.destination)
      // 优先用 bootstrap 预取的数据(boot 进度条已等它);预取 reject → 回退自取。
      let sfBytes = opts.soundfontData
        ? await opts.soundfontData.catch(() => undefined)
        : undefined
      if (!sfBytes) {
        const sf = await fetch(soundfontUrl)
        if (!sf.ok) throw new Error(`soundfont ${soundfontUrl} 取不到(HTTP ${sf.status})—— 放一个 GM .sf3/.sf2 到 packages/game/public/soundfont.sf3`)
        sfBytes = await sf.arrayBuffer()
      }
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
      // DEV-only 调试探针:console 可接 AnalyserNode 量 RMS(排查"某段 BGM 几乎听不到"类问题),
      //   也可直接看 seq/synth 状态。生产构建 DEV=false 整段 tree-shake。
      if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
        ;(window as unknown as Record<string, unknown>).__tpmidi = { ctx, synth, getSeq: () => seq }
      }
      if (last) void doPlay(last.track, last.loop) // 就绪前已请求的曲 → 补播
    } catch (err) {
      // 具体原因在 err 里(secure-context 缺 AudioWorklet / soundfont 取不到 / 不是 RIFF 等)—— 别在这
      //   硬猜成"没放 soundfont"误导排查。
      console.warn('[audio] ✗ MIDI BGM 后端初始化失败 → BGM 静默:', err)
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
      // 用户手势里调(bootstrap keydown/pointerdown → AudioManager.resume → 此):resume 本后端
      //   AudioContext 解 autoplay。此前曲被 autoplay 挡掉没出声 → resume 后重播当前曲一次确保发声。
      //   resuming 守卫:解锁监听持续触发,ctx.resume() pending 期间(ctx 仍 'suspended')多个手势不重复
      //   doPlay(否则 BGM 在解锁瞬间被重启多次)。
      if (resuming || ctx.state !== 'suspended') return
      resuming = true
      void ctx.resume().then(() => {
        resuming = false
        if (ready && last) void doPlay(last.track, last.loop)
      }).catch(() => { resuming = false })
    },
  }
}
