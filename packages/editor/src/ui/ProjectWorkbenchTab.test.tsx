// @vitest-environment jsdom
import {
  ASSET_ROLE_KINDS,
  ASSET_ROLES,
  type ItemData,
  type StartWorld,
  validateStartWorld,
} from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { claimEditorAudioPreview, stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { SetStartupEntriesCommand } from '../core/commands.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectProjectIssues, type ProjectIssue } from '../core/project-diagnostics.js'
import { verifyCanonicalObjectWorkspace } from './object-workspace-test-utils.js'
import {
  deriveStartWorldResourceCandidates,
  groupProjectIssues,
  IssueList,
  PROJECT_ASSET_ROLE_GROUPS,
  type ProjectWorkbenchPage,
  ProjectWorkbenchTab,
  StartWorldFields,
} from './ProjectWorkbenchTab.js'

function issues(count: number, kind: 'music' | 'sound' = 'music'): ProjectIssue[] {
  return Array.from({ length: count }, (_, index) => ({
    severity: 'warn',
    code: 'unused-asset',
    message: `未引用资源 ${index + 1}`,
    path: `assets[${index + 1}]`,
    asset: { id: `${kind}.${index + 1}`, actualKind: kind },
  }))
}

function button(host: HTMLElement, text: string): HTMLButtonElement {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

function checkbox(host: HTMLElement, text: string): HTMLInputElement {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  const input = label?.querySelector<HTMLInputElement>('input[type="checkbox"]')
  if (!input) throw new Error(`缺少复选项 ${text}`)
  return input
}

async function listHeaderMenuButton(host: HTMLElement, text: string): Promise<HTMLButtonElement> {
  const trigger = host.querySelector<HTMLButtonElement>(
    '.project-outliner .ds-list-header [aria-label="更多操作"]',
  )!
  if (trigger.getAttribute('aria-expanded') !== 'true') await act(async () => trigger.click())
  return [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

function liveAnnouncement(host: HTMLElement): HTMLElement {
  return host.querySelector<HTMLElement>('.ds-visually-hidden[role="status"]')!
}

function addPickerTrigger(host: HTMLElement, adoptionId: string): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(
    `[data-ds-add-picker-adoption="${adoptionId}"] button`,
  )
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function nextAnimationFrame(): Promise<void> {
  await act(
    async () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      }),
  )
}

async function chooseAddPickerOption(
  trigger: HTMLButtonElement,
  label: string,
): Promise<HTMLDialogElement> {
  trigger.focus()
  await act(async () => trigger.click())
  await nextAnimationFrame()
  const dialog = host.querySelector<HTMLDialogElement>('dialog[open]')
  expect(dialog).not.toBeNull()
  const option = [...dialog!.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
    candidate.textContent?.includes(label),
  )
  expect(option).toBeDefined()
  await act(async () => option!.click())
  return dialog!
}

function resourceItem(id: string, name: string, resources: string[]): ItemData {
  return {
    id,
    name,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'scene',
      consuming: false,
      effects: resources.map((resource) => ({
        kind: 'drawFromResourcePool' as const,
        resource,
        maxRoll: 1,
        rewards: [{ itemId: id, count: 1 }],
      })),
    },
  }
}

function ResourceHarness(props: { items?: ItemData[]; initialResources?: Record<string, number> }) {
  const { items = [], initialResources } = props
  const [value, setValue] = useState<StartWorld>({
    party: [],
    money: 0,
    inventory: [],
    ...(initialResources ? { resources: initialResources } : {}),
  })
  return (
    <StartWorldFields
      value={value}
      actors={[]}
      items={items}
      poisons={[]}
      locale={{}}
      onChange={setValue}
    />
  )
}

function projectState(): EditorState {
  const startWorld: StartWorld = {
    party: [],
    money: 0,
    inventory: [],
  }
  return {
    manifest: {
      id: 'project-test',
      name: '测试项目',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [{ id: 'main', label: '主要入口', scene: 's000', startWorld }],
    },
    scenes: [],
    actors: [],
    levelUp: {},
    skills: [],
    items: [],
    enemies: [],
    enemyTeams: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
    poisons: [],
  } as unknown as EditorState
}

function projectTab(
  page: ProjectWorkbenchPage,
  session: EditSession,
  focusObjectId?: string,
  assetReader = {} as EditorAssetReader,
) {
  const state = session.getState()
  return (
    <ProjectWorkbenchTab
      page={page}
      manifest={state.manifest as never}
      scenes={state.scenes}
      actors={state.actors}
      items={state.items}
      poisons={state.poisons ?? []}
      locale={state.locale}
      assetCatalog={state.assetCatalog}
      session={session}
      issues={collectProjectIssues(state)}
      diagnosticsStatus="current"
      assetReader={assetReader}
      focusObjectId={focusObjectId}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  stopEditorAudioPreview()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  stopEditorAudioPreview()
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe('项目问题列表', () => {
  test('按严重度、稳定 code 和资源类型聚合', () => {
    const grouped = groupProjectIssues([
      ...issues(2),
      ...issues(3, 'sound'),
      {
        severity: 'error',
        code: 'missing-entry-point-scene',
        message: '入口点场景缺失',
        path: 'entryPoints[0].scene',
        target: { module: 'project', page: 'entrypoint', objectId: 'main' },
      },
      {
        severity: 'warn',
        code: 'migration-pending',
        message: '迁移待处理',
        path: 'migration',
      },
    ])

    expect(
      grouped.map((group) => [
        group.severity,
        group.code,
        group.familyTitle,
        group.title,
        group.issues.length,
      ]),
    ).toEqual([
      ['error', 'missing-entry-point-scene', '入口点场景缺失', '入口点场景缺失', 1],
      ['warn', 'unused-asset', '未引用资源', '音乐', 2],
      ['warn', 'unused-asset', '未引用资源', '音效', 3],
      ['warn', 'migration-pending', '迁移待处理', '迁移待处理', 1],
    ])
  })

  test.each([0, 1, 30, 80, 81, 152, 303])('数量边界 %i 保持精确摘要与 80 项首屏', async (count) => {
    await act(async () => root.render(<IssueList issues={issues(count)} />))

    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(Math.min(count, 80))
    expect(host.querySelector('.ds-diagnostic-panel')?.getAttribute('data-state')).toBe(
      count ? 'ready' : 'clear',
    )
    expect(host.querySelector('.ds-diagnostic-panel__description')).toBeNull()
    expect(host.textContent).toContain(`0 个错误 · ${count} 个警告`)
    expect(host.querySelector('.ds-diagnostic-list__pagination') !== null).toBe(count > 80)
  })

  test('混合严重度保留机器定位但不常驻显示，并区分可跳转与静态行', async () => {
    const onOpenLocation = vi.fn()
    const longPath = `manifest.${'assets.roles.'.repeat(14)}startup`
    const mixed: ProjectIssue[] = [
      {
        severity: 'error',
        code: 'missing-entry-point-scene',
        message: '入口场景缺失',
        path: longPath,
        target: { module: 'project', page: 'startup' },
      },
      {
        severity: 'warn',
        code: 'unused-asset',
        message: '资源未被引用',
        path: 'assets["unused"]',
      },
    ]
    await act(async () => root.render(<IssueList issues={mixed} onOpenLocation={onOpenLocation} />))

    const rows = host.querySelectorAll<HTMLElement>('.ds-diagnostic-row')
    expect([...rows].map((row) => row.tagName)).toEqual(['BUTTON', 'ARTICLE'])
    expect(rows[0]?.textContent).toContain('错误')
    expect(rows[1]?.textContent).toContain('警告')
    expect(host.querySelector('.ds-diagnostic-list--adaptive-grid')).not.toBeNull()
    expect(host.querySelector('.ds-diagnostic-row__code')).toBeNull()
    expect(host.querySelector('.ds-diagnostic-row__path')).toBeNull()
    expect(host.textContent).not.toContain(longPath)
    await act(async () => rows[0]?.click())
    expect(onOpenLocation).toHaveBeenCalledOnce()
    expect(onOpenLocation).toHaveBeenCalledWith(
      expect.objectContaining({ module: 'project', subpage: 'startup' }),
    )
  })

  test('主面板可分批加载、显示全部和收起', async () => {
    await act(async () => root.render(<IssueList issues={issues(303)} />))

    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(80)
    expect(host.textContent).toContain('已显示 80 / 303 项')
    expect(host.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1)

    await act(async () => button(host, '继续显示 80 项').click())
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(160)

    await act(async () => button(host, '显示全部').click())
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(303)
    expect(host.textContent).toContain('已显示全部 303 项')

    await act(async () => button(host, '收起至前 80 项').click())
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(80)
  })

  test('恰好 80 项时不显示多余的分批控件', async () => {
    await act(async () => root.render(<IssueList issues={issues(80)} />))

    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(80)
    expect(host.querySelector('.ds-diagnostic-list__pagination')).toBeNull()
  })

  test('长说明保持单列，短句才启用自适应网格', async () => {
    const detailed: ProjectIssue = {
      severity: 'warn',
      code: 'migration-pending',
      message: `迁移证据：${'需要完整保留上下文。'.repeat(10)}`,
      path: 'migrationDiagnostics.diagnostics[0]',
    }
    await act(async () => root.render(<IssueList issues={[detailed]} />))

    expect(host.querySelector('.ds-diagnostic-list--adaptive-grid')).toBeNull()
    expect(host.querySelector('.ds-diagnostic-row')?.textContent).toContain(detailed.message)
  })
})

describe('入口开局世界资源', () => {
  test('无对象深链选中非首项的直接启动入口，显式对象仍精确定位', async () => {
    const state = projectState()
    state.manifest.entryPoints = [
      ...state.manifest.entryPoints,
      {
        id: 'direct',
        label: '直接入口',
        scene: 's000',
        startWorld: { party: [], money: 20, inventory: [] },
      },
    ]
    state.manifest.defaultEntryId = 'direct'
    const session = new EditSession(state)

    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(host.querySelector('.project-center h1')?.textContent).toBe('直接入口')
    const selectedRow = host.querySelector('.ds-catalog-row[aria-pressed="true"]')!
    expect(selectedRow.querySelector('.ds-catalog-row__title')?.textContent).toBe('直接入口')
    expect(selectedRow.querySelector('.ds-catalog-row__meta')?.textContent).toBe('direct')
    expect(selectedRow.querySelector('.ds-catalog-row__trailing .ds-tag')?.textContent).toBe(
      '直接启动',
    )
    expect(selectedRow.querySelector('.ds-catalog-row__leading')).toBeNull()
    const selectedItemSurface = selectedRow.parentElement
    expect(selectedItemSurface?.classList.contains('project-entry-item-content')).toBe(true)
    expect(selectedItemSurface?.querySelector('.project-entry-row-actions')).not.toBeNull()

    await act(async () => root.render(projectTab('entrypoint', session, 'main')))
    expect(host.querySelector('.project-center h1')?.textContent).toBe('主要入口')
  })

  test('新增入口深拷当前入口，直接启动项与最后一项删除受不变式保护', async () => {
    const state = projectState()
    state.manifest.entryPoints.push({
      id: 'alternate',
      label: '备用入口',
      scene: 's000',
      introVideo: 'video.alt',
      startWorld: {
        party: [],
        money: 88,
        inventory: [],
        resources: { alchemyEnergy: 7 },
      },
    })
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session, 'alternate')))

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="新增入口"]')!.click())
    const afterAdd = session.getState().manifest.entryPoints
    const created = afterAdd.at(-1)!
    expect(created).toMatchObject({
      label: '新入口',
      scene: 's000',
      introVideo: 'video.alt',
      startWorld: { money: 88, resources: { alchemyEnergy: 7 } },
    })
    expect(created.startWorld).not.toBe(afterAdd[1]!.startWorld)

    await act(async () => root.render(projectTab('entrypoint', session, created.id)))
    const setDefault = await listHeaderMenuButton(host, '设为直接启动入口')
    expect(setDefault.disabled).toBe(false)
    await act(async () => setDefault.click())
    expect(session.getState().manifest.defaultEntryId).toBe(created.id)

    await act(async () => root.render(projectTab('entrypoint', session, created.id)))
    expect((await listHeaderMenuButton(host, '删除当前入口')).disabled).toBe(true)

    const single = projectState()
    const singleSession = new EditSession(single)
    await act(async () => root.render(projectTab('entrypoint', singleSession)))
    expect((await listHeaderMenuButton(host, '删除当前入口')).disabled).toBe(true)
  })

  test('[reorder-family:project-entry-party] 入口 handle 重排一次只写一条命令，并保持直接启动 ID 不变', async () => {
    const state = projectState()
    state.manifest.entryPoints.push(
      {
        id: 'alternate',
        label: '备用入口',
        scene: 's000',
        startWorld: { party: [], money: 0, inventory: [] },
      },
      {
        id: 'challenge',
        label: '挑战入口',
        scene: 's000',
        startWorld: { party: [], money: 0, inventory: [] },
      },
    )
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session, 'alternate')))

    expect(
      host.querySelectorAll('.project-entry-row-actions.ds-action-group[data-density="compact"]'),
    ).toHaveLength(3)

    const handle = [...host.querySelectorAll<HTMLButtonElement>('[data-ds-reorder-handle]')].find(
      (candidate) => candidate.getAttribute('aria-label')?.includes('备用入口'),
    )!
    await act(async () => {
      for (let index = 0; index < 20; index += 1)
        handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => {
      handle.focus()
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().manifest.entryPoints.map((entry) => entry.id)).toEqual([
      'alternate',
      'main',
      'challenge',
    ])
    expect(session.getState().manifest.defaultEntryId).toBe('main')
    expect(
      host.querySelector('.ds-catalog-row[data-selected="true"] .ds-catalog-row__title')
        ?.textContent,
    ).toBe('备用入口')

    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints.map((entry) => entry.id)).toEqual([
      'main',
      'alternate',
      'challenge',
    ])
    expect(session.getState().manifest.defaultEntryId).toBe('main')
    expect(session.redo()).toBe(true)
    expect(session.getState().manifest.entryPoints.map((entry) => entry.id)).toEqual([
      'alternate',
      'main',
      'challenge',
    ])
    expect(session.getState().manifest.defaultEntryId).toBe('main')
    expect(
      host.querySelector('.ds-catalog-row[data-selected="true"] .ds-catalog-row__title')
        ?.textContent,
    ).toBe('备用入口')
  })

  test('[action-group:project-entry-points] 长名称与稳定 ID 保留完整 DOM、动作名称和 tooltip 关系', async () => {
    const state = projectState()
    const longChineseLabel = '这是一个必须完整保留的超长中文入口名称用于动作组验收'
    const longEnglishLabel = 'AlternateEntryWithFortyVisibleAsciiCharacters'
    const longId = `entry-${'x'.repeat(58)}`
    const startWorld = state.manifest.entryPoints[0]!.startWorld
    state.manifest.defaultEntryId = longId
    state.manifest.entryPoints = [
      {
        id: longId,
        label: longChineseLabel,
        scene: 's000',
        startWorld: structuredClone(startWorld),
      },
      {
        id: 'entry-english',
        label: longEnglishLabel,
        scene: 's000',
        startWorld: structuredClone(startWorld),
      },
      {
        id: 'entry-third',
        label: '第三入口',
        scene: 's000',
        startWorld: structuredClone(startWorld),
      },
    ]
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session, longId)))

    const rows = [...host.querySelectorAll<HTMLElement>('.project-entry-item-content')]
    expect(rows).toHaveLength(3)
    for (const [index, row] of rows.entries()) {
      const entry = state.manifest.entryPoints[index]!
      expect(row.querySelector('.ds-catalog-row__title')?.textContent).toBe(entry.label)
      expect(row.querySelector('.ds-catalog-row__meta')?.textContent).toBe(entry.id)
      const actions = row.querySelector<HTMLElement>(
        '.project-entry-row-actions.ds-action-group[data-density="compact"]',
      )!
      const buttons = [...actions.querySelectorAll<HTMLButtonElement>('.ds-icon-button')]
      expect(buttons).toHaveLength(2)
      for (const action of buttons) {
        const label = action.getAttribute('aria-label')
        const tooltipId = action.getAttribute('aria-describedby')
        expect(label).toContain(entry.label)
        expect(tooltipId).toBeTruthy()
        expect(document.getElementById(tooltipId!)?.textContent).toBe(label)
        expect(action.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
        expect(action.querySelector('svg')?.getAttribute('focusable')).toBe('false')
      }
    }
  })

  test('复制入口与删除非默认入口各写一条命令，并可单步撤销重做', async () => {
    const state = projectState()
    state.manifest.entryPoints.push({
      id: 'alternate',
      label: '备用入口',
      scene: 's000',
      startWorld: { party: [], money: 18, inventory: [] },
    })
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session, 'alternate')))

    const cloneButton = await listHeaderMenuButton(host, '复制当前入口')
    await act(async () => cloneButton.click())
    expect(session.getHistoryVersion()).toBe(1)
    const copy = session.getState().manifest.entryPoints.at(-1)!
    expect(copy).toMatchObject({ label: '备用入口 副本', scene: 's000' })
    expect(copy.startWorld).not.toBe(session.getState().manifest.entryPoints[1]!.startWorld)

    await act(async () => root.render(projectTab('entrypoint', session, copy.id)))
    const deleteButton = await listHeaderMenuButton(host, '删除当前入口')
    await act(async () => deleteButton.click())
    expect(session.getHistoryVersion()).toBe(2)
    expect(session.getState().manifest.entryPoints.some((entry) => entry.id === copy.id)).toBe(
      false,
    )
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints.some((entry) => entry.id === copy.id)).toBe(true)
    expect(session.redo()).toBe(true)
    expect(session.getState().manifest.entryPoints.some((entry) => entry.id === copy.id)).toBe(
      false,
    )
  })

  test('[add-picker:project/startup-party] 队伍确认添加、排序和移出各自保持单命令边界', async () => {
    const state = projectState()
    state.actors = [
      {
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
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
      {
        id: 'friend',
        name: 'name.friend',
        spriteId: 'sprite.friend',
        battler: {
          battleSprite: 'battle.friend',
          baseStats: {
            level: 1,
            hp: 80,
            maxHP: 80,
            mp: 50,
            maxMP: 50,
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    ]
    state.locale['name.hero'] = '主角'
    state.locale['name.friend'] = '伙伴'
    state.manifest.entryPoints[0]!.startWorld.party = ['hero']
    state.manifest.entryPoints[0]!.startWorld.seedStats = {
      hero: { hp: 90 },
      friend: { hp: 40, mp: 20 },
      orphan: { mp: 1 },
    }
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))

    expect(host.querySelector('.project-check-grid')).toBeNull()
    const adder = button(host, '添加队员')
    expect(
      adder.closest('[data-ds-add-picker-adoption]')?.getAttribute('data-ds-add-picker-adoption'),
    ).toBe('project/startup-party')
    const cancelledPartyDialog = await chooseAddPickerOption(adder, '伙伴')
    await act(async () => button(cancelledPartyDialog, '取消').click())
    await nextAnimationFrame()
    expect(session.getHistoryVersion()).toBe(0)
    expect(document.activeElement).toBe(adder)

    const partyDialog = await chooseAddPickerOption(adder, '伙伴')
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => button(partyDialog, '加入队伍').click())
    await nextAnimationFrame()
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero', 'friend'])
    expect(document.activeElement).toBe(adder)
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(button(host, '添加队员').disabled).toBe(true)
    expect(liveAnnouncement(host).textContent).toContain('伙伴加入初始队伍')
    expect(document.activeElement).not.toBe(
      host.querySelector<HTMLButtonElement>('[aria-label="移出伙伴"]'),
    )

    const beforeMove = session.getHistoryVersion()
    const moveFriend = [
      ...host.querySelectorAll<HTMLButtonElement>('[data-ds-reorder-handle]'),
    ].find((candidate) => candidate.getAttribute('aria-label')?.includes('伙伴'))!
    await act(async () => {
      moveFriend.focus()
      moveFriend.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      moveFriend.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      moveFriend.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(beforeMove + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['friend', 'hero'])
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      '调整伙伴顺序，第 1 项，共 2 项',
    )
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero', 'friend'])
    expect(session.redo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['friend', 'hero'])
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero', 'friend'])

    await act(async () => root.render(projectTab('entrypoint', session)))
    const beforeRemove = session.getHistoryVersion()
    const friendHp = host.querySelector<HTMLInputElement>(
      'input[aria-label^="friend 开局当前 HP"]',
    )!
    await act(async () => friendHp.focus())
    await input(friendHp, '7')
    expect(session.getHistoryVersion()).toBe(beforeRemove)
    const removeFriend = host.querySelector<HTMLButtonElement>('[aria-label="移出伙伴"]')!
    const pointerDown = new Event('pointerdown', { bubbles: true, cancelable: true })
    await act(async () => {
      if (removeFriend.dispatchEvent(pointerDown)) removeFriend.focus()
      removeFriend.click()
    })
    expect(pointerDown.defaultPrevented).toBe(true)
    expect(session.getHistoryVersion()).toBe(beforeRemove + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero'])
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toEqual({
      hero: { hp: 90 },
      orphan: { mp: 1 },
    })
    expect(() =>
      validateStartWorld(session.getState().manifest.entryPoints[0]!.startWorld),
    ).not.toThrow()
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(liveAnnouncement(host).textContent).toContain('伙伴移出初始队伍')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('移出主角')
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero', 'friend'])
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toEqual({
      hero: { hp: 90 },
      friend: { hp: 40, mp: 20 },
      orphan: { mp: 1 },
    })
    expect(() =>
      validateStartWorld(session.getState().manifest.entryPoints[0]!.startWorld),
    ).not.toThrow()
    expect(session.redo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero'])
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toEqual({
      hero: { hp: 90 },
      orphan: { mp: 1 },
    })
    expect(() =>
      validateStartWorld(session.getState().manifest.entryPoints[0]!.startWorld),
    ).not.toThrow()

    await act(async () => root.render(projectTab('entrypoint', session)))
    const readdDialog = await chooseAddPickerOption(button(host, '添加队员'), '伙伴')
    await act(async () => button(readdDialog, '加入队伍').click())
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero', 'friend'])
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toEqual({
      hero: { hp: 90 },
      orphan: { mp: 1 },
    })
    expect(() =>
      validateStartWorld(session.getState().manifest.entryPoints[0]!.startWorld),
    ).not.toThrow()
    await act(async () => root.render(projectTab('entrypoint', session)))
    const readdedFriendHp = host.querySelector<HTMLInputElement>(
      'input[aria-label^="friend 开局当前 HP"]',
    )!
    expect(readdedFriendHp.value).toBe('')
    expect(readdedFriendHp.placeholder).toBe('继承 80')
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero'])
    expect(session.redo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero', 'friend'])
  })

  test('[add-picker:project/startup-inventory] 库存确认添加 count=1，数量 Enter + blur 只产生一条命令', async () => {
    const state = projectState()
    state.items = [
      {
        id: 'herb',
        name: '止血草',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      },
      {
        id: 'pill',
        name: '还神丹',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      },
    ]
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))

    expect(host.querySelector('[aria-label="初始道具数量：0 项"]')?.textContent).toBe('0 项')
    expect(host.textContent).not.toContain('无初始道具。')
    const adder = button(host, '添加道具')
    const inventorySection = adder.closest<HTMLElement>('.project-card')!
    expect(inventorySection.querySelector('.ds-empty-state--embedded')?.textContent).toContain(
      '暂无初始道具',
    )
    expect(
      adder.closest('[data-ds-add-picker-adoption]')?.getAttribute('data-ds-add-picker-adoption'),
    ).toBe('project/startup-inventory')
    const cancelledInventoryDialog = await chooseAddPickerOption(adder, '还神丹')
    await act(async () => button(cancelledInventoryDialog, '取消').click())
    await nextAnimationFrame()
    expect(session.getHistoryVersion()).toBe(0)
    expect(document.activeElement).toBe(adder)

    const inventoryDialog = await chooseAddPickerOption(adder, '还神丹')
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => button(inventoryDialog, '添加道具').click())
    await nextAnimationFrame()
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory).toEqual([
      { itemId: 'pill', count: 1 },
    ])
    expect(document.activeElement).toBe(adder)
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory).toEqual([])
    expect(session.redo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory).toEqual([
      { itemId: 'pill', count: 1 },
    ])

    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(host.querySelector('[aria-label="初始道具数量：1 项"]')?.textContent).toBe('1 项')
    const filteredDialog = await chooseAddPickerOption(button(host, '添加道具'), '止血草')
    expect(filteredDialog.textContent).not.toContain('还神丹')
    await act(async () => button(filteredDialog, '取消').click())
    const count = host.querySelector<HTMLInputElement>('[aria-label="还神丹的初始数量"]')!
    const inventoryRow = count.closest('.project-inventory-row')!
    const countField = count.closest('.project-inventory-count')!
    const countLabel = countField.querySelector<HTMLLabelElement>('.ds-field__label')!
    expect(countLabel.textContent).toBe('数量')
    expect(countLabel.htmlFor).toBe(count.id)
    const inventoryActions = inventoryRow.querySelector('.project-inventory-actions')!
    expect(inventoryActions.parentElement).toBe(inventoryRow)
    expect(inventoryActions.querySelectorAll('button')).toHaveLength(3)
    expect(inventoryRow.children).toHaveLength(4)
    const addHeader = button(host, '添加道具').closest('.project-title-row')!
    expect(
      addHeader.compareDocumentPosition(inventoryRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    const beforeCount = session.getHistoryVersion()
    await act(async () => count.focus())
    await input(count, '6')
    await act(async () =>
      count.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    expect(session.getHistoryVersion()).toBe(beforeCount + 1)
    await act(async () => count.blur())
    expect(session.getHistoryVersion()).toBe(beforeCount + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory).toEqual([
      { itemId: 'pill', count: 6 },
    ])

    await act(async () => root.render(projectTab('entrypoint', session)))
    const beforeDelete = session.getHistoryVersion()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="删除初始道具还神丹"]')!.click(),
    )
    expect(session.getHistoryVersion()).toBe(beforeDelete + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory).toEqual([])
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(host.querySelector('[aria-label="初始道具数量：0 项"]')?.textContent).toBe('0 项')
    expect(host.textContent).not.toContain('无初始道具。')
    expect(
      button(host, '添加道具')
        .closest<HTMLElement>('.project-card')
        ?.querySelector('.ds-empty-state--embedded')?.textContent,
    ).toContain('暂无初始道具')
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory).toEqual([
      { itemId: 'pill', count: 6 },
    ])
  })

  test('队员与道具候选使用真实缩略图、固定 ID 和直观关键数据', async () => {
    const state = projectState()
    state.actors = [
      {
        id: 'hero',
        name: 'name.hero',
        spriteId: 'sprite.hero',
        face: 'face.hero',
        battler: {
          battleSprite: 'battle.hero',
          baseStats: {
            level: 3,
            hp: 120,
            maxHP: 150,
            mp: 40,
            maxMP: 80,
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    ]
    state.locale['name.hero'] = '主角'
    state.items = [
      {
        id: '61',
        name: '观音符',
        desc: ['以观音圣水书写的灵符。', 'HP+150'],
        icon: 'item-icon.test.61',
        buyPrice: 150,
        sellPrice: 75,
        sellable: true,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'healHp', amount: 150 }],
        },
      },
    ]
    state.assetCatalog.assets['face.hero'] = {
      kind: 'face',
      path: 'assets/faces/hero.png',
      mediaType: 'image/png',
      bytes: 1,
      sha256: 'face-revision',
      origin: { kind: 'authored' },
    }
    state.assetCatalog.assets['item-icon.test.61'] = {
      kind: 'item-icon',
      path: 'assets/items/61.png',
      mediaType: 'image/png',
      bytes: 1,
      sha256: 'item-revision',
      origin: { kind: 'authored' },
    }
    const readBytes = vi.fn(() => new Promise<ArrayBuffer>(() => undefined))
    const assetReader = {
      readBytes,
      record: (id: string) => state.assetCatalog.assets[id]!,
    } as unknown as EditorAssetReader
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session, undefined, assetReader)))

    const partyDialog = await chooseAddPickerOption(button(host, '添加队员'), '主角')
    const partyOption = partyDialog.querySelector<HTMLElement>('[role="option"]')!
    expect(
      partyOption.querySelector('.image-asset-thumb.ds-add-picker-option__thumbnail'),
    ).not.toBeNull()
    expect(
      partyOption.querySelector('.ds-add-picker-option__identity .ds-control--monospace')
        ?.textContent,
    ).toBe('hero')
    expect(partyOption.querySelector('.ds-add-picker-option__detail')?.textContent).toBe(
      'HP 120/150 · MP 40/80',
    )
    expect(partyOption.querySelector('.ds-add-picker-option__trailing')?.textContent).toBe('等级 3')
    await act(async () => button(partyDialog, '取消').click())
    await nextAnimationFrame()

    const itemDialog = await chooseAddPickerOption(button(host, '添加道具'), '观音符')
    const itemOption = itemDialog.querySelector<HTMLElement>('[role="option"]')!
    expect(
      itemOption.querySelector('.image-asset-thumb.ds-add-picker-option__thumbnail'),
    ).not.toBeNull()
    expect(
      itemOption.querySelector('.ds-add-picker-option__identity .ds-control--monospace')
        ?.textContent,
    ).toBe('61')
    expect(itemOption.querySelector('.ds-add-picker-option__detail')?.textContent).toBe('HP+150')
    expect(itemOption.querySelector('.ds-add-picker-option__trailing')?.textContent).toBe('使用')
    expect(readBytes).toHaveBeenCalledWith('face.hero', 'face')
    expect(readBytes).toHaveBeenCalledWith('item-icon.test.61', 'item-icon')
  })

  test('[reorder-family:startup-inventory] 初始库存 handle 重排只提交一次并可单步 undo/redo', async () => {
    const state = projectState()
    state.items = [
      { id: 'herb', name: '止血草', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
      { id: 'pill', name: '还神丹', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
    ]
    state.manifest.entryPoints[0]!.startWorld.inventory = [
      { itemId: 'herb', count: 2 },
      { itemId: 'pill', count: 3 },
    ]
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))
    const handle = [...host.querySelectorAll<HTMLButtonElement>('[data-ds-reorder-handle]')].find(
      (candidate) => candidate.getAttribute('aria-label')?.includes('还神丹'),
    )!
    await act(async () => {
      for (let index = 0; index < 20; index += 1)
        handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory).toEqual([
      { itemId: 'pill', count: 3 },
      { itemId: 'herb', count: 2 },
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory?.[0]?.itemId).toBe(
      'herb',
    )
    expect(session.redo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory?.[0]?.itemId).toBe(
      'pill',
    )
  })

  test('初始队伍合并当前状态，不暴露独立 schema 面板', async () => {
    const session = new EditSession(projectState())
    await act(async () => root.render(projectTab('entrypoint', session)))

    expect(host.textContent).toContain('初始队伍')
    expect(host.textContent).toContain('留空即继承角色定义的当前值')
    expect(host.textContent).toContain('当前状态')
    expect(host.textContent).not.toContain('seedStats')
    expect(host.textContent).not.toContain('seedConditions')
  })

  test('开局状态在聚合弹窗内编辑，取消零命令、保存单命令并可 undo/redo', async () => {
    const state = projectState()
    state.actors = [
      {
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
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    ]
    state.locale['name.hero'] = '主角'
    state.poisons = [{ id: 7, name: '赤毒', curability: 'common', color: 0 }]
    state.manifest.entryPoints[0]!.startWorld.party = ['hero']
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))

    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="编辑主角开局当前状态"]')!
    trigger.focus()
    await act(async () => trigger.click())
    await nextAnimationFrame()
    let dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    expect(dialog.textContent).toContain('赤毒（7）')
    expect(dialog.textContent).toContain('护体 · 受到的物理与法术伤害减半。')
    expect(dialog.textContent).not.toContain('傀儡')

    await act(async () => checkbox(dialog, '赤毒').click())
    await act(async () => checkbox(dialog, '护体').click())
    expect(session.getHistoryVersion()).toBe(0)
    const turns = dialog.querySelector<HTMLInputElement>(
      '.actor-condition-status-row input[type="number"]',
    )!
    await input(turns, '9')
    await act(async () =>
      turns.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    await act(async () => turns.blur())
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => button(dialog, '取消').click())
    await nextAnimationFrame()
    expect(session.getHistoryVersion()).toBe(0)
    expect(document.activeElement).toBe(trigger)

    await act(async () => trigger.click())
    await nextAnimationFrame()
    dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    await act(async () => checkbox(dialog, '赤毒').click())
    await act(async () => checkbox(dialog, '护体').click())
    const savedTurns = dialog.querySelector<HTMLInputElement>(
      '.actor-condition-status-row input[type="number"]',
    )!
    await input(savedTurns, '9')
    await act(async () =>
      savedTurns.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    await act(async () => savedTurns.blur())
    await act(async () => button(dialog, '保存当前状态').click())
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedConditions).toEqual({
      hero: {
        poisonIds: [7],
        statuses: [{ status: 'protect', turns: 9 }],
      },
    })

    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedConditions).toBeUndefined()
    expect(session.redo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedConditions).toEqual({
      hero: {
        poisonIds: [7],
        statuses: [{ status: 'protect', turns: 9 }],
      },
    })

    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(host.textContent).toContain('赤毒')
    expect(host.textContent).toContain('护体 9 回合')
    const beforeNoop = session.getHistoryVersion()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="编辑主角开局当前状态"]')!.click(),
    )
    await nextAnimationFrame()
    await act(async () => button(host, '保存当前状态').click())
    expect(session.getHistoryVersion()).toBe(beforeNoop)
  })

  test('未知当前状态必须显式清理，保存以一条命令修复原始值', async () => {
    const state = projectState()
    state.actors = [
      {
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
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    ]
    state.locale['name.hero'] = '主角'
    state.manifest.entryPoints[0]!.startWorld.party = ['hero']
    state.manifest.entryPoints[0]!.startWorld.seedConditions = {
      hero: { statuses: [{ status: 'legacy-status', turns: 3 }] } as never,
    }
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))

    expect(host.textContent).toContain('未知状态 legacy-status')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="编辑主角开局当前状态"]')!.click(),
    )
    await nextAnimationFrame()
    const dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    const save = button(dialog, '保存当前状态')
    expect(save.disabled).toBe(true)
    expect(dialog.textContent).toContain('保存前请移除')
    await act(async () => button(dialog, '移除').click())
    expect(save.disabled).toBe(false)

    await act(async () => save.click())
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedConditions).toBeUndefined()
    expect(session.undo()).toBe(true)
    expect(
      session.getState().manifest.entryPoints[0]!.startWorld.seedConditions?.hero?.statuses,
    ).toEqual([{ status: 'legacy-status', turns: 3 }])
  })

  test('当前 HP 为 0 时不能新增好状态，并可显式清理已有非法好状态', async () => {
    const state = projectState()
    state.actors = [
      {
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
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    ]
    state.locale['name.hero'] = '主角'
    state.manifest.entryPoints[0]!.startWorld.party = ['hero']
    state.manifest.entryPoints[0]!.startWorld.seedStats = { hero: { hp: 0 } }
    state.manifest.entryPoints[0]!.startWorld.seedConditions = {
      hero: { statuses: [{ status: 'protect', turns: 7 }] },
    }
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="编辑主角开局当前状态"]')!.click(),
    )
    await nextAnimationFrame()

    const dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    const protect = checkbox(dialog, '护体')
    const bravery = checkbox(dialog, '神勇')
    const confused = checkbox(dialog, '混乱')
    const save = button(dialog, '保存当前状态')
    expect(dialog.textContent).toContain('当前 HP 为 0 时不能携带好状态')
    expect(protect.checked).toBe(true)
    expect(protect.disabled).toBe(false)
    expect(bravery.disabled).toBe(true)
    expect(confused.disabled).toBe(false)
    expect(save.disabled).toBe(true)

    await act(async () => protect.click())
    expect(save.disabled).toBe(false)
    await act(async () => save.click())
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedConditions).toBeUndefined()
  })

  test('移出队员在一条命令内同时清理 HP/MP 与当前状态', async () => {
    const state = projectState()
    const makeActor = (id: string, name: string) => ({
      id,
      name,
      spriteId: `sprite.${id}`,
      battler: {
        battleSprite: `battle.${id}`,
        baseStats: {
          level: 1,
          hp: 100,
          maxHP: 100,
          mp: 30,
          maxMP: 30,
          attack: 1,
          defense: 1,
          magicAttack: 1,
          speed: 1,
          luck: 1,
        },
        initialEquipment: {},
        initialMagic: [],
      },
    })
    state.actors = [makeActor('hero', 'name.hero'), makeActor('friend', 'name.friend')]
    state.locale = { 'name.hero': '主角', 'name.friend': '伙伴' }
    state.manifest.entryPoints[0]!.startWorld.party = ['hero', 'friend']
    state.manifest.entryPoints[0]!.startWorld.seedStats = { friend: { hp: 12 } }
    state.manifest.entryPoints[0]!.startWorld.seedConditions = {
      friend: { statuses: [{ status: 'protect', turns: 3 }] },
    }
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))

    const before = session.getHistoryVersion()
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="移出伙伴"]')!.click())
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld).toMatchObject({
      party: ['hero'],
    })
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toBeUndefined()
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedConditions).toBeUndefined()
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toEqual({
      friend: { hp: 12 },
    })
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedConditions).toEqual({
      friend: { statuses: [{ status: 'protect', turns: 3 }] },
    })
  })

  test('当前 HP/MP 保持继承、零值和单字段稀疏覆盖并按命令同步', async () => {
    const state = projectState()
    state.actors = [
      {
        id: 'hero',
        name: 'name.hero',
        spriteId: 'sprite.hero',
        battler: {
          battleSprite: 'battle.hero',
          baseStats: {
            level: 1,
            hp: 100,
            maxHP: 150,
            mp: 30,
            maxMP: 80,
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    ]
    state.locale['name.hero'] = '主角'
    state.manifest.entryPoints[0]!.startWorld.party = ['hero']
    state.manifest.entryPoints[0]!.startWorld.seedStats = { hero: { hp: 80 } }
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))

    let hp = host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 HP"]')!
    const mp = host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 MP"]')!
    expect(hp.closest('.project-party-row')).toBe(mp.closest('.project-party-row'))
    expect(hp.placeholder).toBe('继承 100')
    expect(mp.placeholder).toBe('继承 30')
    expect(hp.value).toBe('80')
    expect(mp.value).toBe('')
    expect(host.textContent).not.toContain('初始技能')

    const beforeMpCommit = session.getHistoryVersion()
    await act(async () => mp.focus())
    await input(mp, '0')
    await act(async () =>
      mp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    await act(async () => mp.blur())
    expect(session.getHistoryVersion()).toBe(beforeMpCommit + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toEqual({
      hero: { hp: 80, mp: 0 },
    })
    await act(async () => root.render(projectTab('entrypoint', session)))
    hp = host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 HP"]')!

    const beforeHpCommit = session.getHistoryVersion()
    await act(async () => hp.focus())
    await input(hp, '')
    await act(async () =>
      hp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    await act(async () => hp.blur())
    expect(session.getHistoryVersion()).toBe(beforeHpCommit + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toEqual({
      hero: { mp: 0 },
    })

    expect(session.undo()).toBe(true)
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 HP"]')?.value,
    ).toBe('80')
    expect(session.redo()).toBe(true)
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 HP"]')?.value,
    ).toBe('')

    const currentMp = host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 MP"]')!
    const beforeClearMp = session.getHistoryVersion()
    await act(async () => currentMp.focus())
    await input(currentMp, '')
    await act(async () => currentMp.blur())
    expect(session.getHistoryVersion()).toBe(beforeClearMp + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toBeUndefined()
  })

  test('入口工作台只在标题区采用三个 Add Picker，重复行 density 保持不变', async () => {
    const state = projectState()
    state.actors = [
      {
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
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    ]
    state.locale['name.hero'] = '主角'
    state.items = [
      resourceItem('item.a', '道具 A', ['alchemyEnergy']),
      resourceItem('item.b', '道具 B', ['starDust']),
    ]
    state.manifest.entryPoints[0]!.startWorld.party = ['hero']
    state.manifest.entryPoints[0]!.startWorld.inventory = [{ itemId: 'item.a', count: 2 }]
    state.manifest.entryPoints[0]!.startWorld.resources = { alchemyEnergy: 4 }
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))

    const composers = [...host.querySelectorAll<HTMLElement>('.ds-inline-composer')]
    expect(composers).toHaveLength(0)
    const pickers = [...host.querySelectorAll<HTMLElement>('[data-ds-add-picker-adoption]')]
    expect(pickers.map((picker) => picker.dataset.dsAddPickerAdoption).sort()).toEqual([
      'project/startup-inventory',
      'project/startup-party',
      'project/startup-resource',
    ])
    expect(pickers.every((picker) => picker.closest('.project-title-row'))).toBe(true)

    const rows = [...host.querySelectorAll<HTMLElement>('.ds-repeat-row')]
    expect(rows.length).toBeGreaterThanOrEqual(3)
    for (const row of rows) {
      expect(
        row.querySelector('.ds-input--compact, .ds-select--compact, .ds-button--compact'),
      ).toBe(null)
    }
  })

  test('已有未入队状态覆盖按三种角色状态显式呈现并可单项撤销清理', async () => {
    const state = projectState()
    state.actors = [
      {
        id: 'bench',
        name: 'name.bench',
        spriteId: 'sprite.bench',
        battler: {
          battleSprite: 'battle.bench',
          baseStats: {
            level: 1,
            hp: 70,
            maxHP: 70,
            mp: 25,
            maxMP: 25,
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
      { id: 'npc', name: 'name.npc', spriteId: 'sprite.npc' },
    ]
    state.locale['name.bench'] = '候补角色'
    state.locale['name.npc'] = '剧情角色'
    state.manifest.entryPoints[0]!.startWorld.seedStats = {
      bench: { hp: 12 },
      npc: { mp: 3 },
      missing: { hp: 1, mp: 0 },
    }
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))

    const repair = host.querySelector('.project-orphan-seed-list')!
    expect(repair.textContent).toContain('未入队')
    expect(repair.textContent).toContain('不可参战')
    expect(repair.textContent).toContain('角色缺失')
    expect(repair.querySelectorAll('.project-orphan-seed-row')).toHaveLength(3)

    for (const [label, actorId] of [
      ['清理未入队状态覆盖 bench', 'bench'],
      ['清理未入队状态覆盖 npc', 'npc'],
      ['清理未入队状态覆盖 missing', 'missing'],
    ] as const) {
      const before = session.getHistoryVersion()
      await act(async () =>
        host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click(),
      )
      expect(session.getHistoryVersion()).toBe(before + 1)
      expect(
        session.getState().manifest.entryPoints[0]!.startWorld.seedStats?.[actorId],
      ).toBeUndefined()
      expect(() =>
        validateStartWorld(session.getState().manifest.entryPoints[0]!.startWorld),
      ).not.toThrow()
      expect(session.undo()).toBe(true)
      expect(
        session.getState().manifest.entryPoints[0]!.startWorld.seedStats?.[actorId],
      ).toBeDefined()
      await act(async () => root.render(projectTab('entrypoint', session)))
    }
  })

  test('世界资源候选按稳定物品 id 聚合、去重并排除 collectValue', () => {
    const candidates = deriveStartWorldResourceCandidates([
      resourceItem('z-item', '炼丹炉·水纹', ['spiritWater', 'spiritWater']),
      resourceItem('a-item', '灵泉水', ['spiritWater', 'collectValue']),
      resourceItem('b-item', '星尘瓶', ['starDust']),
    ])

    expect(candidates).toEqual([
      {
        key: 'spiritWater',
        label: '灵泉水、炼丹炉·水纹',
        consumerItemIds: ['a-item', 'z-item'],
      },
      { key: 'starDust', label: '星尘瓶', consumerItemIds: ['b-item'] },
    ])
  })

  test('资源面板落实 2×2 状态矩阵、可读候选、repair 与真实零候选空态', async () => {
    const items = [
      resourceItem('a-item', '灵泉水', ['spiritWater', 'collectValue']),
      resourceItem('z-item', '炼丹炉·水纹超级长名称用于验证完整提示', ['spiritWater']),
      resourceItem('star-item', '星尘瓶', ['starDust']),
    ]
    await act(async () =>
      root.render(
        <ResourceHarness
          key="resource-matrix"
          items={items}
          initialResources={{ starDust: 2, legacyEnergy: 7 }}
        />,
      ),
    )

    expect(host.querySelector('input[aria-label="新世界资源稳定键"]')).toBeNull()
    expect(host.textContent).toContain('星尘瓶')
    expect(host.textContent).toContain('未被使用的资源')
    expect(host.textContent).toContain('legacyEnergy')
    expect(host.textContent).not.toContain('collectValue')
    const trigger = button(host, '添加资源')
    expect(trigger).not.toBeNull()
    const dialog = await chooseAddPickerOption(
      trigger,
      '灵泉水、炼丹炉·水纹超级长名称用于验证完整提示',
    )
    const search = dialog.querySelector<HTMLInputElement>('input[type="search"]')!
    expect(search.getAttribute('role')).toBe('combobox')
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy()
    await input(search, '灵泉水')
    expect(dialog.querySelectorAll('[role="option"]')).toHaveLength(1)
    await act(async () =>
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    expect(dialog.querySelector('[role="listbox"]')).toBeNull()
    await input(search, '')
    await act(async () =>
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    )
    const resourceOption = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) =>
        candidate.textContent?.includes('灵泉水、炼丹炉·水纹超级长名称用于验证完整提示'),
    )!
    expect(resourceOption.querySelector('.ds-add-picker-option__leading')).toBeNull()
    expect(
      resourceOption.querySelector('.ds-add-picker-option__identity .ds-control--monospace')
        ?.textContent,
    ).toBe('spiritWater')
    expect(resourceOption.querySelector('.ds-add-picker-option__detail')?.textContent).toBe(
      '用于物品的资源抽取',
    )
    expect(resourceOption.querySelector('.ds-add-picker-option__trailing')?.textContent).toBe(
      '2 个使用方',
    )
    await act(async () => resourceOption.click())
    await act(async () => button(dialog, '添加资源').click())
    const addedInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="灵泉水、炼丹炉·水纹超级长名称用于验证完整提示（资源 spiritWater）初始值"]',
    )!
    expect(addedInput).not.toBeNull()
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '[aria-label="删除灵泉水、炼丹炉·水纹超级长名称用于验证完整提示使用的初始世界资源"]',
        )!
        .click(),
    )
    expect(document.activeElement).toBe(addPickerTrigger(host, 'project/startup-resource'))
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('[aria-label="清理未被使用的世界资源 legacyEnergy"]')!
        .click(),
    )
    expect(document.activeElement).toBe(addPickerTrigger(host, 'project/startup-resource'))
    expect(liveAnnouncement(host).textContent).toContain('已清理未被使用的世界资源 legacyEnergy')

    await act(async () =>
      root.render(
        <ResourceHarness
          key="resource-zero-candidate"
          items={[resourceItem('reserved', '葫芦', ['collectValue'])]}
          initialResources={{ legacyEnergy: 7 }}
        />,
      ),
    )
    expect(host.textContent).toContain('本项目没有需要为入口设置初值的自定义资源')
    expect(host.textContent).toContain('未被使用的资源')
    expect(addPickerTrigger(host, 'project/startup-resource')).toBeNull()
  })

  test('资源候选直接消费 live items，物品效果变化后同步出现', async () => {
    await act(async () => root.render(<ResourceHarness items={[]} />))
    expect(addPickerTrigger(host, 'project/startup-resource')).toBeNull()

    await act(async () =>
      root.render(
        <ResourceHarness items={[resourceItem('live-item', '即时炼化物品', ['livePool'])]} />,
      ),
    )
    const trigger = button(host, '添加资源')
    expect(trigger).not.toBeNull()
    const dialog = await chooseAddPickerOption(trigger, '即时炼化物品')
    expect(dialog.querySelector('[role="option"]')?.textContent).toContain('即时炼化物品')
  })

  test('[add-picker:project/startup-resource] 世界资源确认新增为 0，提交、删除各自只写一条命令', async () => {
    const state = projectState()
    state.items = [resourceItem('alchemy-item', '炼化壶', ['alchemyEnergy'])]
    state.manifest.entryPoints[0]!.startWorld.resources = { legacyEnergy: 4 }
    state.manifest.entryPoints.push({
      id: 'other',
      label: '其他入口',
      scene: 's000',
      startWorld: { party: [], money: 0, inventory: [], resources: { alchemyEnergy: 3 } },
    })
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('entrypoint', session)))

    const beforeRepair = session.getHistoryVersion()
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('[aria-label="清理未被使用的世界资源 legacyEnergy"]')!
        .click(),
    )
    expect(session.getHistoryVersion()).toBe(beforeRepair + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.resources).toBeUndefined()
    expect(liveAnnouncement(host).textContent).toContain('已清理未被使用的世界资源 legacyEnergy')
    expect(session.undo()).toBe(true)
    await act(async () => root.render(projectTab('entrypoint', session)))

    const resourceTrigger = button(host, '添加资源')
    const cancelledResourceDialog = await chooseAddPickerOption(resourceTrigger, '炼化壶')
    await act(async () => button(cancelledResourceDialog, '取消').click())
    await nextAnimationFrame()
    expect(document.activeElement).toBe(resourceTrigger)

    const resourceDialog = await chooseAddPickerOption(resourceTrigger, '炼化壶')
    const beforeAdd = session.getHistoryVersion()
    await act(async () => button(resourceDialog, '添加资源').click())
    await nextAnimationFrame()
    expect(session.getHistoryVersion()).toBe(beforeAdd + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.resources).toEqual({
      legacyEnergy: 4,
      alchemyEnergy: 0,
    })
    expect(document.activeElement).toBe(resourceTrigger)
    expect(session.getState().manifest.entryPoints[1]!.startWorld.resources).toEqual({
      alchemyEnergy: 3,
    })
    expect(session.undo()).toBe(true)
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(session.getState().manifest.entryPoints[0]!.startWorld.resources).toEqual({
      legacyEnergy: 4,
    })
    expect(button(host, '添加资源').textContent).toContain('添加资源')
    expect(session.redo()).toBe(true)
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(host.textContent).toContain('当前入口已配置所有正在使用的自定义资源')

    const valueInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="炼化壶（资源 alchemyEnergy）初始值"]',
    )!
    const beforeValue = session.getHistoryVersion()
    await input(valueInput, '9')
    await act(async () =>
      valueInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    await act(async () => valueInput.blur())
    expect(session.getHistoryVersion()).toBe(beforeValue + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.resources).toEqual({
      legacyEnergy: 4,
      alchemyEnergy: 9,
    })

    const beforeDelete = session.getHistoryVersion()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="删除炼化壶使用的初始世界资源"]')!.click(),
    )
    expect(session.getHistoryVersion()).toBe(beforeDelete + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.resources).toEqual({
      legacyEnergy: 4,
    })
    expect(liveAnnouncement(host).textContent).toContain('已删除炼化壶使用的初始世界资源')
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.resources).toEqual({
      legacyEnergy: 4,
      alchemyEnergy: 9,
    })
  })
})

describe('项目设置工作区', () => {
  test('问题页左栏按类型聚合，右栏只分页展示当前分组', async () => {
    const state = projectState()
    for (let index = 0; index < 208; index += 1) {
      const kind = index < 120 ? 'music' : 'sound'
      const id = `${kind}.unused.${index}`
      state.assetCatalog.assets[id] = {
        kind,
        path:
          kind === 'music'
            ? `assets/authored/music/${index}.mid`
            : `assets/authored/sounds/${index}.wav`,
        mediaType: kind === 'music' ? 'audio/midi' : 'audio/wav',
        bytes: 1,
        sha256: index.toString(16).padStart(64, '0'),
        origin: { kind: 'authored' },
      }
    }
    const session = new EditSession(state)
    const onObjectFocus = vi.fn()

    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="advanced"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
          poisons={state.poisons ?? []}
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={collectProjectIssues(state)}
          diagnosticsStatus="current"
          assetReader={{} as never}
          onObjectFocus={onObjectFocus}
        />,
      ),
    )

    const resourceFamily = [
      ...host.querySelectorAll<HTMLElement>('.ds-catalog-group-header--secondary'),
    ].find((row) => row.textContent?.includes('未引用资源'))
    const musicRow = [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find((row) =>
      row.textContent?.includes('音乐'),
    )
    const soundRow = [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find((row) =>
      row.textContent?.includes('音效'),
    )
    expect(resourceFamily?.textContent).toContain('208')
    expect(musicRow?.textContent).toContain('120')
    expect(soundRow?.textContent).toContain('88')
    expect(host.querySelector('.project-center h1')?.textContent).toBe('入口点场景缺失')

    await act(async () => musicRow?.click())

    expect(onObjectFocus).toHaveBeenCalledWith('diagnostic:warn:unused-asset:music')
    expect(host.querySelector('.project-center h1')?.textContent).toBe('未引用资源 · 音乐')
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(80)
    expect(host.querySelector('.ds-object-hero__meta')?.textContent).toContain('120 项')
    expect(host.querySelector('.ds-object-hero__id')).toBeNull()
    expect(host.querySelector('#project-issue-detail .ds-status')).toBeNull()
    expect(host.textContent).not.toContain('0 个错误 · 120 个警告')
    expect(host.textContent).not.toContain('unused-asset')
    expect(host.textContent).not.toContain('分组详情')
    expect(host.querySelector('.ds-diagnostic-list--adaptive-grid')).not.toBeNull()
    expect(musicRow?.getAttribute('aria-controls')).toBe('project-issue-detail')
    expect(musicRow?.getAttribute('aria-pressed')).toBe('true')
  })

  test('项目信息归概览，问题页不再混入高级信息和本地化状态', async () => {
    const state = projectState()
    const session = new EditSession(state)
    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="overview"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
          poisons={state.poisons ?? []}
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={collectProjectIssues(state)}
          diagnosticsStatus="current"
          assetReader={{} as never}
        />,
      ),
    )

    expect(host.textContent).toContain('内容版本 20')
    expect(host.textContent).toContain('最低存档版本 8')

    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="advanced"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
          poisons={state.poisons ?? []}
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={collectProjectIssues(state)}
          diagnosticsStatus="current"
          assetReader={{} as never}
        />,
      ),
    )

    expect(host.textContent).not.toContain('高级信息')
    expect(host.textContent).not.toContain('项目元数据')
    expect(host.textContent).not.toContain('本地化状态')
  })

  test('概览只用三张可读启动卡，并把场景健康交给统一诊断', async () => {
    const state = projectState()
    state.scenes = [
      {
        id: 's000',
        mapId: 'map.start',
        entry: { pos: { x: 0, y: 0 }, facing: 'south' },
        entities: [],
      },
    ] as never
    state.actors = [
      {
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
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    ]
    state.locale['name.hero'] = '李逍遥'
    state.items = [
      {
        id: 'herb',
        name: '止血草',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      },
    ]
    state.manifest.entryPoints[0]!.startWorld = {
      party: ['hero'],
      money: 250,
      inventory: [{ itemId: 'herb', count: 3 }],
    }
    state.manifest.entryPoints.push(
      {
        id: 'story-2',
        label: '这是一个非常长但必须完整呈现的第二故事入口名称',
        scene: 's000',
        startWorld: { party: [], money: 0, inventory: [] },
      },
      {
        id: 'story-3',
        label: '第三故事',
        scene: 's000',
        startWorld: { party: [], money: 0, inventory: [] },
      },
      {
        id: 'story-4',
        label: '第四故事',
        scene: 's000',
        startWorld: { party: [], money: 0, inventory: [] },
      },
    )
    const session = new EditSession(state)
    const onOpenLocation = vi.fn()
    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="overview"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
          poisons={state.poisons ?? []}
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={collectProjectIssues(state)}
          diagnosticsStatus="current"
          assetReader={{} as never}
          onOpenLocation={onOpenLocation}
        />,
      ),
    )

    const cards = host.querySelectorAll('.project-startup-summary-card')
    expect(cards).toHaveLength(3)
    expect([...cards].map((card) => card.querySelector('h2')?.textContent)).toEqual([
      '默认开局',
      '标题菜单',
      '启动资源',
    ])
    expect(host.textContent).toContain('李逍遥')
    expect(host.textContent).toContain('250 金钱')
    expect(host.textContent).toContain('止血草')
    expect(host.textContent).toContain('起始位置已就绪')
    expect(host.textContent).toContain('这是一个非常长但必须完整呈现的第二故事入口名称')
    expect(host.textContent).toContain('另有 1 个入口')
    expect(host.textContent).not.toContain('assets.roles')
    expect(host.textContent).not.toContain('manifest.')
    expect(host.textContent).not.toContain('?entry')
    expect(host.textContent).not.toContain('?menu')
    expect(host.textContent).not.toContain('?scene')
    expect(host.textContent).not.toContain('启动分支')
    expect(host.textContent).not.toContain('编辑 8 项设置')

    await act(async () => button(host, '编辑开局').click())
    await act(async () => button(host, '编辑入口').click())
    await act(async () => button(host, '编辑资源').click())
    expect(new Set(onOpenLocation.mock.calls.map(([location]) => location.subpage))).toEqual(
      new Set(['entrypoint', 'startup']),
    )
  })

  test('概览在 live 入口表变化后同步标题菜单、默认开局和导航对象', async () => {
    const state = projectState()
    state.scenes = [
      {
        id: 's000',
        mapId: 'map.start',
        entry: { pos: { x: 0, y: 0 }, facing: 'south' },
        entities: [],
      },
    ] as never
    const session = new EditSession(state)
    const onOpenLocation = vi.fn()
    const renderOverview = async () => {
      const current = session.getState()
      await act(async () =>
        root.render(
          <ProjectWorkbenchTab
            page="overview"
            manifest={current.manifest as never}
            scenes={current.scenes}
            actors={current.actors}
            items={current.items}
            poisons={current.poisons ?? []}
            locale={current.locale}
            assetCatalog={current.assetCatalog}
            session={session}
            issues={collectProjectIssues(current)}
            diagnosticsStatus="current"
            assetReader={{} as never}
            onOpenLocation={onOpenLocation}
          />,
        ),
      )
    }

    await renderOverview()
    expect(host.querySelector('.project-startup-summary-grid')?.textContent).toContain(
      '1 个可选入口',
    )

    session.dispatch(
      new SetStartupEntriesCommand({
        defaultEntryId: 'story',
        entryPoints: [
          ...session.getState().manifest.entryPoints,
          {
            id: 'story',
            label: '新的直接启动故事',
            scene: 's000',
            startWorld: { party: [], money: 88, inventory: [] },
          },
        ],
      }),
    )
    await renderOverview()

    const summary = host.querySelector('.project-startup-summary-grid')!
    expect(summary.textContent).toContain('新的直接启动故事')
    expect(summary.textContent).toContain('2 个可选入口')
    await act(async () => button(summary as HTMLElement, '编辑开局').click())
    expect(onOpenLocation).toHaveBeenLastCalledWith({
      module: 'project',
      subpage: 'entrypoint',
      objectId: 'story',
    })
  })

  test('缺失场景和非当前诊断都 fail-closed，不显示技术场景 ID 冒充健康', async () => {
    const state = projectState()
    const session = new EditSession(state)
    await act(async () => root.render(projectTab('overview', session)))

    expect(host.textContent).toContain('起始位置需要修复')
    expect(host.querySelector('.project-startup-summary-grid')?.textContent).not.toContain('s000')

    state.manifest.entryPoints[0]!.introVideo = 'video.pending'
    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="overview"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
          poisons={state.poisons ?? []}
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={[]}
          diagnosticsStatus="stale"
          assetReader={{} as never}
        />,
      ),
    )
    expect(host.textContent).toContain('起始位置正在检查')
    expect(host.textContent).toContain('开场视频正在检查')
    expect(host.textContent).not.toContain('开场视频已配置')
    expect(host.textContent).toContain('正在检查资源配置')
    expect(host.textContent).not.toContain('配置检查通过')

    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="overview"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
          poisons={state.poisons ?? []}
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={[]}
          diagnosticsStatus="failed"
          assetReader={{} as never}
        />,
      ),
    )
    expect(host.textContent).toContain('开场视频诊断暂不可用')
    expect(host.textContent).not.toContain('开场视频已配置')
  })

  test('缺损默认入口与单入口菜单显示可读状态，不把稳定 ID 放进摘要卡', async () => {
    const state = projectState()
    state.manifest.defaultEntryId = 'missing-default'
    const session = new EditSession(state)

    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="overview"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
          poisons={state.poisons ?? []}
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={collectProjectIssues(state)}
          diagnosticsStatus="current"
          assetReader={{} as never}
        />,
      ),
    )

    const summary = host.querySelector('.project-startup-summary-grid')!
    expect(summary.textContent).toContain('直接启动入口尚未配置')
    expect(summary.textContent).toContain('默认入口需要修复')
    expect(summary.textContent).toContain('1 个可选入口')
    expect(summary.textContent).toContain('主要入口')
    expect(summary.textContent).not.toContain('missing-default')
    expect(summary.textContent).not.toContain('s000')
  })

  test('启动资源卡随 live 绑定从全齐切到悬空与错型，并保持可选留空中性', async () => {
    const state = projectState()
    state.scenes = [
      {
        id: 's000',
        mapId: 'map.start',
        entry: { pos: { x: 0, y: 0 }, facing: 'south' },
        entities: [],
      },
    ] as never
    for (const [index, role] of ASSET_ROLES.entries()) {
      const id = `asset.role.${index}`
      const kind = ASSET_ROLE_KINDS[role]
      state.manifest.assets.roles[role] = id
      state.assetCatalog.assets[id] = {
        kind,
        path: `assets/test/${index}`,
        mediaType: 'application/octet-stream',
        bytes: 1,
        sha256: index.toString(16).padStart(64, '0'),
        origin: { kind: 'authored' },
      }
    }
    const session = new EditSession(state)
    const renderOverview = async () =>
      act(async () =>
        root.render(
          <ProjectWorkbenchTab
            page="overview"
            manifest={state.manifest as never}
            scenes={state.scenes}
            actors={state.actors}
            items={state.items}
            poisons={state.poisons ?? []}
            locale={state.locale}
            assetCatalog={state.assetCatalog}
            session={session}
            issues={collectProjectIssues(state)}
            diagnosticsStatus="current"
            assetReader={{} as never}
          />,
        ),
      )

    await renderOverview()
    let resourceCard = [
      ...host.querySelectorAll<HTMLElement>('.project-startup-summary-card'),
    ].find((card) => card.querySelector('h2')?.textContent === '启动资源')!
    expect(resourceCard.textContent).toContain('资源配置检查通过')
    expect(resourceCard.textContent).toContain('12/12 项')

    const wrongId = state.manifest.assets.roles['audio.defaultBattleMusic']!
    state.assetCatalog.assets[wrongId] = {
      ...state.assetCatalog.assets[wrongId]!,
      kind: 'video',
    }
    state.manifest.assets.roles['audio.normalVictoryMusic'] = 'music.missing'
    delete state.manifest.assets.roles['audio.battleEscapeSound']
    await renderOverview()

    resourceCard = [...host.querySelectorAll<HTMLElement>('.project-startup-summary-card')].find(
      (card) => card.querySelector('h2')?.textContent === '启动资源',
    )!
    expect(resourceCard.textContent).toContain('2 项需要处理')
    expect(resourceCard.textContent).toContain('默认战斗音乐')
    expect(resourceCard.textContent).toContain('普通胜利音乐')
    expect(resourceCard.textContent).toContain('可选留空1 项')
    const pendingRoles = [...resourceCard.querySelectorAll('div')].find(
      (row) => row.querySelector('dt')?.textContent === '待处理',
    )
    expect(pendingRoles?.textContent).not.toContain('逃跑音效')
  })

  test('全局资源绑定行使用共享选择器和打开动作，并保持资源信息属于同一行', async () => {
    const state = projectState()
    state.manifest.assets.roles['video.startupTrademark'] = 'video.test'
    state.assetCatalog.assets['video.test'] = {
      kind: 'video',
      path: 'assets/video/test.mp4',
      mediaType: 'video/mp4',
      bytes: 12,
      sha256: '4'.repeat(64),
      label: '测试视频',
      origin: { kind: 'authored' },
    }
    const session = new EditSession(state)
    const onOpenLocation = vi.fn()

    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="startup"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
          poisons={state.poisons ?? []}
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={collectProjectIssues(state)}
          diagnosticsStatus="current"
          assetReader={{} as never}
          onOpenLocation={onOpenLocation}
        />,
      ),
    )

    const roleGroups = [...host.querySelectorAll<HTMLElement>('.project-role-list')]
    expect(roleGroups).toHaveLength(PROJECT_ASSET_ROLE_GROUPS.length)
    expect(
      roleGroups.every(
        (group) =>
          group.getAttribute('data-ds-field-group') === '' && group.dataset.labelTrack === 'wide',
      ),
    ).toBe(true)
    expect(
      roleGroups.reduce(
        (total, group) => total + group.querySelectorAll(':scope > .project-role-row').length,
        0,
      ),
    ).toBe(ASSET_ROLES.length)
    const row = [...host.querySelectorAll<HTMLElement>('.project-role-row')].find((candidate) =>
      candidate.textContent?.includes('启动商标视频'),
    )!
    const select = row.querySelector<HTMLButtonElement>('.ds-select')!
    expect(select.id).toBe('project-role-video-startupTrademark')
    expect(row.querySelector('label')?.getAttribute('for')).toBe(select.id)
    expect(select.getAttribute('aria-describedby')).toBeNull()
    expect(row.querySelector('.ds-field__help')).toBeNull()
    const helpButton = row.querySelector<HTMLButtonElement>(
      'button[aria-label="启动商标视频说明"]',
    )!
    expect(helpButton).not.toBeNull()
    const helpTooltip = document.getElementById(helpButton.getAttribute('aria-describedby')!)
    expect(helpTooltip?.getAttribute('role')).toBe('tooltip')
    expect(helpTooltip?.textContent).toBe('可选资源角色：video.startupTrademark；需要视频资源。')
    expect(helpTooltip?.querySelector('code[translate="no"]')?.textContent).toBe(
      'video.startupTrademark',
    )
    expect(
      host.querySelectorAll('.project-role-row .ds-field__label-group > .ds-help-tip'),
    ).toHaveLength(ASSET_ROLES.length)
    const bossVictoryRow = [...host.querySelectorAll<HTMLElement>('.project-role-row')].find(
      (candidate) => candidate.textContent?.includes('特殊战胜利结算音乐'),
    )!
    const bossHelp = bossVictoryRow.querySelector<HTMLButtonElement>(
      'button[aria-label="特殊战胜利结算音乐说明"]',
    )!
    expect(
      document.getElementById(bossHelp.getAttribute('aria-describedby')!)?.textContent,
    ).toContain('不可逃战胜利后播放；若随后升级，升级屏继续沿用此曲。')
    expect(row.querySelector('select.in')).toBeNull()
    expect(row.querySelector('.project-role-resource')?.textContent).toContain('测试视频')
    expect(row.querySelector('.project-role-resource')?.getAttribute('title')).toBe(
      'assets/video/test.mp4',
    )

    const preview = button(row, '打开资源')
    expect(preview.classList.contains('ds-button')).toBe(true)
    expect(preview.classList.contains('btn')).toBe(false)
    expect(preview.classList.contains('ds-button--compact')).toBe(false)
    expect(preview.querySelector('.ds-icon')).not.toBeNull()
    const previewOwner = { stop: vi.fn() }
    claimEditorAudioPreview(previewOwner)
    await act(async () => preview.click())
    expect(previewOwner.stop).toHaveBeenCalledOnce()
    expect(onOpenLocation).toHaveBeenCalledWith({
      module: 'asset',
      subpage: 'cutscene',
      objectId: 'video.test',
    })
    expect(session.getHistoryVersion()).toBe(0)
  })

  test('入口视频与全局视频使用相同的预览动作合同', async () => {
    const state = projectState()
    state.manifest.entryPoints[0]!.introVideo = 'video.alt'
    const session = new EditSession(state)
    const onOpenLocation = vi.fn()

    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="entrypoint"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
          poisons={state.poisons ?? []}
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={collectProjectIssues(state)}
          diagnosticsStatus="current"
          assetReader={{} as never}
          onOpenLocation={onOpenLocation}
        />,
      ),
    )

    const field = host.querySelector<HTMLElement>('[data-field-id="entry-intro-video"]')!
    const preview = button(field, '前往预览')
    expect(field.querySelector('.ds-control-group')).not.toBeNull()
    expect(preview.classList.contains('ds-button--compact')).toBe(false)
    expect(preview.querySelector('.ds-icon')).not.toBeNull()

    const previewOwner = { stop: vi.fn() }
    claimEditorAudioPreview(previewOwner)
    await act(async () => preview.click())
    expect(previewOwner.stop).toHaveBeenCalledOnce()
    expect(onOpenLocation).toHaveBeenCalledWith({
      module: 'asset',
      subpage: 'cutscene',
      objectId: 'video.alt',
    })
    expect(session.getHistoryVersion()).toBe(0)
  })

  test.each([
    ['overview', '测试项目'],
    ['startup', '全局资源与启动'],
    ['entrypoint', '主要入口'],
    ['advanced', '入口点场景缺失'],
  ] as const)('%s 使用固定共享标题和独立正文滚动层', async (page, title) => {
    const session = new EditSession(projectState())
    await act(async () => root.render(projectTab(page, session)))

    const { workspace, content } = verifyCanonicalObjectWorkspace(host, '项目设置工作区')
    const hero = workspace.querySelector<HTMLElement>(':scope > .ds-object-hero')!

    expect(hero).not.toBeNull()
    expect(content.classList.contains('project-scroll')).toBe(true)
    expect(hero.querySelector('h1')?.textContent).toBe(title)
    expect(workspace.querySelectorAll('h1')).toHaveLength(1)
    expect(content.contains(hero)).toBe(false)
    expect(content.classList.contains('ds-object-workspace__content')).toBe(true)
    expect(host.querySelector('.project-inspector')).toBeNull()
    expect(host.querySelectorAll('.ds-diagnostic-panel')).toHaveLength(page === 'advanced' ? 1 : 0)
  })
})
