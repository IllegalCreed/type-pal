/** Real entrypoints in owned temporary trees; the fake executable replaces encoding only. */
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, expect, it } from 'vitest'

const PACKAGE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LOADER = pathToFileURL(join(PACKAGE, 'node_modules/tsx/dist/esm/index.mjs')).href
const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function makeTree() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'extract-entrypoints-')))
  roots.push(root)
  const pkg = join(root, 'packages/pal-extract')
  mkdirSync(pkg, { recursive: true })
  for (const name of ['src', 'scripts', 'package.json']) {
    cpSync(join(PACKAGE, name), join(pkg, name), { recursive: true })
  }
  symlinkSync(join(PACKAGE, 'node_modules'), join(pkg, 'node_modules'), 'dir')
  const data = join(root, 'data')
  mkdirSync(data)
  const bin = join(root, 'bin')
  mkdirSync(bin)
  const trace = join(root, 'ffmpeg-calls.jsonl')
  // A real child executable writes exactly the requested output. It never resolves paths for SUT.
  writeFileSync(
    join(bin, 'ffmpeg'),
    `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.EXTRACT_TEST_TRACE, JSON.stringify(args) + '\\n');
if (args[0] !== '-version') fs.writeFileSync(args.at(-1), 'converted:' + fs.readFileSync(args[args.indexOf('-i') + 1], 'utf8'));
`,
    { mode: 0o755 },
  )
  function run(entry: string) {
    const result = spawnSync(process.execPath, ['--import', LOADER, entry], {
      cwd: pkg,
      env: {
        ...process.env,
        PATH: bin,
        NODE_COMPILE_CACHE: '',
        EXTRACT_TEST_TRACE: trace,
      },
      encoding: 'utf8',
      timeout: 15_000,
    })
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    return result
  }
  function rawVideos(raw: string) {
    mkdirSync(raw, { recursive: true })
    for (let id = 1; id <= 6; id++) {
      const path = join(raw, `${id}.avi`)
      writeFileSync(path, `raw-${id}`)
      utimesSync(path, 1, 1)
    }
  }
  return { root, pkg, data, trace, run, rawVideos }
}

it.each([
  'data',
  'extracted',
] as const)('video entrypoint refuses shared %s before invoking ffmpeg or changing its target', (node) => {
  const f = makeTree()
  const shared = join(f.root, 'shared')
  mkdirSync(shared)
  const extracted = join(f.data, 'extracted')
  let output: string
  if (node === 'data') {
    rmSync(f.data, { recursive: true })
    symlinkSync(shared, f.data, 'dir')
    output = join(shared, 'extracted/videos')
  } else {
    symlinkSync(shared, extracted, 'dir')
    output = join(shared, 'videos')
  }
  f.rawVideos(join(f.data, 'raw'))
  mkdirSync(output, { recursive: true })
  for (let id = 1; id <= 6; id++) {
    const path = join(output, `${id}.mp4`)
    writeFileSync(path, `other-owner-${id}`)
    utimesSync(path, 0, 0)
  }
  const result = f.run(join(f.pkg, 'scripts/extract-videos.ts'))
  expect(
    Array.from({ length: 6 }, (_, i) => readFileSync(join(output, `${i + 1}.mp4`), 'utf8')),
  ).toEqual(Array.from({ length: 6 }, (_, i) => `other-owner-${i + 1}`))
  expect(result.status).toBe(1)
  const path = node === 'data' ? f.data : extracted
  const label = node === 'data' ? 'data' : 'data/extracted'
  expect(result.stderr).toContain(
    `[pal-extract] refuse shared output: ${label} is symlink (${path})`,
  )
  expect(existsSync(f.trace)).toBe(false)
})

it('owned video output accepts read-only raw links, writes six outputs and then skips them', () => {
  const f = makeTree()
  const raw = join(f.root, 'owned-input')
  f.rawVideos(raw)
  symlinkSync(raw, join(f.data, 'raw'), 'dir')
  const entry = join(f.pkg, 'scripts/extract-videos.ts')
  const first = f.run(entry)
  expect(first.status).toBe(0)
  expect(first.stderr).toBe('')
  const output = join(f.data, 'extracted/videos')
  for (let id = 1; id <= 6; id++) {
    expect(readFileSync(join(output, `${id}.mp4`), 'utf8')).toBe(`converted:raw-${id}`)
    // Make the incremental decision deterministic, independent of filesystem clock resolution.
    utimesSync(join(output, `${id}.mp4`), 2, 2)
    expect(readFileSync(join(raw, `${id}.avi`), 'utf8')).toBe(`raw-${id}`)
  }
  const second = f.run(entry)
  expect(second.status).toBe(0)
  expect(second.stderr).toBe('')
  expect(second.stdout.match(/skipped,/g)).toHaveLength(6)
  const calls = readFileSync(f.trace, 'utf8')
    .trim()
    .split('\n')
    .map((s) => JSON.parse(s))
  expect(calls).toEqual([
    ['-version'],
    ...Array.from({ length: 6 }, (_, i) => [
      '-y',
      '-loglevel',
      'error',
      '-i',
      join(f.data, 'raw', `${i + 1}.avi`),
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-movflags',
      '+faststart',
      join(output, `${i + 1}.mp4`),
    ]),
    ['-version'],
  ])
})

it('absolute CLI entrypoint through a directory link executes main instead of silently exiting zero', () => {
  const f = makeTree()
  const alias = join(f.root, 'package-alias')
  symlinkSync(f.pkg, alias, 'dir')
  const result = f.run(join(alias, 'src/cli.ts'))
  expect(result.status).toBe(1)
  expect(result.stdout).toContain('[pal-extract] start')
  expect(result.stderr).toContain('ENOENT')
  expect(result.stderr).toContain(join(f.data, 'raw/SSS.MKF'))
})

it('importing CLI from a different real entrypoint stays side-effect free', () => {
  const f = makeTree()
  const runner = join(f.root, 'import-only.mjs')
  writeFileSync(
    runner,
    `await import(${JSON.stringify(pathToFileURL(join(f.pkg, 'src/cli.ts')).href)}); console.log('import-only');`,
  )
  const result = f.run(runner)
  expect(result.status).toBe(0)
  expect(result.stdout).toBe('import-only\n')
  expect(result.stderr).toBe('')
  expect(existsSync(join(f.data, 'extracted'))).toBe(false)
})

it('default prepareOutputRoot checks the imported CLI tree, independently of process cwd', () => {
  const f = makeTree()
  const shared = join(f.root, 'shared-output')
  mkdirSync(shared)
  writeFileSync(join(shared, 'marker.txt'), 'other-owner')
  const output = join(f.data, 'extracted')
  symlinkSync(shared, output, 'dir')
  const runner = join(f.root, 'check-default-output.mjs')
  writeFileSync(
    runner,
    `const { prepareOutputRoot } = await import(${JSON.stringify(pathToFileURL(join(f.pkg, 'src/cli.ts')).href)});
try { prepareOutputRoot(); console.log('did-not-reject'); }
catch (error) { console.log(error instanceof Error ? error.message : 'non-Error'); }`,
  )
  const result = f.run(runner)
  expect(result.status).toBe(0)
  expect(result.stderr).toBe('')
  expect(result.stdout).toBe(
    `[pal-extract] refuse shared output: data/extracted is symlink (${output})\n`,
  )
  expect(readFileSync(join(shared, 'marker.txt'), 'utf8')).toBe('other-owner')
  expect(existsSync(f.trace)).toBe(false)
})
