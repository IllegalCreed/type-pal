/** Reproduce the old round-budget bug without retrying the CI run until it happens to pass. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = process.cwd(),
  out = mkdtempSync(resolve(tmpdir(), 'type-pal-battle-readiness-'))
const fixture = resolve(root, 'packages/reforge/src/__tests__/battle-host-fixture.ts')
const testFile = resolve(root, 'packages/reforge/src/battle/battle-host.test.ts')
const old = execFileSync(
  'git',
  ['show', 'cb1cb26d:packages/reforge/src/__tests__/battle-host-fixture.ts'],
  { encoding: 'utf8' },
)
const title =
  'pending native IO can outlive cheap scheduler turns without making a valid battle fail'
const probe = `// @vitest-environment jsdom
import {test,expect} from 'vitest'
import {setImmediate} from 'node:timers'
import {battleHostFixture} from '../__tests__/battle-host-fixture.js'
test(${JSON.stringify(title)},async()=>{
 const f=await battleHostFixture()
 let entered=false,delivered=false
 // Scheduler stress only: turn-counting becomes cheap while real resource IO remains pending.
 f.browser.settleIO=async()=>{}
 f.fixture.hooks.read=async path=>{if(path==='assets/generated/fighter.rle'){
  entered=true;await new Promise(resolve=>setImmediate(resolve));delivered=true
 }}
 const running=f.observe(f.host.start('encounter'))
 try{
  await f.until(()=>f.host.active!==null)
  expect(entered).toBe(true);expect(delivered).toBe(true)
  expect(running.state.settled).toBe(false)
  expect(f.world()).toEqual(f.originalWorld)
 }finally{await f.close()}
})`
const rows = []
for (const version of ['before', 'after']) {
  const config = resolve(out, `${version}.config.mjs`),
    report = resolve(out, `${version}.json`)
  writeFileSync(
    config,
    `export default {
 root:${JSON.stringify(resolve(root, 'packages/reforge'))},
 plugins:[{name:'readiness-scheduling-witness',enforce:'pre',load(id){
  if(id===${JSON.stringify(testFile)})return ${JSON.stringify(probe)};
  if(${version === 'before'}&&id===${JSON.stringify(fixture)})return ${JSON.stringify(old)};
 }}],test:{include:['src/battle/battle-host.test.ts'],maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}}`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    env: preciseCoverageEnvironment(),
    encoding: 'utf8',
  })
  writeFileSync(resolve(out, `${version}.log`), `${run.stdout}\n${run.stderr}`)
  const result = JSON.parse(readFileSync(report, 'utf8'))
  const entries = result.testResults
    .flatMap((f) => f.assertionResults)
    .filter((e) => ['passed', 'failed'].includes(e.status))
  assert.equal(entries.length, 1)
  assert.equal(entries[0].fullName, title)
  assert.equal(run.status, version === 'before' ? 1 : 0)
  if (version === 'before')
    assert(entries[0].failureMessages.every((m) => m.startsWith('AssertionError:')))
  rows.push({
    version,
    exit: run.status,
    status: entries[0].status,
    failures: entries[0].failureMessages,
  })
  console.log(version, run.status, entries[0].status)
}
writeFileSync(resolve(out, 'summary.json'), JSON.stringify(rows, null, 2))
console.log(out)
