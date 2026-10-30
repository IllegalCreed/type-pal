import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'

function runAudit(bytes?: Uint8Array) {
  const root = mkdtempSync(join(tmpdir(), 'data mkf audit-'))
  try {
    const script = join(root, 'packages/pal-extract/audit-data-mkf.mjs')
    const cwd = join(root, 'unrelated-cwd')
    mkdirSync(join(root, 'packages/pal-extract'), { recursive: true })
    mkdirSync(join(root, 'data/raw'), { recursive: true })
    mkdirSync(cwd)
    copyFileSync(new URL('../audit-data-mkf.mjs', import.meta.url), script)
    if (bytes) writeFileSync(join(root, 'data/raw/DATA.MKF'), bytes)
    const result = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8', timeout: 5000 })
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    return result
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function offsets(values: number[], size = values.length * 4): Uint8Array {
  const bytes = new Uint8Array(size)
  const view = new DataView(bytes.buffer)
  values.forEach((value, i) => view.setUint32(i * 4, value, true))
  return bytes
}

it('reads the owning checkout from another cwd, including empty chunks and record diagnostics', () => {
  // PAL DATA slots from global.c/global.h; deliberate non-integral STORE for the diagnostic.
  const sizes = [19, 70, 10, 900, 32, 12, 20, 0, 0, 0, 0, 40, 0, 100, 200, 3]
  const positions = [(sizes.length + 1) * 4]
  for (const size of sizes) positions.push(positions[positions.length - 1]! + size)
  const result = runAudit(offsets(positions, positions[positions.length - 1]!))
  expect(result.status).toBe(0)
  expect(result.stderr).toBe('')
  const lines = result.stdout.trimEnd().split('\n')
  expect(lines.slice(0, 2)).toEqual([
    'DATA.MKF chunkCount = 16',
    'offsets.length = 17 last offset = 1474 fileSize = 1474',
  ])
  expect(lines.slice(2).map((line) => line.trim().replace(/ +/g, ' '))).toEqual([
    'chunk 0: size= 19 STORE recordSize=18 → records=1.0555555555555556 (NOT INTEGER!)',
    'chunk 1: size= 70 ENEMY recordSize=70 → records=1',
    'chunk 2: size= 10 ENEMYTEAM recordSize=10 → records=1',
    'chunk 3: size= 900 PLAYERROLES (single record) recordSize=900 → records=1',
    'chunk 4: size= 32 MAGIC recordSize=32 → records=1',
    'chunk 5: size= 12 BATTLEFIELD recordSize=12 → records=1',
    'chunk 6: size= 20 LEVELUPMAGIC_ALL recordSize=20 → records=1',
    'chunk 7: size= 0 (empty / unused)',
    'chunk 8: size= 0 (empty / unused)',
    'chunk 9: size= 0 SPRITEUI (sprite group, raw)',
    'chunk 10: size= 0 battle effect sprite group',
    'chunk 11: size= 40 rgwBattleEffectIndex[10][2] recordSize=40 → records=1',
    'chunk 12: size= 0 bufDialogIcons (282B sprite)',
    'chunk 13: size= 100 EnemyPos 5x5 PALPOS recordSize=100 → records=1',
    'chunk 14: size= 200 rgLevelUpExp[100] recordSize=200 → records=1',
    'chunk 15: size= 3 ?',
  ])
})

it.each([
  { name: 'short header', bytes: new Uint8Array(3), error: 'buffer too small' },
  { name: 'zero table end', bytes: offsets([0]), error: 'invalid offset table end' },
  { name: 'misaligned table end', bytes: offsets([5], 8), error: 'invalid offset table end' },
  { name: 'truncated table', bytes: offsets([12, 12]), error: 'offset table truncated' },
  { name: 'backward chunk', bytes: offsets([12, 16, 15], 16), error: 'offsets not monotonic' },
  { name: 'outside chunk', bytes: offsets([8, 12]), error: 'offset 12 outside buffer size' },
])('rejects $name before reporting a census', ({ bytes, error }) => {
  const result = runAudit(bytes)
  expect(result.status).not.toBe(0)
  expect(result.stdout).toBe('')
  expect(result.stderr).toContain(`MKF: ${error}`)
})

it('fails on a missing local DATA.MKF instead of reading a different checkout', () => {
  const result = runAudit()
  expect(result.status).not.toBe(0)
  expect(result.stdout).toBe('')
  expect(result.stderr).toContain('ENOENT')
  expect(result.stderr).toContain('data/raw/DATA.MKF')
})
