import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { probes } from './guard-wave3-review-witnesses.mjs'

const root = resolve(process.env.GUARD_REVIEW_ROOT)
const probe = probes.find((p) => p.id === process.env.GUARD_REVIEW_ID)
assert.ok(probe)
const enabled = process.env.GUARD_REVIEW_ENABLED === 'true'
const testFile = resolve(root, 'packages/content/src', `${probe.test}.guard-residual.test.ts`)
export default {
  root: resolve(root, 'packages/content'),
  plugins: [
    {
      name: 'codex-guard-wave3-isolated-review',
      enforce: 'pre',
      load(file) {
        const edit =
          enabled &&
          probe.edits.find((e) => file === resolve(root, 'packages/content/src', e.target))
        const append = file === testFile && probe.appendix
        if (!edit && !append) return
        let source = readFileSync(file, 'utf8')
        if (edit) {
          assert.equal(source.split(edit.from).length, 2)
          source = source.replace(edit.from, edit.to)
          writeFileSync(process.env.GUARD_REVIEW_HIT, JSON.stringify({ id: probe.id, file }))
        }
        return source + (append || '')
      },
    },
  ],
  test: {
    include: [`src/${probe.test}.guard-residual.test.ts`],
    maxWorkers: 1,
    reporters: ['json'],
    outputFile: process.env.GUARD_REVIEW_REPORT,
  },
}
