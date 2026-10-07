import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  type AuthorCommand,
  type AuthorSceneDef,
  checkAuthorCommands,
  type SceneDef,
  type ShopDef,
  validateAssetCatalog,
  validateAuthorScenes,
  validateItems,
  validateScenes,
  validateShops,
  validateSprites,
} from '@type-pal/content'
import { loadCurrentProjectFrom } from '@type-pal/reforge'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, vi } from 'vitest'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../../../core/__tests__/battle-trial-project.js'
import { createEditorAssetReader } from '../../../core/editor-asset-reader.js'
import { createScriptReferenceCatalog } from '../../../core/script-reference-catalog.js'
import { CanonicalScriptBodyEditor, type CanonicalScriptEditorContext } from '../../ScriptEditor.js'

/**
 * TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 专属 fixture。
 * 与 command-form-current-fixture 同一真实调用链（CanonicalScriptBodyEditor 行双击 →
 * aggregate 编辑弹窗 → bridge → 共享 CommandForm），但允许本卡三处合法项目变体：
 * shops（含合法空店铺表）与 portrait 资产目录增补；仅测试导入，不进生产。
 */
const cleanups: Array<() => void> = []
afterEach(() => {
  for (const dispose of cleanups.splice(0).reverse()) dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function addPortraitAsset(
  files: Record<string, unknown>,
  id: AssetId,
  label: string,
): Promise<void> {
  const path = `assets/authored/author-contracts/${id}.bin`
  const bytes = new TextEncoder().encode(`author-contracts:${id}`)
  files[path] = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const sha256 = [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join('')
  const catalog = files['assets/index.json'] as AssetCatalogV1
  const record: AssetRecordV1 = {
    kind: 'portrait',
    path,
    mediaType: 'application/octet-stream',
    bytes: bytes.byteLength,
    sha256,
    label,
    origin: { kind: 'authored' },
  }
  catalog.assets[id] = record
  files['assets/index.json'] = validateAssetCatalog(catalog)
}

export interface AuthorCommandFormOptions {
  /** 店铺表；默认两家店。传 [] 为合法空店铺项目（openShop 数值降级臂）。 */
  shops?: ShopDef[]
  /** 增补的 portrait 资产（id, label）；setActorAppearance 对话立绘臂。 */
  portraitAssets?: readonly (readonly [AssetId, string])[]
}

export async function authorCommandForm(
  command: AuthorCommand,
  options: AuthorCommandFormOptions = {},
) {
  checkAuthorCommands([command], 'author-contracts.form.input', { rootScope: 'script' })
  const nodeBuffer = 'node:buffer'
  const native: { Blob: typeof Blob } = await import(nodeBuffer)
  vi.stubGlobal('Blob', native.Blob)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const files = await battleTrialProjectFiles()
  for (const [id, label] of options.portraitAssets ?? []) await addPortraitAsset(files, id, label)
  const source = fixtureSource(files)
  const project = await loadCurrentProjectFrom(source)
  const scene: SceneDef & AuthorSceneDef = {
    id: 'start',
    mapId: 'start',
    entry: { pos: { col: 4, row: 3, height: 2 }, facing: 'down' },
    entries: {
      door: { label: '正门', pos: { col: 1, row: 2, height: 3 }, facing: 'up' },
      back: { label: '后门', pos: { col: 7, row: 8, height: 0 }, facing: 'left' },
    },
    entities: [],
  }
  const other: SceneDef & AuthorSceneDef = {
    id: 'other',
    mapId: 'start',
    entry: { pos: { col: 9, row: 6, height: 0 }, facing: 'right' },
    entities: [],
  }
  validateScenes([scene, other])
  validateAuthorScenes([scene, other])
  const originalSprite = Object.values(project.spritesById)[0]
  if (!originalSprite) throw new Error('fixture requires actual starter sprite')
  const sprites = validateSprites(
    [originalSprite, { ...structuredClone(originalSprite), id: 'alternate', label: '备用精灵' }],
    project.assetCatalog,
  )
  const shops = validateShops(
    options.shops ?? [
      { id: 2, items: ['trial-herb'] },
      { id: 9, items: [] },
    ],
  )
  const reader = createEditorAssetReader(source, {
    manifest: project.manifest,
    assetCatalog: project.assetCatalog,
    assetBlobs: {},
  })
  const references = createScriptReferenceCatalog({
    locale: project.locale,
    items: validateItems(files['content/items.json']),
    skills: Object.values(project.skills),
    actors: Object.values(project.actorsById),
    poisons: project.poisons,
    sprites,
    battleSprites: Object.values(project.battleSpritesById),
    ambiences: project.ambiences,
    mapIndex: project.mapIndex,
    assetCatalog: project.assetCatalog,
  })
  const onOpenWorldVariable = vi.fn()
  const onOpenImage = vi.fn()
  const context: CanonicalScriptEditorContext = {
    state: {
      scenes: [scene, other],
      items: project.authorContent.items,
      sharedScripts: {},
    },
    currentSceneId: 'start',
    shellScenes: [scene, other],
    locale: project.locale,
    assetCatalog: project.assetCatalog,
    audioResolver: reader,
    assetReader: reader,
    references,
    actors: project.actorsById,
    battleSprites: Object.values(project.battleSpritesById),
    sprites,
    shops,
    onOpenWorldVariable,
    onOpenImage,
  }
  const data = {
    locale: context.locale,
    scenes: context.shellScenes,
    state: context.state,
    catalog: context.assetCatalog,
    actors: context.actors,
    sprites,
    shops,
    battleSprites: context.battleSprites,
  }
  const dataBefore = structuredClone(data)
  const body = [command]
  const before = structuredClone(body)
  const onChange = vi.fn<(next: AuthorCommand[]) => void>()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  cleanups.push(() => {
    act(() => root.unmount())
    host.remove()
  })
  await act(async () =>
    root.render(createElement(CanonicalScriptBodyEditor, { body, context, onChange })),
  )
  const commandRow = host.querySelector('.cmd-row')
  if (!commandRow) throw new Error('public editor did not render command row')
  await act(async () => commandRow.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  expect(document.querySelector('.cf-row')).not.toBeNull()
  expect(document.body.textContent).not.toContain('应用 JSON')
  function unchanged() {
    expect(body).toEqual(before)
    expect(data).toEqual(dataBefore)
  }
  function pending() {
    expect(onChange).not.toHaveBeenCalled()
    unchanged()
  }
  async function finish(expected: AuthorCommand) {
    pending()
    checkAuthorCommands([expected], 'author-contracts.form.expected', { rootScope: 'script' })
    await click('完成')
    expect(onChange).toHaveBeenCalledExactlyOnceWith([expected])
    const output = onChange.mock.calls[0]?.[0]
    checkAuthorCommands(output, 'author-contracts.form.output', { rootScope: 'script' })
    unchanged()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  }
  return {
    body,
    before,
    onChange,
    context,
    onOpenWorldVariable,
    onOpenImage,
    finish,
    pending,
    unchanged,
  }
}

export function row(label: string) {
  const found = [...document.querySelectorAll('.cf-row')].find(
    (e) => e.querySelector('.cf-label')?.textContent === label,
  )
  if (!found) throw new Error(`missing author form row ${label}`)
  return found
}
export async function input(label: string, value: string | number, index = 0) {
  const field = row(label).querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input:not([type="checkbox"]), textarea',
  )[index]
  if (!field) throw new Error(`missing field ${label}/${index}`)
  const prototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (!setter) throw new Error('native input setter unavailable')
  await act(async () => {
    setter.call(field, String(value))
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
export async function choose(label: string, option: string, index = 0) {
  const trigger = row(label).querySelectorAll<HTMLButtonElement>('[role="combobox"]')[index]
  if (!trigger) throw new Error(`missing combobox ${label}/${index}`)
  if (trigger.getAttribute('aria-expanded') !== 'true') await act(async () => trigger.click())
  const found = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (e) => e.textContent === option || e.textContent?.startsWith(option),
  )
  if (!found)
    throw new Error(
      `missing option ${option}: ${[...document.querySelectorAll('[role="option"]')].map((e) => e.textContent)}`,
    )
  await act(async () => found.click())
}
export async function click(label: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (e) => e.textContent === label || e.getAttribute('aria-label') === label,
  )
  if (!button) throw new Error(`missing button ${label}`)
  await act(async () => button.click())
}
