import { describe, expect, test } from 'vitest'
import type { Command } from './script.js'
import type { ScriptChunkV1 } from './script-library.js'
import {
  AUTHORED_SCRIPT_PREFIX,
  createScriptIndex,
  deriveScriptChunk,
  findScriptOwnerChunk,
  getScriptBody,
  removeAuthoredScript,
  upsertAuthoredScript,
} from './script-library.js'

const body = [{ kind: 'setFlag', flag: 'talked', value: true }] as const

describe('script-library 剩余合同', () => {
  test('deriveScriptChunk routes scene/shared/global ids and rejects others', () => {
    const shards = createScriptIndex().shards
    expect(deriveScriptChunk('scene/s001/main', shards)).toBe('scene/s001')
    expect(deriveScriptChunk('shared/user/route', shards)).toMatch(/^shared\//)
    expect(deriveScriptChunk('global/battle/intro', shards)).toBeUndefined()
    expect(deriveScriptChunk('unknown/x', shards)).toBeUndefined()
  })

  test('upsert stores the body under the derived shared chunk and getScriptBody reads it back', () => {
    const index = createScriptIndex()
    const id = `${AUTHORED_SCRIPT_PREFIX}route`
    const normalized = upsertAuthoredScript(index, {}, id, { name: '路线', self: 'none' }, body)
    const owner = findScriptOwnerChunk(normalized.chunks, id)!
    expect(owner).toMatch(/^shared\//)
    expect(getScriptBody(normalized.index, normalized.chunks, id)).toEqual(body)
    expect(normalized.index.library?.[id]).toEqual({ name: '路线', self: 'none' })
  })

  test('upsert outside the authored namespace or into a foreign chunk is rejected', () => {
    const index = createScriptIndex()
    expect(() =>
      upsertAuthoredScript(index, {}, 'scene/s001/main', { name: 'x', self: 'none' }, body),
    ).toThrow(AUTHORED_SCRIPT_PREFIX)
    // 外 chunk 占用：derive 的 shared chunk 与现存 owner 冲突。
    const foreign: Record<string, ScriptChunkV1> = {
      'scene/s001': {
        version: 1,
        id: 'scene/s001',
        scripts: { 'shared/user/route': [] as Command[] },
      },
    }
    expect(() =>
      upsertAuthoredScript(index, foreign, 'shared/user/route', { name: 'x', self: 'none' }, body),
    ).toThrow('重分桶')
  })

  test('remove deletes the library entry and the emptied chunk, failing loudly when absent', () => {
    const id = `${AUTHORED_SCRIPT_PREFIX}route`
    const first = upsertAuthoredScript(
      createScriptIndex(),
      {},
      id,
      { name: '路线', self: 'none' },
      body,
    )
    const removed = removeAuthoredScript(first.index, first.chunks, id)
    expect(removed.index.library).toBeUndefined()
    expect(findScriptOwnerChunk(removed.chunks, id)).toBeUndefined()
    // 唯一脚本移除后，空 chunk 本体也从分片表里消失。
    expect(Object.keys(removed.chunks)).toHaveLength(0)
    expect(() =>
      removeAuthoredScript(first.index, first.chunks, `${AUTHORED_SCRIPT_PREFIX}gone`),
    ).toThrow('作者脚本不存在')
  })
})
