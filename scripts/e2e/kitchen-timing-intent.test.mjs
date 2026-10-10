import assert from 'node:assert/strict'
import test from 'node:test'
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import author from '../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import { verifyKitchenWaitPlan } from './kitchen-timing-intent.mjs'

// Actual source instructions and canonical author waits, projected to the collector's receipt domain.
function fixture() {
  const ips = [
    35684, 35686, 35688, 35690, 35693, 35695, 35697, 35699, 35701, 35703, 35705, 35707, 356, 364,
    366, 368,
  ]
  const game = ips.map((ip, order) => {
    const command = original.segments[0].commands[ip]
    return {
      phase: 'wait-start',
      order,
      occurrence: { ip, command },
      ...(command.opcode === 9
        ? { type: 'frames', frames: Math.max(1, command.operands[0]) }
        : { type: 'redraw', ms: 60 }),
    }
  })
  const expand = (body) =>
    body.flatMap((command) =>
      command.kind === 'repeat'
        ? Array.from({ length: command.count }, () => expand(command.body)).flat()
        : [command],
    )
  const reforge = [
    ['e47', 'default'],
    ['e56', 'greet-after-guests'],
  ].flatMap(([entity, behavior]) => {
    const flow = author.entities.find((actor) => actor.id === entity).behaviors.trigger[behavior]
      .flow
    return expand(flow.stages.find((stage) => stage.id === flow.initial).body)
      .filter((command) => command.kind === 'wait')
      .map((command) => ({
        phase: 'wait-start',
        ms: command.ms,
        occurrence: {
          self: { scene: 's003', entity },
          timing: 'interactive',
          command: { kind: 'leaf', command },
        },
      }))
  })
  return { game, reforge }
}

test('003 source one-frame zero operand and canonical greeting waits preserve their intended cadence', () => {
  const { game, reforge } = fixture()
  const receipt = verifyKitchenWaitPlan(game, reforge)
  assert.equal(receipt.length, 16)
  assert.deepEqual(
    receipt.slice(-4).map(({ ip, ms }) => [ip, ms]),
    [
      [356, 100],
      [364, 600],
      [366, 400],
      [368, 200],
    ],
  )
  for (const corrupt of [
    (_a, b) => b.splice(12, 1),
    (_a, b) => {
      b[13].ms = 240
      b[13].occurrence.command.command.ms = 240
    },
    (a) => {
      a[0].occurrence.ip++
    },
    (_a, b) => {
      b[13].occurrence.self.entity = 'e62'
    },
    (_a, b) => {
      b[13].occurrence.command.command.ms = 240
    },
  ]) {
    const a = structuredClone(game),
      b = structuredClone(reforge)
    corrupt(a, b)
    assert.throws(() => verifyKitchenWaitPlan(a, b))
  }
})
