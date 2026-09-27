/**
 * TEST-GLM-STATE-COMMANDS-1 B批 fixture：skill/poison/enemy-team/enemy 命令残差共用的
 * 薄构造器、输入保真助手与真实引用 provider。形状取自 world-variable-commands.test.ts 的
 * 现行合法最小 EditorState（manifest/sceneIndex 满足真实引用投影）与
 * battle-data-delete-commands.test.ts 的战斗数据种子；不复制产品算法，不被生产导入。
 */
import type { EnemyDef, EnemyTeamDef, PoisonDef, SkillData } from '@type-pal/content'
import { expect } from 'vitest'
import type { EditorState } from '../edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../project-reference-adapters.js'

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

export interface CommandStateOver {
  skills?: SkillData[]
  poisons?: PoisonDef[]
  enemies?: EnemyDef[]
  enemyTeams?: EnemyTeamDef[]
}

/** 现行合法最小 EditorState：真实引用索引 collector 可直接消费。 */
export function baseCommandState(over: CommandStateOver = {}): EditorState {
  return {
    manifest: {
      id: 'state-commands-b',
      name: 'State Commands B',
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
    skills: over.skills ?? [],
    levelUp: {},
    items: [],
    poisons: over.poisons ?? [],
    enemies: over.enemies ?? [],
    enemyTeams: over.enemyTeams ?? [],
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

/** 真实当前引用索引 provider——恒不 mock 恒空指数。 */
export const realRefs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

export const mkSkill = (id: string, name = `技能${id}`): SkillData => ({
  id,
  name,
  desc: '',
  cost: { mp: 10 },
  usableOutsideBattle: false,
  target: 'oneEnemy',
  effects: [{ kind: 'damage', power: 20, elemental: 0 }],
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
})

export const mkPoison = (id: number, name = `毒${id}`): PoisonDef => ({
  id,
  name,
  curability: 'common',
  color: 0,
  playerTicks: [{ hpDelta: -10 }],
  enemyTicks: [{ hpDelta: -10 }],
})

export const mkEnemy = (id: string): EnemyDef => ({
  id,
  name: `name.${id}`,
  battleSprite: 'bs',
  yPosOffset: 0,
  stats: {
    health: 10,
    level: 1,
    exp: 1,
    cash: 1,
    attackStrength: 5,
    magicStrength: 0,
    defense: 0,
    dexterity: 5,
    fleeRate: 0,
    physicalResistance: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    dualMove: false,
    collectValue: 0,
  },
  ai: { resistanceToSorcery: 5 },
  sounds: {},
})

export const mkTeam = (id: string, slots: ReadonlyArray<string | null> = []): EnemyTeamDef => ({
  id,
  slots: [...slots],
})
