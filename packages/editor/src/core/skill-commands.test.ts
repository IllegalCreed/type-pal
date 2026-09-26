import { validateSkills } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import * as oldEntry from './commands.js'
import { AddSkillCommand, DeleteSkillCommand, UpdateSkillCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import {
  AddSkillCommand as AddSkillMoved,
  DeleteSkillCommand as DeleteSkillMoved,
  UpdateSkillCommand as UpdateSkillMoved,
} from './skill-commands.js'

function state(): EditorState {
  return {
    skills: [
      {
        id: 'fire',
        name: '火',
        desc: '',
        cost: { mp: 5 },
        usableOutsideBattle: false,
        target: 'oneEnemy',
        effects: [],
        animation: {
          effectSprite: 0,
          placement: 'normal',
          xOffset: 0,
          yOffset: 0,
          speed: 0,
          fireDelay: 0,
          effectTimes: 0,
          shake: 0,
        },
      },
    ],
    items: [],
    scenes: [],
    actors: [],
    levelUp: {},
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 20,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

describe('C05 skill command family', () => {
  test('keeps skill constructors on the old commands barrel and scaffolds default power', () => {
    expect(oldEntry.AddSkillCommand).toBe(AddSkillMoved)
    expect(oldEntry.UpdateSkillCommand).toBe(UpdateSkillMoved)
    expect(oldEntry.DeleteSkillCommand).toBe(DeleteSkillMoved)
    const current = state()
    validateSkills({ skills: current.skills, levelUp: current.levelUp })
    const add = new AddSkillCommand('bolt', '雷击')
    expect(add.label).toBe('新建技能')
    const next = add.apply(state())
    expect(next.skills[1]?.effects[0]).toMatchObject({ kind: 'damage', power: 20 })
    expect(add.invert(next).skills.map((skill) => skill.id)).toEqual(['fire'])
    const update = new UpdateSkillCommand('fire', { desc: '灼烧' })
    const patched = update.apply(state())
    expect(patched.skills[0]?.desc).toBe('灼烧')
    expect(update.invert(patched).skills[0]?.desc).toBe('')
    const removed = new DeleteSkillCommand('fire', collectCurrentProjectReferenceIndex)
    expect(removed.apply(state()).skills).toEqual([])
  })
})
