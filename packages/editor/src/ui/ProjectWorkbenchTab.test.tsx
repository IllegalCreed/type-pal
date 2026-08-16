// @vitest-environment jsdom
import type { StartWorld } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { ProjectIssue } from '../core/project-diagnostics.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import {
  IssueList,
  type ProjectWorkbenchPage,
  ProjectWorkbenchTab,
  StartWorldFields,
} from './ProjectWorkbenchTab.js'

function issues(count: number): ProjectIssue[] {
  return Array.from({ length: count }, (_, index) => ({
    severity: 'warn',
    code: 'unused-asset',
    message: `未引用资源 ${index + 1}`,
    path: `assets[${index + 1}]`,
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
    learnedSkills: {},
    inventory: [],
  })
  return (
    <StartWorldFields
      value={value}
      actors={[]}
      items={[]}
      skills={[]}
      locale={{}}
      onChange={setValue}
    />
  )
}

function projectState(): EditorState {
  const startWorld: StartWorld = {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
  }
  return {
    manifest: {
      id: 'project-test',
      name: '测试工程',
      contentVersion: 13,
      minEngineVersion: '2.0.0',
      entryScene: 's000',
      startWorld,
      assets: { catalog: 'assets/index.json', roles: {} },
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
    startWorld,
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

function projectTab(page: ProjectWorkbenchPage, session: EditSession) {
  const state = session.getState()
  return (
    <ProjectWorkbenchTab
      page={page}
      manifest={state.manifest as never}
      scenes={state.scenes}
      actors={state.actors}
      items={state.items}
      skills={state.skills}
      locale={state.locale}
      assetCatalog={state.assetCatalog}
      session={session}
      editorState={state}
      assetReader={{} as never}
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

describe('工程问题列表', () => {
  test('主面板可分批加载、显示全部和收起', async () => {
    await act(async () => root.render(<IssueList issues={issues(303)} />))

    expect(host.querySelectorAll('.project-issue')).toHaveLength(80)
    expect(host.textContent).toContain('已显示 80 / 303 项')

    await act(async () => button(host, '继续显示 80 项').click())
    expect(host.querySelectorAll('.project-issue')).toHaveLength(160)

    await act(async () => button(host, '显示全部').click())
    expect(host.querySelectorAll('.project-issue')).toHaveLength(303)
    expect(host.textContent).toContain('已显示全部 303 项')

    await act(async () => button(host, '收起至前 80 项').click())
    expect(host.querySelectorAll('.project-issue')).toHaveLength(80)
  })

  test('右侧摘要保持 30 项上限并提供全部问题入口', async () => {
    const onViewAll = vi.fn()
    await act(async () =>
      root.render(<IssueList issues={issues(303)} compact onViewAll={onViewAll} />),
    )

    expect(host.querySelectorAll('.project-issue')).toHaveLength(30)
    await act(async () => button(host, '查看全部 303 项').click())
    expect(onViewAll).toHaveBeenCalledOnce()
    expect(host.querySelectorAll('.project-issue')).toHaveLength(30)
  })

  test('恰好 80 项时不显示多余的分批控件', async () => {
    await act(async () => root.render(<IssueList issues={issues(80)} />))

    expect(host.querySelectorAll('.project-issue')).toHaveLength(80)
    expect(host.querySelector('.project-issue-more')).toBeNull()
  })
})

describe('入口开局世界资源', () => {
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
          skills={state.skills}
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
    await act(async () => preview.click())
    expect(onOpenLocation).toHaveBeenCalledWith({
      module: 'asset',
      subpage: 'cutscene',
      objectId: 'video.test',
    })
  })

  test.each([
    ['overview', '测试工程'],
    ['startup', '全局资源设置'],
    ['entrypoint', '默认入口'],
    ['advanced', '问题与高级'],
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
    const inspectorContract = {
      overview: ['工程概览检查器', '下一步'],
      startup: ['全局启动检查器', '编辑边界'],
      entrypoint: ['工程入口检查器', '字段归属'],
      advanced: ['问题与高级检查器', '保存契约'],
    } as const
    const [label, contextLabel] = inspectorContract[page]
    await verifyInspectorTabs(host, label, [/^问题 \d+$/, contextLabel])
  })
})
