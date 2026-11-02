import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { counterproofDirtyPaths, prepareCounterproofOutput } from './counterproof-output.mjs'

const green = Buffer.from('src/example.test.ts\tcontract result\tpassed\n')
const red = Buffer.from('src/example.test.ts\tcontract result\tfailed\n')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptsDir, '../../..')
let temporary

beforeEach(() => {
  temporary = mkdtempSync(path.join(realpathSync(tmpdir()), 'counterproof-output-test-'))
})
afterEach(() => rmSync(temporary, { recursive: true, force: true }))

function prepare(name = 'run') {
  const directory = path.join(temporary, name)
  return prepareCounterproofOutput({ defaultDir: directory, argv: ['--output-dir', directory] })
}

function git(...args) {
  return execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
    cwd: temporary,
    encoding: 'utf8',
  })
}

test('real Git NUL records preserve Chinese and spaced output paths without exempting other files', () => {
  git('init', '--quiet')
  const own = '证据 run'
  const output = prepare(own)
  output.writeIdentity(green)
  const status = () => git('status', '--porcelain', '-z', '--untracked-files=all')
  expect(counterproofDirtyPaths(status(), [own])).toEqual([])
  writeFileSync(path.join(temporary, '产品 source.ts'), 'product change')
  expect(counterproofDirtyPaths(status(), [own])).toEqual(['产品 source.ts'])
})

test('real Git renames reject either unowned endpoint and only exempt wholly owned moves', () => {
  git('init', '--quiet')
  mkdirSync(path.join(temporary, 'owned'))
  for (const [file, content] of [
    ['product source.ts', 'unique product source'],
    ['owned/原始 source.tsv', 'unique owned source'],
    ['owned/previous.tsv', 'unique wholly owned move'],
  ])
    writeFileSync(path.join(temporary, file), content)
  git('add', '.')
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    'fixture',
  )
  git('mv', 'product source.ts', 'owned/目标 target.tsv')
  git('mv', 'owned/原始 source.tsv', '产品 target.ts')
  git('mv', 'owned/previous.tsv', 'owned/next.tsv')
  const status = git('status', '--porcelain', '-z', '--untracked-files=all')
  expect(counterproofDirtyPaths(status, ['owned']).sort()).toEqual([
    'product source.ts',
    '产品 target.ts',
  ])
})

test('truncated or malformed Git records fail closed instead of appearing clean', () => {
  for (const status of ['?? owned/file', 'R  owned/renamed\0', 'owned/file\0'])
    expect(() => counterproofDirtyPaths(status, ['owned'])).toThrow(/git (status|rename)/u)
})

test('equal identity bytes share one verified file while phase descriptions remain distinct', () => {
  const output = prepare()
  const baseline = { label: 'baseline', exitCode: 0, artifact: output.writeIdentity(green) }
  const restored = { label: 'restored', exitCode: 0, artifact: output.writeIdentity(green) }
  expect(baseline.artifact).not.toBe(restored.artifact)
  expect(baseline.artifact).toEqual(restored.artifact)
  const stored = readFileSync(path.join(output.directory, baseline.artifact.path))
  expect(gunzipSync(stored)).toEqual(green)
  expect(baseline.artifact).toMatchObject({
    encoding: 'gzip',
    bytes: stored.length,
    sha256: hash(stored),
    decodedBytes: green.length,
    decodedSha256: hash(green),
  })
  expect(baseline.artifact.sha256).not.toBe(baseline.artifact.decodedSha256)
  expect(output.readIdentity(restored.artifact)).toEqual(green)
  expect(readdirSync(path.join(output.directory, 'counterproof-raw'))).toEqual([
    `${hash(gzipSync(green, { level: 9 }))}.identity.tsv.gz`,
  ])
  output.writeReceipt(`${JSON.stringify({ baseline, restored })}\n`)
  const receipt = JSON.parse(readFileSync(path.join(output.directory, 'counterproof.json'), 'utf8'))
  expect(receipt.baseline.label).toBe('baseline')
  expect(receipt.restored.label).toBe('restored')
  expect(lstatSync(path.join(output.directory, baseline.artifact.path)).nlink).toBe(1)
})

test('a changed execution status preserves a separate full byte artifact', () => {
  const output = prepare()
  const passed = output.writeIdentity(green)
  const failed = output.writeIdentity(red)
  expect(failed.path).not.toBe(passed.path)
  expect(output.readIdentity(passed)).toEqual(green)
  expect(output.readIdentity(failed)).toEqual(red)
  expect(readdirSync(path.join(output.directory, 'counterproof-raw')).sort()).toEqual(
    [
      `${hash(gzipSync(green, { level: 9 }))}.identity.tsv.gz`,
      `${hash(gzipSync(red, { level: 9 }))}.identity.tsv.gz`,
    ].sort(),
  )
})

test('existing bytes at the content address cannot be overwritten or accepted by filename alone', () => {
  const output = prepare()
  const collision = path.join(
    output.directory,
    'counterproof-raw',
    `${hash(gzipSync(green, { level: 9 }))}.identity.tsv.gz`,
  )
  writeFileSync(collision, red)
  expect(() => output.writeIdentity(green)).toThrow('content collision')
  expect(readFileSync(collision)).toEqual(red)
  expect(readdirSync(path.dirname(collision))).toEqual([path.basename(collision)])
})

test('reuse re-reads published bytes and rejects same-length tampering and bad descriptors', () => {
  const output = prepare()
  const artifact = output.writeIdentity(green)
  expect(() => output.readIdentity({ ...artifact, bytes: artifact.bytes + 1 })).toThrow(
    'descriptor mismatch',
  )
  const tampered = readFileSync(path.join(output.directory, artifact.path))
  tampered[Math.floor(tampered.length / 2)] ^= 1
  writeFileSync(path.join(output.directory, artifact.path), tampered)
  expect(() => output.writeIdentity(green)).toThrow('content collision')
  expect(() => output.readIdentity(artifact)).toThrow('descriptor mismatch')
  expect(readFileSync(path.join(output.directory, artifact.path))).toEqual(tampered)
})

test('compressed identities retain exact TSV bytes while reducing repetitive full-suite storage', () => {
  const output = prepare()
  const identity = Buffer.from(
    Array.from({ length: 1000 }, (_, i) => `src/contract.test.ts\tcase ${i}\tpassed\n`).join(''),
  )
  const artifact = output.writeIdentity(identity)
  expect(artifact.bytes).toBeLessThan(identity.length / 4)
  expect(output.readIdentity(artifact)).toEqual(identity)
  const empty = output.writeIdentity(Buffer.alloc(0))
  expect(output.readIdentity(empty)).toEqual(Buffer.alloc(0))
})

test('external descriptors cannot change the codec, decoded identity or byte limits', () => {
  const output = prepare()
  const artifact = output.writeIdentity(green)
  for (const invalid of [
    null,
    { ...artifact, encoding: 'identity' },
    { ...artifact, format: 'json' },
    { ...artifact, bytes: -1 },
    { ...artifact, bytes: artifact.bytes - 1 },
    { ...artifact, bytes: 64 * 1024 * 1024 + 64 * 1024 + 1 },
    { ...artifact, decodedBytes: 64 * 1024 * 1024 + 1 },
    { ...artifact, decodedBytes: 0.5 },
    { ...artifact, decodedSha256: 'not a hash' },
    { ...artifact, decodedSha256: hash(red) },
    { ...artifact, decodedBytes: green.length + 1 },
  ])
    expect(() => output.readIdentity(invalid)).toThrow(/descriptor/u)
  expect(output.readIdentity(artifact)).toEqual(green)
})

test('stored hashes cannot hide corrupt gzip or expansion beyond the declared decoded extent', () => {
  const output = prepare()
  const original = output.writeIdentity(green)
  const put = (stored, decodedBytes) => {
    const artifact = {
      ...original,
      path: `counterproof-raw/${hash(stored)}.identity.tsv.gz`,
      bytes: stored.length,
      sha256: hash(stored),
      decodedBytes,
    }
    writeFileSync(path.join(output.directory, artifact.path), stored)
    return artifact
  }
  const corrupt = Buffer.from(gzipSync(green, { level: 9 }))
  corrupt[corrupt.length - 8] ^= 1 // CRC is invalid even when the stored SHA is truthful.
  expect(() => output.readIdentity(put(corrupt, green.length))).toThrow('gzip decode failed')
  const expansion = gzipSync(Buffer.alloc(1024 * 1024, 65), { level: 9 })
  expect(() => output.readIdentity(put(expansion, 32))).toThrow('gzip decode failed')
  expect(output.readIdentity(original)).toEqual(green)
})

test('wrong input types and oversized raw identities fail before publishing any content', () => {
  const output = prepare()
  for (const invalid of [
    green.toString(),
    new Uint8Array(green),
    Buffer.alloc(64 * 1024 * 1024 + 1),
  ])
    expect(() => output.writeIdentity(invalid)).toThrow('Buffer of at most 64 MiB')
  expect(readdirSync(path.join(output.directory, 'counterproof-raw'))).toEqual([])
})

test('receipt and console publication is exclusive even when a second write has equal bytes', () => {
  const output = prepare()
  output.writeReceipt('{"execution":1}\n')
  expect(() => output.writeReceipt('{"execution":1}\n')).toThrow('EEXIST')
  const console = output.writeConsole('injection.mutant', 'AssertionError\r\n\t ')
  expect(() => output.writeConsole('injection.mutant', 'replacement')).toThrow('EEXIST')
  expect(readFileSync(path.join(output.directory, console.path), 'utf8')).toBe('AssertionError\n')
  expect(readFileSync(path.join(output.directory, 'counterproof.json'), 'utf8')).toBe(
    '{"execution":1}\n',
  )
})

test('explicit empty directories are admitted once; existing default and nonempty output are rejected', () => {
  const directory = path.join(temporary, 'empty')
  mkdirSync(directory)
  expect(() => prepareCounterproofOutput({ defaultDir: directory, argv: [] })).toThrow(
    'historical counterproof output already exists',
  )
  expect(readdirSync(directory)).toEqual([])
  const output = prepareCounterproofOutput({
    defaultDir: directory,
    argv: ['--output-dir', directory],
  })
  output.writeReceipt('{"sentinel":true}\n')
  expect(() =>
    prepareCounterproofOutput({ defaultDir: directory, argv: ['--output-dir', directory] }),
  ).toThrow('must be empty')
  expect(readFileSync(path.join(directory, 'counterproof.json'), 'utf8')).toBe(
    '{"sentinel":true}\n',
  )
})

test('output arguments reject traversal, unknown flags and absent parents before creating files', () => {
  const missing = path.join(temporary, 'missing')
  for (const argv of [
    ['--output-dir'],
    ['--force', missing],
    ['--output-dir', `${temporary}/../escape`],
    ['--output-dir', `${temporary}/./escape`],
    ['--output-dir', `${temporary}/missing/child`],
  ])
    expect(() => prepareCounterproofOutput({ defaultDir: missing, argv })).toThrow()
  expect(readdirSync(temporary)).toEqual([])
})

test('symlink output roots and ancestors cannot redirect an admitted run', () => {
  const real = path.join(temporary, 'real')
  const linked = path.join(temporary, 'linked')
  mkdirSync(real)
  symlinkSync(real, linked, 'dir')
  for (const directory of [linked, path.join(linked, 'child')])
    expect(() =>
      prepareCounterproofOutput({ defaultDir: directory, argv: ['--output-dir', directory] }),
    ).toThrow('requires real directories')
  expect(readdirSync(real)).toEqual([])
})

test('replaced output directories and symlink artifact names are rejected without touching targets', () => {
  const output = prepare()
  const outside = path.join(temporary, 'outside')
  writeFileSync(outside, 'private sentinel')
  symlinkSync(
    outside,
    path.join(
      output.directory,
      'counterproof-raw',
      `${hash(gzipSync(green, { level: 9 }))}.identity.tsv.gz`,
    ),
  )
  expect(() => output.writeIdentity(green)).toThrow()
  expect(readFileSync(outside, 'utf8')).toBe('private sentinel')
  const moved = path.join(temporary, 'moved')
  renameSync(output.directory, moved)
  mkdirSync(output.directory)
  mkdirSync(path.join(output.directory, 'counterproof-raw'))
  expect(() => output.writeReceipt('replacement')).toThrow('directory was replaced')
  expect(readdirSync(path.join(output.directory, 'counterproof-raw'))).toEqual([])
  expect(existsSync(path.join(output.directory, 'counterproof.json'))).toBe(false)
})

test('artifact paths and console labels cannot escape the owned output directory', () => {
  const output = prepare()
  const artifact = output.writeIdentity(green)
  for (const unsafe of ['../outside', '/absolute', 'nested/file', '..'])
    expect(() => output.writeConsole(unsafe, 'unexpected')).toThrow('invalid counterproof console')
  expect(() => output.readIdentity({ ...artifact, path: '../outside' })).toThrow(
    'invalid counterproof identity artifact path',
  )
  expect(readdirSync(temporary)).toEqual(['run'])
})

test('two processes cannot both claim the same empty output directory', async () => {
  const directory = path.join(temporary, 'contended')
  mkdirSync(directory)
  const helperUrl = new URL('./counterproof-output.mjs', import.meta.url).href
  const program = `import { prepareCounterproofOutput } from ${JSON.stringify(helperUrl)};
const output = prepareCounterproofOutput({ defaultDir: process.argv[1], argv: ['--output-dir', process.argv[1]] });
output.writeReceipt(JSON.stringify({ pid: process.pid }));`
  const run = () =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', program, directory])
      let stderr = ''
      child.stderr.on('data', (data) => {
        stderr += data
      })
      child.on('error', reject)
      child.on('close', (code, signal) => resolve({ code, signal, stderr, pid: child.pid }))
    })
  const results = await Promise.all([run(), run()])
  expect(results.filter((result) => result.code === 0)).toHaveLength(1)
  const winner = results.find((result) => result.code === 0)
  const loser = results.find((result) => result.code !== 0)
  expect(loser.stderr).toMatch(/must be empty|EEXIST/u)
  expect(results.map((result) => result.signal)).toEqual([null, null])
  expect(JSON.parse(readFileSync(path.join(directory, 'counterproof.json'), 'utf8'))).toEqual({
    pid: winner.pid,
  })
})

test.each([
  ['mt1', 'MOTION-TRANSITION', ['world-motion-runtime.ts']],
  ['mhb1', 'MAIN-HOST-BOUNDARIES', ['main.ts']],
  ['bcs1', 'BATTLE-CORE-SESSION', ['battle/battle-core.ts', 'battle/battle-session.ts']],
])('%s CLI rejects old or occupied output before git, test commands or product writes', (stem, task, sources) => {
  const carrier = path.join(
    repoRoot,
    `docs/tasks/evidence/TEST-GLM-REFORGE-${task}-1/counterproof.json`,
  )
  const protectedFiles = [
    carrier,
    ...sources.map((source) => path.join(scriptsDir, '../src', source)),
  ]
  const before = protectedFiles.map((file) => hash(readFileSync(file)))
  const occupied = path.join(temporary, 'occupied')
  mkdirSync(occupied)
  writeFileSync(path.join(occupied, 'sentinel'), 'preserve')
  for (const args of [[], ['--output-dir', occupied]]) {
    // No child command is available: an output rejection must occur before invoking git/pnpm.
    const result = spawnSync(
      process.execPath,
      [path.join(scriptsDir, `${stem}-mutation-counterproof.mjs`), ...args],
      {
        cwd: repoRoot,
        env: { ...process.env, PATH: temporary },
        encoding: 'utf8',
        timeout: 10_000,
      },
    )
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(1)
    expect(result.signal).toBeNull()
    expect(result.stderr).toMatch(
      /historical counterproof output already exists|output must be empty/u,
    )
  }
  expect(protectedFiles.map((file) => hash(readFileSync(file)))).toEqual(before)
  expect(readdirSync(occupied)).toEqual(['sentinel'])
  expect(readFileSync(path.join(occupied, 'sentinel'), 'utf8')).toBe('preserve')
})
