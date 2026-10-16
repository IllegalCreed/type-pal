import { createHash } from 'node:crypto'
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  opendirSync,
  openSync,
  readSync,
} from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { decodeTerminalArchive } from './terminal-codec.mjs'
import { terminalFixedBaseline, validateTerminalStructure } from './terminal-contract.mjs'
import {
  discoverTerminalRepository,
  readTerminalGitBlob,
  terminalGitMetadataBytes,
  terminalHead,
  terminalIndexEntries,
  terminalObjectType,
  terminalSnapshotMetadata,
  terminalTreeEntries,
} from './terminal-git.mjs'
import {
  decodeTerminalUtf8,
  parseTerminalJson,
  terminalFailure,
  terminalLimits,
} from './terminal-json.mjs'

export const terminalNamespace = '.governance/docs/terminal'
const canonicalPath = /^\.governance\/docs\/terminal\/([a-f\d]{40})\.json\.gz$/
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex')
const identityKeys = ['dev', 'ino', 'size', 'mode', 'nlink', 'mtimeNs', 'ctimeNs']
const sameIdentity = (a, b) => identityKeys.every((key) => a[key] === b[key])
const stat = (path) => lstatSync(path, { bigint: true })

function parentChain(root, path) {
  const rel = relative(root, dirname(path))
  if (rel.startsWith('..') || rel.startsWith('/'))
    throw terminalFailure('physical', 'path escapes repository')
  const parents = []
  let current = root
  for (const part of rel.split('/').filter(Boolean)) {
    current = resolve(current, part)
    const value = stat(current)
    if (value.isSymbolicLink() || !value.isDirectory())
      throw terminalFailure('physical', 'parent chain must contain actual directories')
    parents.push({ path: current, stat: value })
  }
  return parents
}

function verifyParents(parents) {
  for (const parent of parents)
    if (!sameIdentity(parent.stat, stat(parent.path)))
      throw terminalFailure('physical-race', 'parent identity changed')
}

/** lstat/open-no-follow/fstat, bounded reads, and final path/parent identity. */
export function readTerminalPhysicalFile(root, file) {
  const path = resolve(root, file)
  const parents = parentChain(root, path)
  const before = stat(path)
  if (!before.isFile() || before.isSymbolicLink() || (before.mode & 0o111n) !== 0n)
    throw terminalFailure('physical', 'non-executable regular file required')
  if (before.size > BigInt(terminalLimits.frameBytes))
    throw terminalFailure('frame-budget', 'physical size exceeds pre-read compressed limit')
  if (!Number.isInteger(constants.O_NOFOLLOW))
    throw terminalFailure('physical', 'no-follow descriptor support required')
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const opened = fstatSync(fd, { bigint: true })
    if (!opened.isFile() || !sameIdentity(before, opened))
      throw terminalFailure('physical-race', 'opened descriptor differs from inspected leaf')
    const buffer = Buffer.allocUnsafe(Number(before.size) + 1)
    let bytes = 0
    while (bytes < buffer.length) {
      const count = readSync(fd, buffer, bytes, buffer.length - bytes, null)
      if (!count) break
      bytes += count
    }
    if (bytes !== Number(before.size))
      throw terminalFailure('physical-race', 'short read or additional growth')
    const after = fstatSync(fd, { bigint: true })
    if (!sameIdentity(before, after) || !sameIdentity(before, stat(path)))
      throw terminalFailure('physical-race', 'descriptor or final path changed')
    verifyParents(parents)
    return { buffer: buffer.subarray(0, bytes), identity: before }
  } finally {
    closeSync(fd)
  }
}

function physicalInventory(root) {
  const path = resolve(root, terminalNamespace)
  const parents = []
  let current = root
  for (const part of terminalNamespace.split('/')) {
    current = resolve(current, part)
    let value
    try {
      value = stat(current)
    } catch (error) {
      if (error.code === 'ENOENT')
        return { present: false, entries: [], parents, absentAt: current }
      throw error
    }
    if (!value.isDirectory() || value.isSymbolicLink())
      throw terminalFailure('physical', 'namespace parent must be a real directory')
    parents.push({ path: current, stat: value })
  }
  const pending = [path]
  const entries = []
  let metadataBytes = 0
  while (pending.length) {
    const directory = pending.pop()
    const before = stat(directory)
    if (!before.isDirectory() || before.isSymbolicLink())
      throw terminalFailure('physical', 'directory traversal cannot follow symlinks')
    const handle = opendirSync(directory, { encoding: 'buffer' })
    try {
      for (let entry = handle.readSync(); entry !== null; entry = handle.readSync()) {
        const name = decodeTerminalUtf8(entry.name)
        const full = resolve(directory, name)
        const file = relative(root, full).split(sep).join('/')
        metadataBytes += Buffer.byteLength(file) + 64
        if (metadataBytes > terminalGitMetadataBytes)
          throw terminalFailure('namespace-budget', 'physical metadata inventory exceeds 4MiB')
        const value = stat(full)
        entries.push({
          path: file,
          identity: value,
          regular: value.isFile() && !value.isSymbolicLink(),
        })
        if (value.isDirectory() && !value.isSymbolicLink()) pending.push(full)
      }
    } finally {
      handle.closeSync()
    }
    if (!sameIdentity(before, stat(directory)))
      throw terminalFailure('physical-race', 'directory changed during enumeration')
  }
  verifyParents(parents)
  return { present: true, entries, parents }
}

function verifyInventory(inventory) {
  verifyParents(inventory.parents)
  if (!inventory.absentAt) return
  try {
    stat(inventory.absentAt)
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }
  throw terminalFailure('physical-race', 'previously absent namespace parent appeared')
}

function viewDifferences(head, index, physical) {
  const headByPath = new Map(head.map((entry) => [entry.path, entry]))
  const physicalByPath = new Map(physical.map((entry) => [entry.path, entry]))
  const indexByPath = new Map()
  for (const entry of index) {
    const members = indexByPath.get(entry.path) ?? []
    members.push(entry)
    indexByPath.set(entry.path, members)
  }
  const paths = new Set([...headByPath.keys(), ...indexByPath.keys(), ...physicalByPath.keys()])
  const differences = []
  for (const path of [...paths].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))) {
    const historical = headByPath.get(path)
    const staged = indexByPath.get(path) ?? []
    const current = physicalByPath.get(path)
    const matchesPhysical = (entry) =>
      (!entry && !current) ||
      Boolean(
        entry &&
          current?.gitObject &&
          entry.mode === '100644' &&
          entry.gitObject === current.gitObject,
      )
    const headIndexSame =
      staged.length === (historical ? 1 : 0) &&
      (!historical ||
        (staged[0].stage === 0 &&
          staged[0].mode === historical.mode &&
          staged[0].gitObject === historical.gitObject))
    const indexMatchesWorktree =
      staged.length <= 1 && (!staged.length || staged[0].stage === 0) && matchesPhysical(staged[0])
    const headMatchesWorktree = matchesPhysical(historical)
    if (!headIndexSame || !indexMatchesWorktree || !headMatchesWorktree)
      differences.push({ path, headIndexSame, indexMatchesWorktree, headMatchesWorktree })
  }
  return differences
}

function fixedSourceMetadata(root) {
  const source = readTerminalGitBlob(root, terminalFixedBaseline, 1_048_576)
  if (source.mode !== '100644' || hash(source.buffer) !== terminalFixedBaseline.sha256)
    throw terminalFailure('git-identity', 'fixed33cc original baseline raw identity mismatch')
  const native = parseTerminalJson(source.buffer)
  const keys = [
    'schemaVersion',
    'id',
    'status',
    'denominator',
    'registry',
    'policy',
    'summary',
    'entries',
  ]
  if (
    !native ||
    Array.isArray(native) ||
    Object.keys(native).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(native, key)) ||
    native.denominator !== 1838 ||
    !Array.isArray(native.entries) ||
    native.entries.length !== 1838
  )
    throw terminalFailure('git-identity', 'fixed eight-field/1838 baseline metadata invalid')
  return { revision: source.revision, gitObject: source.gitObject, sha256: hash(source.buffer) }
}

export function inspectTerminalNamespace(cwd) {
  const result = {
    ok: false,
    qualityView: 'worktree',
    status: 'format-rejected',
    approvalChecked: false,
    currentChecked: false,
    completeChecked: false,
    issues: [],
    observations: { head: null, index: [], physical: [], differences: [], archives: [] },
  }
  const add = (file, error) =>
    result.issues.push({ file, code: error.code ?? 'TERMINAL_IO', message: error.message })
  try {
    const repository = discoverTerminalRepository(cwd)
    const physical = physicalInventory(repository.root)
    if (!repository.git) {
      if (physical.present)
        throw terminalFailure('git', 'present namespace requires real Git and D')
      verifyInventory(physical)
      result.ok = true
      result.status = 'namespace-not-applicable'
      result.formatStatus = 'format-partial'
      return result
    }
    const { root } = repository
    const head = terminalHead(root)
    const index = terminalIndexEntries(root, terminalNamespace)
    const historical = head ? terminalTreeEntries(root, head, terminalNamespace) : []
    result.observations.head = { revision: head, entries: historical }
    result.observations.index = index
    const paths = new Set(physical.entries.map((entry) => entry.path))
    for (const entry of index) {
      try {
        if (!canonicalPath.test(entry.path) || entry.mode !== '100644' || entry.stage !== 0)
          throw terminalFailure('namespace-index', 'canonical100644 stage0 leaf required')
        if (terminalObjectType(root, entry.gitObject) !== 'blob')
          throw terminalFailure('namespace-index', 'index object must actually be a blob')
        if (!paths.has(entry.path))
          throw terminalFailure(
            'namespace-missing',
            'tracked current index leaf physically missing',
          )
      } catch (error) {
        add(entry.path, error)
      }
    }
    let baseline
    for (const entry of physical.entries) {
      try {
        const match = canonicalPath.exec(entry.path)
        if (!match || !entry.regular)
          throw terminalFailure(
            'namespace-name',
            'only canonical direct regular leaves permitted; no padding/subdirectories/symlinks',
          )
        const source = readTerminalPhysicalFile(root, entry.path)
        if (!sameIdentity(source.identity, entry.identity))
          throw terminalFailure('physical-race', 'leaf changed after inventory')
        entry.gitObject = createHash('sha1')
          .update(`blob ${source.buffer.length}\0`)
          .update(source.buffer)
          .digest('hex')
        const value = validateTerminalStructure(decodeTerminalArchive(source.buffer))
        if (match[1] !== value.snapshot.commit)
          throw terminalFailure('git-identity', 'filename D and snapshot.commit differ')
        const metadata = terminalSnapshotMetadata(root, value.snapshot)
        if (
          metadata.docsTree !== value.snapshot.docsTree ||
          metadata.inventorySha256 !== value.snapshot.inventorySha256
        )
          throw terminalFailure('git-identity', 'actual D docs tree/rawNUL inventory mismatch')
        baseline ??= fixedSourceMetadata(root)
        result.observations.archives.push({
          path: entry.path,
          sha256: hash(source.buffer),
          snapshot: value.snapshot,
          baseline,
        })
      } catch (error) {
        add(entry.path, error)
      }
    }
    result.observations.physical = physical.entries.map((entry) => ({
      path: entry.path,
      regular: entry.regular,
      gitObject: entry.gitObject ?? null,
    }))
    result.observations.differences = viewDifferences(historical, index, physical.entries)
    for (const entry of physical.entries)
      if (!sameIdentity(entry.identity, stat(resolve(root, entry.path))))
        throw terminalFailure('physical-race', 'physical leaf changed before completion')
    verifyInventory(physical)
    if (
      !isDeepStrictEqual(index, terminalIndexEntries(root, terminalNamespace)) ||
      head !== terminalHead(root)
    )
      throw terminalFailure('git-identity', 'index or HEAD changed during inspection')
    result.ok = result.issues.length === 0
    if (result.ok) result.status = 'format-partial'
  } catch (error) {
    add(terminalNamespace, error)
  }
  return result
}
