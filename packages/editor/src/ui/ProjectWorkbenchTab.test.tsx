// @vitest-environment jsdom
import type { StartWorld } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { ProjectIssue } from '../core/project-diagnostics.js'
import {
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

function ResourceHarness() {
  const [value, setValue] = useState<StartWorld>({
    party: [],
    money: 0,
    inventory: [],
  })
  return (
    <StartWorldFields
      value={value}
      actors={[]}
      items={[]}
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
      editorState={state}
      assetReader={{} as never}
      focusObjectId={focusObjectId}
    />
  )
}

let root: Root
let host: HTMLDivElement

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
    expect(host.querySelector('.ds-catalog-row[aria-pressed="true"]')?.textContent).toContain(
      'direct · 直接启动',
    )

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

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="新增入口"]')!.click(),
    )
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

  test('开局当前状态使用中文业务标题，不暴露 schema 字段名', async () => {
    const session = new EditSession(projectState())
    await act(async () => root.render(projectTab('entrypoint', session)))

    expect(host.textContent).toContain('开局当前状态')
    expect(host.textContent).toContain('留空即继承角色定义的当前值')
    expect(host.textContent).not.toContain('seedStats')
  })

  test('当前 HP/MP 显示角色继承值，清空后保持稀疏覆盖', async () => {
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

    const hp = host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 HP"]')!
    const mp = host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 MP"]')!
    expect(hp.placeholder).toBe('继承 100')
    expect(mp.placeholder).toBe('继承 30')
    expect(host.textContent).not.toContain('初始技能')

    await act(async () => hp.focus())
    await input(hp, '')
    await act(async () => hp.blur())
    expect(session.getState().manifest.entryPoints[0]!.startWorld.seedStats).toBeUndefined()
  })

  test('可新增、修改和删除稳定资源键，并拒绝重复定义 collectValue', async () => {
    await act(async () => root.render(<ResourceHarness />))

    const keyInput = host.querySelector<HTMLInputElement>('input[aria-label="新世界资源稳定键"]')!
    const addButton = button(host, '添加资源')
    await input(keyInput, 'alchemyEnergy')
    expect(addButton.disabled).toBe(false)
    await act(async () => addButton.click())

    const valueInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="alchemyEnergy 初始值"]',
    )!
    expect(valueInput.value).toBe('0')
    await input(valueInput, '7')
    expect(valueInput.value).toBe('7')

    const row = valueInput.closest('.project-resource-row')!
    await act(async () => button(row as HTMLElement, '删除').click())
    expect(host.querySelector('input[aria-label="alchemyEnergy 初始值"]')).toBeNull()

    await input(keyInput, 'collectValue')
    expect(addButton.disabled).toBe(true)
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
          editorState={state}
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
          editorState={state}
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
          editorState={state}
          assetReader={{} as never}
        />,
      ),
    )

    expect(host.textContent).not.toContain('高级信息')
    expect(host.textContent).not.toContain('项目元数据')
    expect(host.textContent).not.toContain('本地化状态')
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
          editorState={state}
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
    expect(row.querySelector('.project-role-resource')?.textContent).toContain(
      'assets/video/test.mp4',
    )

    const preview = button(row, '前往预览')
    expect(preview.classList.contains('ds-button')).toBe(true)
    expect(preview.classList.contains('btn')).toBe(false)
    expect(preview.classList.contains('ds-button--compact')).toBe(false)
    expect(preview.querySelector('.ds-icon')).not.toBeNull()
    await act(async () => preview.click())
    expect(onOpenLocation).toHaveBeenCalledWith({
      module: 'asset',
      subpage: 'cutscene',
      objectId: 'video.test',
    })
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
          editorState={state}
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

    await act(async () => preview.click())
    expect(onOpenLocation).toHaveBeenCalledWith({
      module: 'asset',
      subpage: 'cutscene',
      objectId: 'video.alt',
    })
  })

  test.each([
    ['overview', '测试项目'],
    ['startup', '全局资源设置'],
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
