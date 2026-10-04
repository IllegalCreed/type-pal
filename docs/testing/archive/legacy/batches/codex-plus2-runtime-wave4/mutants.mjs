import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
export const needles = [
  {
    id: 'throw-shortcut',
    source: 'packages/reforge/src/battle/battle-command-selection.ts',
    test: 'packages/reforge/src/battle/battle-command-selection.residual.test.ts',
    fullName:
      '战斗命令选择剩余当前流程 全体投掷不打开目标格而直接提交一次；单体投掷可退出重选后提交活敌',
    from: "if (key('w', 'W')) {\n        if (context.throwableItems.length) {",
    to: "if (key('w', 'W')) {\n        if (false) {",
  },
  {
    id: 'hidden-owner',
    source: 'packages/reforge/src/battle/settlement.ts',
    test: 'packages/reforge/src/battle/battle-settlement.residual.test.ts',
    fullName:
      '当前战斗奖励的正式结算屏序列 升级角色先显示属性与自己的隐藏成长，再显示习得；未升级者隐藏成长排在最后',
    from: 'if (h.characterId === lu.characterId) {',
    to: 'if (false) {',
  },
]

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function judge(run, report, needle, red) {
  assert.equal(run.status, red ? 1 : 0)
  assert.equal(run.signal, null)
  const assertions = report.testResults.flatMap((file) => {
    assert.equal(file.message, '')
    assert.equal(resolve(file.name), resolve(root, needle.test))
    return file.assertionResults.filter((assertion) => assertion.status !== 'skipped')
  })
  assert.equal(assertions.length, 1)
  assert.equal(assertions[0].fullName, needle.fullName)
  assert.equal(assertions[0].status, red ? 'failed' : 'passed')
  assert.equal(report.numFailedTests, red ? 1 : 0)
  assert.equal(report.numPassedTests, red ? 0 : 1)
  if (red) {
    assert.ok(assertions[0].failureMessages.length > 0)
    for (const message of assertions[0].failureMessages) {
      assert.match(message.trimStart(), /^AssertionError\b/)
      assert.doesNotMatch(message, /(^|\n)\s*(?:Error|TypeError|RangeError|ReferenceError):/)
      assert.doesNotMatch(message, /timed[\s_-]+out|TimeoutError/i)
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = mkdtempSync(join(tmpdir(), 'codex-plus2-runtime-wave4-'))
  for (const needle of needles) {
    const target = resolve(root, needle.source)
    const before = sha256(target)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const reportPath = join(output, `${id}.json`)
      const hitPath = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        CODEX_PLUS2_RT_NEEDLE: needle.id,
        CODEX_PLUS2_RT_RED: String(red),
        CODEX_PLUS2_RT_REPORT: reportPath,
        CODEX_PLUS2_RT_HIT: hitPath,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/archive/legacy/batches/codex-plus2-runtime-wave4/mutants.config.mjs',
          '-t',
          `^${escapeRegExp(needle.fullName)}$`,
        ],
        { cwd: root, env, encoding: 'utf8', timeout: 60000 },
      )
      writeFileSync(join(output, `${id}.log`), `${run.stdout}\n${run.stderr}`)
      const report = JSON.parse(readFileSync(reportPath, 'utf8'))
      judge(run, report, needle, red)
      if (red)
        assert.deepEqual(JSON.parse(readFileSync(hitPath, 'utf8')), { id: needle.id, target })
      assert.equal(sha256(target), before)
      console.log(`${id}: ${red ? 'detected' : 'green'}`)
    }
  }
  console.log(output)
}
