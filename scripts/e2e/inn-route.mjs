import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

/** Load the engine's pure geometry, not a second approximate collision implementation. */
export async function loadRouteMotionGeometry(source) {
  const ast = ts.createSourceFile('entity-motion.ts', source, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0, 'motion source must parse')
  const imports = ast.statements.filter(ts.isImportDeclaration)
  assert.equal(imports.length, 1, 'pure motion import census changed')
  assert(imports[0].importClause?.isTypeOnly, 'route geometry must not load runtime imports')
  assert.equal(imports[0].moduleSpecifier.text, '@type-pal/content')
  const noRuntimeImport = (node) => {
    assert(
      !(ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword),
      'motion gained dynamic runtime import',
    )
    ts.forEachChild(node, noRuntimeImport)
  }
  noRuntimeImport(ast)
  assert.deepEqual(
    ast.statements
      .filter(ts.isVariableStatement)
      .flatMap((node) =>
        node.declarationList.declarations.map((d) => [
          d.name.getText(ast),
          d.initializer?.getText(ast),
        ]),
      ),
    [
      ['COLLISION_EPSILON', '1e-6'],
      ['TERRAIN_SAMPLE_STEP', '0.25'],
      ['FOOTPRINT_DISTANCE', '1 - COLLISION_EPSILON'],
      ['SIDE_STICK_TICKS', '4'],
    ],
    'motion geometry constants require explicit review',
  )
  for (const node of ast.statements) {
    assert(
      ts.isImportDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isVariableStatement(node),
      'motion gained top-level executable effects',
    )
    if (ts.isVariableStatement(node)) {
      assert.deepEqual(
        node.declarationList.declarations.map((d) => d.name.getText(ast)),
        [node.declarationList.declarations[0].name.getText(ast)],
      )
      assert(
        [
          'COLLISION_EPSILON',
          'TERRAIN_SAMPLE_STEP',
          'FOOTPRINT_DISTANCE',
          'SIDE_STICK_TICKS',
        ].includes(node.declarationList.declarations[0].name.getText(ast)),
        'pure constant census changed',
      )
      const noEffects = (child) => {
        assert(
          !ts.isCallExpression(child) && !ts.isNewExpression(child) && !ts.isAwaitExpression(child),
          'motion constant gained effects',
        )
        ts.forEachChild(child, noEffects)
      }
      noEffects(node)
    }
    if (ts.isClassDeclaration(node))
      for (const member of node.members)
        assert(
          !ts.isClassStaticBlockDeclaration(member) &&
            !member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword),
          'motion class gained static effects',
        )
  }
  for (const name of ['motionFootprintsOverlap', 'motionSweepsConflict'])
    assert.equal(
      ast.statements.filter((n) => ts.isFunctionDeclaration(n) && n.name?.text === name).length,
      1,
      `geometry census changed: ${name}`,
    )
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  assert.equal(result.diagnostics?.length ?? 0, 0)
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`)
}
const geometry = await loadRouteMotionGeometry(
  await readFile(new URL('../../packages/reforge/src/entity-motion.ts', import.meta.url), 'utf8'),
)
const footprint = [{ dcol: 0, drow: 0 }]
const position = ([col, row]) => ({ col, row, height: 0 })

export function routeActorsBlock(engine, from, to, actors = []) {
  assert(['game', 'reforge'].includes(engine), 'route requires explicit engine collision policy')
  return actors.some((actor) => {
    if (!actor.collide) return false
    assert(Number.isFinite(actor.col) && Number.isFinite(actor.row), 'invalid route actor position')
    if (engine === 'game')
      return Math.max(Math.abs(actor.col - to[0]), Math.abs(actor.row - to[1])) < 0.5
    const at = position([actor.col, actor.row])
    return geometry.motionSweepsConflict(
      position(from),
      position(to),
      footprint,
      at,
      at,
      actor.footprints ?? footprint,
    )
  })
}

export function routeStepBlocked(engine, from, key, actors) {
  const direction = INN_DIRECTIONS.find((d) => d.key === key)
  assert(direction, 'unknown route direction')
  return routeActorsBlock(engine, from, [from[0] + direction.col, from[1] + direction.row], actors)
}

export const INN_DIRECTIONS = Object.freeze([
  { key: 'ArrowLeft', col: -1, row: 0 },
  { key: 'ArrowDown', col: 0, row: 1 },
  { key: 'ArrowRight', col: 1, row: 0 },
  { key: 'ArrowUp', col: 0, row: -1 },
])

export class TemporaryRouteObstruction extends Error {
  constructor(frontier) {
    super('normal route temporarily occupied by actors')
    this.frontier = frontier
  }
}

export function routeFrontierOpened(engine, frontier, actors) {
  return frontier.some((edge) => !routeActorsBlock(engine, edge.from, edge.to, actors))
}

/** Plan ordinary keys over immutable map data. The engine still decides/commits every actual step. */
export function planInnRoute(map, start, destination, actors = [], engine) {
  assert.equal(map.version, 4)
  assert(['game', 'reforge'].includes(engine), 'route requires explicit engine collision policy')
  const toCell = (col, row) => ({ col: Math.floor((col - row) / 2), row: col + row })
  const blocked = (col, row) => {
    const cell = toCell(col, row)
    return (
      cell.col < 0 ||
      cell.col >= map.width ||
      cell.row < 0 ||
      cell.row >= map.height * 2 ||
      map.collision[cell.row]?.[cell.col] !== 0
    )
  }
  const frontier = []
  const search = (checkActors) => {
    const key = (col, row) => `${col},${row}`,
      queue = [{ col: start[0], row: start[1], path: [] }],
      seen = new Set([key(...start)])
    for (let i = 0; i < queue.length; i++) {
      assert(i < 32768, 'route search overflow')
      const at = queue[i]
      if (destination(at.col, at.row)) return at.path
      for (const d of INN_DIRECTIONS) {
        const col = at.col + d.col,
          row = at.row + d.row,
          k = key(col, row)
        if (seen.has(k) || blocked(col, row)) continue
        if (checkActors && routeActorsBlock(engine, [at.col, at.row], [col, row], actors)) {
          frontier.push({ from: [at.col, at.row], to: [col, row] })
          continue
        }
        seen.add(k)
        queue.push({ col, row, path: [...at.path, d.key] })
      }
    }
  }
  const path = search(true)
  if (path) return path
  if (frontier.length && search(false)) throw new TemporaryRouteObstruction(frontier)
  throw new Error('no normal collision-safe inn route')
}
