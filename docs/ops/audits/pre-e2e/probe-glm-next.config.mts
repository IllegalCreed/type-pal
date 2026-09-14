// Standalone diagnostic replay configuration, NOT production/Vitest configuration.
// node --import tsx docs/ops/audits/pre-e2e/probe-glm-next.config.mts
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const dir = mkdtempSync(join(tmpdir(), 'type-pal-b2-oracles-'))
const hash = (s: string) => createHash('sha256').update(s).digest('hex')
const replaceOne = (source: string, from: string, to: string) => {
  assert.equal(source.split(from).length, 2, `unique witness point: ${from.slice(0, 80)}`)
  return source.replace(from, to)
}
const read = (name: string) =>
  readFileSync(join(root, `docs/ops/audits/pre-e2e/probe-glm-next-${name}.mjs`), 'utf8')
const standalone = (source: string) =>
  source
    .replace(
      "const root = new URL('../../../../', import.meta.url)",
      `const root = new URL(${JSON.stringify(`file://${root}`)})`,
    )
    .replaceAll("from '../../../../packages/", `from '${root}packages/`)
    .replace(
      "from './probe-glm-next-support.mjs'",
      `from '${root}docs/ops/audits/pre-e2e/probe-glm-next-support.mjs'`,
    )
    .replace("from 'typescript'", `from '${root}node_modules/typescript/lib/typescript.js'`)

const rows: object[] = []
function run(
  name: string,
  source: string,
  id: string,
  expected: number,
  environment: Record<string, string> = {},
) {
  const path = join(dir, `${name}.mjs`)
  writeFileSync(path, standalone(source)) // generated temporary witness artifact, never product source
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', path, '--mode=contract', '--case', id],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, ...environment },
    },
  )
  const output = (result.stdout ?? '') + (result.stderr ?? '')
  writeFileSync(join(dir, `${name}.log`), output)
  assert.equal(result.signal, null, `${name}: process signal`)
  assert.equal(result.status, expected, `${name}: unexpected status; ${output.slice(-1400)}`)
  if (expected === 1) assert.match(output, /AssertionError/, `${name}: not a business assertion`)
  rows.push({
    name,
    id,
    expected,
    actual: result.status,
    sourceSha256: hash(source),
    witnessSha256: hash(readFileSync(path, 'utf8')),
    log: join(dir, `${name}.log`),
    logSha256: hash(output),
  })
}
const plugin = (from: string, to: string, suffix: string) =>
  `plugins:[{name:'codex-single-point',enforce:'pre',load(id){if(!id.endsWith(${JSON.stringify(suffix)}))return;const source=readFileSync(id,'utf8');const from=${JSON.stringify(from)};assert.equal(source.split(from).length,2,'single production point');console.log('WITNESS_HIT',id);return source.replace(from,${JSON.stringify(to)});}}],`
// A: suppress the actual main reloadMap live-map commit; the successful input must fail.
run('A-drop-live-map', read('async'), 'A01', 1, { B2_WITNESS: 'drop-live-map' })
// B: change only the actual debug registration to the existing correct zero-argument wrapper.
run('B-debug-wrapper', read('barrier'), 'B11', 0, { B2_WITNESS: 'dump-wrapper' })
// C: minimal correct write-back result, not a proposed production implementation.
let c = read('battle-result')
const loaded =
  "const { BattleSession } = await server.ssrLoadModule('/src/battle/battle-session.ts')"
c = replaceOne(
  c,
  loaded,
  `${loaded}\nBattleSession.prototype.writeBackInventory=function(inv){console.log('WITNESS_HIT writeback');inv.splice(0,inv.length,...this.state.inventory.filter(x=>x.count>0).map(x=>({...x})));}`,
)
for (const id of ['C01', 'C02', 'C07']) run(`${id}-good-writeback`, c, id, 0)
// D: ineffective engine must fail; corrected narrow routing/effect outcomes must pass.
const d = read('battle-actions')
run(
  'D-no-tick',
  replaceOne(
    d,
    loaded,
    `${loaded}\nBattleSession.prototype.tick=function(){};console.log('WITNESS_HIT no-tick')`,
  ),
  'D01',
  1,
)
const menu = replaceOne(
  d,
  'configFile: false,',
  `configFile: false,${plugin("if (this.usableItems().length) this.ui = 'miscSub'", "if (this.usableItems().length || this.throwableItems().length) this.ui = 'miscSub'", '/battle/battle-session.ts')}`,
)
run('D-parent-menu', menu, 'D09', 0)
const equiv = "for (const eff of item.use.effects) {\n    if (eff.kind === 'applyPoison')"
const silence = replaceOne(
  d,
  'configFile: false,',
  `configFile: false,${plugin(equiv, "for (const eff of item.use.effects) {\n    if(eff.kind === 'applyStatus' && eff.status === 'silence') p.status.silence=eff.turns;\n    if (eff.kind === 'applyPoison')", '/battle/battle-core.ts')}`,
)
run('D-equiv-silence', silence, 'D02', 0)
// E: permitted early rejection is an oracle outcome witness, not a completed migration guard.
let e = read('migration')
e = replaceOne(
  e,
  '  commitMigrationTransaction,',
  '  commitMigrationTransaction as originalCommitMigrationTransaction,',
)
e = replaceOne(
  e,
  'import { materializePalAssets }',
  'import { materializePalAssets as originalMaterializePalAssets }',
)
e = replaceOne(
  e,
  'const modeArg =',
  `function commitMigrationTransaction(repo,changes){if(repo==='/virtual/e02'){console.log('WITNESS_HIT conflict');throw new Error('迁移计划快照冲突')}return originalCommitMigrationTransaction(repo,changes)}
function materializePalAssets(options){if(['/virtual/e06','/virtual/e07-deep','/virtual/e07-race','/virtual/e08'].includes(options.repo)){console.log('WITNESS_HIT symlink refusal');throw new Error('物化路径不得经过符号链接')}return originalMaterializePalAssets(options)}
const modeArg =`,
)
for (const id of ['E02', 'E06', 'E07', 'E08']) run(`${id}-safe-rejection`, e, id, 0)
// F: a stale denominator cannot silently pass the baseline/source checks.
const f = replaceOne(
  read('coverage'),
  'const total = summary[pkg].total ?? summary[pkg].total',
  "const total = summary[pkg].total ?? summary[pkg].total; if(pkg==='shared')total.lines.total++",
)
run('F-wrong-denominator', f, 'F01', 1)
console.log(
  JSON.stringify(
    {
      frozenProduct: '70e3f627',
      directory: dir,
      rows,
      scope:
        '13 isolated assertions/results; no production files changed, not an implementation approval',
    },
    null,
    2,
  ),
)
