import { describe, expect, test } from 'vitest'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { checkAuthorScriptFlow } from './author-script.js'
import { checkRuntimeScriptFlow } from './runtime-script.js'

const stagesFlow = (stages: unknown[], initial = 'start') => ({
  kind: 'stages' as const,
  initial,
  stages,
})

const legalStages = () => stagesFlow([{ id: 'start', body: [] }])

describe('entry preparation and scene changes', () => {
  test('未开 allowSceneEntry 时 entry 拒绝', () => {
    expect(() =>
      checkAuthorScriptFlow(
        stagesFlow([{ id: 'start', entry: { prepare: [], reveal: { kind: 'cut' } }, body: [] }]),
        'flow',
      ),
    ).toThrow(new Error('flow.stages[0].entry: 只允许 onEnter 步骤'))
  })

  test('允许 onEnter 的后续步骤在入场前更换队长精灵', () => {
    expect(() =>
      checkAuthorScriptFlow(
        stagesFlow([
          { id: 'start', body: [], next: 'later' },
          {
            id: 'later',
            entry: {
              prepare: [{ kind: 'setActorSprite', actor: 'hero', sprite: 'walking' }],
              reveal: { kind: 'cut' },
            },
            body: [],
          },
        ]),
        'flow',
        { allowSceneEntry: true },
      ),
    ).not.toThrow()
  })

  test('forbidLoadScene 开启时 loadScene 命令拒绝；关闭时通过', () => {
    const loadScene = {
      kind: 'loadScene',
      scene: 's002',
      transition: { kind: 'modern', outMs: 260, inMs: 260, color: 'black' },
    }
    const withLoad = stagesFlow([{ id: 'start', body: [loadScene] }])
    expect(() => checkAuthorScriptFlow(withLoad, 'flow', { forbidLoadScene: true })).toThrow(
      new Error('flow.stages[0].body[0]: auto 行为禁止 loadScene'),
    )
    expect(() => checkAuthorScriptFlow(withLoad, 'flow')).not.toThrow()
  })
})

describe('stage identities and shape', () => {
  test('重复 stage id 拒绝且 where 含重复值', () => {
    expect(() =>
      checkAuthorScriptFlow(
        stagesFlow([
          { id: 'start', body: [] },
          { id: 'start', body: [] },
        ]),
        'flow',
      ),
    ).toThrow(new Error('flow.stages[1].id: 重复 start'))
  })
  test('initial 未命中拒绝', () => {
    expect(() =>
      checkAuthorScriptFlow(stagesFlow([{ id: 'start', body: [] }], 'gone'), 'flow'),
    ).toThrow(new Error('flow.initial: 未命中 stage gone'))
  })
  test('next 指向不存在 stage 拒绝', () => {
    expect(() =>
      checkAuthorScriptFlow(stagesFlow([{ id: 'start', body: [], next: 'gone' }]), 'flow'),
    ).toThrow(new Error('flow.stages[0].next: 未命中 stage gone'))
  })

  test('普通步骤经作者与运行时两入口通过且输入保真', () => {
    expectAcceptsUnchanged((value) => checkAuthorScriptFlow(value, 'flow'), legalStages())
    expectAcceptsUnchanged((value) => checkRuntimeScriptFlow(value, 'flow'), legalStages())
  })

  test('stages 空数组拒绝且路径精确', () => {
    const bad = { ...legalStages(), stages: [] }
    const before = deepSnapshot(bad)
    expectExactError(() => checkAuthorScriptFlow(bad, 'flow'), 'flow.stages: 期望非空数组')
    expect(bad).toEqual(before)
  })

  test('rejects a non-array body at its stage', () => {
    const bad = stagesFlow([{ id: 'start', body: 42 }])
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkAuthorScriptFlow(bad, 'flow'),
      'flow.stages[0].body: 期望 BaseAuthorCommand[]',
    )
    expect(bad).toEqual(before)
  })

  test('未知 flow kind 与 stage entry reveal kind 拒绝', () => {
    const badKind = { ...legalStages(), kind: 'other' }
    const kindBefore = deepSnapshot(badKind)
    expectExactError(() => checkAuthorScriptFlow(badKind, 'flow'), 'flow.kind: 期望 stages')
    expect(badKind).toEqual(kindBefore)
    const badReveal = {
      kind: 'stages',
      initial: 'start',
      stages: [{ id: 'start', body: [], entry: { prepare: [], reveal: { kind: 'wipe' } } }],
    }
    const revealBefore = deepSnapshot(badReveal)
    expectExactError(
      () => checkAuthorScriptFlow(badReveal, 'flow', { allowSceneEntry: true }),
      'flow.stages[0].entry.reveal.kind: 期望 dither|fade|cut',
    )
    expect(badReveal).toEqual(revealBefore)
  })
})
