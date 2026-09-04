// @vitest-environment jsdom

import type { AuthorSceneDef, AuthorScriptFlow, SceneDef, ScriptStage } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type {
  CanonicalScriptReference,
  ScriptCommandOwner,
  ScriptEditorState,
} from '../core/script-editor.js'
import { CanonicalSceneScriptWorkspace } from './SceneScriptWorkspace.js'

type PreviewProbeProps = {
  scene: SceneDef
  stages: readonly ScriptStage[]
  canonicalFlow?: AuthorScriptFlow
  sourceKey: string
  focusEntityId?: string
  focusTriggerActivation?: { on: 'interact' | 'touch'; range?: number }
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
): AuthorSceneDef {
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
const state: ScriptEditorState = {
  scenes: [
    canonicalScene('sA', 'A 进场方案', 'A 交互方案', 'a'),
    canonicalScene('sB', 'B 进场方案', 'B 交互方案', 'b'),
  ],
  items: [],
  sharedScripts: {},
}

describe('CanonicalSceneScriptWorkspace', () => {
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
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
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

  const renderWorkspace = async (
    scene: SceneDef,
    selectedEntityId: string | null,
    options?: {
      state?: ScriptEditorState
      selectedPageId?: string
      focusReference?: { reference: CanonicalScriptReference; revision: number }
      focusOwner?: {
        owner: Extract<ScriptCommandOwner, { kind: 'entity-behavior' | 'scene-hook' }>
        revision: number
      }
    },
  ): Promise<void> => {
    await act(async () =>
      root.render(
        <CanonicalSceneScriptWorkspace
          scene={scene}
          state={options?.state ?? state}
          selectedEntityId={selectedEntityId}
          selectedPageId={options?.selectedPageId}
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
          focusReference={options?.focusReference}
          focusOwner={options?.focusOwner}
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
    expect(preview.stages).toEqual([])
    expect(preview.canonicalFlow).toMatchObject({
      kind: 'stages',
      stages: [
        {
          body: [{ kind: 'setFlag', flag: 'b-entity' }],
        },
      ],
    })

    await act(async () => scriptTab('进场脚本').click())
    await renderWorkspace(sceneA, 'e1')
    expect(scriptTab('交互脚本').getAttribute('aria-selected')).toBe('true')
    expect(host.textContent).toContain('A 交互方案')
  })

  test('preview range follows the selected current page and ignores activation without a trigger behavior', async () => {
    const next = structuredClone(state)
    const entity = next.scenes[0]!.entities[0]!
    entity.behaviors!.trigger!.alternate = {
      label: '备用交互方案',
      order: 1,
      flow: {
        kind: 'stages',
        initial: 'start',
        stages: [{ id: 'start', body: [] }],
      },
    }
    entity.pages = [
      {
        id: 'default',
        label: '默认',
        trigger: 'legacy-001',
        triggerActivation: { on: 'interact', range: 1 },
      },
      {
        id: 'alternate',
        label: '备用',
        trigger: 'alternate',
        triggerActivation: { on: 'touch', range: 2 },
      },
      {
        id: 'inactive',
        label: '未绑定行为',
        triggerActivation: { on: 'touch', range: 5 },
      },
    ]

    await renderWorkspace(sceneA, 'e1', { state: next, selectedPageId: 'alternate' })
    expect(
      (previewRender.mock.calls.at(-1)?.[0] as PreviewProbeProps).focusTriggerActivation,
    ).toEqual({ on: 'touch', range: 2 })

    await renderWorkspace(sceneA, 'e1', { state: next, selectedPageId: 'inactive' })
    expect(
      (previewRender.mock.calls.at(-1)?.[0] as PreviewProbeProps).focusTriggerActivation,
    ).toBeUndefined()
  })

  test('only exposes entity script tabs while an entity is selected', async () => {
    await renderWorkspace(sceneA, null)
    expect([...host.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)).toEqual([
      '进场脚本',
      '传送出口',
    ])

    await renderWorkspace(sceneA, 'e1')
    expect([...host.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)).toEqual([
      '进场脚本',
      '传送出口',
      '交互脚本',
      '自动行为',
    ])

    await renderWorkspace(sceneA, null)
    expect(host.textContent).not.toContain('交互脚本')
    expect(host.textContent).not.toContain('自动行为')
  })

  test('引用定位会联动到目标实体方案、步骤和具体指令', async () => {
    const focusState = structuredClone(state)
    const targetEntity = focusState.scenes
      .find((candidate) => candidate.id === 'sB')!
      .entities.find((candidate) => candidate.id === 'e1')!
    targetEntity.behaviors ??= {}
    targetEntity.behaviors.trigger ??= {}
    targetEntity.behaviors.trigger.target = {
      label: '目标交互方案',
      order: 1,
      flow: {
        kind: 'stages',
        initial: 'first',
        stages: [
          {
            id: 'first',
            body: [{ kind: 'setFlag', flag: 'before-target', value: true }],
          },
          {
            id: 'second',
            body: [
              { kind: 'setFlag', flag: 'target-command', value: true },
              { kind: 'wait', ms: 80 },
            ],
          },
        ],
      },
    }
    const reference: CanonicalScriptReference = {
      kind: 'command',
      path: 'scenes.sB.entities.e1.behaviors.trigger.target.flow.stages.second.body[0]',
      locator: {
        kind: 'command',
        owner: {
          kind: 'entity-behavior',
          sceneId: 'sB',
          entityId: 'e1',
          channel: 'trigger',
          behaviorId: 'target',
        },
        container: { kind: 'step', stepId: 'second', section: 'body' },
        commandPath: '0',
      },
    }

    await renderWorkspace(sceneB, 'e1', {
      state: focusState,
      focusReference: { reference, revision: 7 },
    })

    expect(host.querySelector<HTMLElement>('.script-scheme-card.active strong')?.textContent).toBe(
      '目标交互方案',
    )
    expect(
      host.querySelector<HTMLElement>('.canonical-stage-card.active strong')?.textContent,
    ).toBe('步骤 2')
    const row = host.querySelector<HTMLElement>('[data-command-path="0"]')!
    expect(row.textContent).toContain('target-command')
    expect(row.classList.contains('sel')).toBe(true)
    expect(row.classList.contains('reference-focus-odd')).toBe(true)
    expect(document.activeElement).toBe(row)
  })

  test('owner 定位会选择非默认实体行为与非首场景钩子', async () => {
    const focusState = structuredClone(state)
    const canonical = focusState.scenes.find((candidate) => candidate.id === 'sB')!
    const targetEntity = canonical.entities.find((candidate) => candidate.id === 'e1')!
    targetEntity.behaviors ??= {}
    targetEntity.behaviors.trigger ??= {}
    targetEntity.behaviors.trigger.target = {
      label: '目标交互方案',
      order: 1,
      flow: {
        kind: 'stages',
        initial: 'start',
        stages: [{ id: 'start', body: [{ kind: 'setFlag', flag: 'target-owner', value: true }] }],
      },
    }
    canonical.hooks ??= {}
    canonical.hooks.onEnter ??= { initial: 'default', variants: {} }
    canonical.hooks.onEnter.variants.target = {
      label: '目标进场方案',
      order: 1,
      flow: {
        kind: 'stages',
        initial: 'start',
        stages: [{ id: 'start', body: [{ kind: 'setFlag', flag: 'target-hook', value: true }] }],
      },
    }

    await renderWorkspace(sceneB, 'e1', {
      state: focusState,
      focusOwner: {
        owner: {
          kind: 'entity-behavior',
          sceneId: 'sB',
          entityId: 'e1',
          channel: 'trigger',
          behaviorId: 'target',
        },
        revision: 7,
      },
    })
    expect(host.querySelector<HTMLElement>('.script-scheme-card.active strong')?.textContent).toBe(
      '目标交互方案',
    )
    expect((previewRender.mock.calls.at(-1)?.[0] as PreviewProbeProps).sourceKey).toBe(
      'canonical:entity:sB:e1:trigger:target',
    )

    await renderWorkspace(sceneB, null, {
      state: focusState,
      focusOwner: {
        owner: {
          kind: 'scene-hook',
          sceneId: 'sB',
          slot: 'onEnter',
          hookId: 'target',
        },
        revision: 8,
      },
    })
    expect(host.querySelector<HTMLElement>('.script-scheme-card.active strong')?.textContent).toBe(
      '目标进场方案',
    )
    expect((previewRender.mock.calls.at(-1)?.[0] as PreviewProbeProps).sourceKey).toBe(
      's:sB:canonical:target',
    )
  })
})
