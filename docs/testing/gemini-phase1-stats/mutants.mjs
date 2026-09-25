import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../../..')
const baseConfig = path.join(here, 'vitest.config.mts')

const cases = [
  {
    id: 'M1_E4_PART_OFFSET',
    file: 'packages/game/src/core/equip-effect.ts',
    testFile: 'tests/e4-run-equip-script.test.ts',
    title: 'E4-01 goto 跳转跳过中间指令，只执行跳转目标的写入',
    from: `        case 0x17: {\n          // sdlpal script.c:752-766 真值:p[op[1] * MAX + role] = SHORT(op[2]); i = op[0] - 0xB\n          const partIdx = (a ?? 0) - 0x0b`,
    to: `        case 0x17: {\n          // sdlpal script.c:752-766 真值:p[op[1] * MAX + role] = SHORT(op[2]); i = op[0] - 0xB\n          const partIdx = (a ?? 0)`,
  },
  {
    id: 'M2_E6_EFFECTIVE_ATK',
    file: 'packages/game/src/core/equip-effect.ts',
    testFile: 'tests/e6-resync-battle-role-stats.test.ts',
    title: 'E6-02 完整同步等级、最大生命/真气与经装备修正的有效属性',
    from: 'role.attackStrength = getPlayerAttackStrength(gs, roleId)',
    to: 'role.attackStrength = rt.rgwAttackStrength[roleId] ?? role.attackStrength',
  },
  {
    id: 'M3_E6_PRESERVE_LIVE_HP',
    file: 'packages/game/src/core/equip-effect.ts',
    testFile: 'tests/e6-resync-battle-role-stats.test.ts',
    title: 'E6-01 战内 live 当前生命与真气绝不被覆盖',
    from: 'role.maxHP = rt.rgwMaxHP[roleId] ?? role.maxHP',
    to: 'role.maxHP = rt.rgwMaxHP[roleId] ?? role.maxHP; role.hp = rt.rgwHP[roleId] ?? role.hp',
  },
  {
    id: 'M4_I1_SLOT_ROLE_CONFUSION',
    file: 'packages/game/src/core/inspect/battle-inspect.ts',
    testFile: 'tests/i1-party-status-readouts.test.ts',
    title: 'I1-01 槽位 slot 与 roleId 严格分离，映射各自独立的数据',
    from: 'const roleId = battlePlayer?.roleId ?? partyRoleId',
    to: 'const roleId = slot',
  },
]

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function assertUniqueNeedle(spec) {
  const text = fs.readFileSync(path.join(repo, spec.file), 'utf8')
  const count = text.split(spec.from).length - 1
  if (count !== 1) throw new Error(`${spec.id} needle count ${count} in ${spec.file}`)
}

function writeMutantConfig(spec) {
  const configPath = path.join(here, `.mutant-${spec.id}.mts`)
  const source = JSON.stringify(path.join(repo, spec.file))
  const contents = `import path from 'node:path'
import { defineConfig } from 'vitest/config'

const sourceFile = ${source}
const needle = ${JSON.stringify(spec.from)}
const replacement = ${JSON.stringify(spec.to)}

export default defineConfig({
  root: ${JSON.stringify(here)},
  plugins: [
    {
      name: 'gemini-single-point-mutant',
      enforce: 'pre',
      transform(code, id) {
        const file = id.split('?')[0]
        if (file !== sourceFile) return null
        const count = code.split(needle).length - 1
        if (count !== 1) throw new Error('mutant needle count ' + count + ' in ' + file)
        return code.replace(needle, replacement)
      },
    },
  ],
  resolve: {
    alias: {
      '@type-pal/shared': path.join(${JSON.stringify(repo)}, 'packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: [path.join(${JSON.stringify(repo)}, 'packages/game/vitest.setup.ts')],
    include: [${JSON.stringify(spec.testFile)}],
    fileParallelism: false,
    maxWorkers: 1,
  },
})
`
  fs.writeFileSync(configPath, contents)
  return configPath
}

function runVitest(config, spec) {
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE
  const result = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', '--config', config, '--reporter=verbose', '-t', spec.title],
    { cwd: repo, env, encoding: 'utf8' },
  )
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  const log = path.join('/tmp', `gemini-stats-mutant-${spec.id}-${path.basename(config)}.log`)
  fs.writeFileSync(log, output)
  return { status: result.status, output, log }
}

function hashes() {
  return Object.fromEntries(cases.map((spec) => [spec.file, sha256(path.join(repo, spec.file))]))
}

const before = hashes()
const report = []
for (const spec of cases) {
  assertUniqueNeedle(spec)
  const green = runVitest(baseConfig, spec)
  if (
    green.status !== 0 ||
    !green.output.includes(spec.title) ||
    !green.output.includes('passed')
  ) {
    throw new Error(`${spec.id} green control failed\n${green.output}`)
  }
  const configPath = writeMutantConfig(spec)
  let red
  try {
    red = runVitest(configPath, spec)
  } finally {
    fs.rmSync(configPath, { force: true })
  }
  const businessRed =
    red.status === 1 &&
    red.output.includes('AssertionError') &&
    red.output.includes(spec.title) &&
    red.output.includes('1 failed')
  if (!businessRed) throw new Error(`${spec.id} mutant was not a business failure\n${red.output}`)
  report.push({
    id: spec.id,
    title: spec.title,
    file: spec.file,
    greenExit: green.status,
    redExit: red.status,
    greenLog: green.log,
    redLog: red.log,
  })
}
const after = hashes()
if (JSON.stringify(before) !== JSON.stringify(after)) {
  throw new Error(`source hash changed\n${JSON.stringify({ before, after }, null, 2)}`)
}
console.log(JSON.stringify({ hashes: after, report }, null, 2))
