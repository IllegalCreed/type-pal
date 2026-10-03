import assert from 'node:assert/strict'
import test from 'node:test'
import { ownerAllows } from './verify.mjs'

const owner = {
  newTestFiles: ['packages/game/src/shell/bootstrap-resources.grok-mid-1.test.ts'],
  fixturePrefixes: ['packages/game/src/__tests__/grok-boot-mid-1/'],
  evidencePrefix: 'docs/testing/medium-triple-20261002/grok/',
}
for (const [path, expected] of [
  ['packages/game/src/shell/bootstrap-resources.grok-mid-1.test.ts', true],
  ['packages/game/src/__tests__/grok-boot-mid-1/typed.ts', true],
  ['docs/testing/medium-triple-20261002/grok/counters/red.json', true],
  ['packages/game/src/shell/bootstrap-resources.ts', false],
  ['packages/game/src/shell/bootstrap-resources.test.ts', false],
  ['packages/game/src/shell/else.grok-mid-1.test.ts', false],
  ['docs/testing/medium-triple-20261002/kimi/receipt.json', false],
  ['docs/testing/medium-triple-20261002/targets.json', false],
  ['packages/game/src/__tests__/grok-boot-mid-10/typed.ts', false],
  ['docs/testing/medium-triple-20261002/grok/../../main.md', false],
  ['docs/testing/medium-triple-20261002/grok\\receipt.json', false],
])
  test(`scope ${path}`, () => assert.equal(ownerAllows(owner, path), expected))
