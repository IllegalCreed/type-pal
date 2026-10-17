import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
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
  const data = join(root, 'data')
  const output = join(data, 'extracted')
  mkdirSync(data)
  roots.push(root)
  return { root, data, output }
}

describe('assertOwnedOutputRoot', () => {
  it('allows an owned data directory and an absent output directory', () => {
    const { data, output } = makeTree()
    expect(() => prepareOutputRoot(data, output)).not.toThrow()
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
