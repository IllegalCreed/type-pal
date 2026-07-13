import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import type { MigrationSnapshot } from './migration-baseline.js'
import { sha256 } from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'

export const PAL_PROJECT_REL = 'projects/pal'

export interface ProjectMigrationSnapshot extends MigrationSnapshot {
  /** 工程文件原始字节哈希，用于写盘前 TOCTOU 复核。 */
  hashes: Map<string, string>
}

/**
 * 以 base/theirs 为种子，再纳入当前 scene/script index 显式引用的文件。
 * 未被 index 引用的额外 chunk 依然是非托管文件。
 */
export function discoverProjectManagedFiles(repo: string, seed: ReadonlySet<string>): Set<string> {
  const managed = new Set(seed)
  const root = resolve(repo, PAL_PROJECT_REL)
  const readOptional = (path: string): unknown => {
    const full = resolve(root, path)
    if (!existsSync(full)) return undefined
    try {
      return JSON.parse(readFileSync(full, 'utf8'))
    } catch (error) {
      throw new Error(`托管索引 JSON 解析失败 ${path}`, { cause: error })
    }
  }
  const sceneIndex = readOptional('content/scenes/index.json')
  if (Array.isArray(sceneIndex)) {
    for (const id of sceneIndex) {
      if (typeof id !== 'string') throw new Error('content/scenes/index.json: 期望 string[]')
      managed.add(`content/scenes/${id}.json`)
    }
  }
  const scriptIndex = readOptional('content/scripts/index.json') as
    | { chunks?: Record<string, { path?: unknown }> }
    | undefined
  if (scriptIndex?.chunks && typeof scriptIndex.chunks === 'object') {
    for (const meta of Object.values(scriptIndex.chunks)) {
      if (typeof meta?.path !== 'string')
        throw new Error('content/scripts/index.json: chunk path 无效')
      managed.add(`content/scripts/${meta.path}`)
    }
  }
  return managed
}

function safeProjectPath(repo: string, path: string): string {
  if (isAbsolute(path) || path.split('/').some((part) => part === '..'))
    throw new Error(`工程路径必须是安全相对路径: ${path}`)
  const root = resolve(repo, PAL_PROJECT_REL)
  const full = resolve(root, path)
  if (full !== root && !full.startsWith(`${root}${sep}`)) throw new Error(`工程路径越界: ${path}`)
  return full
}

export function loadProjectMigrationSnapshot(
  repo: string,
  managedFiles: ReadonlySet<string>,
): ProjectMigrationSnapshot {
  const files = new Map<string, MigrationJson>()
  const hashes = new Map<string, string>()
  for (const path of [...managedFiles].sort()) {
    const full = safeProjectPath(repo, path)
    if (!existsSync(full)) continue
    const bytes = readFileSync(full)
    hashes.set(path, sha256(bytes))
    try {
      files.set(path, JSON.parse(bytes.toString('utf8')) as MigrationJson)
    } catch (error) {
      throw new Error(`托管 JSON 解析失败 ${path}`, { cause: error })
    }
  }
  return { files, managedFiles: new Set(managedFiles), hashes }
}

export function assertProjectSnapshotCurrent(
  repo: string,
  snapshot: ProjectMigrationSnapshot,
  targetManagedFiles: ReadonlySet<string> = snapshot.managedFiles,
): void {
  const checked = new Set([...snapshot.managedFiles, ...targetManagedFiles])
  for (const path of checked) {
    const full = safeProjectPath(repo, path)
    const expected = snapshot.hashes.get(path)
    const actual = existsSync(full) ? sha256(readFileSync(full)) : undefined
    if (actual !== expected) throw new Error(`迁移计划后工程已变更: ${path}`)
  }
}

function walkFiles(root: string, dir = root, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) walkFiles(root, full, out)
    else if (entry.isFile()) out.push(relative(root, full).split(sep).join('/'))
  }
  return out
}

/** 记录所有非托管工程文件；迁移前后必须完全相等。 */
export function hashUnmanagedProjectFiles(
  repo: string,
  managedFiles: ReadonlySet<string>,
): Map<string, string> {
  const root = resolve(repo, PAL_PROJECT_REL)
  const hashes = new Map<string, string>()
  if (!existsSync(root)) return hashes
  for (const path of walkFiles(root).sort()) {
    if (!managedFiles.has(path)) hashes.set(path, sha256(readFileSync(resolve(root, path))))
  }
  return hashes
}

export function assertHashMapsEqual(
  expected: ReadonlyMap<string, string>,
  actual: ReadonlyMap<string, string>,
  label: string,
): void {
  const paths = new Set([...expected.keys(), ...actual.keys()])
  const changed = [...paths].filter((path) => expected.get(path) !== actual.get(path)).sort()
  if (changed.length) throw new Error(`${label}字节发生变化: ${changed.slice(0, 20).join(', ')}`)
}
