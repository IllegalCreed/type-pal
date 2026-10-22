import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, onTestFinished, test, vi } from 'vitest'
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

test.each([
  ['missing source path', undefined, '--english-slf requires a file path'],
  ['another flag as source path', '--unknown', '--english-slf requires a file path'],
  [
    'faithful extraction with an English source',
    'source.slf',
    '--faithful cannot use --english-slf',
  ],
])('CLI rejects %s before replacing previous output', async (_name, sourcePath, reason) => {
  const host = createCliTestHost('pal-language-preflight-')
  onTestFinished(() => host.disposeAll())
  const tree = host.createTree()
  const raw = join(tree, 'data/raw')
  writeFileSync(join(raw, 'SSS.MKF'), buildSssArchive())
  writeFileSync(join(raw, 'M.MSG'), 'HELLO MSG')
  writeFileSync(join(raw, 'WORD.DAT'), buildWordDatArchive())
  const output = join(tree, 'data/extracted')
  mkdirSync(output)
  const previousBytes = Buffer.from('{"previous":"keep this export"}\n')
  writeFileSync(join(output, 'keep.json'), previousBytes)
  const args = ['--faithful', '--english-slf']
  if (sourcePath === 'source.slf') {
    const slfPath = join(tree, sourcePath)
    writeFileSync(slfPath, '[BEGIN WORDS]\n0=\n[END WORDS]\n')
    args.push(slfPath)
  } else if (sourcePath) args.push(sourcePath)

  const result = await host.runCli(tree, args)
  expect(result.exitCode).toBe(1)
  expect(result.signal).toBeNull()
  expect(result.stderr).toContain(reason)
  expect(readdirSync(output)).toEqual(['keep.json'])
  expect(readFileSync(join(output, 'keep.json'))).toEqual(previousBytes)
})

test('the real CLI entry documents optional English sources and faithful extraction', async () => {
  const previousArgv = process.argv
  const output = vi.spyOn(console, 'log')
  try {
    process.argv = [process.execPath, fileURLToPath(new URL('./cli.ts', import.meta.url)), '--help']
    vi.resetModules()
    await import('./cli.js')
    const help = output.mock.calls.map((args) => args.join(' ')).join('\n')
    expect(help).toContain('--english-slf PATH')
    expect(help).toContain('--faithful')
  } finally {
    process.argv = previousArgv
    output.mockRestore()
    vi.resetModules()
  }
})
