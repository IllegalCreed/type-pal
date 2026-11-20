import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { Command } from './script.js'
import {
  checkScriptIndex,
  checkScriptLibrary,
  checkScriptRef,
  deriveScriptChunk,
  findScriptOwnerChunk,
  getScriptBody,
  type ScriptChunkV1,
  type ScriptIndexV1,
  utf8ByteLength,
  visitScriptRefs,
} from './script-library.js'

function index(
  chunks: Readonly<Record<string, ScriptChunkV1>> = {},
  library?: ScriptIndexV1['library'],
): ScriptIndexV1 {
  return {
    version: 1,
    shards: { shared: 1, global: { items: 2 } },
    chunks: Object.fromEntries(
      Object.entries(chunks).map(([id, chunk]) => [
        id,
        { path: `${id}.json`, bytes: utf8ByteLength(JSON.stringify(chunk)) },
      ]),
    ),
    ...(library ? { library } : {}),
  }
}

function chunk(id: string, scripts: Record<string, Command[]>): ScriptChunkV1 {
  return { version: 1, id, scripts }
}

test.each([
  ['root null', null, 'scripts/index.json: 期望对象'],
  ['version', { ...index(), version: 2 }, 'scripts/index.json.version: 期望 1'],
  ['shards null', { ...index(), shards: null }, 'scripts/index.json.shards: 期望对象'],
  [
    'shared count',
    { ...index(), shards: { shared: 0, global: {} } },
    'scripts/index.json.shards.shared: 期望正整数',
  ],
  [
    'global null',
    { ...index(), shards: { shared: 1, global: null } },
    'scripts/index.json.shards.global: 期望对象',
  ],
  [
    'global array',
    { ...index(), shards: { shared: 1, global: [1] } },
    'scripts/index.json.shards.global: 期望对象',
  ],
  [
    'global count',
    { ...index(), shards: { shared: 1, global: { items: 0 } } },
    'scripts/index.json.shards.global.items: 期望正整数',
  ],
  ['chunks null', { ...index(), chunks: null }, 'scripts/index.json.chunks: 期望对象'],
  [
    'chunk metadata null',
    { ...index(), chunks: { x: null } },
    'scripts/index.json.chunks.x: 期望对象',
  ],
  [
    'path empty',
    { ...index(), chunks: { x: { path: '', bytes: 0 } } },
    'scripts/index.json.chunks.x.path: 期望非空字符串',
  ],
  [
    'byte type',
    { ...index(), chunks: { x: { path: 'x.json', bytes: '0' } } },
    'scripts/index.json.chunks.x.bytes: 期望非负整数',
  ],
  [
    'byte negative',
    { ...index(), chunks: { x: { path: 'x.json', bytes: -1 } } },
    'scripts/index.json.chunks.x.bytes: 期望非负整数',
  ],
  ['library null', { ...index(), library: null }, 'scripts/index.json.library: 期望对象'],
  [
    'author metadata null',
    { ...index(), library: { 'shared/user/a': null } },
    'scripts/index.json.library.shared/user/a: 期望对象',
  ],
  [
    'description type',
    { ...index(), library: { 'shared/user/a': { name: 'A', self: 'none', description: 0 } } },
    'scripts/index.json.library.shared/user/a.description: 期望字符串',
  ],
])('script index boundary: %s', (_label, input, message) => {
  const before = deepSnapshot(input)
  expect(() => checkScriptIndex(input)).toThrow(new Error(message))
  expect(input).toEqual(before)
})

test('an index can only assign one chunk to each canonical path', () => {
  const first = chunk('scene/a', { 'scene/a/root': [] })
  const second = chunk('scene/b', { 'scene/b/root': [] })
  const root = index({ 'scene/a': first, 'scene/b': second })
  expect(() => checkScriptIndex(root)).not.toThrow()
  const firstMeta = root.chunks['scene/a']
  if (!firstMeta) throw new Error('missing first chunk metadata')
  expect(() =>
    checkScriptIndex({ ...root, chunks: { ...root.chunks, 'scene/b': firstMeta } }),
  ).toThrow('scripts/index.json.chunks.scene/b.path: 与 chunk scene/a 重复使用 scene/a.json')
  expect(() =>
    checkScriptIndex({
      ...root,
      chunks: { ...root.chunks, 'scene/b': { ...firstMeta, path: '../outside.json' } },
    }),
  ).toThrow(/禁止空段、\. 或 \.\./)
})

test('author metadata requires its namespace and a recognized self contract', () => {
  const meta = { name: '休息', description: '', self: 'none' } as const
  expect(() => checkScriptIndex(index({}, { 'shared/user/rest': meta }))).not.toThrow()
  expect(() => checkScriptIndex(index({}, { 'shared/internal/rest': meta }))).toThrow(
    /作者脚本 id 必须位于 shared\/user\//,
  )
  expect(() =>
    checkScriptIndex({
      ...index(),
      library: { 'shared/user/rest': { ...meta, self: 'sometimes' } },
    }),
  ).toThrow('scripts/index.json.library.shared/user/rest.self: 期望 none|optional|required')
})

test('derives exact scene and global owners and keeps members of one shared group together', () => {
  const shards = { shared: 16, global: { items: 4 } }
  expect(deriveScriptChunk('scene/s001/main', shards)).toBe('scene/s001')
  expect(deriveScriptChunk('global/items/use/i42', shards)).toBe('global/items/c03')
  expect(deriveScriptChunk('shared/L_123/default', shards)).toBe('shared/c14')
  for (const id of ['shared/scc-7/entry', 'shared/scc-7/exit'])
    expect(deriveScriptChunk(id, shards)).toBe('shared/c04')
  for (const id of ['global/absent/x', 'global//x', 'unknown/x'])
    expect(deriveScriptChunk(id, shards)).toBeUndefined()
})

test('ScriptRef requires a chunk and stable id and its visitor preserves the reference', () => {
  const ref = { chunk: 'scene/a', id: 'scene/a/root' }
  const input = { inner: [null, 'not-ref', { child: ref }] }
  const before = deepSnapshot(input)
  expect(() => checkScriptRef(ref, 'scene.onEnter')).not.toThrow()
  expect(() => checkScriptRef({ chunk: '', id: ref.id }, 'scene.onEnter')).toThrow(
    'scene.onEnter: 期望 {chunk,id} ScriptRef',
  )
  const visited: unknown[] = []
  visitScriptRefs(input, (value) => visited.push(value))
  expect(visited).toEqual([ref])
  expect(visited[0]).toBe(ref)
  expect(input).toEqual(before)
})

test('script ownership detects duplicates, resolves the actual owner, and distinguishes an empty body from absence', () => {
  const chunks = {
    'scene/a': chunk('scene/a', { 'scene/a/empty': [] }),
    'scene/b': chunk('scene/b', { 'internal/body': [{ kind: 'wait', ms: 7 }] }),
  }
  const before = deepSnapshot(chunks)
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
    '脚本 id 重复 internal/body(scene/b,scene/c)',
  )
  expect(chunks).toEqual(before)
})

test('script lookup treats prototype names as missing unless explicitly registered', () => {
  const chunks = { 'scene/a': chunk('scene/a', { 'scene/a/root': [] }) }
  expect(findScriptOwnerChunk(chunks, 'constructor')).toBeUndefined()
  expect(getScriptBody(index(), chunks, 'constructor')).toBeUndefined()
  const body: Command[] = [{ kind: 'wait', ms: 7 }]
  const explicit = { 'scene/a': chunk('scene/a', { constructor: body }) }
  expect(getScriptBody(index(), explicit, 'constructor')).toEqual([{ kind: 'wait', ms: 7 }])
})

test('checks exact bytes and hash against a Unicode wire fixture', () => {
  const chunks = { 'scene/a': chunk('scene/a', { 'scene/a/é中🧪': [] }) }
  // Fixed wire values from Node Buffer.byteLength and FNV-1a over the serialized UTF-16 units.
  const meta = { path: 'scene/a.json', bytes: 63, hash: '332d039a' }
  const withMeta = (value: typeof meta) => ({ ...index(), chunks: { 'scene/a': value } })
  expect(() => checkScriptLibrary(withMeta(meta), chunks)).not.toThrow()
  expect(() => checkScriptLibrary(withMeta({ ...meta, bytes: 62 }), chunks)).toThrow(
    'scripts/scene/a: bytes 62 与实际 63 不一致',
  )
  expect(() => checkScriptLibrary(withMeta({ ...meta, hash: '332d039b' }), chunks)).toThrow(
    'scripts/scene/a: hash 332d039b 与实际 332d039a 不一致',
  )
  expect(() => checkScriptLibrary(withMeta(meta), {})).toThrow(
    'scripts/scene/a: index chunk 缺文件',
  )
  expect(() => checkScriptLibrary(index(), chunks)).toThrow('scripts/scene/a: chunk 不在 index')
})

test('an authored entry needs a body in its derived shared chunk', () => {
  const id = 'shared/user/rest'
  const library = { [id]: { name: '休息', self: 'none' as const } }
  expect(() => checkScriptLibrary(index({}, library), {})).toThrow(
    'scripts: 作者脚本 shared/user/rest 没有脚本体',
  )
  const misplaced = { 'shared/c99': chunk('shared/c99', { [id]: [] }) }
  expect(() => checkScriptLibrary(index(misplaced, library), misplaced)).toThrow(
    'scripts: 作者脚本 shared/user/rest 位于 shared/c99，应位于 shared/c00',
  )
})

test('a stale chunk hint is allowed only when the stable ID resolves', () => {
  const withRef = (id: string) => ({
    'scene/a': chunk('scene/a', {
      'scene/a/root': [{ kind: 'callScript', ref: { chunk: 'old-hint', id } }],
    }),
    'scene/b': chunk('scene/b', { 'scene/b/root': [] }),
  })
  const good = withRef('scene/b/root')
  expect(() => checkScriptLibrary(index(good), good)).not.toThrow()
  const missing = withRef('scene/b/absent')
  expect(() => checkScriptLibrary(index(missing), missing)).toThrow(
    'scripts: 孤儿 ref old-hint:scene/b/absent(derived=scene/b)',
  )
})

test('an inherited member does not satisfy a declared script reference', () => {
  const chunks = {
    'scene/a': chunk('scene/a', {
      'scene/a/root': [{ kind: 'callScript', ref: { chunk: 'scene/a', id: 'constructor' } }],
    }),
  }
  expect(() => checkScriptLibrary(index(chunks), chunks)).toThrow(
    'scripts: 孤儿 ref scene/a:constructor(derived=none)',
  )
})
