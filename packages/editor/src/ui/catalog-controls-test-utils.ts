import type { AssetCatalogV1 } from '@type-pal/content'
import { act } from 'react'
import type { EditorState } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'

export const catalogControlsAssetCatalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'portrait.primary': {
      kind: 'portrait',
      path: 'assets/images/primary.png',
      mediaType: 'image/png',
      bytes: 4,
      sha256: '1'.repeat(64),
      label: '主要立绘',
      origin: { kind: 'authored' },
    },
    'portrait.secondary': {
      kind: 'portrait',
      path: 'assets/images/secondary.png',
      mediaType: 'image/png',
      bytes: 4,
      sha256: '2'.repeat(64),
      label: '次要立绘',
      origin: { kind: 'authored' },
    },
    'face.primary': {
      kind: 'face',
      path: 'assets/images/face.png',
      mediaType: 'image/png',
      bytes: 4,
      sha256: '3'.repeat(64),
      label: '战斗头像',
      origin: { kind: 'authored' },
    },
    'music.opening': {
      kind: 'music',
      path: 'assets/music/opening.mid',
      mediaType: 'audio/midi',
      bytes: 4,
      sha256: '4'.repeat(64),
      label: '开场音乐',
      origin: { kind: 'authored' },
    },
    'music.ending': {
      kind: 'music',
      path: 'assets/music/ending.mid',
      mediaType: 'audio/midi',
      bytes: 4,
      sha256: '5'.repeat(64),
      label: '终章音乐',
      origin: { kind: 'authored' },
    },
    'sound.hit': {
      kind: 'sound',
      path: 'assets/sound/hit.wav',
      mediaType: 'audio/wav',
      bytes: 4,
      sha256: '6'.repeat(64),
      label: '命中音效',
      origin: { kind: 'authored' },
    },
    'sound.heal': {
      kind: 'sound',
      path: 'assets/sound/heal.wav',
      mediaType: 'audio/wav',
      bytes: 4,
      sha256: '7'.repeat(64),
      label: '治疗音效',
      origin: { kind: 'authored' },
    },
    'video.opening': {
      kind: 'video',
      path: 'assets/video/opening.mp4',
      mediaType: 'video/mp4',
      bytes: 4,
      sha256: '8'.repeat(64),
      label: '开场视频',
      origin: { kind: 'authored' },
    },
    'video.ending': {
      kind: 'video',
      path: 'assets/video/ending.mp4',
      mediaType: 'video/mp4',
      bytes: 4,
      sha256: '9'.repeat(64),
      label: '片尾视频',
      origin: { kind: 'authored' },
    },
    'frame-animation.logo': {
      kind: 'frame-animation',
      path: 'assets/frame-animation/logo.tpfs',
      mediaType: 'application/vnd.type-pal.frame-sequence',
      bytes: 4,
      sha256: 'a'.repeat(64),
      label: '徽标帧动画',
      origin: { kind: 'authored' },
    },
  },
}

export function catalogControlsEditorState(
  assetCatalog: AssetCatalogV1 = catalogControlsAssetCatalog,
): EditorState {
  const startWorld = { party: [], money: 0, inventory: [] }
  return {
    manifest: {
      id: 'catalog-controls-test',
      name: '目录控件测试',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      entryPoints: [{ id: 'main', label: '主要入口', scene: 's001', startWorld }],
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [],
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
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog,
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
  } as unknown as EditorState
}

export const catalogControlsReader: EditorAssetReader = {
  projectId: 'catalog-controls-test',
  record: (id) => {
    const record = catalogControlsAssetCatalog.assets[id]
    if (!record) throw new Error(`AssetId "${id}" 不在测试 catalog`)
    return record
  },
  readBytes: async () => new ArrayBuffer(4),
  readRoleBytes: async () => new ArrayBuffer(0),
  urlFor: async () => '',
}

export async function setCatalogSearch(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
