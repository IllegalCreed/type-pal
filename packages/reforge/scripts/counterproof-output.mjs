import { createHash, randomUUID } from 'node:crypto'
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const identityFormat = 'tsv: file<TAB>fullName<TAB>status per row, sorted by (file, fullName)'
// Current full-suite identities are below 2 MiB. These limits bound both disk reads
// and expansion without changing the producers' execution or identity predicates.
const identityMaxBytes = 64 * 1024 * 1024
const storedIdentityMaxBytes = identityMaxBytes + 64 * 1024
const sameFile = (a, b) => a.dev === b.dev && a.ino === b.ino

/** Porcelain v1 -z emits rename/copy destination first, then its source as a second record. */
export function counterproofDirtyPaths(status, excludedPaths) {
  if (status === '') return []
  const records = status.split('\0')
  if (records.pop() !== '') throw new Error('incomplete counterproof git status record')
  const dirty = new Set()
  const inspect = (file) => {
    if (!excludedPaths.some((own) => file === own || file.startsWith(`${own}/`))) dirty.add(file)
  }
  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    if (!/^[ MADRCUT?!]{2} /u.test(record) || record.length <= 3)
      throw new Error('invalid counterproof git status record')
    inspect(record.slice(3))
    if (/[RC]/u.test(record.slice(0, 2))) {
      const source = records[++index]
      if (!source) throw new Error('missing counterproof git rename/copy source')
      inspect(source)
    }
  }
  return [...dirty]
}

function directoryChain(directory) {
  const root = path.parse(directory).root
  let current = root
  for (const part of directory.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part)
    const stat = lstatSync(current)
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error(`counterproof output requires real directories: ${current}`)
  }
  return lstatSync(directory)
}

function outputPath(defaultDir, argv) {
  const explicit = argv.length !== 0
  if (explicit && (argv.length !== 2 || argv[0] !== '--output-dir'))
    throw new Error('usage: --output-dir PATH (a new or empty directory)')
  const input = explicit ? argv[1] : defaultDir
  if (
    typeof input !== 'string' ||
    input.trim().length === 0 ||
    input.includes('\\') ||
    [...input].some((character) => character.codePointAt(0) < 32) ||
    input.split('/').some((part) => part === '.' || part === '..')
  )
    throw new Error('counterproof output path must not contain traversal or control characters')
  return { directory: path.resolve(input), explicit }
}

/** A run owns one fresh output directory. Content reuse never represents execution reuse. */
export function prepareCounterproofOutput({ defaultDir, argv = process.argv.slice(2) }) {
  const { directory, explicit } = outputPath(defaultDir, argv)
  directoryChain(path.dirname(directory))
  let existing
  try {
    existing = lstatSync(directory)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (existing) {
    if (!explicit)
      throw new Error('historical counterproof output already exists; use --output-dir PATH')
    directoryChain(directory)
    if (readdirSync(directory).length !== 0)
      throw new Error(`counterproof output must be empty: ${directory}`)
  } else {
    // Parents must already exist; never create a tree through unchecked path components.
    mkdirSync(directory)
  }
  const owner = directoryChain(directory)
  const rawDir = path.join(directory, 'counterproof-raw')
  // Exclusive mkdir is also the admission lock when two runs select the same empty directory.
  mkdirSync(rawDir)
  const rawOwner = directoryChain(rawDir)
  const admittedEntries = readdirSync(directory)
  if (admittedEntries.length !== 1 || admittedEntries[0] !== 'counterproof-raw')
    throw new Error('counterproof output was populated during admission')

  function assertDirectories() {
    if (!sameFile(directoryChain(directory), owner) || !sameFile(directoryChain(rawDir), rawOwner))
      throw new Error('counterproof output directory was replaced')
  }

  function readOrdinary(relative, maximumBytes, extentError) {
    assertDirectories()
    const target = path.join(directory, relative)
    const pathnameState = lstatSync(target)
    if (!pathnameState.isFile() || pathnameState.nlink !== 1)
      throw new Error(`counterproof artifact must be an ordinary unshared file: ${relative}`)
    const fd = openSync(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    try {
      const before = fstatSync(fd)
      if (!before.isFile() || before.nlink !== 1 || !sameFile(before, pathnameState))
        throw new Error(`counterproof artifact must be an ordinary unshared file: ${relative}`)
      if (before.size > maximumBytes) throw new Error(`${extentError}: ${relative}`)
      // Read at most the observed extent plus one byte, even if another process
      // grows the file after fstat. A changed extent cannot allocate unbounded RAM.
      const buffer = Buffer.alloc(before.size + 1)
      let length = 0
      while (length < buffer.length) {
        const count = readSync(fd, buffer, length, buffer.length - length, length)
        if (count === 0) break
        length += count
      }
      if (length !== before.size) throw new Error(`${extentError}: ${relative}`)
      const bytes = buffer.subarray(0, length)
      const after = fstatSync(fd)
      const current = lstatSync(target)
      assertDirectories()
      if (
        !sameFile(before, current) ||
        current.isSymbolicLink() ||
        before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs
      )
        throw new Error(`counterproof artifact changed while reading: ${relative}`)
      return bytes
    } finally {
      closeSync(fd)
    }
  }

  function publish(relative, input, reuse = false) {
    const bytes = Buffer.from(input)
    assertDirectories()
    const verifiedDescriptor = () => {
      const actual = readOrdinary(relative, bytes.length, 'counterproof artifact content collision')
      if (!actual.equals(bytes) || digest(actual) !== digest(bytes))
        throw new Error(`counterproof artifact content collision: ${relative}`)
      return { path: relative, bytes: actual.length, sha256: digest(actual) }
    }
    let existing
    try {
      existing = lstatSync(path.join(directory, relative))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (existing) {
      if (!reuse) throw new Error(`EEXIST: counterproof output already exists: ${relative}`)
      // Re-read real bytes on every reuse; no cached hash can stand in for disk contents.
      return verifiedDescriptor()
    }
    const temporary = path.join(rawDir, `.publishing-${randomUUID()}`)
    const fd = openSync(
      temporary,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o644,
    )
    try {
      try {
        writeFileSync(fd, bytes)
        fsyncSync(fd)
      } finally {
        closeSync(fd)
      }
      assertDirectories()
      try {
        // link publishes complete bytes atomically and cannot replace an existing name.
        linkSync(temporary, path.join(directory, relative))
      } catch (error) {
        if (error.code !== 'EEXIST' || !reuse) throw error
      }
    } finally {
      assertDirectories()
      unlinkSync(temporary)
    }
    return verifiedDescriptor()
  }

  function readIdentity(artifact) {
    if (
      !artifact ||
      typeof artifact !== 'object' ||
      Array.isArray(artifact) ||
      artifact.encoding !== 'gzip' ||
      artifact.format !== identityFormat ||
      !Number.isSafeInteger(artifact.bytes) ||
      artifact.bytes < 20 ||
      artifact.bytes > storedIdentityMaxBytes ||
      !Number.isSafeInteger(artifact.decodedBytes) ||
      artifact.decodedBytes < 0 ||
      artifact.decodedBytes > identityMaxBytes ||
      typeof artifact.sha256 !== 'string' ||
      typeof artifact.decodedSha256 !== 'string' ||
      !/^[a-f\d]{64}$/u.test(artifact.sha256) ||
      !/^[a-f\d]{64}$/u.test(artifact.decodedSha256)
    )
      throw new Error('invalid counterproof identity artifact descriptor')
    if (
      typeof artifact.path !== 'string' ||
      !/^counterproof-raw\/[a-f\d]{64}\.identity\.tsv\.gz$/u.test(artifact.path) ||
      artifact.path !== `counterproof-raw/${artifact.sha256}.identity.tsv.gz`
    )
      throw new Error('invalid counterproof identity artifact path')
    const stored = readOrdinary(
      artifact.path,
      artifact.bytes,
      'counterproof identity artifact descriptor mismatch',
    )
    if (stored.length !== artifact.bytes || digest(stored) !== artifact.sha256)
      throw new Error('counterproof identity artifact descriptor mismatch')
    let decoded
    try {
      decoded = gunzipSync(stored, { maxOutputLength: Math.max(1, artifact.decodedBytes) })
    } catch (cause) {
      throw new Error('counterproof identity artifact gzip decode failed', { cause })
    }
    if (decoded.length !== artifact.decodedBytes || digest(decoded) !== artifact.decodedSha256)
      throw new Error('counterproof decoded identity artifact descriptor mismatch')
    return decoded
  }

  return {
    directory,
    writeIdentity(bytes) {
      if (!Buffer.isBuffer(bytes) || bytes.length > identityMaxBytes)
        throw new Error('counterproof identity requires a Buffer of at most 64 MiB')
      const decoded = Buffer.from(bytes)
      const stored = gzipSync(decoded, { level: 9 })
      if (stored.length > storedIdentityMaxBytes)
        throw new Error('counterproof compressed identity exceeds stored byte limit')
      const artifact = {
        ...publish(`counterproof-raw/${digest(stored)}.identity.tsv.gz`, stored, true),
        format: identityFormat,
        encoding: 'gzip',
        decodedBytes: decoded.length,
        decodedSha256: digest(decoded),
      }
      if (!readIdentity(artifact).equals(decoded))
        throw new Error('counterproof decoded identity artifact content collision')
      return artifact
    },
    readIdentity,
    writeConsole(label, text) {
      if (!/^[a-z\d][a-z\d._-]*$/iu.test(label))
        throw new Error('invalid counterproof console label')
      const normalized = `${text.replace(/[\r\n \t]+$/, '')}\n`
      return publish(`counterproof-raw/${label}.console`, normalized)
    },
    writeReceipt(text) {
      return publish('counterproof.json', text)
    },
  }
}
