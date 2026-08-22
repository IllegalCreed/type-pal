import type { CurrentManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  requireDefaultEntry,
  resolveInitialSceneId,
  resolveStartupEntry,
  shouldPlayEntryIntro,
  shouldShowOpeningMenu,
} from './startup-entry.js'

const world = (party: string[]) => ({ party, money: 0, learnedSkills: {}, inventory: [] })
const manifest = (): CurrentManifest => ({
  id: 'demo',
  name: 'Demo',
  contentVersion: 17,
  minimumSaveVersion: 8,
  defaultEntryId: 'second',
  entryPoints: [
    { id: 'first', label: '第一', scene: 's1', startWorld: world(['a']) },
    { id: 'second', label: '第二', scene: 's2', startWorld: world(['b']) },
  ],
  content: {},
  assets: { catalog: 'assets/index.json', roles: {} },
})

describe('canonical startup entry resolution', () => {
  test('defaultEntryId, not array order, selects direct startup', () => {
    const value = manifest()
    expect(requireDefaultEntry(value).id).toBe('second')
    value.entryPoints.reverse()
    expect(requireDefaultEntry(value).id).toBe('second')
  })

  test('explicit and invalid query preserve the boot contract', () => {
    expect(resolveStartupEntry(manifest(), 'first')).toMatchObject({
      selectedEntry: { id: 'first' },
      explicitMatch: true,
    })
    expect(resolveStartupEntry(manifest(), 'missing')).toMatchObject({
      selectedEntry: { id: 'second' },
      explicitMatch: false,
      invalidRequestedId: 'missing',
    })
  })

  test('scene override does not replace the selected entry world', () => {
    const selected = resolveStartupEntry(manifest(), 'first').selectedEntry
    expect(resolveInitialSceneId('debug', ['s1', 's2', 'debug'], selected)).toBe('debug')
    expect(resolveInitialSceneId('missing', ['s1', 's2'], selected)).toBe('s1')
    expect(selected.startWorld.party).toEqual(['a'])
  })

  test('menu、entry 与 scene 参数按直达优先级决定是否显示标题菜单', () => {
    const base = { menuRequested: true, explicitEntryMatch: false, sceneIds: ['s1', 's2'] }
    expect(shouldShowOpeningMenu(base)).toBe(true)
    expect(shouldShowOpeningMenu({ ...base, explicitEntryMatch: true })).toBe(false)
    expect(shouldShowOpeningMenu({ ...base, requestedSceneId: 's1' })).toBe(false)
    expect(shouldShowOpeningMenu({ ...base, requestedSceneId: 'missing' })).toBe(true)
    expect(shouldShowOpeningMenu({ ...base, menuRequested: false })).toBe(false)
  })

  test('入口 intro 仅在菜单选择新局时播放', () => {
    expect(shouldPlayEntryIntro('direct')).toBe(false)
    expect(shouldPlayEntryIntro('menu-load')).toBe(false)
    expect(shouldPlayEntryIntro('menu-entry')).toBe(true)
  })
})
