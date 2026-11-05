import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const gameRequire = createRequire(join(root, 'packages/game/package.json'))
const libRoot = dirname(gameRequire.resolve('spessasynth_lib/package.json'))

test('the public MIDI worklet matches its installed supplier artifact and retains the supplied license', () => {
  // Frozen-lockfile installation owns dependency selection. This checks copy/notice
  // drift, not the correctness of the supplier's synthesis or decoder algorithms.
  assert.deepEqual(
    readFileSync(join(root, 'packages/game/public/spessasynth_processor.min.js')),
    readFileSync(join(libRoot, 'dist/spessasynth_processor.min.js')),
    'updating the library also requires copying its matching worklet',
  )
  const license = readFileSync(join(root, 'packages/game/public/spessasynth-LICENSE.txt'))
  const coreRoot = dirname(
    createRequire(join(libRoot, 'package.json')).resolve('spessasynth_core/package.json'),
  )
  const vorbisRoot = dirname(
    createRequire(join(coreRoot, 'package.json')).resolve('stb-vorbis/package.json'),
  )
  for (const packageRoot of [libRoot, coreRoot, vorbisRoot]) {
    const metadata = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
    assert.equal(
      metadata.license,
      'Apache-2.0',
      `review the notice contract if ${metadata.name} changes license`,
    )
    assert.deepEqual(license, readFileSync(join(packageRoot, 'LICENSE')))
  }
})
