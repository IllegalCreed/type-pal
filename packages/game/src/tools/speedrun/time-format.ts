// time-format.ts —— 速通计时时间格式化(纯函数)。
const pad = (n: number): string => String(n).padStart(2, '0')

/** 调用方提供有限毫秒 → "H:MM:SS.CC"；厘秒向下截断，负数按 0 处理。 */
export function formatClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms))
  const cc = Math.floor((t % 1000) / 10)
  const s = Math.floor(t / 1000)
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}.${pad(cc)}`
}

/** 调用方提供有限毫秒 → "H:MM:SS"；向下截断到秒，负数按 0 处理。 */
export function formatHms(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** 文本入口："H:MM:SS" / "M:SS" → 有限毫秒；各段可有首尾空白，分/秒为 0–59，非法返回 null。 */
export function parseHms(s: string): number | null {
  const parts = s.split(':').map((p) => p.trim())
  if (parts.length < 2 || parts.length > 3) return null
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : Number.NaN))
  if (nums.some((n) => !Number.isFinite(n))) return null
  const [h, m, sec] = parts.length === 3 ? nums : [0, ...nums]
  if (h === undefined || m === undefined || sec === undefined) return null
  if (m > 59 || sec > 59) return null
  const totalMs = ((h * 60 + m) * 60 + sec) * 1000
  return Number.isFinite(totalMs) ? totalMs : null
}

/** 有限差值毫秒 → "±M:SS"；绝对值截断到秒，保留子秒正负号，精确 0 显示 "0:00"。 */
export function formatDiff(ms: number): string {
  const sign = ms < 0 ? '-' : ms > 0 ? '+' : ''
  const s = Math.floor(Math.abs(ms) / 1000)
  return `${sign}${Math.floor(s / 60)}:${pad(s % 60)}`
}
