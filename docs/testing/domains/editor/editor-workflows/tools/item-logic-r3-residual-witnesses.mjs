import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Only the two still-required R2 observations: RNG consumption and complete host-world retention.
// Reuse the original source/test hash checks, unique Vite load replacement and business-red judge.
const root = resolve(process.argv[2])
const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'item-logic-review-witnesses.mjs'),
  'utf8',
)
const probes = [
  {
    id: 'growth-extra-rng',
    file: 'effects',
    from: 'const delta = applyLevelGrowth(next, eff.levels, rng)',
    to: 'rng(); const delta = applyLevelGrowth(next, eff.levels, rng)',
    oracle: `const input=world([{itemId:'use-item',count:1}]);
      const catalog={'use-item':useItem([{kind:'levelUp',levels:1}])};
      let calls=0;
      const out=resolveWorldItemUse(input,'hero','use-item',catalog,undefined,()=>{calls++;return 0.5});
      expect(out.world.party[0].level).toBe(2);
      expect(calls).toBe(6);`,
  },
  {
    id: 'drop-external-hp',
    file: 'external',
    from: 'const consumed = consumeItem(nextWorld, itemId, item.use.consuming)',
    to: 'nextWorld.party[0].hp=0; const consumed = consumeItem(nextWorld, itemId, item.use.consuming)',
    oracle: `const input=world([{itemId:'script-item',count:1},{itemId:'potion',count:3}],83);
      input.money=37;input.resources={herb:2};input.learnedSkills={hero:['100']};
      const before=structuredClone(input), expected=structuredClone(input);
      expected.inventory=[{itemId:'potion',count:3}];
      const out=completeExternalWorldItemUse(input,'script-item',items);
      expect(input).toEqual(before);expect(out.world).toEqual(expected);`,
  },
]
const start = source.indexOf('const probes = [')
const end = source.indexOf('const results = []', start)
assert.ok(start > 0 && end > start)
assert.equal(source.split('const probes = [').length, 2)
assert.equal(source.split('const results = []').length, 2)
const adapted = `${source.slice(0, start)}const probes = ${JSON.stringify(probes)};\n${source.slice(end)}`
const work = mkdtempSync(join(tmpdir(), 'codex-item-r3-residual-'))
const runner = join(work, 'runner.mjs')
writeFileSync(runner, adapted)
const env = { ...process.env }
delete env.NODE_COMPILE_CACHE
const result = spawnSync(process.execPath, [runner, root], { env, stdio: 'inherit' })
assert.equal(result.signal, null)
assert.equal(result.status, 0)
