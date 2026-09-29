// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-F-1 F03b：ActorMode 焦点回退与空库禁用回显。
 * 去重：ActorMode.test.tsx 二十例已证 initialMagic/数值编辑、战斗形象与行走精灵绑定、
 * 关系区、CRUD+undo、引用 fail-closed 与 live oracle 错误；本文件只补其间空隙：
 * 陈旧 focusActorId 回落到第一名角色并回报 onActorFocus、非法 focusSection 回显总览、
 * 空人物库时复制动作禁用且新建面板取消零派发。状态一律来自 loadLegalUiProject
 * 正式装载器（assertProjectSaveValid 自证），不用手搓强转状态。
 */

import type { AssetBase, FileSource } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { loadLegalUiProject, useActEnvironment } from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { ActorMode } from './ActorMode.js'

vi.mock('./BattleSpriteInlinePreview.js', () => ({
  BattleSpriteInlinePreview: (props: { definition?: { id: string } }) => (
    <div data-testid="battle-sprite-inline-preview" data-definition-id={props.definition?.id} />
  ),
}))

interface StateBundle {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  installBrowserHardwarePorts()
  useActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

function tabByLabel(label: string): HTMLButtonElement {
  const hit = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(hit, `tab ${label}`).not.toBeNull()
  return hit!
}

function buttonByText(text: string): HTMLButtonElement {
  const hit = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(hit, `button ${text}`).not.toBeNull()
  return hit!
}

function buttonByAriaLabel(label: string): HTMLButtonElement {
  const hit = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  expect(hit, `button ${label}`).not.toBeNull()
  return hit!
}

function Harness(props: {
  state: StateBundle
  focusActorId?: string
  focusSection?: string
  onActorFocus?: (id: string) => void
}) {
  const session = props.state.session
  useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getVersion(),
  )
  const current = session.getState()
  return (
    <ActorMode
      actors={current.actors}
      sprites={current.sprites}
      battleSprites={current.battleSprites}
      items={Object.fromEntries(current.items.map((item) => [item.id, item]))}
      skills={Object.fromEntries(current.skills.map((skill) => [skill.id, skill]))}
      locale={current.locale}
      assetBase={props.state.assetBase}
      session={session}
      assetCatalog={current.assetCatalog}
      assetReader={props.state.reader}
      levelUp={current.levelUp}
      focusActorId={props.focusActorId}
      focusSection={props.focusSection}
      onActorFocus={props.onActorFocus}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
    />
  )
}

async function legalBundle(
  name: string,
  session?: EditSession,
): Promise<{ bundle: StateBundle; source: FileSource }> {
  const legal = await loadLegalUiProject(name)
  const active = session ?? new EditSession(legal.state)
  return {
    bundle: {
      session: active,
      assetBase: legal.assetBase,
      reader: createEditorAssetReader(legal.source, () => active.getState()),
    },
    source: legal.source,
  }
}

describe('F03 ActorMode 焦点回退与空库禁用回显', () => {
  test('陈旧 focusActorId 回落到第一名角色并回报 onActorFocus，非法 focusSection 回显总览', async () => {
    const { bundle } = await legalBundle('glm-next-wave-actor-stale-focus')
    const onActorFocus = vi.fn<(id: string) => void>()
    await act(async () => {
      root.render(
        <Harness
          state={bundle}
          focusActorId="missing-actor"
          focusSection="bogus-section"
          onActorFocus={onActorFocus}
        />,
      )
    })
    // 缺失焦点 id 不留下空选择：回落到注册表第一名角色并回报焦点。
    expect(onActorFocus).toHaveBeenCalledTimes(1)
    expect(onActorFocus).toHaveBeenCalledWith('hero')
    expect(bundle.session.getState().actors[0]?.id).toBe('hero')
    expect(host.querySelector('.actor-list')?.textContent).toContain('hero')
    // 非法分区值回退总览，而不是伪造未知分区。
    expect(tabByLabel('总览').getAttribute('aria-selected')).toBe('true')
    expect(tabByLabel('外观资源').getAttribute('aria-selected')).toBe('false')
    expect(host.textContent).toContain('角色定义')
  })

  test('空人物库复制动作禁用，新建面板取消零派发', async () => {
    const { bundle, source } = await legalBundle('glm-next-wave-actor-empty-registry')
    const empty = structuredClone(bundle.session.getState())
    empty.actors = []
    const session = new EditSession(empty)
    const stateBundle: StateBundle = {
      session,
      assetBase: bundle.assetBase,
      reader: createEditorAssetReader(source, () => session.getState()),
    }
    await act(async () => root.render(<Harness state={stateBundle} />))
    expect(buttonByAriaLabel('复制当前人物').disabled).toBe(true)
    expect(buttonByAriaLabel('新建人物').disabled).toBe(false)
    await act(async () => buttonByAriaLabel('新建人物').click())
    expect(host.querySelector('section[aria-label="新建人物"]')).not.toBeNull()
    // 面板列出注册表真实精灵候选，取消不改会话。
    expect(host.textContent).toContain('默认精灵')
    await act(async () => buttonByText('取消').click())
    expect(host.querySelector('section[aria-label="新建人物"]')).toBeNull()
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.isDirty()).toBe(false)
    expect(session.getState()).toEqual(empty)
  })
})
