/** TEST-GLM-NEW-J-1 J04：migration-project-io 托管快照的坏 JSON 臂与字节 hash 锚。
 * 旧证：migration-project-io(.boundaries).test.ts 盖 discover/load 正控、TOCTOU、
 * 越界路径、hashUnmanaged/assertHashMapsEqual；
 * `loadProjectMigrationSnapshot` 对托管正文坏 JSON 的 fail-loud（含 cause）与
 * 原始字节 hash 锚、`PAL_PROJECT_REL` 常量在旧测试零直接断言。IO 限自有 mkdtemp。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import { loadProjectMigrationSnapshot, PAL_PROJECT_REL } from './migration-project-io.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function put(repo: string, path: string, content: string): void {
  const full = resolve(repo, PAL_PROJECT_REL, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

describe('loadProjectMigrationSnapshot', () => {
  test('托管 JSON 精确解析；hashes 记原始字节 sha256 而非再序列化', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-j-project-io-'))
    roots.push(repo)
    const raw = '{\n  "value": 1\n}\n'
    put(repo, 'content/items.json', raw)
    const snapshot = loadProjectMigrationSnapshot(repo, new Set(['content/items.json']))
    expect(snapshot.files.get('content/items.json')).toEqual({ value: 1 })
    expect(snapshot.hashes.get('content/items.json')).toBe(
      sha256(readFileSync(resolve(repo, PAL_PROJECT_REL, 'content/items.json'))),
    )
    expect(snapshot.hashes.get('content/items.json')).toBe(sha256(raw))
  })

  test('托管正文坏 JSON fail-loud 并携带 cause，不静默降级为非托管', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-j-project-io-bad-'))
    roots.push(repo)
    put(repo, 'content/items.json', '{value:')
    try {
      loadProjectMigrationSnapshot(repo, new Set(['content/items.json']))
      expect.unreachable('托管正文坏 JSON 必须失败')
    } catch (error) {
      expect((error as Error).message).toBe('托管 JSON 解析失败 content/items.json')
      expect((error as { cause?: unknown }).cause).toBeInstanceOf(Error)
    }
  })

  test('托管但磁盘缺失的路径被跳过；PAL_PROJECT_REL 常量冻结', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-glm-j-project-io-missing-'))
    roots.push(repo)
    const snapshot = loadProjectMigrationSnapshot(
      repo,
      new Set(['content/items.json', 'content/absent.json']),
    )
    expect(snapshot.files.has('content/items.json')).toBe(false)
    expect(snapshot.hashes.has('content/absent.json')).toBe(false)
    expect(snapshot.managedFiles).toEqual(new Set(['content/items.json', 'content/absent.json']))
    expect(PAL_PROJECT_REL).toBe('projects/pal')
  })
})
