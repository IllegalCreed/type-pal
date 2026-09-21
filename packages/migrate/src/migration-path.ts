import { lstatSync, realpathSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

/** A best-effort local write guard, not an OS-level sandbox or a cross-process lock. */
export function assertMigrationFilePath(repo: string, path: string, label: string): string {
  const parts = path.split('/')
  if (
    isAbsolute(path) ||
    path.includes('\\') ||
    parts.some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(`${label} 必须是规范仓库相对路径: ${path}`)
  let current = realpathSync(repo)
  for (let index = 0; index < parts.length; index++) {
    current = resolve(current, parts[index]!)
    // lstat sees dangling links. existsSync deliberately must not precede it.
    const stat = lstatSync(current, { throwIfNoEntry: false })
    if (!stat) continue
    if (stat.isSymbolicLink()) throw new Error(`${label} 不得经过符号链接: ${path}`)
    if (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())
      throw new Error(`${label} 路径类型无效: ${path}`)
  }
  return current
}
