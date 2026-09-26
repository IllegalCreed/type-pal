import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../..', import.meta.url)))
const game = join(root, 'packages/game')
const test = join(game, 'src/core/dependency-ownership.test.ts')
const temp = mkdtempSync(join(tmpdir(), 'type-pal-d1-mutants-'))
const prefix = 'D1 shared-state ownership after dependency split '
const needles = [
  {
    id: 'catalog-copy',
    file: 'script-catalog.ts',
    from: '_globalCommands = commands',
    to: '_globalCommands = commands.slice()',
    title:
      'catalog keeps the actual patched command array and publishes replacements through both entrypoints',
  },
  {
    id: 'map-write-lost',
    file: 'scene-identity.ts',
    from: '_currentMapNum = n',
    to: '_currentMapNum = 0',
    title: 'event history consumes the latest map written through either scene identity entrypoint',
  },
  {
    id: 'poison-runner-lost',
    file: 'player-poison-state.ts',
    from: 'playerScript > 0 && runPoisonEntry ? runPoisonEntry(playerScript) : playerScript',
    to: 'playerScript',
    title:
      'lower poison and catalog owners are consumed synchronously by the original equipment runner',
  },
]
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
const paths = needles.map((n) => join(game, 'src/core', n.file))
const originalHashes = paths.map(hash)
const results = []
function run(needle) {
  const id = needle?.id ?? 'control'
  const json = join(temp, `${id}.json`),
    config = join(temp, `${id}.config.mts`)
  let plugin = ''
  if (needle) {
    const product = join(game, 'src/core', needle.file)
    assert.equal(readFileSync(product, 'utf8').split(needle.from).length, 2, `${id}: unique anchor`)
    plugin = `plugins:[{name:'d1-'+${JSON.stringify(id)},enforce:'pre',load(id){
      if(id.split('?')[0]!==${JSON.stringify(product)})return;
      const source=readFileSync(${JSON.stringify(product)},'utf8');
      if(source.split(${JSON.stringify(needle.from)}).length!==2)throw Error('nonunique mutation');
      console.log('D1_MUTATION_HIT '+${JSON.stringify(id)});
      return source.replace(${JSON.stringify(needle.from)},${JSON.stringify(needle.to)});
    }}],`
  }
  writeFileSync(
    config,
    `import {readFileSync} from 'node:fs';
    export default {root:${JSON.stringify(game)},${plugin}test:{environment:'jsdom',
    setupFiles:[${JSON.stringify(join(game, 'vitest.setup.ts'))}],include:[${JSON.stringify(test)}],maxWorkers:1}};`,
  )
  const title = needle ? prefix + needle.title : undefined
  const args = [
    '--filter',
    '@type-pal/game',
    'exec',
    'vitest',
    'run',
    '--config',
    config,
    '--reporter=json',
    `--outputFile=${json}`,
  ]
  if (title) args.push('-t', `^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE
  const execution = spawnSync('pnpm', args, {
    cwd: root,
    encoding: 'utf8',
    env,
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  })
  const log = `${execution.stdout ?? ''}\n${execution.stderr ?? ''}`
  writeFileSync(join(temp, `${id}.log`), log)
  assert.equal(execution.error, undefined, `${id}: runner failed`)
  const result = JSON.parse(readFileSync(json, 'utf8'))
  const executed = result.testResults.flatMap((s) =>
    s.assertionResults
      .filter((a) => a.status === 'passed' || a.status === 'failed')
      .map((a) => ({ ...a, file: s.name })),
  )
  if (!needle) {
    assert.equal(execution.status, 0, log)
    assert.equal(executed.length, 8)
    assert(executed.every((a) => a.status === 'passed' && a.file === test))
  } else {
    assert.equal(execution.status, 1, `${id}: must be exit1`)
    assert.equal(executed.length, 1, `${id}: exact named execution`)
    const failed = executed[0]
    assert.equal(failed.file, test)
    assert.equal(failed.fullName, title)
    assert.equal(failed.status, 'failed')
    assert(failed.failureMessages.length > 0)
    assert(
      failed.failureMessages.every(
        (m) =>
          /^AssertionError:/.test(m) &&
          !/^(?!\s*at\b).*\b(?:timed out|ReferenceError:|TypeError:)/im.test(m),
      ),
    )
    assert(log.includes(`D1_MUTATION_HIT ${id}`))
  }
  assert.deepEqual(paths.map(hash), originalHashes, 'product files must be unchanged')
  results.push({
    id,
    exit: execution.status,
    executed: executed.length,
    verdict: needle ? 'detected' : 'passed',
  })
}
run()
for (const needle of needles) run(needle)
console.log(JSON.stringify({ temp, results, originalHashes }, null, 2))
