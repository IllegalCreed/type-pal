import assert from 'node:assert/strict'
import test from 'node:test'
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import { sourceAutomaticLanguage } from './automatic-language-contract.mjs'
import {
  AUTOMATIC_LANGUAGE_BINDINGS,
  automaticLanguageGraphs,
} from './automatic-language-receipts.mjs'
import { closedCyclePotential } from './closed-automatic-cycle.mjs'

test('actual relative patrol graphs conserve position on every merge and backedge', () => {
  for (const entity of ['e91', 'e92', 'e121', 'e122']) {
    const binding = AUTOMATIC_LANGUAGE_BINDINGS.find((binding) => binding.entity === entity),
      graphs = automaticLanguageGraphs(binding)
    for (const graph of [graphs.source, graphs.authored]) {
      const potential = closedCyclePotential(graph)
      assert.deepEqual(potential.get(graph.entry), [0, 0])
      assert(
        potential.size > 1 &&
          [...potential.values()].some((position) =>
            position.some((coordinate) => coordinate !== 0),
          ),
        'the primary patrol must contain actual displacement',
      )
    }
    const commands = structuredClone(original.segments[0].commands),
      step = graphs.source.nodes.find(
        (node) =>
          Number.isInteger(node.ip) &&
          commands[node.ip].op === 'raw' &&
          commands[node.ip].opcode >= 11 &&
          commands[node.ip].opcode <= 14,
      )
    commands[step.ip].opcode = commands[step.ip].opcode === 14 ? 11 : commands[step.ip].opcode + 1
    const altered = sourceAutomaticLanguage(commands, graphs.source.nodes[graphs.source.entry].ip, {
      self: Number(entity.slice(1)) + 1,
    })
    assert.throws(
      () => closedCyclePotential(altered),
      /nonzero displacement/,
      'one legal wrong direction must expose a drifting cycle, despite all commands being supported',
    )
  }
})
