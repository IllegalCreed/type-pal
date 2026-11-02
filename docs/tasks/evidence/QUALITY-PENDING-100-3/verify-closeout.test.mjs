import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { readNativeArchives } from './native-archives.mjs'
import { verifyCloseout } from './verify-closeout.mjs'

const folder = new URL('./', import.meta.url)
const root = new URL('../../../../', import.meta.url)
const closeout = JSON.parse(readFileSync(new URL('local-closeout.json', folder)))
const native = readNativeArchives(folder).files
const readCurrent = (path) => readFileSync(new URL(path, root), 'utf8')

test('recorded gates and exact current files support only the declared transition', () => {
  const result = verifyCloseout(closeout, native, readCurrent)
  assert.equal(result.acceptedCurrentPaths, 317)
  assert.equal(result.remainingReview, 5)
})

test('exit zero with diagnostics and a failed gate both reject acceptance', () => {
  const id = 'unified-closeout/docs-final.execution.json'
  const failed = { ...JSON.parse(native[id]), exit: 1 }
  assert.throws(
    () => verifyCloseout(closeout, { ...native, [id]: JSON.stringify(failed) }, readCurrent),
    /docs-final/,
  )
  assert.throws(
    () =>
      verifyCloseout(
        closeout,
        {
          ...native,
          'unified-closeout/docs-final.stderr.raw': 'unexpected diagnostic\n',
        },
        readCurrent,
      ),
    /docs-final/,
  )
})

test('a changed accepted file or a duplicated path cannot inherit the receipt', () => {
  const first = closeout.acceptedCurrentPaths[0].path
  assert.throws(
    () =>
      verifyCloseout(
        closeout,
        native,
        (path) => readCurrent(path) + (path === first ? '\nchanged\n' : ''),
      ),
    (error) => error instanceof assert.AssertionError && error.message.includes(first),
  )
  const duplicate = structuredClone(closeout)
  duplicate.acceptedCurrentPaths[1] = duplicate.acceptedCurrentPaths[0]
  assert.throws(() => verifyCloseout(duplicate, native, readCurrent), /duplicate accepted path/)
})

test('an unresolved F/G file cannot be closed by the completed module gates', () => {
  const path = closeout.remainingReview[0]
  assert.throws(
    () =>
      verifyCloseout(closeout, native, (file) => {
        const body = readCurrent(file)
        if (file !== 'docs/ops/audits/code-quality-file-ledger.md') return body
        const line = body.split('\n').find((value) => value.startsWith(`| \`${path}\` |`))
        assert.ok(line)
        return body.replace(line, line.replace('| review |', '| 已验证 |'))
      }),
    (error) => error instanceof assert.AssertionError && error.message.includes(path),
  )
})
