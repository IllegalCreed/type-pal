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
    id: 'wave-label',
    source: 'packages/editor/src/ui/ScriptTree.tsx',
    test: 'packages/editor/src/ui/ScriptTree.coverage-batch-2.test.ts',
    fullName: '当前脚本树的未覆盖业务摘要 世界与画面命令保留目标、符号、定位和无参数语义',
    from: `label: \`屏波 幅 \${cmd.level} · 推进 \${cmd.progression}\``,
    to: `label: \`屏波 幅 \${cmd.level}\``,
  },
  {
    id: 'nested-insert',
    source: 'packages/editor/src/ui/ScriptTree.tsx',
    test: 'packages/editor/src/ui/ScriptTree.workflow-coverage.test.tsx',
    fullName: '脚本树当前公开交互剩余合同 分支两臂的行点击、臂内插入与删除都传递精确路径而不改输入',
    from: "ctx.onRowAction?.(path, 'insert')",
    to: "ctx.onRowAction?.(path, 'remove')",
  },
  {
    id: 'camera-height',
    source: 'packages/editor/src/ui/ScriptEditor.tsx',
    test: 'packages/editor/src/ui/ScriptEditor.coverage-workflows-2.test.tsx',
    fullName: '当前脚本属性弹窗的未覆盖作者工作流 镜头从跟随切为定位后提交精确二维落点',
    from: "to: mode === 'position' ? { col: 0, row: 0, height: 0 } : undefined,",
    to: "to: mode === 'position' ? { col: 0, row: 0, height: 9 } : undefined,",
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
  const output = mkdtempSync(join(tmpdir(), 'codex-plus2-ui-wave2-'))
  const summary = []
  for (const needle of needles) {
    const target = resolve(root, needle.source)
    const before = sha256(target)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const reportPath = join(output, `${id}.json`)
      const hitPath = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        CODEX_PLUS2_UI_NEEDLE: needle.id,
        CODEX_PLUS2_UI_RED: String(red),
        CODEX_PLUS2_UI_REPORT: reportPath,
        CODEX_PLUS2_UI_HIT: hitPath,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-plus2-ui-wave2/mutants.config.mjs',
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
      summary.push({
        id,
        exit: run.status,
        passed: report.numPassedTests,
        failed: report.numFailedTests,
      })
      console.log(`${id}: ${red ? 'detected' : 'green'}`)
    }
  }
  writeFileSync(join(output, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(output)
}
