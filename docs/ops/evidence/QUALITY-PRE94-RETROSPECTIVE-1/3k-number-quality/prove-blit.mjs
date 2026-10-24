import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const ts = createRequire(path.join(root, 'package.json'))('typescript')
const base = 'f5457a14cba4583072ee4a83302aca0d77daf15a'
const file = 'packages/game/src/present/draw-number.ts'
const helper = 'packages/game/src/present/blit-indexed-sprite.ts'
const old = execFileSync('git', ['show', `${base}:${file}`], { cwd: root, encoding: 'utf8' })
const current = fs.readFileSync(path.join(root, file), 'utf8')
const shared = fs.readFileSync(path.join(root, helper), 'utf8')
const parse = (s) => ts.createSourceFile('source.ts', s, ts.ScriptTarget.Latest, true)
const printer = ts.createPrinter({ removeComments: true })
const body = (source, name) =>
  parse(source).statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name).body
const print = (n) => printer.printNode(ts.EmitHint.Unspecified, n, parse(''))
const result = ts.transform(body(old, 'blitDigitSprite'), [
  (context) => (node) =>
    ts.visitNode(node, function visit(n) {
      const names = { dx: 'x', dy: 'y', srcIdx: 'off', x: 'dstX', y: 'dstY' }
      if (ts.isIdentifier(n) && names[n.text]) return ts.factory.createIdentifier(names[n.text])
      return ts.visitEachChild(n, visit, context)
    }),
])
assert.equal(print(result.transformed[0]), print(body(shared, 'blitSpriteOpaque')))
result.dispose()
const approvedGuard =
  '  // TS派生值可从有限输入溢出；跳过异常数字，避免位数循环阻塞整帧。\n  if (!Number.isFinite(num)) return\n'
assert(current.includes(approvedGuard))
const pure = current
  .replace(approvedGuard, '')
  .replace("import { blitSpriteOpaque } from './blit-indexed-sprite.js'\n", '')
  .replace('blitSpriteOpaque(fb, frame, x, y)', 'blitDigitSprite(fb, frame, x, y)')
assert.equal(print(body(pure, 'drawNumber')), print(body(old, 'drawNumber')))
const hash = (s) => createHash('sha256').update(s).digest('hex')
console.log(
  JSON.stringify({
    base,
    equal: true,
    guardSeparate: true,
    files: [
      { path: file, sha256: hash(current) },
      { path: helper, sha256: hash(shared) },
    ],
    limits:
      'Exact private-to-shared body after explicit identifier mapping and drawNumber body after removing only the approved guard. Does not prove complete caller domains or original-game runtime.',
  }),
)
