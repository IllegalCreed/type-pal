import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  assertHashMapsEqual,
  assertProjectSnapshotCurrent,
  discoverProjectManagedFiles,
  hashUnmanagedProjectFiles,
  loadProjectMigrationSnapshot,
} from './migration-project-io.js'

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

describe('PAL 迁移工程快照', () => {
  test('只解析托管 JSON，非托管文件只记字节哈希', () => {
    const repo = tempRepo()
    put(repo, 'content/items.json', '[{"id":"1"}]\n')
    put(repo, 'manifest.json', '{"keepFormatting": true}\n')
    const managed = new Set(['content/items.json'])
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    expect(snapshot.files.get('content/items.json')).toEqual([{ id: '1' }])
    expect(hashUnmanagedProjectFiles(repo, managed).has('manifest.json')).toBe(true)
  })

  test('TOCTOU 能识别内容修改和原本缺失的托管文件新增', () => {
    const repo = tempRepo()
    put(repo, 'content/items.json', '[]\n')
    const managed = new Set(['content/items.json', 'content/music.json'])
    const snapshot = loadProjectMigrationSnapshot(repo, managed)
    put(repo, 'content/items.json', '[{"id":"1"}]\n')
    expect(() => assertProjectSnapshotCurrent(repo, snapshot)).toThrow('items.json')

    put(repo, 'content/items.json', '[]\n')
    put(repo, 'content/music.json', '[]\n')
    expect(() => assertProjectSnapshotCurrent(repo, snapshot)).toThrow('music.json')

    rmSync(resolve(repo, 'projects/pal/content/music.json'))
    put(repo, 'content/scripts/chunks/new-target.json', '{}\n')
    expect(() =>
      assertProjectSnapshotCurrent(
        repo,
        snapshot,
        new Set([...managed, 'content/scripts/chunks/new-target.json']),
      ),
    ).toThrow('new-target.json')
  })

  test('非托管哈希集合会报告新增、删除或改动', () => {
    const repo = tempRepo()
    put(repo, 'manifest.json', '{}\n')
    const before = hashUnmanagedProjectFiles(repo, new Set())
    put(repo, 'manifest.json', '{ }\n')
    const after = hashUnmanagedProjectFiles(repo, new Set())
    expect(() => assertHashMapsEqual(before, after, '非托管文件')).toThrow('manifest.json')
    expect(readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')).toBe('{ }\n')
  })

  test('显式排除迁移器负责的 manifest 与二进制路径', () => {
    const repo = tempRepo()
    put(repo, 'manifest.json', '{}\n')
    put(repo, 'assets/migrated/sounds/001.wav', 'wave')
    put(repo, 'notes.txt', 'keep')
    const hashes = hashUnmanagedProjectFiles(
      repo,
      new Set(),
      new Set(['manifest.json', 'assets/migrated/sounds/001.wav']),
    )
    expect([...hashes.keys()]).toEqual(['notes.txt'])
  })

  test('只发现 index 明示引用的额外场景和 chunk', () => {
    const repo = tempRepo()
    put(repo, 'content/scenes/index.json', '["s000","manual"]\n')
    put(repo, 'content/scripts/index.json', '{"chunks":{"manual":{"path":"chunks/manual.json"}}}\n')
    put(repo, 'content/scripts/chunks/unreferenced.json', '{}\n')
    const managed = discoverProjectManagedFiles(
      repo,
      new Set(['content/scenes/index.json', 'content/scripts/index.json']),
    )
    expect(managed).toContain('content/scenes/manual.json')
    expect(managed).toContain('content/scripts/chunks/manual.json')
    expect(managed).not.toContain('content/scripts/chunks/unreferenced.json')
  })

  test('工作区 identity 旁车不进入 managed census，并作为非托管字节受保护', () => {
    const repo = tempRepo()
    put(
      repo,
      '.type-pal/workspace.json',
      '{"kind":"type-pal-editor-workspace","version":1,"mode":"sandbox"}\n',
    )
    const managed = discoverProjectManagedFiles(repo, new Set())
    expect(managed.has('.type-pal/workspace.json')).toBe(false)
    expect(hashUnmanagedProjectFiles(repo, managed).has('.type-pal/workspace.json')).toBe(true)
  })
})
