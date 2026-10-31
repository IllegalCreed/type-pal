import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const base = 'b8b6989b952968ab60108ae45842ae5689822925'
const boot = 'packages/game/src/__tests__/grok-boot-mid-1/legal.ts'
const host = 'packages/game/src/__tests__/grok-render-r1/legal-host.ts'
const common = 'packages/game/src/__tests__/asset-fixtures.ts'
const before = (path) =>
  execFileSync('git', ['show', `${base}:${path}`], { cwd: root, encoding: 'utf8' })
const after = (path) => readFileSync(resolve(root, path), 'utf8')
const source = (code) => ts.createSourceFile('fixture.ts', code, ts.ScriptTarget.Latest, true)
const emit = (code) =>
  ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
const declarations = (code) => {
  // Compare ESM function bodies before CommonJS rewrites imported calls to namespace access.
  const javascript = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  const tree = source(javascript),
    printer = ts.createPrinter({ removeComments: true })
  return new Map(
    tree.statements.filter(ts.isFunctionDeclaration).map((item) => {
      const local = ts.factory.updateFunctionDeclaration(
        item,
        item.modifiers?.filter((modifier) => modifier.kind !== ts.SyntaxKind.ExportKeyword),
        item.asteriskToken,
        item.name,
        item.typeParameters,
        item.parameters,
        item.type,
        item.body,
      )
      return [item.name.text, printer.printNode(ts.EmitHint.Unspecified, local, tree)]
    }),
  )
}
const names = [
  'legalPalette',
  'legalTilemap',
  'legalEventObject',
  'legalSceneAssets',
  'twoFrameChunk',
]
function constructors(code) {
  const tree = source(code)
  const printer = ts.createPrinter({ removeComments: true })
  const selected = tree.statements.filter(
    (item) => ts.isFunctionDeclaration(item) && names.includes(item.name.text),
  )
  assert.equal(selected.length, names.length)
  const exported = selected.map((item) =>
    ts.factory.updateFunctionDeclaration(
      item,
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      item.asteriskToken,
      item.name,
      item.typeParameters,
      item.parameters,
      item.type,
      item.body,
    ),
  )
  const text = exported
    .map((item) => printer.printNode(ts.EmitHint.Unspecified, item, tree))
    .join('\n')
  const context = { exports: {}, Uint8Array, DataView, Map }
  runInNewContext(emit(text), context)
  return context.exports
}
const oldBoot = before(boot),
  oldHost = before(host),
  newCommon = after(common),
  newHost = after(host)
const oldBootJs = declarations(oldBoot),
  oldHostJs = declarations(oldHost),
  newCommonJs = declarations(newCommon),
  newHostJs = declarations(newHost)
for (const [name, body] of oldBootJs) {
  if (name !== 'legalPalette') assert.equal(newCommonJs.get(name), body, `moved ${name} changed`)
}
for (const name of names)
  assert.equal(newCommonJs.get(name), oldHostJs.get(name), `shared ${name} changed`)
for (const [name, body] of newHostJs)
  assert.equal(body, oldHostJs.get(name), `host ${name} changed`)
assert.equal(newHostJs.size, oldHostJs.size - names.length)
const producers = [constructors(oldBoot), constructors(oldHost), constructors(newCommon)]
const vectors = [
  ['legalPalette', []],
  ['legalTilemap', []],
  ['legalTilemap', ['tileset/42.rle']],
  ['legalEventObject', [1, 4]],
  ['legalEventObject', [0, 0]],
  ['legalSceneAssets', [1]],
  ['legalSceneAssets', [7, 42]],
  ['legalSceneAssets', [0, 0]],
  ['twoFrameChunk', []],
  ['twoFrameChunk', [0, 255]],
]
for (const [name, args] of vectors) {
  const values = producers.map((producer) => structuredClone(producer[name](...args)))
  assert.deepEqual(values[2], values[0], `${name}: boot values changed`)
  assert.deepEqual(values[2], values[1], `${name}: host values changed`)
}
const painted = (producer) =>
  structuredClone(
    producer.legalPalette((colors) => {
      colors[5] = [9, 8, 7]
    }),
  )
assert.deepEqual(painted(producers[2]), painted(producers[1]))
const palette1 = producers[2].legalPalette(),
  palette2 = producers[2].legalPalette()
assert.notEqual(palette1.colors, palette2.colors)
assert.notEqual(palette1.colors[0], palette2.colors[0])
const imports = [
  'packages/game/src/assets/scene-cache.grok-mid-1.test.ts',
  'packages/game/src/assets/dialog-resources.grok-mid-1.test.ts',
  'packages/game/src/shell/bootstrap-resources.grok-mid-1.test.ts',
  'packages/game/src/shell/bootstrap-resources.test.ts',
]
for (const path of imports)
  assert.equal(
    emit(before(path).replaceAll('/grok-boot-mid-1/legal.js', '/asset-fixtures.js')),
    emit(after(path)),
    `${path}: executable code beyond import relocation changed`,
  )
process.stdout.write(
  `${JSON.stringify(
    {
      base,
      result: 'passed',
      mode: 'read-only',
      scope:
        'all unchanged boot functions, five shared host constructors, remaining host functions and four import-only consumers',
      values:
        'ten default/boundary vectors compare independent pre-refactor producers; host paint callback and fresh ownership retained',
      limits:
        'Fixture refactor conservation, not independent product correctness or proof of original reading. legalPalette boot default loop uses the host constructor now; its unused function arity metadata is not a caller contract.',
      pins: [host, common, ...imports].map((path) => ({
        path,
        sha256: createHash('sha256').update(after(path)).digest('hex'),
      })),
    },
    null,
    2,
  )}\n`,
)
