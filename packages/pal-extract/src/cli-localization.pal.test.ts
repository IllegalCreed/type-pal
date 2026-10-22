import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test } from 'vitest'
import { createCliTestHost } from './__tests__/cli-host.js'

const raw = resolve(import.meta.dirname, '../../../data/raw')

test.each([
  ['invalid syntax', '[BEGIN WORDS]\n7=New Game', 'unterminated section'],
  ['different edition', '[BEGIN WORDS]\n7=New Game\n[END WORDS]', 'Unsupported English SLF source'],
  ['missing file', null, 'English SLF does not exist'],
])('English preflight preserves prior output for %s', async (_name, source, diagnostic) => {
  const host = createCliTestHost('pal-language-preflight-')
  try {
    const tree = host.createTree()
    for (const file of ['SSS.MKF', 'M.MSG', 'WORD.DAT'])
      copyFileSync(join(raw, file), join(tree, 'data/raw', file))
    const slf = join(tree, 'english.slf')
    if (source !== null) writeFileSync(slf, source)
    mkdirSync(join(tree, 'data/extracted'))
    writeFileSync(join(tree, 'data/extracted/keep.json'), 'last successful extraction')
    const result = await host.runCli(tree, ['--english-slf', slf])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain(diagnostic)
    expect(readFileSync(join(tree, 'data/extracted/keep.json'), 'utf8')).toBe(
      'last successful extraction',
    )
    expect(existsSync(join(tree, 'data/extracted/events/all.json'))).toBe(false)
  } finally {
    await host.disposeAll()
  }
})
