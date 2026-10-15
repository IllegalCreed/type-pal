import { createRixKernel, type RixKernel } from './rix/kernel.js'

declare const sampleRate: number
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
interface RixOptions {
  processorOptions: { module: WebAssembly.Module; archive: ArrayBuffer }
}
declare function registerProcessor(
  name: string,
  processor: new (options: RixOptions) => AudioWorkletProcessor,
): void

class RixProcessor extends AudioWorkletProcessor {
  private kernel: RixKernel | undefined

  constructor(options: RixOptions) {
    super()
    try {
      this.kernel = createRixKernel(
        options.processorOptions.module,
        options.processorOptions.archive,
        sampleRate,
      )
      this.port.postMessage({ type: 'ready' })
    } catch (error) {
      this.port.postMessage({ type: 'error', message: String(error) })
    }
    this.port.onmessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'play') this.kernel?.play(message.track, message.loop)
      else if (message.type === 'stop') this.kernel?.play(0, false)
      else if (message.type === 'dispose') {
        this.kernel?.dispose()
        this.kernel = undefined
      }
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const channels = outputs[0]
    const frames = channels?.[0]?.length ?? 0
    if (this.kernel && channels && frames > 0) {
      const pcm = this.kernel.render(frames)
      for (const [channel, samples] of channels.entries()) {
        for (let i = 0; i < frames; i++) samples[i] = pcm[i * 2 + (channel % 2)] ?? 0
      }
    }
    return this.kernel !== undefined
  }
}

registerProcessor('type-pal-rix', RixProcessor)
