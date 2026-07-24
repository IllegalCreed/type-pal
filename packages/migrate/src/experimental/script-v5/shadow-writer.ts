import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, isAbsolute, posix, relative, resolve } from 'node:path'
import { sha256 } from '../../migration-baseline.js'
import { stableJson, stableStringCompare } from './stable-json.js'

export interface ShadowFileWrite {
  path: string
  sha256: string
}

export interface ShadowFilePlan {
  kind: 'script-v5-shadow-file-plan'
  version: 1
  dryOnly: true
  summary: {
    writes: number
    deletes: number
    conflicts: 0
  }
  writes: ShadowFileWrite[]
  deletes: string[]
  conflicts: []
}

interface ShadowTreeInventory {
  files: string[]
  directories: string[]
}

function assertRootDirectory(root: string): void {
  if (!existsSync(root)) return
  const stat = lstatSync(root)
  if (stat.isSymbolicLink() || !stat.isDirectory())
    throw new Error(`P2 shadow root must be a real directory: ${root}`)
}

function walkTree(
  root: string,
  current = root,
  inventory: ShadowTreeInventory = { files: [], directories: [] },
): ShadowTreeInventory {
  if (!existsSync(current)) return inventory
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const full = resolve(current, entry.name)
    const path = relative(root, full).split('\\').join('/')
    const stat = lstatSync(full)
    if (stat.isSymbolicLink()) throw new Error(`P2 shadow tree contains symbolic link: ${path}`)
    if (stat.isDirectory()) {
      inventory.directories.push(path)
      walkTree(root, full, inventory)
      continue
    }
    if (!stat.isFile()) throw new Error(`P2 shadow tree contains non-regular entry: ${path}`)
    inventory.files.push(path)
  }
  return inventory
}

function assertRelativeArtifactPath(root: string, path: string): string {
  const segments = path.split('/')
  if (
    !path ||
    path.includes('\0') ||
    path.includes('\\') ||
    isAbsolute(path) ||
    path !== path.normalize('NFC') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..') ||
    posix.normalize(path) !== path
  )
    throw new Error(`P2 shadow invalid artifact path: ${path}`)
  const full = resolve(root, path)
  const withinRoot = relative(resolve(root), full)
  if (!withinRoot || isAbsolute(withinRoot) || withinRoot === '..' || withinRoot.startsWith('../'))
    throw new Error(`P2 shadow artifact path escapes root: ${path}`)
  return full
}

function targetDirectories(paths: readonly string[]): Set<string> {
  const directories = new Set<string>()
  for (const path of paths) {
    const segments = path.split('/')
    for (let index = 1; index < segments.length; index++)
      directories.add(segments.slice(0, index).join('/'))
  }
  return directories
}

function validateTarget(
  root: string,
  target: ReadonlyMap<string, string>,
): Array<[string, string]> {
  const entries = [...target].sort(([left], [right]) => stableStringCompare(left, right))
  const portablePaths = new Map<string, string>()
  const filePaths = new Set<string>()
  for (const [path, body] of entries) {
    assertRelativeArtifactPath(root, path)
    if (typeof body !== 'string') throw new Error(`P2 shadow artifact is not text: ${path}`)
    const portable = path.normalize('NFC').toLowerCase()
    const collision = portablePaths.get(portable)
    if (collision && collision !== path)
      throw new Error(`P2 shadow portable path collision: ${collision} / ${path}`)
    portablePaths.set(portable, path)
    filePaths.add(path)
  }
  for (const path of filePaths) {
    let parent = posix.dirname(path)
    while (parent !== '.') {
      if (filePaths.has(parent))
        throw new Error(`P2 shadow file/directory path collision: ${parent} / ${path}`)
      parent = posix.dirname(parent)
    }
  }
  return entries
}

export function planShadowFileWrite(
  root: string,
  target: ReadonlyMap<string, string>,
): ShadowFilePlan {
  assertRootDirectory(root)
  const targetEntries = validateTarget(root, target)
  const inventory = walkTree(root)
  const writes: ShadowFileWrite[] = []
  for (const [path, body] of targetEntries) {
    const full = assertRelativeArtifactPath(root, path)
    if (!existsSync(full) || readFileSync(full, 'utf8') !== body)
      writes.push({ path, sha256: sha256(body) })
  }
  const targetPaths = new Set(target.keys())
  const requiredDirectories = targetDirectories([...targetPaths])
  const deletes = [
    ...inventory.files.filter((path) => !targetPaths.has(path)),
    ...inventory.directories
      .filter((path) => !requiredDirectories.has(path))
      .map((path) => `${path}/`),
  ]
    .filter((path) => !targetPaths.has(path))
    .sort(stableStringCompare)
  return {
    kind: 'script-v5-shadow-file-plan',
    version: 1,
    dryOnly: true,
    summary: { writes: writes.length, deletes: deletes.length, conflicts: 0 },
    writes,
    deletes,
    conflicts: [],
  }
}

export function applyShadowFilePlan(
  root: string,
  target: ReadonlyMap<string, string>,
  plan: ShadowFilePlan,
): void {
  const absoluteRoot = resolve(root)
  const parent = dirname(absoluteRoot)
  mkdirSync(parent, { recursive: true })
  const lockPath = resolve(parent, `.${basename(absoluteRoot)}.lock`)
  let lock: number | undefined
  try {
    lock = openSync(lockPath, 'wx')
  } catch (error) {
    throw new Error(`P2 shadow writer is already active for ${absoluteRoot}`, { cause: error })
  }
  let staging: string | undefined
  let backup: string | undefined
  let oldRootMoved = false
  try {
    const expected = planShadowFileWrite(absoluteRoot, target)
    if (stableJson(plan) !== stableJson(expected))
      throw new Error('P2 shadow file plan changed or was forged')
    if (expected.summary.conflicts !== 0) throw new Error('P2 shadow file plan has conflicts')
    if (expected.summary.writes === 0 && expected.summary.deletes === 0) return

    const entries = validateTarget(absoluteRoot, target)
    staging = mkdtempSync(resolve(parent, `.${basename(absoluteRoot)}.stage-`))
    const ordered = [
      ...entries.filter(([path]) => path !== 'shadow.json'),
      ...entries.filter(([path]) => path === 'shadow.json'),
    ]
    for (const [path, body] of ordered) {
      const full = assertRelativeArtifactPath(staging, path)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, body)
      if (sha256(readFileSync(full)) !== sha256(body))
        throw new Error(`P2 shadow staged artifact hash mismatch: ${path}`)
    }
    const stagedPlan = planShadowFileWrite(staging, target)
    if (stagedPlan.summary.writes !== 0 || stagedPlan.summary.deletes !== 0)
      throw new Error(`P2 shadow staged tree mismatch: ${stableJson(stagedPlan.summary)}`)

    backup = resolve(
      parent,
      `.${basename(absoluteRoot)}.backup-${process.pid}-${Date.now().toString(36)}`,
    )
    if (existsSync(absoluteRoot)) {
      renameSync(absoluteRoot, backup)
      oldRootMoved = true
    }
    renameSync(staging, absoluteRoot)
    staging = undefined
    if (oldRootMoved) {
      rmSync(backup, { recursive: true, force: true })
      backup = undefined
      oldRootMoved = false
    }
  } catch (error) {
    if (oldRootMoved && backup && existsSync(backup)) {
      try {
        if (existsSync(absoluteRoot)) rmSync(absoluteRoot, { recursive: true, force: true })
        renameSync(backup, absoluteRoot)
        backup = undefined
        oldRootMoved = false
      } catch (restoreError) {
        const preservedBackup = backup
        backup = undefined
        throw new AggregateError(
          [error, restoreError],
          `P2 shadow directory replacement failed; old tree preserved at ${preservedBackup}`,
        )
      }
    }
    throw error
  } finally {
    if (staging) rmSync(staging, { recursive: true, force: true })
    if (backup) rmSync(backup, { recursive: true, force: true })
    if (lock !== undefined) closeSync(lock)
    if (existsSync(lockPath)) unlinkSync(lockPath)
  }
}
