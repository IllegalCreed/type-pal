/** Managed-file discovery from current indexes and explicit ownership boundaries. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
  PAL_PROJECT_REL,
} from './migration-project-io.js'

describe('current index references and seed ownership', () => {
  const roots: string[] = []

  const tempRepo = (): string => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-project-io-'))
    roots.push(root)
    return root
  }

  const put = (repo: string, path: string, text: string): void => {
    const full = resolve(repo, 'projects/pal', path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, text)
  }

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('只发现当前 index 明示引用的额外场景', () => {
    const repo = tempRepo()
    put(
      repo,
      'content/scenes/index.json',
      '{"version":1,"scenes":[{"id":"s000","name":"起点","path":"content/scenes/s000.json"},{"id":"manual","name":"手工","path":"content/authored/manual.json"}]}\n',
    )
    const managed = discoverProjectManagedFiles(repo, new Set(['content/scenes/index.json']))
    expect(managed).toEqual(
      new Set([
        'content/scenes/index.json',
        'content/scenes/s000.json',
        'content/authored/manual.json',
      ]),
    )
  })

  test('退役脚本索引与引用不参与托管快照，读取保留字节', () => {
    const repo = tempRepo()
    const oldIndex = 'content/scripts/index.json'
    const oldChunk = 'content/scripts/chunks/manual.json'
    put(repo, oldIndex, '{"chunks":{"manual":{"path":"chunks/manual.json"}}}\n')
    put(repo, oldChunk, '{"keepFormatting": true}\n')
    const before = tree(repo)
    const managed = discoverProjectManagedFiles(repo, new Set(['content/items.json']))
    expect(managed).toEqual(new Set(['content/items.json']))
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    expect(snapshot.files).toEqual(new Map())
    expect(snapshot.hashes).toEqual(new Map())
    expect(tree(repo)).toEqual(before)
    put(repo, oldIndex, '{old-invalid:')
    const invalidBefore = tree(repo)
    expect(discoverProjectManagedFiles(repo, new Set())).toEqual(new Set())
    expect(tree(repo)).toEqual(invalidBefore)
  })

  test('工作区 identity 旁车不进入托管快照，读取保留字节', () => {
    const repo = tempRepo()
    put(
      repo,
      '.type-pal/workspace.json',
      '{"kind":"type-pal-editor-workspace","version":1,"mode":"sandbox"}\n',
    )
    const before = tree(repo)
    const managed = discoverProjectManagedFiles(repo, new Set())
    expect(managed).toEqual(new Set())
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    expect(snapshot.files).toEqual(new Map())
    expect(snapshot.hashes).toEqual(new Map())
    expect(tree(repo)).toEqual(before)
  })

  test('maps index map path 非字符串 fail-loud', () => {
    const repo = tempRepo()
    put(
      repo,
      'content/maps/index.json',
      JSON.stringify({ version: 1, maps: [{ id: 'map-001', name: 'm', path: 7 }] }),
    )
    expect(() => discoverProjectManagedFiles(repo, new Set())).toThrow(
      'content/maps/index.json: map path 无效',
    )
  })

  test('合法 maps index 精确扩展种子托管集', () => {
    const repo = tempRepo()
    put(
      repo,
      'content/maps/index.json',
      JSON.stringify({
        version: 1,
        maps: [{ id: 'map-001', name: 'm', path: 'content/maps/map-001.json' }],
      }),
    )
    const seed = new Set(['seed.json'])
    expect(discoverProjectManagedFiles(repo, seed)).toEqual(
      new Set(['seed.json', 'content/maps/map-001.json']),
    )
    expect(seed).toEqual(new Set(['seed.json']))
  })

  test('无任何索引时空工程仅返回种子托管集', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, PAL_PROJECT_REL), { recursive: true })
    expect(discoverProjectManagedFiles(repo, new Set(['seed.json']))).toEqual(
      new Set(['seed.json']),
    )
  })
})

describe('index parsing and stable identity errors', () => {
  const roots: string[] = []

  function fixture() {
    const f = guardFixture()
    roots.push(f.root)
    return f
  }

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('malformed index JSON retains the index path and parsing cause', () => {
    const f = fixture()
    put(join(f.repo, 'projects/pal/content/scenes/index.json'), '{bad')
    const before = tree(f.root)
    expect(() => discoverProjectManagedFiles(f.repo, new Set())).toThrowError(
      expect.objectContaining({
        message: '托管索引 JSON 解析失败 content/scenes/index.json',
        cause: expect.any(SyntaxError),
      }),
    )
    expect(tree(f.root)).toEqual(before)
  })

  test.each([
    {
      name: 'invalid scene identity',
      path: 'content/scenes/index.json',
      text: '{"version":1,"scenes":[{"id":"","name":"n","path":"content/scenes/x.json"}]}',
      error: 'sceneIndex.scenes[0].id: 非法稳定 id ""',
    },
    {
      name: 'non-array maps',
      path: 'content/maps/index.json',
      text: '{"version":1,"maps":"nope"}',
      error: 'content/maps/index.json: maps 期望数组',
    },
  ])('$name is rejected without writes', ({ path, text, error }) => {
    const f = fixture()
    put(join(f.repo, 'projects/pal', path), text)
    const before = tree(f.root)
    expect(() => discoverProjectManagedFiles(f.repo, new Set())).toThrow(error)
    expect(tree(f.root)).toEqual(before)
  })
})
