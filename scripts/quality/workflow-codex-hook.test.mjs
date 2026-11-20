import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

test('a Codex tool needs the current turn and unchanged routed sources', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'type-pal-hook-test-'))
  try {
    await mkdir(join(dir, 'scripts'))
    await cp(new URL('../workflow/', import.meta.url), join(dir, 'scripts/workflow'), {
      recursive: true,
    })
    const route =
      '| E2E、剧情回写或编辑器预览起点 | [合同](docs/testing/e2e/contract.md) | 以实绘验收 |\n'
    const spec = join(dir, 'docs/testing/e2e/contract.md')
    await mkdir(join(dir, 'docs/testing/e2e'), { recursive: true })
    await writeFile(join(dir, 'AGENTS.md'), route)
    await writeFile(spec, '# 当前合同\n')
    const invoke = (name, command, turn = 'one') => {
      const input = {
        hook_event_name: 'PreToolUse',
        session_id: 'fixture-session',
        turn_id: turn,
        cwd: dir,
        tool_name: name,
        tool_input: { command },
      }
      const outcome = spawnSync(process.execPath, ['scripts/workflow/codex-hook.mjs'], {
        cwd: dir,
        env: { ...process.env, TMPDIR: dir },
        encoding: 'utf8',
        input: JSON.stringify(input),
      })
      assert.equal(outcome.status, 0, outcome.stderr)
      return JSON.parse(outcome.stdout).hookSpecificOutput
    }
    const open = 'node scripts/workflow/open.mjs e2e'
    assert.equal(invoke('apply_patch', 'patch').permissionDecision, 'deny')
    assert.equal(invoke('Bash', `${open} && touch a.js`).permissionDecision, 'deny')
    assert.equal(invoke('Bash', open).permissionDecision, 'allow')
    assert.equal(invoke('apply_patch', 'patch'), undefined)
    assert.equal(invoke('apply_patch', 'patch', 'next').permissionDecision, 'deny')
    await writeFile(spec, '# 合同明确增加新义务\n')
    assert.match(invoke('apply_patch', 'patch').permissionDecisionReason, /已改变/u)
    assert.equal(invoke('Bash', open).permissionDecision, 'allow')
    assert.equal(invoke('apply_patch', 'patch'), undefined)
  } finally {
    await rm(dir, { recursive: true })
  }
})
