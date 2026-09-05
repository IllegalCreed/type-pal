import assert from 'node:assert/strict'
import test from 'node:test'
import { coveragePackages, testSelection } from './config.mjs'

const editor = coveragePackages.find((entry) => entry.id === 'editor')

test('fast 排除所有 PAL test 扩展，full 保留', () => {
  assert.ok(editor)
  const fast = testSelection(editor, 'fast').excludes
  const full = testSelection(editor, 'full').excludes
  for (const extension of ['js', 'jsx', 'ts', 'tsx', 'mjs', 'mts', 'cjs', 'cts']) {
    assert.ok(fast.includes(`**/*.pal.test.${extension}`))
    assert.ok(!full.includes(`**/*.pal.test.${extension}`))
  }
})

test('coverage 测试进程不重复拾取 dist/build 产物', () => {
  assert.ok(editor)
  const excludes = testSelection(editor, 'fast').excludes
  assert.ok(excludes.includes('dist/**'))
  assert.ok(excludes.includes('build/**'))
})

test('重型编辑器静态门禁仅从 coverage 进程排除，生产源码 include 不缩窄', () => {
  assert.ok(editor)
  assert.ok(
    testSelection(editor, 'fast').excludes.includes('src/ui/design-system/*-adoption.test.ts'),
  )
  assert.deepEqual(editor.include, ['src/**/*.{ts,tsx}'])
})
