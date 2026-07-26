// @vitest-environment jsdom

import type { SceneDef, SceneDefV5, ScriptStage } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ScriptEditorStateV5 } from '../core/script-v5-editor.js'
import { CanonicalSceneScriptWorkspaceV5 } from './CanonicalSceneScriptWorkspaceV5.js'

type PreviewProbeProps = {
  scene: SceneDef
  stages: readonly ScriptStage[]
  sourceKey: string
  focusEntityId?: string
  sceneFraming?: boolean
}

const previewRender = vi.hoisted(() => vi.fn())

vi.mock('./PreviewCanvas.js', () => ({
  PreviewCanvas: (props: PreviewProbeProps) => {
    previewRender(props)
    return (
      <div
        data-testid="preview"
        data-focus={props.focusEntityId ?? ''}
        data-source={props.sourceKey}
      />
    )
  },
}))

function canonicalScene(
  id: string,
  sceneLabel: string,
  entityLabel: string,
  flagPrefix: string,
): SceneDefV5 {
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
                  {
                    id: 'start',
                    body: [{ kind: 'setFlag', flag: `${flagPrefix}-entity`, value: true }],
                  },
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
                {
                  id: 'start',
                  body: [{ kind: 'setFlag', flag: `${flagPrefix}-scene`, value: true }],
                },
              ],
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
        pages: [
          {
            trigger: { on: 'interact', range: 1, stages: [] },
          },
        ],
      },
    ],
  } as SceneDef
}

const sceneA = shellScene('sA')
const sceneB = shellScene('sB')
const state: ScriptEditorStateV5 = {
  scenes: [
    canonicalScene('sA', 'A 进场方案', 'A 交互方案', 'a'),
    canonicalScene('sB', 'B 进场方案', 'B 交互方案', 'b'),
  ],
  items: [],
  sharedScripts: {},
  migrationSidecars: [],
}

describe('CanonicalSceneScriptWorkspaceV5', () => {
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

  const renderWorkspace = async (
    scene: SceneDef,
    selectedEntityId: string | null,
  ): Promise<void> => {
    await act(async () =>
      root.render(
        <CanonicalSceneScriptWorkspaceV5
          scene={scene}
          state={state}
          selectedEntityId={selectedEntityId}
          locale={{} as never}
          sprites={[]}
          actorsById={{}}
          leaderSpriteId={undefined}
          assetBase={{} as never}
          projectMaps={{}}
          mapIndex={{} as never}
          tilesets={[]}
          assetCatalog={{} as never}
          assetReader={{} as never}
          projectId="test"
          onDispatch={() => {}}
          onClose={() => {}}
        />,
      ),
    )
  }

  test('follows scene and entity selection without overriding an explicit script tab choice', async () => {
    await renderWorkspace(sceneA, 'e1')
    expect(scriptTab('交互脚本').getAttribute('aria-selected')).toBe('true')
    expect(host.textContent).toContain('A 交互方案')

    await act(async () => scriptTab('进场脚本').click())
    expect(scriptTab('进场脚本').getAttribute('aria-selected')).toBe('true')
    await renderWorkspace(sceneA, 'e1')
    expect(scriptTab('进场脚本').getAttribute('aria-selected')).toBe('true')

    await renderWorkspace(sceneB, null)
    expect(host.textContent).toContain('B 进场方案')

    await renderWorkspace(sceneB, 'e1')
    expect(scriptTab('交互脚本').getAttribute('aria-selected')).toBe('true')
    expect(scriptTab('进场脚本').getAttribute('aria-selected')).toBe('false')
    expect(host.textContent).toContain('B 交互方案')
    expect(host.textContent).not.toContain('B 进场方案')
    expect(host.textContent).not.toContain('A 交互方案')

    const preview = previewRender.mock.calls.at(-1)?.[0] as PreviewProbeProps
    expect(preview).toMatchObject({
      focusEntityId: 'e1',
      sceneFraming: false,
      sourceKey: 'canonical:entity:sB:e1:trigger:legacy-001',
    })
    expect(preview.stages[0]?.body[0]).toMatchObject({
      kind: 'setFlag',
      flag: 'b-entity',
    })

    await act(async () => scriptTab('进场脚本').click())
    await renderWorkspace(sceneA, 'e1')
    expect(scriptTab('交互脚本').getAttribute('aria-selected')).toBe('true')
    expect(host.textContent).toContain('A 交互方案')
  })
})
