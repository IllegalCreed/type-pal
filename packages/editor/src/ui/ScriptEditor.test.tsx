// @vitest-environment jsdom

import {
  type AssetCatalogV1,
  type AuthorCommand,
  type AuthorScriptFlow,
  RUNTIME_COMMAND_KINDS,
  type SceneDef,
} from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  AUTHOR_COMMAND_PRESENTATION_,
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
    const enabled = Object.entries(RUNTIME_COMMAND_KINDS)
      .filter(([, value]) => value)
      .map(([kind]) => kind)
      .sort()
    expect(Object.keys(AUTHOR_COMMAND_PRESENTATION_).sort()).toEqual(enabled)
    for (const [kind, [, label]] of Object.entries(AUTHOR_COMMAND_PRESENTATION_)) {
      expect(label).not.toBe(kind)
      expect(label).toMatch(/[\u3400-\u9fff]/)
    }
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
    const enabledKinds = Object.entries(RUNTIME_COMMAND_KINDS)
      .filter(([kind, enabled]) => enabled && kind !== 'holdScreen' && kind !== 'revealScreen')
      .map(([kind]) => kind)
    expect([...insertKinds].sort()).toEqual(enabledKinds.sort())
    const unavailableShared = host.querySelector<HTMLButtonElement>(
      '[data-command-kinds="callScript"]',
    )
    expect(unavailableShared?.disabled).toBe(true)
    expect(unavailableShared?.textContent).toContain('请先在“剧情 → 脚本库”创建')
  })

  test('copies, reorders and removes an entity-state command through shared row actions', async () => {
    const changes = vi.fn()
    function Harness() {
      const [body, setBody] = useState<AuthorCommand[]>([
        {
          kind: 'suspendEntity',
          target: { scene: 's001', entity: 'e1' },
          ticks: 4,
        },
        {
          kind: 'hideEntity',
          target: { scene: 's001', entity: 'e1' },
          ticks: 8,
        },
      ])
      return (
        <CanonicalScriptBodyEditor
          body={body}
          onChange={(next) => {
            changes(next)
            setBody(next)
          }}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    let rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    expect(rows).toHaveLength(2)
    await act(async () => rows[0]!.querySelector<HTMLButtonElement>('[aria-label="复制"]')!.click())

    rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.textContent).toContain('暂停')
    expect(rows[1]!.textContent).toContain('暂停')
    expect(rows[2]!.textContent).toContain('隐藏')

    await act(async () => rows[1]!.click())
    changes.mockClear()
    await act(async () =>
      rows[1]!.querySelector<HTMLButtonElement>('[aria-label^="下移"]')!.click(),
    )
    expect(changes).toHaveBeenCalledOnce()
    rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    expect(rows[1]!.textContent).toContain('隐藏')
    expect(rows[2]!.textContent).toContain('暂停')
    expect(rows[2]!.classList.contains('sel')).toBe(true)

    await act(async () => rows[2]!.querySelector<HTMLButtonElement>('[aria-label="删除"]')!.click())
    expect(host.querySelectorAll<HTMLElement>('.cmd-row')).toHaveLength(2)
  })

  test('[reorder-family:script-siblings] nested reorder follows locally, then external undo/redo clears path identity', async () => {
    const initial: AuthorCommand[] = [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'open', is: true },
        then: [
          { kind: 'wait', ms: 100 },
          { kind: 'wait', ms: 200 },
        ],
      },
    ]
    let restoreInitial = (): void => undefined
    let restoreMoved = (): void => undefined
    let movedSnapshot: AuthorCommand[] | undefined
    const changes = vi.fn()
    function Harness() {
      const [body, setBody] = useState<AuthorCommand[]>(() => structuredClone(initial))
      restoreInitial = () => setBody(structuredClone(initial))
      restoreMoved = () => {
        if (movedSnapshot) setBody(structuredClone(movedSnapshot))
      }
      return (
        <CanonicalScriptBodyEditor
          body={body}
          onChange={(next) => {
            movedSnapshot = next
            changes(next)
            setBody(next)
          }}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    const first = host.querySelector<HTMLElement>('[data-command-path="0/then/0"]')!
    await act(async () => first.click())
    await act(async () => first.querySelector<HTMLButtonElement>('[aria-label^="下移"]')!.click())
    expect(changes).toHaveBeenCalledOnce()
    expect(host.querySelector('[data-command-path="0/then/1"]')?.classList.contains('sel')).toBe(
      true,
    )

    await act(async () => restoreInitial())
    expect(host.querySelector('.cmd-row.sel')).toBeNull()
    await act(async () => restoreMoved())
    expect(host.querySelector('.cmd-row.sel')).toBeNull()
  })

  test('inserts and edits an entity-state command with the shared localized form', async () => {
    const changes = vi.fn()
    const scene = {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'e1',
          sprite: 'npc',
          pos: { col: 1, row: 2, height: 0 },
        },
      ],
    }
    const context: CanonicalScriptEditorContext = {
      state: { scenes: [scene], items: [], sharedScripts: {} } as never,
      currentSceneId: 's001',
      currentEntityId: 'e1',
      shellScenes: [scene as unknown as SceneDef],
      locale: {},
      assetCatalog: { version: 1 as const, assets: {} },
      audioResolver: {} as CanonicalScriptEditorContext['audioResolver'],
      assetReader: {} as CanonicalScriptEditorContext['assetReader'],
      references: { choices: () => [], has: () => false, label: (_kind, id) => id },
      battleSprites: [],
    }

    function Harness() {
      const [body, setBody] = useState<AuthorCommand[]>([])
      return (
        <CanonicalScriptBodyEditor
          body={body}
          context={context}
          onChange={(next) => {
            changes(next)
            setBody(next)
          }}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('添加指令'))!
        .click(),
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[data-command-kinds="suspendEntity"]')!.click(),
    )
    changes.mockClear()

    let row = host.querySelector<HTMLElement>('.cmd-row')!
    expect(row.textContent).toContain('暂停 s001/e1')
    await act(async () =>
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    let dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.querySelector('[role="combobox"][aria-label="场景"]')).not.toBeNull()
    expect(dialog.querySelector('[role="combobox"][aria-label="实体"]')).not.toBeNull()
    expect(dialog.textContent).toContain('持续时间（tick）')

    await act(async () =>
      [...dialog.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent === '完成')!
        .click(),
    )
    expect(changes).not.toHaveBeenCalled()

    row = host.querySelector<HTMLElement>('.cmd-row')!
    await act(async () =>
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    let ticks = dialog.querySelector<HTMLInputElement>('input[type="number"]')!
    await act(async () => {
      valueSetter.call(ticks, '6')
      ticks.dispatchEvent(new Event('input', { bubbles: true }))
      valueSetter.call(ticks, '1')
      ticks.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      [...dialog.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent === '完成')!
        .click(),
    )
    expect(changes).not.toHaveBeenCalled()

    row = host.querySelector<HTMLElement>('.cmd-row')!
    await act(async () =>
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    ticks = dialog.querySelector<HTMLInputElement>('input[type="number"]')!
    await act(async () => {
      valueSetter.call(ticks, '6')
      ticks.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(changes).not.toHaveBeenCalled()
    await act(async () => dialog.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click())
    expect(changes).not.toHaveBeenCalled()

    row = host.querySelector<HTMLElement>('.cmd-row')!
    await act(async () =>
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    ticks = dialog.querySelector<HTMLInputElement>('input[type="number"]')!
    await act(async () => {
      valueSetter.call(ticks, '6')
      ticks.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      [...dialog.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent === '完成')!
        .click(),
    )
    expect(changes).toHaveBeenCalledOnce()
    row = host.querySelector<HTMLElement>('.cmd-row')!
    expect(row.textContent).toContain('6 tick')
  })

  test('角色当前状态命令可从空脚本插入并复用中文聚合表单', async () => {
    const changes = vi.fn()
    const scene = {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    }
    const actor = {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'sprite.hero',
      battler: {
        battleSprite: 'battle.hero',
        baseStats: {
          level: 1,
          hp: 100,
          maxHP: 100,
          mp: 30,
          maxMP: 30,
          attack: 10,
          defense: 10,
          magicAttack: 10,
          speed: 10,
          luck: 10,
        },
        initialEquipment: {},
        initialMagic: [],
      },
    }
    const context: CanonicalScriptEditorContext = {
      state: { scenes: [scene], items: [], sharedScripts: {} } as never,
      currentSceneId: 's001',
      shellScenes: [scene as unknown as SceneDef],
      locale: { 'name.hero': '主角' },
      assetCatalog: { version: 1, assets: {} } as CanonicalScriptEditorContext['assetCatalog'],
      audioResolver: {} as CanonicalScriptEditorContext['audioResolver'],
      assetReader: {} as CanonicalScriptEditorContext['assetReader'],
      actors: { hero: actor },
      references: {
        choices: (kind) =>
          kind === 'actor'
            ? [{ id: 'hero', name: '主角' }]
            : kind === 'poison'
              ? [{ id: '7', name: '赤毒' }]
              : [],
        has: (kind, id) => (kind === 'actor' && id === 'hero') || (kind === 'poison' && id === '7'),
        label: (kind, id) =>
          kind === 'actor' && id === 'hero'
            ? '主角（hero）'
            : kind === 'poison' && id === '7'
              ? '赤毒（7）'
              : id,
      },
      battleSprites: [],
    }

    function Harness() {
      const [body, setBody] = useState<AuthorCommand[]>([])
      return (
        <CanonicalScriptBodyEditor
          body={body}
          context={context}
          onChange={(next) => {
            changes(next)
            setBody(next)
          }}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('添加指令'))!
        .click(),
    )
    const apply = host.querySelector<HTMLButtonElement>(
      '[data-command-kinds="applyActorCondition"]',
    )!
    const clear = host.querySelector<HTMLButtonElement>(
      '[data-command-kinds="clearActorCondition"]',
    )!
    expect(apply.disabled).toBe(false)
    expect(clear.disabled).toBe(false)
    await act(async () => apply.click())
    expect(changes).toHaveBeenCalledOnce()
    expect(changes).toHaveBeenLastCalledWith([
      {
        kind: 'applyActorCondition',
        actor: 'hero',
        condition: { kind: 'poison', poisonId: 7 },
      },
    ])

    const row = host.querySelector<HTMLElement>('.cmd-row')!
    expect(row.textContent).toContain('主角（hero）')
    expect(row.textContent).toContain('赤毒（7）')
    changes.mockClear()
    await act(async () =>
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.textContent).toContain('目标角色')
    expect(dialog.textContent).toContain('选择“中毒”时保证命中')
    await act(async () => dialog.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click())
    expect(changes).not.toHaveBeenCalled()
  })

  test('无可参战角色时禁用状态指令，无毒定义时默认使用护体', async () => {
    const scene = {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    }
    const assetCatalog: CanonicalScriptEditorContext['assetCatalog'] = {
      version: 1,
      assets: {},
    }
    const commonContext = {
      state: { scenes: [scene], items: [], sharedScripts: {} } as never,
      currentSceneId: 's001',
      shellScenes: [scene as unknown as SceneDef],
      locale: {},
      assetCatalog,
      audioResolver: {} as CanonicalScriptEditorContext['audioResolver'],
      assetReader: {} as CanonicalScriptEditorContext['assetReader'],
      battleSprites: [],
    }
    const nonBattlerContext: CanonicalScriptEditorContext = {
      ...commonContext,
      actors: { npc: { id: 'npc', name: 'name.npc', spriteId: 'sprite.npc' } },
      references: {
        choices: (kind) => (kind === 'actor' ? [{ id: 'npc', name: '路人' }] : []),
        has: (kind, id) => kind === 'actor' && id === 'npc',
        label: (_kind, id) => id,
      },
    }

    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor body={[]} context={nonBattlerContext} onChange={() => {}} />,
      ),
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('添加指令'))!
        .click(),
    )
    for (const kind of ['applyActorCondition', 'clearActorCondition']) {
      const choice = host.querySelector<HTMLButtonElement>(`[data-command-kinds="${kind}"]`)!
      expect(choice.disabled).toBe(true)
      expect(choice.textContent).toContain('请先创建可参战角色')
    }
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click())

    const hero = {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'sprite.hero',
      battler: {
        battleSprite: 'battle.hero',
        baseStats: {
          level: 1,
          hp: 100,
          maxHP: 100,
          mp: 30,
          maxMP: 30,
          attack: 10,
          defense: 10,
          magicAttack: 10,
          speed: 10,
          luck: 10,
        },
        initialEquipment: {},
        initialMagic: [],
      },
    }
    const changes = vi.fn()
    const noPoisonContext: CanonicalScriptEditorContext = {
      ...commonContext,
      actors: { hero },
      references: {
        choices: (kind) => (kind === 'actor' ? [{ id: 'hero', name: '主角' }] : []),
        has: (kind, id) => kind === 'actor' && id === 'hero',
        label: (_kind, id) => id,
      },
    }
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
          key="with-battler"
          body={[]}
          context={noPoisonContext}
          onChange={changes}
        />,
      ),
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('添加指令'))!
        .click(),
    )
    const apply = host.querySelector<HTMLButtonElement>(
      '[data-command-kinds="applyActorCondition"]',
    )!
    expect(apply.disabled).toBe(false)
    await act(async () => apply.click())
    expect(changes).toHaveBeenCalledWith([
      {
        kind: 'applyActorCondition',
        actor: 'hero',
        condition: { kind: 'status', status: 'protect', turns: 7 },
      },
    ])
  })

  test('edits entity state through Chinese semantic choices without rewriting an existing raw value', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
          body={[
            {
              kind: 'setEntityState',
              target: { scene: 's001', entity: 'e4' },
              state: 3,
            },
          ]}
          onChange={onChange}
        />,
      ),
    )

    const row = host.querySelector<HTMLElement>('.cmd-row')!
    expect(row.textContent).toContain('e4 → 显示，阻挡通行（原值 3）')
    await act(async () =>
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )

    expect(onChange).not.toHaveBeenCalled()
    expect(combobox('状态').textContent).toContain('当前原值 3（显示，阻挡通行）')
    const listbox = await openCombobox('状态')
    const optionTexts = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].map(
      (option) => option.textContent ?? '',
    )
    expect(optionTexts).toEqual([
      expect.stringContaining('当前原值 3（显示，阻挡通行）'),
      expect.stringContaining('隐藏'),
      expect.stringContaining('显示，可通行'),
      expect.stringContaining('显示，阻挡通行'),
    ])
    const passable = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find((option) =>
      option.textContent?.startsWith('显示，可通行'),
    )!
    await act(async () => passable.click())
    expect(onChange).not.toHaveBeenCalled()
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent === '完成')!
        .click(),
    )
    expect(onChange).toHaveBeenLastCalledWith([
      {
        kind: 'setEntityState',
        target: { scene: 's001', entity: 'e4' },
        state: 1,
      },
    ])
  })

  test('uses the same semantic state selector for batch entity commands', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
          body={[
            {
              kind: 'setMultiEntityState',
              targets: [
                { scene: 's001', entity: 'e1' },
                { scene: 's001', entity: 'e2' },
              ],
              state: 0,
            },
          ]}
          onChange={onChange}
        />,
      ),
    )

    const row = host.querySelector<HTMLElement>('.cmd-row')!
    expect(row.textContent).toContain('批量设置 2 个实体 → 隐藏')
    await act(async () =>
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    const listbox = await openCombobox('状态')
    const blocking = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find((option) =>
      option.textContent?.startsWith('显示，阻挡通行'),
    )!
    await act(async () => blocking.click())
    expect(onChange).not.toHaveBeenCalled()
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent === '完成')!
        .click(),
    )
    expect(onChange).toHaveBeenLastCalledWith([
      {
        kind: 'setMultiEntityState',
        targets: [
          { scene: 's001', entity: 'e1' },
          { scene: 's001', entity: 'e2' },
        ],
        state: 2,
      },
    ])
  })

  test('keeps trigger zones out of entity-facing insertion and edit targets', async () => {
    const scene = {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        { id: 'zone-1', zone: true, pos: { col: 1, row: 2, height: 0 } },
        { id: 'npc-1', sprite: 'npc', pos: { col: 3, row: 4, height: 0 } },
      ],
    }
    const context: CanonicalScriptEditorContext = {
      state: { scenes: [scene], items: [], sharedScripts: {} } as never,
      currentSceneId: 's001',
      currentEntityId: 'zone-1',
      shellScenes: [scene as unknown as SceneDef],
      locale: {},
      assetCatalog: { version: 1, assets: {} },
      audioResolver: {} as CanonicalScriptEditorContext['audioResolver'],
      assetReader: {} as CanonicalScriptEditorContext['assetReader'],
      references: { choices: () => [], has: () => false, label: (_kind, id) => id },
      battleSprites: [],
    }

    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
          body={[
            {
              kind: 'setEntityFacing',
              target: { scene: 's001', entity: 'zone-1' },
              facing: 'down',
            },
          ]}
          context={context}
          onChange={() => {}}
        />,
      ),
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('添加指令'))!
        .click(),
    )
    const facingChoice = host.querySelector<HTMLButtonElement>(
      '[data-command-kinds="setEntityFacing"]',
    )!
    expect(facingChoice.disabled).toBe(true)
    expect(facingChoice.textContent).toContain('触发区没有朝向')
    expect(
      host.querySelector<HTMLButtonElement>('[data-command-kinds="suspendEntity"]')?.disabled,
    ).toBe(false)

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click())
    const row = host.querySelector<HTMLElement>('.cmd-row')!
    await act(async () =>
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    const entityOptions = await openCombobox('实体')
    const zoneOption = [...entityOptions.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('zone-1'),
    )!
    expect(zoneOption.getAttribute('aria-disabled')).toBe('true')
    expect(zoneOption.textContent).toContain('不支持朝向')
    expect(entityOptions.textContent).toContain('npc-1')
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
          body={[
            {
              kind: 'dialog',
              cue: { identity: { kind: 'narration' }, rows: [{ text: '测试对话' }] },
            },
            { kind: 'cameraSnap' },
          ]}
          context={context}
          onChange={() => {}}
        />,
      ),
    )

    const rows = host.querySelectorAll<HTMLElement>('.cmd-row')
    await act(async () =>
      rows[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    expect(host.textContent).toContain('身份')
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
    expect(onChange).not.toHaveBeenCalled()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="打开战场 25"]')!.click(),
    )
    expect(onOpenBattleField).toHaveBeenCalledWith(25)
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent === '完成')!
        .click(),
    )
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ kind: 'startBattle', enemyTeamId: 'team-1', fieldId: 25 }),
    ])
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
            },
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
      const [flow, setFlow] = useState<AuthorScriptFlow>({
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
    const flow: AuthorScriptFlow = {
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
    const flow: AuthorScriptFlow = {
      kind: 'stages',
      initial: 'first',
      stages: [
        { id: 'first', body: [] },
        { id: 'later', body: [] },
      ],
    }
    await act(async () =>
      root.render(
        <CanonicalScriptFlowEditor ownerLabel="开发期迁移方案" flow={flow} onChange={() => true} />,
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
    const changes = vi.fn()
    function Harness() {
      const [flow, setFlow] = useState<AuthorScriptFlow>({
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
            changes(next)
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

    const stateName = host.querySelector<HTMLInputElement>('.canonical-state-label input')!
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      for (let index = 0; index < 100; index += 1) {
        valueSetter.call(stateName, `第一次交谈 ${index}`)
        stateName.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    expect(changes).not.toHaveBeenCalled()
    await act(async () => {
      stateName.focus()
      stateName.blur()
    })
    expect(changes).toHaveBeenCalledOnce()
    expect(changes.mock.calls[0]?.[0].machine.states.first.label).toBe('第一次交谈 99')

    await act(async () => tabs[0]!.click())
    expect(host.querySelector('[aria-label="画面出现前的准备"]')).not.toBeNull()
    expect(host.textContent).toContain('播放音乐')
    expect(host.querySelector('[aria-label="第一次交谈 · 正文"]')).toBeNull()
  })
})
