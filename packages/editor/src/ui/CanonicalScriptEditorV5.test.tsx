// @vitest-environment jsdom

import {
  type AssetCatalogV1,
  AUTHOR_COMMAND_V5_KINDS,
  type SceneDef,
  type ScriptFlowV5,
} from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  AUTHOR_COMMAND_PRESENTATION_V5,
  CanonicalScriptBodyEditorV5,
  type CanonicalScriptEditorContextV5,
  CanonicalScriptFlowEditorV5,
} from './CanonicalScriptEditorV5.js'

describe('CanonicalScriptEditorV5 author presentation', () => {
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

  test('has an author-facing Chinese name for every enabled canonical command kind', () => {
    const enabled = Object.entries(AUTHOR_COMMAND_V5_KINDS)
      .filter(([, value]) => value)
      .map(([kind]) => kind)
      .sort()
    expect(Object.keys(AUTHOR_COMMAND_PRESENTATION_V5).sort()).toEqual(enabled)
    for (const [kind, [, label]] of Object.entries(AUTHOR_COMMAND_PRESENTATION_V5)) {
      expect(label).not.toBe(kind)
      expect(label).toMatch(/[\u3400-\u9fff]/)
    }
  })

  test('renders command rows in the existing Chinese script-tree language', () => {
    const html = renderToStaticMarkup(
      <CanonicalScriptBodyEditorV5
        body={[
          { kind: 'teleportParty', pos: { col: 1, row: 2, height: 0 } },
          { kind: 'setPartyFacing', facing: 'right' },
          {
            kind: 'moveEntity',
            target: { scene: 's001', entity: 'e1' },
            to: { col: 3, row: 4, height: 0 },
            speed: 'normal',
          },
          {
            kind: 'selectSceneHooks',
            scene: 's001',
            selection: { onEnter: { kind: 'disabled' } },
          },
        ]}
        onChange={() => {}}
      />,
    )

    expect(html).toContain('队伍瞬移')
    expect(html).toContain('队伍转向')
    expect(html).toContain('e1 走到')
    expect(html).toContain('切换场景脚本')
    expect(html).not.toContain('teleportParty')
    expect(html).not.toContain('setPartyFacing')
    expect(html).not.toContain('selectSceneHooks')
  })

  test('keeps the command list full width and edits or inserts through dialogs', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditorV5
          body={[{ kind: 'setFlag', flag: 'opened', value: true }]}
          onChange={onChange}
        />,
      ),
    )

    expect(host.querySelector('.canonical-script-properties')).toBeNull()
    expect(host.querySelector('[role="dialog"]')).toBeNull()

    const row = host.querySelector<HTMLElement>('.cmd-row')!
    await act(async () => row.click())
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    await act(async () =>
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toContain('编辑')
    expect(
      [...host.querySelectorAll<HTMLInputElement>('input')].some(
        (candidate) => candidate.value === 'opened',
      ),
    ).toBe(true)

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click())
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('添加指令'))!
        .click(),
    )
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('添加指令')
    expect(host.textContent).toContain('常用指令')
    const insertKinds = new Set(
      [...host.querySelectorAll<HTMLButtonElement>('[data-command-kinds]')].flatMap((button) =>
        (button.dataset.commandKinds ?? '').split(',').filter(Boolean),
      ),
    )
    const enabledKinds = Object.entries(AUTHOR_COMMAND_V5_KINDS)
      .filter(([, enabled]) => enabled)
      .map(([kind]) => kind)
    expect([...insertKinds].sort()).toEqual(enabledKinds.sort())
    const unavailableShared = host.querySelector<HTMLButtonElement>(
      '[data-command-kinds="callScript"]',
    )
    expect(unavailableShared?.disabled).toBe(true)
    expect(unavailableShared?.textContent).toContain('请先在“剧情 → 脚本库”创建')
  })

  test('keeps raw JSON out of canonical command dialogs', async () => {
    const context: CanonicalScriptEditorContextV5 = {
      state: {
        scenes: [],
        items: [],
        sharedScripts: {},
        migrationSidecars: [],
      },
      currentSceneId: 's001',
      shellScenes: [{ id: 's001', entities: [] } as unknown as SceneDef],
      locale: {},
      assetCatalog: { version: 1, assets: {} } satisfies AssetCatalogV1,
      audioResolver: {} as CanonicalScriptEditorContextV5['audioResolver'],
      assetReader: {} as CanonicalScriptEditorContextV5['assetReader'],
      references: {
        choices: () => [],
        has: () => false,
        label: (_kind, id) => id,
      },
      battleSprites: [],
    }
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditorV5
          body={[{ kind: 'dialog', cue: { rows: [{ text: '测试对话' }] } }, { kind: 'cameraSnap' }]}
          context={context}
          onChange={() => {}}
        />,
      ),
    )

    const rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    await act(async () =>
      rows[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    expect(host.textContent).toContain('说话人')
    expect(host.textContent).not.toContain('应用 JSON')
    expect(host.querySelector('.cf-json')).toBeNull()

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click())
    await act(async () =>
      rows[1]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    expect(host.textContent).toContain('镜头位置')
    expect(host.textContent).not.toContain('JSON')
  })

  test('switches entry preparation and body as tabs and moves stage settings into a dialog', async () => {
    function Harness() {
      const [flow, setFlow] = useState<ScriptFlowV5>({
        kind: 'stages' as const,
        initial: 'first',
        stages: [
          {
            id: 'first',
            entry: {
              prepare: [{ kind: 'playMusic', asset: 'music.pal.001' }],
              reveal: { kind: 'cut' },
            },
            body: [{ kind: 'setFlag', flag: 'body', value: true }],
          },
        ],
      })
      return <CanonicalScriptFlowEditorV5 flow={flow} onChange={setFlow} />
    }

    await act(async () => root.render(<Harness />))
    expect(host.querySelector('[aria-label="脚本正文"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="画面出现前的准备"]')).toBeNull()

    const prepareTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.includes('画面出现前'),
    )!
    await act(async () => prepareTab.click())
    expect(host.querySelector('[aria-label="画面出现前的准备"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="脚本正文"]')).toBeNull()

    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('分段剧情设置'))!
        .click(),
    )
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('分段剧情设置')
    expect(host.textContent).toContain('新增第二段剧情')
  })

  test('preserves the preparation tab for state-machine entries', async () => {
    function Harness() {
      const [flow, setFlow] = useState<ScriptFlowV5>({
        kind: 'stateMachine',
        machine: {
          id: 'dialogue',
          label: '连续对话',
          initial: 'first',
          states: {
            first: {
              label: '第一次交谈',
              entry: {
                prepare: [{ kind: 'playMusic', asset: 'music.pal.001' }],
                reveal: { kind: 'cut' },
              },
              body: [{ kind: 'setFlag', flag: 'body', value: true }],
              next: { kind: 'stay' },
            },
          },
        },
      })
      return <CanonicalScriptFlowEditorV5 flow={flow} onChange={setFlow} />
    }

    await act(async () => root.render(<Harness />))
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    expect(tabs.map((candidate) => candidate.textContent)).toEqual([
      expect.stringContaining('画面出现前'),
      expect.stringContaining('脚本正文'),
    ])
    expect(host.querySelector('[aria-label="第一次交谈 · 正文"]')).not.toBeNull()

    await act(async () => tabs[0]!.click())
    expect(host.querySelector('[aria-label="画面出现前的准备"]')).not.toBeNull()
    expect(host.textContent).toContain('播放音乐')
    expect(host.querySelector('[aria-label="第一次交谈 · 正文"]')).toBeNull()
  })
})
