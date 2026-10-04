// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-BATTLE-REGISTRY-1（GLM）：EnemyTeamTab 宿主深链同步的当前合同。
 * 目标源 EnemyTeamTab.tsx:225-230（focusObjectId 受控效果）。
 *
 * 旧断言去重（旧 file/title → 已证合同 → 本组缺口；只测缺口）：
 * - EnemyTeamTab.kimi-workflows（K11 ×6）：槽位编辑/裁剪/undo 对称、上移下移、新建守卫
 *  （空 ID/重名/预选 team-c2/取消/undo redo）、删除全链、汇总跟踪敌人定义变更、目录过滤；
 *  不重复。K11 的 Harness 只经 onObjectFocus 回喂 focus（等价点击回路），宿主在挂载后主动
 *  改深链（未点击、非本组件上报）的输入从未出现。
 * - EnemyTeamTab.test.tsx ×10：canonical main owner、目录标题、五槽渲染/totals/试打/阻断、
 *  击败摘要、偷取摘要、复制+自定义 id 创建、swap 重排、引用 fail-closed 四态；其中 Harness
 *  的 focusObjectId 是静态 prop，挂载后不变；不重复。
 * - core/enemy-team-commands.test 直测命令层；不重复。
 *
 * 主动放弃分支（举证）：
 * - 槽位 invalid 悬空标记 / 缺失敌 id 回退显示：悬空敌引用被保存门判 error
 *  （packages/content/src/validate-refs.ts:1378-1384），合法 fixture 不可达（K11 同判）。
 * - create/copy 的 nextTeamId 空洞语义（[team-c1,team-c3]→team-c2）：与 K11 test 3 的预选
 *  （[team-c1]→team-c2）同 caller（beginCreate/copy）同 oracle（nextTeamId 循环），仅输入
 *  差在 id 集合非连续；「copies the current preset」已证 copy 落位+undo；按同 caller 同
 *  oracle 排重，不另立合同。
 *
 * 本文件全部走真实组件 DOM → 真实 EditSession/AddEnemyTeamCommand + loadLegalUiProject 合法
 * 项目（assertProjectSaveValid 自证）。唯一驱动：受控 focusObjectId prop 在挂载后变化
 * （等价 DataMode 宿主深链），不 mock 被测函数。
 */
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AddEnemyTeamCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  buttonByLabel,
  loadLegalUiProject,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { EnemyTeamTab } from './EnemyTeamTab.js'

interface Controller {
  setFocus?: (id: string | undefined) => void
}

function Harness(props: { session: EditSession; controller: Controller }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const [focus, setFocus] = useState<string | undefined>(undefined)
  props.controller.setFocus = setFocus
  const current = props.session.getState()
  return (
    <EnemyTeamTab
      enemyTeams={current.enemyTeams ?? []}
      enemies={current.enemies ?? []}
      items={current.items ?? []}
      locale={current.locale ?? {}}
      assetCatalog={current.assetCatalog}
      worldVariables={current.worldVariables ?? {}}
      actors={current.actors ?? []}
      scenes={current.scenes ?? []}
      session={props.session}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      focusObjectId={focus}
      onObjectFocus={() => undefined}
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

describe('BR-05 EnemyTeamTab 宿主深链同步', () => {
  test('创建卡打开时深链跳转既有敌队：卡关闭、选择跟随、零提交；陈旧深链不偷换选择', async () => {
    const legal = await loadLegalUiProject('glm-reg-team-focus')
    let seeded = new AddEnemyTeamCommand({ id: 'team-c1', slots: [] }).apply(legal.state)
    seeded = new AddEnemyTeamCommand({ id: 'team-c3', slots: [] }).apply(seeded)
    assertProjectSaveValid(seeded)
    const session = new EditSession(seeded)
    const controller: Controller = {}
    await act(async () => {
      root.render(<Harness session={session} controller={controller} />)
      await Promise.resolve()
    })
    expect(host.querySelector('h1')?.textContent).toBe('team-c1')

    // 打开创建卡后宿主深链到达：创建卡收起、选择跳到目标队，全程零提交。
    await act(async () => {
      buttonByLabel(host, '新建敌队').click()
    })
    expect(host.querySelector('.enemy-team-create-card')).not.toBeNull()
    await act(async () => {
      controller.setFocus?.('team-c3')
      await Promise.resolve()
    })
    expect(host.querySelector('.enemy-team-create-card')).toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('team-c3')
    expect(session.getHistoryVersion()).toBe(0)

    // 再次深链另一队：选择跟随。
    await act(async () => {
      controller.setFocus?.('team-c1')
      await Promise.resolve()
    })
    expect(host.querySelector('h1')?.textContent).toBe('team-c1')

    // 指向不存在敌队的陈旧深链不偷换当前选择。
    await act(async () => {
      controller.setFocus?.('team-missing')
      await Promise.resolve()
    })
    expect(host.querySelector('h1')?.textContent).toBe('team-c1')
    expect(session.getHistoryVersion()).toBe(0)
  })
})
