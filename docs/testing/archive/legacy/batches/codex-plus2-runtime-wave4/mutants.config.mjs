import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { needles } from './mutants.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
const needle = needles.find((entry) => entry.id === process.env.CODEX_PLUS2_RT_NEEDLE)
assert.ok(needle, 'unknown negative-control needle')
const target = resolve(root, needle.source)

export default {
  root: resolve(root, 'packages/reforge'),
  plugins:
    process.env.CODEX_PLUS2_RT_RED === 'true'
      ? [
          {
            name: 'codex-plus2-runtime-wave4-negative-control',
            enforce: 'pre',
            load(file) {
              if (file !== target) return
              const source = readFileSync(file, 'utf8')
              assert.equal(source.split(needle.from).length, 2, 'single source mutation')
              writeFileSync(
                process.env.CODEX_PLUS2_RT_HIT,
                JSON.stringify({ id: needle.id, target }),
              )
              return source.replace(needle.from, needle.to)
            },
          },
        ]
      : [],
  test: {
    include: [needle.test.replace(/^packages\/reforge\//, '')],
    maxWorkers: 1,
    reporters: ['json'],
    outputFile: process.env.CODEX_PLUS2_RT_REPORT,
  },
}
