import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstatSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { decodeTerminalUtf8, terminalFailure, terminalLimits } from './terminal-json.mjs'

// Metadata has its own limit; this is neither the decoded budget nor a heap cap.
export const terminalGitMetadataBytes = 4_194_304
const lower40 = /^[a-f\d]{40}$/
const environment = () => {
  const env = { ...process.env, LC_ALL: 'C', GIT_OPTIONAL_LOCKS: '0', GIT_LITERAL_PATHSPECS: '1' }
  for (const key of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_COMMON_DIR',
    'GIT_NAMESPACE',
  ])
    delete env[key]
  return env
}

function run(root, args, maxBytes = terminalGitMetadataBytes) {
  const result = spawnSync('git', ['-C', root, ...args], {
    env: environment(),
    encoding: null,
    maxBuffer: maxBytes,
    timeout: 30_000,
  })
  if (
    result.error ||
    result.signal ||
    result.stdout.length > maxBytes ||
    result.stderr.length > maxBytes
  )
    throw terminalFailure(
      'git-budget',
      `bounded Git failed: ${result.error?.code ?? result.signal ?? 'overflow'}`,
    )
  return result
}

export function terminalGitBytes(root, args, maxBytes = terminalGitMetadataBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > terminalLimits.decodedBytes + 1)
    throw terminalFailure('git-budget', 'invalid explicit output budget')
  const result = run(root, args, maxBytes)
  if (result.status !== 0)
    throw terminalFailure(
      'git',
      `exit ${result.status}: ${decodeTerminalUtf8(result.stderr).slice(0, 1000)}`,
    )
  return result.stdout
}

const text = (root, args, limit = 4096) => {
  const value = decodeTerminalUtf8(terminalGitBytes(root, args, limit))
  if (!value.endsWith('\n')) throw terminalFailure('git', 'unterminated metadata response')
  return value.slice(0, -1)
}

export function discoverTerminalRepository(cwd) {
  // A caller may use a directory alias; namespace parents and leaves retain their own no-follow checks.
  const directory = realpathSync(resolve(cwd))
  const stat = lstatSync(directory)
  if (!stat.isDirectory()) throw terminalFailure('git', 'caller directory required')
  const result = run(directory, ['rev-parse', '--show-toplevel'], 16_384)
  if (result.status === 0) {
    const raw = decodeTerminalUtf8(result.stdout)
    if (!raw.endsWith('\n') || raw.slice(0, -1).includes('\n') || !isAbsolute(raw.slice(0, -1)))
      throw terminalFailure('git', 'invalid repository root metadata')
    const root = raw.slice(0, -1)
    if (text(root, ['rev-parse', '--is-inside-work-tree']) !== 'true')
      throw terminalFailure('git', 'working repository required')
    return { git: true, root }
  }
  if (
    result.status !== 128 ||
    !decodeTerminalUtf8(result.stderr).startsWith('fatal: not a git repository')
  )
    throw terminalFailure('git', 'repository discovery failed')
  // A broken or inaccessible .git is never the explicit non-Git exception.
  for (let path = directory; ; path = dirname(path)) {
    try {
      lstatSync(resolve(path, '.git'))
      throw terminalFailure('git', 'existing .git failed discovery')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (dirname(path) === path) break
  }
  return { git: false, root: directory }
}

export function assertTerminalCommit(root, revision) {
  if (typeof revision !== 'string' || !lower40.test(revision))
    throw terminalFailure('git-identity', 'full lowercase40 commit required')
  if (text(root, ['cat-file', '-t', revision]) !== 'commit')
    throw terminalFailure('git-identity', 'object must be an actual commit, without tag peeling')
}

export function terminalHead(root) {
  const response = run(root, ['rev-parse', '--verify', '--quiet', 'HEAD'], 4096)
  if (response.status === 0) {
    const revision = decodeTerminalUtf8(response.stdout).trimEnd()
    assertTerminalCommit(root, revision)
    return revision
  }
  const branch = text(root, ['symbolic-ref', '-q', 'HEAD'])
  const absent = run(root, ['show-ref', '--verify', '--quiet', branch], 4096)
  if (
    response.status === 1 &&
    absent.status === 1 &&
    !absent.stdout.length &&
    !absent.stderr.length
  )
    return null // A genuinely unborn repository has no historical HEAD payload.
  throw terminalFailure('git', 'HEAD identity unavailable')
}

function records(buffer, parse) {
  if (buffer.length && buffer.at(-1) !== 0)
    throw terminalFailure('git', 'truncated rawNUL metadata')
  const result = []
  let offset = 0
  while (offset < buffer.length) {
    const end = buffer.indexOf(0, offset)
    result.push(parse(buffer.subarray(offset, end)))
    offset = end + 1
  }
  return result
}

export function terminalIndexEntries(root, namespace) {
  const raw = terminalGitBytes(root, ['ls-files', '--stage', '-z', '--', namespace])
  return records(raw, (record) => {
    const tab = record.indexOf(9)
    if (tab < 0) throw terminalFailure('git', 'index field separator missing')
    const match = /^(\d{6}) ([a-f\d]{40}) ([0-3])$/.exec(record.subarray(0, tab).toString('ascii'))
    if (!match) throw terminalFailure('git', 'invalid index metadata')
    return {
      mode: match[1],
      gitObject: match[2],
      stage: Number(match[3]),
      path: decodeTerminalUtf8(record.subarray(tab + 1)),
    }
  })
}

export function terminalTreeEntries(root, revision, path) {
  assertTerminalCommit(root, revision)
  const raw = terminalGitBytes(root, ['ls-tree', '-r', '-z', revision, '--', path])
  return records(raw, (record) => {
    const tab = record.indexOf(9)
    if (tab < 0) throw terminalFailure('git', 'tree field separator missing')
    const match = /^(\d{6}) (blob|tree|commit) ([a-f\d]{40})$/.exec(
      record.subarray(0, tab).toString('ascii'),
    )
    if (!match) throw terminalFailure('git', 'invalid tree metadata')
    return {
      mode: match[1],
      type: match[2],
      gitObject: match[3],
      path: decodeTerminalUtf8(record.subarray(tab + 1)),
    }
  })
}

export function terminalObjectType(root, object) {
  if (typeof object !== 'string' || !lower40.test(object))
    throw terminalFailure('git-identity', 'lowercase40 object required')
  return text(root, ['cat-file', '-t', object])
}

export function terminalRepoPath(path) {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    !/^\//.test(path) &&
    !/[:\0\r\n\\]/.test(path) &&
    !path.split('/').some((part) => ['', '.', '..'].includes(part)) &&
    Buffer.from(path).toString('utf8') === path
  )
}

/** Explicit snapshot reader: no worktree fallback and no execution of snapshot code. */
export function readTerminalGitBlob(root, pin, maxBytes = terminalLimits.frameBytes) {
  assertTerminalCommit(root, pin.revision)
  if (!terminalRepoPath(pin.path))
    throw terminalFailure('git-identity', 'valid repository path required')
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > terminalLimits.decodedBytes)
    throw terminalFailure('git-budget', 'explicit blob budget out of range')
  const raw = terminalGitBytes(root, ['ls-tree', '-z', pin.revision, '--', pin.path])
  const matches = records(raw, (record) => {
    const tab = record.indexOf(9)
    const meta = /^(\d{6}) (\w+) ([a-f\d]{40})$/.exec(record.subarray(0, tab).toString('ascii'))
    return { meta, path: decodeTerminalUtf8(record.subarray(tab + 1)) }
  })
  if (matches.length !== 1 || matches[0].path !== pin.path || !matches[0].meta)
    throw terminalFailure('git-identity', 'exact snapshot path unavailable')
  const [, mode, type, object] = matches[0].meta
  if (!['100644', '100755'].includes(mode) || type !== 'blob')
    throw terminalFailure('git-identity', 'regular snapshot blob required')
  if (pin.gitObject !== undefined && object !== pin.gitObject)
    throw terminalFailure('git-identity', 'snapshot blob mismatch')
  if (terminalObjectType(root, object) !== 'blob')
    throw terminalFailure('git-identity', 'actual blob type required')
  const sizeText = text(root, ['cat-file', '-s', object])
  if (!/^(?:0|[1-9]\d*)$/.test(sizeText)) throw terminalFailure('git', 'invalid blob size')
  const size = Number(sizeText)
  if (!Number.isSafeInteger(size) || size > maxBytes)
    throw terminalFailure('git-budget', 'blob exceeds pre-read budget')
  const buffer = terminalGitBytes(root, ['cat-file', 'blob', object], maxBytes + 1)
  if (buffer.length !== size) throw terminalFailure('git', 'blob length changed or truncated')
  return { revision: pin.revision, path: pin.path, mode, gitObject: object, buffer }
}

export function terminalSnapshotMetadata(root, snapshot) {
  assertTerminalCommit(root, snapshot.commit)
  const docs = text(root, ['rev-parse', `${snapshot.commit}:docs`])
  if (!lower40.test(docs) || terminalObjectType(root, docs) !== 'tree')
    throw terminalFailure('git-identity', 'actual D:docs tree required')
  const inventory = terminalGitBytes(root, ['ls-tree', '-r', '-z', snapshot.commit, '--', 'docs'])
  records(inventory, (record) => {
    const tab = record.indexOf(9)
    if (
      tab < 0 ||
      !/^(\d{6}) (blob|tree|commit) ([a-f\d]{40})$/.test(record.subarray(0, tab).toString('ascii'))
    )
      throw terminalFailure('git', 'invalid inventory metadata')
    const path = decodeTerminalUtf8(record.subarray(tab + 1))
    if (!terminalRepoPath(path)) throw terminalFailure('git-identity', 'invalid inventory pathname')
    return path
  })
  return {
    docsTree: docs,
    inventorySha256: createHash('sha256').update(inventory).digest('hex'),
    inventoryBytes: inventory.length,
  }
}
