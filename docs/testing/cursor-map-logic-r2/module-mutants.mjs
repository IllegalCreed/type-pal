import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../..')
const editor = path.join(root, 'packages/editor')

const cases = {
  m1: {
    id: 'm1-draft-move-oob',
    sourceFile: 'src/core/stamp-draft.ts',
    testFile: 'src/core/stamp-draft.background.test.ts',
    from: "throw new Error('移动目标超出组合边界。')",
    to: 'void 0',
    title: 'moveStampDraftSelection：空点同引用；占用目标拒绝；两点重叠平移保双方值',
    fullName:
      'M1 stamp-draft 剩余合同 moveStampDraftSelection：空点同引用；占用目标拒绝；两点重叠平移保双方值',
  },
  m2: {
    id: 'm2-clip-hidden-layer',
    sourceFile: 'src/core/map-selection.ts',
    testFile: 'src/core/map-selection.background.test.ts',
    from: 'hiddenLayerIds: current.hiddenLayerIds.filter((id) => validLayers.has(id)),',
    to: 'hiddenLayerIds: current.hiddenLayerIds,',
    title: 'clip-map 精确保留现存 placementId，并丢掉已删层 hidden/locked',
    fullName:
      'M2 map-selection 剩余合同 clip-map 精确保留现存 placementId，并丢掉已删层 hidden/locked',
  },
  m3: {
    id: 'm3-move-empty-patch',
    sourceFile: 'src/core/map-transform.ts',
    testFile: 'src/core/map-transform.background.test.ts',
    from: `    // 失败计划只供幽灵/冲突预览；不给调用者一份可能清掉 move 源内容的可提交 patch。
    patch: canApply ? patch : { visual: [], collision: [] },`,
    to: `    patch,`,
    title: 'planMapMove 越界：空 patch、issues 含 out-of-bounds，map/selection 输入不变',
    fullName:
      'M3 map-transform 剩余合同 planMapMove 越界：空 patch、issues 含 out-of-bounds，map/selection 输入不变',
  },
  m4: {
    id: 'm4-group-empty-patch',
    sourceFile: 'src/core/stamp-group-transform.ts',
    testFile: 'src/core/stamp-group-transform.background.test.ts',
    from: 'patch: canApply ? patch : { visual: [], collision: [] },',
    to: 'patch,',
    title: 'planStampGroupMove 撞到未选中组：空 patch，tree-a 原位，tree-b 组员与 id 不变',
    fullName:
      'M4 stamp-group-transform 剩余合同 planStampGroupMove 撞到未选中组：空 patch，tree-a 原位，tree-b 组员与 id 不变',
  },
  m5: {
    id: 'm5-actual-height',
    sourceFile: 'src/core/stamp-placement.ts',
    testFile: 'src/core/stamp-placement.background.test.ts',
    from: 'return baseHeight + relativeHeight',
    to: 'return baseHeight',
    title: '合法 draft→canonicalize 后 planStampPlacement 给出完整三通道 patch 并应用',
    fullName:
      'M5 stamp-placement 剩余合同 合法 draft→canonicalize 后 planStampPlacement 给出完整三通道 patch 并应用',
  },
  m6: {
    id: 'm6-visual-owner',
    sourceFile: 'src/core/stamp-ownership.ts',
    testFile: 'src/core/stamp-ownership.background.test.ts',
    from: 'return buildStampPlacementIndex(map).visualOwnerByKey.get(visualSlotKey(ref))',
    to: 'return undefined',
    title: 'stampVisualOwner/stampCollisionOwner 在真实放置图上精确返回 id，普通邻格 undefined',
    fullName:
      'M6 stamp-ownership 剩余合同 stampVisualOwner/stampCollisionOwner 在真实放置图上精确返回 id，普通邻格 undefined',
  },
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function anchoredNamePattern(fullName) {
  return `^${escapeRegExp(fullName)}$`
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function resolveReportedFile(name) {
  if (!name) return ''
  const stripped = String(name)
    .replace(/^file:\/\//, '')
    .split('?')[0]
  return path.resolve(stripped)
}

function executedMatches(json, spec, testFileAbsolute) {
  const found = []
  for (const file of json?.testResults ?? []) {
    if (resolveReportedFile(file.name) !== testFileAbsolute) continue
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.fullName === spec.fullName && ['passed', 'failed'].includes(assertion.status)) {
        found.push({
          title: assertion.title,
          fullName: assertion.fullName,
          status: assertion.status,
          messages: assertion.failureMessages ?? [],
        })
      }
    }
  }
  return found
}

function isErrorHeader(line) {
  return /^(?:[A-Za-z][\w$]*Error|Error)\b/.test(line.trimStart())
}

function isTimeoutText(line) {
  return /\btimed[\s_-]+out\b/i.test(line)
}

function suiteMessages(json) {
  const messages = []
  if (typeof json?.message === 'string' && json.message) messages.push(json.message)
  for (const file of json?.testResults ?? []) {
    if (typeof file.message === 'string' && file.message) messages.push(file.message)
  }
  return messages
}

function allExecuted(json) {
  const found = []
  for (const file of json?.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (['passed', 'failed'].includes(assertion.status)) {
        found.push({
          file: resolveReportedFile(file.name),
          title: assertion.title,
          fullName: assertion.fullName,
          status: assertion.status,
          messages: assertion.failureMessages ?? [],
        })
      }
    }
  }
  return found
}

function isExactAssertionFailure(message) {
  if (typeof message !== 'string' || message.length === 0) return false
  if (/\bcaused by\b/i.test(message)) return false
  const lines = message.split(/\r?\n/)
  const first = lines[0] ?? ''
  if (!/^AssertionError\b/.test(first) || isTimeoutText(first)) return false
  for (const line of lines) {
    if (isTimeoutText(line)) return false
    if (isErrorHeader(line) && !/^AssertionError\b/.test(line)) return false
  }
  return true
}

function judgeGreen({ status, json, spec, testFileAbsolute, expectedExecutions = 1 }) {
  const executed = executedMatches(json, spec, testFileAbsolute)
  const all = allExecuted(json)
  return {
    ok:
      status === 0 &&
      (json?.numFailedTests ?? 1) === 0 &&
      suiteMessages(json).length === 0 &&
      all.length === expectedExecutions &&
      executed.length === expectedExecutions &&
      executed.every((entry) => entry.status === 'passed'),
    executed: executed.length,
  }
}

function judgeRed({
  status,
  json,
  spec,
  testFileAbsolute,
  before,
  after,
  hit,
  expectedExecutions = 1,
}) {
  const executed = executedMatches(json, spec, testFileAbsolute)
  const all = allExecuted(json)
  const failed = all.filter((entry) => entry.status === 'failed')
  const messages = executed.flatMap((entry) => entry.messages)
  return {
    ok:
      status === 1 &&
      status !== 2 &&
      status !== null &&
      hit === true &&
      before === after &&
      suiteMessages(json).length === 0 &&
      all.length === expectedExecutions &&
      executed.length === expectedExecutions &&
      failed.length === expectedExecutions &&
      failed.length === 1 &&
      failed[0]?.file === testFileAbsolute &&
      failed[0]?.fullName === spec.fullName &&
      failed[0]?.title === spec.title &&
      messages.length > 0 &&
      messages.every((message) => isExactAssertionFailure(message)),
    executed: executed.length,
    failedTitle: failed[0]?.title ?? null,
    failedFullName: failed[0]?.fullName ?? null,
    assertion: messages.find((message) => isExactAssertionFailure(message)) ?? null,
  }
}

function selfTestPayload({ file, fullName, title, message, status = 'failed' }) {
  return {
    testResults: [
      {
        name: file,
        assertionResults: [
          {
            title,
            fullName,
            status,
            failureMessages: message === undefined ? [] : [message],
          },
        ],
      },
    ],
    numFailedTests: status === 'failed' ? 1 : 0,
  }
}

function runSelfTests() {
  const spec = { title: 'target', fullName: 'suite target' }
  const testFile = '/abs/target.test.ts'
  const results = []

  const ordinary = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'Error: ordinary failure\ncaused by AssertionError: quoted text',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'ordinary-error-with-assertion-text', accepted: ordinary.ok, expected: false })

  const wrongFile = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: '/wrong-file.test.ts',
      fullName: 'wrong suite target',
      title: spec.title,
      message: 'AssertionError: expected false to be true',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'wrong-file-and-full-name', accepted: wrongFile.ok, expected: false })

  const zeroExec = judgeGreen({
    status: 0,
    json: { testResults: [], numFailedTests: 0 },
    spec,
    testFileAbsolute: testFile,
  })
  results.push({ id: 'zero-executions', accepted: zeroExec.ok, expected: false })

  const exit2 = judgeRed({
    status: 2,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'AssertionError: expected false to be true',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'exit-2', accepted: exit2.ok, expected: false })

  const exitNull = judgeRed({
    status: null,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'AssertionError: expected false to be true',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'exit-null', accepted: exitNull.ok, expected: false })

  const miss = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'AssertionError: expected false to be true',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: false,
  })
  results.push({ id: 'unhit-injection', accepted: miss.ok, expected: false })

  const mixed = judgeRed({
    status: 1,
    json: {
      testResults: [
        {
          name: testFile,
          assertionResults: [
            {
              title: spec.title,
              fullName: spec.fullName,
              status: 'failed',
              failureMessages: [
                'AssertionError: expected false to be true',
                'Error: ordinary failure',
              ],
            },
          ],
        },
      ],
    },
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'mixed-error', accepted: mixed.ok, expected: false })

  const timeout = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'Error: Test timed out in 5000ms.\nAssertionError: leftover',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'timeout', accepted: timeout.ok, expected: false })

  const legalGreen = judgeGreen({
    status: 0,
    json: {
      testResults: [
        {
          name: testFile,
          assertionResults: [
            {
              title: spec.title,
              fullName: spec.fullName,
              status: 'passed',
              failureMessages: [],
            },
          ],
        },
      ],
      numFailedTests: 0,
    },
    spec,
    testFileAbsolute: testFile,
  })
  results.push({ id: 'legal-green', accepted: legalGreen.ok, expected: true })

  const legalRed = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'AssertionError: expected false to be true',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'legal-red', accepted: legalRed.ok, expected: true })

  const mixedFollowOn = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'AssertionError: expected false to be true\nTypeError: boom',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({
    id: 'assertion-then-typeerror',
    accepted: mixedFollowOn.ok,
    expected: false,
  })

  const indentedTypeError = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'AssertionError: wrong result\n  TypeError: broken',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({
    id: 'assertion-then-indented-typeerror',
    accepted: indentedTypeError.ok,
    expected: false,
  })

  const tabError = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'AssertionError: wrong result\n\tError: broken',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({
    id: 'assertion-then-tab-error',
    accepted: tabError.ok,
    expected: false,
  })

  const timedOut = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message: 'AssertionError: Test timed out in 5000ms',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'assertion-timed-out', accepted: timedOut.ok, expected: false })

  const extraFailure = judgeRed({
    status: 1,
    json: {
      testResults: [
        {
          name: testFile,
          assertionResults: [
            {
              title: spec.title,
              fullName: spec.fullName,
              status: 'failed',
              failureMessages: ['AssertionError: expected false to be true'],
            },
            {
              title: 'other',
              fullName: 'suite other',
              status: 'failed',
              failureMessages: ['TypeError: boom'],
            },
          ],
        },
      ],
      numFailedTests: 2,
    },
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'extra-failure', accepted: extraFailure.ok, expected: false })

  const suiteError = judgeRed({
    status: 1,
    json: {
      testResults: [
        {
          name: testFile,
          assertionResults: [
            {
              title: spec.title,
              fullName: spec.fullName,
              status: 'failed',
              failureMessages: ['AssertionError: expected false to be true'],
            },
          ],
        },
        {
          name: '/other.test.ts',
          message: 'Error: suite exploded',
          assertionResults: [],
        },
      ],
      numFailedTests: 1,
    },
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({ id: 'suite-error', accepted: suiteError.ok, expected: false })

  const stackTimeoutName = judgeRed({
    status: 1,
    json: selfTestPayload({
      file: testFile,
      fullName: spec.fullName,
      title: spec.title,
      message:
        'AssertionError: expected false to be true\n    at runWithTimeout (file:///vitest/runner.js:2272:10)',
    }),
    spec,
    testFileAbsolute: testFile,
    before: 'same',
    after: 'same',
    hit: true,
  })
  results.push({
    id: 'stack-runWithTimeout-kept',
    accepted: stackTimeoutName.ok,
    expected: true,
  })

  const ok = results.every((entry) => entry.accepted === entry.expected)
  return { ok, results }
}

function run(spec, config, paths) {
  const args = [
    'exec',
    'vitest',
    'run',
    '--reporter=json',
    `--outputFile=${paths.json}`,
    '--maxWorkers=1',
    '-t',
    anchoredNamePattern(spec.fullName),
    spec.testFile,
  ]
  if (config) args.push('--config', config)
  const result = spawnSync('pnpm', args, {
    cwd: editor,
    encoding: 'utf8',
    env: { ...process.env, NODE_COMPILE_CACHE: undefined },
  })
  fs.writeFileSync(paths.log, `${result.stdout}\n${result.stderr}`)
  const json = fs.existsSync(paths.json) ? JSON.parse(fs.readFileSync(paths.json, 'utf8')) : null
  return { status: result.status, json, log: paths.log }
}

const selectedArg = process.argv[2]
if (selectedArg === '--self-test') {
  const report = runSelfTests()
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.ok ? 0 : 1)
}

const self = runSelfTests()
if (!self.ok) {
  console.error(JSON.stringify(self, null, 2))
  process.exit(1)
}

const selected = selectedArg ? [selectedArg] : Object.keys(cases)
const reports = []
let failed = false
for (const key of selected) {
  const spec = cases[key]
  if (!spec) {
    console.error(`unknown case ${key}`)
    process.exit(1)
  }
  const absolute = path.join(editor, spec.sourceFile)
  const testFileAbsolute = path.join(editor, spec.testFile)
  const source = fs.readFileSync(absolute, 'utf8')
  if (source.split(spec.from).length - 1 !== 1) {
    console.error(`${spec.id}: needle count is not 1`)
    process.exit(1)
  }
  const evidence = fs.mkdtempSync(path.join(os.tmpdir(), `${spec.id}-`))
  const before = sha256(absolute)
  const green = run(spec, undefined, {
    json: path.join(evidence, 'green.json'),
    log: path.join(evidence, 'green.log'),
  })
  const greenJudge = judgeGreen({
    status: green.status,
    json: green.json,
    spec,
    testFileAbsolute,
  })
  if (!greenJudge.ok) {
    console.error(`${spec.id} green failed`, {
      status: green.status,
      executed: greenJudge.executed,
      evidence,
    })
    process.exit(1)
  }

  // Vite 配置必须落在 editor 包内才能解析 vitest；JSON/日志留在系统临时目录。
  const configDir = fs.mkdtempSync(path.join(editor, `.mutant-${spec.id}-`))
  const configPath = path.join(configDir, 'mutant.config.mts')
  const marker = `MUTANT_HIT:${spec.id}`
  fs.writeFileSync(
    configPath,
    `import path from 'node:path'
import { defineConfig, mergeConfig } from 'vitest/config'
import base from ${JSON.stringify(path.join(editor, 'vite.config.ts'))}

const needle = ${JSON.stringify(spec.from)}
const replacement = ${JSON.stringify(spec.to)}
const target = ${JSON.stringify(absolute)}

export default mergeConfig(
  base,
  defineConfig({
    plugins: [
      {
        name: ${JSON.stringify(`${spec.id}-mutant`)},
        enforce: 'pre',
        transform(code, id) {
          const raw = id.split('?')[0] ?? id
          const file = path.resolve(raw.startsWith('file:') ? new URL(raw).pathname : raw)
          if (file !== target) return null
          const count = code.split(needle).length - 1
          if (count !== 1) throw new Error('needle count ' + count)
          console.log(${JSON.stringify(marker)})
          return { code: code.replace(needle, replacement), map: null }
        },
      },
    ],
  }),
)
`,
  )

  let red
  try {
    red = run(spec, configPath, {
      json: path.join(evidence, 'red.json'),
      log: path.join(evidence, 'red.log'),
    })
  } finally {
    fs.rmSync(configDir, { recursive: true, force: true })
  }
  const after = sha256(absolute)
  const hit = fs.readFileSync(red.log, 'utf8').includes(marker)
  const redJudge = judgeRed({
    status: red.status,
    json: red.json,
    spec,
    testFileAbsolute,
    before,
    after,
    hit,
  })
  const report = {
    id: spec.id,
    file: `packages/editor/${spec.sourceFile}`,
    testFile: `packages/editor/${spec.testFile}`,
    fullName: spec.fullName,
    sha256: before,
    hashUnchanged: before === after,
    greenExit: green.status,
    greenPassed: greenJudge.executed,
    redExit: red.status,
    failedTitle: redJudge.failedTitle,
    failedFullName: redJudge.failedFullName,
    assertion: redJudge.assertion,
    hit,
    evidence,
    ok: redJudge.ok,
  }
  reports.push({ key, ...report })
  if (!redJudge.ok) {
    failed = true
    console.error(`${spec.id} red rejected`, {
      status: red.status,
      hit,
      executed: redJudge.executed,
      evidence,
    })
  }
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-map-logic-r2-mutants-'))
for (const report of reports) {
  fs.writeFileSync(
    path.join(outDir, `${report.key}-mutant.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  )
}
fs.writeFileSync(
  path.join(outDir, 'evidence.json'),
  `${JSON.stringify(
    {
      kind: 'cursor-map-logic-r2-module-mutants',
      count: reports.length,
      allOk: reports.every((report) => report.ok === true),
      allRedExit1: reports.every((report) => report.redExit === 1),
      allHashUnchanged: reports.every((report) => report.hashUnchanged === true),
      allHit: reports.every((report) => report.hit === true),
      selfTest: self,
      cases: reports,
    },
    null,
    2,
  )}\n`,
)
console.error(`mutant output: ${outDir}`)

const out = selected.length === 1 ? reports[0] : reports
console.log(JSON.stringify({ self, reports: out, output: outDir }, null, 2))
if (failed) process.exit(1)
