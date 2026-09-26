import { describe, expect, test } from 'vitest'
import * as oldEntry from './commands.js'
import { AddPoisonCommand, UpdatePoisonCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import {
  AddPoisonCommand as AddPoisonMoved,
  DeletePoisonCommand as DeletePoisonMoved,
  UpdatePoisonCommand as UpdatePoisonMoved,
} from './poison-commands.js'

function stP(): EditorState {
  const base = {
    poisons: [
      { id: 551, name: '赤毒', curability: 'common', color: 16, playerTicks: [{ hpDelta: -7 }] },
      { id: 556, name: '鹤顶红', curability: 'severe', color: 160, lethalWith: 557, counters: 558 },
    ],
    items: [],
    skills: [],
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
  return base
}

describe('C06 poison command family', () => {
  test('keeps poison constructors on the old commands barrel and scaffolds common curability', () => {
    expect(oldEntry.AddPoisonCommand).toBe(AddPoisonMoved)
    expect(oldEntry.UpdatePoisonCommand).toBe(UpdatePoisonMoved)
    expect(oldEntry.DeletePoisonCommand).toBe(DeletePoisonMoved)
    const add = new AddPoisonCommand(1000, '试验毒')
    expect(add.label).toBe('新建毒')
    const s1 = add.apply(stP())
    expect(s1.poisons![2]).toMatchObject({ id: 1000, name: '试验毒', curability: 'common' })
    expect(add.invert(s1).poisons).toHaveLength(2)
    const cmd = new UpdatePoisonCommand(551, { name: '赤毒·改' })
    const patched = cmd.apply(stP())
    expect(patched.poisons![0]!.name).toBe('赤毒·改')
    expect(cmd.invert(patched).poisons![0]!.name).toBe('赤毒')
  })
})
