import type { ItemData } from '@type-pal/content'
import {
  applyPalGeneratedCraftMessages,
  applyPalGeneratedResourcePoolMessages,
} from './pal-authored-overlays.js'
import type { SourceStore } from './pal-derived-content.js'
import type { SourceItem } from './pal-source-types.js'
import type { SourceCmd } from './source-facts.js'

export function buildLabelIndex(commands: readonly SourceCmd[]): Map<string, number> {
  const m = new Map<string, number>()
  commands.forEach((c, i) => {
    if (c.label) m.set(c.label, i)
  })
  return m
}

/** all.json 保留物理地址语义：显式标签必须与数组位置一致，隐式标签补全。 */
export function buildSourceAddressLabelIndex(commands: readonly SourceCmd[]): Map<string, number> {
  const labelIndex = buildLabelIndex(commands)
  commands.forEach((command, address) => {
    const expected = `L_${address}`
    if (command.label !== undefined && command.label !== expected)
      throw new Error(
        `all.json 显式 label 与数组地址不一致: index=${address}, label=${command.label}`,
      )
    if (!labelIndex.has(expected)) labelIndex.set(expected, address)
  })
  return labelIndex
}

export interface PalItemMessageSource {
  id: string
  effect: Extract<
    NonNullable<ItemData['use']>['effects'][number],
    { kind: 'craftRecipe' | 'drawFromResourcePool' }
  >
}

/** 只读取两个仍由原始源维护的完整用途形状，不转换其它物品字段或用途。 */
export function buildPalItemMessageSources(
  items: readonly SourceItem[],
  commands: readonly SourceCmd[],
  stores: readonly SourceStore[],
): PalItemMessageSource[] {
  const labelIndex = buildSourceAddressLabelIndex(commands)
  const rewards = stores.filter(({ id }) => id === 0)
  if (rewards.length !== 1) throw new Error(`PAL 窄物品提示源: Store0 数量 ${rewards.length} != 1`)
  return [268, 270].map((id) => {
    const candidates = items.filter((item) => item.id === id)
    const item = candidates[0]
    if (candidates.length !== 1 || !item?.flags.usable)
      throw new Error(`PAL 窄物品提示源: item${id} 缺唯一可用定义`)
    const effect =
      id === 268
        ? translateCraftRecipeScript(commands, labelIndex, item.scriptOnUse)
        : translateResourcePoolScript(commands, labelIndex, item.scriptOnUse, rewards[0]!.items)
    if (
      !effect ||
      (effect.kind !== 'craftRecipe' && effect.kind !== 'drawFromResourcePool') ||
      effect.kind !== (id === 268 ? 'craftRecipe' : 'drawFromResourcePool')
    )
      throw new Error(`PAL 窄物品提示源: item${id} 用途形状漂移`)
    return { id: String(id), effect }
  })
}

/** 现有同步器只比较用途结构并同步失败原文；输入壳来自作者，绝不生成其它物品字段。 */
export function applyPalItemMessageSources(
  current: readonly ItemData[],
  sources: readonly PalItemMessageSource[],
): ItemData[] {
  const generated = sources.map(({ id, effect }) => {
    const item = current.find((candidate) => candidate.id === id)
    if (!item?.use) throw new Error(`PAL 窄物品提示源: current 缺物品 ${id} 用途`)
    return { ...item, use: { ...item.use, effects: [effect] } }
  })
  return applyPalGeneratedResourcePoolMessages(
    applyPalGeneratedCraftMessages(current, generated),
    generated,
  )
}

/**
 * 识别 0x20 “有任一材料就扣除并跳到同一产物段”的有序配方形状。
 * PAL 炼蛊皿只是该形状的一条源数据；产物、材料和优先级全部从命令流提取。
 */
export function translateCraftRecipeScript(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
): NonNullable<ItemData['use']>['effects'][number] | undefined {
  let cursor = labelIndex.get(`L_${ip}`)
  if (cursor === undefined) return undefined
  const seen = new Set<number>()
  const ingredients: Array<{ itemId: string; count: number }> = []
  let productStart: number | undefined
  let terminalFailure: number | undefined

  while (cursor !== undefined) {
    if (seen.has(cursor)) return undefined
    seen.add(cursor)
    const command = commands[cursor]
    if (command?.op !== 'raw' || command.opcode !== 0x20) break
    const [itemId = 0, rawCount = 0, failureAddress = 0] = command.operands ?? []
    if (itemId <= 0 || failureAddress <= 0) return undefined
    const next = commands[cursor + 1] as (SourceCmd & { to?: string }) | undefined
    const successStart = next?.op === 'goto' && next.to ? labelIndex.get(next.to) : cursor + 1
    if (successStart === undefined) return undefined
    if (productStart === undefined) productStart = successStart
    else if (productStart !== successStart) return undefined
    ingredients.push({ itemId: String(itemId), count: Math.max(1, rawCount) })

    const failure = labelIndex.get(`L_${failureAddress}`)
    if (failure === undefined) return undefined
    const failureCommand = commands[failure]
    if (failureCommand?.op === 'raw' && failureCommand.opcode === 0x20) {
      cursor = failure
      continue
    }
    terminalFailure = failure
    break
  }

  if (!ingredients.length || productStart === undefined || terminalFailure === undefined)
    return undefined
  const failureStyle = commands[terminalFailure]
  const failureMessage = commands[terminalFailure + 1]
  const failureEnd = commands[terminalFailure + 2]
  const nextFailureBlock = commands[terminalFailure + 3]
  if (
    failureStyle?.op !== 'setDialogStyleNarration' ||
    failureMessage?.op !== 'showDialog' ||
    typeof failureMessage.text !== 'string' ||
    failureMessage.text.trim().length === 0 ||
    failureEnd?.op !== 'end' ||
    (nextFailureBlock !== undefined && nextFailureBlock.label === undefined)
  )
    return undefined
  const unavailableMessage = failureMessage.text.trim()
  const products: Array<{ itemId: string; count: number }> = []
  for (let index = productStart; index < commands.length; index++) {
    const command = commands[index] as (SourceCmd & { itemId?: number; count?: number }) | undefined
    if (command?.op !== 'giveItem') break
    if ((command.itemId ?? 0) <= 0) return undefined
    products.push({
      itemId: String(command.itemId),
      count: command.count === 0 ? 1 : (command.count ?? 1),
    })
  }
  if (!products.length) return undefined
  return {
    kind: 'craftRecipe',
    recipes: ingredients.map((ingredient) => ({ ingredients: [ingredient], products })),
    unavailableMessage,
  }
}

/** 读取共享失败臂的严格旁白三元组；共享入边数量不参与 owner 判断。 */
function strictNarrationFailureMessage(
  commands: readonly SourceCmd[],
  start: number,
): string | undefined {
  const style = commands[start]
  const message = commands[start + 1]
  const end = commands[start + 2]
  const nextBlock = commands[start + 3]
  if (
    style?.op !== 'setDialogStyleNarration' ||
    message?.op !== 'showDialog' ||
    typeof message.text !== 'string' ||
    message.text.trim().length === 0 ||
    end?.op !== 'end' ||
    (nextBlock !== undefined && nextBlock.label === undefined)
  )
    return undefined
  return message.text.trim()
}

/**
 * 识别 0x34“从 collectValue 抽取并扣同档资源、按 Store0 档位给奖励”的完整形状。
 * operand0 是零资源时的直接失败地址；共享失败臂只按该控制流读取，不要求唯一入边。
 */
export function translateResourcePoolScript(
  commands: readonly SourceCmd[],
  labelIndex: ReadonlyMap<string, number>,
  ip: number,
  rewardItemIds: readonly number[],
):
  | Extract<NonNullable<ItemData['use']>['effects'][number], { kind: 'drawFromResourcePool' }>
  | undefined {
  const start = labelIndex.get(`L_${ip}`)
  if (start === undefined || rewardItemIds.length === 0) return undefined
  const command = commands[start]
  if (command?.op !== 'raw' || command.opcode !== 0x34 || commands[start + 1]?.op !== 'end')
    return undefined
  const [failureAddress = 0] = command.operands ?? []
  if (failureAddress <= 0) return undefined
  const failure = labelIndex.get(`L_${failureAddress}`)
  if (failure === undefined) return undefined
  const unavailableMessage = strictNarrationFailureMessage(commands, failure)
  if (unavailableMessage === undefined) return undefined
  return {
    kind: 'drawFromResourcePool',
    resource: 'collectValue',
    maxRoll: rewardItemIds.length,
    rewards: rewardItemIds.map((itemId) => ({ itemId: String(itemId), count: 1 })),
    unavailableMessage,
  }
}
