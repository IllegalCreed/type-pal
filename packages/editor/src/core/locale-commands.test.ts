import { describe, expect, test } from 'vitest'
import * as oldEntry from './commands.js'
import { RenameProjectCommand, UpdateLevelUpCommand, UpdateLocaleCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { UpdateLevelUpCommand as UpdateLevelUpMoved } from './level-up-commands.js'
import { UpdateLocaleCommand as UpdateLocaleMoved } from './locale-commands.js'
import { RenameProjectCommand as RenameProjectMoved } from './project-name-command.js'

function shell(): EditorState {
  return {
    locale: { 'name.hero': '旧名' },
    levelUp: { hero: [{ level: 2, skillId: 'slash' }] },
    manifest: {
      id: 'demo',
      name: '演示项目',
      contentVersion: 20,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    items: [],
    skills: [],
    scenes: [],
    actors: [],
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

describe('C09 locale level-up and project-name commands', () => {
  test('keeps metadata constructors on the old commands barrel and patches locale text', () => {
    expect(oldEntry.UpdateLocaleCommand).toBe(UpdateLocaleMoved)
    expect(oldEntry.UpdateLevelUpCommand).toBe(UpdateLevelUpMoved)
    expect(oldEntry.RenameProjectCommand).toBe(RenameProjectMoved)
    const locale = new UpdateLocaleCommand('name.hero', '新名')
    expect(locale.label).toBe('修改文本')
    const current = shell()
    const next = locale.apply(current)
    expect(next.locale['name.hero']).toBe('新名')
    expect(current.locale['name.hero']).toBe('旧名')
    expect(locale.invert(next).locale['name.hero']).toBe('旧名')
    const levelUp = new UpdateLevelUpCommand('hero', [{ level: 5, skillId: 'fire' }])
    expect(levelUp.apply(current).levelUp.hero).toEqual([{ level: 5, skillId: 'fire' }])
    const rename = new RenameProjectCommand('新标题')
    expect(rename.apply(current).manifest.name).toBe('新标题')
    expect(rename.invert(rename.apply(current)).manifest.name).toBe('演示项目')
  })
})
