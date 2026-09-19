/** Rebuildable, read-only S1 negative controls. Each needle changes one product boundary in memory. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-simulator-s1-nc-'))
const cases = [
  {
    id: 'open',
    path: 'packages/editor/src/core/open-local.ts',
    needle: 'loadBattleSimulatorLibrary(source),',
    replacement: 'Promise.resolve(undefined),',
    file: 'src/core/battle-simulator-persistence.test.ts',
    title:
      'first use writes into the normal author transaction and formal reopen retains all four directories',
  },
  {
    id: 'preflight',
    path: 'packages/editor/src/core/project-io.ts',
    needle:
      "    parseBattleSimulatorLibrary(typeof value === 'string' ? JSON.parse(value) : value)",
    replacement: '    void value',
    file: 'src/core/battle-simulator-persistence.test.ts',
    title:
      'invalid direct write set is rejected before journal preparation and its legitimate control commits',
  },
  {
    id: 'absence',
    path: 'packages/editor/src/core/author-disk-baseline.ts',
    needle: '        observed.set(path, null)',
    replacement: '        void path',
    file: 'src/core/battle-simulator-persistence.test.ts',
    title:
      'HTTP editor reads record genuine absence and reject missing-to-present races in copy evidence',
  },
  {
    id: 'delete-after-open',
    path: 'packages/editor/src/ui/App.tsx',
    raw: true,
    occurrences: 2,
    needle: '        ...battleSimulatorRemovalPaths(savedState.battleSimulator),',
    replacement: '',
    file: 'src/core/author-save-conflict.test.ts',
    title:
      'actual App save deletes the last simulator record after reopen, then undo/save restores it',
  },
]
const hash = (path) =>
  createHash('sha256')
    .update(readFileSync(join(root, path)))
    .digest('hex')
const hashes = new Map(cases.map((c) => [c.path, hash(c.path)]))
try {
  for (const c of cases) {
    const text = readFileSync(join(root, c.path), 'utf8')
    assert.equal(text.split(c.needle).length - 1, c.occurrences ?? 1, `${c.id}: replacement census`)
    // App has save and save-as. String.replace changes ONLY the first (save) call site.
    assert.equal(
      text.replace(c.needle, c.replacement).split(c.needle).length - 1,
      (c.occurrences ?? 1) - 1,
    )
    for (const mutated of [false, true]) {
      const prefix = `${c.id}-${mutated ? 'mutant' : 'control'}`
      const config = join(output, `${prefix}.config.mjs`),
        report = join(output, `${prefix}.json`)
      writeFileSync(
        config,
        `
import { defineConfig } from ${JSON.stringify(join(root, 'node_modules/vitest/dist/config.js'))};
import { readFileSync } from 'node:fs';
const target = ${JSON.stringify(join(root, c.path))};
const needle = ${JSON.stringify(c.needle)}, replacement = ${JSON.stringify(c.replacement)};
const mutate = text => text.replace(needle, replacement);
export default defineConfig({
  root: ${JSON.stringify(join(root, 'packages/editor'))},
  plugins: [{name:'simulator-s1-negative-control',enforce:'pre',
    load(id) { if (${mutated && !!c.raw} && id === target + '?raw') return 'export default ' + JSON.stringify(mutate(readFileSync(target,'utf8'))); },
    transform(code,id) { if (${mutated && !c.raw} && id.split('?')[0] === target) return mutate(code); }
  }],
  test: { include: [${JSON.stringify(c.file)}], maxWorkers:1 }
});
`,
      )
      const result = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          config,
          '-t',
          c.title,
          '--reporter=json',
          '--outputFile',
          report,
        ],
        { cwd: root, encoding: 'utf8' },
      )
      writeFileSync(join(output, `${prefix}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}`)
      const json = JSON.parse(readFileSync(report, 'utf8'))
      const assertions = json.testResults.flatMap((file) => file.assertionResults)
      const actual = assertions.filter((entry) => entry.title === c.title)
      assert.equal(actual.length, 1, `${prefix}: exact test execution witness`)
      assert.equal(json.numRuntimeErrorTestSuites ?? 0, 0, `${prefix}: environment error`)
      if (mutated) {
        assert.equal(result.status, 1, `${prefix}: mutation escaped`)
        assert.equal(actual[0].status, 'failed')
        assert.equal(json.numFailedTests, 1)
        assert.ok(actual[0].failureMessages.length > 0)
        assert.ok(
          actual[0].failureMessages.every(
            (message) =>
              message.includes('AssertionError:') &&
              !/(ReferenceError:|TypeError:|SyntaxError:|timed out)/i.test(message),
          ),
          `${prefix}: expected assertion, not invalid setup`,
        )
      } else {
        assert.equal(result.status, 0, `${prefix}: positive control failed`)
        assert.equal(actual[0].status, 'passed')
        assert.equal(json.numPassedTests, 1)
      }
      console.log(`${prefix}: ${mutated ? 'detected (AssertionError)' : 'PASS'}`)
    }
  }
} finally {
  for (const [path, before] of hashes) assert.equal(hash(path), before, `product changed: ${path}`)
  console.log(`evidence: ${output}`)
}
