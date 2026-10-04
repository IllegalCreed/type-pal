// Codex independent review probes. Candidate files are never edited; all mutations are Vite-local.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = realpathSync(process.argv[2] ?? '/Users/zhangxu/illegal/type-pal-glm-reforge-runtime')
const logs = mkdtempSync(join(tmpdir(), 'runtime-contract-review-'))
const tests = {
  bgm: ['src/audio/bgm.runtime-boundaries.test.ts'],
  midi: ['src/audio/midi-preview.lifecycle-boundaries.test.ts'],
  loader: ['src/project-loader.current-boundaries.test.ts'],
  equip: ['src/equip-menu-state.navigation-boundaries.test.ts'],
}
const cases = [
  ...Object.keys(tests).map((group) => ({ name: `control-${group}`, group })),
  {
    name: 'bgm-post-read-ownership',
    group: 'bgm',
    file: 'audio/bgm.ts',
    from: '    if (!isCurrent(serial, asset, loop)) return\n    const swap',
    to: '    WITNESS\n    const swap',
  },
  {
    name: 'midi-stale-finally',
    group: 'midi',
    file: 'audio/midi-preview.ts',
    from: 'if (loadPromise?.promise === promise) loadPromise = undefined',
    to: 'WITNESS; loadPromise = undefined',
  },
  {
    name: 'loader-projection-bypassed',
    group: 'loader',
    file: 'project-loader.ts',
    from: `return resolveAuthorDialogueTree(\n    await loadAuthorScene(project, sceneId),\n    project.actorsById,\n    \`scene \${sceneId}\`,\n  )`,
    to: 'WITNESS; return await loadAuthorScene(project, sceneId)',
  },
  {
    name: 'equip-input-pollution',
    group: 'equip',
    file: 'equip-menu-state.ts',
    from: "): EquipMenuState {\n  return {\n    active: true,\n    phase: 'list',",
    to: "): EquipMenuState {\n  world.money += 17; WITNESS;\n  return {\n    active: true,\n    phase: 'list',",
  },
]
const products = [
  ...new Set(cases.flatMap((c) => (c.file ? [join(root, 'packages/reforge/src', c.file)] : []))),
]
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const hashes = Object.fromEntries(products.map((p) => [p, hash(p)]))
const results = []
try {
  for (const item of cases) {
    const path = item.file && join(root, 'packages/reforge/src', item.file)
    if (path)
      assert.equal(readFileSync(path, 'utf8').split(item.from).length, 2, `${item.name}: one point`)
    const marker = `RR1_REVIEW_EXECUTED:${item.name}`
    const replacement = item.to?.replace('WITNESS', `console.info(${JSON.stringify(marker)})`)
    const config = join(logs, `${item.name}.config.mjs`)
    const json = join(logs, `${item.name}.json`)
    writeFileSync(
      config,
      `
import{readFileSync}from'node:fs';
export default{root:${JSON.stringify(join(root, 'packages/reforge'))},
plugins:[{name:'codex-runtime-review',enforce:'pre',load(id){
if(id.split('?')[0]!==${JSON.stringify(path ?? '')})return;
return readFileSync(${JSON.stringify(path ?? '')},'utf8').replace(${JSON.stringify(item.from ?? '')},${JSON.stringify(replacement ?? '')});
}}],test:{include:${JSON.stringify(tests[item.group])},maxWorkers:1,fileParallelism:false}};
`,
    )
    const run = spawnSync(
      'pnpm',
      [
        '--filter',
        '@type-pal/reforge',
        'exec',
        'vitest',
        'run',
        '--config',
        config,
        '--reporter=default',
        '--reporter=json',
        '--outputFile.json',
        json,
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 60_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    )
    const output = (run.stdout ?? '') + (run.stderr ?? '')
    const log = join(logs, `${item.name}.log`)
    writeFileSync(log, output)
    assert.equal(run.error, undefined, log)
    assert.equal(run.signal, null, log)
    assert.doesNotMatch(
      output,
      /TypeError|ReferenceError|SyntaxError|No test files found|Test timed out|Unhandled Errors/,
    )
    const report = JSON.parse(readFileSync(json, 'utf8'))
    const assertions = report.testResults.flatMap((suite) => suite.assertionResults)
    assert.ok(assertions.length > 0, 'must execute actual candidate tests')
    let verdict = 'control'
    if (path) {
      assert.match(
        output,
        new RegExp(`stdout \\|[^\\n]*\\n${marker}(?:\\n|$)`),
        'mutation must execute, not merely load',
      )
      if (run.status === 0) {
        assert.ok(assertions.every((a) => a.status === 'passed'))
        verdict = 'MISSED'
      } else {
        assert.equal(run.status, 1, log)
        assert.match(output, /AssertionError/, log)
        verdict = 'detected'
      }
    } else assert.equal(run.status, 0, log)
    results.push({
      name: item.name,
      tests: assertions.length,
      exit: run.status,
      verdict,
      log,
      json,
    })
    console.log(`${item.name}: ${verdict} (${assertions.length} tests, exit ${run.status})`)
  }
} finally {
  for (const [path, expected] of Object.entries(hashes))
    assert.equal(hash(path), expected, 'candidate changed')
}
console.log(JSON.stringify({ root, logs, hashes, results }, null, 2))
