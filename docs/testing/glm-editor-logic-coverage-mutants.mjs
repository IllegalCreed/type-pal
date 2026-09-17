// TEST-EDITOR-LOGIC-COVERAGE-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源码点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 运行：node docs/testing/glm-editor-logic-coverage-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'ed1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const TESTS = [
  'src/core/commands-world.boundaries.test.ts',
  'src/core/commands-catalog.boundaries.test.ts',
  'src/core/commands-map.boundaries.test.ts',
  'src/core/commands-assets.boundaries.test.ts',
  'src/core/actor-dialogue-commands.boundaries.test.ts',
  'src/core/stamp-commands.boundaries.test.ts',
  'src/core/project-reference.boundaries.test.ts',
  'src/core/project-reference-adapters.boundaries.test.ts',
]

const cases = [
  { name: 'control', file: null, from: '', to: '', expected: 0 },
  {
    // A负控1：世界变量删除引用守卫失效 → WorldVariableInUseError 断言红
    name: 'world-delete-guard-removed',
    file: 'src/core/commands.ts',
    from: 'if (references.length) throw new WorldVariableInUseError(this.id, references.length)',
    to: 'if (false) throw new WorldVariableInUseError(this.id, references.length)',
    expected: 1,
  },
  {
    // A负控2：actor 删除引用守卫失效 → ActorInUseError 断言红
    name: 'actor-delete-guard-removed',
    file: 'src/core/commands.ts',
    from: 'if (blockers.length) throw new ActorInUseError(this.actorId, blockers)',
    to: 'if (false) throw new ActorInUseError(this.actorId, blockers)',
    expected: 1,
  },
  {
    // A负控3（地图）：PaintTiles invert 不恢复 → invert 后 tiles 精确恢复断言红
    name: 'paint-invert-skipped',
    file: 'src/core/commands.ts',
    from: '    const next = paintProjectMapTiles(map, this.prev)\n    inheritStampPlacementIndex(map, next)',
    to: '    return state\n    const next = paintProjectMapTiles(map, this.prev)\n    inheritStampPlacementIndex(map, next)',
    expected: 1,
  },
  {
    // A负控4（资源）：UpdateAssetLabel 缺目标 no-op 失效 → 缺目标断言红
    name: 'asset-label-missing-target-throws',
    file: 'src/core/commands.ts',
    from: '    const current = state.assetCatalog.assets[this.assetId]\n    if (!current) return state\n    if (!this.captured) {',
    to: '    const current = state.assetCatalog.assets[this.assetId]\n    if (!current) throw new Error("asset missing")\n    if (!this.captured) {',
    expected: 1,
  },
  {
    // B负控1：表情删除引用守卫失效 → 阻断断言红
    name: 'expression-delete-guard-removed',
    file: 'src/core/actor-dialogue-commands.ts',
    from: '    const blockers = expressionBlockers(state, this.actorId, this.expression)\n    if (blockers.length)',
    to: '    const blockers = expressionBlockers(state, this.actorId, this.expression)\n    if (false)',
    expected: 1,
  },
  {
    // B负控2：重命名改写计数闭合失效 → 不闭合/漏改写断言红
    name: 'rename-rewrite-closure-removed',
    file: 'src/core/actor-dialogue-commands.ts',
    from: '    const expected = expressionBlockers(state, this.actorId, this.from).length\n    if (rewritten !== expected)',
    to: '    const expected = expressionBlockers(state, this.actorId, this.from).length\n    if (rewritten !== expected + 99)',
    expected: 1,
  },
  {
    // C负控1：图章删除 proof 校验失效 → 无 proof 拒绝断言红
    name: 'stamp-delete-proof-removed',
    file: 'src/core/stamp-commands.ts',
    from: '    assertStampDeletionAllowed(state, this.templateId, this.proof, this.currentBatch)',
    to: '    void state; void this.currentBatch',
    expected: 1,
  },
  {
    // C负控2：authored 不得倒回 migrated 守卫失效 → 断言红
    name: 'stamp-downgrade-allowed',
    file: 'src/core/stamp-commands.ts',
    from: "    if (current.origin === 'authored' && this.template.origin !== 'authored')",
    to: '    if (false)',
    expected: 1,
  },
  {
    // D负控1：deletionImpact warn 分类失效 → blockers/warnings 分栏断言红
    name: 'deletion-warn-misclassified',
    file: 'src/core/project-reference.ts',
    from: "      blockers: references.filter((edge) => edge.deletePolicy !== 'warn'),\n      warnings: references.filter((edge) => edge.deletePolicy === 'warn'),",
    to: '      blockers: references,\n      warnings: [],',
    expected: 1,
  },
  {
    // D负控2：deletionScopeFor 随删来源失效 → 外部引用保留断言红
    name: 'deletion-scope-removed',
    file: 'src/core/project-reference.ts',
    from: '    return {\n      removedSourceKeys: new Set(\n        this.sources\n          .filter((source) => source.deletedWith.some((key) => targetKeys.has(key)))\n          .map((source) => source.key),\n      ),\n    }',
    to: '    return { removedSourceKeys: new Set() }',
    expected: 1,
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
 plugins:[{name:'ed1-single-point',enforce:'pre',load(id){
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
  if (item.expected === 1) {
    assert.ok(output.includes(`MUTATION_HIT ${item.name}`), `${item.name}: mutation was not loaded`)
    assert.match(output, /AssertionError|Error: /, `${item.name}: expected business regression`)
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|No test files found|SyntaxError/,
      `${item.name}: environment error is not evidence`,
    )
  }
  results.push({
    name: item.name,
    command: ['pnpm', ...command],
    exit: run.status,
    log,
    logSha256: sha(output),
    from: item.from,
    to: item.to,
    file: mutation.file,
  })
  process.stderr.write(`${item.name}: expected ${item.expected}, actual ${run.status}\n`)
}
for (const [file, hash] of Object.entries(sourceHashes))
  assert.equal(sha(readFileSync(file)), hash, `product changed during verification: ${file}`)
console.log(JSON.stringify({ logs, sourceHashes, results }, null, 2))
