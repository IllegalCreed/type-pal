/** 真实 WAV 编码：单声道 PCM16，int16 小端，v*32768 饱和缩放（0.5→16384 精确往返）。 */
export function encodeWavPcm16(samples: readonly number[], sampleRate = 8000): Uint8Array {
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
  return out
}

interface ParsedWavPcm {
  readonly duration: number
  readonly numberOfChannels: number
  getChannelData(channel: number): Float32Array
}

/** 真实 WAV 解析：RIFF chunk 遍历 + fmt 校验 + PCM16 反交错，只支持测试所需的 PCM16 子集。 */
export function parseWavPcm16(bytes: ArrayBuffer): ParsedWavPcm {
  const view = new DataView(bytes)
  const tag = (offset: number): string =>
    String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    )
  if (bytes.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')
    throw new Error('不是 RIFF/WAVE 容器')
  let channels = 0
  let sampleRate = 0
  let pcm: Uint8Array | undefined
  for (let at = 12; at + 8 <= bytes.byteLength; ) {
    const size = view.getUint32(at + 4, true)
    const body = at + 8
    if (body + size > bytes.byteLength) throw new Error('WAV chunk 越界截断')
    if (tag(at) === 'fmt ') {
      if (size < 16) throw new Error('WAV fmt chunk 过短')
      if (view.getUint16(body, true) !== 1) throw new Error('仅支持 PCM 编码的 WAV')
      channels = view.getUint16(body + 2, true)
      sampleRate = view.getUint32(body + 4, true)
      if (view.getUint16(body + 14, true) !== 16) throw new Error('仅支持 16 位 PCM 的 WAV')
    } else if (tag(at) === 'data') {
      pcm = new Uint8Array(bytes.slice(body, body + size))
    }
    at = body + size + (size % 2)
  }
  if (!channels || !sampleRate || !pcm) throw new Error('WAV 缺 fmt 或 data chunk')
  const frameBytes = channels * 2
  if (pcm.byteLength % frameBytes) throw new Error('WAV data 字节数与声道布局不符')
  const frameCount = pcm.byteLength / frameBytes
  const pcmView = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  const channelData = Array.from({ length: channels }, () => new Float32Array(frameCount))
  for (let frame = 0; frame < frameCount; frame += 1)
    for (let channel = 0; channel < channels; channel += 1)
      channelData[channel]![frame] =
        pcmView.getInt16(frame * frameBytes + channel * 2, true) / 32768
  return {
    duration: frameCount / sampleRate,
    numberOfChannels: channels,
    getChannelData(channel) {
      const data = channelData[channel]
      if (!data) throw new Error(`声道 ${channel} 越界（共 ${channels} 声道）`)
      return data
    },
  }
}

interface SmfNote {
  tick: number
  length: number
  note: number
  velocity: number
}

/** 真实 SMF format-0 编码：单轨 note on/off + End of Track，默认 96 tick/四分音符。 */
export function midiSmf0(notes: readonly SmfNote[], division = 96): Uint8Array {
  const events: Array<[number, number[]]> = []
  for (const note of notes) {
    events.push([note.tick, [0x90, note.note, note.velocity]])
    events.push([note.tick + note.length, [0x80, note.note, note.velocity]])
  }
  events.sort((a, b) => a[0] - b[0])
  const varlen = (value: number): number[] => {
    const bytes = [value & 0x7f]
    let rest = value >> 7
    while (rest > 0) {
      bytes.unshift((rest & 0x7f) | 0x80)
      rest >>= 7
    }
    return bytes
  }
  const track: number[] = []
  let last = 0
  for (const [tick, bytes] of events) {
    track.push(...varlen(tick - last), ...bytes)
    last = tick
  }
  track.push(0x00, 0xff, 0x2f, 0x00)
  const head = [
    0x4d,
    0x54,
    0x68,
    0x64,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    (division >> 8) & 0xff,
    division & 0xff,
    0x4d,
    0x54,
    0x72,
    0x6b,
    (track.length >>> 24) & 0xff,
    (track.length >>> 16) & 0xff,
    (track.length >>> 8) & 0xff,
    track.length & 0xff,
  ]
  return Uint8Array.from([...head, ...track])
}

/** File 实例（真实字节，name/type 齐备），镜像 kit.pngFileOf 的构造方式。 */
export function fileOfBytes(name: string, type: string, bytes: Uint8Array): File {
  return new File([Uint8Array.from(bytes).buffer], name, { type })
}

export const SINGLE_NOTE_MIDI = midiSmf0([{ tick: 0, length: 48, note: 72, velocity: 100 }])
