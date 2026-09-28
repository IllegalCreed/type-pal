/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K07 专属夹具（只被本组测试导入，不被生产引用）。
 *
 * 边界纪律：
 * - encodeWavPcm16 / parseWavPcm16 是真实 RIFF/WAVE PCM 编解码对：编码产出合法的
 *   RIFF/fmt/data 字节序列；解析逐字节遍历 chunk、校验 fmt 字段并拒绝非法容器。
 *   测试里的格式结论（时长、声道、峰值来源）来自这份真实解析，不是固定产物。
 * - midiSmf0 是真实 SMF format-0 编码器（MThd/MTrk、变量长度 delta、note on/off、
 *   End of Track），产出字节由生产 analyzeMidiBytes（spessasynth_core 真实 parser）消费。
 * - installAudioContextPort 只替换浏览器硬件端口：jsdom 没有 AudioContext，替身按
 *   Web Audio 协议记录 resume/decode/createSource(start/stop/disconnect)/close 与
 *   可改写的 currentTime；decodeAudioData 委托 parseWavPcm16 真实解码。
 *   它能证明的只是协议级因果（调用顺序、起始偏移、释放、时钟读数），
 *   不宣称音质、听感或浏览器原生解码保真。
 */

import { vi } from 'vitest'

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

export interface ParsedWavPcm {
  readonly duration: number
  readonly numberOfChannels: number
  getChannelData(channel: number): Float32Array
}

/** 真实 WAV 解析：RIFF chunk 遍历 + fmt 校验 + PCM16 反交错，拒绝任何非法容器。 */
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

export interface SmfNote {
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
  const copy = bytes.slice()
  return new File([copy.buffer as ArrayBuffer], name, { type })
}

export interface AudioPortSource {
  /** start(0, offset) 的 offset 见证序列。 */
  readonly starts: number[]
  stopCalls: number
  disconnectCalls: number
  /** 触发 once 'ended' 监听（自然播完）。 */
  fireEnded(): void
}

export interface AudioPortContext {
  state: AudioContextState
  /** 测试直接改写以模拟硬件时钟前进。 */
  currentTime: number
  resumeCalls: number
  decodeCalls: number
  closeCalls: number
  readonly sources: AudioPortSource[]
}

export interface AudioContextPort {
  /** 按构造顺序登记全部 AudioContext 替身实例（每个 transport 各持一个）。 */
  readonly contexts: readonly AudioPortContext[]
}

/**
 * 安装 AudioContext 硬件端口替身（jsdom 无 AudioContext）。只覆盖
 * createBrowserWavPreviewRuntime 消费的协议面；解码走 parseWavPcm16 真实解析。
 * 时钟不自动前进：测试改写 currentTime 后由组件的 rAF 节拍读取。
 */
export function installAudioContextPort(): AudioContextPort {
  const contexts: AudioPortContext[] = []
  class PortSource implements AudioPortSource {
    readonly starts: number[] = []
    stopCalls = 0
    disconnectCalls = 0
    buffer: unknown
    private ended: (() => void) | undefined

    connect(_destination: unknown): void {
      // 协议级替身：不接线真实音频图。
    }

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
      const listener = this.ended
      this.ended = undefined
      listener?.()
    }
  }
  class PortAudioContext implements AudioPortContext {
    state: AudioContextState = 'suspended'
    currentTime = 0
    resumeCalls = 0
    decodeCalls = 0
    closeCalls = 0
    readonly sources: PortSource[] = []
    readonly destination = { kind: 'port-destination' }

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
  return { contexts }
}

/** 与硬件端口配套的 rAF 手动节拍队列（组件走 window.requestAnimationFrame）。 */
export interface ManualAnimationFrames {
  /** 取走并执行当前全部在途帧回调（每个回调执行期注册的新帧留到下一拍）。 */
  pump(): void
  /** 在途帧数量（进入见证：0 表示组件尚未排帧）。 */
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
