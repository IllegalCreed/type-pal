// @vitest-environment jsdom

import {
  type AssetCatalogV1,
  BASE_AUTHOR_COMMAND_KINDS,
  type SceneDef,
  type BaseScriptFlow,
} from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  AUTHOR_COMMAND_PRESENTATION_,
  CanonicalHelpTip,
  CanonicalHostileOnLoseEditor,
  CanonicalScriptBodyEditor,
  type CanonicalScriptEditorContext,
  CanonicalScriptFlowEditor,
  removeTriggerStage,
} from './ScriptEditor.js'

function combobox(ariaLabel: string): HTMLButtonElement {
  const control = document.querySelector<HTMLButtonElement>(
    `button[role="combobox"][aria-label="${ariaLabel}"]`,
  )
  expect(control, `combobox ${ariaLabel}`).not.toBeNull()
  return control!
}

async function openCombobox(ariaLabel: string): Promise<HTMLElement> {
  const control = combobox(ariaLabel)
  await act(async () => control.click())
  const listbox = document.getElementById(control.getAttribute('aria-controls')!)
  expect(listbox?.getAttribute('role'), `listbox ${ariaLabel}`).toBe('listbox')
  return listbox!
}

async function changeNativeSelect(ariaLabel: string, value: string): Promise<void> {
  const select = document.querySelector<HTMLButtonElement>(
    `[role="combobox"][aria-label="${ariaLabel}"]`,
  )
  expect(select, `select ${ariaLabel}`).not.toBeNull()
  await act(async () => select!.click())
  const label =
    value === 'gameOver' ? '游戏结束（默认）' : value === 'custom' ? '运行自定义脚本' : value
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent === label,
  )
  expect(option, `option ${label}`).not.toBeNull()
  await act(async () => option!.click())
}

describe('CanonicalScriptEditor author presentation', () => {
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
    const enabled = Object.entries(BASE_AUTHOR_COMMAND_KINDS)
      .filter(([, value]) => value)
      .map(([kind]) => kind)
      .sort()
    expect(Object.keys(AUTHOR_COMMAND_PRESENTATION_).sort()).toEqual(enabled)
    for (const [kind, [, label]] of Object.entries(AUTHOR_COMMAND_PRESENTATION_)) {
      expect(label).not.toBe(kind)
      expect(label).toMatch(/[\u3400-\u9fff]/)
    }
  })

  test('associates help text with its button and lets Escape dismiss it without moving focus', async () => {
    await act(async () =>
      root.render(
        <CanonicalHelpTip label="分次执行">每次运行只执行当前步骤。</CanonicalHelpTip>,
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
      <CanonicalScriptBodyEditor
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
        <CanonicalScriptBodyEditor
          body={[{ kind: 'setFlag', flag: 'opened', value: true }]}
          onChange={onChange}
        />,
      ),
    )

    expect(host.querySelector('.canonical-script-properties')).toBeNull()
    expect(host.querySelector('[role="dialog"]')).toBeNull()

    const row = host.querySelector<HTMLElement>('.cmd-row')!
    expect(row.getAttribute('role')).toBe('treeitem')
    expect(row.tabIndex).toBe(0)
    expect(row.querySelector('[aria-label="编辑"]')).not.toBeNull()
    for (const button of row.querySelectorAll('.canonical-script-row-actions button'))
      expect(button.textContent).toBe('')
    await act(async () =>
      row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })),
    )
    expect(row.classList.contains('sel')).toBe(true)
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
    const enabledKinds = Object.entries(BASE_AUTHOR_COMMAND_KINDS)
      .filter(([kind, enabled]) => enabled && kind !== 'holdScreen' && kind !== 'revealScreen')
      .map(([kind]) => kind)
    expect([...insertKinds].sort()).toEqual(enabledKinds.sort())
    const unavailableShared = host.querySelector<HTMLButtonElement>(
      '[data-command-kinds="callScript"]',
    )
    expect(unavailableShared?.disabled).toBe(true)
    expect(unavailableShared?.textContent).toContain('请先在“剧情 → 脚本库”创建')
  })

  test('focuses a referenced command once per revision and fails closed for stale paths', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
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
        <CanonicalScriptBodyEditor
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
    expect(rows[1]?.classList.contains('reference-focus-odd')).toBe(true)
    expect(document.activeElement).toBe(rows[1])
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    await act(async () => rows[0]!.click())
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
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
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
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
    expect(rows[1]?.classList.contains('reference-focus-even')).toBe(true)
    expect(document.activeElement).toBe(rows[1])
    expect(scrollIntoView).toHaveBeenCalledTimes(2)

    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
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
        <CanonicalScriptBodyEditor
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

  test('keeps a pending reference focus when the shell rerenders before the next frame', async () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const body = [
      { kind: 'setFlag' as const, flag: 'first', value: true },
      { kind: 'setFlag' as const, flag: 'target', value: true },
    ]

    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
          body={body}
          onChange={() => {}}
          focusCommandPath="1"
          focusRevision={11}
        />,
      ),
    )
    expect(frames).toHaveLength(1)

    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
          body={structuredClone(body)}
          onChange={() => {}}
          focusCommandPath="1"
          focusRevision={11}
        />,
      ),
    )
    expect(frames).toHaveLength(1)

    await act(async () => frames[0]!(0))
    const target = host.querySelector<HTMLElement>('[data-command-path="1"]')!
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(target)
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
        <CanonicalHostileOnLoseEditor
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
    await changeNativeSelect('战败后的处理', 'gameOver')
    expect(onChange).toHaveBeenLastCalledWith('gameOver')
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
        candidate.textContent?.includes('编辑脚本'),
      )?.disabled,
    ).toBe(true)

    await changeNativeSelect('战败后的处理', 'custom')
    expect(onChange).toHaveBeenLastCalledWith([])
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('战败后脚本')
    expect(host.textContent).toContain('添加第一条指令')
  })

  test('keeps raw JSON out of canonical command dialogs', async () => {
    const context: CanonicalScriptEditorContext = {
      state: {
        scenes: [],
        items: [],
        sharedScripts: {},
      },
      currentSceneId: 's001',
      shellScenes: [{ id: 's001', entities: [] } as unknown as SceneDef],
      locale: {},
      assetCatalog: { version: 1, assets: {} } satisfies AssetCatalogV1,
      audioResolver: {} as CanonicalScriptEditorContext['audioResolver'],
      assetReader: {} as CanonicalScriptEditorContext['assetReader'],
      references: {
        choices: () => [],
        has: () => false,
        label: (_kind, id) => id,
      },
      battleSprites: [],
    }
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
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

  test('startBattle 只能从项目战场表选择 fieldId，并可跳转打开定义', async () => {
    const onChange = vi.fn()
    const onOpenBattleField = vi.fn()
    const context: CanonicalScriptEditorContext = {
      state: { scenes: [], items: [], sharedScripts: {} },
      currentSceneId: 's001',
      shellScenes: [{ id: 's001', entities: [] } as unknown as SceneDef],
      locale: {},
      assetCatalog: { version: 1, assets: {} },
      audioResolver: {} as CanonicalScriptEditorContext['audioResolver'],
      assetReader: {} as CanonicalScriptEditorContext['assetReader'],
      references: { choices: () => [], has: () => false, label: (_kind, id) => id },
      battleSprites: [],
      battleFields: [
        {
          id: 24,
          name: '默认战场',
          screenWave: 0,
          magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        },
        {
          id: 25,
          name: '竹林',
          screenWave: 0,
          magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        },
      ],
      onOpenBattleField,
    }
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
          body={[{ kind: 'startBattle', enemyTeamId: 'team-1', fieldId: 24 }]}
          context={context}
          onChange={onChange}
        />,
      ),
    )
    await act(async () =>
      host
        .querySelector<HTMLElement>('.cmd-row')!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    const listbox = await openCombobox('开战指令战场')
    expect(
      [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].map((option) =>
        option.textContent?.trim(),
      ),
    ).toEqual(['跟随当前场景默认战场', '默认战场 · #024 · 项目默认', '竹林 · #025'])
    const bambooOption = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.trim() === '竹林 · #025',
    )
    expect(bambooOption).toBeDefined()
    await act(async () => bambooOption!.click())
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ kind: 'startBattle', enemyTeamId: 'team-1', fieldId: 25 }),
    ])
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="打开战场 24"]')!.click(),
    )
    expect(onOpenBattleField).toHaveBeenCalledWith(24)
  })

  test('resolves current actor identity in canonical command summaries', async () => {
    const context: CanonicalScriptEditorContext = {
      state: {
        scenes: [],
        items: [],
        sharedScripts: {},
      },
      currentSceneId: 's001',
      shellScenes: [{ id: 's001', entities: [] } as unknown as SceneDef],
      locale: { 'name.hero': '李逍遥', 'dialog.hero': '出发吧！' },
      assetCatalog: { version: 1, assets: {} },
      audioResolver: {} as CanonicalScriptEditorContext['audioResolver'],
      assetReader: {} as CanonicalScriptEditorContext['assetReader'],
      references: {
        choices: () => [],
        has: () => false,
        label: (_kind, id) => id,
      },
      actors: {
        hero: {
          id: 'hero',
          name: 'name.hero',
          spriteId: 'sprite.hero',
          portraits: { default: 'portrait.hero', expressions: {} },
        },
      },
      battleSprites: [],
    }
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
          body={[
            {
              kind: 'dialog',
              cue: {
                identity: {
                  kind: 'actor',
                  actor: 'hero',
                  portrait: { kind: 'default', side: 'left' },
                },
                rows: [{ text: 'dialog.hero' }],
              },
            } as never,
          ]}
          context={context}
          onChange={() => {}}
        />,
      ),
    )

    expect(host.textContent).toContain('李逍遥: 出发吧！')
    expect(host.textContent).toContain('立绘 portrait.hero')
  })

  test('separates trigger-stage creation, details, and deletion while preserving body tabs', async () => {
    function Harness() {
      const [flow, setFlow] = useState<BaseScriptFlow>({
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
        <CanonicalScriptFlowEditor
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
        .find((candidate) => candidate.textContent?.includes('新建步骤'))!
        .click(),
    )
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('新建执行步骤')
    expect(host.querySelector('[role="dialog"]')?.textContent).not.toContain('删除步骤')
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
    const detailsDialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    const detailsBody = detailsDialog.querySelector('.canonical-script-modal-body')!
    const detailsFooter = detailsDialog.querySelector('.canonical-script-modal-footer')!
    expect(detailsDialog.textContent).not.toContain('所属方案')
    expect(detailsBody.querySelector('.canonical-modal-context')).toBeNull()
    expect(detailsBody.querySelector('.canonical-stage-delete-area')).toBeNull()
    expect(
      [...detailsBody.querySelectorAll('.canonical-dialog-field-heading')].map(
        (heading) => heading.querySelector(':scope > strong, :scope > label')?.textContent,
      ),
    ).toEqual(['起始步骤', '下次运行'])
    expect(detailsFooter.firstElementChild?.textContent).toContain('删除步骤')
    expect(detailsFooter.querySelector('.spacer')).not.toBeNull()
    expect(detailsFooter.textContent).toContain('关闭')
    expect(host.querySelector('[role="dialog"]')?.textContent).not.toContain('创建步骤')

    await act(async () =>
      [...detailsFooter.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('删除步骤'))!
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
    const flow: BaseScriptFlow = {
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
        <CanonicalScriptFlowEditor
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
        <CanonicalScriptFlowEditor
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

    expect(removeTriggerStage(source, 'middle', 'last')).toEqual({
      kind: 'stages',
      initial: 'last',
      stages: [
        { id: 'first', body: [], next: 'last' },
        { id: 'last', body: [], next: 'last' },
      ],
    })
    expect(source.stages.map((stage) => stage.id)).toEqual(['first', 'middle', 'last'])
    expect(() =>
      removeTriggerStage({ ...source, stages: [source.stages[0]!] }, 'first', 'last'),
    ).toThrow('至少需要保留一个步骤')
  })

  test('keeps development-save protection out of author-facing stage controls', async () => {
    const flow: BaseScriptFlow = {
      kind: 'stages',
      initial: 'first',
      stages: [
        { id: 'first', body: [] },
        { id: 'later', body: [] },
      ],
    }
    await act(async () =>
      root.render(
        <CanonicalScriptFlowEditor
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
        candidate.textContent?.includes('删除步骤'),
      )?.disabled,
    ).toBe(false)
  })

  test('preserves the preparation tab for state-machine entries', async () => {
    function Harness() {
      const [flow, setFlow] = useState<BaseScriptFlow>({
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
        <CanonicalScriptFlowEditor
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
