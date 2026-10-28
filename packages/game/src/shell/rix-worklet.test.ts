// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rixFixture } from '../__tests__/rix-fixture.js'
import { createRixKernel } from './rix/kernel.js'

interface Processor {
  port: { onmessage: (event: MessageEvent) => void; postMessage: ReturnType<typeof vi.fn> }
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean
}
type Constructor = new (options: {
  processorOptions: { module: WebAssembly.Module; archive: ArrayBuffer }
}) => Processor
const processors: Processor[] = []
const module = new WebAssembly.Module(readFileSync(new URL('./rix/rix.wasm', import.meta.url)))

async function processor(archive = rixFixture()): Promise<Processor> {
  let registered: Constructor | undefined
  vi.stubGlobal(
    'AudioWorkletProcessor',
    class {
      port = { onmessage: (_event: MessageEvent) => {}, postMessage: vi.fn() }
    },
  )
  vi.stubGlobal('sampleRate', 48000)
  vi.stubGlobal('registerProcessor', (name: string, processorClass: Constructor) => {
    expect(name).toBe('type-pal-rix')
    registered = processorClass
  })
  vi.resetModules()
  await import('./rix-worklet.js')
  if (!registered) throw new Error('Worklet not registered')
  const result = new registered({ processorOptions: { module, archive } })
  processors.push(result)
  return result
}

afterEach(() => {
  try {
    for (const instance of processors.splice(0)) {
      instance.port.onmessage(new MessageEvent('message', { data: { type: 'dispose' } }))
    }
  } finally {
    vi.unstubAllGlobals()
  }
})
describe('worklet messages and actual PCM output', () => {
  it('plays stereo output through the compiled kernel, stops to silence, and retires on dispose', async () => {
    const worklet = await processor()
    expect(worklet.port.postMessage).toHaveBeenCalledWith({ type: 'ready' })
    worklet.port.onmessage(
      new MessageEvent('message', { data: { type: 'play', track: 1, loop: true } }),
    )
    const output = [new Float32Array(128), new Float32Array(128)]
    expect(worklet.process([], [output])).toBe(true)
    expect(output[0]?.some((sample) => sample !== 0)).toBe(true)
    const reference = createRixKernel(module, rixFixture(), 48000)
    try {
      reference.play(1, true)
      const expected = reference.render(128)
      expect(output[0]).toEqual(expected.filter((_sample, index) => index % 2 === 0))
      expect(output[1]).toEqual(expected.filter((_sample, index) => index % 2 === 1))
    } finally {
      reference.dispose()
    }
    worklet.port.onmessage(new MessageEvent('message', { data: { type: 'stop' } }))
    worklet.process([], [output])
    expect(output).toEqual([new Float32Array(128), new Float32Array(128)])
    worklet.port.onmessage(new MessageEvent('message', { data: { type: 'dispose' } }))
    expect(worklet.process([], [output])).toBe(false)
  })

  it('reports bad archive data instead of registering an apparently playable output', async () => {
    const worklet = await processor(new ArrayBuffer(8))
    expect(worklet.port.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'error',
      message: 'Error: Invalid RIX archive',
    })
    expect(worklet.process([], [[new Float32Array(128)]])).toBe(false)
  })
})
