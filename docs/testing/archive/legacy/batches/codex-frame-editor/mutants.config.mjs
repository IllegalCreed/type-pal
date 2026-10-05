import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { needles, source } from './mutants.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
const needle = needles.find((entry) => entry.id === process.env.FRAME_EDITOR_NEEDLE)
assert.ok(needle, 'unknown negative-control needle')
const target = resolve(root, source)

export default {
  root: resolve(root, 'packages/editor'),
  plugins:
    process.env.FRAME_EDITOR_RED === 'true'
      ? [
          {
            name: 'frame-editor-negative-control',
            enforce: 'pre',
            load(file) {
              if (file !== target) return
              const text = readFileSync(file, 'utf8')
              assert.equal(text.split(needle.from).length, 2, 'single source mutation')
              writeFileSync(process.env.FRAME_EDITOR_HIT, JSON.stringify({ id: needle.id, target }))
              return text.replace(needle.from, needle.to)
            },
          },
        ]
      : [],
  test: {
    include: [needle.test.replace(/^packages\/editor\//, '')],
    maxWorkers: 1,
    reporters: ['json'],
    outputFile: process.env.FRAME_EDITOR_REPORT,
  },
}
