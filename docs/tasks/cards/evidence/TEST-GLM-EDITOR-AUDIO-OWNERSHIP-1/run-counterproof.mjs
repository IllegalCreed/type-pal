// TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1 反控三态重放脚本（证据再生用，非测试）。
// 逐针：变异产品 → 定向红（恰一指定业务 AssertionError、零 act 警告）→ git 还原 →
// 定向绿；raw 落盘统一 trimEof（恰好一个终止换行）并按落盘字节计算 sha256；
// 全部针后校验产品零残留。任何一步不符即非零退出，不产出合格回执。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../../../../..')
const editor = path.join(root, 'packages/editor')
const ev = path.join(root, 'docs/ops/tasks/evidence/TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1')
const logs = path.join(ev, 'mutation-logs')

const W_FILE = 'src/ui/AudioAssetWorkbench.glm-audio-own.test.tsx'
const P_FILE = 'src/ui/ProjectAudioPreviewButton.glm-audio-own.test.tsx'

const run = (file, args, out) => {
  let stdout = ''
  let exit = 0
  try {
    stdout = execFileSync('pnpm', ['exec', 'vitest', 'run', file, ...args], {
      cwd: editor,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 240_000,
    })
  } catch (error) {
    stdout = `${error.stdout ?? ''}${error.stderr ?? ''}`
    exit = error.status ?? 1
  }
  const actWarnings = (stdout.match(/not wrapped in act/g) ?? []).length
  writeFileSync(out, `${stdout.replace(/\n+$/, '')}\n`)
  const sha = createHash('sha256').update(readFileSync(out)).digest('hex')
  const testsLine =
    stdout.match(/Tests\s+\s*([^\n]+)/)?.[1]?.trim() ??
    stdout.match(/Tests\s+([^\n]+)/)?.[1]?.trim() ??
    ''
  return { exit, actWarnings, testsLine, sha, stdout }
}

const firstFailureOf = (stdout) =>
  stdout
    .split('\n')
    .find((line) => line.startsWith('AssertionError') || line.startsWith('Error: ')) ?? ''

const mutate = (file, oldText, newText) => {
  const full = path.join(editor, file)
  const source = readFileSync(full, 'utf8')
  if (source.split(oldText).length !== 2)
    throw new Error(`mutation anchor not unique in ${file}: ${oldText.slice(0, 60)}`)
  writeFileSync(full, source.replace(oldText, newText))
}
const restore = (file) => {
  execFileSync('git', ['-C', root, 'checkout', '--', `packages/editor/${file}`], {
    stdio: 'ignore',
  })
}

const needles = [
  {
    id: 'N1-stop-releases-owner',
    file: 'src/ui/AudioAssetWorkbench.tsx',
    old: `            playRequestRef.current++
            transport.stop()
            setPlaying(false)
            setClock(transport.snapshot())
            releaseEditorAudioPreview(previewOwner)`,
    new: `            playRequestRef.current++
            setPlaying(false)
            setClock(transport.snapshot())
            releaseEditorAudioPreview(previewOwner)`,
    target: W_FILE,
    filter: ['-t', 'W1 播放中点「停止」'],
    mutation:
      'AudioAssetWorkbench.tsx 停止按钮 handler 移除 transport.stop（真实源不停、位置不归零）',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N2-load-failure-surfacing',
    file: 'src/ui/AudioAssetWorkbench.tsx',
    old: `          if (isAbortError(cause)) return
          setStatus('error')
          setError(cause instanceof Error ? cause.message : String(cause))`,
    new: `          if (isAbortError(cause)) return
          void cause`,
    target: W_FILE,
    filter: ['-t', 'W2 合法导入但深层非 PCM'],
    mutation: 'AudioAssetWorkbench.tsx 载入 catch 吞掉 setStatus(error)/setError（失败被静默）',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N3-switch-project-disposes-old-transport',
    file: 'src/ui/AudioAssetWorkbench.tsx',
    old: `    const previous = transportLifecycleRef.current
    if (previous && previous.transport !== transport) previous.transport.dispose()`,
    new: `    const previous = transportLifecycleRef.current
    void previous`,
    target: W_FILE,
    filter: ['-t', 'W4 播放中换工程'],
    mutation: 'AudioAssetWorkbench.tsx transport 更换时不再即时 dispose 旧 transport',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N4-play-claims-ownership',
    file: 'src/ui/ProjectAudioPreviewButton.tsx',
    old: `    const request = ++requestRef.current
    setError('')
    claimEditorAudioPreview(owner)
    setState('loading')`,
    new: `    const request = ++requestRef.current
    setError('')
    setState('loading')`,
    target: P_FILE,
    filter: ['-t', 'P1 同页相邻按钮'],
    mutation: 'ProjectAudioPreviewButton.tsx play() 移除 claimEditorAudioPreview（不接管）',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N5-switch-during-loading-invalidates',
    file: 'src/ui/ProjectAudioPreviewButton.tsx',
    old: `    requestRef.current++
    transport.stop()
    releaseEditorAudioPreview(owner)
    setState('idle')
    setError('')`,
    new: `    transport.stop()
    setState('idle')
    setError('')`,
    target: P_FILE,
    filter: ['-t', 'P2b loading 中换绑定值'],
    mutation:
      'ProjectAudioPreviewButton.tsx 绑定值切换 effect 同时移除 requestRef++ 与 release 双守卫（单删其一会被另一守卫互补吸收，不红）',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N6-unmount-disposes-transport',
    file: 'src/ui/ProjectAudioPreviewButton.tsx',
    old: `      queueMicrotask(() => {
        if (transportLifecycleRef.current?.token !== token) return
        transport.dispose()
        transportLifecycleRef.current = undefined
      })`,
    new: `      queueMicrotask(() => {
        if (transportLifecycleRef.current?.token !== token) return
        transportLifecycleRef.current = undefined
      })`,
    target: P_FILE,
    filter: ['-t', 'P4 播放中卸载'],
    mutation: 'ProjectAudioPreviewButton.tsx 卸载 microtask 不再 dispose transport',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N7-play-failure-releases-owner',
    file: 'src/ui/ProjectAudioPreviewButton.tsx',
    old: `        if (request !== requestRef.current) return
        releaseEditorAudioPreview(owner)
        transport.stop()
        setState('error')`,
    new: `        if (request !== requestRef.current) return
        transport.stop()
        setState('error')`,
    target: P_FILE,
    filter: ['-t', 'P3 MIDI play 被真实降级拒绝'],
    mutation: 'ProjectAudioPreviewButton.tsx play 失败 catch 移除 releaseEditorAudioPreview',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N8-reselection-clears-error',
    file: 'src/ui/AudioAssetWorkbench.tsx',
    old: `    setStatus('loading')
    setError('')`,
    new: `    setStatus('loading')`,
    target: W_FILE,
    filter: ['-t', 'W3 载入失败后切选'],
    mutation: 'AudioAssetWorkbench.tsx 换选载入不再清空旧错误信息',
    expectFailure: 'AssertionError',
  },
]

const report = {
  card: 'TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1',
  suite: '定向两文件（AudioAssetWorkbench/ProjectAudioPreviewButton .glm-audio-own.test.tsx）',
  replay: 'run-counterproof.mjs 以最终交付测试文件重放全部三态（基线绿 + 8 针红/绿 + 产品零残留）',
  command: 'pnpm exec vitest run <file> [-t <fullName 子串>]（cwd=packages/editor）',
  cwd: editor,
  node: process.version,
  pnpm: execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim(),
  baseline: {},
  needles: [],
}

const baseline = run(W_FILE, [P_FILE], path.join(logs, 'green-baseline.raw'))
if (baseline.exit !== 0 || baseline.actWarnings !== 0)
  throw new Error(
    `baseline not green/clean: exit=${baseline.exit} warnings=${baseline.actWarnings}`,
  )
report.baseline = {
  file: 'mutation-logs/green-baseline.raw',
  sha256: baseline.sha,
  tests: baseline.testsLine,
  actWarnings: baseline.actWarnings,
}

for (const needle of needles) {
  mutate(needle.file, needle.old, needle.new)
  const red = run(needle.target, needle.filter, path.join(logs, `${needle.id}.red.raw`))
  restore(needle.file)
  const green = run(needle.target, needle.filter, path.join(logs, `${needle.id}.green.raw`))
  const failure = firstFailureOf(red.stdout)
  const failures = (red.stdout.match(/×/g) ?? []).length
  if (red.exit === 0) throw new Error(`${needle.id}: mutant not red`)
  if (failures !== 1)
    throw new Error(`${needle.id}: expected exactly 1 failing test, got ${failures}`)
  if (!failure.startsWith(needle.expectFailure))
    throw new Error(`${needle.id}: first failure not ${needle.expectFailure}: ${failure}`)
  if (red.actWarnings !== 0) throw new Error(`${needle.id}: red run has act warnings`)
  if (green.exit !== 0 || green.actWarnings !== 0)
    throw new Error(`${needle.id}: restored not green/clean: exit=${green.exit}`)
  report.needles.push({
    id: needle.id,
    mutation: needle.mutation,
    execution: `${needle.target} ${needle.filter.join(' ')}`,
    red: {
      exit: red.exit,
      file: `mutation-logs/${needle.id}.red.raw`,
      sha256: red.sha,
      tests: red.testsLine,
      firstFailure: failure,
      actWarnings: red.actWarnings,
    },
    restoredGreen: {
      exit: green.exit,
      file: `mutation-logs/${needle.id}.green.raw`,
      sha256: green.sha,
      tests: green.testsLine,
      actWarnings: green.actWarnings,
    },
  })
  console.log(`${needle.id}: red(${red.exit}, ${failure.slice(0, 80)}) green(${green.exit})`)
}

const residue = execFileSync('git', ['-C', root, 'status', '--porcelain', 'packages/'], {
  encoding: 'utf8',
})
// 只看被修改/删除的跟踪文件（M/D）；?? 为本卡新增测试文件，属交付物而非变异残留。
const modifiedResidue = residue.split('\n').filter((line) => line && !line.startsWith('??'))
if (modifiedResidue.length > 0)
  throw new Error(`product residue after needles:\n${modifiedResidue.join('\n')}`)
report.productResidue = 'clean (git status --porcelain packages/ 无 M/D 残留；?? 仅本卡新增测试)'

writeFileSync(path.join(ev, 'counterproof.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log('counterproof.json written')
