import { createScriptIndex } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { createAuthoredScriptCall, createAuthoredScriptId } from './shared-script.js'

describe('作者共享脚本稳定 id', () => {
  test('ASCII 名称 slug 化；中文回退 script；碰撞追加序号', () => {
    expect(createAuthoredScriptId('Open Door!', [], 'a1b2-c3d4')).toBe(
      'shared/user/open-door-a1b2c3d4',
    )
    const id = createAuthoredScriptId('开门', [], '1122-3344')
    expect(id).toBe('shared/user/script-11223344')
    expect(createAuthoredScriptId('开门', [id], '1122-3344')).toBe(`${id}-2`)
  })

  test('callScript 表单构造以稳定 id 推导 chunk，并保留显式 self', () => {
    const id = 'shared/user/open-door-a1b2c3d4'
    const index = {
      ...createScriptIndex({ shared: 1, global: {} }),
      library: { [id]: { name: '开门', self: 'required' as const } },
    }
    expect(createAuthoredScriptCall(index, id, 'e2')).toEqual({
      kind: 'callScript',
      ref: { chunk: 'shared/c00', id },
      self: 'e2',
    })
    expect(() => createAuthoredScriptCall(index, 'shared/user/missing')).toThrow(/不存在/)
  })
})
