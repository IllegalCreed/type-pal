/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C09：合成 MIDI/WAV 与 AudioContext 硬件端口替身。
 * 仅 *.cursor-r1.test 导入；decode 走真实 RIFF PCM 解析，不 mock 业务编解码。
 */
import { vi } from 'vitest'

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

export interface ParsedWavPcm {
  readonly duration: number
  readonly numberOfChannels: number
  getChannelData(channel: number): Float32Array
}

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
      channels = view.getUint16(body + 2, true)
      sampleRate = view.getUint32(body + 4, true)
    } else if (tag(at) === 'data') {
      pcm = new Uint8Array(bytes.slice(body, body + size))
    }
    at = body + size + (size % 2)
  }
  if (!channels || !sampleRate || !pcm) throw new Error('WAV 缺 fmt 或 data chunk')
  const frameBytes = channels * 2
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
      if (!data) throw new Error(`声道 ${channel} 越界`)
      return data
    },
  }
}

export interface SmfNote {
  tick: number
  length: number
  note: number
  velocity: number
}

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

export function fileOfBytes(name: string, type: string, bytes: Uint8Array): File {
  const copy = bytes.slice()
  return new File([copy.buffer as ArrayBuffer], name, { type })
}

export interface AudioPortSource {
  readonly starts: number[]
  stopCalls: number
  disconnectCalls: number
  fireEnded(): void
}

export interface AudioPortContext {
  state: AudioContextState
  currentTime: number
  resumeCalls: number
  decodeCalls: number
  closeCalls: number
  readonly sources: AudioPortSource[]
}

export interface AudioContextPort {
  readonly contexts: readonly AudioPortContext[]
}

export function installAudioContextPort(): AudioContextPort {
  const contexts: AudioPortContext[] = []
  class PortSource implements AudioPortSource {
    readonly starts: number[] = []
    stopCalls = 0
    disconnectCalls = 0
    private ended: (() => void) | undefined

    connect(_destination: unknown): void {}

    addEventListener(type: string, listener: () => void): void {
      if (type === 'ended') this.ended = listener
    }

    start(_when: number, offset = 0): void {
      this.starts.push(offset)
    }

    stop(): void {
      this.stopCalls += 1
    }

    disconnect(): void {
      this.disconnectCalls += 1
    }

    fireEnded(): void {
      this.ended?.()
      this.ended = undefined
    }
  }
  class PortAudioContext implements AudioPortContext {
    state: AudioContextState = 'suspended'
    currentTime = 0
    resumeCalls = 0
    decodeCalls = 0
    closeCalls = 0
    readonly sources: PortSource[] = []
    readonly destination = {}

    constructor() {
      contexts.push(this)
    }

    async resume(): Promise<void> {
      this.resumeCalls += 1
      this.state = 'running'
    }

    async decodeAudioData(bytes: ArrayBuffer): Promise<ParsedWavPcm> {
      this.decodeCalls += 1
      return parseWavPcm16(bytes)
    }

    createBufferSource(): PortSource {
      const source = new PortSource()
      this.sources.push(source)
      return source
    }

    async close(): Promise<void> {
      this.closeCalls += 1
      this.state = 'closed'
    }
  }
  vi.stubGlobal('AudioContext', PortAudioContext)
  vi.stubGlobal('webkitAudioContext', PortAudioContext)
  return { contexts }
}

export interface ManualAnimationFrames {
  pump(): void
  readonly pending: number
}

export function installManualAnimationFrames(): ManualAnimationFrames {
  const queue = new Map<number, FrameRequestCallback>()
  let nextId = 1
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
    const id = nextId
    nextId += 1
    queue.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    queue.delete(id)
  })
  return {
    pump() {
      const pending = [...queue.values()]
      queue.clear()
      for (const callback of pending) callback(0)
    },
    get pending() {
      return queue.size
    },
  }
}

/** 0.312s 单声道交替峰值（与旧测 0.534 端点合同错开）。 */
export const C09_SHORT_WAV_SAMPLES = Array.from({ length: 2496 }, (_, index) =>
  index % 2 === 0 ? 0.4 : -0.4,
)

export const C09_THEME_MIDI = midiSmf0([{ tick: 0, length: 48, note: 72, velocity: 100 }])
