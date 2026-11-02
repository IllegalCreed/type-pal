const assert = require('node:assert/strict'),
  cp = require('node:child_process'),
  fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { createRequire } = require('node:module')
const root = cp
    .execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' })
    .trim(),
  ts = createRequire(path.join(root, 'package.json'))('typescript')
const base = '624478c9ff3554d51142214d4d7aef78d67922fb',
  file = 'packages/game/src/shell/bootstrap.ts'
const original = cp.execFileSync('git', ['show', `${base}:${file}`], {
    cwd: root,
    encoding: 'utf8',
  }),
  read = (name) => fs.readFileSync(path.join(root, 'packages/game/src/shell', name), 'utf8')
const parse = (text) => {
    const a = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true)
    assert.equal(a.parseDiagnostics.length, 0)
    return a
  },
  printer = ts.createPrinter({ removeComments: true })
const print = (text) => {
  const ast = parse(text)
  function shape(node) {
    const children = []
    ts.forEachChild(node, (child) => {
      children.push(shape(child))
    })
    return children.length ? [node.kind, ...children] : [node.kind, node.getText(ast)]
  }
  return JSON.stringify(shape(ast))
}
const fn = (text, name) => {
  const a = parse(text)
  let found
  function visit(n) {
    if (ts.isFunctionDeclaration(n) && n.name?.text === name) found = n
    ts.forEachChild(n, visit)
  }
  visit(a)
  assert(found, name)
  return found.getText(a)
}
const dosAst = parse(read('dos-cutscenes.ts'))
const dosFactory = dosAst.statements.find(ts.isFunctionDeclaration)
assert.deepEqual(
  dosFactory.body.statements.map((n) => (ts.isFunctionDeclaration(n) ? n.name.text : n.kind)),
  ['playDosOpening', 'playDosEnding', ts.SyntaxKind.ReturnStatement],
)
assert(
  read('bootstrap.ts').indexOf(' = createDosCutscenes(') <
    read('bootstrap.ts').indexOf('  setupDevPanel('),
)
let rebuilt = read('bootstrap.ts')
// The user-approved cache/identity repair is deliberately behavioral. Reverse its
// frozen, manually reviewed exact hunks before checking the earlier pure refactor.
const mapDelta = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'approved-map-consistency-delta.json')),
)
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
assert.equal(hash(rebuilt), mapDelta.afterSha256)
const mapLines = rebuilt.match(/[^\n]*\n|[^\n]+$/g)
for (const h of [...mapDelta.hunks].sort((a, b) => b.newStart - a.newStart)) {
  assert.deepEqual(mapLines.slice(h.newStart, h.newStart + h.after.length), h.after)
  mapLines.splice(h.newStart, h.after.length, ...h.before)
}
rebuilt = mapLines.join('')
assert.equal(hash(rebuilt), mapDelta.beforeSha256)
assert.equal(
  rebuilt,
  cp.execFileSync('git', ['show', `${mapDelta.base}:${file}`], { cwd: root, encoding: 'utf8' }),
)
// Invert only the approved map-ownership delta, then check all remaining typed TS.
function invertOnce(from, to) {
  assert.equal(rebuilt.split(from).length, 2, 'Approved map delta must match exactly once')
  rebuilt = rebuilt.replace(from, to)
}
invertOnce('  let mapReloadRevision = 0\n', '')
invertOnce(
  '    mapReloadRevision++ // Any scene activation retires earlier map-only publications, including same-scene reloads.\n',
  '',
)
invertOnce(
  '    const requestRevision = ++mapReloadRevision\n    const sceneId = currentSceneId\n',
  '',
)
invertOnce(
  `    const nextTiles = await loadTilesetBlob(\`${'${'}BASE}/data/${'${'}tilemapJson.tileset}\`)\n    if (requestRevision !== mapReloadRevision) return\n    tileImagesBySceneId.set(sceneId, nextTiles)\n`,
  '    tileImagesBySceneId.delete(currentSceneId) // 强制重 fetch(fetchSceneTileImages 有 cache)\n    await fetchSceneTileImages(currentSceneId, tilemapJson)\n',
)

const coreFile = 'packages/game/src/core/event-system.ts'
const coreBefore = cp.execFileSync('git', ['show', `a096dd2e3:${coreFile}`], {
  cwd: root,
  encoding: 'utf8',
})
const coreAfter = fs.readFileSync(path.join(root, coreFile), 'utf8')
const handled = `        if (_mapReloader) {\n          _mapReloader(newMapNum).catch((error: unknown) => {\n            console.error(\`event-system: mapReloader(${'${'}newMapNum}) failed:\`, error)\n          })\n        }`
assert.equal(coreAfter.split(handled).length, 2)
assert.equal(
  print(coreAfter.replace(handled, '        if (_mapReloader) void _mapReloader(newMapNum)')),
  print(coreBefore),
  'Only approved rejection ownership may change core execution/type structure',
)
const identityPath = 'packages/game/src/core/scene-identity.ts'
assert.equal(
  print(fs.readFileSync(path.join(root, identityPath), 'utf8')),
  print(
    cp.execFileSync('git', ['show', `${base}:${identityPath}`], { cwd: root, encoding: 'utf8' }),
  ),
  'Map identity module changes are comments only',
)
function removeFactory(name) {
  const a = parse(rebuilt)
  const matches = []
  function visit(n) {
    if (
      ts.isVariableStatement(n) &&
      n.declarationList.declarations.some(
        (d) => ts.isCallExpression(d.initializer) && d.initializer.expression.getText(a) === name,
      )
    )
      matches.push(n)
    ts.forEachChild(n, visit)
  }
  visit(a)
  assert.equal(matches.length, 1)
  const n = matches[0],
    text = n.getText(a)
  rebuilt = rebuilt.slice(0, n.getStart(a)) + rebuilt.slice(n.end)
  return text
}
const thumbInit = removeFactory('createSceneThumbnailRenderer')
assert.equal(
  print(thumbInit),
  print('const renderSceneThumbnail = createSceneThumbnailRenderer(palette)'),
)
const currentThumbnail = read('scene-thumbnail.ts')
const pureThumbnail = cp.execFileSync(
  'git',
  ['show', '740996efbff2476747bdf4d12aee3eba5f802395:packages/game/src/shell/scene-thumbnail.ts'],
  { cwd: root, encoding: 'utf8' },
)
const admittedThumbnail = currentThumbnail
  .replace('drawTilemap, repairTilemapSeams', 'drawTilemap')
  .replace('    const seamCoverage = new Uint8Array(bufW * bufH)\n', '')
  .replace('    repairTilemapSeams(tfb, seamCoverage)\n', '')
  .replaceAll(', seamCoverage)', ')')
assert.equal(
  print(admittedThumbnail),
  print(pureThumbnail),
  'Only approved coverage/repair delta may follow pure extraction',
)
let thumbnail = fn(admittedThumbnail, 'createSceneThumbnailRenderer')
thumbnail = thumbnail
  .slice(thumbnail.indexOf('{') + 1, thumbnail.lastIndexOf('}'))
  .replace("const BASE = '/extracted'", '')
  .replace('return renderSceneThumbnail', '')
thumbnail = thumbnail
  .replace(
    '    outW: number = THUMB_OUT_W,\n  ): Promise<string | null> {',
    '    paletteOverride?: Palette,\n    outW: number = THUMB_OUT_W,\n  ): Promise<string | null> {',
  )
  .replace('tfb.toImageData(palette)', 'tfb.toImageData(paletteOverride ?? palette)')
  .replace(
    'renderMapThumbnail(mapNumResolved, outW)',
    'renderMapThumbnail(mapNumResolved, undefined, outW)',
  )
assert(thumbnail.includes('paletteOverride?: Palette'))
rebuilt = rebuilt.replace(
  '  // 扫新 scene eventCommands 的 setPlayerSprite',
  `${thumbnail}\n  // 扫新 scene eventCommands 的 setPlayerSprite`,
)
const dosInit = removeFactory('createDosCutscenes')
assert.equal(
  print(dosInit),
  print(
    `const { playDosOpening, playDosEnding } = createDosCutscenes({ fb, canvasCtx, palette, battleBgs, characterSprites, fetchMgoSprite, getScreenPalette: () => gs.palette ?? palette, setMusic: (track) => { gs.wNumMusic = track; syncShellAudio(audio, gs, [], playerRoles) } })`,
  ),
)
const fetch = `const fetchMgoSprite = (id: number): Promise<IndexedImage[]> =>\n    loadSpriteFramesBlob(\`${'${'}BASE}/data/sprite/${'${'}id}.rle\`)`
assert.equal(rebuilt.split(fetch).length, 2)
rebuilt = rebuilt.replace(fetch, '')
rebuilt = rebuilt.replace(
  '  setEndingAnimationHandler(',
  `  ${fetch}\n  setEndingAnimationHandler(`,
)
const opening = fn(read('dos-cutscenes.ts'), 'playDosOpening')
  .replace('setMusic(5)', 'gs.wNumMusic = 5\n    syncShellAudio(audio, gs, [], playerRoles)')
  .replaceAll('battleBgs.get', 'assets.battleBgs.get')
let ending = fn(read('dos-cutscenes.ts'), 'playDosEnding')
  .replaceAll('setMusic(', 'setMus(')
  .replace('getScreenPalette()', 'gs.palette ?? palette')
ending = ending.replace(
  'const curPal =',
  `const setMus = (n: number): void => { gs.wNumMusic = n; syncShellAudio(audio, gs, [], playerRoles) }\n    const curPal =`,
)
rebuilt = rebuilt
  .replace(
    '  // Sync.2 fix4+:扫 setPlayerSprite',
    `${ending}\n\n  // Sync.2 fix4+:扫 setPlayerSprite`,
  )
  .replace(
    '  async function showTrademarkAndSplash',
    `${opening}\n\n  async function showTrademarkAndSplash`,
  )
function split(text) {
  const a = parse(text)
  return {
    imports: a.statements
      .filter(ts.isImportDeclaration)
      .map((n) => [n.moduleSpecifier.text, printer.printNode(ts.EmitHint.Unspecified, n, a)]),
    body: a.statements
      .filter((n) => !ts.isImportDeclaration(n))
      .map((n) => printer.printNode(ts.EmitHint.Unspecified, n, a))
      .join('\n'),
  }
}
const before = split(original),
  after = split(rebuilt)
const changed = new Set([
  '../present/draw-tilemap.js',
  './dos-cutscenes.js',
  './scene-thumbnail.js',
  './ending-player.js',
  './splash-fallback.js',
  './trademark-fallback.js',
])
assert.deepEqual(
  after.imports.filter(([p]) => !changed.has(p)),
  before.imports.filter(([p]) => !changed.has(p)),
)
assert.equal(
  print(after.body),
  print(before.body),
  'All bootstrap non-import TS must reconstruct, not only moved code',
)
for (const name of ['scene-thumbnail.ts', 'dos-cutscenes.ts']) {
  const a = parse(read(name))
  assert(
    a.statements.every(
      (n) =>
        ts.isImportDeclaration(n) || ts.isInterfaceDeclaration(n) || ts.isFunctionDeclaration(n),
    ),
  )
  for (const n of a.statements.filter(ts.isImportDeclaration))
    assert(!n.moduleSpecifier.text.includes('bootstrap.js'))
}
console.log(
  'PASS: complete bootstrap TS reconstructed after explicit approved map-ownership inversion; core unchanged outside rejection consumer; DOS instance before registration, eight narrow bindings, no GameState/AudioManager capture; thumbnail state together, only unused private palette argument removed; no reverse dependency or new module-time IO.',
)
