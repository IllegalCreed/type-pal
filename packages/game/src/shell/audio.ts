/**
 * M6 AudioManager —— shell 层 Web Audio 播放。
 *
 * 架构:core / event-system **不碰 Web Audio**,只发音频意图到 GameState:
 *   - SFX:`gs.pendingSounds`(number[] 队列;opcode 0x47 / 战斗 / 菜单 push)→ 本 manager 每帧 drain 播。
 *   - BGM:`gs.wNumMusic`(当前 track,0=停)+ `gs.musicLoop` → 本 manager 轮询 track 变化即切。
 *
 * 资源(M4 已提取,public/extracted 软链):
 *   - SFX:SOUNDS.MKF chunk → `/extracted/sounds/{id}.wav`(RIFF,decodeAudioData 直接解)。
 *   - BGM:Musics → `/extracted/music/{NNN}.mid`(MIDI;M6b 接 synth/预渲染,见 setMusicBackend)。
 *
 * sdlpal 真值:`AUDIO_PlaySound(num)`(sound.c) / `AUDIO_PlayMusic(num, loop, fade)`(audio.c)。
 *
 * 浏览器 autoplay policy:AudioContext 须在用户手势后 resume() —— shell 在首个 keydown 调 resume()。
 * 测试 / SSR(无 window.AudioContext)→ 退化为 no-op(loadSfx/play 静默跳过),syncAudio 纯逻辑仍可单测。
 */

/** BGM 播放后端(M6b 注入:MIDI synth 或预渲染 OGG)。M6a 缺省 no-op。 */
export interface MusicBackend {
  /** 播 track(looped);track 同号重复调应幂等(已在播则不重启)。 */
  play(track: number, loop: boolean): void
  /** 停(可选淡出)。 */
  stop(fadeMs?: number): void
  /** 用户手势后 resume 后端自己的 AudioContext(autoplay policy)。后端若自管 ctx 须实现此。 */
  resume?(): void
}

export interface AudioManager {
  /**
   * 每帧调:① drain pendingSounds → 播 SFX(并清空队列)② 轮询 music.track 变化 → 切 BGM。
   * 纯转发到 Web Audio / MusicBackend;无副作用可测部分见 sfxUrl / 队列清空。
   */
  sync(pendingSounds: number[] | undefined, music: { track: number; loop: boolean }): void
  /** 即时播一个 SFX(soundId = SOUNDS.MKF chunk)。战斗 SFX(shell 读 bus 事件 + gs.battleState 数据)用。 */
  playSound(soundId: number): void
  /** 用户手势(首个 keydown)后 resume AudioContext(autoplay policy)。 */
  resume(): void
  /** C1 系统菜单「音效」开关。 */
  setSfxEnabled(on: boolean): void
  /** C1 系统菜单「音乐」开关。 */
  setMusicEnabled(on: boolean): void
  /** M6b:注入 BGM 后端(MIDI synth / 预渲染播放器)。 */
  setMusicBackend(backend: MusicBackend | undefined): void
}

/** SFX chunk id → WAV url(纯,可测)。baseUrl 约定 '/extracted'(public/extracted 软链→data/extracted)。 */
export function sfxUrl(baseUrl: string, soundId: number): string {
  return `${baseUrl}/sounds/${soundId}.wav`
}

/** BGM track → MIDI url(纯,可测;sdlpal midi.c:67 `Musics/%.3d.mid`,3 位零填充)。 */
export function musicUrl(baseUrl: string, track: number): string {
  return `${baseUrl}/music/${track.toString().padStart(3, '0')}.mid`
}

/**
 * 有效 BGM track(纯,可测)。sdlpal:进战斗 `AUDIO_PlayMusic(wNumBattleMusic, TRUE)`(battle.c:728),
 * 战后 `AUDIO_PlayMusic(wNumMusic, TRUE)` 恢复场景乐(battle.c:1849)。ts:wNumMusic 持有场景 field 乐
 * (不被战斗覆盖),战斗中有效 track 切到 wNumBattleMusic;退出战斗自动回 wNumMusic。
 */
export function pickMusicTrack(inBattle: boolean, wNumMusic: number, wNumBattleMusic: number): number {
  return inBattle ? wNumBattleMusic : wNumMusic
}

/**
 * 战斗胜利曲(纯,可测)。sdlpal `PAL_BattleWon`(battle.c:1030-1032):仅 `iExpGained > 0` 时
 * `AUDIO_PlayMusic(fIsBoss ? 2 : 3, FALSE)` —— boss 战胜利曲 track 2、普通 track 3,**不循环**(FALSE)。
 * 在 'won' 结算演出期间放,结算完战斗结束(battleState 清)→ 场景乐 wNumMusic 自动恢复(battle.c:1849)。
 * 返回 -1 = 不适用(非 won / 无 exp),调用方回落 pickMusicTrack。
 */
export function battleVictoryTrack(
  battle: { phase: string; isBoss: boolean; expGained: number } | undefined,
): number {
  if (battle && battle.phase === 'won' && battle.expGained > 0) return battle.isBoss ? 2 : 3
  return -1
}

/**
 * 战斗视觉 bus 事件 → SFX id(纯,可测)。sdlpal 在各战斗 event 调 AUDIO_PlaySound(per-单位声):
 *   - 敌死(fight.c:756 wDeathSound)/ 敌攻(enemy.attackSound)/ 我攻(fight.c:2124 role.weaponSound)。
 * shell 读 bus 事件 + gs.battleState.enemies[].e / playerRoles 数据映射,返回 0 = 无音。
 * (法术 SFX = magic.sound、暴击 criticalSound 等可同模式扩展。)
 */
export function sfxForBattleEvent(
  cmd: { op: string; enemyIdx?: number; playerIdx?: number },
  enemies: ReadonlyArray<{ e: { deathSound: number; attackSound: number } }> | undefined,
  partyMembers: ReadonlyArray<number> | undefined,
  roles: Record<number, { weaponSound: number }> | undefined,
): number {
  switch (cmd.op) {
    case 'playEnemyDeath':
      return cmd.enemyIdx !== undefined ? (enemies?.[cmd.enemyIdx]?.e.deathSound ?? 0) : 0
    case 'playEnemyAttack':
      return cmd.enemyIdx !== undefined ? (enemies?.[cmd.enemyIdx]?.e.attackSound ?? 0) : 0
    case 'playPlayerAttack': {
      const roleId = cmd.playerIdx !== undefined ? partyMembers?.[cmd.playerIdx] : undefined
      return roleId !== undefined ? (roles?.[roleId]?.weaponSound ?? 0) : 0
    }
    default:
      return 0
  }
}

/**
 * BGM 后端 —— **预渲染 OGG** 播放(HTMLAudioElement,looped)。
 *
 * 浏览器不能直接播 MIDI(`Musics/{NNN}.mid`)。沿用本项目既定媒体模式(AVI 走离线
 * ffmpeg→mp4,见 memory avi-offline-ffmpeg-to-mp4):**离线** fluidsynth/timidity + SoundFont
 * 把 86 MIDI 渲染成 `music/{NNN}.ogg`(一次性 build 步,user 跑,可听验),运行时只播标准 OGG —
 * 无需运行时 synth / 巨型 soundfont 资源进仓。CD track(TRACKxx.ogg)本就是 OGG,直接命中。
 *
 * OGG 缺失(MIDI 未渲染)→ Audio.play() reject → 静默(不阻塞游戏);渲染后即有 BGM。
 */
export function createOggMusicBackend(baseUrl: string): MusicBackend {
  let cur: HTMLAudioElement | undefined
  const AudioCtor = typeof Audio !== 'undefined' ? Audio : undefined
  // 释放旧元素:仅 pause 不够 —— src 仍指向 OGG 的媒体元素其解码缓冲/网络流不会立即回收,
  // 频繁切歌会游离一串待 GC 的 HTMLAudioElement。removeAttribute('src') + load() 才确定释放底层
  // 媒体资源(用 src='' 会以 base URL 解析并触发 media 'error' 事件喷控制台;removeAttribute 干净)。
  const release = (el: HTMLAudioElement | undefined): void => {
    if (!el) return
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
  return {
    play(track, loop) {
      if (!AudioCtor) return
      release(cur)
      const a = new AudioCtor(`${baseUrl}/music/${track.toString().padStart(3, '0')}.ogg`)
      a.loop = loop
      a.volume = 0.6
      void a.play().catch(() => {}) // OGG 未渲染 / autoplay 受限 → 静默
      cur = a
    },
    stop() {
      release(cur)
      cur = undefined
    },
  }
}

type WebAudioWindow = typeof globalThis & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

export function createAudioManager(baseUrl = ''): AudioManager {
  const w = (typeof window !== 'undefined' ? window : undefined) as WebAudioWindow | undefined
  const AudioCtor = w?.AudioContext ?? w?.webkitAudioContext
  // 无 Web Audio(测试 / SSR)→ ctx 恒 undefined,所有播放静默跳过。
  let ctx: AudioContext | undefined
  const sfxBuffers = new Map<number, AudioBuffer>()
  const sfxPending = new Set<number>() // 正在 fetch/decode,避免重复请求
  let sfxEnabled = true
  let musicEnabled = true
  let musicBackend: MusicBackend | undefined
  let curMusicTrack = -1 // -1 = 未初始化;轮询时与 music.track 比较

  function ensureCtx(): AudioContext | undefined {
    if (!AudioCtor) return undefined
    if (!ctx) ctx = new AudioCtor()
    return ctx
  }

  async function loadSfx(soundId: number): Promise<AudioBuffer | undefined> {
    const c = ensureCtx()
    if (!c) return undefined
    const cached = sfxBuffers.get(soundId)
    if (cached) return cached
    if (sfxPending.has(soundId)) return undefined
    sfxPending.add(soundId)
    try {
      const res = await fetch(sfxUrl(baseUrl, soundId))
      if (!res.ok) return undefined
      const buf = await c.decodeAudioData(await res.arrayBuffer())
      sfxBuffers.set(soundId, buf)
      return buf
    } catch {
      return undefined // SFX 缺失 / 解码失败 → 静默(不阻塞游戏)
    } finally {
      sfxPending.delete(soundId)
    }
  }

  function play(c: AudioContext, buf: AudioBuffer): void {
    // ctx 未解锁(autoplay 挂起)→ 跳过(src.start 会抛 "AudioContext was not allowed to start";
    //   且用户尚未交互,丢这一下 SFX 无妨)。解锁(首个手势 resume)后 ctx='running' 才真播。
    if (c.state !== 'running') return
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start()
  }

  function playSfx(soundId: number): void {
    const c = ensureCtx()
    if (!c || !sfxEnabled) return
    const buf = sfxBuffers.get(soundId)
    if (buf) {
      play(c, buf)
      return
    }
    // 未缓存 → 加载完**即补播**(首次也响;fetch+decode 仅数十 ms,远胜旧"迟到不补播"的首次静音 —
    //   sdlpal 声音常驻内存无此 gap)。再 check sfxEnabled(加载途中可能被菜单关掉)。
    void loadSfx(soundId).then((b) => {
      if (b && sfxEnabled) play(c, b)
    })
  }

  return {
    sync(pendingSounds, music) {
      // ① SFX:drain 队列(就地清空,core 复用同一数组引用)
      if (pendingSounds && pendingSounds.length > 0) {
        for (const id of pendingSounds) playSfx(id)
        pendingSounds.length = 0
      }
      // ② BGM:track 变化即切(0 = 停)
      if (music.track !== curMusicTrack) {
        curMusicTrack = music.track
        // 诊断:每次换曲一行(非每帧)。看得到此行但没声 → OGG 未渲染(后端播 .ogg,仅 .mid 存在)。
        console.log(`[audio] BGM → track ${music.track}${music.track === 0 ? '(停)' : `(loop=${music.loop})`}`)
        if (!musicEnabled) return
        if (music.track === 0) musicBackend?.stop()
        else musicBackend?.play(music.track, music.loop)
      }
    },
    playSound(soundId) {
      if (soundId > 0) playSfx(soundId)
    },
    resume() {
      const c = ensureCtx()
      if (c && c.state === 'suspended') void c.resume()
      // BGM 后端自管 AudioContext(SpessaSynth)→ 也得在用户手势里 resume,否则 autoplay 禁声。
      musicBackend?.resume?.()
    },
    setSfxEnabled(on) {
      sfxEnabled = on // 幂等:仅影响后续 playSfx 是否发声,无副作用,可每帧调
    },
    setMusicEnabled(on) {
      if (on === musicEnabled) return // 幂等:无变化不重启/不重停(shell 可每帧调)
      musicEnabled = on
      if (!on) musicBackend?.stop()
      else if (curMusicTrack > 0) musicBackend?.play(curMusicTrack, true)
    },
    setMusicBackend(backend) {
      musicBackend = backend
      // 注入后端时若已有当前 track → 立即起播(覆盖 M6a no-op 期间漏播的 BGM)。
      if (backend && musicEnabled && curMusicTrack > 0) backend.play(curMusicTrack, true)
    },
  }
}
