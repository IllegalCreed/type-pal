import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { needles } from './mutants.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const needle = needles.find((n) => n.id === process.env.TRANSLATE_NEEDLE)
assert.ok(needle, 'unknown needle')
const target = resolve(root, 'packages/migrate/src/translate-events.ts')
export default {
  root: resolve(root, 'packages/migrate'),
  plugins:
    process.env.TRANSLATE_RED === 'true'
      ? [
          {
            name: 'translate-events-negative-control',
            enforce: 'pre',
            load(file) {
              if (file !== target) return
              const source = readFileSync(file, 'utf8')
              assert.equal(source.split(needle.from).length, 2, 'exactly one replacement')
              writeFileSync(process.env.TRANSLATE_HIT, JSON.stringify({ id: needle.id, target }))
              return source.replace(needle.from, needle.to)
            },
          },
        ]
      : [],
  test: {
    include: [`src/translate-events.${needle.group}.test.ts`],
    maxWorkers: 1,
    reporters: ['json'],
    outputFile: process.env.TRANSLATE_REPORT,
  },
}
