// TEST-KIMI-EDITOR-WORKFLOWS-1 K03 单点反控（可重建）。
// 临时配置/日志只进 mkdtemp；Vite load 钩子只在内存替换唯一源码点（MUTATION_HIT 见证），
// 产品文件前后 hash 必须一致；恰 exit1 + AssertionError 才是业务红。
// 运行：node docs/testing/archive/legacy/batches/kimi-editor-workflows/k03-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../../..', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'k03-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const UI_TEST = 'src/ui/SpriteActionEditor.kimi-workflows.test.tsx'
const CORE_TEST = 'src/core/world-sprite-behavior.kimi-workflows.test.ts'
const TESTS = [UI_TEST, CORE_TEST]

const cases = [
  { name: 'control', file: null, from: '', to: '', expected: 0, testFile: null },
  {
    // 删除动作的 confirm 取消闸失效 → 取消侧零提交断言红（K03 UI 删除用例）。
    name: 'k03-delete-confirm-bypassed',
    file: 'src/ui/SpriteActionEditor.tsx',
    from: 'if (!window.confirm(`删除预制动作“$' + '{action.label}”（$' + '{actionId}）？`)) return',
    to: 'if (false) return',
    expected: 1,
    testFile: UI_TEST,
  },
  {
    // 相同稳定帧序的实例合并不再计数 → instanceCount=2 摘要断言红（K03 聚合用例）。
    name: 'k03-instance-count-not-merged',
    file: 'src/core/world-sprite-behavior.ts',
    from: '      group.instanceCount++',
    to: '      group.instanceCount',
    expected: 1,
    testFile: CORE_TEST,
  },
  {
    // 采样预算截断披露失效 → 「此示例在安全预算处截断」note 断言红（K03 bounded variants 用例）。
    name: 'k03-bounded-note-dropped',
    file: 'src/core/world-sprite-behavior.ts',
    from: '    if (tick === MAX_VISUAL_SAMPLE_TICKS - 1) bounded = true',
    to: '    if (tick === -1) bounded = true',
    expected: 1,
    testFile: CORE_TEST,
  },
]

const files = [
  ...new Set(
    cases.flatMap((item) => (item.file ? [join(root, 'packages/editor', item.file)] : [])),
  ),
]
const sourceHashes = Object.fromEntries(files.map((file) => [file, sha(readFileSync(file))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const mutation = {
    ...item,
    file: item.file ? join(root, 'packages/editor', item.file) : null,
  }
  if (mutation.file)
    assert.equal(
      readFileSync(mutation.file, 'utf8').split(item.from).length,
      2,
      `${item.name}: exactly one replacement point required`,
    )
  writeFileSync(
    config,
    `
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const mutation=${JSON.stringify(mutation)};
export default {
 root:${JSON.stringify(join(root, 'packages/editor'))},
 esbuild:{jsx:'automatic'},
 plugins:[{name:'k03-single-point',enforce:'pre',load(id){
  if(!mutation.file || id.split('?')[0]!==mutation.file)return;
  const before=readFileSync(mutation.file,'utf8');
  assert.equal(before.split(mutation.from).length,2,'unique source point');
  const after=before.replace(mutation.from,mutation.to);
  console.log('MUTATION_HIT',mutation.name);
  return after;
 }}],
 test:{include:${JSON.stringify(TESTS)},maxWorkers:1,fileParallelism:false}
};
`,
  )
  const command = ['--filter', '@type-pal/editor', 'exec', 'vitest', 'run', '--config', config]
  const run = spawnSync('pnpm', command, {
    cwd: root,
    encoding: 'utf8',
    timeout: 240_000,
    maxBuffer: 32 * 1024 * 1024,
  })
  const output = (run.stdout ?? '') + (run.stderr ?? '')
  const log = join(logs, `${item.name}.log`)
  writeFileSync(log, output)
  assert.equal(run.signal, null, `${item.name}: process interruption; ${log}`)
  assert.equal(run.status, item.expected, `${item.name}: unexpected exit; ${log}`)
  const failedMatch = output.match(/Tests\s+(?:(\d+) failed\s*\|?\s*)?(\d+) passed/)
  const record = {
    name: item.name,
    exit: run.status,
    failed: failedMatch?.[1] ? Number(failedMatch[1]) : 0,
    passed: failedMatch?.[2] ? Number(failedMatch[2]) : null,
    log,
  }
  if (item.expected === 1) {
    assert.ok(output.includes(`MUTATION_HIT ${item.name}`), `${item.name}: mutation was not loaded`)
    assert.match(output, /AssertionError/, `${item.name}: expected business assertion failure`)
    assert.doesNotMatch(output, /TypeError: /, `${item.name}: TypeError is not business evidence`)
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|No test files found|SyntaxError/,
      `${item.name}: environment error is not business evidence`,
    )
    assert.ok(
      output.includes(`FAIL`) && output.includes(item.testFile),
      `${item.name}: failure must land in the intended new test file`,
    )
    assert.equal(record.failed, 1, `${item.name}: exactly one new test must go red`)
  } else {
    assert.ok(!output.includes('MUTATION_HIT'), 'control: no mutation expected')
    assert.equal(record.failed, 0, 'control: zero failures expected')
  }
  results.push(record)
}
for (const [file, before] of Object.entries(sourceHashes))
  assert.equal(sha(readFileSync(file)), before, `product file mutated on disk: ${file}`)
console.log(JSON.stringify({ logs, cases: results }, null, 2))
