// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C06-G06：EntityPageAnimationFields 选择恢复 / 失效清理 / 草稿归属。
 */
import type { EntityPage, SpriteActionBinding, SpriteDef } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  type MountedEntityPageAnimation,
  mountEntityPageAnimation,
  unmountEntityPageAnimation,
} from '../__tests__/cursor-asset-r1/entity-page-animation-harness.js'
import { fillAndBlur, stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'

async function pickComboboxByLabelFragment(trigger: HTMLElement, fragment: string): Promise<void> {
  await act(async () => trigger.click())
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
    candidate.textContent?.includes(fragment),
  )
  expect(option, `option ∋ ${fragment}`).toBeDefined()
  await act(async () => option!.click())
}

import { EntityPageAnimationFields } from './EntityPageAnimationEditor.js'

const spriteA: SpriteDef = {
  id: 'sprite.c06.a',
  asset: 'sprite.pal.a',
  label: '甲',
  layout: { kind: 'static' },
  poses: {
    walk: { label: '走', order: 1, steps: [{ frame: 0, durationMs: 100 }] },
    run: { label: '跑', order: 2, steps: [{ frame: 1, durationMs: 80 }], loopFrom: 0 },
  },
}

const spriteB: SpriteDef = {
  id: 'sprite.c06.b',
  asset: 'sprite.pal.b',
  label: '乙',
  layout: { kind: 'static' },
  poses: {
    spin: { label: '旋', order: 1, steps: [{ frame: 0, durationMs: 120 }], loopFrom: 0 },
  },
}

function InvalidHarness(props: { changes: Array<SpriteActionBinding | undefined> }) {
  const [page, setPage] = useState<EntityPage>({
    animation: { sprite: 'wrong', action: 'missing', loop: true },
  })
  return (
    <EntityPageAnimationFields
      page={page}
      sprite={spriteA}
      onChange={(binding) => {
        props.changes.push(binding)
        setPage(binding ? { animation: binding } : {})
      }}
    />
  )
}

let mounted: MountedEntityPageAnimation | undefined
let invalidRoot: Root | undefined
let invalidHost: HTMLDivElement | undefined

beforeEach(async () => {
  await stubNodeTestHost()
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
})

afterEach(async () => {
  if (invalidRoot) {
    await act(async () => invalidRoot!.unmount())
    invalidHost?.remove()
    invalidRoot = undefined
    invalidHost = undefined
  }
  if (mounted) {
    await unmountEntityPageAnimation(mounted)
    mounted = undefined
  }
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function enablePreset(m: MountedEntityPageAnimation): Promise<void> {
  const box = m.host.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  await act(async () => box.click())
}

test('C06-G06-01 启用后默认选中 walk 且 loop=false', async () => {
  mounted = await mountEntityPageAnimation(spriteA)
  await enablePreset(mounted)
  expect(mounted.changes.at(-1)).toEqual({ sprite: 'sprite.c06.a', action: 'walk', loop: false })
})

test('C06-G06-02 切换动作到 run：loop 跟随为 true', async () => {
  mounted = await mountEntityPageAnimation(spriteA)
  await enablePreset(mounted)
  const select = mounted.host.querySelector<HTMLButtonElement>('[aria-label="页面默认动作"]')!
  await pickComboboxByLabelFragment(select, '跑')
  expect(mounted.changes.at(-1)).toEqual({ sprite: 'sprite.c06.a', action: 'run', loop: true })
})

test('C06-G06-03 换 sprite 后重新启用：binding 指向新精灵首动作', async () => {
  mounted = await mountEntityPageAnimation(spriteA)
  await enablePreset(mounted)
  await mounted.setSprite(spriteB)
  await enablePreset(mounted)
  expect(mounted.changes.at(-1)).toEqual({ sprite: 'sprite.c06.b', action: 'spin', loop: true })
})

test('C06-G06-04 换 pageIndex：新页相位字段回到 0', async () => {
  mounted = await mountEntityPageAnimation(spriteA, 0)
  await enablePreset(mounted)
  const phase = mounted.host.querySelector<HTMLInputElement>('[aria-label="动作起始相位（毫秒）"]')!
  await fillAndBlur(phase, '120')
  await mounted.setPageIndex(1)
  await enablePreset(mounted)
  const phase2 = mounted.host.querySelector<HTMLInputElement>(
    '[aria-label="动作起始相位（毫秒）"]',
  )!
  expect(phase2.value).toBe('0')
})

test('C06-G06-05 关闭预制动作：binding 清空', async () => {
  mounted = await mountEntityPageAnimation(spriteA)
  await enablePreset(mounted)
  await act(async () =>
    mounted!.host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  )
  expect(mounted.changes.at(-1)).toBeUndefined()
})

test('C06-G06-06 悬空 binding：显示失效占位且禁用打开动作', async () => {
  const changes: Array<SpriteActionBinding | undefined> = []
  invalidHost = document.createElement('div')
  document.body.append(invalidHost)
  invalidRoot = createRoot(invalidHost)
  await act(async () => {
    invalidRoot!.render(<InvalidHarness changes={changes} />)
  })
  expect(invalidHost.textContent).toContain('wrong/missing（引用失效）')
  const open = [...invalidHost.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('打开动作'),
  )!
  expect(open.disabled).toBe(true)
})

test('C06-G06-07 循环 checkbox 切换写入 binding', async () => {
  mounted = await mountEntityPageAnimation(spriteA)
  await enablePreset(mounted)
  const loop = mounted.host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1]!
  await act(async () => loop.click())
  expect(mounted.changes.at(-1)).toMatchObject({ action: 'walk', loop: true })
})

test('C06-G06-08 startAtMs 提交：0 清空字段', async () => {
  mounted = await mountEntityPageAnimation(spriteA)
  await enablePreset(mounted)
  const phase = mounted.host.querySelector<HTMLInputElement>('[aria-label="动作起始相位（毫秒）"]')!
  await fillAndBlur(phase, '0')
  expect(mounted.changes.at(-1)?.startAtMs).toBeUndefined()
})

test('C06-G06-09 无 sprite：开关禁用', async () => {
  mounted = await mountEntityPageAnimation(spriteA)
  await mounted.setSprite(undefined)
  expect(mounted.host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.disabled).toBe(
    true,
  )
})

test('C06-G06-10 无动作 pose：开关禁用', async () => {
  mounted = await mountEntityPageAnimation({
    ...spriteA,
    id: 'sprite.c06.empty',
    poses: {},
  })
  expect(mounted.host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.disabled).toBe(
    true,
  )
})

test('C06-G06-11 切换动作后打开按钮可用', async () => {
  mounted = await mountEntityPageAnimation(spriteA)
  await enablePreset(mounted)
  const select = mounted.host.querySelector<HTMLButtonElement>('[aria-label="页面默认动作"]')!
  await pickComboboxByLabelFragment(select, '跑')
  const open = [...mounted.host.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('打开动作'),
  )!
  expect(open.disabled).toBe(false)
})
