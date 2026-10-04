/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · pal-item-scheme-labels 残余分支合同。
 *
 * 排重 basis（旧 fullName 不重复）：pal-item-scheme-labels.test.ts 覆盖 hooks/behaviors
 * 闭包 + order/id 消歧 + repeat/confirm 容器；pal-item-scheme-labels.boundaries.test.ts
 * 覆盖 opaque 计数与若干拒绝路径。本文件只补 fast lcov 一手测量的未覆盖 edge：
 * - walkCommands 容器分派（:72-91）：branch（有/无 else）、loop、startBattle
 *   （有/无 onLose/onFlee）、teleportOut（有/无 onFail）——与既有 repeat/confirm 并列。
 * - selectionEdges/flowEdges 的跳过臂（:123/:157/:160）：非选择命令、
 *   selectEntityBehavior 非 'use'、selectSceneHooks 非 'use' 与缺 channel。
 * - collectNodes 重复地址 fail-loud（:193）。
 * - order + id 不唯一 fail-loud（:319，entity 行为与 hook 变体同 id 同 order）。
 * 不覆盖（ledger）：:314「缺 item root」——roots 只来自 args.items 自身 id 的
 * visitRoot，grouped 键必是 itemsById 成员，任何 typed 输入不可达。
 */

import type {
  AuthorCommand,
  AuthorItemData,
  AuthorSceneDef,
  AuthorScriptFlow,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { inspectPalItemSchemeRoots } from './pal-item-scheme-labels.js'

const use = (entity: string, behavior: string): AuthorCommand => ({
  kind: 'selectEntityBehavior',
  target: { scene: 's001', entity },
  channel: 'auto',
  selection: { kind: 'use', value: behavior },
})

const hook = (id: string): AuthorCommand => ({
  kind: 'selectSceneHooks',
  scene: 's001',
  selection: { onEnter: { kind: 'use', value: id } },
})

const stages = (body: AuthorCommand[]): AuthorScriptFlow => ({
  kind: 'stages',
  initial: 'main',
  stages: [{ id: 'main', body }],
})

function item(id: string, name: string, body: AuthorCommand[]): AuthorItemData {
  return {
    id,
    name,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'itemPrivateScript', script: { id: 'use', body } }],
    },
  }
}

function behavior(label: string, order: number, body: AuthorCommand[] = []) {
  return { label, order, flow: stages(body) }
}

function sceneWith(args: {
  entities: Array<{
    id: string
    behaviors: Record<string, ReturnType<typeof behavior>>
  }>
  hooks?: Record<string, ReturnType<typeof behavior>>
  teleportHooks?: Record<string, ReturnType<typeof behavior>>
}): AuthorSceneDef {
  return {
    id: 's001',
    mapId: 'map-1',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: args.entities.map((entity) => ({
      id: entity.id,
      pos: { col: 0, row: 0, height: 0 },
      zone: true,
      behaviors: { auto: entity.behaviors },
    })),
    ...(args.hooks || args.teleportHooks
      ? {
          hooks: {
            ...(args.hooks ? { onEnter: { variants: args.hooks } } : {}),
            ...(args.teleportHooks ? { onTeleport: { variants: args.teleportHooks } } : {}),
          },
        }
      : {}),
  }
}

describe('KIMI-R1 物品剧情方案 walkCommands 容器分派', () => {
  test('branch/loop/startBattle/teleportOut 容器内的选择边全部被 walk 到（含 ?? [] 回退）', () => {
    // 一条 item body 同时携带：branch(带 else) / branch(无 else) / loop(forever) /
    // startBattle(onLose+onFlee) / startBattle(均无) / teleportOut(onFail) / teleportOut(无) /
    // 普通 leaf（非选择命令早退 :123）。所有 use 指向同一节点 → 边全部收集但目标唯一。
    const body: AuthorCommand[] = [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'f1', is: true },
        then: [use('e1', 'b1')],
        else: [use('e1', 'b1')],
      },
      { kind: 'branch', cond: { kind: 'flag', flag: 'f2', is: false }, then: [] }, // 无 else → ?? []
      { kind: 'loop', mode: 'forever', body: [use('e1', 'b1')] },
      { kind: 'startBattle', enemyTeamId: 't1', onLose: [use('e1', 'b1')], onFlee: [] },
      { kind: 'startBattle', enemyTeamId: 't2' }, // onLose/onFlee ?? []
      { kind: 'teleportOut', onFail: [use('e1', 'b1')] },
      { kind: 'teleportOut' }, // onFail ?? []
      { kind: 'returnScript' }, // 非选择命令：selectionEdges 早退
    ]
    const result = inspectPalItemSchemeRoots({
      items: [item('292', '信物', body)],
      scenes: [
        sceneWith({ entities: [{ id: 'e1', behaviors: { b1: behavior('信物剧情方案', 10) } }] }),
      ],
      expectedSchemes: 1,
      expectedItemRoots: 1,
    })
    expect(result).toMatchObject({ schemes: 1, itemRoots: 1, opaqueLabels: 0 })
    expect(result.labels).toEqual([
      {
        id: 'b1',
        itemId: '292',
        path: 'scenes.s001.entities.e1.behaviors.auto.b1',
        label: '信物剧情方案',
      },
    ])
  })

  test('flowEdges 跳过臂：行为流内的非 use 选择与缺 channel 不产生边', () => {
    // b1 自身 flow 含：selectEntityBehavior(inherit) / selectSceneHooks(disabled) /
    // selectSceneHooks({}) —— 全部跳过；b1 仍为 candidate（canonical label + item 直选）。
    // b2 经 b1 flow 内的 use 选择可达（flowEdges 的 use 方向：entity 与 hook 各一）。
    const body: AuthorCommand[] = [use('e1', 'b1'), hook('h1')]
    const result = inspectPalItemSchemeRoots({
      items: [item('292', '信物', body)],
      scenes: [
        sceneWith({
          entities: [
            {
              id: 'e1',
              behaviors: {
                b1: behavior('信物剧情方案', 10, [
                  {
                    kind: 'selectEntityBehavior',
                    target: { scene: 's001', entity: 'e1' },
                    channel: 'auto',
                    selection: { kind: 'inherit' },
                  },
                  {
                    kind: 'selectSceneHooks',
                    scene: 's001',
                    selection: { onEnter: { kind: 'disabled' } },
                  },
                  { kind: 'selectSceneHooks', scene: 's001', selection: {} }, // 双 channel 皆缺
                  use('e1', 'b2'), // flowEdges use 方向：entity
                  {
                    kind: 'selectSceneHooks',
                    scene: 's001',
                    selection: { onTeleport: { kind: 'use', value: 'h2' } },
                  }, // use 方向：hook
                ]),
                b2: behavior('信物剧情方案 3', 30),
              },
            },
          ],
          hooks: {
            h1: behavior('信物剧情方案 2', 20),
          },
          teleportHooks: {
            h2: behavior('信物剧情方案 4', 40),
          },
        }),
      ],
      expectedSchemes: 4,
      expectedItemRoots: 1,
    })
    expect(result.labels.map(({ id, label }) => [id, label])).toEqual([
      ['b1', '信物剧情方案'],
      ['h1', '信物剧情方案 2'],
      ['b2', '信物剧情方案 3'],
      ['h2', '信物剧情方案 4'],
    ])
  })
})

describe('KIMI-R1 物品剧情方案 fail-loud', () => {
  test('节点地址重复（两 scene 同 id + 同 entity/channel/behavior id）精确拒绝', () => {
    const scene = sceneWith({
      entities: [{ id: 'e1', behaviors: { b1: behavior('信物剧情方案', 10) } }],
    })
    expect(() =>
      inspectPalItemSchemeRoots({
        items: [item('292', '信物', [use('e1', 'b1')])],
        scenes: [scene, scene], // keyOf 完全相同的第二份
        expectedSchemes: 1,
      }),
    ).toThrow('PAL 物品剧情方案节点重复: scenes.s001.entities.e1.behaviors.auto.b1')
  })

  test('order + id 不唯一（entity 行为与 hook 变体同 id 同 order）精确拒绝', () => {
    expect(() =>
      inspectPalItemSchemeRoots({
        items: [item('292', '信物', [use('e1', 'dup'), hook('dup')])],
        scenes: [
          sceneWith({
            entities: [{ id: 'e1', behaviors: { dup: behavior('信物剧情方案', 5) } }],
            hooks: { dup: behavior('信物剧情方案 2', 5) },
          }),
        ],
        expectedSchemes: 2,
      }),
    ).toThrow(
      'PAL 物品剧情方案 order + id 不唯一: scenes.s001.entities.e1.behaviors.auto.dup / scenes.s001.hooks.onEnter.variants.dup',
    )
  })
})
