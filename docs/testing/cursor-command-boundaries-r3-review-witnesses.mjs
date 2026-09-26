import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const probes = [
  {
    id: 'entity-fixture',
    test: 'entity-commands',
    target: 'entity-commands.residual.test.ts',
    from: "    const setSprite = new SetEntitySpriteCommand('start', 'prop-chest', 'hero')",
    to: "    expect(() => assertProjectSaveValid(session.getState())).not.toThrow()\n    const setSprite = new SetEntitySpriteCommand('start', 'prop-chest', 'hero')",
    prefix: "import { assertProjectSaveValid } from './project-diagnostics.js'\n",
  },
  {
    id: 'enemy-fixture',
    test: 'battle-sprite-commands',
    target: 'battle-sprite-commands.residual.test.ts',
    from: '    const withEnemy = new AddEnemyCommand(enemy).apply(state)',
    to: '    const withEnemy = new AddEnemyCommand(enemy).apply(state)\n    expect(() => assertProjectSaveValid(withEnemy)).not.toThrow()',
    prefix: "import { assertProjectSaveValid } from './project-diagnostics.js'\n",
  },
  {
    id: 'map-payload',
    test: 'map-asset-commands',
    target: 'map-asset-commands.ts',
    from: '    this.map = structuredClone(map)',
    to: "    this.map = structuredClone(map)\n    this.map.layers[0].name = 'CORRUPTED-LAYER-NAME'",
  },
]

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2])
  const here = dirname(fileURLToPath(import.meta.url))
  const output = mkdtempSync(join(tmpdir(), 'codex-cursor-boundaries-r3-'))
  const rows = []
  for (const probe of probes) {
    const file = resolve(root, 'packages/editor/src/core', probe.target)
    const hash = () => createHash('sha256').update(readFileSync(file)).digest('hex')
    const before = hash()
    for (const enabled of [false, true]) {
      const name = `${probe.id}-${enabled ? 'probe' : 'control'}`
      const report = join(output, `${name}.json`)
      const env = {
        ...process.env,
        BOUNDARY_REVIEW_ROOT: root,
        BOUNDARY_REVIEW_ID: probe.id,
        BOUNDARY_REVIEW_ENABLED: String(enabled),
        BOUNDARY_REVIEW_REPORT: report,
        BOUNDARY_REVIEW_HIT: join(output, `${name}.hit.json`),
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          join(here, 'cursor-command-boundaries-r3-review.config.mjs'),
        ],
        {
          cwd: root,
          env,
          encoding: 'utf8',
          timeout: 60000,
        },
      )
      writeFileSync(join(output, `${name}.log`), `${run.stdout}\n${run.stderr}`)
      const data = JSON.parse(readFileSync(report, 'utf8'))
      const failed = data.testResults
        .flatMap((r) => r.assertionResults)
        .filter((r) => r.status === 'failed')
      assert.equal(run.signal, null)
      assert.equal(hash(), before)
      assert.equal(data.numPendingTests, 0)
      assert.ok(data.numTotalTests > 0)
      if (!enabled) assert.equal(run.status, 0)
      else
        assert.deepEqual(JSON.parse(readFileSync(env.BOUNDARY_REVIEW_HIT, 'utf8')), {
          id: probe.id,
          file,
        })
      rows.push({
        name,
        exit: run.status,
        passed: data.numPassedTests,
        failed: data.numFailedTests,
        failures: failed.map((r) => ({ fullName: r.fullName, messages: r.failureMessages })),
      })
      console.log(
        `${name}: exit=${run.status}, ${data.numPassedTests} green/${data.numFailedTests} red`,
      )
    }
  }
  writeFileSync(join(output, 'summary.json'), JSON.stringify(rows, null, 2))
  console.log(output)
}
