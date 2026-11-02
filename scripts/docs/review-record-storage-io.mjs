// Filesystem boundaries shared by initial and current-generation review transactions.
// Callers own the lock and exact expected inventory; these functions grant no write authority.
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { reviewDirRelative } from './review-record-storage.mjs'

const demand = (condition, message) => {
  if (!condition) throw new Error(`review-record-storage-io: ${message}`)
}
export function directoryIdentity(stat) {
  demand(stat.isDirectory() && !stat.isSymbolicLink(), 'target parent not an ordinary directory')
  return { dev: stat.dev, ino: stat.ino, mode: stat.mode }
}
export function checkOrdinaryPath(
  root,
  relative,
  kind,
  parents = new Map(),
  prefix = reviewDirRelative,
) {
  demand(
    relative.startsWith(prefix) &&
      !relative.includes('\\') &&
      !relative.split('/').some((part) => !part || part === '.' || part === '..'),
    `unsafe target path: ${relative}`,
  )
  const parts = relative.split('/')
  for (let i = 0; i <= parts.length; i++) {
    const path = join(root, ...parts.slice(0, i))
    let stat
    try {
      stat = lstatSync(path)
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
    if (i < parts.length || kind === 'directory') {
      const state = directoryIdentity(stat)
      if (parents.has(path))
        demand(isDeepStrictEqual(parents.get(path), state), `target parent changed: ${path}`)
      else parents.set(path, state)
    } else demand(stat.isFile(), `target not an ordinary file: ${relative}`)
    if (i === parts.length) return stat
  }
}
export function fileState(root, path, parents, prefix = reviewDirRelative) {
  const stat = checkOrdinaryPath(root, path, 'file', parents, prefix)
  if (!stat) return { identity: null, buffer: null }
  const buffer = readFileSync(join(root, path)),
    after = lstatSync(join(root, path))
  const identity = (s) => ({
    dev: s.dev,
    ino: s.ino,
    mode: s.mode,
    size: s.size,
    mtime: s.mtimeMs,
    ctime: s.ctimeMs,
  })
  demand(
    after.isFile() && isDeepStrictEqual(identity(stat), identity(after)),
    `target changed while read: ${path}`,
  )
  return { identity: identity(after), buffer }
}
export function inspectShardInventory(root, expected) {
  const shards = [...expected.values()].filter((output) => output.kind === 'shard')
  const rootPath = `${reviewDirRelative}/shards`
  if (!checkOrdinaryPath(root, rootPath, 'directory')) return
  for (const stem of readdirSync(join(root, rootPath))) {
    const stemPath = `${rootPath}/${stem}`,
      owned = shards.filter((output) => output.path.startsWith(`${stemPath}/`))
    demand(owned.length, `unknown shard stem: ${stem}`)
    checkOrdinaryPath(root, stemPath, 'directory')
    for (const generation of readdirSync(join(root, stemPath))) {
      const generationPath = `${stemPath}/${generation}`,
        files = owned.filter((output) => output.path.startsWith(`${generationPath}/`))
      demand(files.length, `unknown sibling generation: ${generationPath}`)
      checkOrdinaryPath(root, generationPath, 'directory')
      const names = readdirSync(join(root, generationPath)).sort()
      demand(
        isDeepStrictEqual(names, files.map((o) => o.path.split('/').pop()).sort()),
        `immutable generation file set differs: ${generationPath}`,
      )
      for (const name of names) {
        const path = `${generationPath}/${name}`,
          output = expected.get(path)
        demand(output?.kind === 'shard', `orphan shard: ${path}`)
        demand(
          fileState(root, path).buffer.equals(output.bytes),
          `immutable generation foreign bytes: ${path}`,
        )
      }
    }
  }
}
