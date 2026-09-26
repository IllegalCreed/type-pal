import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { needles } from './mutants.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const needle = needles.find((n) => n.id === process.env.ENEMY_HOOK_NEEDLE)
assert.ok(needle, 'unknown needle')
const target = resolve(root, 'packages/migrate/src/translate-enemy-hook-flow.ts')
export default {
  root: resolve(root, 'packages/migrate'),
  plugins:
    process.env.ENEMY_HOOK_RED === 'true'
      ? [
          {
            name: 'enemy-hooks-negative-control',
            enforce: 'pre',
            load(file) {
              if (file !== target) return
              const source = readFileSync(file, 'utf8')
              assert.equal(source.split(needle.from).length, 2, 'exactly one replacement')
              writeFileSync(process.env.ENEMY_HOOK_HIT, JSON.stringify({ id: needle.id, target }))
              return source.replace(needle.from, needle.to)
            },
          },
        ]
      : [],
  test: {
    include: [`src/translate-enemy-hook-flow.${needle.group}.test.ts`],
    maxWorkers: 1,
    reporters: ['json'],
    outputFile: process.env.ENEMY_HOOK_REPORT,
  },
}
