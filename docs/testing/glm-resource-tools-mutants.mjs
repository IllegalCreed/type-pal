// TEST-RESOURCE-TOOLS-COVERAGE-1 单点负控（可重建）。临时配置/日志只进 mkdtemp；
// Vite 只替换唯一源点（MUTATION_HIT 见证），产品文件前后 hash 必须一致。
// 9 针跨 shared + pal-extract 两包（严格 RLE 零长指令、编码透明 run 封顶、奇对齐 pad、
// disasm o1 signed、recompile label、slice globalEntries 强制、palette 夜半偏移、BDF 第二字节、
// manifest 根 self 过滤）+ 3 对照；判据同队列标准（钉名 AssertionError + 四向自测）。
// 运行：node docs/testing/glm-resource-tools-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'tb05-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')

const PACKAGES = {
  shared: { filter: '@type-pal/shared', prefix: 'packages/shared/src' },
  pal: { filter: '@type-pal/pal-extract', prefix: 'packages/pal-extract/src' },
}

const TESTS = {
  rle: ['src/rle.boundaries.test.ts'],
  rleenc: ['src/rle-encode.boundaries.test.ts'],
  disasm: ['src/events/disasm.boundaries.test.ts'],
  recomp: ['src/events/recompile.boundaries.test.ts'],
  slice: ['src/events/slice.boundaries.test.ts'],
  palette: ['src/resources/palette.boundaries.test.ts'],
  bdf: ['src/font/__tests__/bdf-to-json.boundaries.test.ts'],
  manifest: ['src/__tests__/asset-manifest.boundaries.test.ts'],
}

const cases = [
  { name: 'control-rle', pkg: 'shared', group: 'rle', file: null, from: '', to: '', expected: 0 },
  { name: 'control-slice', pkg: 'pal', group: 'slice', file: null, from: '', to: '', expected: 0 },
  {
    name: 'control-palette',
    pkg: 'pal',
    group: 'palette',
    file: null,
    from: '',
    to: '',
    expected: 0,
  },
  {
    name: 'rle-zero-command-accepted',
    pkg: 'shared',
    group: 'rle',
    file: 'rle.ts',
    from: 'if (command === 0) throw new Error(`sprite chunk frame ${index} 含零长度指令`)',
    to: "if (false) throw new Error('unreachable')",
    red: '零长度指令不再被拒（0 字节 literal 死循环风险）',
    redTest: '零长度指令拒绝；同容器把 0 换成合法 1 长度即过（相邻正控）',
    expected: 1,
  },
  {
    name: 'rle-encode-transparent-cap-raised',
    pkg: 'shared',
    group: 'rleenc',
    file: 'rle-encode.ts',
    from: 'while (i < total && opaque[i] === 0 && run < 0x7f) {',
    to: 'while (i < total && opaque[i] === 0 && run < 0xff) {',
    red: '透明 run 越过 0x7f 封顶（指令字节溢出截断）',
    redTest: '透明 run 126/127/128 分段边界：127 封顶，128 拆 127+1',
    expected: 1,
  },
  {
    name: 'rle-encode-write-pad-removed',
    pkg: 'shared',
    group: 'rleenc',
    file: 'rle-encode.ts',
    from: '    out.set(bytes, cursor)\n    cursor += bytes.length\n    if (cursor & 1) cursor++ // pad 已是 0',
    to: '    out.set(bytes, cursor)\n    cursor += bytes.length',
    red: '写入循环不再跳过奇对齐 pad（帧数据错位）',
    redTest: 'WORD offset 表 + 奇长帧 pad0 + frame0 偏移=表长，整 chunk 逐字节手列',
    expected: 1,
  },
  {
    name: 'disasm-o1-read-signed',
    pkg: 'pal',
    group: 'disasm',
    file: 'events/disasm.ts',
    from: 'const o1 = view.getUint16(i * 8 + 4, true)',
    to: 'const o1 = view.getInt16(i * 8 + 4, true)',
    red: '第二 operand 被读成 signed（0x8000 → -32768）',
    redTest:
      'giveItem count 0x8000/0xffff 保持 32768/65535（u16 不转 signed）；raw 三 operand 全位型',
    expected: 1,
  },
  {
    name: 'recompile-goto-label-dropped',
    pkg: 'pal',
    group: 'recomp',
    file: 'events/recompile.ts',
    from: 'view.setUint16(off + 2, labels.get(c.to) ?? 0, true)',
    to: 'view.setUint16(off + 2, 0, true)',
    red: 'goto 目标不再查 label 表（恒写 0）',
    redTest: '八类命令各 8B 手列：opcode 与 operand 位型精确',
    expected: 1,
  },
  {
    name: 'slice-global-force-removed',
    pkg: 'pal',
    group: 'slice',
    file: 'events/slice.ts',
    from: 'if (globalReachable.has(i)) n = Math.max(n, 2)',
    to: 'if (false) n = Math.max(n, 2)',
    red: 'globalEntries 不再强制 shared（物品法术脚本被丢弃/错归属）',
    redTest: 'globalEntries 独达（任何 scene 都不可达）→ 强制 shared',
    expected: 1,
  },
  {
    name: 'palette-night-offset-zeroed',
    pkg: 'pal',
    group: 'palette',
    file: 'resources/palette.ts',
    from: 'const nightColors = buf.byteLength > 768 ? decodeColorBlock(buf, 768) : undefined',
    to: 'const nightColors = buf.byteLength > 768 ? decodeColorBlock(buf, 0) : undefined',
    red: '夜半调色板错读白天块（day/night 不再非对称）',
    redTest: '1536 输入：colors 与 nightColors 都满 256×3 且非对称；锚点手算值精确',
    expected: 1,
  },
  {
    name: 'bdf-second-byte-dropped',
    pkg: 'pal',
    group: 'bdf',
    file: 'font/bdf-to-json.ts',
    from: 'const hex = row.substr(b * 2, 2)',
    to: 'const hex = row.substr(b * 2, 1)',
    red: '16 宽字形第二字节丢失',
    redTest: '两字形完整 bitmap/宽高/码点手列精确；BBX 宽高生效',
    expected: 1,
  },
  {
    name: 'manifest-root-self-kept',
    pkg: 'pal',
    group: 'manifest',
    file: 'resources/asset-manifest.ts',
    from: 'if (path === SELF) return false',
    to: 'if (false) return false',
    red: '根 asset-manifest.json 自指未剔除',
    redTest:
      '多层/零字节/中文/二进制精确清单；子目录同名 asset-manifest.json 保留；entries 不变；独立序列 hash',
    expected: 1,
  },
]

// ── 判据自测（正反控 + 逐目标四向）────────────────────────────────────
const ts = createRequire(join(root, 'package.json'))('typescript')
const ownPath = fileURLToPath(import.meta.url)
const ownAst = ts.createSourceFile(
  ownPath,
  readFileSync(ownPath, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
)
const criterionBlocks = []
function visitOwn(node) {
  if (ts.isIfStatement(node) && node.expression.getText(ownAst) === 'item.expected === 1')
    criterionBlocks.push(node.thenStatement.getText(ownAst))
  ts.forEachChild(node, visitOwn)
}
visitOwn(ownAst)
assert.equal(criterionBlocks.length, 1, 'exactly one verdict block')
new Function('assert', 'item', 'output', criterionBlocks[0])(
  assert,
  { name: 'selftest-good' },
  'MUTATION_HIT selftest-good\nAssertionError: expected 1 to equal 2',
)
let poisoned = false
try {
  new Function('assert', 'item', 'output', criterionBlocks[0])(
    assert,
    { name: 'selftest-poisoned' },
    'MUTATION_HIT x\nAssertionError: y\nTypeError: host\nTest timed out\nUnhandled Errors\nSTACK_TRACE_ERROR',
  )
} catch {
  poisoned = true
}
assert.ok(poisoned, 'poisoned log must be rejected')

function pinnedVerdict(failureMessages) {
  if ((failureMessages ?? []).length === 0) return false
  return failureMessages.every((m) => /AssertionError|^expect\(/.test(m))
}
assert.equal(
  pinnedVerdict(['Error: STACK_TRACE_ERROR\n    at task']),
  false,
  'target timeout rejected',
)
assert.equal(pinnedVerdict([]), false, 'not-run rejected')
assert.equal(pinnedVerdict(['AssertionError: expected 1 to be 2']), true, 'pure red passes')
assert.equal(pinnedVerdict(['expect(received).toBe(expected)']), true, 'expect-form passes')
process.stderr.write(`criterion self-test ok (blocks=${criterionBlocks.length})\n`)

const files = [
  ...new Set(cases.flatMap((c) => (c.file ? [join(root, PACKAGES[c.pkg].prefix, c.file)] : []))),
]
const hashes = Object.fromEntries(files.map((f) => [f, sha(readFileSync(f))]))
const results = []
for (const item of cases) {
  const config = join(logs, `${item.name}.config.mjs`)
  const pkgDir = join(root, 'packages', item.pkg === 'shared' ? 'shared' : 'pal-extract')
  const mutation = {
    ...item,
    file: item.file ? join(root, PACKAGES[item.pkg].prefix, item.file) : null,
  }
  if (mutation.file)
    assert.equal(
      readFileSync(mutation.file, 'utf8').split(item.from).length,
      2,
      `${item.name}: one point`,
    )
  writeFileSync(
    config,
    `
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const mutation=${JSON.stringify(mutation)};
export default {
 root:${JSON.stringify(pkgDir)},
 plugins:[{name:'tb05-single-point',enforce:'pre',load(id){
  if(!mutation.file || id.split('?')[0]!==mutation.file)return;
  const before=readFileSync(mutation.file,'utf8');
  assert.equal(before.split(mutation.from).length,2,'unique source point');
  const after=before.replace(mutation.from,mutation.to);
  console.log('MUTATION_HIT',mutation.name);
  return after;
 }}],
 test:{include:${JSON.stringify(TESTS[item.group])},maxWorkers:1,fileParallelism:false}
};
`,
  )
  const jsonReport = join(logs, `${item.name}.json`)
  const command = [
    '--filter',
    PACKAGES[item.pkg].filter,
    'exec',
    'vitest',
    'run',
    '--config',
    config,
    '--reporter=json',
    '--outputFile',
    jsonReport,
  ]
  const run = spawnSync('pnpm', command, {
    cwd: root,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  const raw = (run.stdout ?? '') + (run.stderr ?? '')
  const report = JSON.parse(readFileSync(jsonReport, 'utf8'))
  const assertions = report.testResults.flatMap((r) => r.assertionResults)
  const failureText = assertions.flatMap((r) => r.failureMessages ?? []).join('\n')
  const output = `${raw}\n${failureText}`
  const log = join(logs, `${item.name}.log`)
  writeFileSync(log, output)
  assert.equal(run.signal, null, `${item.name}: interrupted; ${log}`)
  assert.ok(report.numTotalTests > 0, `${item.name}: zero tests; ${log}`)
  assert.equal(run.status, item.expected, `${item.name}: exit; ${log}`)
  if (item.expected === 1) {
    assert.ok(output.includes(`MUTATION_HIT ${item.name}`), `${item.name}: not loaded`)
    assert.match(output, /AssertionError/, `${item.name}: business red expected`)
    assert.doesNotMatch(
      output,
      /Cannot find module|Failed to load url|No test files found|SyntaxError|TypeError|ReferenceError|Test timed out|Unhandled Errors|STACK_TRACE_ERROR/,
      `${item.name}: host failure`,
    )
  }
  if (item.redTest !== undefined) {
    const pinned = assertions.find(
      (r) => r.title === item.redTest || r.title.endsWith(item.redTest),
    )
    assert.ok(pinned, `${item.name}: pinned not executed: ${item.redTest}; ${log}`)
    assert.equal(pinned.status, 'failed', `${item.name}: pinned did not fail; ${log}`)
    assert.ok((pinned.failureMessages ?? []).length > 0, `${item.name}: no failureMessages; ${log}`)
    for (const message of pinned.failureMessages ?? [])
      assert.match(
        message,
        /AssertionError|^expect\(/,
        `${item.name}: pinned not business AssertionError; ${log}`,
      )
  } else {
    assert.ok(
      assertions.every((r) => r.status === 'passed'),
      `${item.name}: control non-passing; ${log}`,
    )
  }
  results.push({
    name: item.name,
    exit: run.status,
    red: item.red ?? null,
    redTest: item.redTest ?? null,
    executedTests: report.numTotalTests,
    log,
    logSha256: sha(output),
  })
  process.stderr.write(
    `${item.name}: expected ${item.expected}, actual ${run.status}, tests ${report.numTotalTests}\n`,
  )
}
for (const [f, h] of Object.entries(hashes))
  assert.equal(sha(readFileSync(f)), h, `product changed: ${f}`)
console.log(
  JSON.stringify(
    {
      logs,
      criterionSelfTest: {
        goodAccepted: true,
        poisonedRejected: poisoned,
        pinnedVerdictFourWay: true,
      },
      sourceHashes: hashes,
      results,
    },
    null,
    2,
  ),
)
