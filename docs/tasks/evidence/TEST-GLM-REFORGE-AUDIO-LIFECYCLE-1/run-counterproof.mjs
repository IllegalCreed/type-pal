// TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 反控三态重放脚本（证据再生用，非测试）。
// 逐针：变异产品 → 定向红（恰一指定业务断言失败）→ git 还原 → 定向绿；raw 落盘统一
// trimEof（恰好一个终止换行）并按落盘字节计算 sha256；四态 = 基线绿 / 各针红 / 各针
// 还原绿 / 末次全套重放。全部针后校验产品零残留（clean-tree）。任何一步不符即非零退出，
// 不产出合格回执。本脚本不使用临时目录（无 mkdtemp 需清理；清理证明 = git 全仓 porcelain
// 仅剩本卡新增交付文件）。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../../../..')
const reforge = path.join(root, 'packages/reforge')
const ev = path.join(root, 'docs/ops/evidence/TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1')
const logs = path.join(ev, 'mutation-logs')

const FILES = [
  'src/audio/bgm.glm-audio-lifecycle.test.ts',
  'src/audio/midi-preview.glm-audio-lifecycle.test.ts',
  'src/audio/sfx-readiness.glm-audio-lifecycle.test.ts',
]

const run = (file, args, out) => {
  let stdout = ''
  let exit = 0
  try {
    stdout = execFileSync('pnpm', ['exec', 'vitest', 'run', file, ...args], {
      cwd: reforge,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 240_000,
    })
  } catch (error) {
    stdout = `${error.stdout ?? ''}${error.stderr ?? ''}`
    exit = error.status ?? 1
  }
  writeFileSync(out, `${stdout.replace(/\n+$/, '')}\n`)
  const sha = createHash('sha256').update(readFileSync(out)).digest('hex')
  const testsLine = stdout.match(/Tests\s+([^\n]+)/)?.[1]?.trim() ?? ''
  return { exit, testsLine, sha, stdout }
}

const firstFailureOf = (stdout) =>
  stdout
    .split('\n')
    .find((line) => line.startsWith('AssertionError') || line.startsWith('Error: ')) ?? ''

const mutate = (file, edits) => {
  const full = path.join(reforge, file)
  let source = readFileSync(full, 'utf8')
  for (const [oldText, newText] of edits) {
    if (source.split(oldText).length !== 2)
      throw new Error(`mutation anchor not unique in ${file}: ${oldText.slice(0, 60)}`)
    source = source.replace(oldText, newText)
  }
  writeFileSync(full, source)
}
const restore = (file) => {
  execFileSync('git', ['-C', root, 'checkout', '--', `packages/reforge/${file}`], {
    stdio: 'ignore',
  })
}

const needles = [
  {
    id: 'N1-resume-unlock-replays-account',
    file: 'src/audio/bgm.ts',
    edits: [
      [
        `        .then(() => {
          resuming = false
          if (!disposed && ready && last) playCurrent()
        })`,
        `        .then(() => {
          resuming = false
        })`,
      ],
    ],
    target: FILES[0],
    filter: ['-t', '挂起 ctx 上 autoplay 被拒仍完成一次静默提交'],
    mutation: 'bgm.ts resume() 解锁成功后不再补播记账曲（playCurrent 移除）',
  },
  {
    id: 'N2-same-song-repeat-restarts',
    file: 'src/audio/bgm.ts',
    edits: [
      [
        `      if (playing === asset && ctx.state === 'running') {`,
        `      if (false && playing === asset && ctx.state === 'running') {`,
      ],
    ],
    target: FILES[0],
    filter: ['-t', '运行中重复 play 同曲'],
    mutation: 'bgm.ts play() 同曲守卫永不命中 → steady-state 重复调用走完整重读/重载/重启',
  },
  {
    id: 'N3-setenabled-idempotence',
    file: 'src/audio/bgm.ts',
    edits: [
      [
        `      if (on === enabled) return // 幂等:无变化不重启/不重停(一阶段同款守卫)`,
        `      void on // 幂等:无变化不重启/不重停(一阶段同款守卫)`,
      ],
    ],
    target: FILES[0],
    filter: ['-t', '重复开不重启'],
    mutation: 'bgm.ts setEnabled() 移除同值早退 → 重复开触发重启、重复关二次 pause',
  },
  {
    id: 'N4-replace-stops-old-song',
    file: 'src/audio/midi-preview.ts',
    edits: [
      [
        `      loadedAsset = undefined
      sequencer?.pause()
      const promise = (async () => {`,
        `      loadedAsset = undefined
      const promise = (async () => {`,
      ],
      [
        `    if (!sequencer || !asset || !bytes || loadedAsset === asset) return
    sequencer.pause()
    sequencer.load(bytes.slice(0), asset)`,
        `    if (!sequencer || !asset || !bytes || loadedAsset === asset) return
    sequencer.load(bytes.slice(0), asset)`,
      ],
    ],
    target: FILES[1],
    filter: ['-t', '旧曲播放中 load 新曲'],
    mutation:
      'midi-preview.ts 替换路径两处旧曲停止（load 同步 pause + loadSequencer pause）一并移除；单删一处会被另一处互补吸收，不红',
  },
  {
    id: 'N5-replace-failure-keeps-stale-bytes',
    file: 'src/audio/midi-preview.ts',
    edits: [
      [
        `      loadedKey = undefined
      bytes = undefined
      activity = undefined
      position = 0`,
        `      loadedKey = undefined
      position = 0`,
      ],
    ],
    target: FILES[1],
    filter: ['-t', '替换读取失败'],
    mutation: 'midi-preview.ts load() 替换时不清旧 bytes/activity → 失败后旧曲成果顶替新选择',
  },
  {
    id: 'N6-mid-collection-abort',
    file: 'src/audio/sfx-readiness.ts',
    edits: [
      [
        `  const visit = async (node: unknown, where: string): Promise<void> => {
    signal.throwIfAborted()`,
        `  const visit = async (node: unknown, where: string): Promise<void> => {`,
      ],
    ],
    target: FILES[2],
    filter: ['-t', '首 root 访问完成后同步 abort'],
    mutation: 'sfx-readiness.ts visit 移除 signal.throwIfAborted() → 中途 abort 不再拦截后续 root',
  },
]

const report = {
  card: 'TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1',
  suite: '定向三文件（bgm / midi-preview / sfx-readiness .glm-audio-lifecycle.test.ts）',
  replay:
    'run-counterproof.mjs 以最终交付测试文件重放全部四态（基线绿 + 6 针红/绿 + 末次全套重放 + 产品零残留）',
  command: 'pnpm exec vitest run <file> [-t <fullName 子串>]（cwd=packages/reforge）',
  cwd: reforge,
  node: process.version,
  pnpm: execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim(),
  tmpUsage:
    '无 mkdtemp/临时目录（变异直接落跟踪文件并 git checkout 还原；清理证明 = clean-tree 检查）',
  baseline: {},
  needles: [],
  finalState: {},
}

const baseline = run(FILES[0], [...FILES.slice(1)], path.join(logs, 'green-baseline.raw'))
if (baseline.exit !== 0) throw new Error(`baseline not green: exit=${baseline.exit}`)
report.baseline = {
  state: 'clean-baseline（第一态）',
  file: 'mutation-logs/green-baseline.raw',
  sha256: baseline.sha,
  tests: baseline.testsLine,
}

for (const needle of needles) {
  mutate(needle.file, needle.edits)
  const red = run(needle.target, needle.filter, path.join(logs, `${needle.id}.red.raw`))
  restore(needle.file)
  const green = run(needle.target, needle.filter, path.join(logs, `${needle.id}.green.raw`))
  const failure = firstFailureOf(red.stdout)
  const failedTests = (red.stdout.match(/failed/g) ?? []).length
  if (red.exit === 0) throw new Error(`${needle.id}: mutant not red`)
  if (!red.testsLine.includes('1 failed'))
    throw new Error(`${needle.id}: expected exactly 1 failing test, got "${red.testsLine}"`)
  if (!failure.startsWith('AssertionError'))
    throw new Error(`${needle.id}: first failure not AssertionError: ${failure}`)
  if (green.exit !== 0) throw new Error(`${needle.id}: restored not green: exit=${green.exit}`)
  if (failedTests < 1) throw new Error(`${needle.id}: red run lacks failure marker`)
  report.needles.push({
    id: needle.id,
    mutation: needle.mutation,
    execution: `pnpm exec vitest run ${needle.target} ${needle.filter.join(' ')}（cwd=packages/reforge，变异 ${needle.file}）`,
    red: {
      state: 'red（第二态）',
      exit: red.exit,
      file: `mutation-logs/${needle.id}.red.raw`,
      sha256: red.sha,
      tests: red.testsLine,
      firstFailure: failure,
    },
    restoredGreen: {
      state: 'restored-green（第三态）',
      exit: green.exit,
      file: `mutation-logs/${needle.id}.green.raw`,
      sha256: green.sha,
      tests: green.testsLine,
    },
  })
  console.log(`${needle.id}: red(${red.exit}, ${failure.slice(0, 80)}) green(${green.exit})`)
}

const final = run(FILES[0], [...FILES.slice(1)], path.join(logs, 'final-replay.raw'))
if (final.exit !== 0) throw new Error(`final replay not green: exit=${final.exit}`)
report.finalState = {
  state: 'final-replay（第四态：全部针还原后，定向三文件整套重放）',
  file: 'mutation-logs/final-replay.raw',
  sha256: final.sha,
  tests: final.testsLine,
}

const residue = execFileSync('git', ['-C', root, 'status', '--porcelain', 'packages/'], {
  encoding: 'utf8',
})
const modifiedResidue = residue.split('\n').filter((line) => line && !line.startsWith('??'))
if (modifiedResidue.length > 0)
  throw new Error(`product residue after needles:\n${modifiedResidue.join('\n')}`)
report.cleanTree = 'clean（git status --porcelain 全仓无 M/D 残留；?? 仅本卡新增测试/证据交付文件）'

writeFileSync(path.join(ev, 'counterproof.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log('counterproof.json written')
