// @vitest-environment jsdom
import type { AssetCatalogV1 } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { CutsceneTab } from './CutsceneTab.js'
import { ImageTab } from './ImageTab.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import { MusicTab } from './MusicTab.js'
import { SoundTab } from './SoundTab.js'

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'music.test': {
      kind: 'music',
      path: 'assets/music/test.mid',
      mediaType: 'audio/midi',
      bytes: 4,
      sha256: '1'.repeat(64),
      label: '测试音乐',
      origin: { kind: 'authored' },
    },
    'sound.test': {
      kind: 'sound',
      path: 'assets/sound/test.wav',
      mediaType: 'audio/wav',
      bytes: 4,
      sha256: '2'.repeat(64),
      label: '测试音效',
      origin: { kind: 'authored' },
    },
    'sound.unused': {
      kind: 'sound',
      path: 'assets/sound/unused.wav',
      mediaType: 'audio/wav',
      bytes: 4,
      sha256: '5'.repeat(64),
      label: '未使用音效',
      origin: { kind: 'authored' },
    },
    'portrait.test': {
      kind: 'portrait',
      path: 'assets/images/test.png',
      mediaType: 'image/png',
      bytes: 4,
      sha256: '3'.repeat(64),
      label: '测试立绘',
      origin: { kind: 'authored' },
    },
    'portrait.unused': {
      kind: 'portrait',
      path: 'assets/images/unused.png',
      mediaType: 'image/png',
      bytes: 4,
      sha256: '6'.repeat(64),
      label: '未使用立绘',
      origin: { kind: 'authored' },
    },
    'video.test': {
      kind: 'video',
      path: 'assets/video/test.mp4',
      mediaType: 'video/mp4',
      bytes: 12,
      sha256: '4'.repeat(64),
      label: '测试视频',
      origin: { kind: 'authored' },
    },
    'video.unused': {
      kind: 'video',
      path: 'assets/video/unused.mp4',
      mediaType: 'video/mp4',
      bytes: 12,
      sha256: '7'.repeat(64),
      label: '未使用视频',
      origin: { kind: 'authored' },
    },
  },
}

function state(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: '测试项目',
      contentVersion: 17,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's001',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [
      {
        id: 's001',
        mapId: 'map.test',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [
          {
            body: [
              { kind: 'playMusic', asset: 'music.test' },
              { kind: 'playMusic', asset: 'music.test' },
              { kind: 'playSound', asset: 'sound.test' },
              { kind: 'playSound', asset: 'sound.test' },
              {
                kind: 'dialog',
                cue: {
                  rows: [{ text: 'dialog.test' }],
                  portrait: { asset: 'portrait.test', side: 'left' },
                },
              },
              {
                kind: 'dialog',
                cue: {
                  rows: [{ text: 'dialog.test' }],
                  portrait: { asset: 'portrait.test', side: 'left' },
                },
              },
              { kind: 'playVideo', asset: 'video.test' },
              { kind: 'playVideo', asset: 'video.test' },
            ],
          },
        ],
      },
    ],
    actors: [],
    levelUp: {},
    skills: [],
    items: [],
    enemies: [],
    enemyTeams: [],
    poisons: [],
    shops: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: catalog,
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
  } as unknown as EditorState
}

const reader = {
  projectId: 'test',
  record: (id: keyof typeof catalog.assets) => catalog.assets[id],
  readBytes: vi.fn(async () => {
    throw new Error('测试不加载媒体正文')
  }),
  readRoleBytes: vi.fn(async () => new ArrayBuffer(0)),
  urlFor: vi.fn(async () => ''),
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.clearAllMocks()
})

describe('asset inspectors shared tabs', () => {
  test('ImageTab 使用资源/引用 canonical Inspector', async () => {
    const session = new EditSession(state())
    await act(async () => {
      root.render(
        <ImageTab
          assetBase={{} as never}
          catalog={catalog}
          reader={reader as never}
          session={session}
          focusObjectId="portrait.test"
        />,
      )
      await Promise.resolve()
    })
    await verifyInspectorTabs(host, '图片检查器', ['属性', '引用 2', '诊断 0'], {
      identity: 'workbench-hero',
    })
    expect(host.querySelectorAll('.ds-reference-row')).toHaveLength(1)
    expect(host.querySelector('.ds-reference-row')?.tagName).toBe('ARTICLE')
    expect(host.querySelector('.ds-reference-row__trailing')?.textContent).toContain('2 次')
    expect(host.querySelector('.ds-diagnostic-panel[data-state="clear"]')).not.toBeNull()
    expect(
      host.querySelectorAll('[role="tablist"][aria-label="图片检查器"] [role="tab"]'),
    ).toHaveLength(3)
  })

  test('MusicTab 使用资源/引用 canonical Inspector', async () => {
    const session = new EditSession(state())
    await act(async () =>
      root.render(
        <MusicTab
          catalog={catalog}
          resolver={reader as never}
          session={session}
          focusObjectId="music.test"
        />,
      ),
    )
    await verifyInspectorTabs(host, '音乐检查器', ['资源', '引用 2'])
    expect(host.querySelectorAll('.ds-reference-row')).toHaveLength(1)
    expect(host.querySelector('.ds-reference-row__trailing')?.textContent).toContain('2 次')
  })

  test('SoundTab 使用资源/引用 canonical Inspector', async () => {
    const session = new EditSession(state())
    await act(async () =>
      root.render(
        <SoundTab
          catalog={catalog}
          reader={reader as never}
          session={session}
          focusObjectId="sound.test"
        />,
      ),
    )
    await verifyInspectorTabs(host, '音效检查器', ['资源', '引用 2'])
    expect(host.querySelectorAll('.ds-reference-row')).toHaveLength(1)
    expect(host.querySelector('.ds-reference-row__trailing')?.textContent).toContain('2 次')
    expect(host.querySelector('.ds-diagnostic-panel[data-state="clear"]')).not.toBeNull()
    expect(
      host.querySelectorAll('[role="tablist"][aria-label="音效检查器"] [role="tab"]'),
    ).toHaveLength(2)
  })

  test('CutsceneTab 使用资源/引用/诊断 canonical Inspector', async () => {
    const session = new EditSession(state())
    await act(async () => {
      root.render(
        <CutsceneTab
          assetBase={{} as never}
          catalog={catalog}
          reader={reader as never}
          session={session}
          focusObjectId="video.test"
        />,
      )
      await Promise.resolve()
    })
    await verifyInspectorTabs(host, '过场资源检查器', ['属性', '引用 2', /^诊断 \d+$/], {
      identity: 'workbench-hero',
    })
    expect(host.querySelectorAll('.ds-reference-row')).toHaveLength(1)
    expect(host.querySelector('.ds-reference-row__trailing')?.textContent).toContain('2 次')
    expect(host.querySelector('.ds-diagnostic-panel[data-state="clear"]')).not.toBeNull()
  })

  test('Image 独立诊断页与 Sound 引用页诊断均随当前资源过滤', async () => {
    const session = new EditSession(state())
    await act(async () => {
      root.render(
        <ImageTab
          assetBase={{} as never}
          catalog={catalog}
          reader={reader as never}
          session={session}
          focusObjectId="portrait.unused"
        />,
      )
      await Promise.resolve()
    })
    await verifyInspectorTabs(host, '图片检查器', ['属性', '引用 0', '诊断 1'], {
      identity: 'workbench-hero',
    })
    const imageTabs = host.querySelectorAll<HTMLButtonElement>(
      '[role="tablist"][aria-label="图片检查器"] [role="tab"]',
    )
    expect(imageTabs).toHaveLength(3)
    await act(async () => imageTabs[2]!.click())
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(1)
    expect(host.querySelector('.ds-diagnostic-row')?.tagName).toBe('ARTICLE')
    expect(host.textContent).toContain('portrait.unused')
    expect(host.textContent).not.toContain('sound.unused 当前未被引用')

    await act(async () =>
      root.render(
        <SoundTab
          catalog={catalog}
          reader={reader as never}
          session={session}
          focusObjectId="sound.unused"
        />,
      ),
    )
    await verifyInspectorTabs(host, '音效检查器', ['资源', '引用 0'])
    expect(
      host.querySelectorAll('[role="tablist"][aria-label="音效检查器"] [role="tab"]'),
    ).toHaveLength(2)
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(1)
    expect(host.textContent).toContain('sound.unused')
    expect(host.textContent).not.toContain('portrait.unused 当前未被引用')
  })

  test('Cutscene 诊断静态行与清空状态随选择切换', async () => {
    const session = new EditSession(state())
    const render = async (focusObjectId: string) => {
      await act(async () => {
        root.render(
          <CutsceneTab
            assetBase={{} as never}
            catalog={catalog}
            reader={reader as never}
            session={session}
            focusObjectId={focusObjectId}
          />,
        )
        await Promise.resolve()
      })
    }
    await render('video.unused')
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(1)
    expect(host.querySelector('.ds-diagnostic-row')?.tagName).toBe('ARTICLE')
    expect(host.textContent).toContain('video.unused')

    await render('video.test')
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(0)
    expect(host.querySelector('.ds-diagnostic-panel[data-state="clear"]')).not.toBeNull()
  })
})
