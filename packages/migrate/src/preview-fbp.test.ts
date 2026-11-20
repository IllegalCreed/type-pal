import { readFileSync, symlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { expect, test } from 'vitest'
import { migrationCliFixture } from './__tests__/migration-cli-fixture.js'
import { json, palettePath, png, put, tempRepo } from './__tests__/pal-asset-fixtures.js'

const defaultOutput = 'fbp-preview.png'

function fixture() {
  const cli = migrationCliFixture('packages/migrate/scripts/preview-fbp.mts', [
    'packages/migrate/src/bake-indexed-rgba.ts',
    'packages/migrate/src/migration-path.ts',
  ])
  const colors = Array.from({ length: 256 }, () => [0, 0, 0])
  colors[5] = [18, 52, 86]
  json(cli.root, palettePath, { colors })
  put(cli.root, 'data/extracted/images/battle/bg/001.png', png(2, 1, [5, 0, 0, 255, 5, 0, 0, 0]))
  return cli
}

test('rejects a linked default preview path before writing the external file', () => {
  const { root, run } = fixture()
  const external = put(tempRepo(), 'existing.png', 'external preview')
  symlinkSync(external, resolve(root, defaultOutput))

  const result = run()

  expect(readFileSync(external, 'utf8')).toBe('external preview')
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('FBP 预览输出 不得经过符号链接: fbp-preview.png')
})

test.each([
  'default',
  'explicit',
])('writes the recolored pixels to the %s destination', (destination) => {
  const { root, run } = fixture()
  const explicit = destination === 'explicit'
  const target = explicit ? resolve(tempRepo(), 'requested.png') : resolve(root, defaultOutput)
  const result = run(explicit ? ['1', target] : [])

  expect(result.status).toBe(0)
  expect(result.stderr).toBe('')
  const preview = PNG.sync.read(readFileSync(target))
  expect([preview.width, preview.height]).toEqual([2, 1])
  expect([...preview.data]).toEqual([18, 52, 86, 255, 0, 0, 0, 0])
})
