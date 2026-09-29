/**
 * TEST-GLM-NEW-G-1 反控判据（只写本 wave 证据目录）。
 * 对 4 枚代表针做同型裁决：对照（无注入）必须 exit 0 且目标 fullName passed；
 * 注入后必须恰 exit 1、目标 fullName 恰一条 failed（绝对 file + fullName），
 * 其余 -t 过滤跳过为正常现象；注入前后被改产品源 SHA256 必须一致（证明完整还原）。
 * 混错 / timeout / skip / 零执行 / exit2 / 还原失败均判 invalid。
 * 用法：node docs/testing/glm-new-waves/wave-G/needle-judge.mjs
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const reforgeRoot = resolve(repoRoot, 'packages/reforge')
const outDir = resolve(repoRoot, 'docs/testing/glm-new-waves/wave-G')
mkdirSync(outDir, { recursive: true })

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

const NEEDLES = [
  {
    id: 'G-N1',
    target: 'packages/reforge/src/battle/battle-session.ts',
    fault: [
      'if (assets.playerBaseDefinitionIds.length !== players.length)',
      'if (false && assets.playerBaseDefinitionIds.length !== players.length)',
    ],
    testFile: 'src/battle/battle-session.glm-next-wave.test.ts',
    fullName:
      'G01 battle-session 公开边界残差 playerBaseDefinitionIds 长度与 players 不符在构造边界 fail-loud（battle-session.ts:373）',
    rationale: '构造边界 playerBaseDefinitionIds 长度守卫失效 → 负控必须业务红',
  },
  {
    id: 'G-N2',
    target: 'packages/reforge/src/screen-fx.ts',
    fault: ['if (shift > 0 && shift < w) {', 'if (shift > 0) {'],
    testFile: 'src/screen-fx.glm-next-wave.test.ts',
    fullName:
      'G06 screen-fx 波动背景缓存残差 shift ≥ w（小画布大波幅）走整行复制 else 臂；0<shift<w 对照两段卷行',
    rationale: 'shift≥w 整行复制 else 臂被绕过 → 波动卷行合同红',
  },
  {
    id: 'G-N3',
    target: 'packages/reforge/src/battle-trial-host.ts',
    fault: [
      "if (!canvas || !ctx) throw new Error('独立试打缺少可用画布')",
      "if (!canvas || !ctx) throw new Error('独立试打画布缺失（注入）')",
    ],
    testFile: 'src/battle-trial-host.glm-next-wave.test.ts',
    fullName: '无 #screen 画布时入口精确 fail-loud（battle-trial-host.ts:33）',
    rationale: 'trial host 入口画布守卫消息漂移 → 精确消息合同红',
  },
  {
    id: 'G-N4',
    target: 'packages/reforge/src/magic-menu-state.ts',
    fault: ["eff.curesTier ?? 'common'", "eff.curesTier ?? 'severe'"],
    testFile: 'src/magic-menu-state.glm-next-wave.test.ts',
    fullName:
      'G05 magic-menu-state 残差 curePoison 缺 curesTier 对 severe 毒：保留毒、零效果不扣 MP',
    rationale: "curePoison 缺省 tier 漂移为 severe → severe 毒被误解、保留毒臂红（common 解毒臂不受影响，证明针尖精确）",
  },
]

function runVitest(testFile, fullName) {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '--maxWorkers',
      '1',
      '--reporter=json',
      '--outputFile=/tmp/type-pal-glm-new-wave/G/needle-last.json',
      testFile,
      '-t',
      fullName,
    ],
    { cwd: reforgeRoot, encoding: 'utf8', timeout: 300000 },
  )
  let json = null
  try {
    json = JSON.parse(readTemp())
  } catch (error) {
    return { exitCode: result.status, json: null, error: String(error) }
  }
  return { exitCode: result.status, json }
}

const readTemp = () => readFileSync('/tmp/type-pal-glm-new-wave/G/needle-last.json', 'utf8')

function matchingRun(json, fullName) {
  if (!json) return undefined
  return json.testResults
    ?.flatMap((file) => file.assertionResults ?? [])
    .find((row) => row.fullName === fullName && row.status !== 'skipped' && row.status !== 'todo')
}

const verdicts = []
let allValid = true
for (const needle of NEEDLES) {
  mkdirSync('/tmp/type-pal-glm-new-wave/G', { recursive: true })
  const abs = resolve(repoRoot, needle.target)
  const before = sha256(readFileSync(abs))
  const source = readFileSync(abs, 'utf8')
  const parts = source.split(needle.fault[0])
  if (parts.length !== 2) {
    verdicts.push({ id: needle.id, valid: false, reason: 'fault anchor not unique' })
    allValid = false
    continue
  }

  const control = runVitest(needle.testFile, needle.fullName)
  const controlRow = matchingRun(control.json, needle.fullName)
  const controlOk = control.exitCode === 0 && controlRow?.status === 'passed'

  writeFileSync(abs, `${parts[0]}${needle.fault[1]}${parts[1]}`)
  let injected
  try {
    injected = runVitest(needle.testFile, needle.fullName)
  } finally {
    writeFileSync(abs, source)
  }
  const after = sha256(readFileSync(abs))
  const row = matchingRun(injected.json, needle.fullName)
  const failedRows = (injected.json?.testResults ?? [])
    .flatMap((file) => file.assertionResults ?? [])
    .filter((entry) => entry.status === 'failed')
  const valid =
    controlOk &&
    injected.exitCode === 1 &&
    after === before &&
    row?.status === 'failed' &&
    failedRows.length === 1 &&
    failedRows[0]?.fullName === needle.fullName
  if (!valid) allValid = false
  verdicts.push({
    id: needle.id,
    target: needle.target,
    rationale: needle.rationale,
    controlExit: control.exitCode,
    controlStatus: controlRow?.status ?? 'missing',
    injectedExit: injected.exitCode,
    injectedFailed: failedRows.map((entry) => entry.fullName),
    restoredSha256: after,
    restoreMatches: after === before,
    valid,
  })
}

const report = { wave: 'G', judge: 'needle-judge.mjs', generatedAt: new Date().toISOString(), allValid, verdicts }
writeFileSync(resolve(outDir, 'needle-verdicts.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (!allValid) process.exit(1)
