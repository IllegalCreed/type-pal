// @vitest-environment jsdom

import type { SpriteDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { catalogControlsEditorState } from './catalog-controls-test-utils.js'
import { SpriteActionEditorDialog } from './SpriteActionEditorDialog.js'

const sha256 = 'a'.repeat(64)
const frames = Array.from({ length: 4 }, () => ({
  canvas: undefined,
  width: 32,
  height: 48,
}))

function definition(actionCount = 1): SpriteDef {
  return {
    id: 'sprite.dialog',
    asset: 'sprite.test',
    label: '弹窗精灵',
    layout: { kind: 'static' },
    poses: Object.fromEntries(
      Array.from({ length: actionCount }, (_, index) => [
        index === 0 ? 'idle' : `action-${index + 1}`,
        {
          label: index === 0 ? '待机' : `动作 ${index + 1}`,
          order: index,
          steps: [{ frame: index % frames.length, durationMs: 250 }],
        },
      ]),
    ),
  }
}

function sessionFor(sprite: SpriteDef): EditSession {
  const state = catalogControlsEditorState({
    version: 1,
    assets: {
      'sprite.test': {
        kind: 'sprite',
        path: 'assets/authored/sprites/test.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: 8,
        sha256,
        origin: { kind: 'authored' },
      },
    },
  })
  state.sprites = [sprite]
  return new EditSession(state)
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TEST-GLM-WAVE-L-1 L04 sprite action dialog scope & save guards', () => {
  test('edit 模式下打开范围漂移（源资产变化）自动关窗且零命令', () => {
    const sprite = definition()
    const session = sessionFor(sprite)
    const onClose = vi.fn()
    const proof = { asset: 'sprite.test', sha256, actualFrameCount: frames.length }
    const drifted = { ...sprite, asset: 'sprite.other' as SpriteDef['asset'] }
    act(() =>
      root.render(
        <SpriteActionEditorDialog
          definition={sprite}
          liveDefinition={drifted}
          catalog={session.getState().assetCatalog}
          proof={proof}
          liveProof={proof}
          frames={frames}
          selectedSourceFrame={2}
          references={[]}
          referenceStatus="current"
          getCurrentReferenceIndex={() => {
            throw new Error('漂移关窗不应触发引用索引')
          }}
          session={session}
          initialMode="edit"
          selectedActionId="idle"
          onSelectedActionChange={() => undefined}
          onSelectedSourceFrameChange={() => undefined}
          onRequestCreate={() => undefined}
          onOpenReferences={() => undefined}
          onClose={onClose}
        />,
      ),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(session.getState().sprites[0]?.poses).toEqual(sprite.poses)
    expect(session.canUndo()).toBe(false)
  })

  test('create 模式的 Cmd+S 被阻断并聚焦名称输入，不触发项目保存', () => {
    const sprite = definition()
    const session = sessionFor(sprite)
    const onRequestSave = vi.fn()
    const proof = { asset: 'sprite.test', sha256, actualFrameCount: frames.length }
    act(() =>
      root.render(
        <SpriteActionEditorDialog
          definition={sprite}
          liveDefinition={sprite}
          catalog={session.getState().assetCatalog}
          proof={proof}
          liveProof={proof}
          frames={frames}
          selectedSourceFrame={2}
          references={[]}
          referenceStatus="current"
          getCurrentReferenceIndex={() => {
            throw new Error('create 保存阻断不应触发引用索引')
          }}
          session={session}
          initialMode="create"
          onSelectedActionChange={() => undefined}
          onSelectedSourceFrameChange={() => undefined}
          onRequestCreate={() => undefined}
          onOpenReferences={() => undefined}
          onRequestSave={onRequestSave}
          onClose={() => undefined}
        />,
      ),
    )
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
    })
    expect(host.textContent).toContain('请先创建动作，再保存项目。')
    expect(onRequestSave).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(
      host.querySelector<HTMLInputElement>('[name="sprite-action-name"]'),
    )
  })
})
