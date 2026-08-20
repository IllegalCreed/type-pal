import type { SceneDef, BaseSceneDef, BaseScriptFlow } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { Playback } from './playback.js'

const scene: SceneDef = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

const canonicalScene: BaseSceneDef = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

const choiceFlow: BaseScriptFlow = {
  kind: 'stateMachine',
  machine: {
    id: 'preview-choice',
    label: '预览选择',
    initial: 'choice',
    states: {
      choice: {
        label: '选择',
        body: [{ kind: 'confirm', id: 'decision', onNo: [] }],
        next: {
          kind: 'commandOutcome',
          commandId: 'decision',
          command: 'confirm',
          outcome: 'no',
          then: { kind: 'continue', state: 'no' },
          else: { kind: 'continue', state: 'yes' },
        },
      },
      no: {
        label: '否',
        body: [{ kind: 'setPartyFacing', facing: 'left' }],
        next: { kind: 'stay' },
      },
      yes: {
        label: '是',
        body: [{ kind: 'setPartyFacing', facing: 'right' }],
        next: { kind: 'stay' },
      },
    },
  },
}

describe('Playback', () => {
  test('scene-entry previews run their presentation and reach real dialogue', async () => {
    const playback = new Playback(scene)
    playback.play('s:s001:canonical:default', [
      {
        entry: { prepare: [], reveal: { kind: 'cut' } },
        body: [{ kind: 'dialog', cue: { rows: [{ text: 'dlg.preview' }] } }],
      },
    ])

    await vi.waitFor(() => expect(playback.view.dialog?.cue.rows[0]?.text).toBe('dlg.preview'))
    expect(playback.mode).toBe('running')
    playback.stop()
  })

  test('reports non-abort failures and leaves running mode', async () => {
    const playback = new Playback(scene)
    playback.play('canonical:test', [
      {
        body: [{ kind: 'not-a-command' } as never],
      },
    ])

    await vi.waitFor(() => expect(playback.mode).toBe('done'))
    expect(playback.view.logs.at(-1)).toMatch(/预览中断/)
  })

  test('显式淡出后的淡入会恢复画面，并继续显示后续对话', async () => {
    const playback = new Playback(scene)
    playback.play('s:s001:canonical:default', [
      {
        body: [
          { kind: 'fade', dir: 'out', ms: 100 },
          { kind: 'setPartyFacing', facing: 'right' },
          { kind: 'fade', dir: 'in', ms: 100 },
          { kind: 'dialog', cue: { rows: [{ text: 'dlg.after-fade' }] } },
        ],
      },
    ])

    await vi.waitFor(() => expect(playback.activePath).not.toBeNull())
    playback.tick(100)
    await vi.waitFor(() => {
      expect(playback.view.fadeBlack).toBe(1)
      expect(playback.view.player.facing).toBe('right')
    })

    playback.tick(100)
    await vi.waitFor(() => {
      expect(playback.view.fadeBlack).toBe(0)
      expect(playback.view.dialog?.cue.rows[0]?.text).toBe('dlg.after-fade')
    })
    playback.confirmDialog()
    await vi.waitFor(() => expect(playback.mode).toBe('done'))
    expect(playback.view.fadeBlack).toBe(0)
  })

  test('canonical holdScreen 持有黑幕，匹配的 revealScreen 淡入恢复', async () => {
    const playback = new Playback(scene)
    const flow: BaseScriptFlow = {
      kind: 'stages',
      initial: 'preview',
      stages: [
        {
          id: 'preview',
          body: [
            { kind: 'holdScreen', color: 'black', token: 'pal-night' },
            { kind: 'setPartyFacing', facing: 'right' },
            { kind: 'revealScreen', token: 'pal-night' },
          ],
        },
      ],
    }

    playback.playCanonical('canonical:screen-hold', flow, {
      scene: canonicalScene,
      sharedScripts: {},
    })

    await vi.waitFor(() => {
      expect(playback.view.fadeBlack).toBe(1)
      expect(playback.view.player.facing).toBe('right')
    })
    playback.tick(260)
    await vi.waitFor(() => expect(playback.mode).toBe('done'))
    expect(playback.view.fadeBlack).toBe(0)
    expect(playback.view.logs).toEqual(['⬛ 保持黑屏（pal-night）', '🌅 恢复画面（pal-night）'])
  })

  test('停止预览会清理尚未恢复的临时黑幕', async () => {
    const playback = new Playback(scene)
    playback.play('canonical:screen-hold', [
      {
        body: [
          { kind: 'holdScreen', color: 'black', token: 'pal-night' },
          { kind: 'dialog', cue: { rows: [{ text: 'dlg.under-hold' }] } },
        ],
      },
    ])

    await vi.waitFor(() => expect(playback.view.dialog).not.toBeNull())
    expect(playback.view.fadeBlack).toBe(1)
    playback.stop()
    expect(playback.mode).toBe('idle')
    expect(playback.view.fadeBlack).toBe(0)
  })

  test('切场景会收尾临时黑幕并结束当前预览', async () => {
    const playback = new Playback(scene)
    playback.play('canonical:screen-hold', [
      {
        body: [
          { kind: 'holdScreen', color: 'black', token: 'pal-night' },
          { kind: 'loadScene', scene: 's002' },
        ],
      },
    ])

    await vi.waitFor(() => expect(playback.mode).toBe('done'))
    expect(playback.view.fadeBlack).toBe(0)
    expect(playback.view.logs.at(-1)).toContain('切场景 s002')
  })

  test('不匹配的 reveal token 会失败并由异常 finalizer 恢复画面', async () => {
    const playback = new Playback(scene)
    playback.play('canonical:screen-hold', [
      {
        body: [
          { kind: 'holdScreen', color: 'black', token: 'pal-night' },
          { kind: 'revealScreen', token: 'wrong-token' },
        ],
      },
    ])

    await vi.waitFor(() => expect(playback.mode).toBe('done'))
    expect(playback.view.fadeBlack).toBe(0)
    expect(playback.view.logs.at(-1)).toContain('黑屏恢复 token 不匹配')
  })

  test.each([
    { accepted: false, facing: 'left' as const },
    { accepted: true, facing: 'right' as const },
  ])('canonical preview executes the real commandOutcome arm ($accepted)', async ({
    accepted,
    facing,
  }) => {
    const playback = new Playback(scene)
    const sourceBefore = structuredClone(choiceFlow)
    const library = {}
    const libraryBefore = structuredClone(library)
    playback.playCanonical('canonical:choice', choiceFlow, {
      scene: canonicalScene,
      sharedScripts: library,
    })

    await vi.waitFor(() => expect(playback.view.confirm).not.toBeNull())
    expect(playback.view.confirm?.selectedYes).toBe(false)
    playback.answerConfirm(accepted)
    await vi.waitFor(() => expect(playback.mode).toBe('done'))
    expect(playback.view.player.facing).toBe(facing)
    expect(choiceFlow).toEqual(sourceBefore)
    expect(library).toEqual(libraryBefore)
  })

  test('stopping canonical preview aborts an unanswered prompt without choosing an arm', async () => {
    const playback = new Playback(scene)
    playback.playCanonical('canonical:choice', choiceFlow, {
      scene: canonicalScene,
      sharedScripts: {},
    })
    await vi.waitFor(() => expect(playback.view.confirm).not.toBeNull())

    playback.stop()
    await Promise.resolve()
    expect(playback.mode).toBe('idle')
    expect(playback.view.confirm).toBeNull()
    expect(playback.view.player.facing).toBe('down')
  })

  test('canonical shared preview resolves callScript without mutating the authored library', async () => {
    const playback = new Playback(scene)
    const flow: BaseScriptFlow = {
      kind: 'stages',
      initial: 'preview',
      stages: [
        {
          id: 'preview',
          body: [{ kind: 'callScript', script: 'shared/user/turn-left' }],
        },
      ],
    }
    const library = {
      'shared/user/turn-left': {
        name: '向左转',
        self: 'none' as const,
        body: [{ kind: 'setPartyFacing' as const, facing: 'left' as const }],
      },
    }
    const sourceBefore = structuredClone(flow)
    const libraryBefore = structuredClone(library)

    playback.playCanonical('canonical:shared:turn-left', flow, {
      scene: canonicalScene,
      sharedScripts: library,
    })

    await vi.waitFor(() => expect(playback.mode).toBe('done'))
    expect(playback.view.player.facing).toBe('left')
    expect(flow).toEqual(sourceBefore)
    expect(library).toEqual(libraryBefore)
  })
})
