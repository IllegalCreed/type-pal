import { expect, test } from 'vitest'
import { correctionRuntime } from './__tests__/pal-corrections-harness.js'
import { gov3Scene } from './pal-gov3-content-harness.js'

function texts(run: ReturnType<typeof correctionRuntime>) {
  return run.effects.flatMap((command) =>
    command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
  )
}

test.each([0, 2])('扬州审讯否认 %i 次：每次命令对应一次挨打，动作前结束对白', async (denials) => {
  const run = correctionRuntime('s081')
  run.answers.push(...Array<boolean>(denials).fill(false), true)
  expect(await run.hook()).toBe(true)
  expect(texts(run).filter((text) => text === 'dlg.4889')).toHaveLength(1)
  expect(texts(run).filter((text) => text === 'dlg.4891')).toHaveLength(denials)
  const repeatedBeatingStart = run.effects.findIndex(
    (command) =>
      command.kind === 'dialog' && command.cue.rows.some((row) => row.text === 'dlg.4889'),
  )
  expect(repeatedBeatingStart).toBeGreaterThanOrEqual(0)
  const blows = run.effects.flatMap((command, index) =>
    command.kind === 'selectEntityBehavior' &&
    index > repeatedBeatingStart &&
    command.target.entity === 'e1539' &&
    command.channel === 'auto' &&
    command.selection.kind === 'use' &&
    command.selection.value === 'legacy-001'
      ? [index]
      : [],
  )
  expect(blows).toHaveLength(denials + 1)
  for (const index of blows) expect(run.effects[index - 1]?.kind).toBe('clearDialog')
  expect(run.answers).toEqual([])
})

test.each([
  'e1599',
  'e1600',
  'e1601',
])('平反后先与 %s 交谈：守门人仅让路一次，换人/读档继续不重复移动', async (first) => {
  const run = correctionRuntime('s084')
  const court = gov3Scene('s081').hooks!.onEnter!.variants['legacy-001']!
  // The court acquittal script installs all three guard continuations. Execute
  // these actual author commands, then use each public entity activation.
  const installs = court.flow.stages
    .flatMap((stage) => stage.body)
    .filter(
      (command) =>
        command.kind === 'selectEntityBehavior' &&
        command.target.scene === 's084' &&
        ['e1599', 'e1600', 'e1601'].includes(command.target.entity) &&
        command.channel === 'trigger',
    )
  expect(installs).toHaveLength(3)
  await run.runtime.runCommands(installs, { signal: run.signal })
  await run.activate(first)
  expect(run.effects.filter((command) => command.kind === 'nudgeEntity')).toEqual([
    { kind: 'nudgeEntity', target: { scene: 's084', entity: 'e1599' }, dx: -32, dy: 0 },
  ])
  const restored = await run.restore()
  for (const guard of ['e1599', 'e1600', 'e1601']) {
    await restored.activate(guard)
  }
  expect(restored.effects.some((command) => command.kind === 'nudgeEntity')).toBe(false)
  expect(texts(restored).filter((text) => text === 'dlg.5110')).toHaveLength(3)
})

test('太守赏金交互只发一次，保存恢复后进入感谢对白', async () => {
  const run = correctionRuntime('s081')
  expect(await run.activate('e1518')).toBe(true)
  expect(run.world.money).toBe(5500)
  expect(texts(run)).toContain('dlg.5322')
  const restored = await run.restore()
  expect(await restored.activate('e1518')).toBe(true)
  expect(restored.world.money).toBe(5500)
  expect(texts(restored)).toContain('dlg.5326')
  expect(restored.effects.some((command) => command.kind === 'giveMoney')).toBe(false)
})
