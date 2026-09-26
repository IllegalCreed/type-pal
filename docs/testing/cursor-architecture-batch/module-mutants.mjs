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
  c00: {
    id: 'c00-error-message',
    sourceFile: 'src/core/battle-data-command-errors.ts',
    testFile: 'src/core/command-contract.test.ts',
    from: `仍被 \${references.length} 处引用`,
    to: `仍被 \${references.length} 个引用`,
    title: 'keeps BattleDataInUseError identity, message and references on the moved module',
    fullName:
      'C00 command contract and battle-data error keeps BattleDataInUseError identity, message and references on the moved module',
  },
  c01: {
    id: 'c01-in-use-message',
    sourceFile: 'src/core/world-variable-commands.ts',
    testFile: 'src/core/world-variable-commands.test.ts',
    from: '处脚本引用',
    to: '个脚本引用',
    title: 'keeps world-variable constructors and in-use error on the old commands barrel',
    fullName:
      'world variable EditSession commands keeps world-variable constructors and in-use error on the old commands barrel',
  },
  c02: {
    id: 'c02-update-label',
    sourceFile: 'src/core/enemy-commands.ts',
    testFile: 'src/core/enemy-commands.test.ts',
    from: "readonly label = '修改敌人'",
    to: "readonly label = '修改敌方'",
    title: 'keeps enemy constructors on the old commands barrel and patches on first apply',
    fullName:
      'C02 enemy command family keeps enemy constructors on the old commands barrel and patches on first apply',
  },
  c03: {
    id: 'c03-slot-cap',
    sourceFile: 'src/core/enemy-team-commands.ts',
    testFile: 'src/core/enemy-team-references.test.ts',
    from: 'slots: this.next.slots.slice(0, 5)',
    to: 'slots: this.next.slots.slice(0, 4)',
    title: 'keeps enemy-team constructors and in-use error on the old commands barrel',
    fullName:
      'enemy team authoring commands and references keeps enemy-team constructors and in-use error on the old commands barrel',
  },
  c04: {
    id: 'c04-item-id-exists',
    sourceFile: 'src/core/item-commands.ts',
    testFile: 'src/core/item-commands.test.ts',
    from: '物品 id 已存在：',
    to: '物品 id 已占用：',
    title: 'keeps item constructors on the old commands barrel and rejects duplicate id',
    fullName:
      'C04 item command family keeps item constructors on the old commands barrel and rejects duplicate id',
  },
  c05: {
    id: 'c05-skill-default-power',
    sourceFile: 'src/core/skill-commands.ts',
    testFile: 'src/core/skill-commands.test.ts',
    from: 'power: 20',
    to: 'power: 19',
    title: 'keeps skill constructors on the old commands barrel and scaffolds default power',
    fullName:
      'C05 skill command family keeps skill constructors on the old commands barrel and scaffolds default power',
  },
  c06: {
    id: 'c06-poison-curability',
    sourceFile: 'src/core/poison-commands.ts',
    testFile: 'src/core/poison-commands.test.ts',
    from: "curability: 'common'",
    to: "curability: 'severe'",
    title: 'keeps poison constructors on the old commands barrel and scaffolds common curability',
    fullName:
      'C06 poison command family keeps poison constructors on the old commands barrel and scaffolds common curability',
  },
  c07: {
    id: 'c07-ambience-delete-guard',
    sourceFile: 'src/core/ambience-commands.ts',
    testFile: 'src/core/commands.test.ts',
    from: 'if (references.length) throw new AmbienceInUseError(this.ambienceId, references)',
    to: 'void references',
    title: 'DeleteAmbience:脚本显式引用、昼夜隐式引用和运行态引用均阻断且不改源',
    fullName:
      'W6 氛围命令(不可变 + invert) DeleteAmbience:脚本显式引用、昼夜隐式引用和运行态引用均阻断且不改源',
  },
  c08: {
    id: 'c08-shop-id-overflow',
    sourceFile: 'src/core/shop-commands.ts',
    testFile: 'src/core/shop-lifecycle.test.ts',
    from: '商店编号已超出安全整数范围',
    to: '商店编号已超出整数范围',
    title: 'keeps shop constructors on the old commands barrel and guards nextShopId overflow',
    fullName:
      'C08 shop command family keeps shop constructors on the old commands barrel and guards nextShopId overflow',
  },
  c09: {
    id: 'c09-locale-label',
    sourceFile: 'src/core/locale-commands.ts',
    testFile: 'src/core/locale-commands.test.ts',
    from: "readonly label = '修改文本'",
    to: "readonly label = '修改文案'",
    title: 'keeps metadata constructors on the old commands barrel and patches locale text',
    fullName:
      'C09 locale level-up and project-name commands keeps metadata constructors on the old commands barrel and patches locale text',
  },
  c10: {
    id: 'c10-asset-label-clear',
    sourceFile: 'src/core/asset-label-command.ts',
    testFile: 'src/core/asset-label-command.test.ts',
    from: 'if (!this.next) delete record.label',
    to: 'if (false) delete record.label',
    title: 'keeps asset-label constructor on the old commands barrel and clears empty labels',
    fullName:
      'C10 asset label command family keeps asset-label constructor on the old commands barrel and clears empty labels',
  },
  u00: {
    id: 'u00-described-by-empty',
    sourceFile: 'src/ui/design-system/control-utils.ts',
    testFile: 'src/ui/design-system/control-utils.test.ts',
    from: 'return value || undefined',
    to: 'return value',
    title: 'joins truthy class tokens and drops empty describedBy ids',
    fullName:
      'U00 shared control utilities joins truthy class tokens and drops empty describedBy ids',
  },
  u01: {
    id: 'u01-busy-label',
    sourceFile: 'src/ui/design-system/buttons.tsx',
    testFile: 'src/ui/design-system/buttons.test.tsx',
    from: "{busy ? '处理中' : children}",
    to: "{busy ? '处理中…' : children}",
    title: 'keeps pressable, button and action-link identity with busy and default chrome',
    fullName:
      'U01 button family keeps pressable, button and action-link identity with busy and default chrome',
  },
  u02: {
    id: 'u02-help-tip-label',
    sourceFile: 'src/ui/design-system/help-tips.tsx',
    testFile: 'src/ui/design-system/help-tips.test.tsx',
    from: `aria-label={\`\${props.label}说明\`}`,
    to: `aria-label={\`\${props.label}帮助\`}`,
    title:
      'keeps tooltip and help-tip identity with visually-hidden descriptions and Escape dismiss',
    fullName:
      'U02 help tips keeps tooltip and help-tip identity with visually-hidden descriptions and Escape dismiss',
  },
  u03: {
    id: 'u03-icon-button-compact',
    sourceFile: 'src/ui/design-system/icon-button.tsx',
    testFile: 'src/ui/design-system/icon-button.test.tsx',
    from: "size === 'compact' && 'ds-icon-button--compact'",
    to: "size === 'compact' && 'ds-icon-button--dense'",
    title: 'keeps icon-button identity with compact class and aria-label',
    fullName: 'U03 icon button keeps icon-button identity with compact class and aria-label',
  },
  u04: {
    id: 'u04-file-picker-class',
    sourceFile: 'src/ui/design-system/native-inputs.tsx',
    testFile: 'src/ui/design-system/native-inputs.test.tsx',
    from: "classes('ds-file-picker', disabled && 'is-disabled', className)",
    to: "classes('ds-file-picker-field', disabled && 'is-disabled', className)",
    title: 'keeps native file, range, and color input identity with file-picker class',
    fullName:
      'U04 native inputs keeps native file, range, and color input identity with file-picker class',
  },
  u05: {
    id: 'u05-field-inline',
    sourceFile: 'src/ui/design-system/field-layout.tsx',
    testFile: 'src/ui/design-system/field-layout.test.tsx',
    from: "props.layout === 'inline' && 'ds-field--inline'",
    to: "props.layout === 'inline' && 'ds-field--row'",
    title:
      'keeps field-group, field, and control-group identity with inline layout and required asterisk',
    fullName:
      'U05 field layout keeps field-group, field, and control-group identity with inline layout and required asterisk',
  },
  u06: {
    id: 'u06-escape-cancel',
    sourceFile: 'src/ui/design-system/draft-input-state.ts',
    testFile: 'src/ui/design-system/draft-text-inputs.test.tsx',
    from: 'onCancel?.()',
    to: 'void onCancel',
    title: 'keeps draft text input identity with Enter commit and Escape cancel',
    fullName:
      'U06 draft text inputs keeps draft text input identity with Enter commit and Escape cancel',
  },
  u07: {
    id: 'u07-number-step',
    sourceFile: 'src/ui/design-system/number-inputs.tsx',
    testFile: 'src/ui/design-system/number-inputs.test.tsx',
    from: 'step={step}',
    to: 'step="any"',
    title: 'keeps number input identity with stepped parse validation string',
    fullName: 'U07 number inputs keeps number input identity with stepped parse validation string',
  },
  u08: {
    id: 'u08-text-field-id',
    sourceFile: 'src/ui/design-system/field-controls.tsx',
    testFile: 'src/ui/design-system/field-controls.test.tsx',
    from: '      {(field) => (\n        <DsTextInput\n          {...controlProps}\n          id={field.id}',
    to: `      {(field) => (
        <DsTextInput
          {...controlProps}
          id={\`\${field.id}-input\`}`,
    title: 'keeps text field shell identity with label association',
    fullName: 'U08 field controls keeps text field shell identity with label association',
  },
  u09: {
    id: 'u09-select-combobox',
    sourceFile: 'src/ui/design-system/select.tsx',
    testFile: 'src/ui/design-system/select.test.tsx',
    from: "role: hasSearch && open ? undefined : ('combobox' as const)",
    to: "role: hasSearch && open ? undefined : ('button' as const)",
    title: 'keeps select identity with combobox listbox semantics',
    fullName: 'U09 select keeps select identity with combobox listbox semantics',
  },
  u10: {
    id: 'u10-switch-role',
    sourceFile: 'src/ui/design-system/choice-controls.tsx',
    testFile: 'src/ui/design-system/choice-controls.test.tsx',
    from: 'role="switch"',
    to: 'role="checkbox"',
    title: 'keeps checkbox and switch identity with aria semantics',
    fullName: 'U10 choice controls keeps checkbox and switch identity with aria semantics',
  },
  u11: {
    id: 'u11-list-header-count',
    sourceFile: 'src/ui/design-system/list-header.tsx',
    testFile: 'src/ui/design-system/list-header.test.tsx',
    from: 'className="ds-list-header__count"',
    to: 'className="ds-list-header__total"',
    title: 'keeps list header identity with title and count chrome',
    fullName: 'U11 list header keeps list header identity with title and count chrome',
  },
  u12: {
    id: 'u12-status-alert',
    sourceFile: 'src/ui/design-system/feedback.tsx',
    testFile: 'src/ui/design-system/tabs-card-feedback.test.tsx',
    from: "role={tone === 'error' ? 'alert' : 'status'}",
    to: "role={tone === 'error' ? 'status' : 'status'}",
    title: 'keeps tabs, card, and status identity with tablist and alert roles',
    fullName:
      'U12 tabs card feedback keeps tabs, card, and status identity with tablist and alert roles',
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

function isExactAssertionFailure(message) {
  if (typeof message !== 'string' || message.length === 0) return false
  const first = message.split(/\r?\n/, 1)[0] ?? ''
  if (!/^AssertionError\b/.test(first)) return false
  if (/\bcaused by\b/i.test(message)) return false
  if (/\btimeout\b/i.test(message)) return false
  return true
}

function judgeGreen({ status, json, spec, testFileAbsolute, expectedExecutions = 1 }) {
  const executed = executedMatches(json, spec, testFileAbsolute)
  return {
    ok:
      status === 0 &&
      (json?.numFailedTests ?? 1) === 0 &&
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
  const failed = executed.filter((entry) => entry.status === 'failed')
  const messages = failed.flatMap((entry) => entry.messages)
  return {
    ok:
      status === 1 &&
      status !== 2 &&
      status !== null &&
      hit === true &&
      before === after &&
      executed.length === expectedExecutions &&
      failed.length === expectedExecutions &&
      failed.length === 1 &&
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

// Keep per-case JSON next to the runner for the ledger.
for (const report of reports) {
  fs.writeFileSync(
    path.join(here, `${report.key}-mutant.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  )
}

const out = selected.length === 1 ? reports[0] : reports
console.log(JSON.stringify({ self, reports: out }, null, 2))
if (failed) process.exit(1)
