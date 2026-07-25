import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AuthorCommandV5 } from '@type-pal/content'
import { validateScenesV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'

const scenePath = fileURLToPath(
  new URL('../../../projects/pal/content/scenes/s001.json', import.meta.url),
)
const scene = validateScenesV5([JSON.parse(readFileSync(scenePath, 'utf8'))])[0]!

function initialOnEnterBody(): AuthorCommandV5[] {
  const channel = scene.hooks?.onEnter
  const hook = channel?.initial ? channel.variants[channel.initial] : undefined
  const flow = hook?.flow
  if (!flow || flow.kind !== 'stages') return []
  return flow.stages.find((stage) => stage.id === flow.initial)?.body ?? []
}

describe('pal 工程定制演出', () => {
  test('李大娘退场保持显式主时间线编排，不退回并行 autoScript', () => {
    const aunt = scene.entities.find((entity) => entity.id === 'e10')
    const body = initialOnEnterBody()
    const visibleAt = body.findIndex(
      (command) =>
        command.kind === 'setEntityState' && command.target.entity === 'e10' && command.state === 2,
    )
    const approachAt = body.findIndex(
      (command) =>
        command.kind === 'moveEntity' &&
        command.target.entity === 'e10' &&
        command.to.col === 60 &&
        command.to.row === -18.5,
    )
    const questionAt = body.findIndex(
      (command) => command.kind === 'dialog' && command.cue.rows[0]?.text === 'dlg.1369',
    )
    const stopAt = body.findIndex(
      (command) =>
        command.kind === 'moveEntity' &&
        command.target.entity === 'e10' &&
        command.to.col === 60 &&
        command.to.row === -17,
    )
    const turnAt = body.findIndex(
      (command) =>
        command.kind === 'setEntityFacing' &&
        command.target.entity === 'e10' &&
        command.facing === 'up',
    )
    const replyAt = body.findIndex(
      (command) => command.kind === 'dialog' && command.cue.rows[0]?.text === 'dlg.1371',
    )
    const secondMoveAt = body.findIndex(
      (command) =>
        command.kind === 'moveEntity' &&
        command.target.entity === 'e10' &&
        command.to.col === 60 &&
        command.to.row === -12,
    )
    const replacementAt = body.findIndex(
      (command) =>
        command.kind === 'setEntityState' && command.target.entity === 'e3' && command.state === 1,
    )
    const hiddenAt = body.findIndex(
      (command) =>
        command.kind === 'setEntityState' && command.target.entity === 'e10' && command.state === 0,
    )

    expect(aunt?.pages).toBeUndefined()
    // 第一阶段实测:提问帧 (1256,332)=(60,-18.5)，回头对白帧 (1232,344)=(60,-17)。
    expect(visibleAt).toBeGreaterThanOrEqual(0)
    expect(approachAt).toBe(visibleAt + 1)
    expect(questionAt).toBeGreaterThan(approachAt)
    expect(stopAt).toBeGreaterThan(questionAt)
    expect(turnAt).toBe(stopAt + 1)
    expect(replyAt).toBeGreaterThan(turnAt)
    expect(secondMoveAt).toBeGreaterThan(replyAt)
    expect(replacementAt).toBe(secondMoveAt + 1)
    expect(hiddenAt).toBe(secondMoveAt + 2)
  })
})
