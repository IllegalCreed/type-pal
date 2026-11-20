import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { diskTree, tempRepo } from './__tests__/pal-asset-fixtures.js'

const repo = fileURLToPath(new URL('../../../', import.meta.url))
const launch = createRequire(import.meta.url).resolve('tsx/cli')
const chromePath = 'packages/reforge/src/engine-chrome/assets'
const firstFrame = 'ui/box/frame-00.png'
const dialogIcons = 'data/extracted/data/dialog-icons-raw.json'
const script = 'packages/migrate/scripts/bake-assets.mts'

function fixture(details: { missingDialog?: true; changeFirstSource?: true } = {}) {
  const root = tempRepo()
  for (const path of [
    script,
    'packages/migrate/src/bake-indexed-rgba.ts',
    'packages/migrate/src/migration-path.ts',
  ]) {
    const target = resolve(root, path)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(resolve(repo, path), target)
  }
  symlinkSync(
    resolve(repo, 'packages/migrate/node_modules'),
    resolve(root, 'packages/migrate/node_modules'),
    'dir',
  )
  for (const path of [
    'data/extracted/data/palette',
    'data/extracted/images/items',
    'data/extracted/images/battle',
  ]) {
    const target = resolve(root, path)
    mkdirSync(dirname(target), { recursive: true })
    symlinkSync(resolve(repo, path), target, 'dir')
  }
  if (!details.missingDialog) copyFileSync(resolve(repo, dialogIcons), resolve(root, dialogIcons))
  const images = 'data/extracted/images/ui'
  mkdirSync(resolve(root, images), { recursive: true })
  for (const name of readdirSync(resolve(repo, images))) {
    const source = details.changeFirstSource && name === 'frame-00.png' ? 'frame-01.png' : name
    symlinkSync(resolve(repo, images, source), resolve(root, images, name))
  }
  const chrome = resolve(root, chromePath)
  cpSync(resolve(repo, chromePath), chrome, { recursive: true })
  copyFileSync(resolve(chrome, 'ui/box/frame-01.png'), resolve(chrome, firstFrame))
  return { root, chrome }
}

function runBake(root: string) {
  const run = spawnSync(process.execPath, [launch, resolve(root, script)], {
    cwd: root,
    encoding: 'utf8',
  })
  if (run.error) throw run.error
  expect(run.signal).toBeNull()
  return run
}

test('missing last source fails before the command changes any existing engine chrome', () => {
  const { root, chrome } = fixture({ missingDialog: true })
  const before = diskTree(chrome)
  const result = runBake(root)
  expect(result.status).toBe(1)
  expect(result.stderr).toMatch(/ENOENT[^\n]*dialog-icons-raw\.json/)
  expect(diskTree(chrome)).toEqual(before)
})

test('an author seed hash mismatch preserves existing output bytes', () => {
  const { root, chrome } = fixture()
  copyFileSync(resolve(chrome, 'ui/status/bg.png'), resolve(chrome, 'ui/status/slot.png'))
  const before = diskTree(chrome)
  const result = runBake(root)
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('engine chrome 作者 seed status/slot.png hash 漂移')
  expect(diskTree(chrome)).toEqual(before)
})

test('a valid but different source frame fails the pinned output digest before writing', () => {
  const { root, chrome } = fixture({ changeFirstSource: true })
  // Existing output intentionally differs from both the canonical and altered source.
  copyFileSync(resolve(chrome, 'ui/box/frame-02.png'), resolve(chrome, firstFrame))
  const before = diskTree(chrome)
  const result = runBake(root)
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('engine chrome UI 冻结基线漂移')
  expect(diskTree(chrome)).toEqual(before)
})

test('canonical sources rebuild a missing group and replace stale output byte-for-byte', () => {
  const { root, chrome } = fixture()
  rmSync(resolve(chrome, 'ui/num-blue'), { recursive: true })
  const result = runBake(root)
  expect(result.status).toBe(0)
  expect(result.stderr).toBe('')
  expect(diskTree(chrome)).toEqual(diskTree(resolve(repo, chromePath)))
})

test.each([
  'directory',
  'file',
])('rejects a linked output %s before replacing any assets', (kind) => {
  const { root, chrome } = fixture()
  const outside = tempRepo()
  const target = kind === 'directory' ? 'ui/box' : firstFrame
  const linked = resolve(chrome, target)
  const external = resolve(outside, 'existing')
  cpSync(linked, external, { recursive: true })
  rmSync(linked, { recursive: true })
  symlinkSync(external, linked, kind === 'directory' ? 'dir' : 'file')

  const before = diskTree(chrome)
  const externalBefore = diskTree(outside)
  const result = runBake(root)
  expect(diskTree(outside)).toEqual(externalBefore)
  expect(diskTree(chrome)).toEqual(before)
  expect(result.status).toBe(1)
  expect(result.stderr).toContain(
    `engine chrome 输出 不得经过符号链接: ${chromePath}/${firstFrame}`,
  )
})

test('cursor byte length mismatch is rejected before replacing existing output', () => {
  const { root, chrome } = fixture()
  const path = resolve(root, dialogIcons)
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (!raw || typeof raw !== 'object' || !('size' in raw) || typeof raw.size !== 'number')
    throw new Error('expected the extracted cursor byte length')
  writeFileSync(path, JSON.stringify({ ...raw, size: raw.size + 1 }))
  const before = diskTree(chrome)
  const result = runBake(root)
  expect(diskTree(chrome)).toEqual(before)
  expect(result.status).toBe(1)
  expect(result.stderr).toMatch(/engine chrome 对话光标数据无效:[^\n]*dialog-icons-raw\.json/)
})
