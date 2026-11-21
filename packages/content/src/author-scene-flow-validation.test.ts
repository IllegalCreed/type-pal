import { describe, expect, test } from 'vitest'
import { expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { checkAuthorEntityPages, checkAuthorSceneHooks } from './author-script.js'

describe('author entity page identity', () => {
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
    const behaviorSnap = deepSnapshot(behaviors)
    const pageSnap = deepSnapshot(pages)
    checkAuthorEntityPages(pages, behaviors, 'default', 'entity')
    expect(pages).toEqual(pageSnap)
    expect(behaviors).toEqual(behaviorSnap)
    expectExactError(
      () => checkAuthorEntityPages(pages, behaviors, 'ghost', 'entity'),
      'entity.initialPage: 未命中 page ghost',
    )
    expect(pages).toEqual(pageSnap)
    expect(behaviors).toEqual(behaviorSnap)
  })
})

function hooks() {
  const step = { id: 'start', body: [] }
  const variant = {
    label: 'Start',
    order: 0,
    flow: { kind: 'stages', initial: 'start', stages: [step] },
  }
  return { initial: 'main', variants: { main: variant } }
}

describe('author scene hooks', () => {
  test('a current hook can bind a registered variant, and an unknown initial variant is rejected', () => {
    const onEnter = hooks()
    const before = deepSnapshot(onEnter)
    checkAuthorSceneHooks({ onEnter }, 'hooks')
    expect(onEnter).toEqual(before)
    expectExactError(
      () => checkAuthorSceneHooks({ onEnter: { ...onEnter, initial: 'missing' } }, 'hooks'),
      'hooks.onEnter.initial: 未命中 hook missing',
    )
  })

  test.each([
    [
      'empty variants',
      (input: ReturnType<typeof hooks>) => ({ ...input, variants: {} }),
      '.variants: 不能为空',
    ],
    [
      'invalid order',
      (input: ReturnType<typeof hooks>) => ({
        ...input,
        variants: { main: { ...input.variants.main, order: -1 } },
      }),
      '.variants.main.order: 期望非负整数',
    ],
    [
      'unexpected field',
      (input: ReturnType<typeof hooks>) => ({
        ...input,
        variants: { main: { ...input.variants.main, extra: true } },
      }),
      '.variants.main.extra: 未知字段',
    ],
  ] as const)('rejects %s on the actual author hook branch', (_name, invalidate, message) => {
    expectExactError(
      () => checkAuthorSceneHooks({ onEnter: invalidate(hooks()) }, 'hooks'),
      `hooks.onEnter${message}`,
    )
  })

  test('teleport accepts a standard step but only onEnter permits a preparation segment', () => {
    const withoutEntry = hooks()
    checkAuthorSceneHooks({ onTeleport: withoutEntry }, 'hooks')
    const { main } = withoutEntry.variants
    const withEntry = {
      ...withoutEntry,
      variants: {
        main: {
          ...main,
          flow: {
            ...main.flow,
            stages: [{ id: 'start', body: [], entry: { prepare: [], reveal: { kind: 'cut' } } }],
          },
        },
      },
    }
    checkAuthorSceneHooks({ onEnter: withEntry }, 'hooks')
    expectExactError(
      () => checkAuthorSceneHooks({ onTeleport: withEntry }, 'hooks'),
      'hooks.onTeleport.variants.main.flow.stages[0].entry: 只允许 onEnter 步骤',
    )
  })
})
