/** 浏览器宿主用最小合法 WAV（无 vitest 依赖）。 */
export function encodeWavPcm16(samples: readonly number[], sampleRate = 8000): ArrayBuffer {
  const data = new Uint8Array(samples.length * 2)
  const dataView = new DataView(data.buffer)
  for (const [index, sample] of samples.entries()) {
    const scaled = Math.max(-32768, Math.min(32767, Math.round(sample * 32768)))
    dataView.setInt16(index * 2, scaled, true)
  }
  const out = new Uint8Array(44 + data.byteLength)
  const view = new DataView(out.buffer)
  const tag = (offset: number, value: string): void => {
    for (let at = 0; at < value.length; at += 1) out[offset + at] = value.charCodeAt(at)
  }
  tag(0, 'RIFF')
  view.setUint32(4, 36 + data.byteLength, true)
  tag(8, 'WAVE')
  tag(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  tag(36, 'data')
  view.setUint32(40, data.byteLength, true)
  out.set(data, 44)
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)
}
