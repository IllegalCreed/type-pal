// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K10（批C）：ItemUseEffectEditor 效果链真实业务工作流补测。
 * 目标源 ItemUseEffectEditor.tsx（锚 211/1218/1499：defaultItemUseEffect/defaultThrowEffect/
 * ThrowEffectChainEditor）及 ItemUseEffectChainEditor 本体。
 *
 * 旧断言去重（旧 file/title → 已证合同 → 本组缺口，只测缺口）：
 * - ItemUseEffectEditor.test.tsx '全部结构化效果都能创建确定的默认值' / '消耗型工具创建配方时
 *   不会把自身设为材料' / '7 类投掷效果都有中文类型与确定默认值' → 默认效果纯逻辑，任务卡
 *   明确不复制。
 * - ItemUseEffectEditor.test.tsx '效果链支持排序、删除并允许保留空效果链' 与 '投掷目标和完整
 *   效果链可新增、改类、排序、删除' → 回调捕获层（useState+onChange）证明过链操作；
 *   缺口：真实 EditSession/UpdateItemCommand 消费、逐步完整 spec 深比较、保存门与 undo/redo。
 * - ItemUseEffectEditor.test.tsx '非首卡切换为独占效果时保留该卡与类型焦点' 与
 *   glm-ui-wave U1c '链切换的 target/battleOnly 联动' → 独占切换与 target/battleOnly 取值；
 *   缺口：独占场景钩子下「使用目标/仅战斗可用」控件的 disabled 锁与 battleOnly 键的自动摘除。
 * - ItemUseEffectEditor.test.tsx '可复用脚本只保留选择和打开入口，不在物品里重复创建' →
 *   打开跳转；缺口：切换选择时实际被消费的 runtime ref（旧从未改选）。
 * - glm-ui-wave U1c '成功后消耗自材料守卫' → 配方自材料守卫，任务卡明确不复制。
 * - ItemUseEffectEditor.test.tsx '场景实体效果显式保留失效引用…' → placeEntityInFront 的
 *   ⚠ 保留分支；curePoison/applyPoison 的毒种编辑（方式往返、指定毒、最高等级）旧从未触达。
 * - 投掷字段族（magicDamage 力量来源耦合、applyStatus onResist、currentHpDamage 四字段）
 *   与末条删除守卫的真实会话后果：旧只在 ItemTab.test.tsx 碰过投掷演出，不使用效果字段。
 *
 * 接线口径：onChange 直接 dispatch UpdateItemCommand 到真实 EditSession（即 ItemTab.patchUse/
 * patchThrow 的无私有脚本直写路径；私有脚本保留/删除分支由 ItemTab.kimi-workflows.test.tsx 覆盖）。
 * 唯一替身是浏览器硬件端口（kit.ts；本组件不触发图像解码）。
 */
import { runtimeScriptRef } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpdateItemCommand } from '../core/commands.js'
import {
  buttonByLabel,
  deepSnapshot,
  fieldControlByLabel,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import {
  assertK10SaveValid,
  type K10ItemRig,
  loadK10ItemProject,
} from './__tests__/kimi-editor-workflows/k10-fixtures.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { ItemEffectChainEditor, ThrowEffectChainEditor } from './ItemUseEffectEditor.js'

function UseChainHarness(props: { rig: K10ItemRig; itemId: string; errors: string[] }) {
  useSyncExternalStore(
    (callback) => props.rig.session.subscribe(callback),
    () => props.rig.session.getVersion(),
  )
  const current = props.rig.session.getState()
  const item = current.items.find((candidate) => candidate.id === props.itemId)
  if (!item?.use) throw new Error(`测试前置缺失：${props.itemId}.use`)
  // 与 ItemTab 的 scriptOptions 派生逐项同构（ItemTab.tsx:849-858）。
  const scripts = Object.entries(props.rig.scriptSession.getStateSnapshot().sharedScripts)
    .map(([id, script]) => ({ ref: runtimeScriptRef(id), label: `${script.name} · ${id}` }))
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
  return (
    <ItemEffectChainEditor
      ability="use"
      spec={item.use}
      items={current.items}
      poisons={current.poisons ?? []}
      scripts={scripts}
      itemId={item.id}
      scenes={current.scenes}
      sceneIndex={current.sceneIndex}
      draftScope={`item:${item.id}:use`}
      syncToken={props.rig.session.getHistoryVersion()}
      onChange={(next) => {
        props.rig.session.dispatch(new UpdateItemCommand(item.id, { use: next }))
      }}
      onError={(message) => props.errors.push(message)}
    />
  )
}

function ThrowChainHarness(props: { rig: K10ItemRig; itemId: string; errors: string[] }) {
  useSyncExternalStore(
    (callback) => props.rig.session.subscribe(callback),
    () => props.rig.session.getVersion(),
  )
  const current = props.rig.session.getState()
  const item = current.items.find((candidate) => candidate.id === props.itemId)
  if (!item?.throw) throw new Error(`测试前置缺失：${props.itemId}.throw`)
  return (
    <ThrowEffectChainEditor
      spec={item.throw}
      poisons={current.poisons ?? []}
      draftScope={`item:${item.id}:throw`}
      syncToken={props.rig.session.getHistoryVersion()}
      onChange={(next) => {
        props.rig.session.dispatch(new UpdateItemCommand(item.id, { throw: next }))
      }}
      onError={(message) => props.errors.push(message)}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function useSpec(rig: K10ItemRig, itemId: string) {
  const item = rig.session.getState().items.find((candidate) => candidate.id === itemId)
  expect(item, `物品 ${itemId}`).toBeDefined()
  return item!.use
}

function throwSpec(rig: K10ItemRig, itemId: string) {
  const item = rig.session.getState().items.find((candidate) => candidate.id === itemId)
  expect(item, `物品 ${itemId}`).toBeDefined()
  return item!.throw
}

function undo(rig: K10ItemRig): void {
  act(() => {
    expect(rig.session.undo()).toBe(true)
  })
}

function redo(rig: K10ItemRig): void {
  act(() => {
    expect(rig.session.redo()).toBe(true)
  })
}

function combobox(scope: ParentNode, ariaLabel: string): HTMLButtonElement {
  const trigger = scope.querySelector<HTMLButtonElement>(
    `button[role="combobox"][aria-label="${ariaLabel}"]`,
  )
  expect(trigger, `组合框 ${ariaLabel}`).not.toBeNull()
  return trigger!
}

/** DsSelect 驱动：优先匹配选项 label _span_，避免描述文本混入 textContent。 */
async function chooseOption(trigger: HTMLButtonElement, label: string): Promise<void> {
  if (trigger.getAttribute('aria-expanded') !== 'true')
    await act(async () => {
      trigger.click()
    })
  const controls = trigger.getAttribute('aria-controls')
  const scope = (controls ? document.getElementById(controls) : null) ?? document
  const option = [...scope.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) =>
      candidate.querySelector('.ds-select-option__label')?.textContent === label ||
      candidate.textContent?.trim() === label,
  )
  expect(option, `下拉选项「${label}」`).toBeDefined()
  await act(async () => {
    option!.click()
  })
}

function effectCard(index: number): HTMLElement {
  const cards = host.querySelectorAll<HTMLElement>('[data-effect-editor-card]')
  expect(cards.length, `效果卡数量（期望 > ${index}）`).toBeGreaterThan(index)
  return cards[index]!
}

function ruleCheckbox(label: string): HTMLInputElement {
  const node = [...host.querySelectorAll<HTMLLabelElement>('.item-use-rules label')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(node, `使用规则 ${label}`).toBeDefined()
  return node!.querySelector<HTMLInputElement>('input')!
}

describe('K10 ItemUseEffectEditor 效果链真实会话工作流', () => {
  test('使用效果链增/改类/字段/重排/删除经真实会话逐步落库，保存门与撤销重做对称', async () => {
    const rig = await loadK10ItemProject('k10-use-chain', {
      items: [
        {
          id: 'herb',
          name: '止血草',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 30 }] },
        },
      ],
    })
    const errors: string[] = []
    await act(async () => {
      root.render(<UseChainHarness rig={rig} itemId="herb" errors={errors} />)
      await Promise.resolve()
    })
    const initial = deepSnapshot(useSpec(rig, 'herb'))

    // 增：追加第一个可添加类型（healHp 默认 100）。
    await act(async () => buttonByLabel(host, '添加效果').click())
    expect(useSpec(rig, 'herb')).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [
        { kind: 'healHp', amount: 30 },
        { kind: 'healHp', amount: 100 },
      ],
    })
    assertK10SaveValid(rig)

    // 改类：效果 2 → 复活（默认值 hpPercent 30）。
    await chooseOption(combobox(effectCard(1), '效果 2 类型'), '复活')
    expect(useSpec(rig, 'herb')?.effects).toEqual([
      { kind: 'healHp', amount: 30 },
      { kind: 'revive', hpPercent: 30 },
    ])
    assertK10SaveValid(rig)

    // 字段：复活体力 % 提交 45（DsDraftNumberField blur 提交）。
    await setInputValue(fieldControlByLabel(effectCard(1), '复活体力 %'), '45')
    expect(useSpec(rig, 'herb')?.effects).toEqual([
      { kind: 'healHp', amount: 30 },
      { kind: 'revive', hpPercent: 45 },
    ])
    assertK10SaveValid(rig)

    // 重排：下移效果 1 → 两条互换。
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="下移效果 1"]')!.click()
    })
    expect(useSpec(rig, 'herb')?.effects).toEqual([
      { kind: 'revive', hpPercent: 45 },
      { kind: 'healHp', amount: 30 },
    ])
    assertK10SaveValid(rig)

    // 删除：移除首条，余下 healHp。
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 1"]')!.click()
    })
    expect(useSpec(rig, 'herb')).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount: 30 }],
    })
    assertK10SaveValid(rig)
    expect(errors).toEqual([])

    // 逐步撤销回初态，再逐步重做到终态。
    undo(rig)
    expect(useSpec(rig, 'herb')?.effects).toEqual([
      { kind: 'revive', hpPercent: 45 },
      { kind: 'healHp', amount: 30 },
    ])
    undo(rig)
    expect(useSpec(rig, 'herb')?.effects).toEqual([
      { kind: 'healHp', amount: 30 },
      { kind: 'revive', hpPercent: 45 },
    ])
    undo(rig)
    expect(useSpec(rig, 'herb')?.effects).toEqual([
      { kind: 'healHp', amount: 30 },
      { kind: 'revive', hpPercent: 30 },
    ])
    undo(rig)
    expect(useSpec(rig, 'herb')?.effects).toEqual([
      { kind: 'healHp', amount: 30 },
      { kind: 'healHp', amount: 100 },
    ])
    undo(rig)
    expect(useSpec(rig, 'herb')).toEqual(initial)
    expect(rig.session.canUndo()).toBe(false)
    redo(rig)
    redo(rig)
    redo(rig)
    redo(rig)
    expect(useSpec(rig, 'herb')?.effects).toEqual([
      { kind: 'revive', hpPercent: 45 },
      { kind: 'healHp', amount: 30 },
    ])
    redo(rig)
    expect(useSpec(rig, 'herb')).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount: 30 }],
    })
    assertK10SaveValid(rig)
  })

  test('独占场景钩子锁定使用目标与仅战斗开关并摘除 battleOnly，退回后复原', async () => {
    const rig = await loadK10ItemProject('k10-use-exclusive', {
      items: [
        {
          id: 'bell',
          name: '遁甲铃',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: { target: 'oneAlly', consuming: false, effects: [{ kind: 'healHp', amount: 30 }] },
        },
      ],
    })
    const errors: string[] = []
    await act(async () => {
      root.render(<UseChainHarness rig={rig} itemId="bell" errors={errors} />)
      await Promise.resolve()
    })
    const initial = deepSnapshot(useSpec(rig, 'bell'))

    // 正控：healHp 可战斗 → 仅战斗可用可开。
    expect(ruleCheckbox('仅战斗可用').disabled).toBe(false)
    expect(combobox(host, '使用目标').disabled).toBe(false)
    await act(async () => ruleCheckbox('仅战斗可用').click())
    expect(useSpec(rig, 'bell')).toEqual({
      target: 'oneAlly',
      consuming: false,
      battleOnly: true,
      effects: [{ kind: 'healHp', amount: 30 }],
    })

    // 切换为独占场景钩子：target 锁定 scene，battleOnly 键被摘除，两控件禁用。
    await chooseOption(combobox(effectCard(0), '效果 1 类型'), '调用场景钩子')
    expect(useSpec(rig, 'bell')).toEqual({
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'runSceneHook', hook: 'onTeleport', unavailableMessage: '此处无法使用。' }],
    })
    expect('battleOnly' in (useSpec(rig, 'bell') ?? {})).toBe(false)
    expect(combobox(host, '使用目标').disabled).toBe(true)
    expect(ruleCheckbox('仅战斗可用').disabled).toBe(true)
    assertK10SaveValid(rig)

    // 退回普通效果：target 复原 oneAlly，控件解锁；battleOnly 不复活（需用户重开）。
    await chooseOption(combobox(effectCard(0), '效果 1 类型'), '回复体力')
    expect(useSpec(rig, 'bell')).toEqual({
      target: 'oneAlly',
      consuming: false,
      effects: [{ kind: 'healHp', amount: 100 }],
    })
    expect(combobox(host, '使用目标').disabled).toBe(false)
    expect(ruleCheckbox('仅战斗可用').disabled).toBe(false)
    assertK10SaveValid(rig)
    expect(errors).toEqual([])

    // 撤销链：退回场景钩子态（仍无 battleOnly）→ 仅战斗开启态 → 初态。
    undo(rig)
    expect(useSpec(rig, 'bell')).toEqual({
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'runSceneHook', hook: 'onTeleport', unavailableMessage: '此处无法使用。' }],
    })
    undo(rig)
    expect(useSpec(rig, 'bell')).toEqual({
      target: 'oneAlly',
      consuming: false,
      battleOnly: true,
      effects: [{ kind: 'healHp', amount: 30 }],
    })
    undo(rig)
    expect(useSpec(rig, 'bell')).toEqual(initial)
    redo(rig)
    redo(rig)
    redo(rig)
    expect(useSpec(rig, 'bell')).toEqual({
      target: 'oneAlly',
      consuming: false,
      effects: [{ kind: 'healHp', amount: 100 }],
    })
  })

  test('可复用脚本切换消费真实选中 runtime ref，壳引用形态精确且可撤销', async () => {
    const rig = await loadK10ItemProject('k10-use-shared-script', {
      items: [
        {
          id: 'tome',
          name: '天书',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [{ kind: 'runScript', script: 'script/heal' }],
          },
        },
      ],
      sharedScripts: {
        'script/heal': { name: '治疗剧情', self: 'none', body: [] },
        'script/buff': { name: '加持剧情', self: 'none', body: [] },
      },
    })
    const errors: string[] = []
    await act(async () => {
      root.render(<UseChainHarness rig={rig} itemId="tome" errors={errors} />)
      await Promise.resolve()
    })

    // 装载形态：作者字符串 id 已被投影为当前 runtime ref（旧前缀不得复活：chunk 全等断言）。
    expect(useSpec(rig, 'tome')?.effects).toEqual([
      { kind: 'runScript', script: { chunk: '__author-script-runtime', id: 'script/heal' } },
    ])

    await chooseOption(combobox(effectCard(0), '可复用脚本'), '加持剧情 · script/buff')
    expect(useSpec(rig, 'tome')).toEqual({
      target: 'scene',
      consuming: false,
      effects: [
        { kind: 'runScript', script: { chunk: '__author-script-runtime', id: 'script/buff' } },
      ],
    })
    assertK10SaveValid(rig)
    expect(errors).toEqual([])

    undo(rig)
    expect(useSpec(rig, 'tome')?.effects).toEqual([
      { kind: 'runScript', script: { chunk: '__author-script-runtime', id: 'script/heal' } },
    ])
    redo(rig)
    expect(useSpec(rig, 'tome')?.effects).toEqual([
      { kind: 'runScript', script: { chunk: '__author-script-runtime', id: 'script/buff' } },
    ])
  })

  test('解毒方式按等级/指定毒往返与施毒改选：实际被消费输入完整落库', async () => {
    const rig = await loadK10ItemProject('k10-use-poison', {
      items: [
        {
          id: 'antidote',
          name: '解毒剂',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'oneAlly',
            consuming: true,
            effects: [
              { kind: 'curePoison', curesTier: 'common' },
              { kind: 'applyPoison', poisonId: '1' },
            ],
          },
        },
      ],
      poisons: [
        { id: 1, name: '赤毒', curability: 'common', color: 16 },
        { id: 2, name: '瘴气', curability: 'severe', color: 64 },
      ],
    })
    const errors: string[] = []
    await act(async () => {
      root.render(<UseChainHarness rig={rig} itemId="antidote" errors={errors} />)
      await Promise.resolve()
    })
    const initial = deepSnapshot(useSpec(rig, 'antidote'))
    expect(rig.session.getState().poisons?.map((poison) => poison.id)).toEqual([1, 2])

    // 解毒方式 → 指定毒：默认取首个毒种（id 字符串化）。
    await chooseOption(combobox(effectCard(0), '解毒方式'), '指定毒')
    expect(useSpec(rig, 'antidote')?.effects).toEqual([
      { kind: 'curePoison', poisonId: '1' },
      { kind: 'applyPoison', poisonId: '1' },
    ])

    // 指定毒改选瘴气。
    await chooseOption(combobox(effectCard(0), '指定毒'), '瘴气')
    expect(useSpec(rig, 'antidote')?.effects).toEqual([
      { kind: 'curePoison', poisonId: '2' },
      { kind: 'applyPoison', poisonId: '1' },
    ])

    // 方式退回按可解等级 → 回 common；再改最高等级为剧毒。
    await chooseOption(combobox(effectCard(0), '解毒方式'), '按可解等级')
    expect(useSpec(rig, 'antidote')?.effects).toEqual([
      { kind: 'curePoison', curesTier: 'common' },
      { kind: 'applyPoison', poisonId: '1' },
    ])
    await chooseOption(combobox(effectCard(0), '可解毒最高等级'), '剧毒')
    expect(useSpec(rig, 'antidote')?.effects).toEqual([
      { kind: 'curePoison', curesTier: 'severe' },
      { kind: 'applyPoison', poisonId: '1' },
    ])

    // 施毒卡改选瘴气（与解毒互不影响）。
    await chooseOption(combobox(effectCard(1), '毒'), '瘴气')
    expect(useSpec(rig, 'antidote')).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [
        { kind: 'curePoison', curesTier: 'severe' },
        { kind: 'applyPoison', poisonId: '2' },
      ],
    })
    assertK10SaveValid(rig)
    expect(errors).toEqual([])

    undo(rig)
    expect(useSpec(rig, 'antidote')?.effects).toEqual([
      { kind: 'curePoison', curesTier: 'severe' },
      { kind: 'applyPoison', poisonId: '1' },
    ])
    undo(rig)
    undo(rig)
    undo(rig)
    undo(rig)
    expect(useSpec(rig, 'antidote')).toEqual(initial)
    expect(rig.session.canUndo()).toBe(false)
    redo(rig)
    redo(rig)
    redo(rig)
    redo(rig)
    redo(rig)
    expect(useSpec(rig, 'antidote')).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [
        { kind: 'curePoison', curesTier: 'severe' },
        { kind: 'applyPoison', poisonId: '2' },
      ],
    })
    assertK10SaveValid(rig)
  })

  test('投掷字段族（法术力量耦合/状态抵抗）与末条删除守卫经真实会话落库', async () => {
    const rig = await loadK10ItemProject('k10-throw-fields', {
      items: [
        {
          id: 'dart',
          name: '飞刀',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          throw: { target: 'oneEnemy', effects: [{ kind: 'fixedDamage', amount: 5 }] },
        },
      ],
    })
    const errors: string[] = []
    await act(async () => {
      root.render(<ThrowChainHarness rig={rig} itemId="dart" errors={errors} />)
      await Promise.resolve()
    })
    const initial = deepSnapshot(throwSpec(rig, 'dart'))

    // 改类：固定伤害 → 法术伤害（默认固定力量 1）。
    await chooseOption(combobox(effectCard(0), '效果 1 类型'), '法术伤害')
    expect(throwSpec(rig, 'dart')?.effects).toEqual([
      {
        kind: 'magicDamage',
        baseDamage: 1,
        element: 'none',
        strength: { kind: 'fixed', value: 1 },
      },
    ])

    // 基础伤害字段提交 40。
    await setInputValue(fieldControlByLabel(effectCard(0), '基础伤害'), '40')
    expect(throwSpec(rig, 'dart')?.effects[0]).toMatchObject({ baseDamage: 40 })

    // 力量来源 → 按使用者武术随机：strength 形态整体切换。
    await chooseOption(combobox(effectCard(0), '投掷力量来源'), '按使用者武术随机')
    expect(throwSpec(rig, 'dart')?.effects).toEqual([
      {
        kind: 'magicDamage',
        baseDamage: 40,
        element: 'none',
        strength: {
          kind: 'casterAttack',
          bonus: 0,
          multiplier: { kind: 'uniformInt', min: 0, max: 3 },
        },
      },
    ])

    // 倍率耦合：下限 5 → 上限被抬到 5；上限 2 → 下限被压到 2。
    await setInputValue(fieldControlByLabel(effectCard(0), '武术倍率下限'), '5')
    expect(throwSpec(rig, 'dart')?.effects[0]).toMatchObject({
      strength: {
        kind: 'casterAttack',
        bonus: 0,
        multiplier: { kind: 'uniformInt', min: 5, max: 5 },
      },
    })
    await setInputValue(fieldControlByLabel(effectCard(0), '武术倍率上限'), '2')
    expect(throwSpec(rig, 'dart')?.effects[0]).toMatchObject({
      strength: {
        kind: 'casterAttack',
        bonus: 0,
        multiplier: { kind: 'uniformInt', min: 2, max: 2 },
      },
    })

    // 追加第二条并改为施加状态：状态与被抵抗语义逐字段落库。
    await act(async () => buttonByLabel(host, '添加效果').click())
    expect(throwSpec(rig, 'dart')?.effects).toHaveLength(2)
    await chooseOption(combobox(effectCard(1), '效果 2 类型'), '施加状态')
    expect(throwSpec(rig, 'dart')?.effects[1]).toEqual({
      kind: 'applyStatus',
      status: 'sleep',
      turns: 1,
      onResist: 'continue',
    })
    await chooseOption(combobox(effectCard(1), '投掷施加状态'), '混乱')
    await chooseOption(combobox(effectCard(1), '状态被抵抗后'), '停止当前目标的后续效果')
    expect(throwSpec(rig, 'dart')?.effects[1]).toEqual({
      kind: 'applyStatus',
      status: 'confused',
      turns: 1,
      onResist: 'stopTarget',
    })

    // 投掷目标切换全体敌人。
    await chooseOption(combobox(host, '投掷目标'), '全体敌人')
    expect(throwSpec(rig, 'dart')?.target).toBe('allEnemies')
    assertK10SaveValid(rig)

    // 末条删除守卫：删到只剩一条后删除按钮禁用，零新提交。
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 2"]')!.click()
    })
    expect(throwSpec(rig, 'dart')?.effects).toHaveLength(1)
    const historyBeforeGuard = rig.session.getHistoryVersion()
    const lastRemove = host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 1"]')!
    expect(lastRemove.disabled).toBe(true)
    expect(lastRemove.title).toBe('投掷能力至少保留一个效果')
    expect(rig.session.getHistoryVersion()).toBe(historyBeforeGuard)
    expect(errors).toEqual([])

    // 撤销逐步回初态，重做回终态（终态：全体敌人 + 单条法术伤害；共 11 条历史）。
    for (let step = 0; step < 11; step += 1) undo(rig)
    expect(throwSpec(rig, 'dart')).toEqual(initial)
    expect(rig.session.canUndo()).toBe(false)
    for (let step = 0; step < 11; step += 1) redo(rig)
    expect(throwSpec(rig, 'dart')).toEqual({
      target: 'allEnemies',
      effects: [
        {
          kind: 'magicDamage',
          baseDamage: 40,
          element: 'none',
          strength: {
            kind: 'casterAttack',
            bonus: 0,
            multiplier: { kind: 'uniformInt', min: 2, max: 2 },
          },
        },
      ],
    })
    assertK10SaveValid(rig)
  })
})
