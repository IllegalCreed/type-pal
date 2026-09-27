/**
 * TEST-GLM-STATE-COMMANDS-1 B批 fixture：skill/poison/enemy-team/enemy 命令残差共用的
 * 薄构造器与输入保真助手。业务正例基座 = buildBlankProject 正式空白项目
 * （经 cursor-command-boundary-fixtures 的 loadBoundaryProject 载入），构造后由
 * assertProjectSaveValid 自证通过正式保存门；有意缺表的防御轴单独提供，不得当合法正例。
 * 不复制产品算法，不被生产导入。
 */
import type { EnemyDef, EnemyTeamDef, PoisonDef, SkillData } from '@type-pal/content'
import { expect } from 'vitest'
import type { EditorState } from '../edit-session.js'
import { assertProjectSaveValid } from '../project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../project-reference-adapters.js'
import {
  loadBoundaryProject,
  withSharedEnemyBattleSprite,
} from './cursor-command-boundary-fixtures.js'

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

/**
 * 业务正例基座：正式空白项目 + 覆盖表（skills/poisons/enemies/enemyTeams）。
 * 构造后由正式保存门 assertProjectSaveValid 自证；未覆盖的表保持空白项目的合法值。
 */
export async function legalCommandState(over: CommandStateOver = {}): Promise<EditorState> {
  const { source, state } = await loadBoundaryProject('glm-state-commands-b')
  const withEnemyShape = await withSharedEnemyBattleSprite(source, state, 'enemy-shape')
  const next = { ...withEnemyShape, ...over } as EditorState
  assertProjectSaveValid(next)
  return next
}

/**
 * 防御轴专用：在合法空白项目上有意把整表置为 undefined，探测命令的 `?? []` 回退；
 * 这是刻意非法（缺表）输入，不得当合法正例使用。
 */
export async function defensiveCommandStateWithout(
  keys: ReadonlyArray<'skills' | 'poisons' | 'enemies' | 'enemyTeams'>,
): Promise<EditorState> {
  const { source, state } = await loadBoundaryProject('glm-state-commands-b')
  const withEnemyShape = await withSharedEnemyBattleSprite(source, state, 'enemy-shape')
  const next: Record<string, unknown> = { ...withEnemyShape }
  for (const key of keys) next[key] = undefined
  return next as unknown as EditorState
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
  battleSprite: 'enemy-shape',
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
