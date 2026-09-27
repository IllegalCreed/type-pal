// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U4b：PreviewCanvas 残差。
 * 去重：PreviewCanvas.test.tsx 已证 startPlayback 代理路径、确认控件键盘合同、
 * 倍速选择——本文件只补当前公开入口仍未证明的业务交互：
 * 无 startPlayback 时的播放/单步内部 play 实参与重置可用性、运行态暂停/继续/停止、
 * 引擎试玩 deep link 的精确 URL（含 focus 实体落点）、对话行的说话人解析与继续回调。
 */

// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { SceneDef, ScriptStage } from '@type-pal/content'
import { checkAuthorDialogueCue } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Playback } from '../core/playback.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { PreviewCanvas } from './PreviewCanvas.js'

vi.mock('./scene-stage.js', () => ({
  drawGridBlocked: vi.fn(),
  drawTriggerHighlight: vi.fn(),
  useSceneAssets: () => ({
    status: 'loading',
    err: '',
    loadedRef: { current: null },
  }),
  useStageSize: () => ({ w: 640, h: 360 }),
  useViewZoomPan: () => ({
    view: { zoom: 2, panX: 0, panY: 0 },
    viewRef: { current: { zoom: 2, panX: 0, panY: 0 } },
    setView: vi.fn(),
  }),
}))

// 当前合法阶段：经 checkAuthorDialogueCue 正控的对话舞台（真实 SceneDef 于 beforeAll 装载）。
let scene: SceneDef
let legalStages: ScriptStage[]
let previewLocale: Record<string, string> = {}

// Node test-host bridge（模块级一次性）：blank seed 的 gzip 依赖 Node Blob.stream；
// jsdom 的 Blob 缺该能力。文件内所有用例均为 jsdom+React，桥接全局安全。
vi.stubGlobal('Blob', NodeBlob)
vi.stubGlobal('crypto', webcrypto)
afterAll(() => {
  vi.unstubAllGlobals()
})

beforeAll(async () => {
  const { state } = await loadLegalUiProject('glm-ui-wave-preview')
  scene = structuredClone(state.scenes![0]!)
  scene.entities = [
    {
      id: 'npc-a',
      sprite: state.sprites?.[0]?.id ?? 'npc',
      pos: { col: 3, row: 4, height: 0 },
      facing: 'down',
    },
  ] as SceneDef['entities']
  const cue = {
    identity: {
      kind: 'actor' as const,
      actor: 'hero',
      portrait: { kind: 'expression' as const, expression: 'normal', side: 'left' as const },
    },
    slot: 'bottom' as const,
    rows: [{ text: 'r1' }],
  }
  checkAuthorDialogueCue(cue, 'preview.stage')
  legalStages = [{ body: [{ kind: 'dialog', cue }] as never }]
  previewLocale = { ...(state.locale ?? {}) } as Record<string, string>
  expect(legalStages.length).toBe(1)
})

let root: Root
let host: HTMLDivElement

function playbackStub(mode: string): Playback {
  return {
    view: { dialog: null, heldDialog: null, confirm: null },
    mode,
    speed: 1,
    pause: vi.fn(),
    resume: vi.fn(),
    play: vi.fn(),
    step: vi.fn(),
    stop: vi.fn(),
    confirmDialog: vi.fn(),
    answerConfirm: vi.fn(),
    toggleConfirm: vi.fn(),
    submitConfirm: vi.fn(),
  } as unknown as Playback
}

async function renderPreview(
  playback: Playback,
  options: { focusEntityId?: string } = {},
): Promise<void> {
  await act(async () => {
    root.render(
      <PreviewCanvas
        scene={scene}
        stages={[{ id: 's0', body: [] } as never]}
        sourceKey="scene:preview-residual:onEnter:default"
        playIdentity={{
          projectId: 'demo',
          workspaceId: '11111111-1111-4111-8111-111111111111',
          source: 'http',
        }}
        focusEntityId={options.focusEntityId}
        sprites={[]}
        actorsById={{}}
        leaderSpriteId={undefined}
        assetBase={{} as never}
        assetCatalog={{ version: 1, assets: {} }}
        assetReader={{} as never}
        projectMaps={{}}
        mapIndex={{ version: 1, maps: [] }}
        tilesets={[]}
        locale={previewLocale}
        playback={playback}
      />,
    )
    await Promise.resolve()
  })
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe('U4b PreviewCanvas 委派与防御（回放控制器局部合同，非完整工作流正控）', () => {
  test('无 startPlayback 时播放/单步调用内部 play；运行态暂停/继续/重置走 playback API', async () => {
    const playback = playbackStub('idle')
    await renderPreview(playback)
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="播放"]')?.click()
    })
    expect(playback.play).toHaveBeenCalledWith(
      'scene:preview-residual:onEnter:default',
      [{ id: 's0', body: [] }],
      { ownerId: undefined },
    )
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="单步"]')?.click()
    })
    expect(playback.play).toHaveBeenLastCalledWith(
      'scene:preview-residual:onEnter:default',
      [{ id: 's0', body: [] }],
      { ownerId: undefined, paused: true },
    )

    const running = playbackStub('running')
    await renderPreview(running)
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="暂停"]')?.click()
    })
    expect(running.pause).toHaveBeenCalledTimes(1)
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="重置"]')?.click()
    })
    expect(running.stop).toHaveBeenCalledTimes(1)

    const paused = playbackStub('paused')
    await renderPreview(paused)
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="继续"]')?.click()
    })
    expect(paused.resume).toHaveBeenCalledTimes(1)
  })

  test('引擎试玩 deep link 携带 focus 实体落点（row+1, facing=up）', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const playback = playbackStub('idle')
    await renderPreview(playback, { focusEntityId: 'npc-a' })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="引擎试玩"]')?.click()
    })
    expect(open).toHaveBeenCalledTimes(1)
    const url = open.mock.calls[0]![0] as string
    expect(url).toContain('play.html?project=demo')
    expect(url).toContain(`scene=${scene.id}`)
    expect(url).toContain('pos=3,5')
    expect(url).toContain('facing=up')
  })

  test('对话行解析说话人并经继续按钮 confirmDialog', async () => {
    const playback = playbackStub('running')
    ;(playback as unknown as { view: Record<string, unknown> }).view = {
      ...playback.view,
      dialog: {
        cue: {
          speaker: 'hero',
          identity: { kind: 'narration' },
          rows: [{ text: 'r1' }],
        },
        resolve: vi.fn(),
      },
    }
    await renderPreview(playback)
    const dialog = host.querySelector('.preview-dialog')
    expect(dialog, 'preview dialog').not.toBeNull()
    const speakerText = dialog?.querySelector('.spk')?.textContent
    expect(speakerText).toBe(previewLocale.hero ?? 'hero')
    await act(async () => {
      ;[...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.trim() === '继续 ▾')!
        .click()
    })
    expect(playback.confirmDialog).toHaveBeenCalledTimes(1)
  })
})
