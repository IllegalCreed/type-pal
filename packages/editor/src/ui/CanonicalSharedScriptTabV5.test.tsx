// @vitest-environment jsdom

import type { AssetCatalogV1, SceneDef, ScriptFlowV5 } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type ScriptEditorStateV5, ScriptV5EditSession } from '../core/script-v5-editor.js'
import type { CanonicalScriptEditorContextV5 } from './CanonicalScriptEditorV5.js'
import { CanonicalSharedScriptTabV5 } from './CanonicalSharedScriptTabV5.js'

type PreviewProbeProps = {
  stages: readonly unknown[]
  canonicalFlow?: ScriptFlowV5
  canonicalSharedScripts?: ScriptEditorStateV5['sharedScripts']
  startPlayback?: (paused: boolean) => void
}

const previewRender = vi.hoisted(() => vi.fn())

vi.mock('./PreviewCanvas.js', () => ({
  PreviewCanvas: (props: PreviewProbeProps) => {
    previewRender(props)
    return <div data-testid="shared-preview" />
  },
}))

const state: ScriptEditorStateV5 = {
  scenes: [],
  items: [],
  sharedScripts: {
    'shared/user/book': {
      name: '读天书',
      self: 'none',
      body: [{ kind: 'dialog', cue: { rows: [{ text: '天书正文' }] } }],
    },
  },
  migrationSidecars: [],
}

const catalog: AssetCatalogV1 = { version: 1, assets: {} }
const context: CanonicalScriptEditorContextV5 = {
  state,
  shellScenes: [] as SceneDef[],
  locale: {},
  assetCatalog: catalog,
  audioResolver: {} as CanonicalScriptEditorContextV5['audioResolver'],
  assetReader: {} as CanonicalScriptEditorContextV5['assetReader'],
  references: {
    choices: () => [],
    has: () => false,
    label: (_kind, id) => id,
  },
  battleSprites: [],
}
const projectProps = {
  projectId: 'test',
  projectMaps: {},
  mapIndex: { version: 1 as const, maps: [] },
  tilesets: [],
}

describe('CanonicalSharedScriptTabV5', () => {
  let host: HTMLDivElement
  let root: Root

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

  test('reads the canonical library and mounts the shared body editor', () => {
    const html = renderToStaticMarkup(
      <CanonicalSharedScriptTabV5
        tabBar={null}
        state={state}
        session={new ScriptV5EditSession(state)}
        context={context}
        {...projectProps}
      />,
    )
    expect(html).toContain('读天书')
    expect(html).toContain('shared/user/book')
    expect(html).toContain('天书正文')
    expect(html).toContain('canonical-script-editor')
    expect(html).not.toContain('迁移内部实现')
    expect(html).not.toContain('Canonical ScriptFlow JSON')
  })

  test('opens creation from the list header and creates through a dedicated dialog', async () => {
    const session = new ScriptV5EditSession(structuredClone(state))

    function Harness() {
      useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.getVersion(),
      )
      const editorState = session.getState()
      return (
        <CanonicalSharedScriptTabV5
          tabBar={null}
          state={editorState}
          session={session}
          context={{ ...context, state: editorState }}
          {...projectProps}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    expect(host.querySelector('.canonical-shared-script-create-form')).toBeNull()

    const open = host.querySelector<HTMLButtonElement>('[aria-label="新建可复用脚本"]')!
    await act(async () => open.click())

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.getAttribute('aria-label')).toBe('新建可复用脚本')
    expect(dialog.textContent).toContain('脚本名称')
    expect(dialog.textContent).toContain('稳定 ID')
    expect(document.activeElement?.getAttribute('name')).toBe('shared-script-name')

    const submit = dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(submit.disabled).toBe(false)
    await act(async () => submit.click())
    expect(dialog.querySelector('[role="alert"]')?.textContent).toBe('请输入脚本名称。')
    expect(document.activeElement?.getAttribute('name')).toBe('shared-script-name')

    const name = dialog.querySelector<HTMLInputElement>('[name="shared-script-name"]')!
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
      name,
      '序章开场',
    )
    await act(async () => name.dispatchEvent(new Event('input', { bubbles: true })))

    const id = dialog.querySelector<HTMLInputElement>('[name="shared-script-id"]')!
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
      id,
      'shared/user/opening-story',
    )
    await act(async () => id.dispatchEvent(new Event('input', { bubbles: true })))
    await act(async () => submit.click())

    expect(session.getState().sharedScripts['shared/user/opening-story']).toEqual({
      name: '序章开场',
      self: 'none',
      body: [],
    })
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(host.textContent).toContain('序章开场')
  })

  test('previews a shared script through a canonical callScript wrapper', () => {
    previewRender.mockClear()
    const shell: SceneDef = {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    }
    const previewState: ScriptEditorStateV5 = {
      ...state,
      scenes: [
        {
          id: 's001',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
        },
      ],
    }

    renderToStaticMarkup(
      <CanonicalSharedScriptTabV5
        tabBar={null}
        state={previewState}
        session={new ScriptV5EditSession(previewState)}
        context={{
          ...context,
          state: previewState,
          shellScenes: [shell],
          assetBase: {} as never,
          sprites: [],
          actors: {},
        }}
        {...projectProps}
      />,
    )

    const preview = previewRender.mock.calls.at(-1)?.[0] as PreviewProbeProps
    expect(preview.stages).toEqual([])
    expect(preview.canonicalFlow).toEqual({
      kind: 'stages',
      initial: 'preview',
      stages: [
        {
          id: 'preview',
          body: [{ kind: 'callScript', script: 'shared/user/book' }],
        },
      ],
    })
    expect(preview.canonicalSharedScripts).toBe(previewState.sharedScripts)
    expect(preview.startPlayback).toBeTypeOf('function')
  })
})
