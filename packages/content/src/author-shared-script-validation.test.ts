import { describe, expect, test } from 'vitest'
import { expectExactError } from './__tests__/validation-assertions.js'
import { checkAuthorScriptLibrary } from './author-script.js'

describe('author shared-script metadata and body', () => {
  const script = (over: object) => ({
    name: '共享脚本',
    self: 'none',
    body: [],
    ...over,
  })

  test('self 三态合法 / 非法值拒绝', () => {
    for (const self of ['none', 'optional', 'required'] as const)
      expect(() => checkAuthorScriptLibrary({ s: script({ self }) })).not.toThrow()
    expectExactError(
      () => checkAuthorScriptLibrary({ s: script({ self: 'maybe' }) }),
      'content/shared-scripts.json.s.self: 期望 none|optional|required',
    )
  })

  test('坏 body / description 非字符串 / 未知字段 逐轴拒绝', () => {
    expectExactError(
      () => checkAuthorScriptLibrary({ s: script({ body: 'x' }) }),
      'content/shared-scripts.json.s.body: 期望 BaseAuthorCommand[]',
    )
    expectExactError(
      () => checkAuthorScriptLibrary({ s: script({ description: 3 }) }),
      'content/shared-scripts.json.s.description: 期望 string',
    )
    expectExactError(
      () => checkAuthorScriptLibrary({ s: script({ wat: 1 }) }),
      'content/shared-scripts.json.s.wat: 未知字段',
    )
  })

  test('callScript 引用形状（script 稳定 id 字符串）', () => {
    expect(() =>
      checkAuthorScriptLibrary({
        source: script({ body: [{ kind: 'callScript', script: 'target' }] }),
        target: script({}),
      }),
    ).not.toThrow()
    expectExactError(
      () => checkAuthorScriptLibrary({ s: script({ body: [{ kind: 'callScript', script: 3 }] }) }),
      'content/shared-scripts.json.s.body[0].script: 期望非空字符串',
    )
  })
})
