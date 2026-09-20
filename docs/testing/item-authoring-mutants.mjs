// Five single-point negatives for EDITOR-ITEM-AUTHORING-1. Vite load only, product hashes unchanged.
// node docs/testing/item-authoring-mutants.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const out = mkdtempSync(join(tmpdir(), 'item-authoring-mutants-'))
const uiCase = '新建后不重开即可编辑私有正文，复制使用未保存正文且副本独立'
const cases = [
  {
    name: 'missing-canonical-create',
    pkg: 'editor',
    file: 'ui/ItemTab.tsx',
    test: 'ui/ItemTab.test.tsx',
    title: uiCase,
    from: 'historyCoordinator.dispatch(\n        new AddItemDefinitionCommand(created),\n        new AddItemCommand(created),\n      )',
    to: 'session.dispatch(new AddItemCommand(created))',
  },
  {
    name: 'copied-source-owner',
    pkg: 'editor',
    file: 'ui/ItemTab.tsx',
    test: 'ui/ItemTab.test.tsx',
    title: uiCase,
    from: 'new AddItemCommand(projectItemsView({ [copy.id]: copy })[copy.id]!, at)',
    to: 'new AddItemCommand({...projectItemsView({ [copy.id]: copy })[copy.id]!, use: source.use}, at)',
  },
  {
    name: 'shared-prefix-misroute',
    pkg: 'reforge',
    file: 'item-use-executor.ts',
    test: 'item-script-identity.test.ts',
    title:
      'real item executor and script runtime distinguish shared/private flags and commit item consumption',
    from: 'await runtime.runSharedScript(ref.id, options)',
    to: "if(ref.id.startsWith('item:')) await runtime.runItemPrivateScript(items,itemId,'use',options); else await runtime.runSharedScript(ref.id,options)",
  },
  {
    name: 'shared-chunk-validation',
    pkg: 'content',
    runner: 'editor',
    file: 'validate-refs.ts',
    test: 'core/item-authoring-workflows.test.ts',
    title:
      'shared shared/plain survives diagnostics and serialization; missing ID is reported verbatim',
    from: 'Object.hasOwn(b.sharedScripts ?? {}, effect.script)',
    to: 'Object.hasOwn(b.sharedScripts ?? {}, effect.script.id)',
  },
  {
    name: 'missing-body-save-guard',
    pkg: 'editor',
    file: 'core/script-editor-projection.ts',
    test: 'core/item-authoring-workflows.test.ts',
    title:
      'second-side failure preserves both records and redo; missing private body and foreign owner fail closed',
    from: 'if (!bodyPresent) {',
    to: 'if (false && !bodyPresent) {',
  },
]
const files = [...new Set(cases.map((c) => join(root, 'packages', c.pkg, 'src', c.file)))]
const hashes = () =>
  files.map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')])
const before = hashes()
const results = []
try {
  for (const c of cases) {
    const file = join(root, 'packages', c.pkg, 'src', c.file)
    assert.equal(
      readFileSync(file, 'utf8').split(c.from).length,
      2,
      `${c.name}: exactly one replacement`,
    )
    for (const mutant of [false, true]) {
      const name = `${c.name}-${mutant ? 'mutant' : 'control'}`
      const config = join(out, `${name}.config.mjs`),
        json = join(out, `${name}.json`),
        log = join(out, `${name}.log`)
      const runner = c.runner ?? c.pkg
      writeFileSync(
        config,
        `import {readFileSync} from 'node:fs';
export default {root:${JSON.stringify(join(root, 'packages', runner))},plugins:[{name:'item-authoring-negative',enforce:'pre',load(id){if(id.split('?')[0]!==${JSON.stringify(file)})return;const source=readFileSync(${JSON.stringify(file)},'utf8');return ${mutant ? `source.replace(${JSON.stringify(c.from)},${JSON.stringify(c.to)})` : 'source'};}}],test:{include:[${JSON.stringify(`src/${c.test}`)}],maxWorkers:1,fileParallelism:false}};`,
      )
      const run = spawnSync(
        'pnpm',
        [
          '--filter',
          `@type-pal/${runner}`,
          'exec',
          'vitest',
          'run',
          '--config',
          config,
          '--testNamePattern',
          `${c.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          '--reporter=default',
          '--reporter=json',
          '--outputFile.json',
          json,
        ],
        { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 },
      )
      const output = (run.stdout ?? '') + (run.stderr ?? '')
      writeFileSync(log, output)
      assert.equal(run.error, undefined, log)
      assert.equal(run.signal, null, log)
      const report = JSON.parse(readFileSync(json, 'utf8'))
      const active = report.testResults
        .flatMap((suite) => suite.assertionResults)
        .filter((test) => test.status === 'passed' || test.status === 'failed')
      assert.equal(active.length, 1, `${log}: exactly one named candidate executed`)
      assert.equal(active[0].title, c.title, log)
      assert.equal(run.status, mutant ? 1 : 0, log)
      assert.equal(active[0].status, mutant ? 'failed' : 'passed', log)
      assert.doesNotMatch(
        output,
        /TypeError|ReferenceError|SyntaxError|Test timed out|Unhandled Errors/,
        log,
      )
      if (mutant)
        assert.ok(
          active[0].failureMessages.every((message) => /^AssertionError:/.test(message)),
          `${log}: genuine candidate assertion`,
        )
      results.push({ name, exit: run.status, title: c.title, log, json })
    }
  }
} finally {
  assert.deepEqual(hashes(), before, 'product files changed')
}
console.log(JSON.stringify({ out, results, unchangedProductHashes: before }, null, 2))
