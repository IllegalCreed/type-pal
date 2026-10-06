// TEST-GLM-EDITOR-BATTLE-REGISTRY-1 反控三态重放脚本（证据再生用，非测试）。
// 逐针：变异产品 → 定向红（恰一指定业务失败、零 act 警告）→ git 还原 → 定向绿；
// raw 落盘统一 trimEof（恰好一个终止换行）并按落盘字节计算 sha256；全部针后校验产品零残留。
// 任何一步不符即非零退出，不产出合格回执。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../../../../')
const editor = path.join(root, 'packages/editor')
const ev = path.join(root, 'docs/ops/evidence/TEST-GLM-EDITOR-BATTLE-REGISTRY-1')
const logs = path.join(ev, 'mutation-logs')

const L_FILE = 'src/ui/BattleSpriteLibrary.glm-battle-registry.test.tsx'
const G_FILE = 'src/ui/SpriteFrameDeletion.glm-battle-registry.test.ts'
const T_FILE = 'src/ui/EnemyTeamTab.glm-battle-registry.test.tsx'

const run = (files, args, out) => {
  let stdout = ''
  let exit = 0
  try {
    stdout = execFileSync('pnpm', ['exec', 'vitest', 'run', ...files, ...args], {
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
    id: 'N1-beginusage-proof-gate',
    file: 'src/ui/BattleSpriteLibrary.tsx',
    old: `    if (!record || record.kind !== 'battle-sprite' || !proofReady || !actualFrameCount) {
      reportError(new Error('帧源尚未完成解码校验，请稍后再新增用途。'))`,
    new: `    if (!record || record.kind !== 'battle-sprite') {
      reportError(new Error('帧源尚未完成解码校验，请稍后再新增用途。'))`,
    target: L_FILE,
    filter: ['-t', 'BR-01'],
    mutation:
      'BattleSpriteLibrary.tsx beginUsage 移除解码证明门（!proofReady/!actualFrameCount），扣留期不再拒绝',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N2-delete-fail-closed-on-missing-bytes',
    file: 'src/ui/BattleSpriteLibrary.tsx',
    old: `      const bytes = await props.assetReader.readBytes(selectedAsset, 'battle-sprite')
      await decodeBattleSpriteAssetBytes(record, bytes, \`删除前校验 \${selectedAsset}\`)`,
    new: `      const bytes = new ArrayBuffer(0)`,
    target: L_FILE,
    filter: ['-t', 'BR-02'],
    mutation:
      'BattleSpriteLibrary.tsx deleteAsset 跳过删除前真实读取与解码校验（伪造空字节直接提交删除）',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N3-frame-deletion-plan-guard',
    file: 'src/ui/BattleSpriteLibrary.tsx',
    old: `  if (!Number.isInteger(deletedIndex) || deletedIndex < 0 || deletedIndex >= previousFrameCount)
    throw new Error('待删除的战斗精灵帧不存在')`,
    new: ``,
    target: G_FILE,
    filter: ['-t', 'BR-04'],
    mutation: 'BattleSpriteLibrary.tsx planBattleSpriteFrameDeletion 移除越界/非整数帧号守卫',
    expectFailure: 'AssertionError',
  },
  {
    id: 'N4-teamtab-deeplink-sync',
    file: 'src/ui/EnemyTeamTab.tsx',
    old: `  useEffect(() => {
    if (focusObjectId && enemyTeams.some((team) => team.id === focusObjectId)) {
      setSelectedId(focusObjectId)
      setCreating(false)
    }
  }, [enemyTeams, focusObjectId])`,
    new: `  useEffect(() => {
    void focusObjectId
  }, [enemyTeams, focusObjectId])`,
    target: T_FILE,
    filter: ['-t', 'BR-05'],
    mutation: 'EnemyTeamTab.tsx focusObjectId 受控效果改为空体（深链不再同步选择/收起创建卡）',
    expectFailure: 'AssertionError',
  },
]

const report = {
  card: 'TEST-GLM-EDITOR-BATTLE-REGISTRY-1',
  suite:
    '定向三文件（BattleSpriteLibrary / SpriteFrameDeletion / EnemyTeamTab .glm-battle-registry）',
  replay: 'run-counterproof.mjs 以最终交付测试文件重放全部三态（基线绿 + 4 针红/绿 + 产品零残留）',
  command: 'pnpm exec vitest run <files> [-t <fullName 子串>]（cwd=packages/editor）',
  cwd: editor,
  node: process.version,
  pnpm: execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim(),
  baseline: {},
  needles: [],
}

const baseline = run([L_FILE, G_FILE, T_FILE], [], path.join(logs, 'green-baseline.raw'))
if (baseline.exit !== 0 || baseline.actWarnings !== 0)
  throw new Error(
    `baseline not green/clean: exit=${baseline.exit} warnings=${baseline.actWarnings}`,
  )
if (!baseline.testsLine.includes('4 passed')) throw new Error('baseline must run 4 tests')
report.baseline = {
  file: 'mutation-logs/green-baseline.raw',
  sha256: baseline.sha,
  tests: baseline.testsLine,
  actWarnings: baseline.actWarnings,
}

for (const needle of needles) {
  mutate(needle.file, needle.old, needle.new)
  const red = run([needle.target], needle.filter, path.join(logs, `${needle.id}.red.raw`))
  restore(needle.file)
  const green = run([needle.target], needle.filter, path.join(logs, `${needle.id}.green.raw`))
  const failure = firstFailureOf(red.stdout)
  const failures = (red.stdout.match(/×/g) ?? []).length
  if (red.exit === 0) throw new Error(`${needle.id}: mutant not red`)
  // vitest -t 零匹配也 exit 0：必须实证红跑真的执行了用例并恰好 1 红（× 计数兜底）。
  if (!red.testsLine.includes('1 failed') || /2 failed|3 failed|4 failed/.test(red.testsLine))
    throw new Error(`${needle.id}: red tests line abnormal: ${red.testsLine}`)
  if (failures !== 1)
    throw new Error(`${needle.id}: expected exactly 1 failing test, got ${failures}`)
  if (!failure.startsWith(needle.expectFailure))
    throw new Error(`${needle.id}: first failure not ${needle.expectFailure}: ${failure}`)
  if (red.actWarnings !== 0) throw new Error(`${needle.id}: red run has act warnings`)
  if (green.exit !== 0 || green.actWarnings !== 0 || !green.testsLine.includes('1 passed'))
    throw new Error(
      `${needle.id}: restored not green/clean: exit=${green.exit} tests=${green.testsLine}`,
    )
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
