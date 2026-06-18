// time-format.ts —— 速通计时时间格式化(纯函数)。
const pad = (n: number, w = 2): string => String(n).padStart(w, '0')

/** ms → "H:MM:SS.CC"(厘秒)。负数按 0 处理。 */
export function formatClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms))
  const cc = Math.floor((t % 1000) / 10)
  const s = Math.floor(t / 1000)
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}.${pad(cc)}`
}

/** ms → "H:MM:SS"。 */
export function formatHms(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** "H:MM:SS" / "HH:MM:SS" / "M:SS" → ms;非法 → null。 */
export function parseHms(s: string): number | null {
  const parts = s.split(':').map((p) => p.trim())
  if (parts.length < 2 || parts.length > 3) return null
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : Number.NaN))
  if (nums.some((n) => Number.isNaN(n))) return null
  const [h, m, sec] = parts.length === 3 ? nums : [0, nums[0], nums[1]]
  if (m > 59 || sec > 59) return null
  return ((h * 60 + m) * 60 + sec) * 1000
}

/** 差值 ms → "±M:SS"(0 显示 "0:00")。 */
export function formatDiff(ms: number): string {
  const sign = ms < 0 ? '-' : ms > 0 ? '+' : ''
  const s = Math.floor(Math.abs(ms) / 1000)
  return `${sign}${Math.floor(s / 60)}:${pad(s % 60)}`
}
