import type { RuntimeCommand } from '@type-pal/content'
import { expect, test } from 'vitest'
import { gov3Body, gov3Runtime, gov3SubBody } from './pal-gov3-content-harness.js'
import receipts from './pal-gov3-content-world-recovery-receipt.json' with { type: 'json' }

interface RecoveryRow {
  key: string
  beforePath: string
  recoveryBeforeIndex: number
  anchor: unknown
}
const rows: RecoveryRow[] = []
for (const file of receipts.receipts) for (const row of file.rows) rows.push(row)
function locateRecoveryParent(body: RuntimeCommand[], row: RecoveryRow) {
  try {
    return gov3SubBody(body, row.beforePath)
  } catch {
    // Author fixes can move the enclosing branch. Preserve the historical receipt;
    // recover only a unique out/in pair with its independently recorded next action.
    const candidates: { body: RuntimeCommand[]; index: number }[] = []
    function visit(commands: RuntimeCommand[]) {
      for (const [index, command] of commands.entries()) {
        if (command.kind === 'fade' && command.dir === 'out') {
          const incoming = commands.findIndex(
            (next, nextIndex) => nextIndex > index && next.kind === 'fade' && next.dir === 'in',
          )
          if (
            incoming >= 0 &&
            JSON.stringify(commands[incoming + 1]) === JSON.stringify(row.anchor)
          )
            candidates.push({ body: commands, index })
        }
        if (command.kind === 'branch') {
          visit(command.then)
          visit(command.else ?? [])
        }
        if (command.kind === 'confirm') {
          visit(command.onYes)
          visit(command.onNo)
        }
        if (command.kind === 'loop' || command.kind === 'repeat') visit(command.body)
      }
    }
    visit(body)
    expect(candidates, `unique relocated recovery parent ${row.key}`).toHaveLength(1)
    return candidates[0]!
  }
}

function segment(row: (typeof rows)[number]) {
  const [scene, entity, behavior, stage] = row.key.split('/')
  if (!scene || !entity || !behavior || !stage) throw new Error('invalid receipt key')
  const point = locateRecoveryParent(gov3Body(scene, entity, behavior, stage), row)
  // Choreography can insert commands before an old receipt's offset. A stale
  // locator must resolve to one out/in pair with the independently recorded anchor.
  const parent = point.body
  const peers =
    receipts.receipts
      .find((file) => file.scene === scene)
      ?.rows.filter(
        (other) =>
          other.key === row.key &&
          other.beforePath.split('/').slice(0, -1).join('/') ===
            row.beforePath.split('/').slice(0, -1).join('/'),
      ) ?? []
  const before = peers.filter(
    (other) => Number(other.beforePath.split('/').at(-1)) < point.index,
  ).length
  let start = point.index + before
  const located = parent[start]
  if (located?.kind !== 'fade' || located.dir !== 'out') {
    const candidates = parent.flatMap((command, index) => {
      if (command.kind !== 'fade' || command.dir !== 'out') return []
      const incoming = parent.findIndex(
        (next, nextIndex) => nextIndex > index && next.kind === 'fade' && next.dir === 'in',
      )
      return incoming >= 0 && JSON.stringify(parent[incoming + 1]) === JSON.stringify(row.anchor)
        ? [index]
        : []
    })
    expect(candidates, `unique recorded recovery anchor ${row.key}`).toHaveLength(1)
    start = candidates[0]!
  }
  const fade = parent[start]
  if (fade?.kind !== 'fade' || fade.dir !== 'out')
    throw new Error(`source out shifted ${row.key}/${row.beforePath}`)
  const recovery = parent.findIndex(
    (command, index) => index > start && command.kind === 'fade' && command.dir === 'in',
  )
  const end = recovery >= 0 ? recovery + 2 : row.recoveryBeforeIndex + 1
  return { scene, commands: parent.slice(start, end), recovery }
}

test('Content接收的恢复点为三十五条，Motion四条和RNG首帧依赖不计为本包通过', () =>
  expect(rows).toHaveLength(35))

test.each(
  rows,
)('$key/$beforePath actual compiler and fade driver uncover before its specific next action', async (row) => {
  const source = segment(row)
  expect(source.recovery).toBeGreaterThanOrEqual(0)
  const run = gov3Runtime(source.scene)
  await run.runtime.runCommands(source.commands, { signal: run.controller.signal })
  expect(
    run.effects.filter((effect) => effect.command.kind === 'fade').map((effect) => effect.command),
  ).toEqual([
    {
      kind: 'fade',
      dir: 'out',
      ms: source.commands[0]?.kind === 'fade' ? source.commands[0].ms : undefined,
    },
    { kind: 'fade', dir: 'in', ms: 600 },
  ])
  const after = run.effects.findIndex(
    (effect) => effect.command.kind === 'fade' && effect.command.dir === 'in',
  )
  if (
    row.anchor !== null &&
    typeof row.anchor === 'object' &&
    Reflect.get(row.anchor, 'kind') !== 'repeat'
  )
    expect(run.effects[after + 1]?.command).toEqual(row.anchor)
  for (const effect of run.effects.slice(after + 1)) expect(effect.opacity).toBe(0)
  expect(run.fade.value).toBe(0)
})

test.each(
  rows,
)('$key/$beforePath aborted blackout cannot execute success recovery or subsequent scene actions', async (row) => {
  const source = segment(row)
  const run = gov3Runtime(source.scene, {
    beforeEffect: (command, _opacity, controller) => {
      if (command.kind === 'fade' && command.dir === 'out') controller.abort()
    },
  })
  await expect(
    run.runtime.runCommands(source.commands, { signal: run.controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(run.effects).toEqual([])
})

test('药材失败与跟随对象仍在场分支不执行成功fade/recovery，恢复仍留在各自条件臂', async () => {
  const medicine = gov3Runtime('s052', { eligible: false })
  await medicine.install('e897', 'legacy-001')
  await medicine.activate('e897')
  for (let i = 0; i < 2; i++) {
    medicine.effects.length = 0
    await medicine.activate('e897')
    expect(medicine.effects.some((effect) => effect.command.kind === 'fade')).toBe(false)
  }
  const followerPresent = gov3Runtime('s102')
  await followerPresent.runtime.runCommands(
    [{ kind: 'setEntityState', target: { scene: 's102', entity: 'e1882' }, state: 1 }],
    { signal: followerPresent.controller.signal },
  )
  followerPresent.effects.length = 0
  // This test isolates fade recovery; the complete hired/unhired route is covered
  // by pal-story-corrections.test.ts. Locate the source condition semantically.
  const condition = gov3Body('s102', 'e1883', 'default', 'initial').find(
    (command) =>
      command.kind === 'branch' &&
      command.cond.kind === 'entityState' &&
      command.cond.target.entity === 'e1882',
  )
  if (!condition || condition.kind !== 'branch') throw new Error('conditional root shifted')
  await followerPresent.runtime.runCommands([condition], {
    signal: followerPresent.controller.signal,
  })
  expect(followerPresent.effects.some((effect) => effect.command.kind === 'fade')).toBe(false)
})
