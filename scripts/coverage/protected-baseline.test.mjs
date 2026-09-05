import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyProtectedBaseline } from './protected-baseline.mjs'

test('目标分支尚无 coverage 设施时允许唯一一次 bootstrap', () => {
  assert.equal(
    classifyProtectedBaseline({ baselineExists: false, configExists: false }),
    'bootstrap',
  )
})

test('目标分支有 baseline 时必须比较，只有配置没有 baseline 时 fail-closed', () => {
  assert.equal(classifyProtectedBaseline({ baselineExists: true, configExists: true }), 'compare')
  assert.throws(
    () => classifyProtectedBaseline({ baselineExists: false, configExists: true }),
    /拒绝 fail-open/,
  )
})
