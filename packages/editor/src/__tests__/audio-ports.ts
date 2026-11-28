import { vi } from 'vitest'
import { parseWavPcm16 } from './audio-fixtures.js'

interface AudioPortSource {
  /** start(0, offset) 的 offset 见证序列。 */
  readonly starts: number[]
  stopCalls: number
  disconnectCalls: number
  /** 触发 once 'ended' 监听（自然播完）。 */
  fireEnded(): void
}

interface AudioPortContext {
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
 * 浏览器 WAV transport 使用的协议面；解码实际读取 PCM16 字节。
 * 时钟不自动前进：测试改写 currentTime 后由组件的 rAF 节拍读取。
 */
export function installAudioContextPort(
  options: { beforeClose?: (context: AudioPortContext) => Promise<void> } = {},
): AudioContextPort {
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

    async decodeAudioData(bytes: ArrayBuffer): Promise<ReturnType<typeof parseWavPcm16>> {
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
      if (options.beforeClose) await options.beforeClose(this)
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
