import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const needles = [
  {
    id: 'party-mp-clamp',
    source: 'packages/reforge/src/main.ts',
    test: 'packages/reforge/src/main.effect-flows.residual.test.ts',
    fullName:
      '当前 Reforge 主壳的作者脚本效果链 全队资源同加按上限钳制，半钱只取当前钱数，不改变原入口 seed',
    from: 'c.mp = Math.max(0, Math.min(c.maxMP, c.mp + amount))',
    to: 'c.mp = c.mp + amount',
  },
  {
    id: 'appearance-write-drop',
    source: 'packages/reforge/src/main.ts',
    test: 'packages/reforge/src/main.effect-flows.residual.test.ts',
    fullName:
      '当前 Reforge 主壳的作者脚本效果链 当前角色形象在合法精灵/战斗资源准备后写入持久实例，定义和素材输入不变',
    from: 'c.appearance = { ...c.appearance, ...patch }',
    to: 'c.appearance = { ...c.appearance }',
  },
  {
    id: 'preview-spawn-skip-drop',
    source: 'packages/reforge/src/main.ts',
    test: 'packages/reforge/src/main.effect-flows.residual.test.ts',
    fullName:
      '当前 Reforge 主壳的作者脚本效果链 显式场景与落点只覆盖启动位置，不偷换所选入口世界或重放 onEnter 奖励',
    from: 'else if (spawnPos) {',
    to: 'else if (false) {',
  },
  {
    id: 'background-nibble-underflow',
    source: 'packages/reforge/src/assets.ts',
    test: 'packages/reforge/src/assets.presentation.residual.test.ts',
    fullName:
      '当前战斗画面索引着色与特效资源边界 原索引按调色板逐字节上色；正负 nibble 位移分别饱和上界与归零下界',
    from: 'if (b & 0x80) b = 0',
    to: 'if (false) b = 0',
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
  const output = mkdtempSync(join(tmpdir(), 'codex-plus2-runtime-wave7-'))
  for (const needle of needles) {
    const target = resolve(root, needle.source)
    const before = sha256(target)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const reportPath = join(output, `${id}.json`)
      const hitPath = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        CODEX_PLUS2_RT7_NEEDLE: needle.id,
        CODEX_PLUS2_RT7_RED: String(red),
        CODEX_PLUS2_RT7_REPORT: reportPath,
        CODEX_PLUS2_RT7_HIT: hitPath,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-plus2-runtime-wave7/mutants.config.mjs',
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
