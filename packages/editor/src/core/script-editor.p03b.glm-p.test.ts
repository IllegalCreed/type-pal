// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P03b（script-editor.p03b.glm-p）：canonical 脚本 scheme 索引与
 * 实体走访暗区合同（P03 续批）。
 * 去重（真实旧 fullName 锚）：
 * - script-editor.test.ts › collects state-machine transitions with stable owner and
 *   exact path（已证 transition visits 主链）；本文件 collectCanonicalScriptCommandVisits
 *   的 hostile.onLose/zone 页走访臂为不同来源轴。
 * - script-references.test.ts › 同一 walker 覆盖场景槽、实体页、共享 chunk、分支与战败
 *   命令（已证 walker 覆盖面）；本合同核 visitCanonicalScriptCommands 对 zone 实体与
 *   无 pages 实体的精确跳过/包含语义及 locator 容器字段。
 * - buildCanonicalSchemeReferenceIndexesFromVisits 的 page-binding/command/hook 三类
 *   entry 聚合（key 精确形态）无旧直测 fullName。
 * 合法输入：与 script-editor.test.ts 同构 typed fixture（zone 实体合法：无外观触发区）。
 */
import type { AuthorCommand, AuthorSceneDef, AuthorScriptFlow } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  buildCanonicalSchemeReferenceIndexesFromVisits,
  type CanonicalScriptCommandVisit,
  collectCanonicalScriptCommandVisits,
  type ScriptEditorState,
  ScriptEditSession,
} from './script-editor.js'

const target = { scene: 's001', entity: 'e1' }

function stageFlow(body: AuthorCommand[] = []): AuthorScriptFlow {
  return { kind: 'stages', initial: 'start', stages: [{ id: 'start', body }] }
}

function selectionCommand(behaviorId: string): AuthorCommand {
  return {
    kind: 'selectEntityBehavior',
    target,
    channel: 'trigger',
    selection: { kind: 'use', value: behaviorId },
  }
}

/** 可见实体（带外观与行为） */
function npcEntity(): AuthorSceneDef['entities'][number] {
  return {
    id: 'e1',
    sprite: 'npc',
    pos: { col: 1, row: 1, height: 0 },
    initialPage: 'default',
    pages: [
      {
        id: 'default',
        label: '默认页',
        trigger: 'talk',
        triggerActivation: { on: 'interact', range: 1 },
      },
    ],
    behaviors: {
      trigger: {
        talk: { label: '交谈', order: 0, flow: stageFlow([selectionCommand('talk')]) },
      },
    },
  }
}

/** 无外观触发区（zone）：合法 EntityRef 第三选一 */
function zoneEntity(): AuthorSceneDef['entities'][number] {
  return {
    id: 'zone-1',
    zone: true as const,
    pos: { col: 3, row: 3, height: 0 },
  }
}

/** 敌对实体（hostile.onLose 命令来源） */
function hostileEntity(): AuthorSceneDef['entities'][number] {
  return {
    id: 'e2',
    sprite: 'npc',
    pos: { col: 2, row: 2, height: 0 },
    hostile: {
      enemyTeamId: 'team-1',
      onLose: [selectionCommand('talk')],
      onVictory: { kind: 'remove' },
      onPlayerFlee: { kind: 'remain' },
    },
  }
}

function sceneDef(entities: AuthorSceneDef['entities']): AuthorSceneDef {
  return {
    id: 's001',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities,
  }
}

function stateWith(entities: AuthorSceneDef['entities']): ScriptEditorState {
  // 公开准入门：真实 ScriptEditSession 构造（作者校验+引用闭包），非法即测试失败。
  const build = (): ScriptEditorState => ({
    scenes: [sceneDef(entities)],
    items: [],
    sharedScripts: {
      'shared/user/lib': {
        name: '共享库',
        self: 'none',
        body: [
          {
            kind: 'setFlag',
            flag: 'lib-used',
            value: true,
          },
        ],
      },
    },
  })
  void new ScriptEditSession(structuredClone(build()))
  return build()
}

const paths = (visits: readonly CanonicalScriptCommandVisit[]) => visits.map((v) => v.path)

describe('P03-G15 visitCanonicalScriptCommands 走访臂', () => {
  test('实体 behavior flow 命令携带 entity-behavior owner 与完整 flow 路径', () => {
    const visits = collectCanonicalScriptCommandVisits(stateWith([npcEntity()]))
    const hit = paths(visits).filter((p) => p.includes('behaviors.trigger.talk.flow'))
    expect(hit).toContain(
      'scenes.s001.entities.e1.behaviors.trigger.talk.flow.stages.start.body[0]',
    )
    const visit = visits.find(
      (v) => v.path === 'scenes.s001.entities.e1.behaviors.trigger.talk.flow.stages.start.body[0]',
    )!
    expect(visit.locator.owner).toEqual({
      kind: 'entity-behavior',
      sceneId: 's001',
      entityId: 'e1',
      channel: 'trigger',
      behaviorId: 'talk',
    })
    expect(visit.locator.container).toEqual({ kind: 'step', stepId: 'start', section: 'body' })
  })

  test('hostile.onLose 命令以独立来源走访且路径精确', () => {
    // onLose 命令引用同场景 e1（靶实体必须在场，公开校验核实体存在性）。
    const visits = collectCanonicalScriptCommandVisits(stateWith([npcEntity(), hostileEntity()]))
    const hit = paths(visits).filter((p) => p.includes('hostile.onLose'))
    expect(hit).toEqual(['scenes.s001.entities.e2.hostile.onLose[0]'])
  })

  test('zone 实体（无外观触发区）合法且不产出 behavior/hook 走访', () => {
    const visits = collectCanonicalScriptCommandVisits(stateWith([zoneEntity()]))
    expect(paths(visits).filter((p) => p.includes('zone-1'))).toEqual([])
  })

  test('共享脚本命令走访携带 shared-script owner 与 body 容器', () => {
    const visits = collectCanonicalScriptCommandVisits(stateWith([]))
    const shared = visits.filter((v) => v.path.startsWith('sharedScripts.'))
    expect(shared).toHaveLength(1)
    expect(shared[0]!.path).toBe('sharedScripts.shared/user/lib.body[0]')
    expect(shared[0]!.locator.owner).toEqual({ kind: 'shared-script', scriptId: 'shared/user/lib' })
    expect(shared[0]!.locator.container).toEqual({ kind: 'body' })
  })
})

describe('P03-G16 scheme 引用索引聚合', () => {
  test('page-binding entry：按 canonicalBehaviorReferenceKey 聚合 page 引用', () => {
    const state = stateWith([npcEntity()])
    const visits = collectCanonicalScriptCommandVisits(state)
    const indexes = buildCanonicalSchemeReferenceIndexesFromVisits(state, visits)
    const key = JSON.stringify(['s001', 'e1', 'trigger', 'talk'])
    const entry = indexes.behavior.get(key)
    expect(entry).toBeDefined()
    expect(
      entry!.some(
        (ref) =>
          ref.kind === 'page' && ref.path === 'scenes.s001.entities.e1.pages.default.trigger',
      ),
    ).toBe(true)
    expect(indexes.behaviorEntries.length).toBeGreaterThanOrEqual(1)
    expect(indexes.behaviorEntries[0]).toMatchObject({
      target: { scene: 's001', entity: 'e1' },
      channel: 'trigger',
      behaviorId: 'talk',
      use: 'page-binding',
    })
  })

  test('同键引用按走访序精确追加：page-binding 在前、命令 selection 在后', () => {
    const state = stateWith([npcEntity()])
    const visits = collectCanonicalScriptCommandVisits(state)
    const indexes = buildCanonicalSchemeReferenceIndexesFromVisits(state, visits)
    const key = JSON.stringify(['s001', 'e1', 'trigger', 'talk'])
    const entry = indexes.behavior.get(key)!
    // 精确完整顺序：page-binding（页槽）→ 命令 selection（behavior body）。
    expect(entry).toEqual([
      {
        kind: 'page',
        path: 'scenes.s001.entities.e1.pages.default.trigger',
        locator: {
          kind: 'entity-page',
          sceneId: 's001',
          entityId: 'e1',
          pageId: 'default',
          channel: 'trigger',
        },
      },
      {
        kind: 'command',
        path: 'scenes.s001.entities.e1.behaviors.trigger.talk.flow.stages.start.body[0]',
        locator: {
          kind: 'command',
          owner: {
            kind: 'entity-behavior',
            sceneId: 's001',
            entityId: 'e1',
            channel: 'trigger',
            behaviorId: 'talk',
          },
          container: { kind: 'step', stepId: 'start', section: 'body' },
          commandPath: '0',
        },
      },
    ])
  })

  test('scene-hook entry 以 canonicalSceneHookReferenceKey 聚合', () => {
    const state = stateWith([])
    state.scenes[0]!.hooks = {
      onEnter: {
        initial: 'enter-a',
        variants: {
          'enter-a': { label: '进场A', order: 0, flow: stageFlow() },
        },
      },
    }
    const visits = collectCanonicalScriptCommandVisits(state)
    const indexes = buildCanonicalSchemeReferenceIndexesFromVisits(state, visits)
    const key = JSON.stringify(['s001', 'onEnter', 'enter-a'])
    const entry = indexes.sceneHook.get(key)
    expect(entry).toBeDefined()
    expect(entry![0]).toMatchObject({
      kind: 'initial',
      path: 'scenes.s001.hooks.onEnter.initial',
    })
    expect(indexes.sceneHookEntries[0]).toMatchObject({
      sceneId: 's001',
      slot: 'onEnter',
      hookId: 'enter-a',
    })
  })

  test('无任何引用来源 → 三索引与 entries 全空', () => {
    const state = stateWith([])
    const indexes = buildCanonicalSchemeReferenceIndexesFromVisits(state, [])
    expect(indexes.behavior.size).toBe(0)
    expect(indexes.sceneHook.size).toBe(0)
    expect(indexes.behaviorEntries).toEqual([])
    expect(indexes.sceneHookEntries).toEqual([])
  })
})
