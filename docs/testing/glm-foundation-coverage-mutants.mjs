// TEST-FOUNDATION-COVERAGE-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 运行：node docs/testing/glm-foundation-coverage-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'fc1-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const TESTS = {
  shared: [
    'src/mkf.boundaries.test.ts',
    'src/rng.boundaries.test.ts',
    'src/yj2.boundaries.test.ts',
  ],
  content: [
    'src/validate-start-world.boundaries.test.ts',
    'src/validate-actors.boundaries.test.ts',
    'src/validate-author-items.boundaries.test.ts',
    'src/validate-skills-poisons.boundaries.test.ts',
    'src/author-script-current.boundaries.test.ts',
    'src/enemy-script.boundaries.test.ts',
  ],
  'pal-extract': [
    'src/resources/parsers/__tests__/enemies.boundaries.test.ts',
    'src/resources/parsers/__tests__/player-roles.boundaries.test.ts',
    'src/resources/parsers/__tests__/spells.boundaries.test.ts',
  ],
  migrate: [
    'src/migration-merge.boundaries.test.ts',
    'src/migration-plan.boundaries.test.ts',
    'src/migration-baseline-pure.boundaries.test.ts',
  ],
}

const cases = [
  { name: 'control-shared', pkg: 'shared', file: null, from: '', to: '', expected: 0 },
  { name: 'control-content', pkg: 'content', file: null, from: '', to: '', expected: 0 },
  { name: 'control-pal-extract', pkg: 'pal-extract', file: null, from: '', to: '', expected: 0 },
  { name: 'control-migrate', pkg: 'migrate', file: null, from: '', to: '', expected: 0 },
  {
    // A负控1：readChunk 越界门失效 → 索引边界测试业务红
    name: 'mkf-out-of-range-gate-removed',
    pkg: 'shared',
    file: 'mkf.ts',
    from: 'if (index < 0 || index >= chunkCount(mkf)) {',
    to: 'if (index < 0) {',
    expected: 1,
  },
  {
    // A负控2：字面输出偏移一字节 → 三字面向量/EOS/帧 payload 精确字节断言红
    // （长度突变会被 uncompLen 钳制掩蔽：越界写被 Uint8Array 静默忽略，输出不变）
    name: 'yj2-literal-off-by-one',
    pkg: 'shared',
    file: 'yj2.ts',
    from: 'out[dst++] = val',
    to: 'out[dst++] = (val + 1) & 0xff',
    expected: 1,
  },
  {
    // B负控1：毒重复 id 门失效 → 重复拒绝测试红
    name: 'poisons-duplicate-id-gate-removed',
    pkg: 'content',
    file: 'validate.ts',
    from: 'if (seen.has(poison.id)) throw',
    to: 'if (false) throw',
    expected: 1,
  },
  {
    // B负控2：作者 stage entry 门失效 → allowSceneEntry 门测试红
    name: 'author-stage-entry-gate-removed',
    pkg: 'content',
    file: 'author-script-core.ts',
    from: 'if (!options.allowSceneEntry || id !== initial)',
    to: 'if (false)',
    expected: 1,
  },
  {
    // C负控1：敌人 attackStrength 改无符号 → signed modifier 断言红
    name: 'enemies-attack-strength-unsigned',
    pkg: 'pal-extract',
    file: 'resources/parsers/enemies.ts',
    from: 'attackStrength: s16(view, base, 42),',
    to: 'attackStrength: u16(view, base, 42),',
    expected: 1,
  },
  {
    // C负控2：角色名反查退化为顺序取 → rgwName 指针/对调测试红
    name: 'player-roles-name-pointer-degraded',
    pkg: 'pal-extract',
    file: 'resources/parsers/player-roles.ts',
    from: 'const personIdx = name[i]! - PERSONS_WORD_OFFSET',
    to: 'const personIdx = i',
    expected: 1,
  },
  {
    // D负控1：同改同值快径失效 → 无冲突断言红
    name: 'merge-same-ours-theirs-removed',
    pkg: 'migrate',
    file: 'migration-merge.ts',
    from: 'if (same(ours, theirs)) return cloneNode(ours)',
    to: 'if (false && same(ours, theirs)) return cloneNode(ours)',
    expected: 1,
  },
  {
    // D负控2：冲突仍产出 writes → 冲突清空断言红
    name: 'plan-conflicts-still-write',
    pkg: 'migrate',
    file: 'migration-plan.ts',
    from: 'if (!conflicts.length) {',
    to: 'if (true) {',
    expected: 1,
  },
]

const files = [
  ...new Set(
    cases.flatMap((item) =>
      item.file ? [join(root, 'packages', item.pkg, 'src', item.file)] : [],
    ),
  ),
]
const sourceHashes = Object.fromEntries(files.map((file) => [file, sha(readFileSync(file))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const mutation = {
    ...item,
    file: item.file ? join(root, 'packages', item.pkg, 'src', item.file) : null,
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
 root:${JSON.stringify(join(root, 'packages', item.pkg))},
 plugins:[{name:'fc1-single-point',enforce:'pre',load(id){
  if(!mutation.file || id.split('?')[0]!==mutation.file)return;
  const before=readFileSync(mutation.file,'utf8');
  assert.equal(before.split(mutation.from).length,2,'unique source point');
  const after=before.replace(mutation.from,mutation.to);
  console.log('MUTATION_HIT',mutation.name);
  return after;
 }}],
 test:{include:${JSON.stringify(TESTS[item.pkg])},maxWorkers:1,fileParallelism:false}
};
`,
  )
  const command = ['--filter', `@type-pal/${item.pkg}`, 'exec', 'vitest', 'run', '--config', config]
  const run = spawnSync('pnpm', command, {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  const output = (run.stdout ?? '') + (run.stderr ?? '')
  const log = join(logs, `${item.name}.log`)
  writeFileSync(log, output)
  assert.equal(run.signal, null, `${item.name}: process interruption; ${log}`)
  assert.equal(run.status, item.expected, `${item.name}: unexpected exit; ${log}`)
  if (item.expected === 1) {
    assert.ok(output.includes(`MUTATION_HIT ${item.name}`), `${item.name}: mutation was not loaded`)
    assert.match(output, /AssertionError/, `${item.name}: expected business regression, not host failure`)
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|No test files found|SyntaxError/,
      `${item.name}: environment error is not evidence`,
    )
  }
  results.push({
    name: item.name,
    pkg: item.pkg,
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
