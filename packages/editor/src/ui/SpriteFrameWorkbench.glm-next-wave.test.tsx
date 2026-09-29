// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-F-1 F04b：SpriteFrameWorkbench 的 RawFrameInspector（源帧检查器）。
 * 去重：SpriteFrameWorkbench.test.tsx 五例只证 SemanticFrameShelf/InstanceBehaviorShelf/
 * 共享源帧 picker 键盘与拖拽 payload；本文件只补当前公开合同仍未证明的检查器本体：
 * 当前帧切换边界禁用回显、N/M output、单帧删除禁用原因、共享/无用途提示与编辑消息角色。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useActEnvironment } from './__tests__/glm-ui-wave-kit.js'
import { RawFrameInspector, type SpriteFrameView } from './SpriteFrameWorkbench.js'

function frameView(size: number, color: string): SpriteFrameView {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  context?.fillRect(0, 0, size, size)
  if (context) context.fillStyle = color
  return { canvas, width: size, height: size }
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  useActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

function buttonByLabel(label: string): HTMLButtonElement {
  const hit =
    host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`) ??
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === label,
    )
  expect(hit, `button ${label}`).not.toBeNull()
  return hit!
}

interface RenderOptions {
  frames?: readonly SpriteFrameView[]
  selectedFrame?: number
  consumerCount?: number
  onDelete?: () => void
  editorMessage?: string
  editorMessageKind?: 'info' | 'error'
  showHero?: boolean
}

async function renderInspector(options: RenderOptions = {}): Promise<void> {
  const frames = options.frames ?? [
    frameView(8, '#f00'),
    frameView(16, '#0f0'),
    frameView(10, '#00f'),
  ]
  await act(async () => {
    root.render(
      <RawFrameInspector
        label="占位主角"
        asset="sprite.generated.starter"
        frames={frames}
        selectedFrame={options.selectedFrame ?? 0}
        consumerCount={options.consumerCount ?? 2}
        onSelect={() => undefined}
        onDelete={options.onDelete}
        editorMessage={options.editorMessage}
        editorMessageKind={options.editorMessageKind}
        showHero={options.showHero}
      />,
    )
  })
}

describe('F04 RawFrameInspector 源帧检查器回显', () => {
  test('当前帧切换在首末帧禁用并回显 N/M 与像素尺寸', async () => {
    const onSelect = vi.fn()
    await act(async () => {
      root.render(
        <RawFrameInspector
          label="占位主角"
          asset="sprite.generated.starter"
          frames={[frameView(8, '#f00'), frameView(16, '#0f0'), frameView(10, '#00f')]}
          selectedFrame={0}
          consumerCount={2}
          onSelect={onSelect}
        />,
      )
    })
    expect(buttonByLabel('上一帧').disabled).toBe(true)
    expect(buttonByLabel('下一帧').disabled).toBe(false)
    expect(host.querySelector('output')?.textContent).toBe('1 / 3')
    expect(host.textContent).toContain('帧 #0')
    expect(host.textContent).toContain('8 × 8 px')
    expect(host.querySelector<HTMLElement>('[aria-label="占位主角 第 0 帧"]')).not.toBeNull()
    await act(async () => buttonByLabel('下一帧').click())
    expect(onSelect).toHaveBeenCalledWith(1)
    await act(async () => {
      root.render(
        <RawFrameInspector
          label="占位主角"
          asset="sprite.generated.starter"
          frames={[frameView(8, '#f00'), frameView(16, '#0f0'), frameView(10, '#00f')]}
          selectedFrame={2}
          consumerCount={2}
          onSelect={onSelect}
        />,
      )
    })
    expect(buttonByLabel('下一帧').disabled).toBe(true)
    expect(host.querySelector('output')?.textContent).toBe('3 / 3')
    expect(host.textContent).toContain('10 × 10 px')
  })

  test('单帧资产禁用删除并给出保留原因，多帧时删除可用', async () => {
    const onDelete = vi.fn()
    await renderInspector({
      frames: [frameView(8, '#f00')],
      onDelete,
    })
    const remove = buttonByLabel('删除当前帧')
    expect(remove.disabled).toBe(true)
    expect(remove.title).toBe('源帧至少保留一帧')
    await renderInspector({ onDelete })
    expect(buttonByLabel('删除当前帧').disabled).toBe(false)
    expect(buttonByLabel('删除当前帧').title).toBe('删除当前帧')
  })

  test('共享与无用途提示按 consumerCount 切换，编辑消息按级别使用 alert/status', async () => {
    await renderInspector({ consumerCount: 2 })
    expect(host.textContent).toContain('这 3 帧由 2 个用途共享；修改源帧会同时影响它们。')
    expect(host.textContent).toContain('3 帧 · 2 个用途定义')
    await renderInspector({ consumerCount: 0 })
    expect(host.textContent).toContain('这 3 帧尚未设置用途，仍可直接编辑、保留或删除源资源。')
    await renderInspector({ editorMessage: '替换的图片尺寸不一致', editorMessageKind: 'error' })
    const alert = host.querySelector<HTMLParagraphElement>('p.sprite-raw-editor-message')
    expect(alert?.getAttribute('role')).toBe('alert')
    expect(alert?.classList.contains('error')).toBe(true)
    expect(alert?.textContent).toBe('替换的图片尺寸不一致')
    await renderInspector({ editorMessage: '已载入 3 帧', editorMessageKind: 'info' })
    const status = host.querySelector<HTMLParagraphElement>('p.sprite-raw-editor-message')
    expect(status?.getAttribute('role')).toBe('status')
    expect(status?.classList.contains('error')).toBe(false)
  })

  test('showHero=false 时不再重复资源身份头', async () => {
    await renderInspector({ showHero: false })
    expect(host.querySelector('.ds-object-hero')).toBeNull()
    expect(host.querySelector('section[aria-label="源帧检查器"]')).not.toBeNull()
  })
})
