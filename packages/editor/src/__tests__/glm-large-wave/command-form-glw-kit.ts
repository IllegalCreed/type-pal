/**
 * TEST-GLM-LARGE-WAVE-4 白名单 fixture：指令表单工作台（A01/A02）。
 * 以 battle-trial 真实项目为底，按需增补 sound/music/portrait 资产与角色立绘组，
 * 全部经当前 validate* guard 校验；直接挂载真实 CommandForm（不经脚本编辑器总链），
 * onChange 产出逐条可证伪，输出经 checkAuthorCommands 复核合法。
 * 仅测试导入，不进生产。
 */
import type {
  ActorDef,
  AmbienceDef,
  AssetCatalogV1,
  AssetId,
  AssetRecordV1,
  SceneDef,
} from '@type-pal/content'
import {
  checkAuthorCommands,
  validateActors,
  validateAssetCatalog,
  validateItems,
  validateShops,
} from '@type-pal/content'
import { type FileSource, loadCurrentProjectFrom } from '@type-pal/reforge'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, vi } from 'vitest'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../../core/__tests__/battle-trial-project.js'
import { createEditorAssetReader } from '../../core/editor-asset-reader.js'
import { createScriptReferenceCatalog } from '../../core/script-reference-catalog.js'
import { CommandForm } from '../../ui/CommandForm.js'
import type { CommandFormCommand, SharedAuthorCommand } from '../../ui/command-form-contract.js'
import type { CanonicalScriptEditorContext } from '../../ui/ScriptEditor.js'

const cleanups: Array<() => void> = []
afterEach(() => {
  for (const dispose of cleanups.splice(0).reverse()) dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function assetRecord(
  files: Record<string, unknown>,
  id: AssetId,
  kind: AssetRecordV1['kind'],
  label: string,
): Promise<void> {
  const path = `assets/authored/glw/${id}.bin`
  const bytes = new TextEncoder().encode(`glw-bytes:${id}`)
  files[path] = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const sha256 = [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join('')
  const catalog = files['assets/index.json'] as AssetCatalogV1
  catalog.assets[id] = {
    kind,
    path,
    mediaType: 'application/octet-stream',
    bytes: bytes.byteLength,
    sha256,
    label,
    origin: { kind: 'authored' },
  }
  files['assets/index.json'] = validateAssetCatalog(catalog)
}

export interface FormWorldOptions {
  soundAssets?: readonly [AssetId, string][]
  musicAssets?: readonly [AssetId, string][]
  portraitAssets?: readonly AssetId[]
  heroPortraits?: ActorDef['portraits']
  ambiences?: readonly AmbienceDef[]
  /** 移除指定角色的 battler 块，制造「不可参战」目标。 */
  nonBattler?: string
  includeEntity?: boolean
  onOpenSound?: (id: string) => void
}

export interface FormWorld {
  onChange: ReturnType<typeof vi.fn>
  lastOutput: () => CommandFormCommand
  expectLegal: (index?: number) => CommandFormCommand
}

/** 组装增补资产后的真实表单环境并直挂 CommandForm；返回逐条 onChange 轨迹。 */
export async function mountCommandForm(
  command: SharedAuthorCommand,
  options: FormWorldOptions = {},
): Promise<FormWorld> {
  checkAuthorCommands([command], 'glw.form.input')
  const nativeBuffer = 'node:buffer'
  const buffer = (await import(nativeBuffer)) as { Blob: typeof Blob }
  vi.stubGlobal('Blob', buffer.Blob)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const files = await battleTrialProjectFiles()
  for (const [id, label] of options.soundAssets ?? []) await assetRecord(files, id, 'sound', label)
  for (const [id, label] of options.musicAssets ?? []) await assetRecord(files, id, 'music', label)
  for (const id of options.portraitAssets ?? []) await assetRecord(files, id, 'portrait', id)
  const actors = files['content/actors.json'] as ActorDef[]
  let actorsDirty = false
  if (options.heroPortraits) {
    const hero = actors.find((candidate) => candidate.id === 'hero')
    if (!hero) throw new Error('fixture requires hero actor')
    hero.portraits = options.heroPortraits
    actorsDirty = true
  }
  if (options.nonBattler) {
    const stripped = actors.find((candidate) => candidate.id === options.nonBattler)
    if (!stripped) throw new Error(`fixture requires actor ${options.nonBattler}`)
    const { battler: _battler, ...withoutBattler } = stripped
    void withoutBattler
    const index = actors.indexOf(stripped)
    actors[index] = { id: stripped.id, name: stripped.name, spriteId: stripped.spriteId }
    actorsDirty = true
  }
  if (actorsDirty) files['content/actors.json'] = validateActors(actors)
  if (options.ambiences?.length) {
    // 可选内容表只在 manifest.content 登记路径后才会被 loader 读取。
    files['content/ambiences.json'] = options.ambiences
    const manifest = files['manifest.json'] as { content: Record<string, string> }
    manifest.content.ambiences = 'content/ambiences.json'
  }
  if (options.musicAssets?.length) {
    // 音乐资产进入目录后，清单必须补全全部必填音频角色（soundfont + 四首切片）。
    await assetRecord(files, 'glw-soundfont', 'soundfont', '音色库')
    const manifest = files['manifest.json'] as { assets: { roles: Record<string, AssetId> } }
    const firstMusic = options.musicAssets[0]![0]
    manifest.assets.roles = {
      ...manifest.assets.roles,
      'audio.midiSoundfont': 'glw-soundfont',
      'audio.defaultBattleMusic': firstMusic,
      'audio.bossVictoryMusic': firstMusic,
      'audio.normalVictoryMusic': firstMusic,
      'audio.openingMenuMusic': firstMusic,
    }
  }
  const source: FileSource = fixtureSource(files)
  const project = await loadCurrentProjectFrom(source)
  const scene: SceneDef & { entities: SceneDef['entities'] } = {
    id: 'start',
    mapId: 'start',
    entry: { pos: { col: 4, row: 3, height: 2 }, facing: 'down' },
    entities: options.includeEntity
      ? [{ id: 'npc', sprite: 'hero', pos: { col: 1, row: 1, height: 0 } }]
      : [],
  }
  const other: SceneDef = {
    id: 'other',
    mapId: 'start',
    entry: { pos: { col: 9, row: 6, height: 0 }, facing: 'right' },
    entities: [],
  }
  const sprites = Object.values(project.spritesById)
  if (!sprites.length) throw new Error('fixture requires starter sprite')
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
  const onChange = vi.fn<(next: CommandFormCommand) => void>()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  cleanups.push(() => {
    act(() => root.unmount())
    host.remove()
  })
  // 编辑器把表单挂在聚合草稿上：每次 onChange 后以最新草稿重挂，保持多步交互可用。
  let current: CommandFormCommand = command
  const renderCurrent = (): void => {
    root.render(
      createElement(CommandForm, {
        cmd: current,
        scene,
        scenes: [scene, other],
        locale: project.locale,
        assetCatalog: project.assetCatalog,
        audioResolver: reader,
        assetReader: reader,
        actors: project.actorsById,
        battleSprites: Object.values(project.battleSpritesById),
        sprites,
        ambiences: project.ambiences,
        shops: validateShops([
          { id: 2, items: ['trial-herb'] },
          { id: 9, items: [] },
        ]),
        references,
        onOpenSound: options.onOpenSound,
        showRawJson: false,
        onChange: (next) => {
          onChange(next)
          current = next
          renderCurrent()
        },
      }),
    )
  }
  await act(async () => renderCurrent())
  return {
    onChange,
    lastOutput: () => {
      const call = onChange.mock.calls.at(-1)
      if (!call) throw new Error('CommandForm emitted no output yet')
      return call[0]
    },
    expectLegal: (index = onChange.mock.calls.length - 1) => {
      const call = onChange.mock.calls[index]
      if (!call) throw new Error(`no output at #${index}`)
      checkAuthorCommands([call[0]], 'glw.form.output')
      return call[0]
    },
  }
}

export function row(label: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('.cf-row')].find(
    (element) => element.querySelector('.cf-label')?.textContent === label,
  )
  if (!found) throw new Error(`missing form row ${label}`)
  return found
}

export async function chooseRowOption(
  label: string,
  option: string,
  comboboxIndex = 0,
): Promise<void> {
  const trigger = row(label).querySelectorAll<HTMLButtonElement>('[role="combobox"]')[comboboxIndex]
  if (!trigger) throw new Error(`missing combobox #${comboboxIndex} in row ${label}`)
  if (trigger.getAttribute('aria-expanded') !== 'true') await act(async () => trigger.click())
  const found = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (element) => element.textContent === option || element.textContent?.startsWith(option),
  )
  if (!found) throw new Error(`missing option ${option} in ${label}`)
  await act(async () => found.click())
}

export async function chooseAriaOption(ariaLabel: string, option: string): Promise<void> {
  const trigger = document.querySelector<HTMLButtonElement>(
    `[role="combobox"][aria-label="${ariaLabel}"]`,
  )
  if (!trigger) throw new Error(`missing combobox ${ariaLabel}`)
  if (trigger.getAttribute('aria-expanded') !== 'true') await act(async () => trigger.click())
  const found = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (element) => element.textContent === option || element.textContent?.startsWith(option),
  )
  if (!found) throw new Error(`missing option ${option} in ${ariaLabel}`)
  await act(async () => found.click())
}

export async function clickButton(label: string): Promise<void> {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (element) => element.textContent === label || element.getAttribute('aria-label') === label,
  )
  if (!button) throw new Error(`missing button ${label}`)
  await act(async () => button.click())
}

export type { CanonicalScriptEditorContext }
