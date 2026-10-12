// @vitest-environment jsdom

import type {
  AuthorSceneDef,
  AuthorScriptFlow,
  FlowCursor,
  SceneDef,
  ScriptStage,
} from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Playback } from '../core/playback.js'
import type {
  CanonicalScriptReference,
  ScriptCommandOwner,
  ScriptEditorState,
} from '../core/script-editor.js'
import {
  emptyScriptPreviewLibrary,
  type ScriptPreviewLibrary,
} from '../core/script-preview-library.js'
import type { SceneCanvas } from './SceneCanvas.js'
import { CanonicalSceneScriptWorkspace } from './SceneScriptWorkspace.js'

type PreviewProbeProps = {
  scene: SceneDef
  stages: readonly ScriptStage[]
  canonicalFlow?: AuthorScriptFlow
  canonicalCursor?: FlowCursor
  startPlayback?: (paused: boolean) => void
  playback: Playback
  sourceKey: string
  focusEntityId?: string
  focusTriggerActivation?: { on: 'interact' | 'touch'; range?: number }
  sceneFraming?: boolean
}

const previewRender = vi.hoisted(() => vi.fn())
const sceneCanvasRender = vi.hoisted(() => vi.fn())
vi.mock('./SceneCanvas.js', () => ({
  SceneCanvas: (props: Parameters<typeof SceneCanvas>[0]) => {
    sceneCanvasRender(props)
    return <div data-testid="state-canvas" />
  },
}))

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
      sceneSelected?: boolean
      initialStates?: ScriptPreviewLibrary
      onInitialStatesChange?: (library: ScriptPreviewLibrary) => void
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
          sceneSelected={options?.sceneSelected}
          initialStates={options?.initialStates}
          onInitialStatesChange={options?.onInitialStatesChange}
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
          playIdentity={{
            projectId: 'test',
            workspaceId: '11111111-1111-4111-8111-111111111111',
            source: 'http',
          }}
          referenceStatus="current"
          onDispatch={() => {}}
          focusReference={options?.focusReference}
          focusOwner={options?.focusOwner}
        />,
      ),
    )
  }

  test('landing anchor selection exposes no scene or entity script owner', async () => {
    await renderWorkspace(sceneA, null)
    await act(async () => scriptTab('初始状态').click())
    await renderWorkspace(sceneA, null, { sceneSelected: false })
    expect(host.querySelector('[role="tablist"]')).toBeNull()
    expect(host.textContent).toContain('落点属性在右侧编辑')
    expect(previewRender.mock.lastCall?.[0].canonicalFlow).toBeUndefined()
    await renderWorkspace(sceneA, null, { sceneSelected: true })
    expect(scriptTab('初始状态').getAttribute('aria-selected')).toBe('true')
  })

  test('selected step drives body, playback and map cursor without changing initial', async () => {
    const author = canonicalScene('sA', 'A 进场', 'A 交互', 'A')
    const flow: AuthorScriptFlow = {
      kind: 'stages',
      initial: 'first',
      stages: [
        { id: 'first', body: [{ kind: 'giveMoney', delta: 101 }], next: 'second' },
        { id: 'second', body: [{ kind: 'giveMoney', delta: 7 }] },
      ],
    }
    const behavior = author.entities[0]!.behaviors!.trigger!['legacy-001']!
    behavior.flow = flow
    const selectedState = { ...state, scenes: [author] }
    await renderWorkspace(sceneA, 'e1', { state: selectedState })
    const button = host.querySelector<HTMLButtonElement>('[aria-label^="步骤 2，"]')!
    await act(async () => button.click())
    const preview = previewRender.mock.calls.at(-1)![0] as PreviewProbeProps
    expect(preview.canonicalCursor).toEqual({ kind: 'stage', stage: 'second' })
    expect(host.querySelector('.canonical-script-tree')?.textContent).toContain('7')
    await act(async () => {
      preview.startPlayback?.(false)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(preview.playback.view.logs).toContain('💰 +7 钱')
    expect(preview.playback.view.logs).not.toContain('💰 +101 钱')
    expect(flow.initial).toBe('first')

    await act(async () => {
      preview.startPlayback?.(true)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(preview.playback.stepNumber).toBe(0)
    await act(async () => {
      preview.playback.step()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(preview.playback.view.logs).toContain('💰 +7 钱')

    behavior.flow = { ...flow, stages: [{ id: 'first', body: flow.stages[0]!.body }] }
    await renderWorkspace(sceneA, 'e1', { state: selectedState })
    const afterDelete = previewRender.mock.calls.at(-1)![0] as PreviewProbeProps
    expect(afterDelete.canonicalCursor).toEqual({ kind: 'stage', stage: 'first' })
    expect(host.querySelector('.canonical-stage-card.active')?.textContent).toContain('步骤 1')
    await act(async () => {
      afterDelete.startPlayback?.(false)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(afterDelete.playback.view.logs).toContain('💰 +101 钱')
  })

  test('choosing a state changes the canvas immediately; canvas selection and dragging stay within the state editor', async () => {
    const library: ScriptPreviewLibrary = {
      ...emptyScriptPreviewLibrary(),
      states: [
        {
          id: 'a',
          sceneId: 'sA',
          name: '门口',
          entities: [{ entityId: 'e1', pos: { col: 137, row: 76, height: 0 } }],
        },
        {
          id: 'b',
          sceneId: 'sA',
          name: '屋内',
          entities: [{ entityId: 'e1', pos: { col: 137, row: 72, height: 0 } }],
        },
      ],
    }
    const changed = vi.fn()
    await renderWorkspace(sceneA, null, { initialStates: library, onInitialStatesChange: changed })
    await act(async () => scriptTab('初始状态').click())
    const canvas = () =>
      sceneCanvasRender.mock.calls.at(-1)![0] as Parameters<typeof SceneCanvas>[0]
    expect(canvas().scene.entities[0]!.pos.row).toBe(76)
    const second = [...host.querySelectorAll<HTMLButtonElement>('.script-scheme-card-select')].find(
      (button) => button.textContent?.includes('屋内'),
    )!
    await act(async () => second.click())
    expect(canvas().scene.entities[0]!.pos.row).toBe(72)
    expect(changed).not.toHaveBeenCalled()
    await act(async () => canvas().onSelectEntity('e1'))
    expect(scriptTab('初始状态').getAttribute('aria-selected')).toBe('true')
    await act(async () => canvas().onMoveEntity('e1', { col: 135, row: 71 }))
    expect(changed).toHaveBeenLastCalledWith({
      ...library,
      states: [
        library.states[0],
        {
          ...library.states[1],
          entities: [{ entityId: 'e1', pos: { col: 135, row: 71, height: 0 } }],
        },
      ],
    })
    expect(sceneA.entities[0]!.pos).toEqual({ col: 1, row: 1, height: 0 })
    await renderWorkspace(sceneA, 'e1', { initialStates: library })
    expect(scriptTab('交互脚本').getAttribute('aria-selected')).toBe('true')
    expect(
      (previewRender.mock.calls.at(-1)![0] as PreviewProbeProps).playback.entityPos('e1')?.row,
    ).toBe(1)
  })

  test('each selected step restores its own binding in both idle canvas and actual playback', async () => {
    const author = structuredClone(state)
    const flow = author.scenes[0]!.entities[0]!.behaviors!.trigger!['legacy-001']!.flow
    flow.stages.push({ id: 'later', body: [] })
    const entry = {
      sceneId: 'sA',
      entityId: 'e1',
      channel: 'trigger' as const,
      schemeId: 'legacy-001',
      stageId: 'start',
    }
    const library: ScriptPreviewLibrary = {
      ...emptyScriptPreviewLibrary(),
      states: [
        {
          id: 'a',
          sceneId: 'sA',
          name: '门口',
          entities: [{ entityId: 'e1', pos: { col: 137, row: 76, height: 0 } }],
        },
        {
          id: 'b',
          sceneId: 'sA',
          name: '屋内',
          entities: [{ entityId: 'e1', pos: { col: 137, row: 72, height: 0 } }],
        },
      ],
      bindings: [
        { entry, stateId: 'a' },
        { entry: { ...entry, stageId: 'later' }, stateId: 'b' },
      ],
    }
    await renderWorkspace(sceneA, 'e1', { state: author, initialStates: library })
    const preview = () => previewRender.mock.calls.at(-1)![0] as PreviewProbeProps
    expect(preview().scene.entities[0]!.pos.row).toBe(76)
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label^="步骤 2，"]')!.click(),
    )
    expect(preview().scene.entities[0]!.pos.row).toBe(72)
    await act(async () => {
      preview().startPlayback?.(true)
    })
    expect(preview().playback.entityPos('e1')?.row).toBe(72)
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label^="步骤 1，"]')!.click(),
    )
    expect(preview().playback.entityPos('e1')?.row).toBe(76)
    expect(preview().playback.mode).toBe('idle')
  })

  test('same scheme ID across entities and scenes never leaks selected steps', async () => {
    const author = canonicalScene('sA', 'A', 'A', 'A')
    author.entities[0]!.behaviors!.trigger!['legacy-001']!.flow = {
      kind: 'stages',
      initial: 'start',
      stages: [
        { id: 'start', body: [] },
        { id: 'second', body: [] },
      ],
    }
    author.entities.push({ ...structuredClone(author.entities[0]!), id: 'e2' })
    const ownState = { ...state, scenes: [author, canonicalScene('sB', 'B', 'B', 'B')] }
    await renderWorkspace(sceneA, 'e1', { state: ownState })
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label^="步骤 2，"]')!.click(),
    )
    expect((previewRender.mock.calls.at(-1)![0] as PreviewProbeProps).canonicalCursor).toEqual({
      kind: 'stage',
      stage: 'second',
    })
    await renderWorkspace(sceneA, 'e2', { state: ownState })
    expect((previewRender.mock.calls.at(-1)![0] as PreviewProbeProps).canonicalCursor).toEqual({
      kind: 'stage',
      stage: 'start',
    })
    expect(host.querySelector('.canonical-stage-card.active')?.textContent).toContain('步骤 1')
    await renderWorkspace(sceneB, 'e1', { state: ownState })
    expect((previewRender.mock.calls.at(-1)![0] as PreviewProbeProps).canonicalCursor).toEqual({
      kind: 'stage',
      stage: 'start',
    })
  })

  test('follows scene and entity selection without overriding an explicit script tab choice', async () => {
    await renderWorkspace(sceneA, 'e1')
    expect(scriptTab('交互脚本').getAttribute('aria-selected')).toBe('true')
    expect(host.textContent).toContain('A 交互方案')

    await renderWorkspace(sceneA, null)
    expect(scriptTab('进场脚本').getAttribute('aria-selected')).toBe('true')

    await renderWorkspace(sceneB, null)
    expect(host.textContent).toContain('B 进场方案')

    await renderWorkspace(sceneB, 'e1')
    expect(scriptTab('交互脚本').getAttribute('aria-selected')).toBe('true')
    expect(host.textContent).toContain('B 交互方案')
    expect(host.textContent).not.toContain('B 进场方案')
    expect(host.textContent).not.toContain('A 交互方案')

    const preview = previewRender.mock.calls.at(-1)?.[0] as PreviewProbeProps
    expect(preview).toMatchObject({
      focusEntityId: 'e1',
      sceneFraming: false,
      sourceKey: 'canonical:entity:sB:e1:trigger:legacy-001:{"kind":"stage","stage":"start"}',
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

    await renderWorkspace(sceneB, null)
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
      '初始状态',
    ])

    await renderWorkspace(sceneA, 'e1')
    expect([...host.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)).toEqual([
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
      'canonical:entity:sB:e1:trigger:target:{"kind":"stage","stage":"start"}',
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
      's:sB:canonical:target:{"kind":"stage","stage":"start"}',
    )
  })
})
