export interface RixExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory
  _initialize(): void
  malloc(bytes: number): number
  free(pointer: number): void
  rix_create(pointer: number, bytes: number, rate: number): number
  rix_play(engine: number, track: number, loop: number): number
  rix_render(engine: number, output: number, frames: number): number
  rix_destroy(engine: number): void
}

/** The same compiled kernel is used by the browser worklet and native WASM tests. */
export function createRixKernel(module: WebAssembly.Module, archive: ArrayBuffer, rate: number) {
  const instance = new WebAssembly.Instance(module)
  const wasm = instance.exports as RixExports
  wasm._initialize()
  const data = wasm.malloc(archive.byteLength)
  if (!data) throw new Error('RIX memory allocation failed')
  new Uint8Array(wasm.memory.buffer, data, archive.byteLength).set(new Uint8Array(archive))
  const engine = wasm.rix_create(data, archive.byteLength, rate)
  wasm.free(data)
  if (!engine) throw new Error('Invalid RIX archive')
  const output = wasm.malloc(4096 * 2 * 4)
  if (!output) {
    wasm.rix_destroy(engine)
    throw new Error('RIX output allocation failed')
  }
  const pcm = new Float32Array(wasm.memory.buffer, output, 4096 * 2)
  let disposed = false
  return {
    play(track: number, loop: boolean): boolean {
      return !disposed && wasm.rix_play(engine, track, loop ? 1 : 0) !== 0
    },
    render(frames: number): Float32Array {
      if (!Number.isInteger(frames) || frames < 1 || frames > 4096) {
        throw new Error('Invalid RIX render size')
      }
      if (disposed) pcm.fill(0, 0, frames * 2)
      else wasm.rix_render(engine, output, frames)
      return pcm.subarray(0, frames * 2)
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      wasm.rix_destroy(engine)
      wasm.free(output)
    },
  }
}

export type RixKernel = ReturnType<typeof createRixKernel>
