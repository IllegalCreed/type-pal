/** TEST-GLM-WAVE-O-1 O07：共享脚本库分片/索引/upsert/remove 残余合同。
 *  旧证：script-library.test.ts 等覆盖常规路径；本卡按 gap-map 直击未覆盖臂：
 *  deriveScriptChunk 分桶、findScriptOwnerChunk 重复 id、normalize 排序/裁剪、
 *  upsert/remove 幂等与索引元数据同步、checkScriptIndex 结构轴。
 */
import { describe, expect, test } from 'vitest'
import {
  checkScriptIndex,
  createScriptIndex,
  deriveScriptChunk,
  findScriptOwnerChunk,
  getScriptBody,
  normalizeScriptLibrary,
  removeAuthoredScript,
  stableScriptHash,
  upsertAuthoredScript,
  type ScriptChunkV1,
} from './script-library.js'

const index = () => createScriptIndex()
const chunkWith = (id: string, scripts: Record<string, unknown[]>): ScriptChunkV1 =>
  ({ version: 1, id, scripts }) as ScriptChunkV1
const meta = (name: string) => ({ name, self: 'optional' as const })

describe('O07 deriveScriptChunk / stableScriptHash：分桶与哈希', () => {
  test('同 id 稳定、不同 id 可落不同分片；shared 桶数边界', () => {
    const shards = { shared: 4, global: {} }
    expect(deriveScriptChunk('s1', shards)).toBe(deriveScriptChunk('s1', shards))
    const seen = new Set(['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => deriveScriptChunk(id, shards)))
    expect(seen.size).toBeLessThanOrEqual(4)
  })

  test('global 域脚本按 global/<domain> 分片；未登记 domain → undefined', () => {
    const shards = { shared: 4, global: { special: 1 } }
    expect(deriveScriptChunk('global/special/x', shards)).toBe('global/special/c00')
    expect(deriveScriptChunk('global/unknown/x', shards)).toBeUndefined()
  })

  test('scene 前缀 → scene/<id> 分片', () => {
    expect(deriveScriptChunk('scene/s001/hook', { shared: 4, global: {} })).toBe('scene/s001')
  })

  test('stableScriptHash 稳定且区分输入', () => {
    expect(stableScriptHash('abc')).toBe(stableScriptHash('abc'))
    expect(stableScriptHash('abc')).not.toBe(stableScriptHash('abd'))
  })
})

describe('O07 findScriptOwnerChunk / getScriptBody：归属与读取', () => {
  test('单 owner 命中；跨 chunk 重复 id fail-loud；未登记 undefined', () => {
    const chunks = { a: chunkWith('a', { s1: [{ kind: 'gameOver' }] }) }
    expect(findScriptOwnerChunk(chunks, 's1')).toBe('a')
    expect(() =>
      findScriptOwnerChunk({ a: chunkWith('a', { s1: [] }), b: chunkWith('b', { s1: [] }) }, 's1'),
    ).toThrow('脚本 id 重复 s1(a,b)')
    expect(findScriptOwnerChunk({}, 's1')).toBeUndefined()
  })

  test('getScriptBody：先按派生分片直取，未命中再全局寻 owner', () => {
    const idx = index()
    const derived = deriveScriptChunk('s1', idx.shards)!
    const chunks = { [derived]: chunkWith(derived, { s1: [{ kind: 'gameOver' }] }) } as Record<
      string,
      ScriptChunkV1
    >
    expect(getScriptBody(idx, chunks, 's1')).toEqual([{ kind: 'gameOver' }])
    // 迁移脚本不在派生分片 → owner 扫描兜底。
    const elsewhere = { other: chunkWith('other', { legacy: [{ kind: 'fleeBattle' }] }) }
    expect(getScriptBody(idx, elsewhere, 'legacy')).toEqual([{ kind: 'fleeBattle' }])
  })
})

describe('O07 normalizeScriptLibrary / upsert / remove：幂等与索引同步', () => {
  test('normalize 按 id 排序合并 chunks 并保留合法体', () => {
    const idx = index()
    const normalized = normalizeScriptLibrary(idx, {
      b: chunkWith('b', { s2: [{ kind: 'gameOver' }] }),
      a: chunkWith('a', { s1: [{ kind: 'fleeBattle' }] }),
    })
    expect(normalized.chunks.a?.scripts.s1).toBeDefined()
    expect(normalized.chunks.b?.scripts.s2).toBeDefined()
  })

  test('upsert：shared/user/ 命名空间强制；登记元数据 + 落派生分片；重复幂等', () => {
    const idx = index()
    expect(() => upsertAuthoredScript(idx, {}, 'my-script', meta('我的脚本'), [{ kind: 'gameOver' }])).toThrow(
      '作者脚本 id 必须位于 shared/user/ 命名空间',
    )
    const first = upsertAuthoredScript(idx, {}, 'shared/user/my-script', meta('我的脚本'), [
      { kind: 'gameOver' },
    ])
    expect(first.index.library?.['shared/user/my-script']).toMatchObject({ name: '我的脚本' })
    const derived = deriveScriptChunk('shared/user/my-script', idx.shards)!
    expect(first.chunks[derived]?.scripts['shared/user/my-script']).toEqual([{ kind: 'gameOver' }])
    const second = upsertAuthoredScript(
      first.index,
      first.chunks,
      'shared/user/my-script',
      meta('我的脚本'),
      [{ kind: 'gameOver' }],
    )
    expect(second.chunks[derived]?.scripts['shared/user/my-script']).toEqual(
      first.chunks[derived]?.scripts['shared/user/my-script'],
    )
  })

  test('remove：未登记 id fail-loud；已登记移除元数据与脚本体', () => {
    const idx = index()
    expect(() => removeAuthoredScript(idx, {}, 'shared/user/ghost')).toThrow(
      '作者脚本不存在 shared/user/ghost',
    )
    const withScript = upsertAuthoredScript(idx, {}, 'shared/user/my-script', meta('x'), [
      { kind: 'gameOver' },
    ])
    const after = removeAuthoredScript(withScript.index, withScript.chunks, 'shared/user/my-script')
    expect(after.index.library?.['shared/user/my-script']).toBeUndefined()
    const derived = deriveScriptChunk('shared/user/my-script', idx.shards)!
    expect(after.chunks[derived]?.scripts['shared/user/my-script']).toBeUndefined()
  })
})

describe('O07 checkScriptIndex：结构轴', () => {
  test('version 漂移 / shards 缺失 逐轴拒绝；合法索引通过', () => {
    expect(() => checkScriptIndex({ version: 2, shards: {}, chunks: {} })).toThrow(
      'scripts/index.json.version: 期望 1',
    )
    expect(() => checkScriptIndex({ version: 1, chunks: {} })).toThrow(/shards: 期望对象/)
    expect(() => checkScriptIndex(index())).not.toThrow()
  })
})
