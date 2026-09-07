import { describe, expect, test } from 'vitest'
import {
  type AuthorSavePlan,
  parseAuthorSavePlan,
  parseSaveIdentity,
  parseSaveSignature,
  type SaveStep,
  savePayloadHash,
  savePrefix,
} from './author-save-plan.js'

const identity = {
  workspaceId: 'cf448da8-601d-4c9c-bbdc-235b7d61d483',
  projectId: 'test',
  mode: 'local-project',
  source: 'blank-project',
} as const
const old = `bin:1:${'a'.repeat(64)}` as const
const next = `bin:2:${'b'.repeat(64)}` as const
function plan(): AuthorSavePlan {
  return {
    kind: 'type-pal-author-save-plan',
    version: 1,
    contentVersion: 20,
    operationId: identity.workspaceId,
    identity,
    before: { 'content/actor.json': old, 'content/new.json': null, 'content/removed.json': old },
    directories: { content: true, empty: false },
    steps: [
      { kind: 'write', path: 'content/actor.json', signature: next },
      { kind: 'write', path: 'content/new.json', signature: next },
      { kind: 'remove', path: 'content/removed.json' },
      { kind: 'mkdir', path: 'empty' },
    ],
  }
}

describe('immutable current author save plan', () => {
  test('roundtrips its exact fields and derives only a committed prefix', () => {
    const p = parseAuthorSavePlan(JSON.parse(JSON.stringify(plan())), identity)
    expect(p).toEqual(plan())
    expect(savePrefix(p, 0).files.get('content/actor.json')).toBe(old)
    expect(savePrefix(p, 1).files.get('content/new.json')).toBeNull()
    const end = savePrefix(p, p.steps.length)
    expect(end.files.get('content/actor.json')).toBe(next)
    expect(end.files.get('content/new.json')).toBe(next)
    expect(end.files.get('content/removed.json')).toBeNull()
    expect(end.directories.get('empty')).toBe(true)
    expect(savePayloadHash(next)).toBe('b'.repeat(64))
  })
  test('catalog double writes retain separate prefix positions', () => {
    const p = plan()
    p.steps.push({ kind: 'write', path: 'content/actor.json', signature: old })
    expect(savePrefix(p, 1).files.get('content/actor.json')).toBe(next)
    expect(savePrefix(p, 5).files.get('content/actor.json')).toBe(old)
  })
  test.each([-1, 5, 0.5, NaN, Infinity])('rejects an invalid cursor %s', (cursor) => {
    expect(() => savePrefix(plan(), cursor)).toThrow('游标')
  })
  test.each([
    undefined,
    false,
    'x',
    `bin:01:${'a'.repeat(64)}`,
    `bin:-1:${'a'.repeat(64)}`,
    `bin:9007199254740992:${'a'.repeat(64)}`,
    `bin:1:${'A'.repeat(64)}`,
  ])('rejects malformed digest %s', (digest) => {
    expect(() => parseSaveSignature(digest)).toThrow('签名')
  })
  test('accepts absence and an empty-file digest', () => {
    expect(parseSaveSignature(null)).toBeNull()
    expect(parseSaveSignature(`bin:0:${'c'.repeat(64)}`)).toBe(`bin:0:${'c'.repeat(64)}`)
  })
  test.each([
    null,
    [],
    {},
    { ...identity, mode: 'other' },
    { ...identity, source: 'dev-http' },
    { ...identity, source: null },
    { ...identity, projectId: '' },
    { ...identity, projectId: 0 },
    { ...identity, workspaceId: 'not-a-workspace' },
  ])('rejects invalid identity %j', (input) => {
    expect(() => parseSaveIdentity(input)).toThrow()
  })
  test.each(['sandbox', 'pal-development'] as const)('validates %s source combinations', (mode) => {
    expect(
      parseSaveIdentity({
        ...identity,
        mode,
        source: mode === 'sandbox' ? 'ui-samples' : 'dev-http',
      }).mode,
    ).toBe(mode)
  })
  test.each([
    ['version', 0],
    ['contentVersion', 19],
    ['kind', 'other'],
    ['operationId', '../x'],
    ['extra', true],
    ['steps', {}],
    ['before', []],
    ['directories', null],
    ['identity', { ...identity, projectId: 'other' }],
  ])('rejects %s changes', (key, value) => {
    expect(() => parseAuthorSavePlan({ ...plan(), [String(key)]: value }, identity)).toThrow()
  })
  test.each([
    '../escape',
    '/root',
    '.type-pal/save-state.json',
    '.TYPE-PAL./x',
  ])('rejects unsafe destination %s', (path) => {
    const p = plan()
    p.before[path] = null
    expect(() => parseAuthorSavePlan(p, identity)).toThrow()
  })
  test.each([
    undefined,
    {},
    { kind: 'write', path: 0 },
    { kind: 'write', path: 'unplanned', signature: next },
    { kind: 'write', path: 'content/new.json', signature: null },
    { kind: 'remove', path: 'unplanned' },
    { kind: 'mkdir', path: 'unplanned' },
    { kind: 'other', path: 'content/new.json' },
    { kind: 'remove', path: 'content/new.json', extra: true },
  ])('rejects an invalid or unplanned step %j', (step) => {
    const p = plan()
    p.steps = [step] as SaveStep[]
    expect(() => parseAuthorSavePlan(p, identity)).toThrow()
  })
  test('rejects sparse steps, file/directory aliases, missing and uncreated parents', () => {
    const sparse = plan()
    sparse.steps = new Array(1)
    expect(() => parseAuthorSavePlan(sparse, identity)).toThrow()
    const alias = plan()
    alias.before['CONTENT/actor.json'] = old
    expect(() => parseAuthorSavePlan(alias, identity)).toThrow('别名')
    const trailing = plan()
    trailing.before['content/actor.json. '] = old
    expect(() => parseAuthorSavePlan(trailing, identity)).toThrow('别名')
    const emptyAlias = plan()
    emptyAlias.before['...'] = null
    expect(() => parseAuthorSavePlan(emptyAlias, identity)).toThrow('别名')
    const file = plan()
    file.before.content = old
    expect(() => parseAuthorSavePlan(file, identity)).toThrow('目录')
    const missing = plan()
    delete missing.directories.content
    expect(() => parseAuthorSavePlan(missing, identity)).toThrow('父目录')
    const notCreated = plan()
    notCreated.directories.content = false
    expect(() => parseAuthorSavePlan(notCreated, identity)).toThrow('尚未创建')
    const malformed = plan()
    malformed.directories.empty = 1 as unknown as boolean
    expect(() => parseAuthorSavePlan(malformed, identity)).toThrow('目录')
  })
})
