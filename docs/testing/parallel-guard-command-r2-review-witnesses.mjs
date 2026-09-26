import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Review-only isolated load edits. Never writes candidate tests, production, or coverage.
const [group, rootArg] = process.argv.slice(2)
assert.ok(['glm', 'cursor'].includes(group))
const root = resolve(rootArg)
const pkg = group === 'glm' ? 'content' : 'editor'
const prefix = group === 'glm' ? 'src/' : 'src/core/'
const suffix = group === 'glm' ? '.guard-residual.test.ts' : '.residual.test.ts'
const output = mkdtempSync(join(tmpdir(), `codex-${group}-residual-r2-`))
const transitionFrom = `throw new Error(\`\${path}.kind: 未知敌人 hook transition \${String(kind)}\`)`
const gateFrom = `if (chance > 100) throw new Error(\`\${ctx}.chance: 不得大于 100\`)`
const gateOracle = `
test('Codex oracle: the gate under test also accepts chance 100', () => {
  const input = [useEffects([{kind:'gate',chance:100}])];
  expectAcceptsUnchanged(value => validateItems(value), input);
});`
const transitionOracle = `
test('Codex oracle: rejected transition preserves its actual input', () => {
  const input = {initial:'ready',states:{ready:{body:[],next:{kind:'teleport'}}}};
  const before = structuredClone(input);
  expectExactError(() => checkEnemyHookFlow(input,'hook'), 'hook.states.ready.next.kind: 未知敌人 hook transition teleport');
  expect(input).toEqual(before);
});`
const probes =
  group === 'cursor'
    ? [
        {
          id: 'entity-legal',
          test: 'entity-commands',
          target: 'entity-commands.residual.test.ts',
          from: "    const setSprite = new SetEntitySpriteCommand('start', 'prop-chest', 'hero')",
          to: "    expect(() => assertProjectSaveValid(session.getState())).not.toThrow()\n    const setSprite = new SetEntitySpriteCommand('start', 'prop-chest', 'hero')",
          expected: 0,
        },
        {
          id: 'enemy-legal',
          test: 'battle-sprite-commands',
          target: 'battle-sprite-commands.residual.test.ts',
          from: '    const withEnemy = new AddEnemyCommand(enemy).apply(state)',
          to: '    const withEnemy = new AddEnemyCommand(enemy).apply(state)\n    expect(() => assertProjectSaveValid(withEnemy)).not.toThrow()',
          expected: 0,
        },
        {
          id: 'map-payload',
          test: 'map-asset-commands',
          target: 'map-asset-commands.ts',
          from: '    this.map = structuredClone(map)',
          to: "    this.map = structuredClone(map)\n    this.map.layers[0].name = 'CORRUPTED-LAYER-NAME'",
          expected: 1,
        },
        {
          id: 'shared-blob-loss',
          test: 'tileset-commands',
          target: 'tileset-commands.ts',
          from: '    if (this.createdAsset) delete assets[this.def.asset]',
          to: '    if (this.createdAsset) delete assets[this.def.asset]\n    delete state.assetBlobs[this.record.path]',
          expected: 1,
        },
        {
          id: 'shared-catalog-mutation',
          test: 'tileset-commands',
          target: 'tileset-commands.ts',
          from: '    this.createdAsset = !existing',
          to: "    this.createdAsset = !existing\n    if (existing) existing.label = 'CORRUPTED-SHARED-LABEL'",
          expected: 1,
        },
      ]
    : [
        {
          id: 'loop-one-axis',
          test: 'author-command',
          target: 'author-command.guard-residual.test.ts',
          from: '    const bad = { ...legalLoop(), ...over }',
          to: `    const bad = { ...legalLoop(), ...over }
      if (_label === 'loop mode 非法') { const repaired=structuredClone(bad); repaired.mode='while'; expectAcceptsUnchanged(value=>checkAuthorCommands(value,'commands'),[repaired]); }`,
          expected: 0,
        },
        {
          id: 'use-one-axis',
          test: 'record-items',
          target: 'record-items.guard-residual.test.ts',
          from: '    const bad = [sceneItem(badEffects)]',
          to: `    const bad = [sceneItem(badEffects)]
      const repaired=structuredClone(bad); const e=repaired[0].use.effects[0];
      if (_label==='runSceneHook hook 域') e.hook='onTeleport';
      if (_label==='runSceneHook 空消息') e.unavailableMessage='msg.unavailable';
      if (_label==='craftRecipe 空配方') e.recipes=[{ingredients:[{itemId:'i',count:1}],products:[{itemId:'p',count:1}]}];
      if (_label==='modifyHostileAwareness 倍率') e.rangeMultiplier=0;
      if (_label==='drawFromResourcePool 资源首尾空白') e.resource='pool.x';
      expectAcceptsUnchanged(value=>validateItems(value),repaired);`,
          expected: 0,
        },
        {
          id: 'throw-one-axis',
          test: 'record-items',
          target: 'record-items.guard-residual.test.ts',
          from: "    const bad = { target: 'oneEnemy', effects: [badEffect] }",
          to: `    const bad = { target: 'oneEnemy', effects: [badEffect] }
      const repaired=structuredClone(bad); const e=repaired.effects[0];
      if (_label==='未知元素') e.element='none';
      if (_label==='强度 bonus 负') e.strength.bonus=0;
      if (_label==='强度 multiplier kind') e.strength.multiplier.kind='uniformInt';
      if (['未知元素','强度 bonus 负','强度 multiplier kind'].includes(_label)) expectAcceptsUnchanged(value=>checkThrowSpec(value),repaired);`,
          expected: 0,
        },
        {
          id: 'initial-mutation',
          test: 'author-flow',
          target: 'author-script-core.ts',
          from: `if (!stateIds.has(initial)) throw new Error(\`\${path}.machine.initial: 未命中 state \${initial}\`)`,
          to: `if (!stateIds.has(initial)) { machine.label="MUTATED-ON-REJECTION"; throw new Error(\`\${path}.machine.initial: 未命中 state \${initial}\`) }`,
          expected: 1,
        },
        ...[false, true].map((oracle) => ({
          id: `transition-mutation${oracle ? '-oracle' : ''}`,
          test: 'enemy-hook',
          target: 'enemy-script.ts',
          from: transitionFrom,
          to: `transition.kind = 'stay'; ${transitionFrom}`,
          append: oracle ? transitionOracle : '',
          expected: oracle ? 1 : 0,
        })),
        ...[false, true].map((oracle) => ({
          id: `gate-over-reject${oracle ? '-oracle' : ''}`,
          test: 'record-items',
          target: 'validate.ts',
          from: gateFrom,
          to: `if (true) throw new Error(\`\${ctx}.chance: 不得大于 100\`)`,
          append: oracle ? gateOracle : '',
          expected: oracle ? 1 : 0,
        })),
      ]
const results = []
for (const probe of probes) {
  const target = resolve(root, `packages/${pkg}`, prefix, probe.target)
  const test = resolve(root, `packages/${pkg}`, prefix, probe.test + suffix)
  const hash = () =>
    Object.fromEntries(
      [...new Set([target, test])].map((file) => [
        file,
        createHash('sha256').update(readFileSync(file)).digest('hex'),
      ]),
    )
  const hashes = hash()
  assert.equal(
    readFileSync(target, 'utf8').split(probe.from).length,
    2,
    `${probe.id}: unique anchor`,
  )
  for (const enabled of [false, true]) {
    const name = `${probe.id}-${enabled ? 'probe' : 'control'}`
    const report = join(output, `${name}.json`),
      hit = join(output, `${name}.hit.json`),
      config = join(output, `${name}.config.mjs`)
    writeFileSync(
      config,
      `import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';
      const p=${JSON.stringify(probe)},target=${JSON.stringify(target)},test=${JSON.stringify(test)},enabled=${enabled};
      export default{root:${JSON.stringify(resolve(root, `packages/${pkg}`))},plugins:[{name:'codex-r2-review',enforce:'pre',load(id){
        if(id!==target&&id!==test)return;let text=readFileSync(id,'utf8');
        if(id===target&&enabled){assert.equal(text.split(p.from).length,2);text=text.replace(p.from,p.to);writeFileSync(${JSON.stringify(hit)},JSON.stringify({id:p.id,target}));}
        if(id===test)text+=p.append??'';return text;
      }}],test:{include:[${JSON.stringify(prefix + probe.test + suffix)}],maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
    assert.equal(run.status, enabled ? probe.expected : 0, name)
    assert.deepEqual(hash(), hashes)
    const data = JSON.parse(readFileSync(report, 'utf8'))
    assert.equal(data.numPendingTests, 0)
    assert.ok(data.numTotalTests > 0)
    assert.ok(!/Unhandled Errors?|Unhandled Rejection/.test(`${run.stdout}\n${run.stderr}`))
    assert.ok(data.testResults.every((f) => !f.message))
    const failures = data.testResults.flatMap((f) =>
      f.assertionResults
        .filter((a) => a.status === 'failed')
        .map((a) => ({ file: f.name, fullName: a.fullName, messages: a.failureMessages })),
    )
    for (const failure of failures) {
      assert.equal(failure.file, test)
      for (const msg of failure.messages) {
        assert.match(msg, /^AssertionError\b/)
        assert.doesNotMatch(msg, /timed out|(^|\n)\s*(TypeError|Error):/i)
      }
    }
    if (enabled) assert.deepEqual(JSON.parse(readFileSync(hit, 'utf8')), { id: probe.id, target })
    if (enabled && probe.expected === 1) assert.equal(failures.length, 1)
    results.push({
      name,
      exit: run.status,
      passed: data.numPassedTests,
      failed: data.numFailedTests,
      failures,
      hashes,
    })
    console.log(
      `${name}: exit${run.status} ${data.numPassedTests} passed / ${data.numFailedTests} failed`,
    )
  }
}
writeFileSync(join(output, 'summary.json'), `${JSON.stringify(results, null, 2)}\n`)
console.log(output)
