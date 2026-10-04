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
    id: 'new-map-name',
    source: 'packages/editor/src/ui/MapMode.tsx',
    test: 'packages/editor/src/ui/MapMode.catalog-coverage.test.tsx',
    fullName:
      '当前合法工程的地图目录工作流 新建地图只追加稳定索引和空白地图，保留起始场景引用及原图字节',
    from: "new CreateMapAssetCommand({ ...identity, name: '新地图' }, map)",
    to: "new CreateMapAssetCommand({ ...identity, name: '错误地图' }, map)",
  },
  {
    id: 'dialog-row-order',
    source: 'packages/editor/src/ui/command-form-dialogue.tsx',
    test: 'packages/editor/src/ui/CommandForm.dialogue-workflow-coverage.test.tsx',
    fullName: '当前对话逐行编辑的原子提交 下移第一行只交换两句正文和各自速度，不重新写身份',
    from: 'setCue({ rows: [...rows] })',
    to: 'setCue({ rows: [...cue.rows] })',
  },
  {
    id: 'party-next-identity',
    source: 'packages/editor/src/ui/command-form-actor.tsx',
    test: 'packages/editor/src/ui/CommandForm.actor-workflow-coverage.test.tsx',
    fullName:
      '当前角色状态与编队命令的正式弹窗提交 从一人编队添加到合法三人阵容，队长与实际角色稳定 ID 顺序不变',
    from: 'const cand = battlers.find((a) => !used.has(a.id)) ?? battlers[0]',
    to: 'const cand = battlers[0]',
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
  const output = mkdtempSync(join(tmpdir(), 'codex-plus2-ui-wave3-'))
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
          'docs/testing/archive/legacy/batches/codex-plus2-ui-wave3/mutants.config.mjs',
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
