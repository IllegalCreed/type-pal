// Fixed Git evidence, not a copy of live current payloads or an external/tmp fixture.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { collectRollforwardSources } from './build-rollforward-document-candidates.mjs'
import { readReviewRecordObject } from './review-record-storage.mjs'
import { prepareRollforwardReviewPlan } from './rollforward-review-plan.mjs'

export const rollforwardTestRoot = fileURLToPath(new URL('../../', import.meta.url))
const git = (...args) =>
  execFileSync('git', args, {
    cwd: rollforwardTestRoot,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
const hash = (b) => createHash('sha256').update(b).digest('hex')
let saved
export function rollforwardFixture() {
  if (saved) return structuredClone(saved)
  const revision = 'f17181f96d97301a3fdabfb94d1d860963d379bc',
    prefix = 'docs/phase-governance/reviews/'
  const paths = git('ls-tree', '-r', '--name-only', revision, '--', prefix)
    .toString()
    .split('\n')
    .filter(
      (p) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/') && p.endsWith('.json'),
    )
  const buffers = new Map(),
    readBuffer = (path) => {
      if (!buffers.has(path)) buffers.set(path, git('cat-file', 'blob', `${revision}:${path}`))
      return buffers.get(path)
    }
  const records = new Map(paths.map((path) => [path, readReviewRecordObject(path, { readBuffer })]))
  const archive = gunzipSync(
    git(
      'cat-file',
      'blob',
      '69abb48a8742d9e3ef6f819f4695f1786e1e2293:docs/ops/evidence/DOCS-FULL-TEMPLATE-1/s22-validation.log.gz',
    ),
  ).toString()
  const line = archive
    .split('\n')
    .find((row) => row.startsWith('{"kind":"rollforward-evidence-owner-verdict/1.0.0"'))
  assert(line, 'fixed accepted intake evidence missing')
  const packet = JSON.parse(line),
    files = new Map(
      packet.files.map((file) => {
        const bytes = Buffer.from(file.base64, 'base64')
        assert.equal(bytes.length, file.bytes)
        assert.equal(hash(bytes), file.sha256)
        return [file.path, bytes]
      }),
    )
  const index = JSON.parse(files.get('owner/intake/index.json'))
  const rows = index.shards.flatMap((d) => {
    const bytes = files.get(`owner/intake/${d.path}`)
    assert.equal(hash(bytes), d.sha256)
    return JSON.parse(bytes).rows
  })
  const sources = collectRollforwardSources().rows
  const plan = prepareRollforwardReviewPlan({ rows, sources, records })
  saved = { records, plan }
  return structuredClone(saved)
}
