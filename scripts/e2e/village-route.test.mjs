import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { storyInputPlan } from './story-input-plans.mjs'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const module = { exports: {} }
new Function(
  'module',
  'exports',
  ts.transpile(read('packages/reforge/src/entity-motion.ts'), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  }),
)(module, module.exports)
const ast = ts.createSourceFile(
  'project-map.ts',
  read('packages/reforge/src/project-map.ts'),
  ts.ScriptTarget.Latest,
  true,
)
const declaration = ast.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'pixelToLattice',
)
assert(declaration)
const pixelToLattice = new Function(
  `${ts.transpile(declaration.getText(ast).replace(/^export /, ''), { target: ts.ScriptTarget.ES2022 })};return pixelToLattice`,
)()
const map = JSON.parse(read('projects/pal/content/maps/map-001.json'))
const terrainBlocked = ({ col, row }) => {
  const cell = pixelToLattice(16 * (col - row), 8 * (col + row))
  return (map.collision[cell.row]?.[cell.col] ?? 1) !== 0
}
const pos = ([col, row, height = 0]) => ({ col, row, height })

test('fixed village routes clear the recorded chicken choke point with native collision, in both directions', () => {
  // Actual 005 guards failure: e91 at [94.75,27.5], party [95,27]. No runtime teleport.
  const planStep = (step) => {
    const from = pos(step.from),
      to = pos(step.to)
    return module.exports
      .planEntityMotion({
        tick: 1,
        actors: [
          {
            actor: { kind: 'party' },
            pos: from,
            facing: 'down',
            footprints: [{ dcol: 0, drow: 0 }],
            hasBody: true,
            yieldable: false,
          },
          {
            actor: { kind: 'entity', id: 'e91' },
            pos: pos([94.75, 27.5]),
            facing: 'up',
            footprints: [{ dcol: 0, drow: 0 }],
            hasBody: true,
            yieldable: false,
          },
        ],
        intents: [
          {
            actor: { kind: 'party' },
            source: 'player',
            collision: 'dynamic',
            from,
            desired: to,
            desiredFacing: {
              ArrowDown: 'down',
              ArrowUp: 'up',
              ArrowRight: 'right',
              ArrowLeft: 'left',
            }[step.key],
            floating: false,
            epoch: 1,
            quantum: 1,
            allowSidestep: true,
          },
        ],
        terrainBlocked,
      })
      .outcomes.find((outcome) => outcome.actor.kind === 'party')
  }
  assert.deepEqual(planStep({ from: [95, 27], to: [95, 28], key: 'ArrowDown' }).reason, {
    kind: 'actor',
    actor: { kind: 'entity', id: 'e91' },
  })
  const routes = [
    storyInputPlan('005', 'reforge', 'dock-entry').steps.slice(0, 25),
    storyInputPlan('006', 'reforge', 's004/e95').steps.slice(0, 25),
    storyInputPlan('006', 'reforge', 's004/e94').steps.filter((step) => step.from[0] <= 100),
  ]
  for (const steps of routes)
    for (const step of steps) {
      const outcome = planStep(step)
      assert.equal(outcome.kind, 'moved', JSON.stringify({ step, outcome }))
      assert.deepEqual(outcome.to, pos(step.to), 'fixed input must not rely on a sidestep')
    }
})
