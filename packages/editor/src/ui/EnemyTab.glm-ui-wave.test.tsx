// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U1b：EnemyTab 残差。
 * 去重：EnemyTab.test.tsx 已证新建/删除 commit、名字 locale、数值/collectValue、
 * 键盘 AI 重排、偷取金额与击败奖励概率、引用门禁——本文件只补当前公开入口仍未证明的业务交互：
 * 删除确认取消零提交、加规则/删规则（含 ai.rules 键移除）、偷取无/物品两轴、
 * 启用附带效果开关、击败奖励从无到有且保留旁事件、二动、敌队行跳转回调。
 */

// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { EnemyDef, ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { withSharedEnemyBattleSprite } from '../core/__tests__/cursor-command-boundary-fixtures.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  chooseComboboxOption,
  clickButton,
  clickCheckboxByLabel,
  fieldControlByLabel,
  loadLegalUiProject,
} from './__tests__/glm-ui-wave-kit.js'
import { EnemyTab } from './EnemyTab.js'

function enemy(id: string): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: 'battle.enemy',
    yPosOffset: 0,
    stats: {
      health: 50,
      level: 1,
      exp: 1,
      cash: 1,
      attackStrength: 10,
      magicStrength: 10,
      defense: 10,
      dexterity: 10,
      fleeRate: 10,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
}

const items: ItemData[] = [
  { id: 'item-a', name: 'name.item-a', desc: [], buyPrice: 10, sellPrice: 5, sellable: true },
  { id: 'item-b', name: 'name.item-b', desc: [], buyPrice: 20, sellPrice: 10, sellable: true },
]

/** 正式 blank 项目 + 敌方战斗精灵注册 + 被编排敌人/物品，经保存门自证。 */
async function legalEnemyState(enemies: EnemyDef[]): Promise<EditorState> {
  const { source, state } = await loadLegalUiProject('glm-ui-wave-enemy')
  const withSprite = await withSharedEnemyBattleSprite(
    source,
    structuredClone(state),
    'enemy-shape',
  )
  const next = {
    ...withSprite,
    enemies: enemies.map((enemy) => ({ ...enemy, battleSprite: 'enemy-shape' })),
    items,
    enemyTeams: enemies.length > 0 ? [{ id: 'team-7', slots: [enemies[0]!.id] }] : [],
  }
  assertProjectSaveValid(next)
  return next
}

function Harness(props: {
  session: EditSession
  focusObjectId?: string
  onOpenEnemyTeam?: (id: string) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <EnemyTab
      enemies={current.enemies ?? []}
      enemyTeams={current.enemyTeams ?? []}
      skills={current.skills ?? []}
      items={current.items ?? []}
      locale={current.locale ?? {}}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={{} as never}
      battleSprites={current.battleSprites ?? []}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      focusObjectId={props.focusObjectId}
      onOpenEnemyTeam={props.onOpenEnemyTeam}
    />
  )
}

let root: Root
let host: HTMLDivElement

vi.stubGlobal('Blob', NodeBlob)
vi.stubGlobal('crypto', webcrypto)
afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

async function mountEnemy(enemies: EnemyDef[], focus = 'enemy-a'): Promise<EditSession> {
  const session = new EditSession(await legalEnemyState(enemies))
  await act(async () => {
    root.render(<Harness session={session} focusObjectId={focus} />)
    await Promise.resolve()
  })
  return session
}

describe('U1b EnemyTab 残差', () => {
  test('删除确认取消 → 零提交：历史与列表均不变', async () => {
    const session = await mountEnemy([enemy('enemy-a'), enemy('enemy-b')], 'enemy-b')
    const before = session.getHistoryVersion()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await clickButton(host, '删除敌人')
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(session.getHistoryVersion()).toBe(before)
    expect(session.getState().enemies).toHaveLength(2)
  })

  test('加规则单命令提交且 undo 移除；删最后一条规则清掉 ai.rules 键', async () => {
    const session = await mountEnemy([enemy('enemy-a')])
    const before = session.getHistoryVersion()
    await clickButton(host, '加规则')
    expect(session.getState().enemies![0]!.ai.rules).toEqual([
      { at: 'act', do: { kind: 'attack' } },
    ])
    expect(session.getHistoryVersion()).toBe(before + 1)
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().enemies![0]!.ai.rules).toBeUndefined()
    await clickButton(host, '加规则')
    const deleteButton = host.querySelector<HTMLButtonElement>('button[aria-label="删除 AI 规则"]')
    expect(deleteButton, 'delete rule button').not.toBeNull()
    await act(async () => {
      deleteButton!.click()
    })
    expect(session.getState().enemies![0]!.ai.rules).toBeUndefined()
  })

  test('偷取无→删键、物品→首个物品；启用附带效果开与关', async () => {
    const seeded = { ...enemy('enemy-a'), steal: { itemId: 'item-a', count: 2 } }
    const s0 = await mountEnemy([seeded])
    await chooseComboboxOption(fieldControlByLabel(host, '偷取内容'), '无')
    expect(s0.getState().enemies![0]!.steal).toBeUndefined()
    await chooseComboboxOption(fieldControlByLabel(host, '偷取内容'), '物品')
    expect(s0.getState().enemies![0]!.steal).toEqual({ itemId: 'item-a', count: 1 })
    await clickCheckboxByLabel(host, '启用附带效果')
    expect(s0.getState().enemies![0]!.attackEquivItem).toEqual({ itemId: 'item-a', rate: 1 })
    await clickCheckboxByLabel(host, '启用附带效果')
    expect(s0.getState().enemies![0]!.attackEquivItem).toBeUndefined()
  })

  test('击败奖励从无到有提交 giveItem；二动提交；敌队行传出回调', async () => {
    const session = await mountEnemy([enemy('enemy-a')])
    await clickCheckboxByLabel(host, '击败后发放物品')
    const events = session.getState().enemies![0]!.onDefeated as unknown as Array<
      Record<string, unknown>
    >
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'giveItem', itemId: 'item-a', count: 1 })

    const teamOpen: string[] = []
    const two = new EditSession(await legalEnemyState([enemy('enemy-a')]))
    await act(async () => {
      root.render(
        <Harness
          session={two}
          focusObjectId="enemy-a"
          onOpenEnemyTeam={(id) => teamOpen.push(id)}
        />,
      )
      await Promise.resolve()
    })
    await clickCheckboxByLabel(host, '二动（一回合行动两次）')
    expect(two.getState().enemies![0]!.stats.dualMove).toBe(true)
    await clickButton(host, 'team-7')
    expect(teamOpen).toEqual(['team-7'])
  })
})
