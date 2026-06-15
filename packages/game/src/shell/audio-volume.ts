/**
 * BGM 主音量 controller(0..1 + 静音,localStorage 持久)。
 *
 * `applyVolume(effective)` 由 bootstrap 注入:把有效音量(静音时 0)推给 audio-midi.setBgmVolume
 * + audio.ts 的 OGG 系数 setOggVolumeScale。controller 自身只管「目标音量 / 静音 / 持久化」,
 * 不碰 Web Audio —— 输出层缩放放到注入的 applyVolume 里。
 *
 * 构造时读回 localStorage(默认音量 0.8、未静音)并立刻 apply(),开局即上次设定。
 */
export interface AudioVolumeController {
  getVolume(): number
  setVolume(v: number): void
  isMuted(): boolean
  setMuted(m: boolean): void
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * 音量 controller(0..1 + 静音,localStorage 持久)。keyVol/keyMute 可定制 → 多通道(BGM / SFX)各一份。
 * 默认键沿用 'tp-master-volume'/'tp-muted'(BGM,向后兼容);SFX 传 'tp-sfx-volume'/'tp-sfx-muted'。
 */
export function createAudioVolumeController(opts: {
  applyVolume: (effective: number) => void
  keyVol?: string
  keyMute?: string
  defaultVolume?: number
}): AudioVolumeController {
  const keyVol = opts.keyVol ?? 'tp-master-volume'
  const keyMute = opts.keyMute ?? 'tp-muted'
  const stored = localStorage.getItem(keyVol)
  let volume = clamp01(stored === null ? (opts.defaultVolume ?? 0.8) : Number(stored) || 0)
  let muted = localStorage.getItem(keyMute) === '1'
  const apply = (): void => opts.applyVolume(muted ? 0 : volume)
  apply() // 启动即应用读回值(静音 → 推 0)
  return {
    getVolume: () => volume,
    setVolume(v) {
      volume = clamp01(v)
      localStorage.setItem(keyVol, String(volume))
      apply()
    },
    isMuted: () => muted,
    setMuted(m) {
      muted = m
      localStorage.setItem(keyMute, m ? '1' : '0')
      apply()
    },
  }
}
