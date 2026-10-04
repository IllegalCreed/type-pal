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
    id: 'battle-background-dimension-gate',
    source: 'packages/reforge/src/assets.ts',
    test: 'packages/reforge/src/assets.battle-bg.residual.test.ts',
    fullName:
      '当前战场背景索引图的 catalog→位图→调色板链 真实 PNG 尺寸偏差先关闭位图，绝不创建目标 canvas 或发布着色结果',
    from: 'if (bitmap.width !== 320 || bitmap.height !== 200) {',
    to: 'if (false) {',
  },
  {
    id: 'poison-incurable-display',
    source: 'packages/reforge/src/menu/menu-box.ts',
    test: 'packages/reforge/src/menu/menu-box.status-residual.test.ts',
    fullName:
      '当前状态板与级联菜单画面所有权 状态板按 live 等级阈值、可解毒名与装备效果画数值，不显示不可解毒',
    from: "if (!def || def.curability === 'incurable') continue",
    to: 'if (!def) continue',
  },
  {
    id: 'party-gesture-lost',
    source: 'packages/reforge/src/world-scene-presentation.ts',
    test: 'packages/reforge/src/world-scene-presentation.residual.test.ts',
    fullName:
      '当前大世界呈现的实体与队伍帧选择 队长脚本姿势压过走帧；清姿势后恢复 3 帧步序，当前帧尺寸决定脚底锚',
    from: 'this.gesture != null',
    to: 'false',
  },
  {
    id: 'attack-all-damage-lost',
    source: 'packages/reforge/src/battle/battle-anim.ts',
    test: 'packages/reforge/src/battle/battle-anim.attack-all.residual.test.ts',
    fullName:
      '当前长鞭物攻全体的一挥多目标时间线 两敌不同伤害同帧结算，一次冲刺后按 −8/−4/−6 击退并完整复位',
    from: 'damageNums: hits.map((h) => ({',
    to: 'damageNums: hits.slice(0, 1).map((h) => ({',
  },
  {
    id: 'coop-slot-counter-lost',
    source: 'packages/reforge/src/battle/battle-anim.ts',
    test: 'packages/reforge/src/battle/battle-anim.coop.residual.test.ts',
    fullName:
      '当前合击呈现的队员槽位与结果时序 三人编队中第二位未贡献仍占聚拢槽，第三位真实贡献并于受击后归位',
    from: 't++ // fight.c:3905:非发起者都占 t 槽(贡献判定之前自增)',
    to: 'if (isContrib(j)) t++ // wrong: skipped slot does not count',
  },
  {
    id: 'owns-item-query-crossed',
    source: 'packages/reforge/src/script-runner.ts',
    test: 'packages/reforge/src/script-runner.conditions.residual.test.ts',
    fullName:
      '当前编辑器预览 ScriptRunner 的组合条件读取 装备、背包、拥有数、金钱、满血与队伍条件各调用自己的 live 查询而不串源',
    from: 'return query.ownsItem(cond.itemId, cond.atLeast ?? 1)',
    to: 'return query.hasItem(cond.itemId, cond.atLeast ?? 1)',
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
  const output = mkdtempSync(join(tmpdir(), 'codex-plus2-runtime-wave8-'))
  for (const needle of needles) {
    const target = resolve(root, needle.source)
    const before = sha256(target)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const reportPath = join(output, `${id}.json`)
      const hitPath = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        CODEX_PLUS2_RT8_NEEDLE: needle.id,
        CODEX_PLUS2_RT8_RED: String(red),
        CODEX_PLUS2_RT8_REPORT: reportPath,
        CODEX_PLUS2_RT8_HIT: hitPath,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/archive/legacy/batches/codex-plus2-runtime-wave8/mutants.config.mjs',
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
