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
    from: '仍被 ${references.length} 处引用',
    to: '仍被 ${references.length} 个引用',
    title: 'keeps BattleDataInUseError identity, message and references on the moved module',
  },
  c01: {
    id: 'c01-in-use-message',
    sourceFile: 'src/core/world-variable-commands.ts',
    testFile: 'src/core/world-variable-commands.test.ts',
    from: '处脚本引用',
    to: '个脚本引用',
    title: 'keeps world-variable constructors and in-use error on the old commands barrel',
  },
  c02: {
    id: 'c02-update-label',
    sourceFile: 'src/core/enemy-commands.ts',
    testFile: 'src/core/enemy-commands.test.ts',
    from: "readonly label = '修改敌人'",
    to: "readonly label = '修改敌方'",
    title: 'keeps enemy constructors on the old commands barrel and patches on first apply',
  },
  c03: {
    id: 'c03-slot-cap',
    sourceFile: 'src/core/enemy-team-commands.ts',
    testFile: 'src/core/enemy-team-references.test.ts',
    from: 'slots: this.next.slots.slice(0, 5)',
    to: 'slots: this.next.slots.slice(0, 4)',
    title: 'keeps enemy-team constructors and in-use error on the old commands barrel',
  },
  c04: {
    id: 'c04-item-id-exists',
    sourceFile: 'src/core/item-commands.ts',
    testFile: 'src/core/item-commands.test.ts',
    from: '物品 id 已存在：',
    to: '物品 id 已占用：',
    title: 'keeps item constructors on the old commands barrel and rejects duplicate id',
  },
  c05: {
    id: 'c05-skill-default-power',
    sourceFile: 'src/core/skill-commands.ts',
    testFile: 'src/core/skill-commands.test.ts',
    from: 'power: 20',
    to: 'power: 19',
    title: 'keeps skill constructors on the old commands barrel and scaffolds default power',
  },
  c06: {
    id: 'c06-poison-curability',
    sourceFile: 'src/core/poison-commands.ts',
    testFile: 'src/core/poison-commands.test.ts',
    from: "curability: 'common'",
    to: "curability: 'severe'",
    title: 'keeps poison constructors on the old commands barrel and scaffolds common curability',
  },
  c07: {
    id: 'c07-ambience-delete-block',
    sourceFile: 'src/core/ambience-commands.ts',
    testFile: 'src/core/ambience-commands.test.ts',
    from: '处引用，不能删除',
    to: '处引用，不可删除',
    title: 'keeps ambience constructors on the old commands barrel and blocks in-use delete',
  },
  c08: {
    id: 'c08-shop-id-overflow',
    sourceFile: 'src/core/shop-commands.ts',
    testFile: 'src/core/shop-lifecycle.test.ts',
    from: '商店编号已超出安全整数范围',
    to: '商店编号已超出整数范围',
    title: 'keeps shop constructors on the old commands barrel and guards nextShopId overflow',
  },
  c09: {
    id: 'c09-locale-label',
    sourceFile: 'src/core/locale-commands.ts',
    testFile: 'src/core/locale-commands.test.ts',
    from: "readonly label = '修改文本'",
    to: "readonly label = '修改文案'",
    title: 'keeps metadata constructors on the old commands barrel and patches locale text',
  },
  c10: {
    id: 'c10-asset-label-clear',
    sourceFile: 'src/core/asset-label-command.ts',
    testFile: 'src/core/asset-label-command.test.ts',
    from: 'if (!this.next) delete record.label',
    to: 'if (false) delete record.label',
    title: 'keeps asset-label constructor on the old commands barrel and clears empty labels',
  },
  u00: {
    id: 'u00-described-by-empty',
    sourceFile: 'src/ui/design-system/control-utils.ts',
    testFile: 'src/ui/design-system/control-utils.test.ts',
    from: 'return value || undefined',
    to: 'return value',
    title: 'joins truthy class tokens and drops empty describedBy ids',
  },
  u01: {
    id: 'u01-busy-label',
    sourceFile: 'src/ui/design-system/buttons.tsx',
    testFile: 'src/ui/design-system/buttons.test.tsx',
    from: "{busy ? '处理中' : children}",
    to: "{busy ? '处理中…' : children}",
    title: 'keeps pressable, button and action-link identity with busy and default chrome',
  },
  u02: {
    id: 'u02-help-tip-label',
    sourceFile: 'src/ui/design-system/help-tips.tsx',
    testFile: 'src/ui/design-system/help-tips.test.tsx',
    from: 'aria-label={`${props.label}说明`}',
    to: 'aria-label={`${props.label}帮助`}',
    title: 'keeps tooltip and help-tip identity with visually-hidden descriptions and Escape dismiss',
  },
  u03: {
    id: 'u03-icon-button-compact',
    sourceFile: 'src/ui/design-system/icon-button.tsx',
    testFile: 'src/ui/design-system/icon-button.test.tsx',
    from: "size === 'compact' && 'ds-icon-button--compact'",
    to: "size === 'compact' && 'ds-icon-button--dense'",
    title: 'keeps icon-button identity with compact class and aria-label',
  },
}

const selected = process.argv[2] ? [process.argv[2]] : Object.keys(cases)

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function failures(json) {
  const found = []
  for (const file of json?.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === 'failed') {
        found.push({
          title: assertion.title,
          fullName: assertion.fullName,
          message: (assertion.failureMessages ?? []).join('\n'),
        })
      }
    }
  }
  return found
}

function run(spec, config, outputFile) {
  const args = [
    'exec',
    'vitest',
    'run',
    '--reporter=json',
    `--outputFile=${outputFile}`,
    '--maxWorkers=1',
    '-t',
    spec.title,
    spec.testFile,
  ]
  if (config) args.push('--config', config)
  const result = spawnSync('pnpm', args, {
    cwd: editor,
    encoding: 'utf8',
    env: { ...process.env, NODE_COMPILE_CACHE: undefined },
  })
  const json = fs.existsSync(outputFile) ? JSON.parse(fs.readFileSync(outputFile, 'utf8')) : null
  return { status: result.status, json, stderr: result.stderr }
}

const reports = []
let failed = false
for (const key of selected) {
  const spec = cases[key]
  if (!spec) {
    console.error(`unknown case ${key}`)
    process.exit(1)
  }
  const absolute = path.join(editor, spec.sourceFile)
  const source = fs.readFileSync(absolute, 'utf8')
  if (source.split(spec.from).length - 1 !== 1) {
    console.error(`${spec.id}: needle count is not 1`)
    process.exit(1)
  }
  const evidence = fs.mkdtempSync(path.join(os.tmpdir(), `${spec.id}-`))
  const before = sha256(absolute)
  const green = run(spec, undefined, path.join(evidence, 'green.json'))
  if (green.status !== 0 || green.json?.numFailedTests !== 0) {
    console.error(`${spec.id} green failed`, green.status, green.stderr?.slice(-1500))
    fs.rmSync(evidence, { recursive: true, force: true })
    process.exit(1)
  }

  const configDir = fs.mkdtempSync(path.join(editor, `.mutant-${spec.id}-`))
  const configPath = path.join(configDir, 'mutant.config.mts')
  const fileNeedle = path.basename(spec.sourceFile)
  fs.writeFileSync(
    configPath,
    `import { defineConfig, mergeConfig } from 'vitest/config'
import base from '../vite.config.ts'

const needle = ${JSON.stringify(spec.from)}
const replacement = ${JSON.stringify(spec.to)}

export default mergeConfig(
  base,
  defineConfig({
    plugins: [
      {
        name: ${JSON.stringify(`${spec.id}-mutant`)},
        enforce: 'pre',
        transform(code, id) {
          const file = id.split('?')[0] ?? id
          if (!file.endsWith(${JSON.stringify(fileNeedle)})) return null
          const count = code.split(needle).length - 1
          if (count !== 1) throw new Error('needle count ' + count)
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
    red = run(spec, configPath, path.join(evidence, 'red.json'))
  } finally {
    fs.rmSync(configDir, { recursive: true, force: true })
    fs.rmSync(evidence, { recursive: true, force: true })
  }
  const after = sha256(absolute)
  const failedTests = failures(red.json)
  const assertion =
    failedTests[0]?.message.split('\n').find((line) => line.includes('AssertionError')) ?? null
  const ok =
    red.status === 1 &&
    failedTests.length === 1 &&
    failedTests[0]?.title === spec.title &&
    Boolean(assertion) &&
    before === after
  const report = {
    id: spec.id,
    file: `packages/editor/${spec.sourceFile}`,
    sha256: before,
    hashUnchanged: before === after,
    greenExit: green.status,
    greenPassed: green.json?.numPassedTests ?? null,
    redExit: red.status,
    failedTitle: failedTests[0]?.title ?? null,
    failedFullName: failedTests[0]?.fullName ?? null,
    assertion,
    ok,
  }
  reports.push(report)
  if (!ok) {
    failed = true
    console.error(failedTests[0]?.message?.slice(0, 1200) ?? red.stderr?.slice(-1200))
  }
}

const out = selected.length === 1 ? reports[0] : reports
console.log(JSON.stringify(out, null, 2))
if (failed) process.exit(1)
