import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const ts = createRequire(path.join(root, 'package.json'))('typescript')
const base = 'bd37e6d8faa72c16c84e301e80d827439cad0ca7'
const print = ts.createPrinter({ removeComments: true })
const read = (file, old = false) =>
  old
    ? execFileSync('git', ['show', `${base}:${file}`], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, file), 'utf8')
const parse = (file, old = false) =>
  ts.createSourceFile(file, read(file, old), ts.ScriptTarget.Latest, true)
const body = (file, name, old = false) => {
  const sf = parse(file, old)
  const fn = sf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === name)
  assert(fn, name)
  return print.printNode(ts.EmitHint.Unspecified, fn.body, sf)
}
const dir = 'packages/game/src/core/battle/'
const core = `${dir}battle-system.ts`
const coop = `${dir}actions/coop-magic.ts`
const ui = 'packages/game/src/present/battle/draw-battle-ui.ts'
const health = `${dir}player-condition.ts`
const action = `${dir}action-availability.ts`
assert.equal(body(core, 'isPlayerDying', true), body(health, 'isPlayerDying'))
assert.equal(body(coop, 'isDying', true), body(health, 'isPlayerDying'))
assert.equal(
  body(coop, 'isHealthy', true).replaceAll('isDying(', 'isPlayerDying('),
  body(health, 'isPlayerHealthy'),
)
assert.equal(
  body(core, 'isPlayerHealthy', true)
    .replace('    const st = player.status;\n', '')
    .replaceAll('st.', 'status.'),
  body(health, 'isPlayerHealthy'),
)
assert.equal(
  body(core, 'isActionValid', true)
    .replace('isPlayerHealthy(p, r)', 'isPlayerHealthy(r, p.status)')
    .replace('isPlayerHealthy(player, role)', 'isPlayerHealthy(role, player.status)'),
  body(action, 'isBattleActionValid'),
)
// Reconstitute each old module after exactly the admitted deletion/call-site rename.
// New rule imports are removed only from the candidate; all old imports remain compared.
const plans = [
  [
    core,
    ['isPlayerDying', 'isPlayerHealthy', 'isActionValid'],
    { isActionValid: 'isBattleActionValid' },
    ['./action-availability.js', './player-condition.js'],
  ],
  [coop, ['isDying', 'isHealthy'], { isHealthy: 'isPlayerHealthy' }, ['../player-condition.js']],
  [
    ui,
    ['isBattleActionValidForDraw'],
    { isBattleActionValidForDraw: 'isBattleActionValid' },
    ['../../core/battle/action-availability.js'],
  ],
]
for (const [file, removed, names, imports] of plans) {
  const normalize = (old) => {
    const transform = (context) => (node) =>
      ts.visitNode(node, function visit(n) {
        if (old && ts.isFunctionDeclaration(n) && removed.includes(n.name.text)) return undefined
        if (!old && ts.isImportDeclaration(n) && imports.includes(n.moduleSpecifier.text))
          return undefined
        if (old && ts.isIdentifier(n) && names[n.text])
          return ts.factory.createIdentifier(names[n.text])
        return ts.visitEachChild(n, visit, context)
      })
    const result = ts.transform(parse(file, old), [transform])
    const printed = print.printFile(result.transformed[0])
    result.dispose()
    return printed
  }
  assert.equal(normalize(true), normalize(false), file)
}
console.log(
  JSON.stringify(
    {
      base,
      equal: true,
      files: [core, coop, ui, health, action].map((file) => ({
        path: file,
        sha256: createHash('sha256').update(read(file)).digest('hex'),
      })),
      limits:
        'Statement equivalence for core/coop predicates and all three call-site modules after explicit extraction mapping. UI predicate equivalence separately checked against old implementation and caller/pixel tests. Not a claim of full core-file acceptance.',
    },
    null,
    2,
  ),
)
