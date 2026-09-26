import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Read-only intake: source substitutions and added independent assertions exist only in Vite load.
const root = resolve(process.argv[2])
const output = mkdtempSync(join(tmpdir(), 'codex-item-logic-review-'))
const production = resolve(root, 'packages/content/src/item.ts')
const probes = [
  {
    id: 'growth-no-op',
    file: 'effects',
    from: 'const delta = applyLevelGrowth(next, eff.levels, rng)',
    to: 'const delta = {level:0,maxHP:0,maxMP:0,attack:0,magicAttack:0,defense:0,speed:0,luck:0}',
    oracle: `const input=world([{itemId:'use-item',count:1}]);
      const catalog={'use-item':useItem([{kind:'levelUp',levels:1}])};
      const before=structuredClone(input);
      const out=resolveWorldItemUse(input,'hero','use-item',catalog,undefined,()=>0.5);
      expect(input).toEqual(before);
      const expected={...before.party[0],level:2,maxHP:164,maxMP:111,attack:15,magicAttack:15,defense:13,speed:13,luck:12};
      expect(out.world.party[0]).toEqual(expected);`,
  },
  {
    id: 'drop-unrelated-inventory',
    file: 'ownership',
    from: 'return Math.max(0, Math.floor(count)) - remaining',
    to: `if (Math.max(0, Math.floor(count)) - remaining > 0) world.inventory=world.inventory.filter(e=>e.itemId===itemId);
      return Math.max(0, Math.floor(count)) - remaining`,
    oracle: `const input=world([{itemId:'bead',count:2},{itemId:'potion',count:7}]);
      const expected=structuredClone(input);expected.inventory[0].count=1;
      expect(removeOwnedItems(input,'bead',1)).toBe(1);
      expect(input).toEqual(expected);`,
  },
  {
    id: 'drop-external-money',
    file: 'external',
    from: 'const consumed = consumeItem(nextWorld, itemId, item.use.consuming)',
    to: 'nextWorld.money = 0; const consumed = consumeItem(nextWorld, itemId, item.use.consuming)',
    oracle: `const input=world([{itemId:'script-item',count:1},{itemId:'potion',count:3}]);
      input.money=37;input.resources={herb:7};input.learnedSkills={hero:['skill.kept']};
      const before=structuredClone(input), expected=structuredClone(input);
      expected.inventory=[{itemId:'potion',count:3}];
      const out=completeExternalWorldItemUse(input,'script-item',items);
      expect(input).toEqual(before);expect(out.world).toEqual(expected);`,
  },
  {
    id: 'learned-input-mutation',
    file: 'derived',
    from: 'const out = [...learned]',
    to: "const out = [...learned]; (learned as string[]).push('__codex_input_pollution')",
    oracle: `const learned=['100'];const input=char({});const catalog={};
      const before=structuredClone(learned);
      expect(effectiveSkills(learned,input,catalog)).toEqual(['100']);
      expect(learned).toEqual(before);`,
  },
  {
    id: 'throw-input-mutation',
    file: 'ownership',
    from: "if (key.trim().length === 0) throw new Error('worldResourceValue: 资源键不能为空')",
    to: "if (key.trim().length === 0) { world.money=-1; throw new Error('worldResourceValue: 资源键不能为空') }",
    oracle: `const input=world([]), before=structuredClone(input);
      expect(()=>worldResourceValue(input,'  ')).toThrow('worldResourceValue: 资源键不能为空');
      expect(input).toEqual(before);`,
  },
  {
    id: 'drop-equipped-usable',
    file: 'inventory',
    from: 'equippedUsable.push(it)',
    to: 'void it',
    oracle: `const input=world([]);input.party[0].equipment={accessory:'talisman'};
      const before=structuredClone(input);
      expect(usableItems(input,items).map(item=>item.id)).toEqual(['talisman']);
      expect(input).toEqual(before);`,
  },
]
const results = []
for (const probe of probes) {
  const test = resolve(root, `packages/content/src/item.${probe.file}.background.test.ts`)
  const paths = [
    production,
    test,
    resolve(root, 'packages/content/src/__tests__/glm-item-logic-fixtures.ts'),
  ]
  const hashes = () =>
    Object.fromEntries(
      paths.map((path) => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]),
    )
  const before = hashes()
  assert.equal(
    readFileSync(production, 'utf8').split(probe.from).length,
    2,
    `${probe.id}: unique source anchor`,
  )
  for (const oracle of [false, true]) {
    for (const mutant of [false, true]) {
      const name = `${probe.id}-${oracle ? 'oracle' : 'candidate'}-${mutant ? 'mutant' : 'control'}`
      const title = `Codex independent oracle ${probe.id}`
      const config = join(output, `${name}.config.mjs`)
      const report = join(output, `${name}.json`)
      const hit = join(output, `${name}.hit.json`)
      const append = oracle ? `\ntest(${JSON.stringify(title)},()=>{${probe.oracle}});` : ''
      writeFileSync(
        config,
        `import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';
        const target=${JSON.stringify(production)},test=${JSON.stringify(test)},p=${JSON.stringify(probe)};
        export default{root:${JSON.stringify(resolve(root, 'packages/content'))},plugins:[{name:'codex-item-review',enforce:'pre',load(id){
          if(id!==target&&id!==test)return;let text=readFileSync(id,'utf8');
          if(id===target&&${mutant}){assert.equal(text.split(p.from).length,2);text=text.replace(p.from,p.to);writeFileSync(${JSON.stringify(hit)},JSON.stringify({id:p.id,target}));}
          if(id===test)text+=${JSON.stringify(append)};return text;
        }}],test:{include:[${JSON.stringify(`src/item.${probe.file}.background.test.ts`)}],maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
      )
      const env = { ...process.env }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
        cwd: root,
        env,
        encoding: 'utf8',
        timeout: 60000,
      })
      writeFileSync(join(output, `${name}.log`), `${run.stdout}\n${run.stderr}`)
      assert.equal(run.signal, null, name)
      const data = JSON.parse(readFileSync(report, 'utf8'))
      const failures = data.testResults.flatMap((file) =>
        file.assertionResults
          .filter((a) => a.status === 'failed')
          .map((a) => ({ file: file.name, fullName: a.fullName, messages: a.failureMessages })),
      )
      assert.ok(data.numTotalTests > 0)
      assert.equal(data.numPendingTests, 0)
      assert.equal(data.numTodoTests, 0)
      assert.ok(data.testResults.every((file) => !file.message))
      assert.doesNotMatch(`${run.stdout}\n${run.stderr}`, /Unhandled Errors?|Unhandled Rejection/)
      for (const f of failures) {
        assert.equal(f.file, test)
        for (const m of f.messages) {
          assert.match(m, /^AssertionError\b/)
          assert.doesNotMatch(m, /timed out|(^|\n)\s*(TypeError|Error):/i)
        }
      }
      if (!mutant) {
        assert.equal(run.status, 0, name)
        assert.equal(failures.length, 0)
      } else {
        assert.deepEqual(JSON.parse(readFileSync(hit, 'utf8')), {
          id: probe.id,
          target: production,
        })
        assert.equal(run.status, failures.length > 0 ? 1 : 0, name)
        if (oracle) {
          assert.equal(
            failures.filter((f) => f.fullName === title).length,
            1,
            `${name}: independent oracle must reject`,
          )
        }
      }
      assert.deepEqual(hashes(), before)
      results.push({
        name,
        exit: run.status,
        total: data.numTotalTests,
        passed: data.numPassedTests,
        failed: data.numFailedTests,
        failures,
        hashes: before,
      })
      console.log(
        `${name}: exit${run.status} ${data.numPassedTests} green/${data.numFailedTests} red`,
      )
    }
  }
}
writeFileSync(join(output, 'summary.json'), `${JSON.stringify(results, null, 2)}\n`)
console.log(output)
