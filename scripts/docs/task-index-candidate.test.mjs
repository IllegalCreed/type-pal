import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

test('real index CLI can render a changed candidate before acceptance while ordinary checks stay closed', (t) => {
  const root = mkdtempSync('/tmp/type-pal-task-index-candidate-')
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const repository = fileURLToPath(new URL('../../', import.meta.url))
  cpSync(join(repository, 'scripts/docs'), join(root, 'scripts/docs'), { recursive: true })
  mkdirSync(join(root, 'docs/tasks/cards'), { recursive: true })
  const card = join(root, 'docs/tasks/cards/T.md')
  writeFileSync(card, '# T — candidate\n\nStatus: draft\n')
  execFileSync('git', ['init', '-q'], { cwd: root })
  const run = (...args) =>
    spawnSync(process.execPath, ['scripts/docs/check.mjs', ...args], {
      cwd: root,
      encoding: 'utf8',
    })
  const initial = run('--print-task-index')
  assert.equal(initial.status, 0, initial.stderr)
  assert.match(initial.stdout, /\[T — candidate\]\(T.md\) \| draft/u)
  writeFileSync(card, '# T — candidate\n\nStatus: review\n')
  const changed = run('--print-task-index')
  assert.equal(changed.status, 0, changed.stderr)
  assert.match(changed.stdout, /\[T — candidate\]\(T.md\) \| review/u)
  const check = run()
  assert.equal(check.status, 1)
  assert.match(check.stderr, /admitted manifest missing/u)
  writeFileSync(card, '# T — candidate\n\nStatus: invented\n')
  const invalid = run('--print-task-index')
  assert.equal(invalid.status, 1)
  assert.equal(invalid.stdout, '')
  assert.match(invalid.stderr, /无法生成索引，任务状态无效/u)
})
