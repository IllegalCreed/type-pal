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
    id: 'wave-cache-hit',
    source: 'packages/reforge/src/screen-fx.ts',
    test: 'packages/reforge/src/screen-fx.residual.test.ts',
    fullName:
      '当前波动背景缓存的画面消费合同 关闭态直接返回原背景；活动态按波形左右两段卷行并按相位/源身份重新烘焙',
    from: 'if (this.cvs && key === this.key) return this.cvs',
    to: 'if (false) return this.cvs',
  },
  {
    id: 'sell-cursor-clamp',
    source: 'packages/reforge/src/menu/shop-box.ts',
    test: 'packages/reforge/src/menu/shop-box.residual.test.ts',
    fullName:
      '当前商店 UI 的卖出与画面派发 卖出按三列导航、确认后走真实结算，卖光后重算列表并收敛游标',
    from: 's.cursor = Math.max(0, s.list.length - 1)',
    to: 's.cursor = s.cursor',
  },
  {
    id: 'active-side-stick',
    source: 'packages/reforge/src/world-motion-runtime.ts',
    test: 'packages/reforge/src/world-motion-runtime.residual.test.ts',
    fullName:
      '当前世界走位所有权与稀疏诊断边界 侧避锁仅保留合法休眠实体与本批新锁；活跃实体和 party 不借旧锁跨轮',
    from: "if (activeKeys.has(motionActorKey(stick.actor)) || stick.actor.kind === 'party') return false",
    to: "if (stick.actor.kind === 'party') return false",
  },
  {
    id: 'leased-chunk-eviction',
    source: 'packages/reforge/src/script-chunk-store.ts',
    test: 'packages/reforge/src/script-chunk-store.residual.test.ts',
    fullName:
      '当前脚本分片读取的租约与故障边界 合法双场景分片超预算时保护在用租约；释放后淘汰旧片，再访问须真实重读',
    from: 'if (entry.leases > 0 || (victim && entry.usedAt >= victim.usedAt)) continue',
    to: 'if (victim && entry.usedAt >= victim.usedAt) continue',
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
  const output = mkdtempSync(join(tmpdir(), 'codex-plus2-runtime-wave6-'))
  for (const needle of needles) {
    const target = resolve(root, needle.source)
    const before = sha256(target)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const reportPath = join(output, `${id}.json`)
      const hitPath = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        CODEX_PLUS2_RT6_NEEDLE: needle.id,
        CODEX_PLUS2_RT6_RED: String(red),
        CODEX_PLUS2_RT6_REPORT: reportPath,
        CODEX_PLUS2_RT6_HIT: hitPath,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/archive/legacy/batches/codex-plus2-runtime-wave6/mutants.config.mjs',
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
