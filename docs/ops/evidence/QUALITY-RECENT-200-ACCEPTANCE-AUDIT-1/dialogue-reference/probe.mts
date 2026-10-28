import assert from 'node:assert/strict'
import type { ActorDef } from '../../../../../packages/content/src/actor.ts'
import {
  type DialogueIdentity,
  resolveDialogueIdentity,
} from '../../../../../packages/content/src/author-dialogue.ts'
import { validateActors } from '../../../../../packages/content/src/validate.ts'
import {
  validateAuthorDialogueReferences,
  validateAuthorSharedScripts,
} from '../../../../../packages/content/src/validate-author.ts'

const hero: ActorDef = {
  id: 'hero',
  name: 'name.hero',
  spriteId: 'sprite.hero',
  portraits: { default: 'portrait.hero', expressions: { angry: 'portrait.angry' } },
}
const actors = validateActors([hero])
const table = Object.fromEntries(actors.map((actor) => [actor.id, actor]))
const positive: DialogueIdentity = {
  kind: 'actor',
  actor: 'hero',
  portrait: { kind: 'expression', expression: 'angry', side: 'left' },
}
assert.deepEqual(resolveDialogueIdentity(positive, table), {
  speaker: 'name.hero',
  portrait: { asset: 'portrait.angry', side: 'left' },
})
const cases: { name: string; identity: DialogueIdentity; pattern: RegExp }[] = [
  {
    name: 'missing actor constructor',
    identity: { kind: 'actor', actor: 'constructor' },
    pattern: /未知 Actor/,
  },
  {
    name: 'missing expression constructor',
    identity: {
      kind: 'actor',
      actor: 'hero',
      portrait: { kind: 'expression', expression: 'constructor', side: 'left' },
    },
    pattern: /缺表情/,
  },
]
const results = []
for (const item of cases) {
  const library = validateAuthorSharedScripts({
    probe: {
      name: 'probe',
      self: 'none',
      body: [{ kind: 'dialog', cue: { identity: item.identity, rows: [{ text: 'line' }] } }],
    },
  })
  const args = { scenes: [], items: [], sharedScripts: library, enemies: [], actors }
  let failure: unknown
  try {
    assert.throws(() => validateAuthorDialogueReferences(args), item.pattern)
  } catch (error) {
    failure = error
  }
  results.push({
    name: item.name,
    shapeGuardPassed: true,
    expected: 'actual reference guard rejects missing own definition',
    businessAssertion:
      failure instanceof assert.AssertionError
        ? { name: failure.name, message: failure.message, stack: failure.stack }
        : (failure ?? 'passed'),
  })
}
console.log(JSON.stringify({ positive: 'passed', results }, null, 2))
process.exitCode = results.some((result) => typeof result.businessAssertion === 'object') ? 1 : 0
