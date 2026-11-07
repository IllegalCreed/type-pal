import type { AssetId } from './asset.js'
import { type AuthorDialogueCue, checkAuthorDialogueCue } from './author-dialogue.js'
import type { AuthorCommand, AuthorStagesFlow } from './author-script.js'
import type { EntityAddress, StageId } from './author-script-core.js'
import type { Facing } from './index.js'
import type { ItemData } from './item.js'

/** The four built-in recipes have business parameters, not a general parameter language. */
export type ItemReward =
  | { kind: 'item'; itemId: string; count: number }
  | { kind: 'money'; amount: number }

export type RewardNotice =
  | { kind: 'silent' }
  | { kind: 'standard'; timing: 'before' | 'after' }
  | { kind: 'custom'; timing: 'before' | 'after'; cue: AuthorDialogueCue }

export type AcquisitionEmptyFeedback =
  | { kind: 'silent' }
  | { kind: 'custom'; cue: AuthorDialogueCue }

export interface AcquisitionStage {
  id: StageId
  label?: string
}

export interface AuthorGrantRewardCommand {
  kind: 'grantReward'
  rewards: ItemReward[]
  notice: RewardNotice
}

interface AcquisitionFlowBase {
  kind: 'acquisition'
  rewards: ItemReward[]
  notice: RewardNotice
}

export type AuthorAcquisitionFlow = AcquisitionFlowBase &
  (
    | {
        recipe: 'builtin/item/chest'
        stages: { available: AcquisitionStage; collected: AcquisitionStage }
        opening: { facing: Facing; frame: number; sound?: AssetId }
        empty: AcquisitionEmptyFeedback
      }
    | {
        recipe: 'builtin/item/pickup'
        stages: { available: AcquisitionStage }
        sound?: AssetId
      }
    | ({
        recipe: 'builtin/item/search'
        stages: { available: AcquisitionStage; collected: AcquisitionStage }
        sound?: AssetId
      } & (
        | { afterCollect: 'repeat'; empty: AcquisitionEmptyFeedback }
        | { afterCollect: 'disable' }
      ))
  )

export const ITEM_ACQUISITION_RECIPES = {
  'builtin/item/chest': '宝箱领取',
  'builtin/item/pickup': '拾取地面物品',
  'builtin/item/search': '搜刮固定地点',
} as const

export type AcquisitionItems = readonly Pick<ItemData, 'id' | 'name'>[]

/** Raw parameter paths are editable identities; generated giveItem commands are not references. */
export function acquisitionItemReferencesAtNode(
  value: unknown,
  where: string,
): Array<{ itemId: string; where: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const node = value as Record<string, unknown>
  if ((node.kind !== 'grantReward' && node.kind !== 'acquisition') || !Array.isArray(node.rewards))
    return []
  return node.rewards.flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const reward = value as Record<string, unknown>
    return reward.kind === 'item' && typeof reward.itemId === 'string'
      ? [{ itemId: reward.itemId, where: `${where}.rewards[${index}].itemId` }]
      : []
  })
}

function copyCue(cue: AuthorDialogueCue): AuthorDialogueCue {
  return JSON.parse(JSON.stringify(cue)) as AuthorDialogueCue
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) throw new Error(`${path}.${key}: 未知字段`)
}

function nonEmpty(value: unknown, path: string): void {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${path}: 期望非空字符串`)
}

function positive(value: unknown, path: string): void {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new Error(`${path}: 期望正安全整数`)
}

export function checkItemRewards(value: unknown, path: string): asserts value is ItemReward[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${path}: 期望非空奖励数组`)
  value.forEach((entry, index) => {
    const where = `${path}[${index}]`
    const reward = record(entry, where)
    if (reward.kind === 'item') {
      keys(reward, ['kind', 'itemId', 'count'], where)
      nonEmpty(reward.itemId, `${where}.itemId`)
      positive(reward.count, `${where}.count`)
    } else if (reward.kind === 'money') {
      keys(reward, ['kind', 'amount'], where)
      positive(reward.amount, `${where}.amount`)
    } else throw new Error(`${where}.kind: 期望 item|money`)
  })
}

function checkNotice(value: unknown, path: string, reward: boolean): void {
  const notice = record(value, path)
  if (notice.kind === 'silent') {
    keys(notice, ['kind'], path)
    return
  }
  if (notice.kind !== 'custom' && !(reward && notice.kind === 'standard'))
    throw new Error(`${path}.kind: 期望 ${reward ? 'silent|standard|custom' : 'silent|custom'}`)
  keys(
    notice,
    ['kind', ...(reward ? ['timing'] : []), ...(notice.kind === 'custom' ? ['cue'] : [])],
    path,
  )
  if (reward && notice.timing !== 'before' && notice.timing !== 'after')
    throw new Error(`${path}.timing: 期望 before|after`)
  if (notice.kind === 'custom') checkAuthorDialogueCue(notice.cue, `${path}.cue`)
}

export function checkGrantRewardCommand(
  value: unknown,
  path: string,
): asserts value is AuthorGrantRewardCommand {
  const command = record(value, path)
  keys(command, ['kind', 'rewards', 'notice'], path)
  if (command.kind !== 'grantReward') throw new Error(`${path}.kind: 期望 grantReward`)
  checkItemRewards(command.rewards, `${path}.rewards`)
  checkNotice(command.notice, `${path}.notice`, true)
}

export function checkAcquisitionFlow(
  value: unknown,
  path: string,
): asserts value is AuthorAcquisitionFlow {
  const flow = record(value, path)
  if (flow.kind !== 'acquisition') throw new Error(`${path}.kind: 期望 acquisition`)
  if (typeof flow.recipe !== 'string' || !Object.hasOwn(ITEM_ACQUISITION_RECIPES, flow.recipe))
    throw new Error(`${path}.recipe: 未知内置取物流程`)
  const pickup = flow.recipe === 'builtin/item/pickup'
  const chest = flow.recipe === 'builtin/item/chest'
  const search = flow.recipe === 'builtin/item/search'
  keys(
    flow,
    [
      'kind',
      'recipe',
      'stages',
      'rewards',
      'notice',
      ...(pickup || search ? ['sound'] : []),
      ...(chest || (search && flow.afterCollect === 'repeat') ? ['empty'] : []),
      ...(chest ? ['opening'] : []),
      ...(search ? ['afterCollect'] : []),
    ],
    path,
  )
  checkItemRewards(flow.rewards, `${path}.rewards`)
  checkNotice(flow.notice, `${path}.notice`, true)
  const stages = record(flow.stages, `${path}.stages`)
  const stageKeys = pickup ? ['available'] : ['available', 'collected']
  keys(stages, stageKeys, `${path}.stages`)
  const ids = new Set<string>()
  for (const key of stageKeys) {
    const stagePath = `${path}.stages.${key}`
    const stage = record(stages[key], stagePath)
    keys(stage, ['id', 'label'], stagePath)
    nonEmpty(stage.id, `${stagePath}.id`)
    if (ids.has(String(stage.id))) throw new Error(`${stagePath}.id: 步骤 ID 重复`)
    ids.add(String(stage.id))
    if (stage.label !== undefined) nonEmpty(stage.label, `${stagePath}.label`)
  }
  if (search && flow.afterCollect !== 'repeat' && flow.afterCollect !== 'disable')
    throw new Error(`${path}.afterCollect: 期望 repeat|disable`)
  if (chest || (search && flow.afterCollect === 'repeat'))
    checkNotice(flow.empty, `${path}.empty`, false)
  if (chest) {
    const opening = record(flow.opening, `${path}.opening`)
    keys(opening, ['facing', 'frame', 'sound'], `${path}.opening`)
    if (!['up', 'down', 'left', 'right'].includes(String(opening.facing)))
      throw new Error(`${path}.opening.facing: 期望 up|down|left|right`)
    if (!Number.isSafeInteger(opening.frame) || Number(opening.frame) < 0)
      throw new Error(`${path}.opening.frame: 期望非负安全整数`)
    if (opening.sound !== undefined) nonEmpty(opening.sound, `${path}.opening.sound`)
  }
  if ((pickup || search) && flow.sound !== undefined) nonEmpty(flow.sound, `${path}.sound`)
}

export { acquisitionPreviewStages } from './acquisition-preview-stages.js'

export function expandGrantReward(
  command: AuthorGrantRewardCommand,
  items: AcquisitionItems,
): AuthorCommand[] {
  for (const reward of command.rewards)
    if (reward.kind === 'item' && !items.some((item) => item.id === reward.itemId))
      throw new Error(`奖励物品不存在: ${reward.itemId}`)
  const grants: AuthorCommand[] = command.rewards.map((reward) =>
    reward.kind === 'item'
      ? { kind: 'giveItem', itemId: reward.itemId, count: reward.count }
      : { kind: 'giveMoney', delta: reward.amount },
  )
  const notice = command.notice
  if (notice.kind === 'silent') return grants
  const dialogues: AuthorCommand[] =
    notice.kind === 'custom'
      ? [{ kind: 'dialog', cue: copyCue(notice.cue) }]
      : command.rewards.map((reward) => {
          const row =
            reward.kind === 'money'
              ? { reward: { kind: 'money' as const, amount: reward.amount } }
              : (() => {
                  const item = items.find((entry) => entry.id === reward.itemId)
                  if (!item) throw new Error(`奖励物品不存在: ${reward.itemId}`)
                  return {
                    reward: { kind: 'item' as const, itemName: item.name, count: reward.count },
                  }
                })()
          return {
            kind: 'dialog',
            cue: { identity: { kind: 'narration' }, slot: 'narration', rows: [row] },
          }
        })
  return notice.timing === 'before' ? [...dialogues, ...grants] : [...grants, ...dialogues]
}

/** The caller owns the persistent stages. Expanding never introduces a global claim flag. */
export function expandAcquisitionFlow(
  flow: AuthorAcquisitionFlow,
  self: EntityAddress,
  items: AcquisitionItems,
): AuthorStagesFlow {
  const body: AuthorCommand[] = []
  if (flow.recipe === 'builtin/item/chest') {
    body.push(
      { kind: 'setEntityFacing', target: { ...self }, facing: flow.opening.facing },
      { kind: 'setEntityFrame', target: { ...self }, frame: flow.opening.frame },
      { kind: 'clearDialog' },
    )
    if (flow.opening.sound) body.push({ kind: 'playSound', asset: flow.opening.sound })
  } else if (flow.recipe === 'builtin/item/pickup') {
    // The entity is no longer searchable while its reward message is being acknowledged.
    body.push({ kind: 'setEntityState', target: { ...self }, state: 0 }, { kind: 'clearDialog' })
    if (flow.sound) body.push({ kind: 'playSound', asset: flow.sound })
  } else if (flow.sound) body.push({ kind: 'playSound', asset: flow.sound })
  body.push(
    ...expandGrantReward(
      { kind: 'grantReward', rewards: flow.rewards, notice: flow.notice },
      items,
    ),
  )
  if (flow.recipe === 'builtin/item/search' && flow.afterCollect === 'disable')
    body.push({ kind: 'setEntityState', target: { ...self }, state: 0 })
  const initial = { ...flow.stages.available, body }
  if (flow.recipe === 'builtin/item/pickup')
    return {
      kind: 'stages',
      initial: initial.id,
      stages: [{ ...initial, next: { kind: 'complete' } }],
    }
  return {
    kind: 'stages',
    initial: initial.id,
    stages: [
      { ...initial, next: flow.stages.collected.id },
      {
        ...flow.stages.collected,
        body:
          'empty' in flow && flow.empty.kind === 'custom'
            ? [{ kind: 'dialog', cue: copyCue(flow.empty.cue) }]
            : [],
      },
    ],
  }
}
