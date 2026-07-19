import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { encodeSpriteChunk, type RleFrame } from '@type-pal/shared'

const repo = resolve(fileURLToPath(new URL('../../..', import.meta.url)))

function placeholderFrame(pose: number): RleFrame {
  const width = 12
  const height = 20
  const pixels = new Uint8Array(width * height)
  const opaque = new Uint8Array(width * height)
  const set = (x: number, y: number, color: number): void => {
    pixels[y * width + x] = color
    opaque[y * width + x] = 1
  }
  for (let y = 2; y <= 7; y++) for (let x = 4; x <= 7; x++) set(x, y, 6)
  for (let y = 8; y <= 15; y++) for (let x = 3; x <= 8; x++) set(x, y, 7 + (pose % 2))
  const liftLeft = pose % 3 === 1 ? 1 : 0
  const liftRight = pose % 3 === 2 ? 1 : 0
  for (let y = 16; y <= 19 - liftLeft; y++) for (let x = 3; x <= 5; x++) set(x, y, 8)
  for (let y = 16; y <= 19 - liftRight; y++) for (let x = 6; x <= 8; x++) set(x, y, 8)
  return { width, height, pixels, opaque }
}

const bytes = gzipSync(
  encodeSpriteChunk(Array.from({ length: 10 }, (_, pose) => placeholderFrame(pose))),
)

for (const project of ['demo', 'e2e-own']) {
  const directory = resolve(repo, `projects/${project}/assets/generated/battle-sprites`)
  mkdirSync(directory, { recursive: true })
  writeFileSync(resolve(directory, 'player-fighter.rle'), bytes)
}

console.log(`generated demo/e2e-own battle placeholder: ${bytes.byteLength} bytes`)
