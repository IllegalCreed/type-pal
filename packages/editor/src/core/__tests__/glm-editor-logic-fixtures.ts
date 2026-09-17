/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 test-only fixture：最小合法 EditorState 构造器与深快照助手。
 * 只放数据/薄构造器，不复制产品算法，不被生产导入。基础形状取自现有
 * world-variable-commands.test.ts / stamp-commands.test.ts 的合法种子（manifest/entryPoints 满足
 * 现行类型），按需增删可选域；不伪造可保存 canonical 工程，仅证明局部命令合同。
 * 受测值经现行一手守卫正控：actorCue 过 checkAuthorDialogueCue（portrait.side/rows 对象），
 * tinyMap 过 validateProjectMap（空格 tiles/sources 必须同为 null）——R1 反例后修正。
 */

import type { StampTemplate } from '@type-pal/content'
import { type AuthorDialogueCue, checkAuthorDialogueCue } from '@type-pal/content'
import { expect } from 'vitest'
import type { EditorState } from '../edit-session.js'

export interface StateOptions {
  worldVariables?: EditorState['worldVariables']
  actors?: EditorState['actors']
  scenes?: EditorState['scenes']
  sharedScripts?: EditorState['sharedScripts']
  items?: EditorState['items']
  skills?: EditorState['skills']
  enemies?: EditorState['enemies']
  stamps?: StampTemplate[]
  scriptChunks?: EditorState['scriptChunks']
  mapIndex?: EditorState['mapIndex']
  maps?: EditorState['maps']
  sprites?: EditorState['sprites']
  locale?: EditorState['locale']
  levelUp?: EditorState['levelUp']
  assetCatalog?: EditorState['assetCatalog']
  manifest?: EditorState['manifest']
}

/** 最小合法状态：一个入口场景 s，空表。 */
export function baseState(options: StateOptions = {}): EditorState {
  return {
    manifest:
      options.manifest ??
      ({
        id: 'editor-boundaries',
        name: 'Editor Boundaries',
        contentVersion: 20,
        minimumSaveVersion: 8,
        defaultEntryId: 'main',
        content: { worldVariables: 'content/world-variables.json' },
        assets: { catalog: 'assets/index.json', roles: {} },
        entryPoints: [
          {
            id: 'main',
            label: '主要入口',
            scene: 's',
            startWorld: { party: [], money: 0, inventory: [] },
          },
        ],
      } as EditorState['manifest']),
    sceneIndex: { version: 1, scenes: [{ id: 's', name: '场景', path: 'content/scenes/s.json' }] },
    scenes: options.scenes ?? [
      {
        id: 's',
        mapId: 'map-s',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
      },
    ],
    worldVariables: options.worldVariables,
    sharedScripts: options.sharedScripts,
    actors: options.actors ?? [],
    skills: options.skills ?? [],
    levelUp: options.levelUp ?? {},
    items: options.items ?? [],
    enemies: options.enemies as EditorState['enemies'],
    locale: options.locale ?? {},
    sprites: options.sprites ?? [],
    battleSprites: [],
    maps: options.maps ?? {},
    mapIndex: options.mapIndex ?? { version: 1, maps: [] },
    tilesets: [],
    stamps: options.stamps ?? [],
    tilesetBlobs: {},
    scriptChunks: options.scriptChunks ?? {},
    assetCatalog: options.assetCatalog ?? { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

/** 独立深快照：与输入完全脱离引用；返回值可反向自证不别名。 */
export function deepSnapshot<T>(value: T): T {
  return structuredClone(value)
}

/** 断言助手：命令执行前后，未涉及的顶层域保持深相等。 */
export function expectUnchangedApartFrom(
  before: EditorState,
  after: EditorState,
  changed: ReadonlyArray<keyof EditorState>,
): void {
  for (const key of Object.keys(before) as Array<keyof EditorState>) {
    if ((changed as ReadonlyArray<string>).includes(key as string)) continue
    expect(after[key]).toEqual(before[key])
  }
}

/** 现行合法 actor cue（经 checkAuthorDialogueCue 正控；portrait 需 side，rows 需对象）。 */
export const actorCue = (expression: string): { kind: 'dialog'; cue: AuthorDialogueCue } => {
  const cue = {
    identity: {
      kind: 'actor' as const,
      actor: 'hero',
      portrait: { kind: 'expression' as const, expression, side: 'left' as const },
    },
    slot: 'bottom' as const,
    rows: [{ text: '对话' }],
  }
  checkAuthorDialogueCue(cue, 'fixture.actorCue')
  return { kind: 'dialog' as const, cue: cue as unknown as AuthorDialogueCue }
}
