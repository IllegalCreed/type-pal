import { expect, test } from 'vitest'
import locale from '../../../projects/pal/content/locale.json' with { type: 'json' }
import { correctionRuntime } from './__tests__/pal-corrections-harness.js'

function dialogueTexts(run: ReturnType<typeof correctionRuntime>) {
  return run.effects.flatMap((command) =>
    command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
  )
}

test('鬼阴坛告别只演一次，离场回访及正式保存恢复都不重演', async () => {
  const run = correctionRuntime('s077')
  expect(await run.hook()).toBe(true)
  expect(dialogueTexts(run)).toContain('dlg.4498')
  run.effects.length = 0
  run.enter('s078')
  run.enter('s077')
  expect(await run.hook()).toBe(false)
  expect(run.effects).toEqual([])
  const restored = await run.restore()
  expect(await restored.hook()).toBe(false)
  expect(restored.effects).toEqual([])
})

test.each([true, false])('剑圣离场：实际雇用秀才=%s 才能触发随队告别', async (hired) => {
  const run = correctionRuntime('s102')
  run.answers.push(hired)
  await run.activate('e1882')
  run.effects.length = 0
  await run.activate('e1883')
  expect(dialogueTexts(run).includes('dlg.5714')).toBe(hired)
  expect(
    run.effects.some((command) => command.kind === 'setFollowers' && command.sprites.length === 0),
  ).toBe(hired)
  expect(run.gates({ scene: 's102', entity: 'e1882' }).visible).toBe(false)
})

test('桃源林演出阿奴默认不站场，选择剧情入口后在揭场前显示，结束及回访仍隐藏', async () => {
  const run = correctionRuntime('s182')
  const anu = { scene: 's182', entity: 'e2984' }
  expect(run.gates(anu).visible).toBe(false)
  await run.runtime.runCommands(
    [
      {
        kind: 'selectSceneHooks',
        scene: 's182',
        selection: { onEnter: { kind: 'use', value: 'legacy-001' } },
      },
    ],
    { signal: run.signal },
  )
  expect(await run.hook()).toBe(true)
  expect(run.reveals).toHaveLength(1)
  expect(run.reveals[0]?.e2984).toBe(true)
  expect(await run.hook()).toBe(true)
  expect(run.gates(anu).visible).toBe(false)
  const restored = await run.restore()
  expect(restored.gates(anu).visible).toBe(false)
})

test.each([
  35, 36,
])('提前交虫 %i 只：不足不清场，交足后盖罗娇全队离开且读档不复现', async (count) => {
  const run = correctionRuntime('s172')
  run.world.inventory.push({ itemId: '152', count })
  await run.activate('e2862')
  const group = Array.from({ length: 7 }, (_, index) => ({
    scene: 's215',
    entity: `e${3657 + index}`,
  }))
  expect(run.world.inventory.find((item) => item.itemId === '152')?.count).toBe(
    count < 36 ? count : 0,
  )
  expect(group.map((target) => run.gates(target).visible)).toEqual(Array(7).fill(count < 36))
  expect(
    run.effects.some((command) => command.kind === 'loadScene' && command.scene === 's174'),
  ).toBe(count === 36)
  const restored = await run.restore()
  expect(group.map((target) => restored.gates(target).visible)).toEqual(Array(7).fill(count < 36))
})

test('假巫王战后拜月登场可见且挡路，决战触发区保持可见不挡路', async () => {
  const run = correctionRuntime('s278')
  const boss = { scene: 's281', entity: 'e4798' }
  const trigger = { scene: 's281', entity: 'e4800' }
  expect(run.gates(boss)).toMatchObject({ visible: false, collidable: false })
  expect(await run.activate('e4742')).toBe(true)
  expect(run.gates(boss)).toMatchObject({ visible: true, collidable: true })
  expect(run.gates(trigger)).toMatchObject({ visible: true, collidable: false })
  const restored = await run.restore()
  expect(restored.gates(boss)).toMatchObject({ visible: true, collidable: true })
  expect(restored.gates(trigger)).toMatchObject({ visible: true, collidable: false })
})

test('中年人最后一段使用修正文句，不再展示孤立问号，重复交谈仍正常', async () => {
  const run = correctionRuntime('s009')
  run.answers.push(true, true)
  for (let attempt = 0; attempt < 5; attempt++) await run.activate('e188')
  const texts = dialogueTexts(run)
  expect(texts.filter((text) => text === 'dlg.1503')).toHaveLength(3)
  expect(texts).not.toContain('dlg.1504')
  expect(locale['dlg.1503']).toBe('看错了')
})
