// @vitest-environment jsdom

import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { LifecycleCommandPanel } from './LifecycleCommandPanel.js'

function currentState(): EditorState {
  return {
    manifest: {
      id: 'lifecycle-panel-test',
      name: 'Lifecycle panel test',
      contentVersion: 16,
      entryScene: 's',
      content: {
        scenes: 'content/scenes/',
        maps: 'content/maps/index.json',
        sharedScripts: 'content/shared-scripts.json',
      },
      assets: { catalog: 'assets/index.json', roles: {} },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      minimumSaveVersion: 8,
    },
    scenes: [
      {
        id: 's',
        mapId: 'map-s',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'a',
            pos: { col: 1, row: 1, height: 0 },
            sprite: 'ghost',
            behaviors: {
              trigger: {
                main: {
                  label: 'main',
                  order: 0,
                  flow: {
                    kind: 'stages',
                    initial: 'main',
                    stages: [
                      {
                        id: 'main',
                        body: [
                          { kind: 'wait', ms: 100 },
                          {
                            kind: 'hideEntity',
                            target: { scene: 's', entity: 'b' },
                            ticks: 10,
                          },
                        ],
                      },
                      { id: 'after', body: [] },
                    ],
                  },
                },
              },
            },
          },
          {
            id: 'b',
            pos: { col: 2, row: 2, height: 0 },
            sprite: 'ghost',
          },
        ],
      },
    ],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    maps: {},
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps: [],
    scriptChunks: {},
    tilesetBlobs: {},
  } as unknown as EditorState
}

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  return <LifecycleCommandPanel session={props.session} sceneId="s" entityId="a" />
}

describe('LifecycleCommandPanel', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
  })

  test('renders each script body as a separate card with an explicit command position', async () => {
    const session = new EditSession(currentState())
    await act(async () => root.render(<Harness session={session} />))

    expect(host.querySelector('.ds-inspector-section__title')?.textContent).toBe('实体状态命令')
    expect(host.textContent).toContain('每张卡片对应当前实体脚本中的一段执行正文')
    const cards = [...host.querySelectorAll<HTMLElement>('.lifecycle-command-body')]
    expect(cards).toHaveLength(2)
    expect(cards[0]?.textContent).toContain('执行正文 1')
    expect(cards[1]?.textContent).toContain('执行正文 2')
    expect(cards[0]?.textContent).toContain('触发 / main / main')
    expect(cards[1]?.textContent).toContain('触发 / main / after')
    expect(cards[0]?.querySelector('.lifecycle-command-row__heading h4')?.textContent).toBe(
      '状态命令 1',
    )
    expect(cards[0]?.textContent).toContain('正文第 2 条')
    expect(cards[1]?.textContent).toContain('此执行正文暂无实体状态命令')

    const add = cards[1]?.querySelector<HTMLButtonElement>(
      'button[aria-label="向“执行正文 2：触发 / main / after”末尾添加状态命令"]',
    )
    await act(async () => add?.click())

    const stages = () =>
      (
        session.getState().scenes[0] as unknown as {
          entities: Array<{
            behaviors: {
              trigger: Record<string, { flow: { stages: Array<{ body: unknown[] }> } }>
            }
          }>
        }
      ).entities[0]!.behaviors.trigger.main!.flow.stages
    expect(stages()[1]?.body).toEqual([
      {
        kind: 'suspendEntity',
        target: { scene: 's', entity: 'a' },
        ticks: 15,
      },
    ])
    expect(host.querySelectorAll('.lifecycle-command-row')).toHaveLength(2)

    const remove = host.querySelector<HTMLButtonElement>(
      'button[aria-label="删除“执行正文 1：触发 / main / main”中的状态命令 1"]',
    )
    await act(async () => remove?.click())
    expect(stages()[0]?.body).toEqual([{ kind: 'wait', ms: 100 }])
  })

  test('shows a useful empty state when the entity has no executable script body', async () => {
    const state = currentState()
    delete (state.scenes[0]!.entities[0] as { behaviors?: unknown }).behaviors
    await act(async () => root.render(<Harness session={new EditSession(state)} />))

    expect(host.querySelectorAll('.lifecycle-command-body')).toHaveLength(0)
    expect(host.textContent).toContain('暂无可编辑执行正文')
    expect(host.textContent).toContain('创建触发或自动行为')
  })
})
