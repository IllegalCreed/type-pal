/**
 * BGM 选择器 + 试听(W5 编辑器)。
 *
 * - 试听走 reforge BgmPlayer(SpessaSynth MIDI 合成;worklet/soundfont 由 editor vite
 *   单文件映射到 reforge/public,见 vite.config.ts)。全局单路:同一时刻只响一首,
 *   任何 ▶ 顶掉上一首,⏹ 全局停 —— 模块级 mini-store,useSyncExternalStore 同步各按钮态。
 * - 下拉数据 = 工程音乐库(content/music.json:id+别名);库空(工程没带)退化为数字输入。
 * - 点 ▶ 本身是用户手势 → AudioContext 解锁由 BgmPlayer 内部 resume 处理。
 */
import type { MusicDef } from '@type-pal/content'
import { createBgmPlayer } from '@type-pal/reforge'
import { useSyncExternalStore } from 'react'

// ── 试听 mini-store(模块级全局单路)──
let player: ReturnType<typeof createBgmPlayer> | undefined
let playerBase: string | undefined
let playingTrack: number | null = null
const listeners = new Set<() => void>()

function notify(): void {
  for (const f of listeners) f()
}

/** 停全局试听(切模式/保存前等场景可调)。 */
export function stopPreview(): void {
  player?.stop()
  playingTrack = null
  notify()
}

function togglePreview(baseUrl: string, track: number): void {
  if (playingTrack === track) {
    stopPreview()
    return
  }
  if (!player || playerBase !== baseUrl) {
    player?.stop()
    player = createBgmPlayer(baseUrl)
    playerBase = baseUrl
  }
  player.play(track, true)
  playingTrack = track
  notify()
}

function usePlayingTrack(): number | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => playingTrack,
  )
}

/** 单曲试听按钮(▶/⏹;全局单路,后播顶前)。 */
export function PreviewButton(props: { track: number; baseUrl: string; disabled?: boolean }) {
  const playing = usePlayingTrack() === props.track
  const label = playing ? `停止试听音乐 ${props.track}` : `试听音乐 ${props.track}`
  return (
    <button
      type="button"
      className={`btn mp-play${playing ? ' on' : ''}`}
      title={label}
      aria-label={label}
      disabled={props.disabled || props.track <= 0}
      onClick={() => togglePreview(props.baseUrl, props.track)}
    >
      <span className={playing ? 'mp-stop-icon' : 'mp-play-icon'} aria-hidden="true" />
    </button>
  )
}

/** 音乐库条目显示名:别名优先,缺省 3 位零填充编号。 */
export function musicLabel(m: MusicDef): string {
  const num = m.id.toString().padStart(3, '0')
  return m.name ? `${num} ${m.name}` : num
}

/**
 * BGM 下拉 + 试听。
 * - allowUnset:含「(延续上一曲)」空选项(场景 BGM 槽语义;value undefined)。
 * - 恒含「000 停曲」(原版 playMusic 0 / musicId:0 语义)。
 * - 音乐库空 → 退化数字输入(工程没烤 music.json 也能编)。
 */
export function MusicPicker(props: {
  id?: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  music: MusicDef[]
  /** 试听资产前缀(assetBase.music)。 */
  baseUrl: string
  allowUnset?: boolean
  ariaLabel?: string
}) {
  const { id, value, onChange, music, baseUrl, allowUnset, ariaLabel = '音乐' } = props
  if (music.length === 0) {
    return (
      <span className="music-picker">
        <input
          id={id}
          className="in cf-num"
          type="number"
          aria-label={ariaLabel}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          onWheel={(e) => e.currentTarget.blur()}
        />
        <PreviewButton track={value ?? 0} baseUrl={baseUrl} />
      </span>
    )
  }
  return (
    <span className="music-picker">
      <select
        id={id}
        className="in"
        aria-label={ariaLabel}
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      >
        {allowUnset && <option value="">(延续上一曲)</option>}
        <option value="0">000 停曲</option>
        {music.map((m) => (
          <option key={m.id} value={String(m.id)}>
            {musicLabel(m)}
          </option>
        ))}
      </select>
      <PreviewButton track={value ?? 0} baseUrl={baseUrl} disabled={value === undefined} />
    </span>
  )
}
