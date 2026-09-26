import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const initialGate =
  'if (!stateIds.has(initial)) throw new Error(`${path}.machine.initial: 未命中 state ${initial}`)'
const snapshotMutation = {
  target: 'author-script-core.ts',
  from: initialGate,
  to: 'if (!stateIds.has(initial)) { machine.label = "MUTATED-ON-REJECTION"; throw new Error(`${path}.machine.initial: 未命中 state ${initial}`) }',
}

export const probes = [
  { id: 'initial-input-mutation', test: 'author-flow', edits: [snapshotMutation] },
  {
    id: 'initial-input-oracle',
    test: 'author-flow',
    edits: [snapshotMutation],
    appendix: `\ntest('Codex oracle: rejected initial preserves the actual object', () => {
      const input = legalMachine(); input.machine.initial = 'ghost';
      const before = structuredClone(input);
      expectExactError(() => checkAuthorScriptFlow(input, 'flow'), 'flow.machine.initial: 未命中 state ghost');
      expect(input).toEqual(before);
    });\n`,
  },
  {
    id: 'loop-one-axis',
    test: 'author-command',
    edits: [
      {
        target: 'author-command.guard-residual.test.ts',
        from: '    const input = [bad]',
        to: `    const input = [bad]
        if (_label === 'loop mode 非法') {
          const repaired = structuredClone(input); repaired[0].mode = 'while';
          expect(() => checkAuthorCommands(repaired, 'commands')).not.toThrow();
        }`,
      },
    ],
  },
  {
    id: 'use-one-axis',
    test: 'record-items',
    edits: [
      {
        target: 'record-items.guard-residual.test.ts',
        from: '    const bad = [useEffects([badEffect])]',
        to: `    const bad = [useEffects([badEffect])]
        const repaired = structuredClone(bad);
        const effect = repaired[0].use.effects[0];
        if (_label === 'runSceneHook hook 域') effect.hook = 'onTeleport';
        if (_label === 'runSceneHook 空消息') effect.unavailableMessage = 'msg.unavailable';
        if (_label === 'craftRecipe 空配方') effect.recipes = [{ingredients:[{itemId:'other',count:1}],products:[{itemId:'result',count:1}]}];
        if (_label === 'modifyHostileAwareness 倍率') effect.rangeMultiplier = 0;
        if (['runSceneHook hook 域', 'runSceneHook 空消息', 'craftRecipe 空配方', 'modifyHostileAwareness 倍率'].includes(_label)) {
          expect(() => validateItems(repaired)).not.toThrow();
        }`,
      },
    ],
  },
  {
    id: 'throw-one-axis',
    test: 'record-items',
    edits: [
      {
        target: 'record-items.guard-residual.test.ts',
        from: "    const bad = { target: 'oneEnemy', effects: [badEffect] }",
        to: `    const bad = { target: 'oneEnemy', effects: [badEffect] }
        const repaired = structuredClone(bad); const effect = repaired.effects[0];
        if (_label === '未知元素') effect.element = 'none';
        if (_label === '强度 bonus 负') effect.strength.bonus = 0;
        if (_label === '强度 multiplier kind') effect.strength.multiplier.kind = 'uniformInt';
        if (['未知元素', '强度 bonus 负', '强度 multiplier kind'].includes(_label)) {
          expect(() => checkThrowSpec(repaired)).not.toThrow();
        }`,
      },
    ],
  },
]

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2])
  const here = dirname(fileURLToPath(import.meta.url))
  const output = mkdtempSync(join(tmpdir(), 'codex-guard-wave3-review-'))
  const rows = []
  for (const probe of probes) {
    const hashFiles = [
      ...new Set([...probe.edits.map((e) => e.target), `${probe.test}.guard-residual.test.ts`]),
    ]
    const hashes = () =>
      Object.fromEntries(
        hashFiles.map((name) => [
          name,
          createHash('sha256')
            .update(readFileSync(resolve(root, 'packages/content/src', name)))
            .digest('hex'),
        ]),
      )
    const before = hashes()
    for (const enabled of [false, true]) {
      const name = `${probe.id}-${enabled ? 'probe' : 'control'}`
      const env = {
        ...process.env,
        GUARD_REVIEW_ROOT: root,
        GUARD_REVIEW_ID: probe.id,
        GUARD_REVIEW_ENABLED: String(enabled),
        GUARD_REVIEW_REPORT: join(output, `${name}.json`),
        GUARD_REVIEW_HIT: join(output, `${name}.hit.json`),
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        ['exec', 'vitest', 'run', '--config', join(here, 'guard-wave3-review.config.mjs')],
        { cwd: root, env, encoding: 'utf8', timeout: 60000 },
      )
      writeFileSync(join(output, `${name}.log`), `${run.stdout}\n${run.stderr}`)
      assert.equal(run.signal, null)
      assert.ok(run.status === 0 || run.status === 1)
      assert.deepEqual(hashes(), before)
      const data = JSON.parse(readFileSync(env.GUARD_REVIEW_REPORT, 'utf8'))
      assert.equal(data.numPendingTests, 0)
      assert.ok(data.numTotalTests > 0)
      if (!enabled) assert.equal(run.status, 0, `${name}: control failed`)
      else assert.equal(JSON.parse(readFileSync(env.GUARD_REVIEW_HIT, 'utf8')).id, probe.id)
      const failures = data.testResults.flatMap((f) =>
        f.assertionResults
          .filter((t) => t.status === 'failed')
          .map((t) => ({ file: f.name, fullName: t.fullName, messages: t.failureMessages })),
      )
      for (const failure of failures)
        for (const message of failure.messages) assert.match(message, /^AssertionError\b/)
      rows.push({
        name,
        exit: run.status,
        passed: data.numPassedTests,
        failed: data.numFailedTests,
        failures,
        hashes: before,
      })
      console.log(
        `${name}: exit=${run.status}, ${data.numPassedTests} green/${data.numFailedTests} red`,
      )
    }
  }
  writeFileSync(join(output, 'summary.json'), `${JSON.stringify(rows, null, 2)}\n`)
  console.log(output)
}
