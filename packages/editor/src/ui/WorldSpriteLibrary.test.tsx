// @vitest-environment jsdom
import type {
  AssetCatalogV1,
  SpriteActionReference,
  SpriteDef,
  SpriteDefinitionReference,
} from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { RemoveSpriteDefinitionCommand, UpsertAssetCommand } from '../core/commands.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type {
  SpriteAutomaticScriptBehaviorSummary,
  SpriteAutomaticScriptInstanceSite,
} from '../core/world-sprite-behavior.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import { WorldSpriteLibrary } from './WorldSpriteLibrary.js'

vi.mock('./SpriteResourceViewer.js', async () => {
  const React = await import('react')
  return {
    SpriteResourceViewer: (props: {
      asset: string
      revision: string
      consumers: readonly SpriteDef[]
      activeDefinitionId?: string
      onLoaded?: (proof: { asset: string; revision: string; actualFrameCount: number }) => void
      automaticBehaviors?: ReadonlyMap<string, readonly SpriteAutomaticScriptBehaviorSummary[]>
      onAutomaticBehaviorLocations?: (definitionId: string) => void
    }) => {
      React.useEffect(() => {
        props.onLoaded?.({ asset: props.asset, revision: props.revision, actualFrameCount: 20 })
      }, [props.asset, props.onLoaded, props.revision])
      return (
        <div
          data-world-resource={props.asset}
          data-world-active-definition={props.activeDefinitionId}
          data-world-consumer-count={props.consumers.length}
        >
          {[...(props.automaticBehaviors?.entries() ?? [])].flatMap(([definitionId, summaries]) =>
            summaries.map((summary) => (
              <div key={`${definitionId}:${summary.label}`}>
                <span>
                  {summary.label} · {summary.instanceCount} ·{' '}
                  {summary.preview.kind === 'cycle'
                    ? summary.preview.cycle.map((step) => step.frame).join(' → ')
                    : summary.preview.kind === 'variants'
                      ? summary.preview.variants
                          .map((variant) => variant.steps.map((step) => step.frame).join(' → '))
                          .join(' / ')
                      : ''}
                </span>
                <button
                  type="button"
                  aria-label={`查看 ${definitionId} 自动脚本使用位置`}
                  onClick={() => props.onAutomaticBehaviorLocations?.(definitionId)}
                >
                  查看使用位置
                </button>
              </div>
            )),
          )}
        </div>
      )
    },
  }
})

vi.mock('./SpriteUploadWizard.js', () => ({
  SpriteUploadWizard: () => <div data-world-uploader />,
}))

const definitions: SpriteDef[] = [
  {
    id: 'hero-walk',
    label: '主角行走',
    asset: 'sprite.shared',
    layout: { kind: 'directional', framesPerDir: 3 },
  },
  {
    id: 'hero-static',
    label: '主角静止',
    asset: 'sprite.shared',
    layout: { kind: 'static' },
  },
]

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'sprite.raw': {
      kind: 'sprite',
      label: '未配置精灵帧',
      path: 'assets/authored/sprites/raw.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 4,
      sha256: 'b'.repeat(64),
      origin: { kind: 'authored' },
    },
    'sprite.shared': {
      kind: 'sprite',
      label: '共享精灵帧',
      path: 'assets/authored/sprites/shared.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 4,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' },
    },
  },
}

function editorState(
  entries: readonly SpriteDef[],
  options: {
    scenes: EditorState['scenes']
    scriptChunks: EditorState['scriptChunks']
    actors?: EditorState['actors']
    worlds?: EditorState['worlds']
  } = { scenes: [], scriptChunks: {} },
): EditorState {
  return {
    manifest: { assets: { roles: {} } } as never,
    scenes: options.scenes,
    actors: options.actors ?? [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [...entries],
    battleSprites: [],
    enemies: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: catalog,
    assetBlobs: {},
    stamps: [],
    scriptChunks: options.scriptChunks,
    worlds: options.worlds,
  } as EditorState
}

function button(text: string): HTMLButtonElement {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) =>
      candidate.textContent?.trim() === text ||
      candidate.querySelector('.ds-tab__label')?.textContent?.trim() === text,
  )!
}

async function chooseSelectOption(label: string, optionText: string): Promise<void> {
  const trigger = document.querySelector<HTMLButtonElement>(
    `[role="combobox"][aria-label="${label}"]`,
  )!
  await act(async () => trigger.click())
  const listbox = document.getElementById(trigger.getAttribute('aria-controls')!)!
  const option = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
    candidate.textContent?.includes(optionText),
  )!
  await act(async () => option.click())
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

function library(
  entries: readonly SpriteDef[],
  session: EditSession,
  options: {
    view?: 'definition' | 'asset'
    focusObjectId?: string
    catalog?: AssetCatalogV1
    onActionFocus?: (spriteId: string, actionId: string) => void
    onJumpReference?: (reference: SpriteDefinitionReference) => void
    onJumpActionReference?: (reference: SpriteActionReference) => void
    onJumpAutomaticScriptInstance?: (site: SpriteAutomaticScriptInstanceSite) => void
    onViewChange?: (view: 'definition' | 'asset', objectId?: string) => void
    onBattleDomain?: () => void
    onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
  } = {},
) {
  return (
    <WorldSpriteLibrary
      definitions={entries}
      catalog={options.catalog ?? catalog}
      assetBase={{} as never}
      assetReader={{} as never}
      session={session}
      tabBar={null}
      view={options.view ?? 'definition'}
      focusObjectId={options.focusObjectId}
      onViewChange={options.onViewChange ?? vi.fn()}
      onBattleDomain={options.onBattleDomain ?? vi.fn()}
      onActionFocus={options.onActionFocus}
      onJumpReference={options.onJumpReference}
      onJumpActionReference={options.onJumpActionReference}
      onJumpAutomaticScriptInstance={options.onJumpAutomaticScriptInstance}
      onStatusNotice={options.onStatusNotice}
    />
  )
}

describe('WorldSpriteLibrary', () => {
  test('目标定义被移除后的 dispatch noop 会回灌 canonical 草稿', async () => {
    const session = new EditSession(editorState(definitions))
    const onStatusNotice = vi.fn()
    await act(async () =>
      root.render(library(definitions, session, { focusObjectId: 'hero-walk', onStatusNotice })),
    )
    const field = host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!
    await act(async () => {
      session.dispatch(new RemoveSpriteDefinitionCommand('hero-walk'))
    })
    const beforeRejected = session.getHistoryVersion()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      field.focus()
      setter?.call(field, '4')
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.blur()
    })
    expect(session.getHistoryVersion()).toBe(beforeRejected)
    expect(field.value).toBe('3')
    expect(onStatusNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('已变化') }),
    )
  })

  test('布局提交失败会回灌 canonical，恢复有效证明后只产生一条命令', async () => {
    const session = new EditSession(editorState(definitions))
    const onStatusNotice = vi.fn()
    await act(async () =>
      root.render(library(definitions, session, { focusObjectId: 'hero-walk', onStatusNotice })),
    )
    const field = host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!
    const record = catalog.assets['sprite.shared']!
    session.dispatch(
      new UpsertAssetCommand(
        'sprite.shared',
        { ...record, sha256: 'c'.repeat(64) },
        new ArrayBuffer(4),
      ),
    )
    const beforeRejected = session.getHistoryVersion()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      field.focus()
      setter?.call(field, '4')
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
      field.blur()
    })
    expect(session.getHistoryVersion()).toBe(beforeRejected)
    expect(field.value).toBe('3')
    expect(onStatusNotice).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'error' }))

    session.dispatch(new UpsertAssetCommand('sprite.shared', record, new ArrayBuffer(4)))
    const beforeAccepted = session.getHistoryVersion()
    await act(async () => {
      field.focus()
      setter?.call(field, '4')
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
      field.blur()
    })
    expect(session.getHistoryVersion()).toBe(beforeAccepted + 1)
    expect(session.getState().sprites[0]?.layout).toEqual({
      kind: 'directional',
      framesPerDir: 4,
    })
  })

  test('领域深链、搜索和全部用途筛选覆盖组合、空结果与清空恢复，且不偷换选择', async () => {
    const onBattleDomain = vi.fn()
    const session = new EditSession(editorState(definitions))
    await act(async () => root.render(library(definitions, session, { onBattleDomain })))
    const rows = () => host.querySelectorAll('.world-sprite-outliner .sprite-resource-row')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="过滤大世界精灵库"]')!
    expect(rows()).toHaveLength(2)

    await act(async () => button('战斗').click())
    expect(onBattleDomain).toHaveBeenCalledTimes(1)
    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含四向')
    expect(rows()).toHaveLength(1)
    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含默认定格')
    expect(rows()).toHaveLength(1)
    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含预制动作')
    expect(rows()).toHaveLength(0)
    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含循环动作')
    expect(rows()).toHaveLength(0)
    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含自动脚本')
    expect(rows()).toHaveLength(0)
    await chooseSelectOption('按用途与实例行为筛选源帧资源', '无用途')
    expect(rows()).toHaveLength(1)
    expect(rows()[0]?.getAttribute('aria-pressed')).toBe('false')

    await setCatalogSearch(search, '共享')
    expect(rows()).toHaveLength(0)
    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含四向')
    expect(rows()).toHaveLength(1)
    await setCatalogSearch(search, '不存在')
    expect(rows()).toHaveLength(0)
    await setCatalogSearch(search, '')
    await chooseSelectOption('按用途与实例行为筛选源帧资源', '全部')
    expect(rows()).toHaveLength(2)
    expect(host.querySelector('[aria-pressed="true"]')?.textContent).toContain('共享精灵帧')
  })

  test('按源文件只列一项，目录只保留名称、AssetId 与异常', async () => {
    const session = new EditSession(editorState(definitions))
    await act(async () => root.render(library(definitions, session)))

    const rows = host.querySelectorAll<HTMLElement>(
      '.world-sprite-outliner .sprite-resource-row',
    )
    expect(rows).toHaveLength(2)
    expect([...rows].map((row) => row.dataset.leading)).toEqual(['none', 'none'])
    expect(host.querySelector('.sprite-library-switch')).toBeNull()
    expect(host.querySelector('.ds-virtual-list')?.textContent).toContain('sprite.shared')
    expect(host.querySelector('.ds-virtual-list')?.textContent).not.toContain('.rle')
    expect(host.querySelector('.ds-virtual-list')?.textContent).not.toContain('2 个用途定义')
    expect(host.querySelector('.ds-virtual-list')?.textContent).not.toContain('四向')
    expect(host.querySelector('.ds-virtual-list')?.textContent).not.toContain('默认定格')
    expect(host.querySelector('.ds-virtual-list')?.textContent).toContain('待定义')
    expect(
      host.querySelector('[role="combobox"][aria-label="按用途与实例行为筛选源帧资源"]'),
    ).not.toBeNull()
    expect(
      [...host.querySelectorAll('.sprite-resource-row .ds-catalog-row__meta')].map(
        (meta) => meta.textContent,
      ),
    ).toEqual(['sprite.raw', 'sprite.shared'])
    const upload = host.querySelector('.ds-list-header__action[aria-label="导入源帧资源"]')!
    const filter = host.querySelector('input[aria-label="过滤大世界精灵库"]')!
    expect(upload.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('空白资源标签和空用途名称回退为本地化类型标题，AssetId 仍在第二行', async () => {
    const blankCatalog = structuredClone(catalog)
    blankCatalog.assets['sprite.raw']!.label = '   '
    const session = new EditSession(editorState([]))
    await act(async () => root.render(library([], session, { view: 'asset', catalog: blankCatalog })))

    const row = [...host.querySelectorAll('.sprite-resource-row')].find(
      (candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === 'sprite.raw',
    )!
    expect(row.querySelector('.ds-catalog-row__title')?.textContent).toBe('未命名场景精灵')
    expect(row.querySelector('.ds-catalog-row__meta')?.textContent).toBe('sprite.raw')
  })

  test('定义深链聚焦其源文件，多用途在右侧切换而不是重复左侧行', async () => {
    const session = new EditSession(editorState(definitions))
    await act(async () =>
      root.render(library(definitions, session, { focusObjectId: 'hero-static' })),
    )

    expect(
      host.querySelector('[data-world-resource]')?.getAttribute('data-world-active-definition'),
    ).toBe('hero-static')
    const usageButtons = [
      ...host.querySelectorAll<HTMLButtonElement>(
        '[role="group"][aria-label="选择用途定义"] .ds-catalog-row',
      ),
    ]
    expect(
      usageButtons.find((candidate) => candidate.textContent?.includes('主角行走')),
    ).toBeDefined()
    expect(
      usageButtons
        .find((candidate) => candidate.textContent?.includes('主角静止'))
        ?.getAttribute('aria-pressed'),
    ).toBe('true')
  })

  test('未配置源文件直接显示全部原始帧，并能基于解码证明新增用途', async () => {
    const session = new EditSession(editorState([]))
    await act(async () =>
      root.render(
        library([], session, {
          view: 'asset',
          focusObjectId: 'sprite.raw',
        }),
      ),
    )

    expect(host.querySelector('[data-world-resource]')?.getAttribute('data-world-resource')).toBe(
      'sprite.raw',
    )
    await act(async () => button('动作').click())
    await act(async () => button('新增用途定义').click())
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '[role="group"][aria-label="新增用途类型"] button:last-child',
        )!
        .click(),
    )
    await act(async () => button('应用').click())

    expect(session.getState().sprites).toEqual([
      expect.objectContaining({
        asset: 'sprite.raw',
        layout: { kind: 'static' },
      }),
    ])
    expect(session.getState().assetCatalog).toBe(catalog)
  })

  test('源文件深链默认打开源文件 tab，同时保持已配置资源的帧工作区', async () => {
    const session = new EditSession(editorState(definitions))
    await act(async () =>
      root.render(
        library(definitions, session, {
          view: 'asset',
          focusObjectId: 'sprite.shared',
        }),
      ),
    )

    expect(button('源资源').getAttribute('aria-selected')).toBe('true')
    expect(host.querySelector('.world-sprite-inspector')?.textContent).toContain('sprite.shared')
    expect(host.querySelector('[data-world-resource="sprite.shared"]')).not.toBeNull()

    await act(async () => button('引用').click())
    const usageButtons = [
      ...host.querySelectorAll<HTMLButtonElement>(
        '#world-sprite-inspector-panel-references [role="group"][aria-label="选择要查看的用途定义"] .ds-catalog-row',
      ),
    ]
    expect(usageButtons).toHaveLength(2)
    expect(
      usageButtons
        .find((candidate) => candidate.textContent?.includes('主角行走'))
        ?.getAttribute('aria-pressed'),
    ).toBe('true')
    await act(async () =>
      usageButtons.find((candidate) => candidate.textContent?.includes('主角静止'))?.click(),
    )
    expect(
      host.querySelector('#world-sprite-inspector-panel-references')?.textContent,
    ).not.toContain('先选择一个用途定义')
  })

  test('从源资源进入动作时默认选中首个用途，不要求再次点击用途卡片', async () => {
    const session = new EditSession(editorState(definitions))
    await act(async () =>
      root.render(
        library(definitions, session, {
          view: 'asset',
          focusObjectId: 'sprite.shared',
        }),
      ),
    )

    expect(
      host.querySelector('[data-world-resource]')?.getAttribute('data-world-active-definition'),
    ).toBeNull()

    await act(async () => button('动作').click())

    expect(
      host.querySelector('[data-world-resource]')?.getAttribute('data-world-active-definition'),
    ).toBe('hero-walk')
    expect(
      [
        ...host.querySelectorAll<HTMLButtonElement>(
          '[role="group"][aria-label="选择用途定义"] .ds-catalog-row',
        ),
      ]
        .find((candidate) => candidate.textContent?.includes('主角行走'))
        ?.getAttribute('aria-pressed'),
    ).toBe('true')
  })

  test('受控地址回灌后仍停留在引用，不跳回动作', async () => {
    const session = new EditSession(editorState(definitions))
    function Harness() {
      const [location, setLocation] = useState<{
        view: 'definition' | 'asset'
        objectId: string
      }>({ view: 'asset', objectId: 'sprite.shared' })
      return library(definitions, session, {
        view: location.view,
        focusObjectId: location.objectId,
        onViewChange: (view, objectId) =>
          setLocation({ view, objectId: objectId ?? location.objectId }),
      })
    }
    await act(async () => root.render(<Harness />))

    await act(async () => button('引用').click())
    const usage = [
      ...host.querySelectorAll<HTMLButtonElement>(
        '#world-sprite-inspector-panel-references [role="group"][aria-label="选择要查看的用途定义"] .ds-catalog-row',
      ),
    ].find((candidate) => candidate.textContent?.includes('主角静止'))!
    await act(async () => usage.click())

    expect(button('引用').getAttribute('aria-selected')).toBe('true')
    expect(
      host.querySelector('#world-sprite-inspector-panel-references')?.hasAttribute('hidden'),
    ).toBe(false)
    expect(host.querySelector('#world-sprite-inspector-panel-layout')?.hasAttribute('hidden')).toBe(
      true,
    )
  })

  test('检查器 tab 使用单一 Tab 停靠点并支持方向键切换', async () => {
    const session = new EditSession(editorState(definitions))
    await act(async () => root.render(library(definitions, session)))
    await verifyInspectorTabs(host, '大世界精灵检查器', ['动作', /^引用 \d+$/, '源资源'])
  })

  test('current 世界状态外观和跟随队列分别说明其引用角色', async () => {
    const session = new EditSession(
      editorState([definitions[1]!], {
        scenes: [],
        scriptChunks: {},
        worlds: [
          {
            party: [
              {
                id: 'hero-save',
                template: 'hero',
                appearance: { spriteId: 'hero-static' },
              } as never,
            ],
            money: 0,
            learnedSkills: {},
            inventory: [],
            script: {
              flags: {},
              vars: {},
              entityState: {},
              behaviors: {},
              followers: ['hero-static'],
            },
          },
        ],
      }),
    )
    await act(async () =>
      root.render(library([definitions[1]!], session, { focusObjectId: 'hero-static' })),
    )

    await act(async () => button('引用').click())
    const text = host.querySelector('#world-sprite-inspector-panel-references')?.textContent ?? ''
    expect(text).toContain('世界状态 0 · 角色 hero-save 外观')
    expect(text).toContain('角色运行态外观')
    expect(text).toContain('世界状态 0 · 跟随者队列')
    expect(text).toContain('跟随队列外观')
  })

  test('动作引用按钮传出可编辑来源的精确 locator，而不是降级成定义级跳转', async () => {
    const actionDefinition: SpriteDef = {
      ...definitions[1]!,
      poses: {
        idle: {
          label: '待机',
          steps: [{ frame: 0, durationMs: 120 }],
          loopFrom: 0,
        },
      },
    }
    const session = new EditSession(
      editorState([actionDefinition], {
        scenes: [
          {
            id: 's-action',
            mapId: 'map-action',
            entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
            entities: [
              {
                id: 'e-action',
                sprite: actionDefinition.id,
                pos: { col: 1, row: 1, height: 0 },
                pages: [
                  {},
                  {
                    animation: {
                      sprite: actionDefinition.id,
                      action: 'idle',
                      loop: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
        scriptChunks: {},
      }),
    )
    const onJumpActionReference = vi.fn()
    await act(async () =>
      root.render(
        library([actionDefinition], session, {
          focusObjectId: actionDefinition.id,
          onJumpActionReference,
        }),
      ),
    )

    await act(async () => button('引用').click())
    const actionGroup = host
      .querySelector('[aria-label="选择动作查看引用"]')
      ?.closest('.ds-reference-group')
    expect(actionGroup).not.toBeNull()
    const actionReference = actionGroup!.querySelector<HTMLButtonElement>(
      '.ds-reference-row[data-actionable="true"]',
    )!
    expect(actionReference.tagName).toBe('BUTTON')
    await act(async () => actionReference.click())
    expect(onJumpActionReference).toHaveBeenCalledWith(
      expect.objectContaining({
        sprite: actionDefinition.id,
        action: 'idle',
        locator: {
          kind: 'page-animation',
          sceneId: 's-action',
          entityId: 'e-action',
          pageIndex: 1,
        },
      }),
    )
  })

  test('引用页切换动作只筛选当前引用，不会跳回动作编辑页', async () => {
    const actionDefinition: SpriteDef = {
      ...definitions[1]!,
      poses: {
        idle: {
          label: '待机',
          order: 0,
          steps: [{ frame: 0, durationMs: 120 }],
          loopFrom: 0,
        },
        wave: {
          label: '挥手',
          order: 1,
          steps: [{ frame: 1, durationMs: 160 }],
        },
      },
    }
    const session = new EditSession(
      editorState([actionDefinition], {
        scenes: [
          {
            id: 's-action',
            mapId: 'map-action',
            entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
            entities: [
              {
                id: 'e-action',
                sprite: actionDefinition.id,
                pos: { col: 1, row: 1, height: 0 },
                pages: [
                  {
                    animation: { sprite: actionDefinition.id, action: 'idle', loop: true },
                  },
                  {
                    animation: { sprite: actionDefinition.id, action: 'wave', loop: false },
                  },
                ],
              },
            ],
          },
        ],
        scriptChunks: {},
      }),
    )
    const onActionFocus = vi.fn()
    await act(async () =>
      root.render(
        library([actionDefinition], session, {
          focusObjectId: actionDefinition.id,
          onActionFocus,
        }),
      ),
    )

    await act(async () => button('引用').click())
    onActionFocus.mockClear()
    const waveButton = [
      ...host.querySelectorAll<HTMLButtonElement>('[aria-label="选择动作查看引用"] button'),
    ].find((candidate) => candidate.textContent?.includes('挥手'))!
    await act(async () => waveButton.click())

    expect(onActionFocus).not.toHaveBeenCalled()
    expect(
      host.querySelector('#world-sprite-inspector-panel-references')?.hasAttribute('hidden'),
    ).toBe(false)
    const actionGroup = host
      .querySelector('[aria-label="选择动作查看引用"]')
      ?.closest('.ds-reference-group')
    expect(actionGroup?.querySelector('.ds-reference-group__title')?.textContent).toBe('动作引用')
    expect(actionGroup?.querySelector('.ds-reference-group__count')?.textContent).toBe('2')
    expect(waveButton.getAttribute('aria-pressed')).toBe('true')
    expect(actionGroup?.querySelector('.ds-reference-row')?.textContent).toContain(
      'pages[1].animation.action',
    )
  })

  test('PAL 兼容实例脚本只在引用页展示，不与中心动作重复', async () => {
    const scriptRef = {
      chunk: 'scene/s020',
      id: 'scene/s020/root/entity-e364/page-0/auto/stage-0',
    }
    const session = new EditSession(
      editorState([definitions[1]!], {
        scenes: [
          {
            id: 's020',
            mapId: 'map-20',
            entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
            entities: [
              {
                id: 'e364',
                pos: { col: 1, row: 2, height: 0 },
                sprite: 'hero-static',
                pages: [
                  {
                    auto: {
                      stages: [{ body: [{ kind: 'callScript', ref: scriptRef }] }],
                    },
                  },
                ],
              },
            ],
          },
        ],
        scriptChunks: {
          'scene/s020': {
            version: 1,
            id: 'scene/s020',
            scripts: {
              [scriptRef.id]: [
                { kind: 'setEntityFrame', entity: 'e364', frame: 1 },
                { kind: 'setEntityFrame', entity: 'e364', frame: 2 },
                { kind: 'setEntityFrame', entity: 'e364', frame: 3 },
                { kind: 'jumpScript', ref: scriptRef },
              ],
            },
          },
        },
      }),
    )
    const onJumpReference = vi.fn()
    const onJumpAutomaticScriptInstance = vi.fn()
    await act(async () =>
      root.render(
        library([definitions[1]!], session, {
          focusObjectId: 'hero-static',
          onJumpReference,
          onJumpAutomaticScriptInstance,
        }),
      ),
    )

    expect(host.querySelector('.ds-virtual-list')?.textContent).not.toContain('自动脚本')
    expect(host.querySelector('[data-world-resource]')?.textContent).not.toContain('自动脚本切帧')
    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含自动脚本')
    expect(host.querySelectorAll('.world-sprite-outliner .sprite-resource-row')).toHaveLength(1)
    expect(host.querySelector('.ds-virtual-list')?.textContent).toContain('共享精灵帧')

    await act(async () => button('引用').click())
    expect(host.querySelector('.world-sprite-inspector')?.textContent).toContain(
      '场景 s020 · 实体 e364',
    )
    expect(host.querySelector('.world-sprite-inspector')?.textContent).toContain('实例行为脚本')
    const referenceButton = [
      ...host.querySelectorAll<HTMLButtonElement>('.ds-reference-row[data-actionable="true"]'),
    ].find((candidate) => candidate.textContent?.includes('编辑自动脚本'))!
    await act(async () => referenceButton.click())
    expect(onJumpAutomaticScriptInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        site: 'scene:s020:entity:e364',
        spriteId: 'hero-static',
        sceneId: 's020',
        entityId: 'e364',
      }),
    )
    expect(onJumpReference).not.toHaveBeenCalled()
  })

  test('预制循环动作与实例自动脚本保持两套独立筛选语义', async () => {
    const loopDefinition: SpriteDef = {
      id: 'authored-loop',
      label: '作者循环',
      asset: 'sprite.raw',
      layout: { kind: 'static' },
      poses: {
        flame: {
          label: '火焰循环',
          steps: [0, 1, 2, 3].map((frame) => ({ frame, durationMs: 100 })),
          loopFrom: 0,
        },
      },
    }
    const entries = [...definitions, loopDefinition]
    const session = new EditSession(editorState(entries))
    await act(async () => root.render(library(entries, session)))

    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含循环动作')
    expect(host.querySelectorAll('.world-sprite-outliner .sprite-resource-row')).toHaveLength(1)
    expect(host.querySelector('.ds-virtual-list')?.textContent).toContain('未配置精灵帧')

    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含自动脚本')
    expect(host.querySelectorAll('.world-sprite-outliner .sprite-resource-row')).toHaveLength(0)
  })

  test('actor 场景实例的自动脚本也会命中其外观用途', async () => {
    const session = new EditSession(
      editorState(definitions, {
        actors: [
          {
            id: 'hero',
            name: 'hero-name',
            spriteId: 'hero-static',
          },
        ],
        scenes: [
          {
            id: 's001',
            mapId: 'map-1',
            entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
            entities: [
              {
                id: 'hero-instance',
                pos: { col: 1, row: 1, height: 0 },
                actor: 'hero',
                pages: [{ auto: { stages: [{ body: [] }] } }],
              },
            ],
          },
        ],
        scriptChunks: {},
      }),
    )
    await act(async () => root.render(library(definitions, session)))

    await chooseSelectOption('按用途与实例行为筛选源帧资源', '含自动脚本')
    expect(host.querySelectorAll('.world-sprite-outliner .sprite-resource-row')).toHaveLength(1)
    expect(host.querySelector('.ds-virtual-list')?.textContent).toContain('共享精灵帧')
  })
})
