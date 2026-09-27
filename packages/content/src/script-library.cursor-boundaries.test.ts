/**
 * TEST-CURSOR-PURE-WAVE-1 A02：derived chunk 未命中时 getScriptBody 回退实际 owner。
 * 错 chunk 的 check 拒绝见 script-library.test.ts，不重做。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './cursor-pure-fixtures.js'
import {
  deriveScriptChunk,
  getScriptBody,
  type ScriptChunkV1,
  type ScriptIndexV1,
} from './script-library.js'

const shards = { shared: 2, global: {} }

describe('A02 script-library 剩余合同', () => {
  test('getScriptBody：derived chunk 未命中时回退实际 owner，不改 chunks', () => {
    const misplacedId = 'shared/user/misplaced-a'
    const siblingId = 'shared/user/sibling-b'
    const derived = deriveScriptChunk(misplacedId, shards)
    expect(derived).toMatch(/^shared\/c0[01]$/)
    const actual = derived === 'shared/c00' ? 'shared/c01' : 'shared/c00'
    const siblingChunk = deriveScriptChunk(siblingId, shards)
    expect(siblingChunk).toBeDefined()

    const index: ScriptIndexV1 = {
      version: 1,
      shards,
      chunks: {
        'shared/c00': { path: 'chunks/shared/c00.json', bytes: 8 },
        'shared/c01': { path: 'chunks/shared/c01.json', bytes: 8 },
      },
      library: {
        [misplacedId]: { name: '错桶 A', self: 'none' },
        [siblingId]: { name: '同桶 B', self: 'none' },
      },
    }
    const chunks: Record<string, ScriptChunkV1> = {
      'shared/c00': { version: 1, id: 'shared/c00', scripts: {} },
      'shared/c01': { version: 1, id: 'shared/c01', scripts: {} },
    }
    chunks[actual]!.scripts[misplacedId] = [{ kind: 'wait', ms: 7 }]
    chunks[siblingChunk!]!.scripts[siblingId] = [{ kind: 'wait', ms: 3 }]

    const indexSnap = inputSnap(index)
    const chunksSnap = inputSnap(chunks)
    expect(getScriptBody(index, chunks, misplacedId)).toEqual([{ kind: 'wait', ms: 7 }])
    expect(getScriptBody(index, chunks, siblingId)).toEqual([{ kind: 'wait', ms: 3 }])
    expect(getScriptBody(index, chunks, 'shared/user/missing')).toBeUndefined()
    expect(index).toEqual(indexSnap)
    expect(chunks).toEqual(chunksSnap)
    expect(chunks[derived!]!.scripts[misplacedId]).toBeUndefined()
    expect(chunks[siblingChunk!]!.scripts[siblingId]).toEqual([{ kind: 'wait', ms: 3 }])
  })
})
