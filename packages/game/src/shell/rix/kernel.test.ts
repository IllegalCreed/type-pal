// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { rixFixture } from '../../__tests__/rix-fixture.js'
import { createRixKernel as createKernel } from './kernel.js'

const kernels: ReturnType<typeof createKernel>[] = []
afterEach(() => {
  for (const kernel of kernels.splice(0)) kernel.dispose()
})
function createRixKernel(...args: Parameters<typeof createKernel>) {
  const kernel = createKernel(...args)
  kernels.push(kernel)
  return kernel
}

const module = new WebAssembly.Module(readFileSync(new URL('./rix.wasm', import.meta.url)))

function peak(samples: Float32Array): number {
  return samples.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0)
}

describe('actual compiled RIX/OPL WASM', () => {
  it('produces a finite waveform and preserves sparse original track IDs', () => {
    const kernel = createRixKernel(module, rixFixture(), 44100)
    expect(kernel.play(1, true)).toBe(true)
    const first = kernel.render(4096).slice()
    expect(first.every(Number.isFinite)).toBe(true)
    expect(peak(first)).toBeGreaterThan(0.01)
    expect(kernel.play(87, true)).toBe(true)
    const last = kernel.render(4096).slice()
    expect(last.every(Number.isFinite)).toBe(true)
    expect(peak(last)).toBeGreaterThan(0.01)
    expect(last).not.toEqual(first)
    expect(kernel.play(29, true)).toBe(false)
    expect(peak(kernel.render(128))).toBe(0)
    expect(kernel.play(88, true)).toBe(false)
    expect(kernel.play(0, false)).toBe(false)
    kernel.dispose()
  })

  // Independently rendered by unmodified reference/sdlpal RIX + Nuked using absolute deadlines.
  it.each([
    [44100, false, '8552c95f65f65c2f7b7780b61c574547567cb747a12bc8205b5bbc7dd4574a9d'],
    [44100, true, 'a96216475ff0413e0f530ae023d257a290b5f89e2398be58e8cb599e3cf0842c'],
    [48000, false, 'dc55998913470814d9537541a328395edb7dddfa063e7bf353e7e67567dce876'],
    [48000, true, '2786ab8a1b592e927299c58f80651ece9d093c204a184c2cd4b7faff8cfa8bd6'],
  ] as const)('matches reference PCM at %i Hz, loop=%s', (rate, loop, hash) => {
    const kernel = createRixKernel(module, rixFixture(), rate)
    kernel.play(1, loop)
    const samples = new Float32Array(rate * 4)
    let frames = 0
    while (frames < rate * 2) {
      const count = Math.min(128, rate * 2 - frames)
      samples.set(kernel.render(count), frames * 2)
      frames += count
    }
    expect(createHash('sha256').update(new Uint8Array(samples.buffer)).digest('hex')).toBe(hash)
    kernel.dispose()
    expect(peak(kernel.render(128))).toBe(0)
  })

  it('rejects malformed archive offsets, headers and unterminated music before decoding', () => {
    for (const corrupt of [
      new ArrayBuffer(0),
      (() => {
        const b = rixFixture()
        new DataView(b).setUint32(4, 0, true)
        return b
      })(),
      (() => {
        const b = rixFixture()
        new Uint8Array(b)[356] = 0
        return b
      })(),
      (() => {
        const b = rixFixture()
        new Uint8Array(b)[356 + 91] = 0
        return b
      })(),
    ])
      expect(() => createRixKernel(module, corrupt, 44100)).toThrow('Invalid RIX archive')
  })
})
