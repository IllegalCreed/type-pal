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
import { collectProjectIssues, type ProjectIssue } from '../core/project-diagnostics.js'
import {
  deriveStartWorldResourceCandidates,
  groupProjectIssues,
  IssueList,
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

async function chooseSelectOption(trigger: HTMLButtonElement, label: string): Promise<void> {
  await act(async () => trigger.click())
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
    candidate.textContent?.includes(label),
  )
  expect(option).toBeDefined()
  await act(async () => option!.click())
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
        rewards: [],
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
    <StartWorldFields value={value} actors={[]} items={items} locale={{}} onChange={setValue} />
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
      contentVersion: 18,
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

function projectTab(page: ProjectWorkbenchPage, session: EditSession, focusObjectId?: string) {
  const state = session.getState()
  return (
    <ProjectWorkbenchTab
      page={page}
      manifest={state.manifest as never}
      scenes={state.scenes}
      actors={state.actors}
      items={state.items}
      locale={state.locale}
      assetCatalog={state.assetCatalog}
      session={session}
      issues={collectProjectIssues(state)}
      diagnosticsStatus="current"
      assetReader={{} as never}
      focusObjectId={focusObjectId}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  stopEditorAudioPreview()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  stopEditorAudioPreview()
  await act(async () => root.unmount())
  host.remove()
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
    expect(selectedRow.querySelector('.ds-catalog-row__leading [aria-hidden="true"]')).not.toBeNull()

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
    const setDefault = button(host, '设为直接启动入口')
    expect(setDefault.disabled).toBe(false)
    await act(async () => setDefault.click())
    expect(session.getState().manifest.defaultEntryId).toBe(created.id)

    await act(async () => root.render(projectTab('entrypoint', session, created.id)))
    expect(button(host, '删除当前入口').disabled).toBe(true)

    const single = projectState()
    const singleSession = new EditSession(single)
    await act(async () => root.render(projectTab('entrypoint', singleSession)))
    expect(button(host, '删除当前入口').disabled).toBe(true)
  })

  test('入口重排一次动作只写一条命令，并保持直接启动 ID 不变', async () => {
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

    await act(async () => button(host, '上移当前入口').click())
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().manifest.entryPoints.map((entry) => entry.id)).toEqual([
      'alternate',
      'main',
      'challenge',
    ])
    expect(session.getState().manifest.defaultEntryId).toBe('main')

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

    await act(async () => button(host, '复制当前入口').click())
    expect(session.getHistoryVersion()).toBe(1)
    const copy = session.getState().manifest.entryPoints.at(-1)!
    expect(copy).toMatchObject({ label: '备用入口 副本', scene: 's000' })
    expect(copy.startWorld).not.toBe(session.getState().manifest.entryPoints[1]!.startWorld)

    await act(async () => root.render(projectTab('entrypoint', session, copy.id)))
    await act(async () => button(host, '删除当前入口').click())
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

  test('队伍使用可搜索添加器，排序和移出各自保持单命令边界', async () => {
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
    const adder = host.querySelector<HTMLButtonElement>('[aria-label="添加队员"]')!
    expect(adder.getAttribute('role')).toBe('combobox')
    await chooseSelectOption(adder, '伙伴')
    await act(async () => button(host, '加入队伍').click())
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero', 'friend'])
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(host.querySelector('[role="status"]')?.textContent).toContain('伙伴加入初始队伍')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('移出伙伴')

    const moveFriend = host.querySelector<HTMLButtonElement>('[aria-label="上移伙伴"]')!
    await act(async () => {
      moveFriend.focus()
      moveFriend.click()
    })
    expect(session.getHistoryVersion()).toBe(2)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['friend', 'hero'])
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(document.activeElement?.getAttribute('aria-label')).toBe('上移伙伴')
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.party).toEqual(['hero', 'friend'])

    await act(async () => root.render(projectTab('entrypoint', session)))
    const beforeRemove = session.getHistoryVersion()
    const friendHp = host.querySelector<HTMLInputElement>(
      'input[aria-label^="friend 开局当前 HP"]',
    )!
    await act(async () => friendHp.focus())
    await input(friendHp, '7')
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
    expect(host.querySelector('[role="status"]')?.textContent).toContain('伙伴移出初始队伍')
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
    await chooseSelectOption(
      host.querySelector<HTMLButtonElement>('[aria-label="添加队员"]')!,
      '伙伴',
    )
    await act(async () => button(host, '加入队伍').click())
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
  })

  test('库存显式选择新增项，数量 Enter + blur 只产生一条命令', async () => {
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

    const adder = host.querySelector<HTMLButtonElement>('[aria-label="添加初始道具"]')!
    await chooseSelectOption(adder, '还神丹')
    await act(async () => button(host, '添加道具').click())
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory).toEqual([
      { itemId: 'pill', count: 1 },
    ])

    await act(async () => root.render(projectTab('entrypoint', session)))
    const count = host.querySelector<HTMLInputElement>('[aria-label="还神丹的初始数量"]')!
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
    expect(session.undo()).toBe(true)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.inventory).toEqual([
      { itemId: 'pill', count: 6 },
    ])
  })

  test('初始队伍合并当前状态，不暴露独立 schema 面板', async () => {
    const session = new EditSession(projectState())
    await act(async () => root.render(projectTab('entrypoint', session)))

    expect(host.textContent).toContain('初始队伍')
    expect(host.textContent).toContain('留空即继承角色定义的当前值')
    expect(host.textContent).not.toContain('开局当前状态')
    expect(host.textContent).not.toContain('seedStats')
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

  test('入口工作台的 composer 与重复行只由父级选择一个 density', async () => {
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
    expect(composers).toHaveLength(3)
    expect(composers.every((row) => row.dataset.density === 'default')).toBe(true)

    const rows = [...host.querySelectorAll<HTMLElement>('.ds-repeat-row')]
    expect(rows.length).toBeGreaterThanOrEqual(3)
    for (const row of [...composers, ...rows]) {
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
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="添加世界资源"]')!
    expect(trigger).not.toBeNull()
    await act(async () => trigger.click())
    await nextAnimationFrame()
    const search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    expect(search.getAttribute('aria-label')).toBe('筛选添加世界资源')
    expect(document.activeElement).toBe(search)
    await input(search, '灵泉水')
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1)
    await act(async () =>
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    await nextAnimationFrame()
    expect(document.querySelector('.ds-select-popover')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    await act(async () => trigger.click())
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) =>
        candidate.textContent?.includes('灵泉水、炼丹炉·水纹超级长名称用于验证完整提示'),
    )!
    expect(option.title).toBe('灵泉水、炼丹炉·水纹超级长名称用于验证完整提示 · spiritWater')
    await act(async () => option.click())
    expect(trigger.title).toBe('灵泉水、炼丹炉·水纹超级长名称用于验证完整提示 · spiritWater')
    await act(async () => button(host, '添加资源').click())
    const addedInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="灵泉水、炼丹炉·水纹超级长名称用于验证完整提示（资源 spiritWater）初始值"]',
    )!
    expect(document.activeElement).toBe(addedInput)
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '[aria-label="删除灵泉水、炼丹炉·水纹超级长名称用于验证完整提示使用的初始世界资源"]',
        )!
        .click(),
    )
    expect(document.activeElement).toBe(
      host.querySelector<HTMLButtonElement>('[aria-label="添加世界资源"]'),
    )
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('[aria-label="清理未被使用的世界资源 legacyEnergy"]')!
        .click(),
    )
    expect(document.activeElement).toBe(
      host.querySelector<HTMLButtonElement>('[aria-label="添加世界资源"]'),
    )
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      '已清理未被使用的世界资源 legacyEnergy',
    )

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
    expect(host.querySelector('[aria-label="添加世界资源"]')).toBeNull()
  })

  test('资源候选直接消费 live items，物品效果变化后同步出现', async () => {
    await act(async () => root.render(<ResourceHarness items={[]} />))
    expect(host.querySelector('[aria-label="添加世界资源"]')).toBeNull()

    await act(async () =>
      root.render(
        <ResourceHarness items={[resourceItem('live-item', '即时炼化物品', ['livePool'])]} />,
      ),
    )
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="添加世界资源"]')!
    expect(trigger).not.toBeNull()
    await act(async () => trigger.click())
    expect(document.querySelector('[role="option"]')?.textContent).toContain('即时炼化物品')
  })

  test('世界资源新增、提交、删除各自只写一条命令并可单步撤销', async () => {
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
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      '已清理未被使用的世界资源 legacyEnergy',
    )
    expect(session.undo()).toBe(true)
    await act(async () => root.render(projectTab('entrypoint', session)))

    const resourceSelect = host.querySelector<HTMLButtonElement>('[aria-label="添加世界资源"]')!
    await chooseSelectOption(resourceSelect, '炼化壶')
    const beforeAdd = session.getHistoryVersion()
    await act(async () => button(host, '添加资源').click())
    expect(session.getHistoryVersion()).toBe(beforeAdd + 1)
    expect(session.getState().manifest.entryPoints[0]!.startWorld.resources).toEqual({
      legacyEnergy: 4,
      alchemyEnergy: 0,
    })
    expect(session.getState().manifest.entryPoints[1]!.startWorld.resources).toEqual({
      alchemyEnergy: 3,
    })
    expect(session.undo()).toBe(true)
    await act(async () => root.render(projectTab('entrypoint', session)))
    expect(session.getState().manifest.entryPoints[0]!.startWorld.resources).toEqual({
      legacyEnergy: 4,
    })
    expect(
      host.querySelector<HTMLButtonElement>('[aria-label="添加世界资源"]')!.textContent,
    ).toContain('炼化壶')
    expect(session.redo()).toBe(true)
    await act(async () => root.render(projectTab('entrypoint', session)))

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
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      '已删除炼化壶使用的初始世界资源',
    )
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
          locale={state.locale}
          assetCatalog={state.assetCatalog}
          session={session}
          issues={collectProjectIssues(state)}
          diagnosticsStatus="current"
          assetReader={{} as never}
        />,
      ),
    )

    expect(host.textContent).toContain('内容版本 18')
    expect(host.textContent).toContain('最低存档版本 8')

    await act(async () =>
      root.render(
        <ProjectWorkbenchTab
          page="advanced"
          manifest={state.manifest as never}
          scenes={state.scenes}
          actors={state.actors}
          items={state.items}
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

    const row = [...host.querySelectorAll<HTMLElement>('.project-role-row')].find((candidate) =>
      candidate.textContent?.includes('启动商标视频'),
    )!
    const select = row.querySelector<HTMLButtonElement>('.ds-select')!
    expect(select.getAttribute('aria-labelledby')).toBe('project-role-video-startupTrademark-label')
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

    const field = [...host.querySelectorAll<HTMLElement>('.field')].find((candidate) =>
      candidate.textContent?.includes('入口视频'),
    )!
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

    const workspace = host.querySelector<HTMLElement>('.project-center')!
    const hero = workspace.querySelector<HTMLElement>(':scope > .ds-object-hero')!
    const content = workspace.querySelector<HTMLElement>(':scope > .project-scroll')!

    expect(hero).not.toBeNull()
    expect(content).not.toBeNull()
    expect(hero.querySelector('h1')?.textContent).toBe(title)
    expect(workspace.querySelectorAll('h1')).toHaveLength(1)
    expect(content.contains(hero)).toBe(false)
    expect(content.classList.contains('ds-object-workspace__content')).toBe(true)
    expect(host.querySelector('.project-inspector')).toBeNull()
    expect(host.querySelectorAll('.ds-diagnostic-panel')).toHaveLength(page === 'advanced' ? 1 : 0)
  })
})
