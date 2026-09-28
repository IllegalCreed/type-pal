// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A04（workspace 对）：钩子槽位与实体行为通道切换。
 * 去重：SceneScriptWorkspace.test 已证场景/实体选择跟随、预览范围随页、实体页签可见性、
 * 引用与 owner 深链。本文件只补：传送出口槽位切换（空槽提示与已有变体回显）、
 * 实体自动行为通道切换及其 preview timing='auto' 契约。PreviewCanvas 仅做探针替身。
 */
import type { AuthorSceneDef, SceneDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ScriptEditorState } from '../core/script-editor.js'
import { CanonicalSceneScriptWorkspace } from './SceneScriptWorkspace.js'

type PreviewProbeProps = {
  timing?: 'interactive' | 'auto'
  allowSceneEntry?: boolean
  runSceneEntry?: boolean
  canonicalFlow?: unknown
}

const previewRender = vi.hoisted(() => vi.fn())

vi.mock('./PreviewCanvas.js', () => ({
  PreviewCanvas: (props: PreviewProbeProps) => {
    previewRender(props)
    return <div data-testid="preview" />
  },
}))

function canonicalScene(id: string, sceneLabel: string, entityLabel: string): AuthorSceneDef {
  return {
    id,
    mapId: `map-${id}`,
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        sprite: 'npc',
        pos: { col: 1, row: 1, height: 0 },
        initialPage: 'default',
        pages: [{ id: 'default', label: '默认', trigger: 'legacy-001' }],
        behaviors: {
          trigger: {
            'legacy-001': {
              label: entityLabel,
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'start',
                stages: [
                  { id: 'start', body: [{ kind: 'setFlag', flag: `${id}-entity`, value: true }] },
                ],
              },
            },
          },
        },
      },
    ],
    hooks: {
      onEnter: {
        initial: 'default',
        variants: {
          default: {
            label: sceneLabel,
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [
                { id: 'start', body: [{ kind: 'setFlag', flag: `${id}-scene`, value: true }] },
              ],
            },
          },
        },
      },
      onTeleport: {
        initial: 'out',
        variants: {
          out: {
            label: `${sceneLabel}·出口`,
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [{ id: 'start', body: [] }],
            },
          },
        },
      },
    },
  }
}

function shellScene(id: string): SceneDef {
  return {
    id,
    mapId: `map-${id}`,
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        sprite: 'npc',
        pos: { col: 1, row: 1, height: 0 },
        facing: 'down',
        pages: [{ trigger: { on: 'interact', range: 1, stages: [] } }],
      },
    ],
  } as SceneDef
}

const sceneA = shellScene('sA')
const state: ScriptEditorState = {
  scenes: [canonicalScene('sA', 'A 进场方案', 'A 交互方案')],
  items: [],
  sharedScripts: {},
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
  window.localStorage.clear()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  previewRender.mockClear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

const scriptTab = (label: string): HTMLButtonElement => {
  const match = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((candidate) =>
    candidate.textContent?.includes(label),
  )
  if (!match) throw new Error(`script tab not found: ${label}`)
  return match
}

async function renderWorkspace(selectedEntityId: string | null): Promise<void> {
  await act(async () =>
    root.render(
      <CanonicalSceneScriptWorkspace
        scene={sceneA}
        state={state}
        selectedEntityId={selectedEntityId}
        leaderSpriteId={undefined}
        locale={{} as never}
        sprites={[]}
        actorsById={{}}
        assetBase={{} as never}
        projectMaps={{}}
        mapIndex={{} as never}
        tilesets={[]}
        assetCatalog={{} as never}
        assetReader={{} as never}
        playIdentity={{
          projectId: 'test',
          workspaceId: '11111111-1111-4111-8111-111111111111',
          source: 'http',
        }}
        referenceStatus="current"
        onDispatch={() => {}}
      />,
    ),
  )
}

describe('A04 场景脚本工作区槽位与通道', () => {
  test('传送出口槽位切换回显已有变体', async () => {
    await renderWorkspace(null)
    expect(host.textContent).toContain('A 进场方案')
    await act(async () => scriptTab('传送出口').click())
    expect(scriptTab('传送出口').getAttribute('aria-selected')).toBe('true')
    expect(host.textContent).toContain('A 进场方案·出口')
    expect(host.textContent).not.toContain('尚未创建')
  })

  test('实体自动行为通道切换给出空态提示', async () => {
    await renderWorkspace('e1')
    expect(host.textContent).toContain('A 交互方案')
    await act(async () => scriptTab('自动行为').click())
    expect(scriptTab('自动行为').getAttribute('aria-selected')).toBe('true')
    const probe = previewRender.mock.calls.at(-1)![0] as { hint?: string }
    expect(probe.hint).toBe('当前实体的自动行为尚未创建；可在下方新建。')
  })
})
