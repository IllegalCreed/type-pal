import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { needles } from './mutants.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const needle = needles.find((n) => n.id === process.env.PLAYBACK_NEEDLE)
assert.ok(needle, 'unknown needle')
const target = resolve(root, 'packages/editor/src/core/playback.ts')
export default {
  root: resolve(root, 'packages/editor'),
  plugins:
    process.env.PLAYBACK_RED === 'true'
      ? [
          {
            name: 'playback-negative-control',
            enforce: 'pre',
            load(file) {
              if (file !== target) return
              const source = readFileSync(file, 'utf8')
              assert.equal(source.split(needle.from).length, 2, 'exactly one replacement')
              writeFileSync(process.env.PLAYBACK_HIT, JSON.stringify({ id: needle.id, target }))
              return source.replace(needle.from, needle.to)
            },
          },
        ]
      : [],
  test: {
    include: [`src/core/playback.${needle.group}.test.ts`],
    maxWorkers: 1,
    reporters: ['json'],
    outputFile: process.env.PLAYBACK_REPORT,
  },
}
