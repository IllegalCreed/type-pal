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
  CanonicalHelpTipV5,
  CanonicalHostileOnLoseEditorV5,
  CanonicalScriptBodyEditorV5,
  type CanonicalScriptEditorContextV5,
  CanonicalScriptFlowEditorV5,
  removeTriggerStageV5,
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

  test('associates help text with its button and lets Escape dismiss it without moving focus', async () => {
    await act(async () =>
      root.render(
        <CanonicalHelpTipV5 label="分次执行">每次运行只执行当前步骤。</CanonicalHelpTipV5>,
      ),
    )

    const wrapper = host.querySelector<HTMLElement>('.canonical-help-tip')!
    const button = host.querySelector<HTMLButtonElement>('button')!
    const tooltip = host.querySelector<HTMLElement>('[role="tooltip"]')!
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id)
    expect(button.hasAttribute('aria-expanded')).toBe(false)

    await act(async () => button.focus())
    expect(wrapper.classList.contains('dismissed')).toBe(false)
    await act(async () =>
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    expect(wrapper.classList.contains('dismissed')).toBe(true)
    expect(document.activeElement).toBe(button)
    await act(async () => button.blur())
    expect(wrapper.classList.contains('dismissed')).toBe(true)
    await act(async () => button.focus())
    expect(wrapper.classList.contains('dismissed')).toBe(false)
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

  test('focuses a referenced command once per revision and fails closed for stale paths', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const onError = vi.fn()
    const body = [
      { kind: 'setFlag' as const, flag: 'first', value: true },
      { kind: 'setFlag' as const, flag: 'second', value: true },
    ]

    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditorV5
          body={body}
          onChange={() => {}}
          onError={onError}
          focusCommandPath="1"
          focusRevision={1}
        />,
      ),
    )
    let rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    expect(rows[1]?.classList.contains('sel')).toBe(true)

    await act(async () => rows[0]!.click())
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditorV5
          body={[...body, { kind: 'setFlag', flag: 'third', value: true }]}
          onChange={() => {}}
          onError={onError}
          focusCommandPath="1"
          focusRevision={1}
        />,
      ),
    )
    rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    expect(rows[0]?.classList.contains('sel')).toBe(true)
    expect(rows[1]?.classList.contains('sel')).toBe(false)

    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditorV5
          body={body}
          onChange={() => {}}
          onError={onError}
          focusCommandPath="1"
          focusRevision={2}
        />,
      ),
    )
    rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    expect(rows[1]?.classList.contains('sel')).toBe(true)

    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditorV5
          body={body}
          onChange={() => {}}
          onError={onError}
          focusCommandPath="missing"
          focusRevision={3}
        />,
      ),
    )
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenLastCalledWith('引用位置已变化，请重新打开方案详情。')
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditorV5
          body={[...body]}
          onChange={() => {}}
          onError={onError}
          focusCommandPath="missing"
          focusRevision={3}
        />,
      ),
    )
    expect(onError).toHaveBeenCalledTimes(1)
  })

  test('opens hostile battle-loss scripts in the common editor and switches modes canonically', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState<
        'gameOver' | Array<{ kind: 'setFlag'; flag: string; value: boolean }>
      >([
        { kind: 'setFlag', flag: 'first', value: true },
        { kind: 'setFlag', flag: 'second', value: true },
      ])
      return (
        <CanonicalHostileOnLoseEditorV5
          value={value}
          focusCommandPath="1"
          focusRevision={1}
          onChange={(next) => {
            onChange(next)
            setValue(next as typeof value)
          }}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('战败后脚本')
    expect(host.querySelectorAll<HTMLElement>('.cmd-row')[1]?.classList.contains('sel')).toBe(true)
    expect(host.querySelector('textarea.cf-ta')).toBeNull()

    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent === '完成')!
        .click(),
    )
    const mode = host.querySelector<HTMLSelectElement>('[aria-label="战败后的处理"]')!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
      setter.call(mode, 'gameOver')
      mode.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onChange).toHaveBeenLastCalledWith('gameOver')
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
        candidate.textContent?.includes('编辑脚本'),
      )?.disabled,
    ).toBe(true)

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
      setter.call(mode, 'custom')
      mode.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onChange).toHaveBeenLastCalledWith([])
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('战败后脚本')
    expect(host.textContent).toContain('添加第一条指令')
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

  test('separates trigger-stage creation, details, and deletion while preserving body tabs', async () => {
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
      return (
        <CanonicalScriptFlowEditorV5
          ownerLabel="默认进场"
          flow={flow}
          onChange={(next) => {
            setFlow(next)
            return true
          }}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    expect(host.querySelector('.canonical-flow-explanation')?.textContent).toContain(
      '分次执行1 个步骤',
    )
    expect(host.querySelector('.canonical-flow-explanation')?.textContent).not.toContain('当前方案')
    expect(host.querySelector('.canonical-flow-explanation')?.textContent).not.toContain('默认进场')
    expect(host.querySelector('[aria-label="脚本正文"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="画面出现前的准备"]')).toBeNull()

    const prepareTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.includes('画面出现前'),
    )!
    await act(async () => prepareTab.click())
    expect(host.querySelector('[aria-label="画面出现前的准备"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="脚本正文"]')).toBeNull()
    const bodyTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.includes('脚本正文'),
    )!
    const panel = host.querySelector<HTMLElement>('[role="tabpanel"]')!
    expect(prepareTab.tabIndex).toBe(0)
    expect(bodyTab.tabIndex).toBe(-1)
    expect(prepareTab.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-labelledby')).toBe(prepareTab.id)

    await act(async () =>
      prepareTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
    )
    expect(document.activeElement).toBe(bodyTab)
    expect(bodyTab.tabIndex).toBe(0)
    expect(host.querySelector('[aria-label="脚本正文"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="画面出现前的准备"]')).toBeNull()

    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('＋ 新建步骤'))!
        .click(),
    )
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('新建执行步骤')
    expect(host.querySelector('[role="dialog"]')?.textContent).not.toContain('删除这个步骤')
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('创建步骤'))!
        .click(),
    )
    expect(host.textContent).toContain('2 个步骤')
    expect(host.textContent).toContain('步骤 2 · 脚本正文')
    expect(host.textContent).toContain('下次进入步骤 2')
    expect(host.querySelectorAll('.canonical-stage-card-details')).toHaveLength(2)
    expect(host.querySelector('.canonical-flow-actions')?.textContent).not.toContain('步骤详情')

    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '.canonical-stage-card.active .canonical-stage-card-details',
        )!
        .click(),
    )
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('步骤 2 · 详情')
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain('本步骤完成后，下次运行')
    expect(host.querySelector('[role="dialog"]')?.textContent).not.toContain('创建步骤')

    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('删除这个步骤'))!
        .click(),
    )
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('删除步骤 2？')
    expect(host.querySelectorAll('.canonical-stage-tabs > .canonical-stage-card')).toHaveLength(2)
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('确认删除步骤'))!
        .click(),
    )
    expect(host.textContent).toContain('1 个步骤')
    expect(host.querySelector('.canonical-stage-tabs')).toBeNull()
    expect(host.textContent).toContain('旗标 body = 真')
    expect(host.textContent).not.toContain('分段剧情')
  })

  test('selects the referenced execution step without pulling the author back after edits', async () => {
    const flow: ScriptFlowV5 = {
      kind: 'stages',
      initial: 'first',
      stages: [
        {
          id: 'first',
          body: [{ kind: 'setFlag', flag: 'first', value: true }],
        },
        {
          id: 'second',
          body: [{ kind: 'setFlag', flag: 'second', value: true }],
        },
      ],
    }
    const focusLocator = {
      kind: 'command' as const,
      owner: {
        kind: 'entity-behavior' as const,
        sceneId: 's001',
        entityId: 'e1',
        channel: 'trigger' as const,
        behaviorId: 'talk',
      },
      container: { kind: 'step' as const, stepId: 'second', section: 'body' as const },
      commandPath: '0',
    }

    await act(async () =>
      root.render(
        <CanonicalScriptFlowEditorV5
          flow={flow}
          focusLocator={focusLocator}
          focusRevision={1}
          onChange={() => true}
        />,
      ),
    )
    expect(
      host.querySelector<HTMLElement>('.canonical-stage-card.active strong')?.textContent,
    ).toBe('步骤 2')

    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '.canonical-stage-card:first-child .canonical-stage-card-select',
        )!
        .click(),
    )
    await act(async () =>
      root.render(
        <CanonicalScriptFlowEditorV5
          flow={structuredClone(flow)}
          focusLocator={focusLocator}
          focusRevision={1}
          onChange={() => true}
        />,
      ),
    )
    expect(
      host.querySelector<HTMLElement>('.canonical-stage-card.active strong')?.textContent,
    ).toBe('步骤 1')
  })

  test('rewrites initial and incoming next links atomically when a trigger stage is removed', () => {
    const source = {
      kind: 'stages' as const,
      initial: 'middle',
      stages: [
        { id: 'first', body: [], next: 'middle' },
        { id: 'middle', body: [{ kind: 'setFlag' as const, flag: 'middle', value: true }] },
        { id: 'last', body: [], next: 'middle' },
      ],
    }

    expect(removeTriggerStageV5(source, 'middle', 'last')).toEqual({
      kind: 'stages',
      initial: 'last',
      stages: [
        { id: 'first', body: [], next: 'last' },
        { id: 'last', body: [], next: 'last' },
      ],
    })
    expect(source.stages.map((stage) => stage.id)).toEqual(['first', 'middle', 'last'])
    expect(() =>
      removeTriggerStageV5({ ...source, stages: [source.stages[0]!] }, 'first', 'last'),
    ).toThrow('至少需要保留一个步骤')
  })

  test('keeps development-save protection out of author-facing stage controls', async () => {
    const flow: ScriptFlowV5 = {
      kind: 'stages',
      initial: 'first',
      stages: [
        { id: 'first', body: [] },
        { id: 'later', body: [] },
      ],
    }
    await act(async () =>
      root.render(
        <CanonicalScriptFlowEditorV5
          ownerLabel="开发期迁移方案"
          flow={flow}
          onChange={() => true}
        />,
      ),
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('步骤详情'))!
        .click(),
    )
    expect(host.textContent).not.toContain('旧存档')
    expect(host.textContent).not.toContain('迁移记录保护')
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
        candidate.textContent?.includes('删除这个步骤'),
      )?.disabled,
    ).toBe(false)
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
      return (
        <CanonicalScriptFlowEditorV5
          flow={flow}
          onChange={(next) => {
            setFlow(next)
            return true
          }}
        />
      )
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
