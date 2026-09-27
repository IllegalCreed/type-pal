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
    id: 'disabled-icon-red',
    source: 'packages/reforge/src/battle/battle-ui.ts',
    test: 'packages/reforge/src/battle/battle-ui.residual.test.ts',
    fullName:
      '当前 Reforge 战斗菜单绘制命令 四主图标选中保原图，可用灰/不可用暗红；同图缓存而换图重烤',
    from: 'const band = valid[i] ? 0x00 : 0x10',
    to: 'const band = 0x00',
  },
  {
    id: 'fighter-bottom-anchor',
    source: 'packages/reforge/src/battle/present-battle.ts',
    test: 'packages/reforge/src/battle/present-battle.residual.test.ts',
    fullName:
      '当前战斗画面未覆盖的呈现边界 背景先绘制、未知帧回落首帧，空帧不画；实际底锚与 worldScale 保真',
    from: 'const dx = Math.round(draw.x - f.width / 2)',
    to: 'const dx = Math.round(draw.x)',
  },
  {
    id: 'dissolve-wave-count',
    source: 'packages/reforge/src/battle/present-battle.ts',
    test: 'packages/reforge/src/battle/present-battle.residual.test.ts',
    fullName:
      '当前战斗画面未覆盖的呈现边界 可用 pattern 以相位批次消融，波内余量作用于同一离屏画布',
    from: 'const waves = p * 6',
    to: 'const waves = p * 5',
  },
  {
    id: 'scroll-right-width',
    source: 'packages/reforge/src/menu/menu-box.ts',
    test: 'packages/reforge/src/menu/menu-box.residual.test.ts',
    fullName: '当前菜单九宫格与数字绘制边界 单行卷轴按中段数量算自然宽高；宽右角从中段右列向外探出',
    from: 'const rightW = t[5]?.width ?? 0',
    to: 'const rightW = 0',
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
  const output = mkdtempSync(join(tmpdir(), 'codex-plus2-runtime-wave5-'))
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
          'docs/testing/codex-plus2-runtime-wave5/mutants.config.mjs',
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
