/**
 * AudioManager —— shell 层 SFX 播放与 BGM 意图转发。
 *
 * 架构:core / event-system **不碰 Web Audio**,只发音频意图到 GameState:
 *   - SFX:`gs.pendingSounds`(number[] 队列;opcode 0x47 / 战斗 / 菜单 push)→ 本 manager 每帧 drain 播。
 *   - BGM:`gs.wNumMusic`(当前 track,0=停)+ `gs.musicLoop` → 本 manager 轮询 track 变化即切。
 *
 * 资源(M4 已提取，由 Vite 的 /extracted 中间件映射到 data/extracted):
 *   - SFX:SOUNDS.MKF chunk → `/extracted/sounds/{id}.wav`(RIFF,decodeAudioData 直接解)。
 *   - BGM:由当前 MIDI/RIX 后端取对应资源，manager 经 setMusicBackend 接收播放端口。
 *
 * sdlpal 真值:`AUDIO_PlaySound(num)`(sound.c) / `AUDIO_PlayMusic(num, loop, fade)`(audio.c)。
 *
 * 浏览器 autoplay policy:AudioContext 须在用户手势后 resume() —— shell 在 keydown/pointerdown 手势中调 resume()。
 * 测试 / SSR(无 window.AudioContext)→ 退化为 no-op(loadSfx/play 静默跳过),sync 的转发逻辑仍可单测。
 */

/** BGM 播放后端(M6b 注入:MIDI/RIX)。M6a 缺省 no-op。 */
export interface MusicBackend {
  /** Initialization errors are reported by the source selector. */
  ready?: Promise<void>
  /** 播 track(looped);track 同号重复调应幂等(已在播则不重启)。 */
  play(track: number, loop: boolean): void
  /** 停(可选淡出)。 */
  stop(fadeMs?: number): void
  /** 用户手势后 resume 后端自己的 AudioContext(autoplay policy)。后端若自管 ctx 须实现此。 */
  resume?(): void
  setVolume?(value: number): void
  dispose?(): void
  setErrorHandler?(handler: (error: unknown) => void): void
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
  /** 注入当前 BGM 后端(MIDI synth / RIX)。 */
  setMusicBackend(backend: MusicBackend | undefined): void
}

/** SFX chunk id → WAV url(纯,可测)。baseUrl 约定 '/extracted'(Vite 中间件映射到 data/extracted)。 */
export function sfxUrl(baseUrl: string, soundId: number): string {
  return `${baseUrl}/sounds/${soundId}.wav`
}

/**
 * L46:SFX 同号去重(sdlpal `SOUND_Play` 头部 `lastSFX`,sound.c:769-772)。
 * `tryPlay(id)`:同号且上一份未播完 → false(不触发,抑制同号重叠/叠音);否则记 lastSFX=id 并返回 true。
 * `markEnded(id)`:该声效播完(缓冲被 SOUND_FillBuffer 消费完,sound.c:930)→ 若仍是当前 lastSFX 则复位 0。
 * 语义=同一编号在上一份未播完前不能再触发;lastSFX 只记最近一个(非"在播集合")。
 */
export function createSfxDedup(): {
  tryPlay: (id: number) => boolean
  markEnded: (id: number) => void
} {
  let lastSFX = 0
  return {
    tryPlay(id) {
      if (id === lastSFX) return false
      lastSFX = id
      return true
    },
    markEnded(id) {
      if (lastSFX === id) lastSFX = 0
    },
  }
}

/** BGM track → MIDI url(纯,可测;sdlpal midi.c:69 `Musics%s%.3d.mid`,3 位零填充)。 */
export function musicUrl(baseUrl: string, track: number): string {
  return `${baseUrl}/music/${track.toString().padStart(3, '0')}.mid`
}

/**
 * 有效 BGM track(纯,可测)。sdlpal:进战斗 `AUDIO_PlayMusic(wNumBattleMusic, TRUE)`(battle.c:728),
 * 战后 `AUDIO_PlayMusic(wNumMusic, TRUE)` 恢复场景乐(battle.c:1849)。ts:wNumMusic 持有场景 field 乐
 * (不被战斗覆盖),战斗中有效 track 切到 wNumBattleMusic;退出战斗自动回 wNumMusic。
 */
export function pickMusicTrack(
  inBattle: boolean,
  wNumMusic: number,
  wNumBattleMusic: number,
  // DM29:battle.c:717-728 进战斗序 = 停场景曲(1s 淡出)→ UTIL_Delay(200) → VIDEO_SwitchScreen
  //   揭场(360ms)→ **才**起战斗曲。ts 入场 dither fade(introFade)期间返回 0(静默),揭场完
  //   才切 battle BGM —— 修"遇敌瞬间场景曲掐断、战斗曲零延迟炸响"。
  //   (1s 淡出/淡入:本项目音乐走 MIDI 后端,C 的 native MIDI 同样丢 flFadeTime(audio.c
  //   MIDI_Play 不收 fade)→ 忠实不做 gain ramp,只做结构性时序。)
  battleIntroActive = false,
): number {
  if (inBattle && battleIntroActive) return 0
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

// SFX(sounds/*.wav)音量系数(0..1,默认 1)。playSfx 经增益节点应用;改动影响后续 SFX(SFX 短,无需刷正在播的)。
let sfxScale = 1
export function setSfxVolume(s: number): void {
  sfxScale = s < 0 ? 0 : s > 1 ? 1 : s
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
  let curMusicLoop = true // L47:记录当前曲真实 loop 标志,补播(开关音乐/注入后端)时还原,而非硬编码 true
  const sfxDedup = createSfxDedup() // L46:SFX 同号去重(sound.c:769-772 lastSFX)

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

  function play(c: AudioContext, buf: AudioBuffer, soundId: number): void {
    // ctx 未解锁(autoplay 挂起)→ 跳过(src.start 会抛 "AudioContext was not allowed to start";
    //   且用户尚未交互,丢这一下 SFX 无妨)。解锁(首个手势 resume)后 ctx='running' 才真播。
    if (c.state !== 'running') {
      sfxDedup.markEnded(soundId) // L46:没真播 → 立即复位,避免 lastSFX 卡住后续同号
      return
    }
    const src = c.createBufferSource()
    src.buffer = buf
    // 经增益节点 → 受 SFX 音量(sfxScale)控制(工具面板音效滑块);src→gain→destination。
    const g = c.createGain()
    g.gain.value = sfxScale
    src.connect(g).connect(c.destination)
    src.onended = () => sfxDedup.markEnded(soundId) // L46:播完复位 lastSFX(sound.c:930)
    src.start()
  }

  function playSfx(soundId: number): void {
    const c = ensureCtx()
    if (!c || !sfxEnabled) return
    // L46:同号去重 —— 上一份同 id SFX 还没播完(onended 未触发)时不再触发(sound.c:769-772)。
    if (!sfxDedup.tryPlay(soundId)) return
    const buf = sfxBuffers.get(soundId)
    if (buf) {
      play(c, buf, soundId)
      return
    }
    // 未缓存 → 加载完**即补播**(首次也响;fetch+decode 仅数十 ms,远胜旧"迟到不补播"的首次静音 —
    //   sdlpal 声音常驻内存无此 gap)。再 check sfxEnabled(加载途中可能被菜单关掉)。
    void loadSfx(soundId).then((b) => {
      if (b && sfxEnabled) play(c, b, soundId)
      else sfxDedup.markEnded(soundId) // L46:加载失败/被禁 → 复位,不卡住后续同号
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
      if (music.track !== curMusicTrack || music.loop !== curMusicLoop) {
        curMusicTrack = music.track
        curMusicLoop = music.loop // L47:记真实 loop,供补播(开关音乐/注入后端)还原
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
      else if (curMusicTrack > 0) musicBackend?.play(curMusicTrack, curMusicLoop) // L47:用真实 loop(非循环场景曲开关音乐不被强制循环)
    },
    setMusicBackend(backend) {
      if (musicBackend === backend) return
      musicBackend?.stop()
      musicBackend?.dispose?.()
      musicBackend = backend
      // 注入后端时若已有当前 track → 立即起播(覆盖 M6a no-op 期间漏播的 BGM)。
      if (backend && musicEnabled && curMusicTrack > 0) backend.play(curMusicTrack, curMusicLoop) // L47:用真实 loop
    },
  }
}
