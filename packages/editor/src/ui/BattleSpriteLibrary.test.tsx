// @vitest-environment jsdom
import type { AssetCatalogV1, BattleSpriteDef } from '@type-pal/content'
import { act, type DragEvent as ReactDragEvent } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { BattleSpriteResourceSnapshot } from './BattleSpriteInlinePreview.js'
import { BattleSpriteLibrary } from './BattleSpriteLibrary.js'
import type { SemanticFrameGroup } from './SpriteFrameWorkbench.js'

const previewRender = vi.hoisted(() => vi.fn())
const previewFrameCount = vi.hoisted(() => ({ value: 11 }))

vi.mock('./BattleSpriteInlinePreview.js', async () => {
  const React = await import('react')
  return {
    BattleSpriteInlinePreview: (props: {
      asset?: string
      definition?: BattleSpriteDef
      label?: string
      displayId?: string
      frameSequence?: readonly number[]
      layout?: 'compact' | 'library'
      playAllFrames?: boolean
      showAllFrames?: boolean
      semanticGroups?: readonly SemanticFrameGroup[]
      activeDefinitionId?: string
      onFrameSelect?: (index: number) => void
      onRawFrameDragStart?: (event: ReactDragEvent<HTMLButtonElement>, index: number) => void
      onResourceLoaded?: (snapshot: BattleSpriteResourceSnapshot) => void
      onLoaded?: (proof: {
        asset: string
        sha256: string
        actualFrameCount: number
        frames: never[]
      }) => void
    }) => {
      previewRender(props)
      const asset = props.definition?.asset ?? props.asset
      const frameCount = previewFrameCount.value
      React.useEffect(() => {
        if (!asset) return
        props.onLoaded?.({
          asset,
          sha256: asset === 'battle-sprite.shared' ? 'a'.repeat(64) : 'b'.repeat(64),
          actualFrameCount: frameCount,
          frames: [],
        })
        props.onResourceLoaded?.({
          frames: Array.from(
            { length: frameCount },
            () => ({}) as BattleSpriteResourceSnapshot['frames'][number],
          ),
          palette: {
            colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
            cycles: [],
          },
          baked: [],
        })
      }, [asset, frameCount, props.definition?.id, props.onLoaded, props.onResourceLoaded])
      return (
        <div data-preview={`raw:${props.asset}`} data-active-definition={props.activeDefinitionId}>
          {props.onFrameSelect ? (
            <>
              <button type="button" onClick={() => props.onFrameSelect?.(4)}>
                选择帧 #4
              </button>
              <button type="button" onClick={() => props.onFrameSelect?.(10)}>
                选择帧 #10
              </button>
              <button
                type="button"
                draggable
                onDragStart={(event) => props.onRawFrameDragStart?.(event, 4)}
              >
                拖动帧 #4
              </button>
            </>
          ) : null}
        </div>
      )
    },
  }
})

vi.mock('./BattleSpriteUploader.js', () => ({
  BattleSpriteUploader: () => <div data-uploader />,
}))

const playerProfile: Extract<BattleSpriteDef['profile'], { kind: 'player-fighter' }> = {
  kind: 'player-fighter',
  frames: {
    idle: 0,
    dying: 1,
    dead: 2,
    defend: 3,
    hurt: 4,
    preMagic: 5,
    magic: 6,
    attackWindup: 7,
    attackRush: 8,
    attackStrike: 9,
    steal: 10,
  },
  castEffectBase: 0,
  attackEffectBase: 0,
}

const definitions: BattleSpriteDef[] = [
  {
    id: 'fighter-a',
    label: '甲战士',
    asset: 'battle-sprite.shared',
    profile: structuredClone(playerProfile),
  },
  {
    id: 'fighter-b',
    label: '乙战士',
    asset: 'battle-sprite.shared',
    profile: structuredClone(playerProfile),
  },
]

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'battle-sprite.aaa-unrelated': {
      kind: 'battle-sprite',
      label: '未配置战斗帧',
      path: 'assets/authored/battle-sprites/unrelated.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 2,
      sha256: 'b'.repeat(64),
      origin: { kind: 'authored' },
    },
    'battle-sprite.shared': {
      kind: 'battle-sprite',
      label: '共享战斗帧',
      path: 'assets/authored/battle-sprites/shared.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 2,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' },
    },
  },
}

function state(entries: readonly BattleSpriteDef[]): EditorState {
  return {
    manifest: { assets: { roles: {} } } as never,
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [...entries],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: catalog,
    assetBlobs: {},
    stamps: [],
    scriptChunks: {},
  } as EditorState
}

function button(text: string): HTMLButtonElement {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )!
}

function buttonContaining(text: string): HTMLButtonElement {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

async function changeInput(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previewRender.mockClear()
  previewFrameCount.value = 11
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

function library(
  entries: readonly BattleSpriteDef[],
  options: {
    view?: 'definition' | 'asset'
    focusObjectId?: string
    onViewChange?: (view: 'definition' | 'asset', objectId?: string) => void
    onObjectFocus?: (objectId: string | undefined) => void
  } = {},
) {
  return (
    <BattleSpriteLibrary
      definitions={entries}
      catalog={catalog}
      assetBase={{} as never}
      assetReader={{} as never}
      session={new EditSession(state(entries))}
      tabBar={null}
      view={options.view ?? 'definition'}
      focusObjectId={options.focusObjectId}
      onViewChange={options.onViewChange ?? vi.fn()}
      onObjectFocus={options.onObjectFocus}
      onWorldDomain={vi.fn()}
    />
  )
}

describe('BattleSpriteLibrary', () => {
  test('源文件和用途合并为一份资源列表，导入入口位于筛选器上方', async () => {
    await act(async () => root.render(library(definitions)))

    const rows = host.querySelectorAll('.battle-sprite-resource-row')
    expect(rows).toHaveLength(2)
    expect(host.querySelector('.sprite-library-switch')).toBeNull()
    expect(host.querySelector('.sprite-list')?.textContent).not.toContain('battle-sprite.shared')
    expect(host.querySelector('.sprite-list')?.textContent).not.toContain('.rle')
    expect(host.querySelector('.sprite-list')?.textContent).toContain('玩家战斗')
    expect(host.querySelector('.sprite-list')?.textContent).toContain('未配置')
    expect(
      [...host.querySelectorAll('.sprite-resource-tags em')].filter(
        (tag) => tag.textContent === '玩家战斗',
      ),
    ).toHaveLength(1)

    const upload = host.querySelector('.sprite-upload-action')!
    const filter = host.querySelector('.battle-sprite-filter')!
    expect(upload.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await act(async () => button('源文件').click())
    expect(host.querySelector('.inspector')?.textContent).toContain('battle-sprite.shared')
  })

  test('未配置源文件直接预览，不伪造召唤用途', async () => {
    await act(async () =>
      root.render(
        library([], {
          view: 'asset',
          focusObjectId: 'battle-sprite.aaa-unrelated',
        }),
      ),
    )

    expect(previewRender.mock.calls.at(-1)?.[0]).toMatchObject({
      asset: 'battle-sprite.aaa-unrelated',
      semanticGroups: [],
    })
    expect(host.querySelector('[data-preview]')?.getAttribute('data-preview')).toBe(
      'raw:battle-sprite.aaa-unrelated',
    )
  })

  test('给共享帧源新增用途时，预览显示新草稿身份而不是旧用途', async () => {
    await act(async () => root.render(library(definitions)))
    await act(async () => button('＋ 新增用途').click())
    const usageMenu = host.querySelector<HTMLFieldSetElement>('[aria-label="新增用途类型"]')!
    const enemyUsage = [...usageMenu.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '敌人',
    )!
    await act(async () => enemyUsage.click())

    const preview = previewRender.mock.calls.at(-1)?.[0]
    expect(preview).toMatchObject({ asset: 'battle-sprite.shared' })
    expect(preview.semanticGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'battle-sprite-enemy',
          label: '共享战斗帧 · 敌人',
          typeLabel: '敌人',
          active: true,
        }),
      ]),
    )
  })

  test('当前用途被撤销或删除后回落到同一资源仍存在的第一项', async () => {
    const onViewChange = vi.fn()
    const onObjectFocus = vi.fn()
    await act(async () => root.render(library(definitions, { onViewChange, onObjectFocus })))
    expect(document.querySelector('.inspector')?.textContent).toContain('甲战士')

    await act(async () => root.render(library([definitions[1]!], { onViewChange, onObjectFocus })))
    expect(
      document.querySelector<HTMLInputElement>('.inspector input[aria-label="战斗精灵用途名称"]')
        ?.value,
    ).toBe('乙战士')
    expect(document.querySelector('[data-preview]')?.getAttribute('data-active-definition')).toBe(
      'fighter-b',
    )
    expect(onViewChange).toHaveBeenLastCalledWith('definition', 'fighter-b')
    expect(onObjectFocus).toHaveBeenLastCalledWith('fighter-b')
  })

  test('共享同一源文件的两个用途切换时草稿不会串到另一项', async () => {
    await act(async () => root.render(library(definitions)))
    const labelInput = document.querySelector<HTMLInputElement>(
      '.inspector input[aria-label="战斗精灵用途名称"]',
    )!
    await changeInput(labelInput, '甲的未提交草稿')
    expect(labelInput.value).toBe('甲的未提交草稿')

    await act(async () => button('乙战士').click())
    expect(
      document.querySelector<HTMLInputElement>('.inspector input[aria-label="战斗精灵用途名称"]')
        ?.value,
    ).toBe('乙战士')
    await act(async () => button('甲战士').click())
    expect(
      document.querySelector<HTMLInputElement>('.inspector input[aria-label="战斗精灵用途名称"]')
        ?.value,
    ).toBe('甲战士')
  })

  test('我方原版动作阶段顺序固定，可用已选帧或拖放精确替换', async () => {
    await act(async () => root.render(library([definitions[0]!])))
    expect(previewRender.mock.calls.at(-1)?.[0]).toMatchObject({ layout: 'library' })
    expect(button('全部帧循环')).toBeUndefined()

    await act(async () => buttonContaining('普通攻击').click())
    expect(host.querySelector('.battle-action-stage-editor')?.textContent).toContain(
      '原版兼容 · 固定 3 槽',
    )
    expect(host.querySelector('.battle-action-stage-list [draggable="true"]')).toBeNull()
    const actionFrames = (label: string): readonly number[] | undefined =>
      previewRender.mock.calls
        .at(-1)?.[0]
        .semanticGroups?.[0]?.rows.find((row: { label: string }) => row.label === label)?.frames
    expect(actionFrames('普通攻击')).toEqual([7, 8, 9, 0])
    await act(async () => button('选择帧 #4').click())
    expect(actionFrames('普通攻击')).toEqual([7, 8, 9, 0])
    const stages = [...host.querySelectorAll<HTMLLIElement>('.battle-action-stage-list > li')]
    const rush = stages.find((item) => item.textContent?.includes('冲刺'))!
    await act(async () =>
      [...rush.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('用已选 #4'))
        ?.click(),
    )
    expect(actionFrames('普通攻击')).toEqual([7, 4, 9, 0])

    const transfer = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      types: [],
      setData: (type: string, value: string) => transfer.set(type, value),
      getData: (type: string) => transfer.get(type) ?? '',
    } as unknown as DataTransfer
    const dispatchDrag = (target: Element, type: string): void => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
      target.dispatchEvent(event)
    }
    await act(async () => dispatchDrag(button('拖动帧 #4'), 'dragstart'))
    const strike = stages.find((item) => item.textContent?.includes('命中'))!
    await act(async () => dispatchDrag(strike, 'drop'))
    expect(actionFrames('普通攻击')).toEqual([7, 4, 4, 0])
    expect(host.querySelector('.battle-action-end-behavior')?.textContent).toContain(
      '由待机动作派生，不占用当前动作槽位',
    )

    await act(async () => buttonContaining('施法').click())
    expect(actionFrames('施法')).toEqual([5, 6, 0])
    await act(async () => buttonContaining('防御').click())
    expect(actionFrames('防御')).toEqual([3])
    await act(async () => buttonContaining('偷窃').click())
    expect(actionFrames('偷窃')).toEqual([10, 0])
  })

  test('原始帧缩短后会同步收紧右侧已选帧，不保留越界索引', async () => {
    await act(async () => root.render(library([definitions[0]!])))
    await act(async () => button('选择帧 #10').click())
    expect(host.querySelector('.battle-action-stage-controls')?.textContent).toContain('用已选 #10')

    previewFrameCount.value = 10
    await act(async () => root.render(library([definitions[0]!])))
    expect(host.querySelector('.battle-action-stage-controls')?.textContent).toContain('用已选 #9')
  })

  test('敌人攻击预览包含一阶段真值的前导待机帧', async () => {
    const enemy: BattleSpriteDef = {
      id: 'enemy-a',
      label: '敌人甲',
      asset: 'battle-sprite.shared',
      profile: {
        kind: 'enemy',
        idle: { start: 0, count: 2 },
        magic: { start: 2, count: 1 },
        attack: { start: 3, count: 2 },
        idleTicksPerFrame: 5,
        actTicksPerFrame: 1,
      },
    }
    await act(async () => root.render(library([enemy])))
    const attack = previewRender.mock.calls
      .at(-1)?.[0]
      .semanticGroups?.[0]?.rows.find((row: { label: string }) => row.label === '攻击')
    expect(attack?.frames).toEqual([2, 3, 4])
  })
})
