import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRixKernel } from '../../../../packages/game/src/shell/rix/kernel.ts'

const archive = readFileSync('data/raw/mus.mkf')
const module = new WebAssembly.Module(readFileSync('packages/game/src/shell/rix/rix.wasm'))
const tracks = []
for (let id = 0; id < archive.readUInt32LE(0) / 4 - 1; id++) {
  if (archive.readUInt32LE(id * 4) !== archive.readUInt32LE((id + 1) * 4)) tracks.push(id)
}
assert.equal(tracks.length, 86)
const results = []
for (const rate of [44100, 48000]) {
  const kernel = createRixKernel(
    module,
    archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength),
    rate,
  )
  const start = performance.now()
  for (const track of tracks) {
    kernel.play(track, true)
    let peak = 0
    for (let done = 0; done < rate * 10; ) {
      const count = Math.min(4096, rate * 10 - done)
      for (const sample of kernel.render(count)) peak = Math.max(peak, Math.abs(sample))
      done += count
    }
    assert.ok(peak > 0, `track ${track} at ${rate}Hz must produce PCM`)
    results.push({ rate, track, peak })
  }
  kernel.dispose()
  results.push({ rate, elapsedMs: performance.now() - start })
}
console.log(JSON.stringify(results, null, 2))
