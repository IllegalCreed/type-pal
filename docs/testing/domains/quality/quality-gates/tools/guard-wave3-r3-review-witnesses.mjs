import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Reuse the previous independent runner's exact exit/hash/entered/AssertionError judge.
// Only its frozen probe table changes; the candidate and production stay untouched.
const root = resolve(process.argv[2])
const directory = dirname(fileURLToPath(import.meta.url))
const original = readFileSync(
  join(directory, 'parallel-guard-command-r2-review-witnesses.mjs'),
  'utf8',
)
const start = original.indexOf('const probes =\n')
const end = original.indexOf('const results = []\n')
assert.ok(start > 0 && end > start)
assert.equal(original.indexOf('const probes =\n', start + 1), -1)
assert.equal(original.indexOf('const results = []\n', end + 1), -1)
const transitionFrom = `throw new Error(\`\${path}.kind: 未知敌人 hook transition \${String(kind)}\`)`
const gateFrom = `if (chance > 100) throw new Error(\`\${ctx}.chance: 不得大于 100\`)`
const shapeFrom = `if (!Array.isArray(value)) throw new Error(\`\${path}: 期望 EnemyOnDefeatedCommand[]\`)`
const shapeTo = `if (!Array.isArray(value)) { if (value && typeof value === "object") Object.assign(value, { __codex_mutation: true }); throw new Error(\`\${path}: 期望 EnemyOnDefeatedCommand[]\`) }`
const shapeOracle = `
test('Codex oracle: rejected onDefeated object preserves the actual input', () => {
  const input = {};
  const before = structuredClone(input);
  expectExactError(() => checkEnemyOnDefeatedCommands(input, 'defeated'), 'defeated: 期望 EnemyOnDefeatedCommand[]');
  expect(input).toEqual(before);
});`
const probes = [
  {
    id: 'r3-gate-over-reject',
    test: 'record-items',
    target: 'validate.ts',
    from: gateFrom,
    to: `if (true) throw new Error(\`\${ctx}.chance: 不得大于 100\`)`,
    expected: 1,
  },
  {
    id: 'r3-transition-mutation',
    test: 'enemy-hook',
    target: 'enemy-script.ts',
    from: transitionFrom,
    to: `transition.kind = 'stay'; ${transitionFrom}`,
    expected: 1,
  },
  {
    id: 'r3-defeated-input-mutation',
    test: 'enemy-hook',
    target: 'enemy-script.ts',
    from: shapeFrom,
    to: shapeTo,
    expected: 0,
  },
  {
    id: 'r3-defeated-input-mutation-oracle',
    test: 'enemy-hook',
    target: 'enemy-script.ts',
    from: shapeFrom,
    to: shapeTo,
    append: shapeOracle,
    expected: 1,
  },
]
const work = mkdtempSync(join(tmpdir(), 'codex-guard-r3-runner-'))
const runner = join(work, 'witnesses.mjs')
writeFileSync(
  runner,
  `${original.slice(0, start)}const probes = ${JSON.stringify(probes)}\n${original.slice(end)}`,
)
const env = { ...process.env }
delete env.NODE_COMPILE_CACHE
const run = spawnSync(process.execPath, [runner, 'glm', root], { env, stdio: 'inherit' })
assert.equal(run.signal, null)
assert.equal(run.status, 0)
