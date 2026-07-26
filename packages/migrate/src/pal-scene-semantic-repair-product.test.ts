import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AuthorCommandV5, SceneDefV5, ScriptFlowV5 } from '@type-pal/content'
import { validateScenesV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'

function loadScene(id: string): SceneDefV5 {
  const path = fileURLToPath(
    new URL(`../../../projects/pal/content/scenes/${id}.json`, import.meta.url),
  )
  return validateScenesV5([JSON.parse(readFileSync(path, 'utf8'))])[0]!
}

function stages(flow: ScriptFlowV5 | undefined, label: string) {
  if (!flow || flow.kind !== 'stages') throw new Error(`${label}: expected stages`)
  return flow
}

function initialOnEnter(scene: SceneDefV5) {
  const channel = scene.hooks?.onEnter
  const hook = channel?.initial ? channel.variants[channel.initial] : undefined
  return stages(hook?.flow, `${scene.id}/onEnter`)
}

function dialogueAt(body: readonly AuthorCommandV5[], text: string): number {
  return body.findIndex(
    (command) => command.kind === 'dialog' && command.cue.rows.some((row) => row.text === text),
  )
}

describe('PAL 场景隐式语义生成产物', () => {
  test('s048/s110/s172 显式保留 PAL_MakeScene 淡入，s048 完成后不再重播', () => {
    const s048 = loadScene('s048')
    const s048Flow = initialOnEnter(s048)
    const s048Initial = s048Flow.stages.find((stage) => stage.id === s048Flow.initial)!
    const s048FadeOut = s048Initial.body.findIndex(
      (command) => command.kind === 'fade' && command.dir === 'out',
    )
    const s048Redraw = s048Initial.body.findIndex(
      (command, index) => index > s048FadeOut && command.kind === 'clearDialog',
    )
    expect(s048.battleFieldId).toBe(6)
    expect(s048Initial.body.slice(s048Redraw, s048Redraw + 3)).toEqual([
      { kind: 'clearDialog' },
      { kind: 'fade', dir: 'in', ms: 600 },
      { kind: 'wait', ms: 120 },
    ])
    expect(dialogueAt(s048Initial.body, 'dlg.3813')).toBe(s048Redraw + 3)
    expect(s048Flow.stages).toHaveLength(2)
    expect(s048Initial.next).toBe('completed')
    expect(s048Flow.stages[1]).toEqual({ id: 'completed', body: [] })

    const s110 = loadScene('s110')
    const s110Flow = stages(
      s110.entities.find((entity) => entity.id === 'e2061')?.behaviors?.trigger?.default?.flow,
      's110/e2061/trigger/default',
    )
    const s110Body = s110Flow.stages.find((stage) => stage.id === s110Flow.initial)!.body
    const s110FadeIn = s110Body.findIndex(
      (command) => command.kind === 'fade' && command.dir === 'in',
    )
    expect(s110Body.slice(s110FadeIn - 2, s110FadeIn + 2)).toEqual([
      { kind: 'clearDialog' },
      { kind: 'wait', ms: 40 },
      { kind: 'fade', dir: 'in', ms: 600 },
      { kind: 'wait', ms: 1080 },
    ])
    expect(dialogueAt(s110Body, 'dlg.5865')).toBe(s110FadeIn + 2)

    const s172 = loadScene('s172')
    const s172Flow = initialOnEnter(s172)
    const s172Initial = s172Flow.stages.find((stage) => stage.id === s172Flow.initial)!
    const s172FadeOut = s172Initial.body.findIndex(
      (command) => command.kind === 'fade' && command.dir === 'out',
    )
    const s172Redraw = s172Initial.body.findIndex(
      (command, index) => index > s172FadeOut && command.kind === 'clearDialog',
    )
    expect(s172Initial.body.slice(s172Redraw, s172Redraw + 3)).toEqual([
      { kind: 'clearDialog' },
      { kind: 'fade', dir: 'in', ms: 600 },
      { kind: 'wait', ms: 180 },
    ])
    expect(dialogueAt(s172Initial.body, 'dlg.10026')).toBe(s172Redraw + 3)
    expect(s172Initial.next).toBe('legacy-002')
    expect(s172Flow.stages.find((stage) => stage.id === 'legacy-002')).toEqual({
      id: 'legacy-002',
      body: [{ kind: 'playMusic', asset: 'music.pal.024' }],
    })
  })
})
