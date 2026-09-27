/**
 * TEST-GLM-STATE-COMMANDS-1 D批 fixture：shop/ambience/battle-field/world-variable 命令残差
 * 共用的薄构造器与输入保真助手。业务正例基座 = buildBlankProject 正式空白项目
 * （经 cursor-command-boundary-fixtures 的 loadBoundaryProject 载入），构造后由
 * assertProjectSaveValid 自证通过正式保存门；有意缺表的防御轴单独提供，不得当合法正例。
 * 不复制产品算法，不被生产导入。
 */
import type {
  AmbienceDef,
  BattleFieldDef,
  ShopDef,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import { expect } from 'vitest'
import type { EditorState } from '../edit-session.js'
import { assertProjectSaveValid } from '../project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../project-reference-adapters.js'
import { loadBoundaryProject } from './cursor-command-boundary-fixtures.js'

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

/**
 * 业务正例基座：正式空白项目 + 覆盖表（shops/ambiences/battleFields/worldVariables）。
 * 构造后由正式保存门 assertProjectSaveValid 自证；未覆盖的表保持空白项目的合法值。
 */
export async function legalDefinitionState(over: DefinitionStateOver = {}): Promise<EditorState> {
  const { state } = await loadBoundaryProject('glm-state-commands-d')
  const next = { ...state, ...over } as EditorState
  assertProjectSaveValid(next)
  return next
}

/**
 * 防御轴专用：在合法空白项目上有意把整表置为 undefined，探测命令的 `?? []`/`?.` 回退；
 * 这是刻意非法（缺表）输入，不得当合法正例使用。
 */
export async function defensiveDefinitionStateWithout(
  keys: ReadonlyArray<'shops' | 'ambiences' | 'battleFields' | 'worldVariables'>,
): Promise<EditorState> {
  const { state } = await loadBoundaryProject('glm-state-commands-d')
  const next: Record<string, unknown> = { ...state }
  for (const key of keys) next[key] = undefined
  return next as unknown as EditorState
}

/** 真实当前引用索引 provider——恒不 mock 恒空指数。 */
export const realRefs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

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
