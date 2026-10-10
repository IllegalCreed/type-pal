import assert from 'node:assert/strict'
import test from 'node:test'
import { checkCommandCoverage, commandDomain } from './command-obligations.mjs'
import { expectedScriptCommands } from './script-execution-contract.mjs'
import { storyExecutionSpecifications } from './story-execution-specs.mjs'

test('canonical finite stories have domain owners; an extra unclassified actual effect fails closed', () => {
  const commands = ['001', '002', '003', '004', '005', '006'].flatMap((fragment) =>
    storyExecutionSpecifications(fragment).flatMap((spec) => expectedScriptCommands(spec)),
  )
  const causes = commands.map((occurrence) => ({ phase: 'command', occurrence }))
  const result = checkCommandCoverage({ causes })
  assert.equal(result.status, 'proved')
  assert.equal(result.final.commands, commands.length)
  assert.equal(commandDomain({ kind: 'leaf', command: { kind: 'playSound' } }), 'sound-request')
  const unknown = checkCommandCoverage({
    causes: [
      ...causes,
      {
        phase: 'command',
        occurrence: { command: { kind: 'leaf', command: { kind: 'unmodeledMutation' } } },
      },
    ],
  })
  assert.equal(unknown.status, 'unknown')
  assert.equal(unknown.witness.rule, 'unclassified-effect-domain')
  assert.equal(unknown.checked, commands.length)
})
