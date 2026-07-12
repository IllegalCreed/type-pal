import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateScenes } from '@type-pal/content'
import { describe, expect, test } from 'vitest'

const scenePath = fileURLToPath(
  new URL('../../../projects/pal/content/scenes/s001.json', import.meta.url),
)
const scene = validateScenes([JSON.parse(readFileSync(scenePath, 'utf8'))])[0]!

describe('pal 工程定制演出', () => {
  test('李大娘退场保持两段主时间线移动，不退回并行 autoScript', () => {
    const aunt = scene.entities.find((entity) => entity.id === 'e10')
    const body = scene.onEnter?.[0]?.body ?? []
    const visibleAt = body.findIndex(
      (command) =>
        command.kind === 'setEntityState' && command.entity === 'e10' && command.state === 2,
    )
    const firstMoveAt = body.findIndex(
      (command) =>
        command.kind === 'moveEntity' && command.entity === 'e10' && command.to.row === -17,
    )
    const turnAt = body.findIndex(
      (command) =>
        command.kind === 'setEntityFacing' && command.entity === 'e10' && command.facing === 'up',
    )
    const replyAt = body.findIndex(
      (command) => command.kind === 'dialog' && command.line.text === 'dlg.1371',
    )
    const secondMoveAt = body.findIndex(
      (command) =>
        command.kind === 'moveEntity' && command.entity === 'e10' && command.to.row === -12,
    )
    const replacementAt = body.findIndex(
      (command) =>
        command.kind === 'setEntityState' && command.entity === 'e3' && command.state === 1,
    )
    const hiddenAt = body.findIndex(
      (command) =>
        command.kind === 'setEntityState' && command.entity === 'e10' && command.state === 0,
    )

    expect(aunt?.pages).toBeUndefined()
    expect(visibleAt).toBeGreaterThanOrEqual(0)
    expect(firstMoveAt).toBe(visibleAt + 1)
    expect(turnAt).toBeGreaterThan(firstMoveAt)
    expect(replyAt).toBeGreaterThan(turnAt)
    expect(secondMoveAt).toBeGreaterThan(replyAt)
    expect(replacementAt).toBe(secondMoveAt + 1)
    expect(hiddenAt).toBe(secondMoveAt + 2)
  })
})
