const fs = require('node:fs'),
  cp = require('node:child_process'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  ts = require(`${process.cwd()}/node_modules/typescript`)
const base = '7f9f42b6c8b419364406e02480104fbb1c7b49b0',
  hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const original = (p) => cp.execFileSync('git', ['show', `${base}:${p}`], { encoding: 'utf8' }),
  current = (p) => fs.readFileSync(p, 'utf8')
const javascript = (s) => {
  const js = ts.transpileModule(s, {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        removeComments: true,
      },
    }).outputText,
    ast = ts.createSourceFile('x.js', js, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  function shape(n) {
    const children = []
    ts.forEachChild(n, (child) => {
      children.push(shape(child))
    })
    return children.length ? [n.kind, ...children] : [n.kind, n.getText(ast)]
  }
  return JSON.stringify(shape(ast))
}
function statusBody(s) {
  const a = ts.createSourceFile('s.ts', s, ts.ScriptTarget.Latest, true)
  const pr = ts.createPrinter({ removeComments: true })
  return {
    imports: a.statements
      .filter(ts.isImportDeclaration)
      .map((n) => pr.printNode(ts.EmitHint.Unspecified, n, a))
      .sort(),
    rest: a.statements
      .filter((n) => !ts.isImportDeclaration(n))
      .map((n) => pr.printNode(ts.EmitHint.Unspecified, n, a))
      .join('\n'),
  }
}
const status = 'packages/game/src/present/menu/draw-player-status.ts'
assert.deepEqual(statusBody(current(status)), statusBody(original(status)))
const panel = 'packages/game/src/tools/tools-panel.ts',
  style = 'packages/game/src/tools/tools-panel-style.ts'
let reconstructed = current(panel)
reconstructed = reconstructed
  .replace("import { injectToolsPanelStyles } from './tools-panel-style.js'\n", '')
  .replace("export { injectToolsPanelStyles } from './tools-panel-style.js'\n", '')
const styleText = current(style),
  begin = styleText.indexOf("const STYLE_ID = 'tp-tools-style'")
assert(begin > 0)
reconstructed = reconstructed.replace(
  'function liveRow(',
  `${styleText.slice(begin)}\nfunction liveRow(`,
)
reconstructed = reconstructed
  .replace(
    "battle: GameState['battleState'],\n  enemyObjects: PanelResources['enemyObjects'],",
    'gs: GameState,\n  res: PanelResources,',
  )
  .replace(
    "function enemyStealText(battle: GameState['battleState'],",
    'function enemyStealText(gs: GameState,',
  )
  .replace(
    "function enemyAttackEffectText(battle: GameState['battleState'],",
    'function enemyAttackEffectText(gs: GameState,',
  )
reconstructed = reconstructed.replace(
  /function enemyAttackEffectText\(\s*battle: GameState\['battleState'\],/,
  'function enemyAttackEffectText(gs: GameState,',
)
reconstructed = reconstructed
  .replaceAll('battle?.enemies[slot]', 'gs.battleState?.enemies[slot]')
  .replaceAll('enemyObjects?.find((object)', 'res.enemyObjects?.find((object)')
  .replaceAll('enemyObjects?.filter((object)', 'res.enemyObjects?.filter((object)')
  .replace(
    'enemyDisplayName(gs.battleState, res.enemyObjects, e.slot, e.name)',
    'enemyDisplayName(gs, res, e.slot, e.name)',
  )
  .replace('enemyStealText(gs.battleState, e.slot, e.steal)', 'enemyStealText(gs, e.slot, e.steal)')
  .replace(
    'enemyAttackEffectText(gs.battleState, e.slot, e.attackEquivPoison)',
    'enemyAttackEffectText(gs, e.slot, e.attackEquivPoison)',
  )
assert.equal(
  javascript(reconstructed),
  javascript(original(panel)),
  'all panel JS reconstructs, including CSS and IO unchanged',
)
console.log(
  JSON.stringify(
    {
      base,
      status: {
        importsEqualAsSets: true,
        nonImportTsEqual: true,
        oldSha256: hash(original(status)),
        currentSha256: hash(current(status)),
        limit:
          'Import declaration order formatted; no import specifier/binding changes. Three localization modules have no registration/IO at import.',
      },
      panel: {
        wholeReconstructedJsEqual: true,
        oldSha256: hash(original(panel)),
        currentSha256: hash(current(panel)),
        styleSha256: hash(current(style)),
        limit:
          'Only explicit style extraction/private-helper argument projection/type erasure reversed; complete resulting JS compared.',
      },
    },
    null,
    2,
  ),
)
