// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M03（EnemyTab.glm-m）：AI 动作未触达轴当前合同。
 * 去重：EnemyTab.test.tsx / glm-ui-wave U1b / kimi K11-K12 已证新建/删除门/数值/偷取/附带效果/
 * 击败奖励/加删规则/attack/cast/summon(含 enemyId 引用)/once/重排；本文件只补：
 * 召唤数量从缺省 1 改为 3 的真实提交、分裂动作（divide → 分裂数量 copies）落账与撤销——
 * 旧断言中「召唤数量」「分裂数量」两输入从未被驱动。
 */
import type { EnemyDef, ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buttonByText,
  controlByAriaLabel,
  fillAndBlur,
  loadLegalProject,
  pickCombobox,
  stubNodeTestHost,
} from '../__tests__/glm-m/kit.js'
import { withSharedEnemyBattleSprite } from '../core/__tests__/cursor-command-boundary-fixtures.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
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
  { id: 'item-m', name: 'name.item-m', desc: [], buyPrice: 10, sellPrice: 5, sellable: true },
]

async function legalEnemyState(enemies: EnemyDef[]): Promise<EditorState> {
  const { source, state } = await loadLegalProject('glm-wave-m-enemy')
  const withSprite = await withSharedEnemyBattleSprite(
    source,
    structuredClone(state),
    'enemy-shape-m',
  )
  const next = {
    ...withSprite,
    enemies: enemies.map((entry) => ({ ...entry, battleSprite: 'enemy-shape-m' })),
    items,
    enemyTeams: enemies.length > 0 ? [{ id: 'team-m', slots: [enemies[0]!.id] }] : [],
  }
  assertProjectSaveValid(next)
  return next
}

function Harness(props: { session: EditSession }) {
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
      getCurrentReferenceIndex={(next) => collectCurrentProjectReferenceIndex(next)}
      focusObjectId="enemy-m"
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
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

async function mountWithRule(): Promise<EditSession> {
  const session = new EditSession(await legalEnemyState([enemy('enemy-m')]))
  await act(async () => {
    root.render(<Harness session={session} />)
    await Promise.resolve()
  })
  await act(async () => buttonByText(host, '加规则').click())
  expect(session.getState().enemies![0]!.ai.rules).toEqual([{ at: 'act', do: { kind: 'attack' } }])
  return session
}

function rules(session: EditSession): unknown {
  return session.getState().enemies![0]!.ai.rules
}

describe('M03 EnemyTab AI 动作未触达轴', () => {
  test('召唤动作后「召唤数量」3 落账，undo 回缺省 1', async () => {
    const session = await mountWithRule()
    const actionTrigger = host.querySelector<HTMLButtonElement>('[aria-label="执行动作"]')
    await pickCombobox(actionTrigger!, '召唤')
    expect(rules(session)).toEqual([{ at: 'act', do: { kind: 'summon', count: 1 } }])

    await fillAndBlur(controlByAriaLabel<HTMLInputElement>(host, '召唤数量'), '3')
    expect(rules(session)).toEqual([{ at: 'act', do: { kind: 'summon', count: 3 } }])

    expect(session.undo()).toBe(true)
    expect(rules(session)).toEqual([{ at: 'act', do: { kind: 'summon', count: 1 } }])
  })

  test('分裂动作落 divide 缺省 copies=1，「分裂数量」改 5 单命令可撤销', async () => {
    const session = await mountWithRule()
    const before = session.getHistoryVersion()
    const actionTrigger = host.querySelector<HTMLButtonElement>('[aria-label="执行动作"]')
    await pickCombobox(actionTrigger!, '分裂')
    expect(rules(session)).toEqual([{ at: 'act', do: { kind: 'divide', copies: 1 } }])
    expect(session.getHistoryVersion()).toBe(before + 1)

    await fillAndBlur(controlByAriaLabel<HTMLInputElement>(host, '分裂数量'), '5')
    expect(rules(session)).toEqual([{ at: 'act', do: { kind: 'divide', copies: 5 } }])
    expect(session.getHistoryVersion()).toBe(before + 2)

    expect(session.undo()).toBe(true)
    expect(rules(session)).toEqual([{ at: 'act', do: { kind: 'divide', copies: 1 } }])
  })
})
