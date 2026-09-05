// Run at repo root: node --import tsx docs/ops/audits/pre-e2e/probe-battle-session.mjs
// Read-only game audit: real BattleSession, existing test fixture constructors,
// in-memory fighters/images; no rendering, network, storage, or user project writes.
// These assertions record the unfixed baseline, NOT desired regression behavior.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = new URL('../../../../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const requireReforge = createRequire(new URL('packages/reforge/package.json', root))
const { createServer } = await import(requireReforge.resolve('vite'))
assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Game audit forbids network access')
}
const server = await createServer({
  root: fileURLToPath(new URL('packages/reforge/', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
try {
  const { BattleSession } = await server.ssrLoadModule('/src/battle/battle-session.ts')
  const source = ts.createSourceFile(
    'fixtures.ts',
    read('packages/reforge/src/battle/battle-session.test.ts'),
    ts.ScriptTarget.Latest,
    true,
  )
  const wanted = new Set([
    'mkEnemy',
    'player',
    'stubGlyphs',
    'PLAYER_PROFILE',
    'enemyProfile',
    'loadedBattleSprite',
    'mockBattleAssets',
  ])
  // Only pure fixture constructors/constants, never load Vitest or run test bodies.
  const selected = source.statements.filter(
    (n) =>
      (n.name && wanted.has(n.name.text)) ||
      (ts.isVariableStatement(n) &&
        n.declarationList.declarations.some((d) => wanted.has(d.name.getText(source)))),
  )
  assert.equal(selected.length, wanted.size)
  const fixtureJs = ts.transpileModule(
    selected.map((n) => n.getText(source)).join('\n') +
      '\nreturn {mkEnemy,player,stubGlyphs,mockBattleAssets}',
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  ).outputText
  const { mkEnemy, player, stubGlyphs, mockBattleAssets } = new Function(fixtureJs)()
  const items = Object.fromEntries(
    JSON.parse(read('projects/pal/content/items.json')).map((x) => [x.id, x]),
  )
  function makeSession(withUsable = false) {
    const enemy = mkEnemy('audit-target')
    return new BattleSession(
      [player('li')],
      [enemy],
      {
        palette: { colors: [], cycles: [] },
        glyphs: stubGlyphs,
        ...mockBattleAssets([enemy], 1),
      },
      (id) => id,
      () => 0,
      {
        items,
        inventory: [
          { itemId: '66', count: 1 },
          ...(withUsable ? [{ itemId: '100', count: 1 }] : []),
        ],
      },
    )
  }
  const menuResults = []
  for (const withUsable of [false, true]) {
    const session = makeSession(withUsable)
    for (const key of ['ArrowDown', 'Enter', 'ArrowDown', 'Enter']) session.tick(16, new Set([key]))
    assert.equal(session.ui, withUsable ? 'miscSub' : 'misc')
    assert.equal(
      session.throwableItems().some((x) => x.itemId === '66'),
      true,
    )
    menuResults.push({ withUsable, afterItemConfirm: session.ui })
  }
  const shortcut = makeSession()
  shortcut.tick(16, new Set(['w']))
  assert.equal(shortcut.ui, 'throwItem')
  console.log(
    'C-menu',
    JSON.stringify({ item: items['66'].name, menuResults, shortcut: shortcut.ui }),
  )

  const palEnemies = JSON.parse(read('projects/pal/content/enemies.json'))
  const palSkills = JSON.parse(read('projects/pal/content/skills.json')).skills
  const steal = palSkills.find((skill) => skill.id === '377')
  assert(steal)
  for (const finish of ['playerFled', 'victory']) {
    for (const initiallyOwned of [false, true]) {
      const worldInventory = initiallyOwned ? [{ itemId: '91', count: 1 }] : []
      const enemy = palEnemies.find((entry) => entry.id === 'enemy-400')
      assert(enemy)
      const session = new BattleSession(
        [player('hero', { attackStrength: 200, defense: 999, skills: ['377'], fleeRate: 999 })],
        [enemy],
        {
          palette: { colors: [], cycles: [] },
          glyphs: stubGlyphs,
          ...mockBattleAssets([enemy], 1),
        },
        (id) => id,
        () => 0,
        { skills: { 377: steal }, items, inventory: worldInventory.map((x) => ({ ...x })) },
      )
      let result
      session.done.then((value) => {
        result = value
      })
      session.tick(0, new Set())
      for (const key of ['ArrowLeft', 'Enter', 'Enter', 'Enter']) session.tick(16, new Set([key]))
      for (let n = 0; n < 300 && !result; n++) {
        session.tick(100, new Set([finish === 'victory' ? 'f' : 'q']))
        await Promise.resolve()
      }
      assert.equal(result, finish)
      assert(session.debugLog().some((line) => line.includes(`获得 ${items['91'].name}`)))
      const battleInventory = structuredClone(session.state.inventory)
      session.writeBackInventory(worldInventory)
      assert.deepEqual(battleInventory, [{ itemId: '91', count: initiallyOwned ? 2 : 1 }])
      assert.deepEqual(worldInventory, initiallyOwned ? [{ itemId: '91', count: 2 }] : [])
      console.log(
        'C-new-inventory',
        JSON.stringify({ initiallyOwned, result, battleInventory, worldInventory }),
      )
    }
  }
} finally {
  await server.close()
  globalThis.fetch = oldFetch
}
