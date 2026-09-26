import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { probes } from './cursor-command-boundaries-r3-review-witnesses.mjs'

const root = resolve(process.env.BOUNDARY_REVIEW_ROOT)
const probe = probes.find((p) => p.id === process.env.BOUNDARY_REVIEW_ID)
assert.ok(probe)
const target = resolve(root, 'packages/editor/src/core', probe.target)
export default {
  root: resolve(root, 'packages/editor'),
  plugins:
    process.env.BOUNDARY_REVIEW_ENABLED === 'true'
      ? [
          {
            name: 'codex-isolated-boundary-review',
            enforce: 'pre',
            load(file) {
              if (file !== target) return
              const source = readFileSync(file, 'utf8')
              assert.equal(source.split(probe.from).length, 2)
              writeFileSync(process.env.BOUNDARY_REVIEW_HIT, JSON.stringify({ id: probe.id, file }))
              return (probe.prefix ?? '') + source.replace(probe.from, probe.to)
            },
          },
        ]
      : [],
  test: {
    include: [`src/core/${probe.test}.residual.test.ts`],
    maxWorkers: 1,
    reporters: ['json'],
    outputFile: process.env.BOUNDARY_REVIEW_REPORT,
  },
}
