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
    id: 'world-entity-layer-lost',
    source: 'packages/reforge/src/script-runner.ts',
    test: 'packages/reforge/src/script-runner.dispatch-residual.test.ts',
    fullName:
      '当前编辑器预览 ScriptRunner 命令分发剩余合同 批量状态仅通知宿主一次；绝对定位、图层和屏波只改各自世界键',
    from: 'this.world.entityLayer[cmd.entity] = cmd.layer',
    to: 'this.world.entityLayer[cmd.entity] = 0',
  },
  {
    id: 'summon-secondary-sound',
    source: 'packages/reforge/src/battle/battle-anim.ts',
    test: 'packages/reforge/src/battle/battle-anim.summon.residual.test.ts',
    fullName:
      '当前召唤型施法与 OffMagic 特效落点 召唤全队亮起→神将入场/定格→二次法术→敌受击→退场，二级音不重播',
    from: 'suppressSound: true,',
    to: 'suppressSound: false,',
  },
  {
    id: 'enemy-cast-burn-lost',
    source: 'packages/reforge/src/battle/battle-anim.ts',
    test: 'packages/reforge/src/battle/battle-anim.enemy-cast.residual.test.ts',
    fullName:
      '当前敌法术时间线的复合屏幕效果 敌无专属施法帧回落 idle，前震/后震/波幅/烙背景各留精确帧',
    from: '...(i === l - 1 && input.keepEffect ? { burnBg: ov } : {}),',
    to: '...(false ? { burnBg: ov } : {}),',
  },
]

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function judge(run, report, needle, red) {
  assert.equal(run.status, red ? 1 : 0)
  assert.equal(run.signal, null)
  const assertions = report.testResults.flatMap((file) => {
    assert.equal(file.message, '')
    assert.equal(resolve(file.name), resolve(root, needle.test))
    return file.assertionResults.filter((entry) => entry.status !== 'skipped')
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
  const output = mkdtempSync(join(tmpdir(), 'codex-plus2-runtime-wave9-'))
  for (const needle of needles) {
    const target = resolve(root, needle.source)
    const before = sha256(target)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const reportPath = join(output, `${id}.json`)
      const hitPath = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        CODEX_PLUS2_RT9_NEEDLE: needle.id,
        CODEX_PLUS2_RT9_RED: String(red),
        CODEX_PLUS2_RT9_REPORT: reportPath,
        CODEX_PLUS2_RT9_HIT: hitPath,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/archive/legacy/batches/codex-plus2-runtime-wave9/mutants.config.mjs',
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
