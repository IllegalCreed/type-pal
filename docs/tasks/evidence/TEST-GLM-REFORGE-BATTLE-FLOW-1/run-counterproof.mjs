// TEST-GLM-REFORGE-BATTLE-FLOW-1 反控三态重放脚本（证据再生用，非测试）。
// 逐针：变异产品 → 定向红（恰一指定业务断言失败）→ git 还原 → 定向绿；raw 落盘统一
// trimEof（恰好一个终止换行）并按落盘字节计算 sha256；四态 = 基线绿 / 各针红 / 各针
// 还原绿 / 末次全套重放。全部针后校验产品零残留（clean-tree）。本脚本不使用临时目录
// （无 mkdtemp 需清理；清理证明 = git 全仓 porcelain 无 M/D，?? 仅本卡新增交付文件）。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../../../..')
const reforge = path.join(root, 'packages/reforge')
const ev = path.join(root, 'docs/ops/evidence/TEST-GLM-REFORGE-BATTLE-FLOW-1')
const logs = path.join(ev, 'mutation-logs')

const FILES = [
  'src/battle/battle-finalization.world-result.test.ts',
  'src/battle/battle-host.finalization.test.ts',
  'src/battle/battle-session.flow-residual.test.ts',
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

const WORLD_RESULT = 'src/battle/battle-world-result.ts'
const HOST = 'src/battle/battle-host.ts'
const CORE = 'src/battle/battle-core.ts'

const needles = [
  {
    id: 'N1-victory-cash-sign',
    file: WORLD_RESULT,
    edits: [['  world.money += rewards.cash', '  world.money -= rewards.cash']],
    target: FILES[0],
    filter: ['-t', 'BF-01'],
    mutation: 'battle-world-result.ts:19 胜利现金入账符号翻转（+= → -=）',
  },
  {
    id: 'N2-exp-gate-removed',
    file: WORLD_RESULT,
    edits: [['  if (rewards.exp > 0) onExpReward()', '  onExpReward()']],
    target: FILES[0],
    filter: ['-t', 'BF-02'],
    mutation: 'battle-world-result.ts:18 经验门拆除 → exp=0 也触发经验提示/胜利曲回调',
  },
  {
    id: 'N3-settlement-screens-wiring',
    file: WORLD_RESULT,
    edits: [
      [
        '  return buildSettlementScreens(',
        '  return ((() => []) as typeof buildSettlementScreens)(',
      ],
    ],
    target: FILES[0],
    filter: ['-t', 'BF-03'],
    mutation: 'battle-world-result.ts:28 结算屏 wiring 断开 → settle 恒返回空屏序列',
  },
  {
    id: 'N4-finish-rewrites-hp-on-victory',
    file: WORLD_RESULT,
    edits: [
      [
        "  if (result !== 'victory') session.writeBackHp(world.party)",
        '  session.writeBackHp(world.party)',
      ],
    ],
    target: FILES[0],
    filter: ['-t', 'BF-04'],
    mutation: 'battle-world-result.ts:47 victory 也无条件 writeBackHp → 半恢复结果被战斗快照覆盖',
  },
  {
    id: 'N5-postbattle-condition-clear-removed',
    file: WORLD_RESULT,
    edits: [
      [
        '  clearPostBattleActorConditions(result, world.party, project.poisonsById)',
        '  void project.poisonsById',
      ],
    ],
    target: FILES[0],
    filter: ['-t', 'BF-05'],
    mutation: 'battle-world-result.ts:52 战后状态三件套清理移除 → severe 毒带出战斗',
  },
  {
    id: 'N6-money-delta-merge-removed',
    file: WORLD_RESULT,
    edits: [
      [
        '  if (session.moneyDelta() !== 0) world.money = Math.max(0, world.money + session.moneyDelta())',
        '  void session.moneyDelta()',
      ],
    ],
    target: FILES[0],
    filter: ['-t', 'BF-06'],
    mutation: 'battle-world-result.ts:49 战内金钱增减并入大世界的合并移除 → 偷得金钱丢失',
  },
  {
    id: 'N7-collect-merge-removed',
    file: WORLD_RESULT,
    edits: [
      [
        `  if (session.collectGained() > 0)
    world.collectValue = (world.collectValue ?? 0) + session.collectGained()`,
        '  void session.collectGained()',
      ],
    ],
    target: FILES[0],
    filter: ['-t', 'BF-07'],
    mutation: 'battle-world-result.ts:50-51 收妖值并入 world.collectValue 的合并移除',
  },
  {
    id: 'N8-rundefeated-not-victory-only',
    file: HOST,
    edits: [
      [
        `      if (result === 'victory')
        await this.ports.runDefeated(session.enemySlotDefs(), signal, assertCurrent)`,
        '      await this.ports.runDefeated(session.enemySlotDefs(), signal, assertCurrent)',
      ],
    ],
    target: FILES[1],
    filter: ['-t', 'BF-08'],
    mutation: 'battle-host.ts:170-171 runDefeated 不再 victory 限定 → 败/逃也跑战后脚本',
  },
  {
    id: 'N9-defeat-also-restores-music',
    file: HOST,
    edits: [["    if (result !== 'defeat') restoreMusic()", '    restoreMusic()']],
    target: FILES[1],
    filter: ['-t', 'BF-08'],
    mutation: 'battle-host.ts:179 defeat 也 restoreMusic → 战败终局多出尾部音乐事件',
  },
  {
    id: 'N10-victory-boss-flag-dropped',
    file: HOST,
    edits: [
      [
        '              this.music.victory(!!options?.boss),',
        '              this.music.victory(false),',
      ],
    ],
    target: FILES[1],
    filter: ['-t', 'BF-09'],
    mutation: 'battle-host.ts:107 options.boss 旗不传 → victory(boss) 恒收 false',
  },
  {
    id: 'N11-enemy-round-end-poison-tick-removed',
    file: CORE,
    edits: [
      [
        "      for (const e of s.enemies) if (e && e.hp > 0) tickPoisons(s, e, 'enemy')",
        '      // N11 变异：敌回合末毒 tick 移除',
      ],
    ],
    target: FILES[2],
    filter: ['-t', 'BF-11'],
    mutation: 'battle-core.ts:1142 回合末敌毒 DoT 移除 → 毒杀终局不可达',
  },
  {
    id: 'N12-flee-always-succeeds',
    file: CORE,
    edits: [['    if (!s.boss && p.fleeRate >= roll) {', '    if (!s.boss && true) {']],
    target: FILES[2],
    filter: ['-t', 'BF-12'],
    mutation: 'battle-core.ts:1961 逃跑掷骰门恒过 → 低吉运也必逃成功',
  },
]

const report = {
  card: 'TEST-GLM-REFORGE-BATTLE-FLOW-1',
  suite:
    '定向三文件（battle-finalization.world-result / battle-host.finalization / battle-session.flow-residual .test.ts）',
  replay:
    'run-counterproof.mjs 以最终交付测试文件重放全部四态（基线绿 + 12 针红/绿 + 末次全套重放 + 产品零残留）',
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
