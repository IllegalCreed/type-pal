import { describe, expect, test } from 'vitest'
import {
  assertSaveScopeProject,
  normalizeSaveScope,
  type SaveScope,
  saveScopeDatabaseName,
} from './scope.js'

describe('SaveScope', () => {
  test.each([
    undefined,
    null,
    false,
    0,
    'project',
    [],
    {},
    new Date(0),
    { kind: 'unknown', projectId: 'p' },
    { kind: 'project' },
    { kind: 'workspace', projectId: 'p' },
    { kind: 'project', projectId: 'p', workspaceId: 'w' },
    { kind: 'project', id: 'p' },
    { kind: 'project', [Symbol('id')]: 'p' },
    ...[null, '', '  ', 1, {}].map((projectId) => ({ kind: 'project', projectId })),
    ...[null, '', '\n', 1, {}].map((workspaceId) => ({
      kind: 'workspace',
      projectId: 'p',
      workspaceId,
    })),
    { kind: 'workspace', projectId: 'p', workspaceId: 'w', extra: true },
  ])('rejects invalid identity %# without inventing a project scope', (input) => {
    expect(() => normalizeSaveScope(input)).toThrow('存档')
  })

  test.each([
    { kind: 'project', projectId: ' p ' },
    { kind: 'workspace', projectId: 'p', workspaceId: ' W ' },
  ] as const)('captures exact %j identity without mutating the caller', (input) => {
    const bound = normalizeSaveScope(input)
    expect(bound).toEqual(input)
    expect(bound).not.toBe(input)
    expect(Object.isFrozen(bound)).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
  })

  test('project agreement is required before boot or storage', () => {
    const scope: SaveScope = { kind: 'project', projectId: 'p' }
    expect(assertSaveScopeProject(scope, 'p')).toEqual(scope)
    expect(() => assertSaveScopeProject(scope, 'other')).toThrow('当前项目')
  })

  test('tagged tuples have no separator/escaping/case/whitespace collisions', () => {
    const scopes: SaveScope[] = [
      { kind: 'project', projectId: 'p' },
      { kind: 'project', projectId: 'P' },
      { kind: 'project', projectId: ' p ' },
      { kind: 'project', projectId: '["workspace","p","w"]' },
      { kind: 'workspace', projectId: 'p', workspaceId: 'w' },
      { kind: 'workspace', projectId: 'p:', workspaceId: 'w' },
      { kind: 'workspace', projectId: 'p', workspaceId: ':w' },
      { kind: 'workspace', projectId: 'p', workspaceId: 'w2' },
      { kind: 'workspace', projectId: 'p2', workspaceId: 'w' },
      { kind: 'workspace', projectId: '汉字/😀', workspaceId: '"\\\u0000' },
    ]
    const names = scopes.map(saveScopeDatabaseName)
    expect(new Set(names).size).toBe(scopes.length)
    expect(names[0]).toBe('type-pal-saves:["project","p"]')
    expect(names[4]).toBe('type-pal-saves:["workspace","p","w"]')
    expect(names).not.toContain('type-pal-saves')
    expect(scopes.map((scope) => saveScopeDatabaseName({ ...scope }))).toEqual(names)
  })
})
