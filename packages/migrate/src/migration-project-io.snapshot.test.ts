/** Observed project bytes, parse errors, snapshot ownership and TOCTOU checks. */

import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import {
  assertProjectSnapshotCurrent,
  loadProjectMigrationSnapshot,
  PAL_PROJECT_REL,
} from './migration-project-io.js'

describe('observed bytes and concurrent changes', () => {
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

  test('只解析托管 JSON，读取保留其它文件的原始字节', () => {
    const repo = tempRepo()
    put(repo, 'content/items.json', '[{"id":"1"}]\n')
    put(repo, 'manifest.json', '{keepFormatting:') // Unmanaged text is not parsed as JSON.
    const managed = new Set(['content/items.json'])
    const before = tree(repo)
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    expect(snapshot.files.get('content/items.json')).toEqual([{ id: '1' }])
    expect(tree(repo)).toEqual(before)
  })

  test('TOCTOU 识别已观察文件的内容修改', () => {
    const repo = tempRepo()
    put(repo, 'content/items.json', '[]\n')
    const managed = new Set(['content/items.json'])
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    put(repo, 'content/items.json', '[{"id":"1"}]\n')
    expect(() => assertProjectSnapshotCurrent(repo, snapshot)).toThrow('items.json')
  })

  test('TOCTOU 识别已登记但原本缺失的文件新增', () => {
    const repo = tempRepo()
    put(repo, 'content/items.json', '[]\n')
    const managed = new Set(['content/items.json', 'content/music.json'])
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    put(repo, 'content/music.json', '[]\n')
    expect(() => assertProjectSnapshotCurrent(repo, snapshot)).toThrow('music.json')
  })

  test('TOCTOU 识别快照外目标在检查前已经出现', () => {
    const repo = tempRepo()
    const managed = new Set<string>()
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    put(repo, 'content/maps/new-target.json', '{}\n')
    expect(() =>
      assertProjectSnapshotCurrent(
        repo,
        snapshot,
        new Set([...managed, 'content/maps/new-target.json']),
      ),
    ).toThrow('new-target.json')
  })
})

describe('absent targets, safe paths and owned sets', () => {
  const roots: string[] = []

  const tempRepo = (): string => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-project-io-'))
    roots.push(root)
    return root
  }

  const writeProject = (repo: string, rel: string, content: string): void => {
    const full = resolve(repo, PAL_PROJECT_REL, rel)
    mkdirSync(resolve(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }

  function fixture() {
    const f = guardFixture()
    roots.push(f.root)
    return f
  }

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('绝对路径被 safeProjectPath 拒绝', () => {
    const repo = tempRepo()
    expect(() => loadProjectMigrationSnapshot(repo, new Set([resolve(repo, 'x.json')]))).toThrow(
      '工程路径必须是安全相对路径',
    )
  })

  test('目标托管集包含快照外文件（缺失视为未变更）时断言通过', () => {
    const repo = tempRepo()
    writeProject(repo, 'content/actors.json', '[]')
    const snapshot = loadProjectMigrationSnapshot(repo, new Set(['content/actors.json']))
    expect(() =>
      assertProjectSnapshotCurrent(
        repo,
        snapshot,
        new Set(['content/actors.json', 'content/new.json']),
      ),
    ).not.toThrow()
  })

  test('snapshot owns its managed set independently of later caller changes', () => {
    const f = fixture()
    put(join(f.repo, 'projects/pal/a.json'), '{"k":1}')
    const managed = new Set(['a.json'])
    const snapshot = loadProjectMigrationSnapshot(f.repo, managed)
    managed.add('late.json')
    expect(snapshot.managedFiles).toEqual(new Set(['a.json']))
    expect(snapshot.files).toEqual(new Map([['a.json', { k: 1 }]]))
  })

  test('snapshot refuses a parent traversal without touching the fixture', () => {
    const f = fixture()
    const before = tree(f.root)
    expect(() => loadProjectMigrationSnapshot(f.repo, new Set(['../escape.json']))).toThrow(
      '工程路径必须是安全相对路径: ../escape.json',
    )
    expect(tree(f.root)).toEqual(before)
  })
})

describe('raw byte identity and parse failures', () => {
  const roots: string[] = []

  function put(repo: string, path: string, content: string): void {
    const full = resolve(repo, PAL_PROJECT_REL, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  test('托管 JSON 精确解析；hashes 记原始字节 sha256 而非再序列化', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-project-snapshot-'))
    roots.push(repo)
    // Valid JSON deliberately differs from canonical formatting, including CRLF.
    const raw = '{ "value": 1 }\r\n'
    put(repo, 'content/items.json', raw)
    const snapshot = loadProjectMigrationSnapshot(repo, new Set(['content/items.json']))
    expect(snapshot.files.get('content/items.json')).toEqual({ value: 1 })
    expect(snapshot.hashes).toEqual(
      new Map([['content/items.json', createHash('sha256').update(raw).digest('hex')]]),
    )
  })

  test('托管正文坏 JSON fail-loud 并携带 cause，不静默降级为非托管', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-project-snapshot-bad-'))
    roots.push(repo)
    put(repo, 'content/items.json', '{value:')
    expect(() => loadProjectMigrationSnapshot(repo, new Set(['content/items.json']))).toThrowError(
      expect.objectContaining({
        message: '托管 JSON 解析失败 content/items.json',
        cause: expect.any(SyntaxError),
      }),
    )
  })

  test('托管但磁盘缺失的路径保留登记且没有正文或hash', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-project-snapshot-missing-'))
    roots.push(repo)
    const snapshot = loadProjectMigrationSnapshot(
      repo,
      new Set(['content/items.json', 'content/absent.json']),
    )
    expect(snapshot.files).toEqual(new Map())
    expect(snapshot.hashes).toEqual(new Map())
    expect(snapshot.managedFiles).toEqual(new Set(['content/items.json', 'content/absent.json']))
  })
})
