// @ts-expect-error Node-only oracle; production content has no Node/DOM library.
import { TextEncoder } from 'node:util'
import { expect, test } from 'vitest'
import { resourceSnapshot } from './__tests__/codex-resource-contract-fixtures.js'
import { type Command, checkCommands } from './script.js'
import {
  checkScriptIndex,
  checkScriptLibrary,
  createScriptIndex,
  deriveScriptChunk,
  findScriptOwnerChunk,
  getScriptBody,
  normalizeScriptLibrary,
  removeAuthoredScript,
  type ScriptChunkV1,
  type ScriptIndexV1,
  upsertAuthoredScript,
  visitScriptRefs,
} from './script-library.js'

function index(): ScriptIndexV1 {
  return createScriptIndex({ shared: 1, global: { items: 2 } })
}
function chunk(id: string, scripts: Record<string, Command[]>): ScriptChunkV1 {
  for (const body of Object.values(scripts)) checkCommands(body, `fixture.${id}`)
  return { version: 1, id, scripts }
}

test.each([
  ['root null', () => null, 'scripts/index.json: 期望对象'],
  ['version', () => ({ ...index(), version: 2 }), 'scripts/index.json.version: 期望 1'],
  ['shards null', () => ({ ...index(), shards: null }), 'scripts/index.json.shards: 期望对象'],
  [
    'global null',
    () => ({ ...index(), shards: { shared: 1, global: null } }),
    'scripts/index.json.shards.global: 期望对象',
  ],
  [
    'global count',
    () => ({ ...index(), shards: { shared: 1, global: { items: 0 } } }),
    'scripts/index.json.shards.global.items: 期望正整数',
  ],
  ['chunks null', () => ({ ...index(), chunks: null }), 'scripts/index.json.chunks: 期望对象'],
  [
    'chunk metadata null',
    () => ({ ...index(), chunks: { x: null } }),
    'scripts/index.json.chunks.x: 期望对象',
  ],
  [
    'path empty',
    () => ({ ...index(), chunks: { x: { path: '', bytes: 0 } } }),
    'scripts/index.json.chunks.x.path: 期望非空字符串',
  ],
  [
    'byte type',
    () => ({ ...index(), chunks: { x: { path: 'x.json', bytes: '0' } } }),
    'scripts/index.json.chunks.x.bytes: 期望非负整数',
  ],
  [
    'byte negative',
    () => ({ ...index(), chunks: { x: { path: 'x.json', bytes: -1 } } }),
    'scripts/index.json.chunks.x.bytes: 期望非负整数',
  ],
  ['library null', () => ({ ...index(), library: null }), 'scripts/index.json.library: 期望对象'],
  [
    'author metadata null',
    () => ({ ...index(), library: { 'shared/user/a': null } }),
    'scripts/index.json.library.shared/user/a: 期望对象',
  ],
  [
    'description type',
    () => ({
      ...index(),
      library: { 'shared/user/a': { name: 'A', self: 'none', description: 0 } },
    }),
    'scripts/index.json.library.shared/user/a.description: 期望字符串',
  ],
])('script index boundary: %s', (_label, invalid, message) => {
  const good = {
    ...index(),
    chunks: { x: { path: 'x.json', bytes: 0 } },
    library: { 'shared/user/a': { name: 'A', self: 'none', description: '' } },
  }
  expect(() => checkScriptIndex(good)).not.toThrow()
  const input = invalid()
  const before = resourceSnapshot(input)
  expect(() => checkScriptIndex(input)).toThrow(new Error(message))
  expect(input).toEqual(before)
})

test('normalization keeps custom paths, unique external imports, Unicode byte counts and independent author inputs', () => {
  const sourceIndex = index()
  sourceIndex.chunks['shared/c00'] = { path: 'custom/scripts.json', bytes: 0 }
  sourceIndex.library = {
    'shared/user/z': { name: 'Z', self: 'optional' },
    'shared/user/é中🧪': { name: '四字节', self: 'required', description: '' },
  }
  const sources = {
    'shared/c00': chunk('shared/c00', {
      'shared/user/z': [
        { kind: 'callScript', ref: { chunk: 'scene/b', id: 'scene/b/root' } },
        { kind: 'jumpScript', ref: { chunk: 'scene/b', id: 'scene/b/root' } },
        { kind: 'callScript', ref: { chunk: 'shared/c00', id: 'shared/user/é中🧪' } },
      ],
      'shared/user/é中🧪': [{ kind: 'wait', ms: 0.5 }],
    }),
    'scene/b': chunk('scene/b', { 'scene/b/root': [] }),
  }
  const before = resourceSnapshot({ sourceIndex, sources })
  const result = normalizeScriptLibrary(sourceIndex, sources)
  checkScriptLibrary(result.index, result.chunks)
  expect({ sourceIndex, sources }).toEqual(before)
  expect(Object.keys(result.chunks)).toEqual(['scene/b', 'shared/c00'])
  expect(result.chunks['shared/c00']?.imports).toEqual(['scene/b'])
  expect(result.index.chunks['shared/c00']?.path).toBe('custom/scripts.json')
  for (const [id, value] of Object.entries(result.chunks))
    expect(result.index.chunks[id]?.bytes).toBe(
      new TextEncoder().encode(JSON.stringify(value)).length,
    )
  result.index.shards.global.items = 17
  const metadata = result.index.library?.['shared/user/z']
  if (!metadata) throw new Error('missing normalized author metadata')
  metadata.name = 'changed'
  result.chunks['shared/c00']?.scripts['shared/user/é中🧪']?.push({ kind: 'wait', ms: 9 })
  expect({ sourceIndex, sources }).toEqual(before)
})

test('normalization enforces the exact 1MiB serialized chunk boundary using independent UTF-8 length', () => {
  const small = chunk('scene/a', { 'scene/a/': [] })
  const overhead = new TextEncoder().encode(JSON.stringify(small)).length
  function input(bytes: number) {
    return { 'scene/a': chunk('scene/a', { [`scene/a/${'x'.repeat(bytes - overhead)}`]: [] }) }
  }
  const below = input(1024 * 1024 - 1)
  const at = input(1024 * 1024)
  expect(new TextEncoder().encode(JSON.stringify(at['scene/a'])).length).toBe(1024 * 1024)
  const normalized = normalizeScriptLibrary(index(), below)
  checkScriptLibrary(normalized.index, normalized.chunks)
  expect(normalized.index.chunks['scene/a']?.bytes).toBe(1024 * 1024 - 1)
  const before = resourceSnapshot(at)
  expect(() => normalizeScriptLibrary(index(), at)).toThrow(
    new Error('脚本 chunk scene/a 1048576B 超过 1MiB'),
  )
  expect(at).toEqual(before)
})

test('script ownership detects duplicates, resolves the actual owner, and distinguishes an empty body from absence', () => {
  const chunks = {
    'scene/a': chunk('scene/a', { 'scene/a/empty': [] }),
    'scene/b': chunk('scene/b', { 'internal/body': [{ kind: 'wait', ms: 7 }] }),
  }
  const before = resourceSnapshot(chunks)
  expect(getScriptBody(index(), chunks, 'scene/a/empty')).toBe(
    chunks['scene/a'].scripts['scene/a/empty'],
  )
  expect(getScriptBody(index(), chunks, 'internal/body')).toBe(
    chunks['scene/b'].scripts['internal/body'],
  )
  expect(getScriptBody(index(), chunks, 'global/unknown/id')).toBeUndefined()
  expect(findScriptOwnerChunk(chunks, 'missing')).toBeUndefined()
  const duplicate = { ...chunks, 'scene/c': chunk('scene/c', { 'internal/body': [] }) }
  expect(() => findScriptOwnerChunk(duplicate, 'internal/body')).toThrow(
    new Error('脚本 id 重复 internal/body(scene/b,scene/c)'),
  )
  expect(chunks).toEqual(before)
})

test('authored removal keeps collocated siblings and updates metadata without mutating either input', () => {
  const first = upsertAuthoredScript(index(), {}, 'shared/user/a', { name: 'A', self: 'none' }, [])
  const both = upsertAuthoredScript(
    first.index,
    first.chunks,
    'shared/user/b',
    { name: 'B', self: 'optional' },
    [{ kind: 'wait', ms: 5 }],
  )
  checkScriptLibrary(both.index, both.chunks)
  const before = resourceSnapshot(both)
  const result = removeAuthoredScript(both.index, both.chunks, 'shared/user/a')
  checkScriptLibrary(result.index, result.chunks)
  expect(result.index.library).toEqual({ 'shared/user/b': { name: 'B', self: 'optional' } })
  expect(result.chunks).toEqual({
    'shared/c00': {
      version: 1,
      id: 'shared/c00',
      scripts: { 'shared/user/b': [{ kind: 'wait', ms: 5 }] },
    },
  })
  expect(both).toEqual(before)
  expect(() => removeAuthoredScript(both.index, both.chunks, 'shared/user/missing')).toThrow(
    new Error('作者脚本不存在 shared/user/missing'),
  )
  expect(() => removeAuthoredScript(both.index, {}, 'shared/user/a')).toThrow(
    new Error('作者脚本 shared/user/a 没有脚本体'),
  )
  expect(both).toEqual(before)
})

test('library independently rejects stale bytes/hash, missing files and unregistered chunks', () => {
  const library = normalizeScriptLibrary(index(), {
    'scene/a': chunk('scene/a', { 'scene/a/root': [] }),
  })
  checkScriptLibrary(library.index, library.chunks)
  const meta = library.index.chunks['scene/a']
  if (!meta) throw new Error('missing fixture metadata')
  const original = resourceSnapshot(library)
  for (const [patch, message] of [
    [
      { bytes: meta.bytes + 1 },
      `scripts/scene/a: bytes ${meta.bytes + 1} 与实际 ${meta.bytes} 不一致`,
    ],
    [{ hash: 'bad' }, `scripts/scene/a: hash bad 与实际 ${meta.hash} 不一致`],
  ] as const) {
    const input = { ...library.index, chunks: { 'scene/a': { ...meta, ...patch } } }
    const before = resourceSnapshot(input)
    expect(() => checkScriptLibrary(input, library.chunks)).toThrow(new Error(message))
    expect(input).toEqual(before)
  }
  expect(() => checkScriptLibrary(library.index, {})).toThrow(
    new Error('scripts/scene/a: index chunk 缺文件'),
  )
  expect(() => checkScriptLibrary(index(), library.chunks)).toThrow(
    new Error('scripts/scene/a: chunk 不在 index'),
  )
  expect(library).toEqual(original)
})

test('ref validation accepts a stale chunk hint only when the stable ID resolves, otherwise reports the orphan', () => {
  const sources = {
    'scene/a': chunk('scene/a', {
      'scene/a/root': [{ kind: 'callScript', ref: { chunk: 'old-hint', id: 'scene/b/root' } }],
    }),
    'scene/b': chunk('scene/b', { 'scene/b/root': [] }),
  }
  const good = normalizeScriptLibrary(index(), sources)
  expect(() => checkScriptLibrary(good.index, good.chunks)).not.toThrow()
  for (const id of ['scene/b/absent', 'unknown']) {
    const bad = normalizeScriptLibrary(index(), {
      ...sources,
      'scene/a': chunk('scene/a', {
        'scene/a/root': [{ kind: 'callScript', ref: { chunk: 'old-hint', id } }],
      }),
    })
    const before = resourceSnapshot(bad)
    expect(() => checkScriptLibrary(bad.index, bad.chunks)).toThrow(
      new Error(
        `scripts: 孤儿 ref old-hint:${id}(derived=${id === 'unknown' ? 'none' : 'scene/b'})`,
      ),
    )
    expect(bad).toEqual(before)
  }
})

test('shared SCC members colocate; absent global configuration stays unresolved and reference visits preserve identity', () => {
  const shards = { shared: 16, global: { items: 3 } }
  expect(deriveScriptChunk('shared/scc-7/entry', shards)).toBe(
    deriveScriptChunk('shared/scc-7/exit', shards),
  )
  expect(deriveScriptChunk('global/absent/x', shards)).toBeUndefined()
  expect(deriveScriptChunk('global//x', shards)).toBeUndefined()
  const ref = { chunk: 'scene/a', id: 'scene/a/root' }
  const input = { inner: [null, 'not-ref', { child: ref }] }
  const before = resourceSnapshot(input)
  const visited: unknown[] = []
  visitScriptRefs(input, (value) => visited.push(value))
  expect(visited).toEqual([ref])
  expect(visited[0]).toBe(ref)
  expect(input).toEqual(before)
})
