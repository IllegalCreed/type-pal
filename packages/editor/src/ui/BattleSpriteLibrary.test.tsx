// @vitest-environment jsdom
import type { AssetCatalogV1, BattleSpriteDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { BattleSpriteLibrary } from './BattleSpriteLibrary.js'

const previewRender = vi.hoisted(() => vi.fn())

vi.mock('./BattleSpriteInlinePreview.js', async () => {
  const React = await import('react')
  return {
    BattleSpriteInlinePreview: (props: {
      definition?: BattleSpriteDef
      frameSequence?: readonly number[]
      onLoaded?: (proof: {
        asset: string
        sha256: string
        actualFrameCount: number
        frames: never[]
      }) => void
    }) => {
      previewRender(props)
      React.useEffect(() => {
        if (!props.definition) return
        props.onLoaded?.({
          asset: props.definition.asset,
          sha256: 'a'.repeat(64),
          actualFrameCount: 10,
          frames: [],
        })
      }, [props.definition?.asset, props.definition?.id])
      return <div data-preview={props.definition?.id} />
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
      path: 'assets/authored/battle-sprites/unrelated.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 2,
      sha256: 'b'.repeat(64),
      origin: { kind: 'authored' },
    },
    'battle-sprite.shared': {
      kind: 'battle-sprite',
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
  previewRender.mockClear()
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
      view="definition"
      onViewChange={options.onViewChange ?? vi.fn()}
      onObjectFocus={options.onObjectFocus}
      onWorldDomain={vi.fn()}
    />
  )
}

describe('BattleSpriteLibrary', () => {
  test('从定义切到二进制视图时聚焦当前定义实际引用的 AssetId', async () => {
    const onViewChange = vi.fn()
    await act(async () => root.render(library(definitions, { onViewChange })))

    await act(async () => button('二进制资源').click())

    expect(onViewChange).toHaveBeenLastCalledWith('asset', 'battle-sprite.shared')
  })

  test('当前定义被撤销/删除后回落到仍存在的第一项', async () => {
    const onViewChange = vi.fn()
    const onObjectFocus = vi.fn()
    await act(async () => root.render(library(definitions, { onViewChange, onObjectFocus })))
    expect(document.querySelector('.inspector')?.textContent).toContain('甲战士')

    await act(async () => root.render(library([definitions[1]!], { onViewChange, onObjectFocus })))
    expect(document.querySelector('.inspector')?.textContent).toContain('乙战士')
    expect(document.querySelector('[data-preview]')?.getAttribute('data-preview')).toBe('fighter-b')
    expect(onViewChange).toHaveBeenLastCalledWith('definition', 'fighter-b')
    expect(onObjectFocus).toHaveBeenLastCalledWith('fighter-b')
  })

  test('共享同一 AssetId 的两个定义切换时草稿不会串到另一项', async () => {
    await act(async () => root.render(library(definitions)))
    const labelInput = document.querySelector<HTMLInputElement>(
      '.inspector input.in:not([type="number"])',
    )!
    await changeInput(labelInput, '甲的未提交草稿')
    expect(labelInput.value).toBe('甲的未提交草稿')

    await act(async () => button('乙战士').click())
    expect(
      document.querySelector<HTMLInputElement>('.inspector input.in:not([type="number"])')?.value,
    ).toBe('乙战士')
    await act(async () => button('甲战士').click())
    expect(
      document.querySelector<HTMLInputElement>('.inspector input.in:not([type="number"])')?.value,
    ).toBe('甲战士')
  })

  test('命名动作按钮把 ABI 帧序列传给真实预览，而非只改样式', async () => {
    await act(async () => root.render(library([definitions[0]!])))
    await act(async () => button('攻击命中').click())
    expect(previewRender.mock.calls.at(-1)?.[0].frameSequence).toEqual([9])
    await act(async () => button('攻击蓄力').click())
    expect(previewRender.mock.calls.at(-1)?.[0].frameSequence).toEqual([7])
    await act(async () => button('全部帧循环').click())
    expect(previewRender.mock.calls.at(-1)?.[0].frameSequence).toBeUndefined()
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
        attack: { start: 4, count: 2 },
        idleTicksPerFrame: 5,
        actTicksPerFrame: 1,
      },
    }
    await act(async () => root.render(library([enemy])))
    await act(async () => button('攻击').click())
    expect(previewRender.mock.calls.at(-1)?.[0].frameSequence).toEqual([3, 4, 5])
  })
})
