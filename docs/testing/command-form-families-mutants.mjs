/** Isolated real-module mutations for B3 command-form families and the author bridge. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packageRoot = resolve(root, 'packages/editor')
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-command-form-families-mutants-'))
const tests = {
  behavior: 'ui/CommandForm.current-characterization.test.tsx',
  loadScene: 'ui/CommandForm.test.ts',
  bridge: 'ui/command-form-contract.test.ts',
}
const mutations = [
  {
    id: 'dialogue-actor-portrait-reset',
    source: 'ui/command-form-dialogue.tsx',
    test: tests.behavior,
    title: '当前对话身份表单 切换人物会清除旧人物的表情引用',
    from: '                        actor,\n                        ...(identity.speakerOverride',
    to: '                        actor,\n                        ...(identity.portrait ? { portrait: identity.portrait } : {}),\n                        ...(identity.speakerOverride',
  },
  {
    id: 'dialogue-single-row-delete',
    source: 'ui/command-form-dialogue.tsx',
    test: tests.behavior,
    title: '脚本指令同项动作组 单行对话保留禁用删除并给出可见原因',
    from: 'const deleteDisabled = cue.rows.length === 1',
    to: 'const deleteDisabled = false',
  },
  {
    id: 'dialogue-delete-selection',
    source: 'ui/command-form-dialogue.tsx',
    test: tests.behavior,
    title: '脚本指令同项动作组 对话速度字段与纯图标动作分离，并保留原有行级更新语义',
    from: 'rows: cue.rows.filter((_row, rowIndex) => rowIndex !== index)',
    to: 'rows: cue.rows.filter((_row, rowIndex) => rowIndex === index)',
  },
  {
    id: 'actor-party-remove',
    source: 'ui/command-form-actor.tsx',
    test: tests.behavior,
    title: '脚本指令同项动作组 队伍成员移动与移出使用一致的纯图标危险动作',
    from: 'members.filter((_, j) => j !== i)',
    to: 'members.filter((_, j) => j === i)',
  },
  {
    id: 'actor-condition-default-turns',
    source: 'ui/command-form-actor.tsx',
    test: tests.behavior,
    title: '角色当前状态命令表单 切换类型重建 exact condition，不保留上一类型字段',
    from: "set({ condition: { kind, status: 'protect', turns: 7 } })",
    to: "set({ condition: { kind, status: 'protect', turns: 8 } })",
  },
  {
    id: 'world-wait-commit',
    source: 'ui/command-form-world.tsx',
    test: tests.behavior,
    title:
      "CommandForm commit characterization number empty string commits Number('') === 0 immediately",
    from: '<Num value={cmd.ms} onChange={(n) => set({ ms: n })} step={40} />',
    to: '<Num value={cmd.ms} onChange={(n) => set({ ms: n + 1 })} step={40} />',
  },
  {
    id: 'world-fade-commit',
    source: 'ui/command-form-world.tsx',
    test: tests.behavior,
    title: 'CommandForm commit characterization select commits the selected string directly',
    from: "options={['in', 'out'] as const}\n              onChange={(v) => set({ dir: v })}",
    to: "options={['in', 'out'] as const}\n              onChange={() => set({ dir: cmd.dir })}",
  },
  {
    id: 'world-entity-state-commit',
    source: 'ui/command-form-world.tsx',
    test: tests.behavior,
    title:
      'CommandForm commit characterization entity state uses the shared Chinese semantic selector and preserves raw values on open',
    from: '<EntityStateSelect value={cmd.state} onChange={(state) => set({ state })} />',
    to: '<EntityStateSelect value={cmd.state} onChange={(state) => set({ state: state + 1 })} />',
  },
  {
    id: 'control-world-variable-commit',
    source: 'ui/command-form-control.tsx',
    test: tests.behavior,
    title: 'CommandForm commit characterization world variable picker commits only a registered id',
    from: 'onChange={(flag) => set({ flag })}',
    to: 'onChange={() => set({ flag: cmd.flag })}',
  },
  {
    id: 'world-load-scene-target',
    source: 'ui/command-form-world.tsx',
    test: tests.loadScene,
    title: 'W4-1 loadScene 编辑器三态 默认、命名与临时坐标只生成互斥字段',
    from: "return { kind: 'loadScene', scene, entryId: target.entryId, ...facingPatch, ...transitionPatch }",
    to: "return { kind: 'loadScene', scene, ...facingPatch, ...transitionPatch }",
  },
  {
    id: 'bridge-kind-drift',
    source: 'ui/command-form-contract.ts',
    test: tests.bridge,
    title: 'author command form bridge rejects command-kind drift at the author boundary',
    from: 'if (next.kind !== shared.kind)',
    to: 'if (next.kind === shared.kind)',
  },
  {
    id: 'bridge-dialogue-identity',
    source: 'ui/command-form-contract.ts',
    test: tests.bridge,
    title:
      'author command form bridge preserves canonical dialogue identity and rejects a runtime cue downgrade',
    from: "return command.kind !== 'dialog' || 'identity' in command.cue",
    to: 'return true',
  },
]

const clean = (value) => stripVTControlCharacters(value)
function businessRed(exit, entries, file, title) {
  const executed = entries.filter((entry) => ['passed', 'failed'].includes(entry.status))
  if (exit !== 1 || executed.length !== 1) return false
  const [entry] = executed
  return (
    entry.file === file &&
    entry.fullName === title &&
    entry.status === 'failed' &&
    entry.failureMessages.length > 0 &&
    entry.failureMessages.every(
      (message) =>
        /^AssertionError(?:\b|:)/.test(clean(message).trimStart()) &&
        !/(?:\btimeout\b|\btimed out\b|unhandled|(?:^|\n)\s*(?:Error|TypeError|RangeError):)/i.test(
          clean(message),
        ),
    )
  )
}

const sample = {
  file: '/candidate.test.ts',
  fullName: 'exact',
  status: 'failed',
  failureMessages: ['AssertionError: business difference'],
}
assert(businessRed(1, [sample], sample.file, sample.fullName))
for (const [exit, entries] of [
  [0, [sample]],
  [2, [sample]],
  [null, [sample]],
  [1, []],
  [1, [sample, sample]],
  [1, [{ ...sample, file: '/other.test.ts' }]],
  [1, [{ ...sample, fullName: 'other' }]],
  [1, [{ ...sample, status: 'pending' }]],
  [1, [{ ...sample, failureMessages: ['Error: embedded AssertionError'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: timed out'] }]],
])
  assert(!businessRed(exit, entries, sample.file, sample.fullName))

const productFiles = [
  'packages/editor/src/ui/CommandForm.tsx',
  'packages/editor/src/ui/ScriptEditor.tsx',
  'packages/editor/src/ui/command-form-actor.tsx',
  'packages/editor/src/ui/command-form-control.tsx',
  'packages/editor/src/ui/command-form-contract.ts',
  'packages/editor/src/ui/command-form-controls.tsx',
  'packages/editor/src/ui/command-form-dialogue.tsx',
  'packages/editor/src/ui/command-form-world.tsx',
]
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
const hashes = Object.fromEntries(productFiles.map((file) => [file, hash(file)]))
const rows = []
let controls

for (const mutation of [null, ...mutations]) {
  const id = mutation?.id ?? 'control'
  const report = resolve(output, `${id}.json`)
  const config = resolve(output, `${id}.config.mjs`)
  const target = mutation ? resolve(packageRoot, 'src', mutation.source) : ''
  const testFile = mutation ? resolve(packageRoot, 'src', mutation.test) : ''
  const marker = resolve(output, `${id}.entered`)
  if (mutation) {
    assert.equal(
      readFileSync(target, 'utf8').split(mutation.from).length,
      2,
      `${id}: unique needle`,
    )
    assert.equal(
      controls.filter((entry) => entry.file === testFile && entry.fullName === mutation.title)
        .length,
      1,
      `${id}: exact passing control`,
    )
  }
  const pattern = mutation
    ? `^${mutation.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
    : undefined
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const item=${JSON.stringify(mutation)},target=${JSON.stringify(target)};
export default {root:${JSON.stringify(packageRoot)},plugins:item?[{name:'command-form-family-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:${JSON.stringify(Object.values(tests).map((file) => `src/${file}`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: packageRoot,
    env: preciseCoverageEnvironment(),
    encoding: 'utf8',
  })
  const log = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
  writeFileSync(resolve(output, `${id}.log`), log)
  assert.equal(run.signal, null)
  assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(log)))
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert(
    data.testResults.every((file) => !file.message),
    `${id}: suite error`,
  )
  assert.equal(data.numTodoTests, 0)
  const entries = data.testResults.flatMap((file) =>
    file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
  )
  if (!mutation) {
    assert.equal(run.status, 0, `control: ${output}`)
    assert.equal(data.numPendingTests, 0)
    controls = entries
  } else {
    assert(businessRed(run.status, entries, testFile, mutation.title), `${id}: ${output}`)
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { id, target })
    assert.equal(data.numPendingTests, controls.length - 1)
  }
  for (const [file, expected] of Object.entries(hashes))
    assert.equal(hash(file), expected, `${id}: changed product`)
  rows.push({
    id,
    exit: run.status,
    executed: entries
      .filter((entry) => ['passed', 'failed'].includes(entry.status))
      .map(({ file, fullName, status, failureMessages }) => ({
        file,
        fullName,
        status,
        failureMessages,
      })),
  })
  console.log(`${id}: ${mutation ? 'detected' : `${entries.length} passing`}`)
}

const summary = resolve(output, 'summary.json')
writeFileSync(summary, JSON.stringify({ output, productFiles, hashes, rows }, null, 2))
console.log(summary)
