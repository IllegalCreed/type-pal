/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C1：checkBaseEntityPages 的 initialPage 未命中。
 * 旧测只证匹配页与未命中 behavior。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { checkBaseEntityPages } from './author-script-core.js'

describe('C1 author-script-core 剩余合同', () => {
  test('initialPage 未命中 page 精确拒绝，页与 behavior 输入不变', () => {
    const behaviors = {
      trigger: {
        default: {
          label: '默认触发',
          order: 0,
          flow: { kind: 'stages' as const, initial: 'start', stages: [{ id: 'start', body: [] }] },
        },
      },
    }
    const pages = [{ id: 'default', label: '默认', trigger: 'default' }]
    const behaviorSnap = inputSnap(behaviors)
    const pageSnap = inputSnap(pages)
    checkBaseEntityPages(pages, behaviors, 'default', 'entity')
    expect(pages).toEqual(pageSnap)
    expect(behaviors).toEqual(behaviorSnap)
    expectExactError(
      () => checkBaseEntityPages(pages, behaviors, 'ghost', 'entity'),
      'entity.initialPage: 未命中 page ghost',
    )
    expect(pages).toEqual(pageSnap)
    expect(behaviors).toEqual(behaviorSnap)
  })
})
