import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  buildLabelIndex,
  translateCraftRecipeScript,
  translateResourcePoolScript,
} from './pal-item-message-source.js'
import type { SourceCmd } from './source-facts.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const allJson = JSON.parse(readFileSync(`${root}data/extracted/events/all.json`, 'utf8')) as {
  segments: { commands: SourceCmd[] }[]
}
const src = { commands: allJson.segments.flatMap((s) => s.commands) }
describe('M1d · 0x20 有序配方终端失败臂', () => {
  type CraftSourceCmd = SourceCmd & {
    to?: string
    itemId?: number
    count?: number
  }

  const oneIngredientCraft = (
    failureArm: readonly CraftSourceCmd[],
    failureAddress = 5,
  ): CraftSourceCmd[] => [
    { label: 'L_1', op: 'raw', opcode: 0x20, operands: [117, 1, failureAddress] },
    { op: 'goto', to: 'L_9' },
    ...failureArm,
    { label: 'L_9', op: 'giveItem', itemId: 148, count: 0 },
    { op: 'end' },
  ]

  const strictFailureArm = (text = '  炼蛊的材料不足  '): CraftSourceCmd[] => [
    { label: 'L_5', op: 'setDialogStyleNarration' },
    { op: 'showDialog', text },
    { op: 'end' },
  ]

  test('PAL 真链提取五条配方与 trimmed 终端失败原文', () => {
    expect(translateCraftRecipeScript(src.commands, buildLabelIndex(src.commands), 39598)).toEqual({
      kind: 'craftRecipe',
      unavailableMessage: '炼蛊的材料不足',
      recipes: ['117', '118', '119', '120', '121'].map((itemId) => ({
        ingredients: [{ itemId, count: 1 }],
        products: [{ itemId: '148', count: 1 }],
      })),
    })
  })

  test('strict 三元组迁移 trimmed 文案；operand[2]=0 恒成功链不误投影为配方', () => {
    const strict = oneIngredientCraft(strictFailureArm())
    expect(translateCraftRecipeScript(strict, buildLabelIndex(strict), 1)).toEqual({
      kind: 'craftRecipe',
      unavailableMessage: '炼蛊的材料不足',
      recipes: [
        {
          ingredients: [{ itemId: '117', count: 1 }],
          products: [{ itemId: '148', count: 1 }],
        },
      ],
    })

    const alwaysSucceeds = oneIngredientCraft([], 0)
    expect(
      translateCraftRecipeScript(alwaysSucceeds, buildLabelIndex(alwaysSucceeds), 1),
    ).toBeUndefined()
  })

  test('空白、缺 narration、缺 end、臂内插命令或 end 后多余命令全部 fail-loud', () => {
    const malformed: CraftSourceCmd[][] = []

    malformed.push(oneIngredientCraft(strictFailureArm('   ')))

    const missingNarration = oneIngredientCraft(strictFailureArm())
    missingNarration[2] = { ...missingNarration[2], op: 'showDialog', text: '错误起点' }
    malformed.push(missingNarration)

    const missingEnd = oneIngredientCraft(strictFailureArm())
    missingEnd[4] = { op: 'showDialog', text: '未结束' }
    malformed.push(missingEnd)

    const insertedCommand = oneIngredientCraft(strictFailureArm())
    insertedCommand.splice(3, 0, { op: 'raw', opcode: 0x41, operands: [0, 0, 0] })
    malformed.push(insertedCommand)

    const commandAfterEnd = oneIngredientCraft(strictFailureArm())
    commandAfterEnd.splice(5, 0, { op: 'raw', opcode: 0x41, operands: [0, 0, 0] })
    malformed.push(commandAfterEnd)

    for (const commands of malformed)
      expect(translateCraftRecipeScript(commands, buildLabelIndex(commands), 1)).toBeUndefined()
  })

  test('产物入口不一致、悬空终端地址与 failure 环不生成配方前缀', () => {
    const mismatchedProducts: CraftSourceCmd[] = [
      { label: 'L_1', op: 'raw', opcode: 0x20, operands: [117, 1, 3] },
      { op: 'goto', to: 'L_9' },
      { label: 'L_3', op: 'raw', opcode: 0x20, operands: [118, 1, 5] },
      { op: 'goto', to: 'L_10' },
      ...strictFailureArm(),
      { label: 'L_9', op: 'giveItem', itemId: 148, count: 0 },
      { label: 'L_10', op: 'giveItem', itemId: 149, count: 0 },
    ]
    expect(
      translateCraftRecipeScript(mismatchedProducts, buildLabelIndex(mismatchedProducts), 1),
    ).toBeUndefined()

    const dangling = oneIngredientCraft(strictFailureArm(), 99)
    expect(translateCraftRecipeScript(dangling, buildLabelIndex(dangling), 1)).toBeUndefined()

    const cycle: CraftSourceCmd[] = [
      { label: 'L_1', op: 'raw', opcode: 0x20, operands: [117, 1, 3] },
      { op: 'goto', to: 'L_9' },
      { label: 'L_3', op: 'raw', opcode: 0x20, operands: [118, 1, 1] },
      { op: 'goto', to: 'L_9' },
      { label: 'L_9', op: 'giveItem', itemId: 148, count: 0 },
    ]
    expect(translateCraftRecipeScript(cycle, buildLabelIndex(cycle), 1)).toBeUndefined()
  })
})

describe('M1d · 0x34 资源池终端失败臂', () => {
  const rewards = [100, 105]
  const poolScript = (failureAddress = 5, text = '  无任何效果  '): SourceCmd[] => [
    { label: 'L_1', op: 'raw', opcode: 0x34, operands: [failureAddress, 0, 0] },
    { op: 'end' },
    { label: 'L_5', op: 'setDialogStyleNarration' },
    { op: 'showDialog', text },
    { op: 'end' },
  ]

  test('PAL 真链从 operand0 提取九档 pool 与 trimmed 共享失败原文', () => {
    expect(
      translateResourcePoolScript(
        src.commands,
        buildLabelIndex(src.commands),
        39713,
        [100, 105, 95, 112, 72, 131, 97, 102, 111],
      ),
    ).toEqual({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 9,
      rewards: [100, 105, 95, 112, 72, 131, 97, 102, 111].map((itemId) => ({
        itemId: String(itemId),
        count: 1,
      })),
      unavailableMessage: '无任何效果',
    })
  })

  test('strict 三元组迁移 trimmed 文案', () => {
    const commands = poolScript()
    expect(translateResourcePoolScript(commands, buildLabelIndex(commands), 1, rewards)).toEqual({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 2,
      rewards: rewards.map((itemId) => ({ itemId: String(itemId), count: 1 })),
      unavailableMessage: '无任何效果',
    })
  })

  test('零/悬空 operand0、空白或畸形臂、非线性成功尾与空 rewards 全部 fail-loud', () => {
    const malformed: Array<{ commands: SourceCmd[]; rewards?: number[] }> = []
    malformed.push({ commands: poolScript(0) })
    malformed.push({ commands: poolScript(99) })
    malformed.push({ commands: poolScript(5, '   ') })

    const missingNarration = poolScript()
    missingNarration[2] = { ...missingNarration[2], op: 'showDialog', text: '错误起点' }
    malformed.push({ commands: missingNarration })

    const missingFailureEnd = poolScript()
    missingFailureEnd[4] = { op: 'showDialog', text: '未结束' }
    malformed.push({ commands: missingFailureEnd })

    const extraFailureCommand = poolScript()
    extraFailureCommand.push({ op: 'raw', opcode: 0x41, operands: [0, 0, 0] })
    malformed.push({ commands: extraFailureCommand })

    const nonLinearSuccess = poolScript()
    nonLinearSuccess.splice(1, 0, { op: 'raw', opcode: 0x41, operands: [0, 0, 0] })
    malformed.push({ commands: nonLinearSuccess })
    malformed.push({ commands: poolScript(), rewards: [] })

    for (const fixture of malformed)
      expect(
        translateResourcePoolScript(
          fixture.commands,
          buildLabelIndex(fixture.commands),
          1,
          fixture.rewards ?? rewards,
        ),
      ).toBeUndefined()
  })
})
