import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkoutTargets, localTarget } from './check.mjs'

test('local targets keep repo-root, encoded, query and directory forms and leave inputs unchanged', () => {
  const source = 'docs/ops/tasks/T.md'
  const encoded = 'sub/%E6%96%87%E4%BB%B6.md?mode=1#L2'
  const before = { source, encoded }
  assert.equal(localTarget('README.md', 'docs/ops/board.md'), 'docs/ops/board.md')
  assert.equal(localTarget('README.md', '/docs/ops/board.md'), 'docs/ops/board.md')
  assert.equal(localTarget(source, encoded), 'docs/ops/tasks/sub/文件.md')
  assert.equal(localTarget(source, '..'), 'docs/ops')
  assert.equal(localTarget(source, '../'), 'docs/ops')
  assert.deepEqual({ source, encoded }, before)
})

test('checkout ancestor sets include the repo root and do not mutate the file list', () => {
  const files = ['docs/ops/tasks/T.md', 'README.md']
  const before = structuredClone(files)
  assert.deepEqual(
    [...checkoutTargets(files)],
    ['.', 'docs/ops/tasks/T.md', 'docs/ops/tasks', 'docs/ops', 'docs', 'README.md'],
  )
  assert.deepEqual(files, before)
})
