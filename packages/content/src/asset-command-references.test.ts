import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  collectCanonicalCommandAssetTaggedReferences,
  collectCommandAssetReferences,
  collectCommandAssetTaggedReferences,
  commandAssetTaggedReferencesAtNode,
} from './asset.js'
import { type AuthorDialogueCue, checkAuthorDialogueCue } from './author-dialogue.js'
import { type AuthorCommand, checkAuthorCommands } from './author-script.js'

describe('command asset references', () => {
  test('the author visitor includes battle choreography and leaves other nested arms to the caller', () => {
    const command = {
      kind: 'startBattle',
      enemyTeamId: 'team',
      music: 'music.battle',
      choreography: [{ at: 'battleStart', body: [{ kind: 'playSound', asset: 'sound.intro' }] }],
      onLose: [{ kind: 'playMusic', asset: 'music.lost' }],
    } satisfies AuthorCommand
    checkAuthorCommands([command], 'body')
    const before = deepSnapshot(command)
    const expected = [
      { asset: 'music.battle', expectedKind: 'music', where: 'body[0].music' },
      {
        asset: 'sound.intro',
        expectedKind: 'sound',
        where: 'body[0].choreography[0].body[0].asset',
      },
    ]
    expect(collectCanonicalCommandAssetTaggedReferences(command, 'body[0]')).toEqual(expected)
    expect(collectCommandAssetTaggedReferences(command, 'body[0]')).toEqual([
      ...expected,
      { asset: 'music.lost', expectedKind: 'music', where: 'body[0].onLose[0].asset' },
    ])
    expect(command).toEqual(before)
  })

  test('explicit battle silence creates no reference', () => {
    const command = {
      kind: 'startBattle',
      enemyTeamId: 'team',
      music: null,
    } satisfies AuthorCommand
    checkAuthorCommands([command], 'body')
    expect(collectCanonicalCommandAssetTaggedReferences(command, 'body[0]')).toEqual([])
  })

  test('one-node and whole-tree callers each locate the sound exactly once', () => {
    const command = {
      kind: 'branch',
      cond: { kind: 'chance', percent: 50 },
      then: [{ kind: 'playSound', asset: 'sound.child' }],
    } satisfies AuthorCommand
    checkAuthorCommands([command], 'body')
    expect(collectCanonicalCommandAssetTaggedReferences(command, 'body[0]')).toEqual([])
    const sound = {
      asset: 'sound.child',
      expectedKind: 'sound',
      where: 'body[0].then[0].asset',
    }
    expect(
      collectCanonicalCommandAssetTaggedReferences(command.then[0], 'body[0].then[0]'),
    ).toEqual([sound])
    expect(collectCommandAssetReferences([command], 'body', 'script:welcome')).toEqual([
      { ...sound, site: 'script:welcome' },
    ])
  })

  test.each([
    ['null', null],
    ['a number', 0],
    ['an array', []],
    ['an incomplete dialogue', { kind: 'dialog', cue: null }],
    ['an unrelated tag', { kind: 'unrelated', asset: 'sound.fake' }],
  ])('ignores %s at the unknown input boundary without editing it', (_case, input) => {
    const before = deepSnapshot(input)
    expect(collectCanonicalCommandAssetTaggedReferences(input, 'draft')).toEqual([])
    expect(input).toEqual(before)
  })
})

describe('direct dialogue portraits', () => {
  test('locates a direct portrait on an unbound dialogue cue', () => {
    const cue: AuthorDialogueCue = {
      identity: { kind: 'unbound', portrait: { asset: 'portrait.hero', side: 'left' } },
      rows: [{ text: '旁白立绘' }],
    }
    const command = { kind: 'dialog', cue } satisfies AuthorCommand
    checkAuthorCommands([command], 'body')
    const before = deepSnapshot(command)
    expect(commandAssetTaggedReferencesAtNode(command, 'body[0]')).toEqual([
      {
        asset: 'portrait.hero',
        expectedKind: 'portrait',
        where: 'body[0].cue.identity.portrait.asset',
      },
    ])
    expect(command).toEqual(before)
  })

  test('a wait and dialogue without a portrait both leave the asset scope empty', () => {
    const commands = [
      { kind: 'wait', ms: 5 },
      {
        kind: 'dialog',
        cue: { identity: { kind: 'unbound', speaker: '旁白' }, rows: [{ text: '无肖像' }] },
      },
    ] satisfies AuthorCommand[]
    checkAuthorCommands(commands, 'body')
    const before = deepSnapshot(commands)
    for (const command of commands) {
      expect(commandAssetTaggedReferencesAtNode(command, 'body[0]')).toEqual([])
    }
    expect(commands).toEqual(before)
  })

  test('an untyped draft with a numeric portrait id does not emit that asset', () => {
    const cue = {
      identity: { kind: 'unbound', portrait: { asset: 42, side: 'left' } },
      rows: [{ text: '防御输入' }],
    }
    expect(() => checkAuthorDialogueCue(cue, 'cue')).toThrow(
      new Error('cue.identity.portrait.asset: 期望非空且无首尾空格的 string'),
    )
    const draft = { kind: 'dialog', cue }
    const before = deepSnapshot(draft)
    expect(commandAssetTaggedReferencesAtNode(draft, 'draft')).toEqual([])
    expect(draft).toEqual(before)
  })
})
