// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1（EnemyTab）：深链 focus 守卫合同。
 * 去重（旧证据锚点）：
 * - EnemyTab.test.tsx（13 例）已证目录/搜索/有效深链定位、数值/音效分组提交、AI 重排、
 *   物品交互与击败奖励、事件查看器、fail-closed、自变身不自锁、live oracle。
 * - EnemyTab.kimi-workflows.test.tsx（6 组）已证新建守卫与生产模板、删除引用证明全链、
 *   AI 规则行编辑、变身/召唤引用产生与解除、战斗音效、击败后奖励保留旁事件。
 * - EnemyTab.glm-ui-wave.test.tsx 已证删除取消零提交、加/删规则、偷取切换、二动与敌队回调。
 * - EnemyTab.glm-m.test.tsx 已证召唤/分裂数量提交。
 * 缺口（本文件）：focus effect 的守卫臂（EnemyTab.tsx:607-616）——无效/陈旧深链
 * （指向不存在敌人）必须被忽略：不崩溃、不伪造选中、不偷换当前选择；后续有效深链
 * 仍可应用；全程零命令。旧测深链全部一次性有效，appliedFocusObjectId 防重入与
 * `enemies.some(...)` 守卫从未被证明。
 * 底座为真实 blank 项目 + 生产 AddEnemyCommand/UpdateLocaleCommand 播种。
 */
import type { EnemyDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import type { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { withSharedEnemyBattleSprite } from '../core/__tests__/cursor-command-boundary-fixtures.js'
import { AddEnemyCommand, UpdateLocaleCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  createDataBattleHost,
  type DataBattleHost,
  destroyDataBattleHost,
} from './__tests__/glm-data-battle-kit.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { EnemyTab } from './EnemyTab.js'

const ENEMY_A = 'enemy-a'
const ENEMY_B = 'enemy-b'
const ENEMY_SPRITE_ID = 'enemy-glm-data-battle'

/** 与产品 newEnemy（EnemyTab.tsx:174-199）同形的种子敌人。 */
function makeEnemy(id: string): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: ENEMY_SPRITE_ID,
    yPosOffset: 0,
    stats: {
      health: 50,
      level: 1,
      exp: 5,
      cash: 5,
      attackStrength: 20,
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
    ai: { resistanceToSorcery: 5 },
    sounds: {},
  }
}

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(async () => {
  const mounted = await createDataBattleHost()
  host = mounted.host
  root = mounted.root
})

afterEach(async () => {
  await destroyDataBattleHost({ host, root } satisfies DataBattleHost)
})

function Harness(props: {
  session: EditSession
  source: Parameters<typeof createEditorAssetReader>[0]
  focusObjectId?: string
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const reader = createEditorAssetReader(props.source, () => props.session.getState())
  return (
    <EnemyTab
      enemies={current.enemies ?? []}
      enemyTeams={current.enemyTeams ?? []}
      skills={current.skills ?? []}
      items={current.items ?? []}
      locale={current.locale ?? {}}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={reader}
      battleSprites={current.battleSprites ?? []}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(next) => collectCurrentProjectReferenceIndex(next)}
      focusObjectId={props.focusObjectId}
    />
  )
}

interface EnemyBundle {
  session: EditSession
  source: Parameters<typeof createEditorAssetReader>[0]
}

async function seeded(): Promise<EnemyBundle> {
  const legal = await loadLegalUiProject('glm-data-battle-enemy')
  let state = await withSharedEnemyBattleSprite(legal.source, legal.state, ENEMY_SPRITE_ID)
  state = new AddEnemyCommand(makeEnemy(ENEMY_A)).apply(state)
  state = new AddEnemyCommand(makeEnemy(ENEMY_B)).apply(state)
  state = new UpdateLocaleCommand(`name.${ENEMY_A}`, '赤鬼').apply(state)
  state = new UpdateLocaleCommand(`name.${ENEMY_B}`, '青鬼').apply(state)
  assertProjectSaveValid(state)
  return { session: new EditSession(state), source: legal.source }
}

async function mount(bundle: EnemyBundle, focusObjectId?: string): Promise<void> {
  await act(async () => {
    root.render(
      <Harness session={bundle.session} source={bundle.source} focusObjectId={focusObjectId} />,
    )
    await Promise.resolve()
  })
}

describe('TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 EnemyTab', () => {
  test('无效/陈旧深链被忽略不偷换选择；后续有效深链仍应用；全程零命令', async () => {
    const bundle = await seeded()

    // 深链指向不存在的敌人：守卫忽略，选中保持目录第一项，不崩溃不伪造。
    await mount(bundle, 'enemy-gone')
    expect(host.querySelector('h1')?.textContent).toBe('赤鬼')
    expect(
      host.querySelector('.ds-catalog-row[data-selected="true"] .ds-catalog-row__title')
        ?.textContent,
    ).toBe('赤鬼')

    // 父级换入有效深链：正常应用。
    await act(async () => {
      root.render(
        <Harness session={bundle.session} source={bundle.source} focusObjectId={ENEMY_B} />,
      )
    })
    expect(host.querySelector('h1')?.textContent).toBe('青鬼')
    expect(
      host.querySelector('.ds-catalog-row[data-selected="true"] .ds-catalog-row__title')
        ?.textContent,
    ).toBe('青鬼')

    // 再换入另一个无效深链（appliedFocusObjectId 防重入后的新值）：仍保持当前选择。
    await act(async () => {
      root.render(
        <Harness session={bundle.session} source={bundle.source} focusObjectId="enemy-also-gone" />,
      )
    })
    expect(host.querySelector('h1')?.textContent).toBe('青鬼')
    expect(
      host.querySelector('.ds-catalog-row[data-selected="true"] .ds-catalog-row__title')
        ?.textContent,
    ).toBe('青鬼')

    // focus 应用全程不写历史。
    expect(bundle.session.getHistoryVersion()).toBe(0)
    assertProjectSaveValid(bundle.session.getState())
  })
})
