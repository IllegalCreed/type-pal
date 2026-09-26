import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mutations } from './mutants.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const id = process.env.RESOURCE_MUTATION
const mutation = mutations.find((entry) => entry.id === id)
assert.ok(id === 'control' || mutation, `unknown mutation ${id}`)
assert.ok(process.env.RESOURCE_REPORT && process.env.RESOURCE_HIT)
const target = mutation && resolve(root, `packages/content/src/${mutation.module}.ts`)
export default {
  root: resolve(root, 'packages/content'),
  plugins: mutation
    ? [
        {
          name: 'isolated-resource-boundary',
          enforce: 'pre',
          load(file) {
            if (file !== target) return
            const source = readFileSync(file, 'utf8')
            assert.equal(source.split(mutation.from).length, 2)
            writeFileSync(process.env.RESOURCE_HIT, JSON.stringify({ id, target }))
            return source.replace(mutation.from, mutation.to)
          },
        },
      ]
    : [],
  test: {
    include: mutations.map((entry) => `src/${entry.module}.resource-boundaries.test.ts`),
    maxWorkers: 2,
    reporters: ['json'],
    outputFile: process.env.RESOURCE_REPORT,
  },
}
