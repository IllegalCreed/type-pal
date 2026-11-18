import { expect, test } from 'vitest'
import { chest, cue, grant, search } from './__tests__/item-acquisition-fixtures.js'
import { createReferenceProject } from './__tests__/reference-project.js'
import { expectAcceptsUnchanged } from './__tests__/validation-assertions.js'
import {
  type AuthorAcquisitionFlow,
  type AuthorCommand,
  assertAuthorDialogueReferences,
  checkAuthorCommands,
  checkAuthorScriptFlow,
  checkAuthorScriptLibrary,
  collectCanonicalActorTaggedReferences,
  collectCanonicalCommandAssetTaggedReferences,
  renameDialoguePortraitExpression,
  validateReferences,
} from './index.js'

test('recipe expression rename reaches both raw notice fields and preserves other actor expressions', () => {
  const actorCue = (actor: string, expression = 'sad') => ({
    ...cue,
    identity: {
      kind: 'actor' as const,
      actor,
      portrait: { kind: 'expression' as const, expression, side: 'right' as const },
    },
  })
  const flow: AuthorAcquisitionFlow = {
    ...chest,
    notice: { kind: 'custom', timing: 'before', cue: actorCue('spirit') },
    empty: { kind: 'custom', cue: actorCue('spirit') },
  }
  const input = [
    flow,
    {
      ...grant,
      notice: { kind: 'custom' as const, timing: 'after' as const, cue: actorCue('other') },
    },
  ]
  expectAcceptsUnchanged((value) => checkAuthorScriptFlow(value, 'recipe'), flow)
  expect(renameDialoguePortraitExpression(input, 'spirit', 'sad', 'calm')).toEqual({
    rewritten: 2,
    value: [
      {
        ...flow,
        notice: {
          kind: 'custom',
          timing: 'before',
          cue: actorCue('spirit', 'calm'),
        },
        empty: {
          kind: 'custom',
          cue: actorCue('spirit', 'calm'),
        },
      },
      {
        ...grant,
        notice: { kind: 'custom', timing: 'after', cue: actorCue('other') },
      },
    ],
  })
  expect(flow.notice).toEqual({ kind: 'custom', timing: 'before', cue: actorCue('spirit') })
  expect(flow.empty).toEqual({ kind: 'custom', cue: actorCue('spirit') })
})

test('raw recipe references locate actual presentation parameters, including repeat feedback actor expressions', () => {
  const flow: AuthorAcquisitionFlow = {
    ...chest,
    notice: {
      kind: 'custom',
      timing: 'before',
      cue: {
        identity: { kind: 'unbound', portrait: { asset: 'portrait.sign', side: 'left' } },
        rows: [{ text: 'line.reward' }],
      },
    },
    empty: {
      kind: 'custom',
      cue: {
        identity: {
          kind: 'actor',
          actor: 'spirit',
          portrait: { kind: 'expression', expression: 'sad', side: 'right' },
        },
        rows: [{ text: 'line.empty' }],
      },
    },
  }
  expect(collectCanonicalCommandAssetTaggedReferences(flow, 'flow')).toEqual([
    { asset: 'sound.open', expectedKind: 'sound', where: 'flow.opening.sound' },
    {
      asset: 'portrait.sign',
      expectedKind: 'portrait',
      where: 'flow.notice.cue.identity.portrait.asset',
    },
  ])
  expect(collectCanonicalActorTaggedReferences(flow, 'flow')).toEqual([
    { actorId: 'spirit', kind: 'dialogue-actor', where: 'flow.empty.cue.identity.actor' },
  ])
  expect(() => assertAuthorDialogueReferences(flow, {})).toThrow('未知 Actor "spirit"')
})

function sharedCommandBundle(body: AuthorCommand[]) {
  const { bundle } = createReferenceProject()
  bundle.sharedScripts = { grant: { name: 'Grant', self: 'none', body } }
  checkAuthorScriptLibrary(bundle.sharedScripts)
  return bundle
}

test('semantic item and reward-name references retain raw editable parameter paths', () => {
  const bundle = sharedCommandBundle([
    {
      kind: 'grantReward',
      rewards: [{ kind: 'item', itemId: 'missing', count: 1 }],
      notice: { kind: 'silent' },
    },
    {
      kind: 'dialog',
      cue: {
        identity: { kind: 'narration' },
        rows: [{ reward: { kind: 'item', itemName: 'item.missing', count: 2 } }],
      },
    },
  ])
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'sharedScripts["grant"].body[0].rewards[0].itemId',
      message: '奖励物品 "missing" 不在 items',
    },
    {
      severity: 'error',
      where: 'sharedScripts["grant"].body[1].cue.rows[0].reward.itemName',
      message: '奖励物品名 "item.missing" 不在 locale',
    },
  ])
  bundle.items = [
    { id: 'missing', name: 'item.missing', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
  ]
  bundle.locale['item.missing'] = 'Known item'
  expect(validateReferences(bundle)).toEqual([])
})

test('mixed custom reward rows diagnose item-name references at the raw notice path only', () => {
  const commands: AuthorCommand[] = [
    {
      ...grant,
      notice: {
        kind: 'custom',
        timing: 'after',
        cue: {
          identity: { kind: 'narration' },
          rows: [
            { reward: { kind: 'money', amount: 50 } },
            { reward: { kind: 'item', itemName: 'item.missing', count: 3 } },
            { text: 'line.reward' },
          ],
        },
      },
    },
  ]
  checkAuthorCommands(commands, 'commands')
  const bundle = sharedCommandBundle(commands)
  bundle.items = [
    { id: 'herb', name: 'item.herb', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
  ]
  Object.assign(bundle.locale, { 'item.herb': '止血草', 'line.reward': '找到草药。' })
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'sharedScripts["grant"].body[0].notice.cue.rows[1].reward.itemName',
      message: '奖励物品名 "item.missing" 不在 locale',
    },
  ])
  bundle.locale['item.missing'] = '止血草'
  expect(validateReferences(bundle)).toEqual([])
})

test('pickup and repeat search sound references point to raw authored parameters', () => {
  const pickup: AuthorAcquisitionFlow = {
    kind: 'acquisition',
    recipe: 'builtin/item/pickup',
    rewards: grant.rewards,
    notice: { kind: 'silent' },
    sound: 'sound.find',
    stages: { available: { id: 'found' } },
  }
  const repeatSearch = { ...search, sound: 'sound.find' }
  checkAuthorScriptFlow(pickup, 'pickup')
  checkAuthorScriptFlow(search, 'search')
  checkAuthorScriptFlow(repeatSearch, 'search')
  expect(collectCanonicalCommandAssetTaggedReferences(pickup, 'pickup')).toEqual([
    { asset: 'sound.find', expectedKind: 'sound', where: 'pickup.sound' },
  ])
  expect(collectCanonicalCommandAssetTaggedReferences(search, 'search')).toEqual([])
  expect(collectCanonicalCommandAssetTaggedReferences(repeatSearch, 'search')).toEqual([
    { asset: 'sound.find', expectedKind: 'sound', where: 'search.sound' },
  ])
})
