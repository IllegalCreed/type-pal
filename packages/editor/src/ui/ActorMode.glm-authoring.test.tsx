// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-AUTHORING-PANELS-1 A 组：ActorMode 作者面板残差合同。
 *
 * 去重（旧 fullName → 已证 → 本文件只补）：
 * - ActorMode.test.tsx：`角色页直接编辑 initialMagic…`（增删/undo/已配置提示）、`当前值与最大值
 *   分别编辑…`（合法提交）、`战斗形象沿用引用绑定层级…`、`空人物库可创建第一名 NPC…`（成功路径）、
 *   `复制人物会复制 levelUp…`（删 hero-copy 的列表/levelUp 清理）、引用 fail-closed 族已证 → 不重复。
 * - ActorMode.glm-next-wave.test.tsx：陈旧 focusActorId 回落、空库禁用/取消零派发已证 → 不重复。
 * 本文件合同：新建守卫（空字段/重复 id，A1）、删除当前 actor 的焦点回落（A2）、战斗音效空值
 * 逐键与整键删除（A3）、非法数值拒绝与 no-op 抑制（A4）、initial magic 选项去重（A5）。
 * 全部合法 loader 项目 + 真命令播种 + 真实组件 DOM；BattleSpriteInlinePreview 沿用两份旧测的
 * 展示桩先例（被测对象是 ActorMode 面板，非该预览组件）。
 */
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  AddActorCommand,
  AddSkillCommand,
  CompositeCommand,
  UpdateActorCommand,
  UpdateLocaleCommand,
} from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  type AuthoringBundle,
  buildLegalBundle,
  dispatchAll,
  seededAssetCommand,
  wavBytes,
} from './__tests__/glm-authoring-kit.js'
import {
  buttonByLabel,
  chooseComboboxOption,
  fieldControlByLabel,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { ActorMode } from './ActorMode.js'

vi.mock('./BattleSpriteInlinePreview.js', () => ({
  BattleSpriteInlinePreview: (props: { definition?: { id: string } }) => (
    <div data-testid="battle-sprite-inline-preview" data-definition-id={props.definition?.id} />
  ),
}))

function Harness(props: { bundle: AuthoringBundle; onActorFocus?: (id: string) => void }) {
  const session = props.bundle.session
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
      assetBase={props.bundle.assetBase}
      session={session}
      assetCatalog={current.assetCatalog}
      assetReader={props.bundle.reader}
      levelUp={current.levelUp}
      onActorFocus={props.onActorFocus}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
    />
  )
}

function actorRow(host: ParentNode, actorId: string): HTMLElement {
  const row = [...host.querySelectorAll<HTMLElement>('.actor-list .ds-catalog-row')].find(
    (candidate) => candidate.textContent?.includes(actorId),
  )
  expect(row, `角色行 ${actorId}`).toBeDefined()
  return row!
}

async function openBattleSection(host: ParentNode): Promise<void> {
  const tab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
    (candidate) => candidate.textContent?.trim() === '战斗与成长',
  )
  expect(tab, '战斗与成长 tab').not.toBeNull()
  await act(async () => {
    tab!.click()
  })
}

let root: Root
let host: HTMLDivElement

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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('A 组 ActorMode 作者面板残差', () => {
  test('A1 新建守卫：空字段零派发保留面板，重复 id 报命令层错误，合法新建可 undo', async () => {
    const bundle = await buildLegalBundle('glm-authoring-actor-create-guard')
    const dispatch = vi.spyOn(bundle.session, 'dispatch')
    await act(async () => {
      root.render(<Harness bundle={bundle} />)
    })

    // 空字段提交：固定文案 + 零派发 + 面板保留。
    await act(async () => {
      buttonByLabel(host, '新建人物').click()
    })
    expect(host.querySelector('section[aria-label="新建人物"]')).not.toBeNull()
    await act(async () => {
      buttonByLabel(host, '创建').click()
    })
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      '人物 ID、显示名称和默认精灵都必须填写。',
    )
    expect(dispatch).not.toHaveBeenCalled()
    expect(host.querySelector('section[aria-label="新建人物"]')).not.toBeNull()

    // 重复 id：命令层拒绝错误可见，会话零变化。
    await setInputValue(host.querySelector<HTMLInputElement>('[aria-label="新人物 ID"]')!, 'hero')
    await setInputValue(
      host.querySelector<HTMLInputElement>('[aria-label="新人物显示名称"]')!,
      '主角二号',
    )
    await act(async () => {
      buttonByLabel(host, '创建').click()
    })
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('人物 id 已存在：hero')
    expect(bundle.session.getState().actors).toHaveLength(1)
    expect(bundle.session.getState().actors[0]!.id).toBe('hero')

    // 合法 id：创建成功、错误清空、选择切到新人物；undo 连带 locale 一起移除。
    await setInputValue(host.querySelector<HTMLInputElement>('[aria-label="新人物 ID"]')!, 'npc-a')
    await act(async () => {
      buttonByLabel(host, '创建').click()
    })
    expect(bundle.session.getState().actors.map((actor) => actor.id)).toEqual(['hero', 'npc-a'])
    expect(bundle.session.getState().locale['name.npc-a']).toBe('主角二号')
    expect(host.querySelector('[role="alert"]')).toBeNull()
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('主角二号')
    await act(async () => {
      expect(bundle.session.undo()).toBe(true)
    })
    expect(bundle.session.getState().actors).toHaveLength(1)
    expect(bundle.session.getState().locale['name.npc-a']).toBeUndefined()
    assertProjectSaveValid(bundle.session.getState())
  })

  test('A2 删除当前 actor：选择回落剩余第一名并回报 onActorFocus，undo 还原', async () => {
    const bundle = await buildLegalBundle('glm-authoring-actor-delete-fallback')
    // 真命令播种第二名 NPC（无 battler、无引用，可删）。
    await dispatchAll(bundle.session, [
      new CompositeCommand('播种守卫', [
        new UpdateLocaleCommand('name.guard', '守卫'),
        new AddActorCommand({ id: 'guard', name: 'name.guard', spriteId: 'hero' }),
      ]),
    ])
    const onActorFocus = vi.fn<(id: string) => void>()
    await act(async () => {
      root.render(<Harness bundle={bundle} onActorFocus={onActorFocus} />)
    })
    expect(bundle.session.getHistoryVersion()).toBe(1)

    // 选中第二名（当前编辑对象）再删除。
    await act(async () => {
      actorRow(host, 'guard').click()
    })
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('守卫')
    await act(async () => {
      buttonByLabel(host, '删除人物').click()
    })
    expect(bundle.session.getState().actors.map((actor) => actor.id)).toEqual(['hero'])
    // 焦点回落合同：回报剩余第一名，主工作区同步呈现。
    expect(onActorFocus).toHaveBeenLastCalledWith('hero')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('主角')
    expect(host.querySelector('[role="alert"]')).toBeNull()

    await act(async () => {
      expect(bundle.session.undo()).toBe(true)
    })
    expect(bundle.session.getState().actors.map((actor) => actor.id)).toEqual(['hero', 'guard'])
    assertProjectSaveValid(bundle.session.getState())
  })

  test('A3 战斗音效空值删除：逐键删除，最后一键删除后 battler.sounds 整键消失，undo 还原', async () => {
    const bundle = await buildLegalBundle('glm-authoring-actor-sound-unset')
    const wav = wavBytes(4)
    const asset = await seededAssetCommand({
      id: 'sound.authored.cue',
      kind: 'sound',
      extension: 'wav',
      mediaType: 'audio/wav',
      directory: 'sounds',
      label: '出招音',
      ref: 'cue.wav',
      bytes: wav,
    })
    const hero = bundle.session.getState().actors[0]!
    await dispatchAll(bundle.session, [
      asset.command,
      new UpdateActorCommand('hero', {
        battler: {
          ...structuredClone(hero.battler!),
          sounds: { attack: asset.id, dying: asset.id },
        },
      }),
    ])
    const dispatch = vi.spyOn(bundle.session, 'dispatch')
    const historyAtMount = bundle.session.getHistoryVersion()
    await act(async () => {
      root.render(<Harness bundle={bundle} />)
    })
    await openBattleSection(host)

    // 逐键删除：普攻出招 → (无音效)，dying 保留。
    await chooseComboboxOption(fieldControlByLabel<HTMLButtonElement>(host, '普攻出招'), '(无音效)')
    expect(bundle.session.getState().actors[0]!.battler!.sounds).toEqual({ dying: asset.id })
    // 最后一键删除：sounds 整键 undefined（不是空对象）。
    await chooseComboboxOption(fieldControlByLabel<HTMLButtonElement>(host, '濒死'), '(无音效)')
    expect(bundle.session.getState().actors[0]!.battler!.sounds).toBeUndefined()
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(bundle.session.getHistoryVersion()).toBe(historyAtMount + 2)

    await act(async () => {
      expect(bundle.session.undo()).toBe(true)
      expect(bundle.session.undo()).toBe(true)
    })
    expect(bundle.session.getState().actors[0]!.battler!.sounds).toEqual({
      attack: asset.id,
      dying: asset.id,
    })
    assertProjectSaveValid(bundle.session.getState())
  })

  test('A4 非法数值拒绝与 no-op 抑制：负数零派发带回显错误，同值重提交零派发，改值单命令', async () => {
    const bundle = await buildLegalBundle('glm-authoring-actor-stat-guard')
    const dispatch = vi.spyOn(bundle.session, 'dispatch')
    const historyAtMount = bundle.session.getHistoryVersion()
    await act(async () => {
      root.render(<Harness bundle={bundle} />)
    })
    await openBattleSection(host)
    const hp = host.querySelector<HTMLInputElement>('input[aria-label="当前体力"]')!
    expect(hp.value).toBe('100')

    // 非法（负数）：面板拒绝提交，错误回显在控件 title，会话零变化。
    await setInputValue(hp, '-5')
    expect(hp.title).toBe('不能小于 0。')
    expect(dispatch).not.toHaveBeenCalled()
    expect(bundle.session.getHistoryVersion()).toBe(historyAtMount)
    expect(bundle.session.getState().actors[0]!.battler!.baseStats.hp).toBe(100)

    // no-op：提交与当前值相同的 100，零派发。
    await setInputValue(hp, '100')
    expect(dispatch).not.toHaveBeenCalled()
    expect(hp.title).toBe('')

    // 正控：合法改值走单命令，HP 真实落账。
    await setInputValue(hp, '80')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(bundle.session.getState().actors[0]!.battler!.baseStats.hp).toBe(80)
    assertProjectSaveValid(bundle.session.getState())
  })

  test('A5 initial magic 选项去重：每行选项排除其它行已用技能，全部用尽后添加禁用', async () => {
    const bundle = await buildLegalBundle('glm-authoring-actor-magic-dedup')
    await dispatchAll(bundle.session, [
      new AddSkillCommand('fire-spell', '火咒'),
      new AddSkillCommand('ice-spell', '冰咒'),
    ])
    await act(async () => {
      root.render(<Harness bundle={bundle} />)
    })
    await openBattleSection(host)

    const magicRowTrigger = (index: number): HTMLButtonElement =>
      host.querySelector<HTMLButtonElement>(
        `button[role="combobox"][aria-label="第 ${index} 项初始仙术"]`,
      )!
    const optionLabels = async (index: number): Promise<string[]> => {
      await act(async () => {
        magicRowTrigger(index).click()
      })
      const labels = [...document.querySelectorAll<HTMLElement>('[role="option"]')].map(
        (option) => option.textContent?.trim() ?? '',
      )
      await act(async () => {
        magicRowTrigger(index).dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        )
      })
      return labels
    }

    // 空表添加两项（顺序取注册表首个未配置项）。
    await act(async () => {
      buttonByLabel(host, '添加初始仙术').click()
    })
    expect(bundle.session.getState().actors[0]!.battler!.initialMagic).toEqual(['fire-spell'])
    await act(async () => {
      buttonByLabel(host, '添加初始仙术').click()
    })
    expect(bundle.session.getState().actors[0]!.battler!.initialMagic).toEqual([
      'fire-spell',
      'ice-spell',
    ])

    // 去重合同：第 1 行选项只剩自己（冰咒被第 2 行占用），第 2 行同理。
    // 选项文本 = 名称 + id 描述，故以「唯一选项 + 含本行技能 + 不含他行技能」判别。
    const row1 = await optionLabels(1)
    expect(row1).toHaveLength(1)
    expect(row1[0]).toContain('火咒')
    expect(row1[0]).not.toContain('冰咒')
    const row2 = await optionLabels(2)
    expect(row2).toHaveLength(1)
    expect(row2[0]).toContain('冰咒')
    expect(row2[0]).not.toContain('火咒')

    // 全部用尽：添加动作禁用并说明原因。
    const addButton = buttonByLabel(host, '添加初始仙术')
    expect(addButton.disabled).toBe(true)
    expect(addButton.title).toBe('所有仙术都已配置')
    assertProjectSaveValid(bundle.session.getState())
  })
})
