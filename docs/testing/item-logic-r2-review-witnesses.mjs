import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Same six source mutations and same judge. Only adapt the oracle's two base-stat expectations
// because r2 changed the legal fixture maxHP/maxMP from 150/100 to 100/50.
const root = resolve(process.argv[2])
const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'item-logic-review-witnesses.mjs'),
  'utf8',
)
const from = 'level:2,maxHP:164,maxMP:111'
assert.equal(source.split(from).length, 2)
const work = mkdtempSync(join(tmpdir(), 'codex-item-r2-runner-'))
const runner = join(work, 'runner.mjs')
writeFileSync(runner, source.replace(from, 'level:2,maxHP:114,maxMP:61'))
const env = { ...process.env }
delete env.NODE_COMPILE_CACHE
const result = spawnSync(process.execPath, [runner, root], { env, stdio: 'inherit' })
assert.equal(result.signal, null)
assert.equal(result.status, 0)
