import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { createCliTestHost } from './__tests__/cli-host.js'
import {
  buildDataMkfArchive,
  buildSssArchive,
  buildTailPipelineInputs,
  buildWordDatArchive,
} from './__tests__/glm-q/cli-pipeline-inputs.js'

test('a successful source-only CLI extraction advertises Chinese without a missing English request', async ({
  onTestFinished,
}) => {
  const host = createCliTestHost('pal-language-availability-')
  onTestFinished(() => host.disposeAll())
  const tree = host.createTree()
  const raw = join(tree, 'data/raw')
  for (const [name, bytes] of Object.entries({
    'SSS.MKF': buildSssArchive(),
    'M.MSG': new TextEncoder().encode('HELLO MSG'),
    'WORD.DAT': buildWordDatArchive(),
    'DATA.MKF': buildDataMkfArchive(),
    'mus.mkf': new Uint8Array([8, 0, 0, 0, 8, 0, 0, 0]),
    ...buildTailPipelineInputs(),
  }))
    writeFileSync(join(raw, name), bytes)
  mkdirSync(join(raw, 'Musics'))
  // Legal source-audit inputs deliberately use the existing faithful synthetic-fixture path.
  const result = await host.runCli(tree, ['--faithful'])
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('[pal-extract] unifont-cn.bdf 缺,跳过 font\n')
  expect(
    JSON.parse(readFileSync(join(tree, 'data/extracted/lookup/languages.json'), 'utf8')),
  ).toEqual({ languages: ['zh-CN'] })
  expect(existsSync(join(tree, 'data/extracted/lookup/en.json'))).toBe(false)
})
