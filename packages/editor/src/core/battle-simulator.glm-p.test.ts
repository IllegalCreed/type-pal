// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P05（battle-simulator.glm-p）：战斗模拟器库 resolver 分段 label 臂、
 * 保留路径守卫冲突两臂与空试打方案/成员精确形态（P05 首批）。
 * 去重（真实旧 fullName 锚）：
 * - battle-simulator-library.test.ts › missing preset references remain repairable but cannot
 *   be resolved, even when overridden（已证 party 段 '我方预设不存在' 与方案缺席
 *   '试打方案不存在'）；本文件核敌方/背包两段 label——旧集未断言臂。
 * - battle-simulator-persistence.test.ts › reserved sidecar path collisions are rejected even
 *   when no library is being saved（已证精确命中臂（大小写不敏感））；本文件核
 *   「声明路径位于保留目录之下」与「保留文件位于声明目录之下」两臂及近邻不冲突对照。
 * - battle-simulator-state.wave2.test.ts › subject … 与 trial catalog …（已证 subject 三臂
 *   与 trialCatalog 投影；emptyTrialPlan 仅作构件传递）；本文件核 emptyTrialPlan 战场 id
 *   取首项/缺席回退 0 与 emptyTrialMember 精确值形态。
 * 合法输入：共享 simulatorLibrary() typed 夹具（只读复用）+ pEditorState typed manifest；
 * 悬空预设引用是解析合法、由 collectSimulatorLibraryIssues 单独诊断的作者态（库注释 :209）。
 */
import { describe, expect, test } from 'vitest'
import { pEditorState } from '../__tests__/glm-p/kit.js'
import { simulatorLibrary } from './__tests__/battle-simulator-fixture.js'
import {
  assertBattleSimulatorPathAvailable,
  resolveBattleSimulatorPlan,
} from './battle-simulator-library.js'
import { emptyTrialMember, emptyTrialPlan } from './battle-simulator-state.js'
import type { EditorState } from './edit-session.js'

describe('P05-G08 resolveBattleSimulatorPlan 预设缺失 label 分段臂', () => {
  test('敌方与背包各自指名（party 段为旧证 library.test.ts:46）', () => {
    const enemiesMissing = simulatorLibrary()
    enemiesMissing.enemies = []
    expect(() => resolveBattleSimulatorPlan(enemiesMissing, 'plan-a')).toThrow(
      '敌方预设不存在：enemy-a',
    )

    const bagsMissing = simulatorLibrary()
    bagsMissing.bags = []
    expect(() => resolveBattleSimulatorPlan(bagsMissing, 'plan-a')).toThrow('背包预设不存在：bag-a')
  })
})

describe('P05-G09 assertBattleSimulatorPathAvailable 保留路径冲突两臂', () => {
  test('声明路径位于保留目录之下/保留文件位于声明目录之下；近邻不冲突放行（精确命中臂为旧证 persistence:288）', () => {
    const projectOf = (
      locale: string,
    ): Parameters<typeof assertBattleSimulatorPathAvailable>[0] => {
      const state: EditorState = pEditorState()
      return {
        manifest: { ...state.manifest, content: { locale } },
        mapIndex: state.mapIndex,
        sceneIndex: state.sceneIndex,
        assetCatalog: state.assetCatalog,
      }
    }

    expect(() =>
      assertBattleSimulatorPathAvailable(projectOf('editor/battle-simulator.json/notes.json')),
    ).toThrow(
      '战斗模拟器保留路径冲突：editor/battle-simulator.json 与 editor/battle-simulator.json/notes.json',
    )
    expect(() => assertBattleSimulatorPathAvailable(projectOf('editor'))).toThrow(
      '战斗模拟器保留路径冲突：editor/battle-simulator.json 与 editor',
    )
    expect(() =>
      assertBattleSimulatorPathAvailable(projectOf('editor/notes/other.json')),
    ).not.toThrow()
  })
})

describe('P05-G10 emptyTrialPlan 战场 id 来源臂', () => {
  test('battleFields 在场取首项 id；缺席回退 0', () => {
    const withFields = pEditorState({
      battleFields: [
        { id: 3, screenWave: 1, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
        { id: 9, screenWave: 1, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      ],
    })
    expect(emptyTrialPlan(withFields).fieldId).toBe(3)
    expect(emptyTrialPlan(pEditorState()).fieldId).toBe(0)
  })
})

describe('P05-G11 emptyTrialMember 精确形态', () => {
  test('stats/equipment 空对象、skills inherit、hp/mp full', () => {
    expect(emptyTrialMember('hero')).toEqual({
      actorId: 'hero',
      stats: {},
      equipment: {},
      skills: { kind: 'inherit' },
      hp: { kind: 'full' },
      mp: { kind: 'full' },
    })
  })
})
