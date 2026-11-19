import { describe, expect, test } from 'vitest'
import { loadLegalUiProject } from '../ui/__tests__/glm-leaf-workflows/legal-session.js'
import { stubNodeTestHost } from '../ui/__tests__/glm-leaf-workflows/node-bridge.js'
import { fixtureScriptRef, withFixtureScript } from './__tests__/script-reference-fixture.js'
import { findScriptReferences } from './script-references.js'

async function scriptedState() {
  await stubNodeTestHost()
  const { state } = await loadLegalUiProject('authored-script-references')
  const index = withFixtureScript(
    state,
    'shared/user/route',
    [
      { kind: 'callScript', ref: fixtureScriptRef('shared/user/helper') },
      { kind: 'setFlag', flag: 'routed', value: true },
    ],
    'none',
    '路线',
  )
  return withFixtureScript(
    index,
    'shared/user/helper',
    [{ kind: 'setFlag', flag: 'helped', value: true }],
    'none',
    '辅助',
  )
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
