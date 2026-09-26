import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { needles } from './mutants.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const needle = needles.find((n) => n.id === process.env.PURE_NEEDLE)
assert.ok(needle, 'unknown needle')
const target = resolve(root, 'packages/migrate/src/migrate-content.ts')
export default {
  root: resolve(root, 'packages/migrate'),
  plugins:
    process.env.PURE_RED === 'true'
      ? [
          {
            name: 'pure-migration-negative-control',
            enforce: 'pre',
            load(file) {
              if (file !== target) return
              const code = readFileSync(file, 'utf8')
              assert.equal(code.split(needle.from).length, 2)
              writeFileSync(process.env.PURE_HIT, JSON.stringify({ id: needle.id, target }))
              return code.replace(needle.from, needle.to)
            },
          },
        ]
      : [],
  test: {
    include: [`src/migrate-${needle.group}.pure.test.ts`],
    maxWorkers: 1,
    reporters: ['json'],
    outputFile: process.env.PURE_REPORT,
  },
}
