/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · 六针三态反控驱动。
 *
 * 架构同 docs/testing/phase1-main-owners-mutants.mjs：变异不经磁盘改产品——每个变异由
 * 生成的 vitest config 内联插件在模块 load 钩子内替换源码（磁盘产品文件零写入，
 * marker 文件证明注入真实执行），testNamePattern 锁唯一指定 fullName，businessRed
 * 要求 exit 1 + 恰好一条 executed + 纯业务 AssertionError（无 timeout/unhandled/
 * 额外错误类型）；control（无注入）与 per-mutation green（恢复后）各自证明绿色面。
 *
 * 每针记录（卡面要求）：完整 command/cwd/env、stdout/stderr 原始落盘（tracked .txt）、
 * exit/signal/spawnError、执行身份（file × fullName）、唯一 AssertionError、
 * original/mutant/restored 三态 sha256（mutant = 实际执行的替换后源码 hash；
 * restored = 运行后磁盘复读，恒等于 original 且逐针校验）。
 *
 * 临时目录 mkdtemp + finally 只清本次；tracked 证据写入
 * docs/ops/evidence/coverage85-kimi-extract-migrate-r1/（非 ignored 路径）。
 * 用法：`node docs/ops/evidence/coverage85-kimi-extract-migrate-r1-mutants.mjs`
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { preciseCoverageEnvironment } from '../../../scripts/coverage/environment.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const trackedDir = resolve(root, 'docs/ops/evidence/coverage85-kimi-extract-migrate-r1')
const output = mkdtempSync(resolve(tmpdir(), 'kimi-r1-mutants-'))

const PAL_EXTRACT = resolve(root, 'packages/pal-extract')
const MIGRATE = resolve(root, 'packages/migrate')

const mutations = [
  {
    id: 'm1-slice-global-shared',
    pkg: 'pal-extract',
    source: 'src/events/slice.ts',
    test: 'src/events/slice.kimi-r1.test.ts',
    title: 'KIMI-R1 sliceByScene globalEntries BFS 残余分支 end advance：global BFS 收 i+1 续行',
    from: '    if (globalReachable.has(i)) n = Math.max(n, 2)',
    to: '    if (globalReachable.has(i)) n = Math.max(n, 1)',
    expectRed: 'end advance 续行命令仍被 globalEntries 强制归 shared（n = Math.max(n, 2)）',
  },
  {
    id: 'm2-recompile-end-opcode',
    pkg: 'pal-extract',
    source: 'src/events/recompile.ts',
    test: 'src/events/roundtrip.kimi-r1.test.ts',
    title:
      'KIMI-R1 roundtripCheck 合成输入 合法事件 round-trip：ok=true 且尺寸相等（合成 bytes/hash 锚）',
    from: '      const op = c.advance ? 0x0001 : c.reset ? 0x0002 : 0x0000',
    to: '      const op = c.advance ? 0x0000 : c.reset ? 0x0002 : 0x0000',
    expectRed: 'end advance 回写 opcode 0x0001（round-trip 字节相等）',
  },
  {
    id: 'm3-roundtrip-diff-detect',
    pkg: 'pal-extract',
    source: 'src/events/roundtrip.ts',
    test: 'src/events/roundtrip.kimi-r1.test.ts',
    title:
      'KIMI-R1 roundtripCheck 合成输入 内容不一致：ok=false 报告首个差异 offset/instruction/opcode',
    from: '    if (back[i] !== sss.bytecode[i]) {',
    to: '    if (back[i] === sss.bytecode[i]) {',
    expectRed: '首差异在 offset 4（首条不等字节才返回 ok:false）',
  },
  {
    id: 'm4-transaction-version-guard',
    pkg: 'migrate',
    source: 'src/migration-transaction.ts',
    test: 'src/migration-transaction.kimi-r1.test.ts',
    title:
      'KIMI-R1 迁移事务 journal 校验残余分支 version≠2 与 id 非 16-hex 均拒绝（不恢复、不清理）',
    from: "  if (candidate.version !== 2 || !TRANSACTION_ID_RE.test(candidate.id ?? ''))",
    to: "  if (!TRANSACTION_ID_RE.test(candidate.id ?? ''))",
    expectRed: 'journal version 必须为 2（version:1 在 id 合法时仍拒绝）',
  },
  {
    id: 'm5-merge-conflict-type',
    pkg: 'migrate',
    source: 'src/migration-merge.ts',
    test: 'src/migration-merge.kimi-r1.test.ts',
    title:
      'KIMI-R1 mergeIdentityArray orderedIds 链式锚定 ours 全改 + theirs 删中段：后段插入锚定前段插入（?? candidate 回退方向）',
    from: "      conflict(ctx.file, path, base.present ? 'delete-modify' : 'add-add', base, ours, theirs),",
    to: "      conflict(ctx.file, path, base.present ? 'add-add' : 'delete-modify', base, ours, theirs),",
    expectRed: 'base 在场且对侧修改时为 delete-modify（非 add-add）',
  },
  {
    id: 'm6-palassets-gzip-magic',
    pkg: 'migrate',
    source: 'src/pal-assets.ts',
    test: 'src/pal-assets-loaders.kimi-r1.test.ts',
    title:
      'KIMI-R1 loadPalWorldSprites 残余守卫 sprite 1 非 gzip 精确拒绝（首字节合法、次字节非法的单轴输入）',
    from: `    if (compressed[0] !== 0x1f || compressed[1] !== 0x8b)
      throw new Error(\`PAL 大世界精灵 \${sprite} 必须是 gzip RLE\`)`,
    to: `    if (compressed[0] !== 0x1f && compressed[1] !== 0x8b)
      throw new Error(\`PAL 大世界精灵 \${sprite} 必须是 gzip RLE\`)`,
    expectRed: 'gzip 魔数任一字节不符即拒绝（单轴 [0x1f,0x00] 亦拒绝）',
  },
]

const packages = {
  'pal-extract': {
    root: PAL_EXTRACT,
    include: ['src/events/slice.kimi-r1.test.ts', 'src/events/roundtrip.kimi-r1.test.ts'],
  },
  migrate: {
    root: MIGRATE,
    include: [
      'src/migration-transaction.kimi-r1.test.ts',
      'src/migration-merge.kimi-r1.test.ts',
      'src/pal-assets-loaders.kimi-r1.test.ts',
    ],
  },
}

const productFiles = mutations.map((mutation) => `packages/${mutation.pkg}/${mutation.source}`)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const fileHash = (file) => sha256(readFileSync(resolve(root, file)))
const clean = (value) => stripVTControlCharacters(value)

function businessRed(exit, entries, file, title) {
  const executed = entries.filter((entry) => ['passed', 'failed'].includes(entry.status))
  if (exit !== 1 || executed.length !== 1) return false
  const [entry] = executed
  return (
    entry.file === file &&
    entry.fullName === title &&
    entry.status === 'failed' &&
    entry.failureMessages.length > 0 &&
    entry.failureMessages.every(
      (message) =>
        /^AssertionError(?:\b|:)/.test(clean(message).trimStart()) &&
        !/(?:\btimeout\b|\btimed out\b|unhandled|(?:^|\n)\s*(?:Error|TypeError|RangeError):)/i.test(
          clean(message),
        ),
    )
  )
}

const sample = {
  file: '/candidate.test.ts',
  fullName: 'exact',
  status: 'failed',
  failureMessages: ['AssertionError: business difference'],
}
assert(businessRed(1, [sample], sample.file, sample.fullName))
for (const [exit, entries] of [
  [0, [sample]],
  [2, [sample]],
  [null, [sample]],
  [1, []],
  [1, [sample, sample]],
  [1, [{ ...sample, file: '/other.test.ts' }]],
  [1, [{ ...sample, fullName: 'other' }]],
  [1, [{ ...sample, status: 'pending' }]],
  [1, [{ ...sample, failureMessages: ['Error: embedded AssertionError'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: timed out'] }]],
])
  assert(!businessRed(exit, entries, sample.file, sample.fullName))

const escapePattern = (title) => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function writeConfig({ pkg, mutation, report, marker, pattern }) {
  const config = resolve(output, `${mutation ? mutation.id : `control-${pkg}`}.config.mjs`)
  const target = mutation ? resolve(packages[pkg].root, mutation.source) : ''
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const item=${JSON.stringify(mutation)},target=${JSON.stringify(target)};
export default {root:${JSON.stringify(packages[pkg].root)},plugins:item?[{name:'kimi-r1-single-point-mutation',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));return source.replace(item.from,item.to)}}]:[],test:{include:${JSON.stringify(packages[pkg].include)},testNamePattern:${JSON.stringify(pattern)},pool:'forks',isolate:true,maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
  )
  return config
}

function runVitest({ pkg, config }) {
  const args = ['exec', 'vitest', 'run', '--config', config]
  const run = spawnSync('pnpm', args, {
    cwd: packages[pkg].root,
    env: preciseCoverageEnvironment(),
    encoding: 'utf8',
  })
  return {
    command: `pnpm ${args.join(' ')}`,
    cwd: packages[pkg].root,
    env: { NODE_DISABLE_COMPILE_CACHE: '1', NODE_COMPILE_CACHE: '<deleted>' },
    exit: run.status,
    signal: run.signal,
    spawnError: run.error ? String(run.error) : null,
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
    run,
  }
}

function persistRaw(name, result) {
  const stdoutFile = `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/${name}.stdout.txt`
  const stderrFile = `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/${name}.stderr.txt`
  writeFileSync(resolve(root, stdoutFile), result.stdout)
  writeFileSync(resolve(root, stderrFile), result.stderr)
  return { stdoutFile, stderrFile }
}

function readReport(report) {
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert(
    data.testResults.every((file) => !file.message),
    'suite error',
  )
  assert.equal(data.numTodoTests, 0)
  return data.testResults.flatMap((file) =>
    file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
  )
}

mkdirSync(trackedDir, { recursive: true })
const receipt = {
  generatedAt: new Date().toISOString(),
  driver: 'docs/ops/evidence/coverage85-kimi-extract-migrate-r1-mutants.mjs',
  productFiles,
  controls: [],
  mutations: [],
}

try {
  const hashesBefore = Object.fromEntries(productFiles.map((file) => [file, fileHash(file)]))
  receipt.hashesBefore = hashesBefore
  const controlsByPkg = {}

  for (const pkg of Object.keys(packages)) {
    const report = resolve(output, `control-${pkg}.json`)
    const result = runVitest({
      pkg,
      config: writeConfig({ pkg, mutation: null, report, marker: '', pattern: undefined }),
    })
    const raw = persistRaw(`control-${pkg}`, result)
    const log = `${result.stdout}\n${result.stderr}`
    assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(log)))
    const entries = readReport(report)
    assert.equal(result.exit, 0, `control-${pkg} red: see ${raw.stdoutFile}`)
    assert.equal(entries.filter((entry) => entry.status === 'pending').length, 0)
    controlsByPkg[pkg] = entries
    receipt.controls.push({ pkg, ...raw, exit: result.exit, executed: entries.length })
    console.log(`control-${pkg}: ${entries.length} passing`)
  }

  for (const mutation of mutations) {
    const pkg = mutation.pkg
    const target = resolve(packages[pkg].root, mutation.source)
    const originalSource = readFileSync(target, 'utf8')
    assert.equal(originalSource.split(mutation.from).length, 2, `${mutation.id}: unique needle`)
    const testFile = resolve(packages[pkg].root, mutation.test)
    assert.equal(
      controlsByPkg[pkg].filter(
        (entry) => entry.file === testFile && entry.fullName === mutation.title,
      ).length,
      1,
      `${mutation.id}: exact passing control`,
    )
    const originalHash = fileHash(`packages/${pkg}/${mutation.source}`)
    const mutantHash = sha256(originalSource.replace(mutation.from, mutation.to))

    const pattern = `^${escapePattern(mutation.title)}$`
    const marker = resolve(output, `${mutation.id}.entered`)
    const report = resolve(output, `${mutation.id}.json`)
    const config = writeConfig({ pkg, mutation, report, marker, pattern })

    const red = runVitest({ pkg, config })
    const redRaw = persistRaw(`${mutation.id}-red`, red)
    const redLog = `${red.stdout}\n${red.stderr}`
    assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(redLog)))
    const redEntries = readReport(report)
    const redEntry = redEntries.find((entry) => entry.status === 'failed')
    assert(
      businessRed(red.exit, redEntries, testFile, mutation.title),
      `${mutation.id}: not a unique business red; see ${redRaw.stdoutFile}`,
    )
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { id: mutation.id, target })

    const green = runVitest({
      pkg,
      config: writeConfig({ pkg, mutation: null, report, marker, pattern }),
    })
    const greenRaw = persistRaw(`${mutation.id}-green`, green)
    const greenEntries = readReport(report)
    assert.equal(green.exit, 0, `${mutation.id}: restore green failed; see ${greenRaw.stdoutFile}`)
    assert.equal(greenEntries.filter((entry) => entry.status === 'passed').length, 1)
    assert.equal(greenEntries.find((entry) => entry.status === 'passed')?.fullName, mutation.title)

    const restoredHash = fileHash(`packages/${pkg}/${mutation.source}`)
    assert.equal(restoredHash, originalHash, `${mutation.id}: product drift`)
    for (const [file, expected] of Object.entries(receipt.hashesBefore))
      assert.equal(fileHash(file), expected, `${mutation.id}: changed product ${file}`)

    receipt.mutations.push({
      id: mutation.id,
      expectRed: mutation.expectRed,
      source: `packages/${pkg}/${mutation.source}`,
      needle: { from: mutation.from, to: mutation.to },
      identity: { file: mutation.test, fullName: mutation.title },
      hashes: { original: originalHash, mutant: mutantHash, restored: restoredHash },
      red: {
        command: red.command,
        cwd: red.cwd,
        env: red.env,
        exit: red.exit,
        signal: red.signal,
        spawnError: red.spawnError,
        ...redRaw,
        assertionError: redEntry.failureMessages.map(clean),
      },
      green: {
        command: green.command,
        cwd: green.cwd,
        env: green.env,
        exit: green.exit,
        signal: green.signal,
        spawnError: green.spawnError,
        ...greenRaw,
      },
    })
    console.log(`${mutation.id}: detected (red exit 1 / green exit 0)`)
  }

  const hashesAfter = Object.fromEntries(productFiles.map((file) => [file, fileHash(file)]))
  assert.deepEqual(hashesAfter, receipt.hashesBefore, 'product hash drift after all runs')
  receipt.hashesAfter = hashesAfter
  const summaryPath = 'docs/ops/evidence/coverage85-kimi-extract-migrate-r1/mutation-receipt.json'
  writeFileSync(resolve(root, summaryPath), `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(`receipt: ${summaryPath}`)
} finally {
  rmSync(output, { recursive: true, force: true })
}
