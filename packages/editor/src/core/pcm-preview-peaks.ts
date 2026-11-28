export interface PcmPeaks {
  kind: 'pcm-peaks'
  duration: number
  minimums: readonly number[]
  maximums: readonly number[]
}

/** Web Audio 解码后的真实 PCM 峰值；每个 bucket 同时扫描全部声道。 */
export function computePcmPeaks(
  channels: readonly Float32Array[],
  duration: number,
  bucketCount = 160,
): PcmPeaks {
  const count = Math.max(1, Math.floor(bucketCount))
  const frameCount = channels.reduce((max, channel) => Math.max(max, channel.length), 0)
  const minimums = Array.from({ length: count }, () => 0)
  const maximums = Array.from({ length: count }, () => 0)
  if (!frameCount || !channels.length)
    return { kind: 'pcm-peaks', duration: Math.max(0, duration), minimums, maximums }

  for (let bucket = 0; bucket < count; bucket++) {
    const start = Math.floor((bucket / count) * frameCount)
    const end = Math.max(start + 1, Math.floor(((bucket + 1) / count) * frameCount))
    let minimum = Number.POSITIVE_INFINITY
    let maximum = Number.NEGATIVE_INFINITY
    for (const channel of channels) {
      for (let frame = start; frame < Math.min(end, channel.length); frame++) {
        const sample = channel[frame] ?? 0
        minimum = Math.min(minimum, sample)
        maximum = Math.max(maximum, sample)
      }
    }
    minimums[bucket] = Number.isFinite(minimum) ? minimum : 0
    maximums[bucket] = Number.isFinite(maximum) ? maximum : 0
  }
  return {
    kind: 'pcm-peaks',
    duration: Math.max(0, Number.isFinite(duration) ? duration : 0),
    minimums,
    maximums,
  }
}
