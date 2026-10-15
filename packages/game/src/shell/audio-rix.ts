import type { MusicBackend } from './audio.js'
import workletUrl from './rix-worklet.ts?worker&url'

export function createRixBackend(baseUrl: string): MusicBackend {
  const ctx = new AudioContext()
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)
  const abort = new AbortController()
  let node: AudioWorkletNode | undefined
  let disposed = false
  let last: { track: number; loop: boolean } | undefined
  let reportError: ((error: unknown) => void) | undefined
  const ready = (async () => {
    if (!ctx.audioWorklet) throw new Error('请使用 HTTPS 或 localhost 播放音乐')
    const [module, archive] = await Promise.all([
      fetch(new URL('./rix/rix.wasm', import.meta.url), { signal: abort.signal }).then(
        async (response) => {
          if (!response.ok) throw new Error(`FM 合成器加载失败 (${response.status})`)
          return WebAssembly.compile(await response.arrayBuffer())
        },
      ),
      fetch(`${baseUrl}/music/mus.mkf`, { signal: abort.signal }).then(async (response) => {
        if (!response.ok) throw new Error(`RIX 曲库加载失败 (${response.status})`)
        return response.arrayBuffer()
      }),
      ctx.audioWorklet.addModule(workletUrl),
    ])
    if (disposed) return
    node = new AudioWorkletNode(ctx, 'type-pal-rix', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { module, archive },
    })
    await new Promise<void>((resolve, reject) => {
      if (!node) return reject(new Error('FM 音频节点未创建'))
      node.onprocessorerror = () => {
        const error = new Error('FM 音频处理失败')
        reject(error)
        if (!disposed) reportError?.(error)
      }
      node.port.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'ready') resolve()
        else if (event.data.type === 'error') {
          const error = new Error(event.data.message)
          reject(error)
          if (!disposed) reportError?.(error)
        }
      }
      abort.signal.addEventListener('abort', () => reject(new Error('FM 加载已取消')), {
        once: true,
      })
    })
    if (disposed) return
    node.connect(gain)
    if (last) node.port.postMessage({ type: 'play', ...last })
  })()
  return {
    ready,
    play(track, loop) {
      if (disposed) return
      last = { track, loop }
      node?.port.postMessage({ type: 'play', ...last })
    },
    stop() {
      last = undefined
      node?.port.postMessage({ type: 'stop' })
    },
    resume() {
      if (!disposed && ctx.state === 'suspended') void ctx.resume().catch(() => {})
    },
    setVolume(value) {
      gain.gain.value = value
    },
    setErrorHandler(handler) {
      reportError = handler
    },
    dispose() {
      if (disposed) return
      disposed = true
      reportError = undefined
      abort.abort()
      last = undefined
      node?.port.postMessage({ type: 'dispose' })
      node?.disconnect()
      gain.disconnect()
      void ctx.close().catch(() => {})
    },
  }
}
