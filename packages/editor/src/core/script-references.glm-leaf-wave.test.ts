import { upsertAuthoredScript } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadLegalUiProject } from '../ui/__tests__/glm-leaf-workflows/legal-session.js'
import { stubNodeTestHost } from '../ui/__tests__/glm-leaf-workflows/node-bridge.js'
import { findScriptReferences } from './script-references.js'

/** 合法项目 + 真实 upsertAuthoredScript：route 调 helper，均为作者命名空间脚本。 */
async function scriptedState() {
  await stubNodeTestHost()
  const legal = await loadLegalUiProject('glm-leaf-script-refs')
  const index = legal.state.scriptIndex ?? {
    version: 1,
    shards: { shared: 16, global: {} },
    chunks: {},
  }
  const route = upsertAuthoredScript(
    index,
    legal.state.scriptChunks,
    'shared/user/route',
    { name: '路线', self: 'none' },
    [
      { kind: 'callScript', ref: { chunk: 'shared/c00', id: 'shared/user/helper' } },
      { kind: 'setFlag', flag: 'routed', value: true },
    ],
  )
  const withHelper = upsertAuthoredScript(
    route.index,
    route.chunks,
    'shared/user/helper',
    { name: '辅助', self: 'none' },
    [{ kind: 'setFlag', flag: 'helped', value: true }],
  )
  return { ...legal.state, scriptIndex: withHelper.index, scriptChunks: withHelper.chunks }
}

describe('script-references 剩余合同', () => {
  test('callScript callers point back with full target/kind/caller/path and input deep snapshot', async () => {
    const state = await scriptedState()
    const stateBefore = JSON.stringify(state)
    // route 调 helper → helper 的引用表记录完整结构化条目（G27：domain/owner/path 全断言）。
    const references = findScriptReferences(state, 'shared/user/helper')
    expect(references).toHaveLength(1)
    const entry = references[0]!
    expect(entry.target).toEqual({ chunk: 'shared/c00', id: 'shared/user/helper' })
    expect(entry.kind).toBe('call')
    expect(entry.caller).toEqual({
      type: 'script',
      scriptId: 'shared/user/route',
      label: '路线(shared/user/route)',
    })
    expect(entry.path).toBe('/0')
    // 输入保真：查询不改写 index/chunks。
    expect(JSON.stringify(state)).toBe(stateBefore)
  })

  test('a root script with no inbound callers yields an empty reference list', async () => {
    const state = await scriptedState()
    expect(findScriptReferences(state, 'shared/user/route')).toEqual([])
    expect(findScriptReferences(state, 'shared/user/gone')).toEqual([])
  })
})
