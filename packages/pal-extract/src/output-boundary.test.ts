import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { prepareOutputRoot } from './cli.js'
import { assertOwnedOutputRoot } from './output-boundary.js'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function makeTree(): { root: string; data: string; output: string } {
  const root = mkdtempSync(join(tmpdir(), 'pal-extract-output-boundary-'))
  roots.push(root)
  const data = join(root, 'data')
  const output = join(data, 'extracted')
  mkdirSync(data)
  return { root, data, output }
}

describe('assertOwnedOutputRoot', () => {
  it('allows an owned data directory and an absent output directory', () => {
    const { data, output } = makeTree()
    expect(() => prepareOutputRoot(data, output)).not.toThrow()
  })

  it('propagates missing data ENOENT rather than treating it as an absent output', () => {
    const { root, data, output } = makeTree()
    rmSync(data, { recursive: true })
    let error: unknown
    try {
      assertOwnedOutputRoot(data, output)
    } catch (caught) {
      error = caught
    }
    expect(error).toMatchObject({ code: 'ENOENT', syscall: 'lstat', path: data })
    expect(readdirSync(root)).toEqual([])
  })

  it('propagates output ENOTDIR without changing the blocking data file', () => {
    const { root, data, output } = makeTree()
    rmSync(data, { recursive: true })
    writeFileSync(data, 'not-a-directory')
    let error: unknown
    try {
      assertOwnedOutputRoot(data, output)
    } catch (caught) {
      error = caught
    }
    expect(error).toMatchObject({ code: 'ENOTDIR', syscall: 'lstat', path: output })
    expect(readFileSync(data, 'utf8')).toBe('not-a-directory')
    expect(readdirSync(root)).toEqual(['data'])
  })

  it('rejects a shared data symlink before inspecting output', () => {
    const { root, data, output } = makeTree()
    const shared = join(root, 'shared-data')
    mkdirSync(shared)
    rmSync(data, { recursive: true, force: true })
    symlinkSync(shared, data, 'dir')

    expect(() => assertOwnedOutputRoot(data, output)).toThrow(
      `[pal-extract] refuse shared output: data is symlink (${data})`,
    )
  })

  it('rejects a shared data/extracted symlink while allowing the data parent', () => {
    const { root, data, output } = makeTree()
    const shared = join(root, 'shared-extracted')
    mkdirSync(shared)
    symlinkSync(shared, output, 'dir')

    expect(() => assertOwnedOutputRoot(data, output)).toThrow(
      `[pal-extract] refuse shared output: data/extracted is symlink (${output})`,
    )
  })
})
