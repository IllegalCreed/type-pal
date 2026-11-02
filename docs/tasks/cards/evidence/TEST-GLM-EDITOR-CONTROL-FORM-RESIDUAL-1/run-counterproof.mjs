// TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1 反控与定向/相邻证据再生脚本（证据再生用，非测试）。
// 隔离 worktree 内执行：基线绿 → N1/N2 变异定向红（恰一指定业务 AssertionError、零 act/污染）
// → git 还原核 SHA → 定向绿；相邻 18 文件集合核对；末步 biome format 后按落盘字节计 sha256，
// 产 counterproof.json。任何一步不符即非零退出，不产出合格回执。
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ev = import.meta.dirname
const root = path.resolve(ev, '../../../../..')
const editor = path.join(root, 'packages/editor')
const logs = path.join(ev, 'mutation-logs')
const config = 'vitest.isolated.config.ts'

const TEST_FILE = 'src/ui/command-form-control.residual.glm.test.tsx'
const PRODUCT_FILE = 'src/ui/ScriptEditor.tsx'
const PRODUCT_FROZEN_SHA = '3c9055b5feffb0a85f6955b2d257177d7f0ee9a301283433dc7a7b35fef481e3'
const FULL_NAME = '共享脚本悬空 self 场景呈引用失效且实体降级文本，重选合法场景自动改绑首个实体'

const ADJACENT = [
  TEST_FILE,
  'src/ui/command-form-control.glm-large-wave.test.tsx',
  'src/ui/CommandForm.author-control-contracts.test.tsx',
  'src/ui/CommandForm.current-data.test.tsx',
  'src/ui/CommandForm.current-identity.test.tsx',
  'src/ui/CommandForm.current-movement.test.tsx',
  'src/ui/CommandForm.current-scene.test.tsx',
  'src/ui/CommandForm.current-dialog.test.tsx',
  'src/ui/CommandForm.current-characterization.test.tsx',
  'src/ui/command-form-contract.test.ts',
  'src/ui/command-form-family-ownership.test.ts',
  'src/ui/ScriptEditor.coverage-workflows-2.test.tsx',
  'src/ui/ScriptEditor.cov85.test.tsx',
  'src/ui/ScriptEditor.test.tsx',
  'src/ui/NamedIdPicker.test.tsx',
  'src/ui/MusicPicker.glm-leaf-wave.test.tsx',
  'src/ui/SoundPicker.glm-leaf-wave.test.tsx',
  'src/ui/design-system/select.glm-leaf-wave.test.tsx',
]

const shasum = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

const trimEof = (text) => `${text.replace(/\n+$/, '')}\n`

// 双 reporter 同进程：default 原始 stdout 落 .raw（trimEof 纪律），native JSON 落文件。
function run(files, rawOut, jsonOut, extraArgs = []) {
  const args = [
    'exec',
    'vitest',
    'run',
    ...files,
    '--config',
    config,
    '--reporter=default',
    '--reporter=json',
    `--outputFile=${jsonOut}`,
    ...extraArgs,
  ]
  const spawned = spawnSync('pnpm', args, {
    cwd: editor,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    timeout: 420_000,
  })
  const stdout = `${spawned.stdout ?? ''}${spawned.stderr ?? ''}`
  writeFileSync(rawOut, trimEof(stdout))
  const json = JSON.parse(readFileSync(jsonOut, 'utf8'))
  const executions = []
  for (const suite of json.testResults ?? []) {
    for (const assertion of suite.assertionResults ?? [])
      executions.push({
        file: suite.name,
        fullName: assertion.fullName,
        status: assertion.status,
      })
  }
  const actWarnings = (stdout.match(/not wrapped in act/g) ?? []).length
  const pollution = stdout
    .split('\n')
    .filter(
      (line) =>
        line.startsWith('Failed Suites') ||
        line.startsWith('Uncaught Exception') ||
        line.startsWith('Unhandled Rejection'),
    )
  const suiteMessages = (json.testResults ?? []).filter((suite) => suite.message)
  return {
    spawn: {
      command: `pnpm ${args.join(' ')}`,
      cwd: editor,
      pid: spawned.pid,
      exitCode: spawned.status,
      signal: spawned.signal,
    },
    totals: {
      files: json.numTotalTestSuites ?? json.testResults?.length ?? 0,
      tests: json.numTotalTests ?? executions.length,
      passed: json.numPassedTests,
      failed: json.numFailedTests,
      pending: json.numPendingTests,
    },
    executions,
    actWarnings,
    pollution,
    suiteMessages,
    rawFile: path.relative(ev, rawOut),
    jsonFile: path.relative(ev, jsonOut),
  }
}

function assertGreen(label, r, expectedTests) {
  if (r.spawn.exitCode !== 0) throw new Error(`${label}: exit=${r.spawn.exitCode} 非 0`)
  if (r.totals.failed !== 0) throw new Error(`${label}: failed=${r.totals.failed}`)
  if (r.totals.pending !== 0) throw new Error(`${label}: pending=${r.totals.pending}`)
  if (r.totals.tests !== expectedTests)
    throw new Error(`${label}: tests=${r.totals.tests} 期望 ${expectedTests}`)
  if (r.actWarnings !== 0) throw new Error(`${label}: act 警告 ${r.actWarnings}`)
  if (r.pollution.length) throw new Error(`${label}: 污染行 ${r.pollution.join(' | ')}`)
  if (r.suiteMessages.length) throw new Error(`${label}: suite.message 非空`)
}

const needleCheck = (r, fragment) => {
  const failed = r.executions.filter((e) => e.status === 'failed')
  if (r.spawn.exitCode === 0) throw new Error('mutant 未红')
  if (r.totals.tests !== 1 || r.totals.passed !== 0 || r.totals.failed !== 1)
    throw new Error(`红相位计数异常: ${JSON.stringify(r.totals)}`)
  if (failed.length !== 1 || failed[0].fullName !== FULL_NAME)
    throw new Error(`恰一指定业务红不满足: ${JSON.stringify(failed)}`)
  if (r.totals.pending !== 0) throw new Error('红相位出现 pending/skip')
  if (r.actWarnings !== 0) throw new Error('红相位含 act 警告')
  if (r.pollution.length || r.suiteMessages.length) throw new Error('红相位含污染')
  const native = JSON.parse(readFileSync(path.join(ev, r.jsonFile), 'utf8'))
  const failures = native.testResults?.[0]?.assertionResults?.[0]?.failureMessages ?? []
  const first = failures[0] ?? ''
  if (!first.startsWith('AssertionError'))
    throw new Error(`failureMessages[0] 非 AssertionError 起始: ${first.slice(0, 200)}`)
  if (!first.includes(fragment))
    throw new Error(`failureMessages[0] 不含 ${fragment}: ${first.slice(0, 300)}`)
  const raw = readFileSync(path.join(ev, r.rawFile), 'utf8')
  if (!raw.includes('AssertionError'))
    throw new Error('default reporter 原始输出未见 AssertionError')
}

const mutate = (oldText, newText) => {
  const full = path.join(editor, PRODUCT_FILE)
  const source = readFileSync(full, 'utf8')
  if (source.split(oldText).length !== 2) throw new Error(`变异锚点不唯一: ${oldText.slice(0, 60)}`)
  writeFileSync(full, source.replace(oldText, newText))
  return shasum(full)
}
const restore = () => {
  const res = spawnSync('git', ['-C', root, 'checkout', '--', `packages/editor/${PRODUCT_FILE}`], {
    encoding: 'utf8',
  })
  if (res.status !== 0) throw new Error(`还原失败: ${res.stderr}`)
  const sha = shasum(path.join(editor, PRODUCT_FILE))
  if (sha !== PRODUCT_FROZEN_SHA) throw new Error(`还原后 SHA 漂移: ${sha}`)
  return sha
}

const report = {
  card: 'TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1',
  replay:
    'run-counterproof.mjs 于隔离 worktree（/tmp/type-pal-cf-residual，源冻结 9aa3bed89）重放：基线绿 + 相邻集合 + N1/N2 红绿三态 + 产品零残留；末步 biome format 后按落盘字节计 sha256',
  node: process.version,
  identity: {
    productFrozenCommit: '9aa3bed892728f17c70d2f86d1fe07db10a718b8',
    testFile: TEST_FILE,
    productFile: PRODUCT_FILE,
    productFrozenSha256: PRODUCT_FROZEN_SHA,
    testSha256: shasum(path.join(editor, TEST_FILE)),
  },
  baseline: {},
  adjacent: {},
  needles: [],
  residue: '',
}

// P0 基线（定向）
const baseline = run(
  [TEST_FILE],
  path.join(logs, 'green-baseline.raw'),
  path.join(logs, 'baseline.json'),
)
assertGreen('baseline', baseline, 1)
if (
  baseline.executions.length !== 1 ||
  baseline.executions[0].fullName !== FULL_NAME ||
  baseline.executions[0].status !== 'passed'
)
  throw new Error(`基线 file×fullName 集合不符: ${JSON.stringify(baseline.executions)}`)
report.baseline = {
  raw: baseline.rawFile,
  nativeJson: baseline.jsonFile,
  spawn: baseline.spawn,
  totals: baseline.totals,
  executions: baseline.executions,
  actWarnings: baseline.actWarnings,
}

// P1 相邻 18 文件集合
const adjacent = run(ADJACENT, path.join(ev, 'adjacent.raw'), path.join(ev, 'adjacent.json'))
assertGreen('adjacent', adjacent, adjacent.executions.length)
const fileSet = [...new Set(adjacent.executions.map((e) => e.file))]
if (fileSet.length !== ADJACENT.length)
  throw new Error(`相邻执行文件集 ${fileSet.length} ≠ ${ADJACENT.length}`)
report.adjacent = {
  raw: adjacent.rawFile,
  nativeJson: adjacent.jsonFile,
  spawn: adjacent.spawn,
  totals: adjacent.totals,
  fileCount: fileSet.length,
  perFile: Object.entries(
    adjacent.executions.reduce((acc, e) => {
      acc[e.file] = (acc[e.file] ?? 0) + 1
      return acc
    }, {}),
  ).map(([file, tests]) => ({ file: file.replace(/^.*packages\/editor\//, ''), tests })),
  actWarnings: adjacent.actWarnings,
}

// P2 两针三态
const needles = [
  {
    id: 'N1-dangling-scene-explicit-option',
    mutation:
      'ScriptEditor.tsx EntityAddressEditor 场景选择移除悬空场景「（引用失效）」选项注入（呈现退化为 DsSelect 通用「缺失」）',
    old: '...(!scene || !sceneIsSelectable\n                ? [',
    new: '...(false\n                ? [',
    fragment: 'gone（引用失效）',
  },
  {
    id: 'N2-reselect-rebinds-first-entity',
    mutation:
      'ScriptEditor.tsx EntityAddressEditor 场景重选不再自动改绑首个可接受实体（保留旧实体 npc-2）',
    old: 'entity: nextScene?.entities.find(acceptsEntity)?.id ?? props.value.entity,',
    new: 'entity: props.value.entity,',
    fragment: 'npc-2',
  },
]
for (const needle of needles) {
  const mutantSha = mutate(needle.old, needle.new)
  const red = run(
    [TEST_FILE],
    path.join(logs, `${needle.id}.red.raw`),
    path.join(logs, `${needle.id}.red.json`),
  )
  needleCheck(red, needle.fragment)
  const restoredSha = restore()
  const green = run(
    [TEST_FILE],
    path.join(logs, `${needle.id}.green.raw`),
    path.join(logs, `${needle.id}.green.json`),
  )
  assertGreen(`${needle.id} green`, green, 1)
  report.needles.push({
    id: needle.id,
    mutation: needle.mutation,
    mutantProductSha256: mutantSha,
    restoredProductSha256: restoredSha,
    red: {
      spawn: red.spawn,
      totals: red.totals,
      failedFullName: red.executions.filter((e) => e.status === 'failed').map((e) => e.fullName),
      assertionFragment: needle.fragment,
      raw: red.rawFile,
      nativeJson: red.jsonFile,
      actWarnings: red.actWarnings,
    },
    restoredGreen: {
      spawn: green.spawn,
      totals: green.totals,
      raw: green.rawFile,
      nativeJson: green.jsonFile,
    },
  })
  console.log(`${needle.id}: red ok, green ok`)
}

// P3 产品零残留（只认 M/D；?? 为树内已知未跟踪装置：wrapper config 与 node_modules 软链）
const status = spawnSync('git', ['-C', root, 'status', '--porcelain', 'packages/'], {
  encoding: 'utf8',
})
const residue = status.stdout.split('\n').filter((line) => line && !line.startsWith('??'))
if (residue.length) throw new Error(`产品残留:\n${residue.join('\n')}`)
report.residue =
  'clean（git status --porcelain packages/ 无 M/D；?? 仅树内 wrapper config 与 node_modules 软链，交付后随 worktree 拆除）'

// P4 末步：biome format 证据 JSON → 按落盘字节计 hash → 写回执（回执本身再 format 一次）
const jsonEvidence = [
  path.join(logs, 'baseline.json'),
  path.join(ev, 'adjacent.json'),
  ...needles.flatMap((n) => [
    path.join(logs, `${n.id}.red.json`),
    path.join(logs, `${n.id}.green.json`),
  ]),
]
const fmt = spawnSync('pnpm', ['exec', 'biome', 'format', '--write', ...jsonEvidence], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
})
if (fmt.status !== 0) throw new Error(`biome format 证据失败: ${fmt.stdout}${fmt.stderr}`)
report.hashes = {
  note: '全部 sha256 按 biome format 之后的最终落盘字节计算（与提交字节一致）',
  baselineRaw: shasum(path.join(ev, report.baseline.raw)),
  baselineJson: shasum(path.join(ev, report.baseline.nativeJson)),
  adjacentRaw: shasum(path.join(ev, report.adjacent.raw)),
  adjacentJson: shasum(path.join(ev, report.adjacent.nativeJson)),
  needles: Object.fromEntries(
    needles.map((n) => [
      n.id,
      {
        redRaw: shasum(path.join(ev, `mutation-logs/${n.id}.red.raw`)),
        redJson: shasum(path.join(ev, `mutation-logs/${n.id}.red.json`)),
        greenRaw: shasum(path.join(ev, `mutation-logs/${n.id}.green.raw`)),
        greenJson: shasum(path.join(ev, `mutation-logs/${n.id}.green.json`)),
      },
    ]),
  ),
}
writeFileSync(path.join(ev, 'counterproof.json'), `${JSON.stringify(report, null, 2)}\n`)
const fmtReceipt = spawnSync(
  'pnpm',
  ['exec', 'biome', 'format', '--write', path.join(ev, 'counterproof.json')],
  { cwd: root, encoding: 'utf8' },
)
if (fmtReceipt.status !== 0)
  throw new Error(`回执 format 失败: ${fmtReceipt.stdout}${fmtReceipt.stderr}`)
const check = spawnSync('pnpm', ['exec', 'biome', 'check', ev], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
})
if (check.status !== 0) throw new Error(`证据目录 biome check 未过: ${check.stdout}${check.stderr}`)
console.log('counterproof.json written (ALL-VALID)')
