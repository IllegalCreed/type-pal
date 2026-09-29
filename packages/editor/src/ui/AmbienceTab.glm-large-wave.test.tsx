// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A04（AmbienceTab 对）：乘色预览回显与场景预览接线。
 * 去重：AmbienceTab.test 已证创建/删除/引用门、字段提交、Escape 恢复、live oracle。
 * 本文件只补：当前乘色色板随草稿即时回显并在 Escape 后回到 canonical 值；切换目录行
 * 后色板切到该氛围的 canonical 乘色；传入 preview 包时 AmbienceScenePreview 收到
 * projectKey/manifest 与实时 tint（预览组件仅做探针替身，其自身合同另有专测）。
 */
import type { AmbienceDef } from '@type-pal/content'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AddAmbienceCommand, UpdateAmbienceCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { AmbienceTab } from './AmbienceTab.js'

const previewProbe = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }))

vi.mock('./AmbienceScenePreview.js', () => ({
  AmbienceScenePreview: (props: Record<string, unknown>) => {
    previewProbe.calls.push(props)
    return <div data-testid="ambience-preview" />
  },
}))

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  await stubNodeTestHost()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  previewProbe.calls.length = 0
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function sessionWithAmbiences(): Promise<{
  session: EditSession
  ambiences: AmbienceDef[]
  legal: Awaited<ReturnType<typeof loadLegalUiProject>>
}> {
  const legal = await loadLegalUiProject('glm-large-wave-ambience')
  const { state } = legal
  const session = new EditSession(state)
  session.dispatch(new AddAmbienceCommand('day', '白天'))
  session.dispatch(new AddAmbienceCommand('dusk', '黄昏'))
  session.dispatch(
    new UpdateAmbienceCommand('dusk', { tint: [255, 150, 80] as AmbienceDef['tint'] }),
  )
  return { session, ambiences: session.getState().ambiences ?? [], legal }
}

type TabProps = ComponentProps<typeof AmbienceTab>

function referenceDefaults(): Pick<
  TabProps,
  'referenceIndex' | 'referenceStatus' | 'getCurrentReferenceIndex'
> {
  return {
    referenceIndex: undefined,
    referenceStatus: 'current',
    getCurrentReferenceIndex: collectCurrentProjectReferenceIndex,
  }
}

function swatch(host: HTMLElement): HTMLElement | null {
  return host.querySelector('[aria-label^="当前乘色"]')
}

describe('A04 AmbienceTab 乘色回显与预览接线', () => {
  test('当前乘色随草稿即时回显，Escape 恢复 canonical，提交后保持', async () => {
    const { session, ambiences } = await sessionWithAmbiences()
    await act(async () =>
      root.render(<AmbienceTab {...referenceDefaults()} ambiences={ambiences} session={session} />),
    )
    expect(swatch(host)?.getAttribute('aria-label')).toBe('当前乘色 #ffffff')
    const hex = host.querySelector<HTMLInputElement>('input[aria-label="氛围颜色 HEX"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      hex.focus()
      setter.call(hex, '#203040')
      hex.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(swatch(host)?.getAttribute('aria-label')).toBe('当前乘色 #203040')
    await act(async () => {
      hex.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(swatch(host)?.getAttribute('aria-label')).toBe('当前乘色 #ffffff')
    await act(async () => {
      hex.focus()
      setter.call(hex, '#203040')
      hex.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => hex.blur())
    expect(swatch(host)?.getAttribute('aria-label')).toBe('当前乘色 #203040')
  })

  test('切换目录行后色板切到该氛围的 canonical 乘色', async () => {
    const { session, ambiences } = await sessionWithAmbiences()
    await act(async () =>
      root.render(<AmbienceTab {...referenceDefaults()} ambiences={ambiences} session={session} />),
    )
    const row = [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find((candidate) =>
      candidate.textContent?.includes('黄昏'),
    )!
    await act(async () => row.click())
    expect(swatch(host)?.getAttribute('aria-label')).toBe('当前乘色 #ff9650')
  })

  test('传入 preview 包时把实时 tint 与 projectKey 传给场景预览', async () => {
    const { session, ambiences, legal } = await sessionWithAmbiences()
    const state = session.getState()
    const preview: ComponentProps<typeof AmbienceTab>['preview'] = {
      manifest: legal.state.manifest,
      scenes: state.scenes ?? [],
      actors: [],
      sprites: state.sprites ?? [],
      assetBase: legal.assetBase,
      assetCatalog: state.assetCatalog,
      assetReader: createEditorAssetReader(legal.source, legal.state),
      mapIndex: state.mapIndex,
      sceneIndex: undefined,
      tilesets: state.tilesets ?? [],
      projectKey: `${state.manifest.id}:ws-1`,
    }
    await act(async () =>
      root.render(
        <AmbienceTab
          {...referenceDefaults()}
          ambiences={ambiences}
          session={session}
          preview={preview}
        />,
      ),
    )
    expect(host.querySelector('[data-testid="ambience-preview"]')).not.toBeNull()
    const first = previewProbe.calls.at(-1)!
    expect(first.projectKey).toBe('glm-large-wave-ambience:ws-1')
    expect(first.tint).toEqual([255, 255, 255])
    const hex = host.querySelector<HTMLInputElement>('input[aria-label="氛围颜色 HEX"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      hex.focus()
      setter.call(hex, '#203040')
      hex.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(previewProbe.calls.at(-1)!.tint).toEqual([32, 48, 64])
  })
})
