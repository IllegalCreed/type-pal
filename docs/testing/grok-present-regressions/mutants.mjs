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
    id: 'P02',
    file: 'packages/game/src/present/menu/draw-inventory.ts',
    testFile: 'tests/p02-inventory-target.test.ts',
    title: 'P02 使用目标数量读gs现行库存而不是开菜单时的快照',
    from: 'const invEntry = gs.inventory.find((e) => e.itemId === selectedItem.id)',
    to: 'const invEntry = state.inventory.find((e) => e.itemId === selectedItem.id)',
  },
  {
    id: 'P05',
    file: 'packages/game/src/present/menu/draw-menu.ts',
    testFile: 'tests/p05-menu-stack.test.ts',
    title: 'P05 物品、图标和角色经公开菜单栈传到真实下层',
    from: `        itemIcons: extra?.itemIcons,
        glyphs,
        gs,
        playerRoles: extra?.playerRoles,`,
    to: `        itemIcons: undefined,
        glyphs,
        gs,
        playerRoles: extra?.playerRoles,`,
  },
  {
    id: 'P10',
    file: 'packages/game/src/assets/png.ts',
    testFile: 'tests/p10-indexed-png.test.ts',
    title: 'P10 解码失败不持有bitmap，getImageData或drawImage失败仍关闭',
    from: '    bitmap.close()',
    to: '    void bitmap',
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
      name: 'grok-single-point-mutant',
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
  const log = path.join('/tmp', `grok-present-mutant-${spec.id}-${path.basename(config)}.log`)
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
