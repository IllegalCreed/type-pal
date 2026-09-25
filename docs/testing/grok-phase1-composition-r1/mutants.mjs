import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../..')
const greenConfig = 'docs/testing/grok-phase1-composition-r1/vitest.config.mts'

const needles = [
  {
    id: 'present-remap',
    chain: 'presentFrame',
    file: 'packages/game/src/present/present.ts',
    from: '全缓冲扫描天然越界安全。\n    for (let i = 0; i < px.length; i++) {\n      if (px[i] === from) px[i] = to',
    to: '全缓冲扫描天然越界安全。\n    for (let i = 0; i < px.length; i++) {\n      if (px[i] === from) px[i] = from',
    testFile: 'docs/testing/grok-phase1-composition-r1/p12-overlays.test.ts',
    title: 'P12 场景0x4F被remap成0x4E，对话框同索引保持0x4F',
  },
  {
    id: 'battle-intro',
    chain: 'BattlePresent.draw',
    file: 'packages/game/src/present/battle/present-battle.ts',
    from: 'if (SWITCH_POS[k % 6]! >= completedRounds) buf[k] = old[k]!',
    to: 'if (false) buf[k] = old[k]!',
    testFile: 'docs/testing/grok-phase1-composition-r1/p14-battle-fades.test.ts',
    title: 'P14 入场切换起点中段终点可区分，重复中段不变且伤害数字在切换之后',
  },
  {
    id: 'battle-ui-mp',
    chain: 'drawBattleUI',
    file: 'packages/game/src/present/battle/draw-battle-ui.ts',
    from: 'const currentMp = role ? (gs.PlayerRolesRuntime.rgwMP[role.roleId] ?? 0) : 0',
    to: 'const currentMp = 0',
    testFile: 'docs/testing/grok-phase1-composition-r1/p15-battle-ui.test.ts',
    title: 'P15 现行MP为8时需求9与需求8的选中色和数字不同，静态MP10不参与',
  },
  {
    id: 'dialog-digit',
    chain: 'drawDialogBox',
    file: 'packages/game/src/present/dialog-box.ts',
    from: "if (ch >= '0' && ch <= '9' && ctx?.uiSpriteFrames)",
    to: "if (false && ch >= '0' && ch <= '9' && ctx?.uiSpriteFrames)",
    testFile: 'docs/testing/grok-phase1-composition-r1/p16-dialog.test.ts',
    title: 'P16 旁白数字走黄色精灵，缺UI帧时不画框并把数字当字形',
  },
]

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function runVitest(config, testFile, outputFile) {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '--config',
      config,
      '--reporter=json',
      `--outputFile=${outputFile}`,
      '--maxWorkers=1',
      testFile,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NODE_COMPILE_CACHE: undefined },
    },
  )
  const json = fs.existsSync(outputFile) ? JSON.parse(fs.readFileSync(outputFile, 'utf8')) : null
  return { status: result.status, json, stderr: result.stderr, stdout: result.stdout }
}

function failedTitles(json) {
  const titles = []
  for (const file of json?.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === 'failed') {
        titles.push({
          title: assertion.title ?? assertion.fullName,
          messages: (assertion.failureMessages ?? []).join('\n'),
        })
      }
    }
  }
  return titles
}

function writeMutantConfig(needle) {
  const configPath = path.join(here, `.mutant-${needle.id}.mts`)
  const source = `import { defineConfig } from 'vitest/config'

const needle = ${JSON.stringify(needle.from)}
const replacement = ${JSON.stringify(needle.to)}
const target = ${JSON.stringify(needle.file)}

export default defineConfig({
  plugins: [
    {
      name: 'grok-composition-mutant',
      enforce: 'pre',
      transform(code, id) {
        const file = id.split('?')[0] ?? id
        if (!file.includes(target)) return null
        const count = code.split(needle).length - 1
        if (count !== 1) throw new Error(\`needle count \${count} in \${file}\`)
        return { code: code.replace(needle, replacement), map: null }
      },
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./docs/testing/grok-phase1-composition-r1/vitest.setup.ts'],
    include: [${JSON.stringify(needle.testFile)}],
  },
})
`
  fs.writeFileSync(configPath, source)
  return configPath
}

const report = []
let failed = false
for (const needle of needles) {
  const absolute = path.join(root, needle.file)
  const source = fs.readFileSync(absolute, 'utf8')
  const occurrences = source.split(needle.from).length - 1
  if (occurrences !== 1) {
    console.error(`${needle.id} disk needle count ${occurrences}`)
    failed = true
    break
  }
  const before = sha256(absolute)
  const greenOut = `/tmp/grok-composition-${needle.id}-green.json`
  const green = runVitest(greenConfig, needle.testFile, greenOut)
  if (green.status !== 0 || green.json?.numFailedTests !== 0) {
    console.error(`${needle.id} green exit ${green.status}`)
    console.error(green.stderr?.slice(-2000) ?? '')
    failed = true
    break
  }
  const configPath = writeMutantConfig(needle)
  const redOut = `/tmp/grok-composition-${needle.id}-red.json`
  let red
  try {
    red = runVitest(configPath, needle.testFile, redOut)
  } finally {
    fs.rmSync(configPath, { force: true })
  }
  const after = sha256(absolute)
  const failures = failedTitles(red.json)
  const only =
    red.status === 1 &&
    failures.length === 1 &&
    failures[0]?.title === needle.title &&
    failures[0]?.messages.includes('AssertionError')
  const row = {
    id: needle.id,
    chain: needle.chain,
    file: needle.file,
    sha256: before,
    hashUnchanged: before === after,
    greenExit: green.status,
    redExit: red.status,
    failedTitle: failures[0]?.title ?? null,
    assertionError: failures[0]?.messages.includes('AssertionError') ?? false,
    ok: only && before === after,
  }
  report.push(row)
  console.log(JSON.stringify(row))
  if (!row.ok) {
    console.error(failures[0]?.messages?.slice(0, 1500) ?? red.stderr?.slice(-1500))
    failed = true
    break
  }
}

if (failed) process.exit(1)
fs.writeFileSync(path.join(here, 'mutant-report.json'), `${JSON.stringify(report, null, 2)}\n`)
