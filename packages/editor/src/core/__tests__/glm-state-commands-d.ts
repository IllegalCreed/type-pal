/**
 * TEST-GLM-STATE-COMMANDS-1 D批 fixture：shop/ambience/battle-field/world-variable 命令残差
 * 共用的薄构造器与输入保真助手。最小 EditorState 形状取自 shop-lifecycle.test.ts /
 * world-variable-commands.test.ts 现行合法种子；不复制产品算法，不被生产导入。
 */
import type {
  AmbienceDef,
  BattleFieldDef,
  ShopDef,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import { expect } from 'vitest'
import type { EditorState } from '../edit-session.js'

/** 独立深快照：与输入完全脱离引用。 */
export function deepSnapshot<T>(value: T): T {
  return structuredClone(value)
}

/** 捕获实际 Error 并整串比较 message（不是 toThrow 子串匹配）。 */
export function expectExactError(run: () => unknown, message: string): void {
  let caught: unknown
  try {
    caught = run()
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(Error)
  expect((caught as Error).message).toBe(message)
}

/**
 * 多实参输入保真——每个对象实参调用前独立快照，执行后立即逐一比较同一实参。
 * 原始不可变标量不传入。
 */
export function expectInputsUnchanged(
  run: (first: object) => void,
  inputs: readonly object[],
): void {
  const snapshots = inputs.map((input) => deepSnapshot(input))
  if (inputs.length > 0) run(inputs[0] as object)
  inputs.forEach((input, index) => {
    expect(input).toEqual(snapshots[index])
  })
}

export interface DefinitionStateOver {
  shops?: ShopDef[]
  ambiences?: AmbienceDef[]
  battleFields?: BattleFieldDef[]
  worldVariables?: WorldVariableRegistryV1
}

/** 最小合法 EditorState：真实引用索引 collector 可直接消费（manifest 满足投影）。 */
export function definitionState(over: DefinitionStateOver = {}): EditorState {
  return {
    manifest: {
      id: 'state-commands-d',
      name: 'State Commands D',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    sceneIndex: { version: 1, scenes: [{ id: 's', name: '场景', path: 'content/scenes/s.json' }] },
    scenes: [],
    sharedScripts: {},
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    shops: over.shops,
    ambiences: over.ambiences,
    battleFields: over.battleFields,
    worldVariables: over.worldVariables,
    enemies: [],
    enemyTeams: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

/** 构造带清单的战场定义（validateBattleFields 合法形状）。 */
export const mkField = (id: number): BattleFieldDef => ({
  id,
  screenWave: 0,
  magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
})

export const mkAmbience = (id: string, name = `氛围${id}`): AmbienceDef => ({
  id,
  name,
  tint: [255, 255, 255],
})

export const mkShop = (id: number, items: string[] = []): ShopDef => ({ id, items })
