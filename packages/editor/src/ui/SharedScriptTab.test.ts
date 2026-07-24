import { describe, expect, test } from 'vitest'
import { resolveSharedScriptEditingId } from './SharedScriptTab.js'

describe('resolveSharedScriptEditingId', () => {
  test('未选择内部实现时保留作者脚本目标', () => {
    expect(resolveSharedScriptEditingId([], '', 'shared/user/manual')).toBe('shared/user/manual')
  })

  test('内部列表选择优先于作者脚本', () => {
    expect(resolveSharedScriptEditingId([], 'shared/scc-L-1/body', 'shared/user/manual')).toBe(
      'shared/scc-L-1/body',
    )
  })

  test('钻取路径的最后一项优先于列表选择', () => {
    expect(
      resolveSharedScriptEditingId(
        ['shared/scc-L-1/body', 'scene/s001/L-2/e3/body'],
        'shared/scc-L-4/body',
        'shared/user/manual',
      ),
    ).toBe('scene/s001/L-2/e3/body')
  })
})
