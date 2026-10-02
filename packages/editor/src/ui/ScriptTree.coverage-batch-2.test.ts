import { type Command, checkCommands } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { describeScriptCommand } from './ScriptTree.js'

const labels = new Map([
  ['actor:hero', '李逍遥'],
  ['actor:ally', '赵灵儿'],
  ['poison:7', '赤毒'],
  ['sprite:walk', '行走组'],
  ['map:forest', '树林地图'],
  ['asset:bell', '铃声'],
  ['asset:theme', '主题曲'],
  ['ambience:night', '夜晚'],
  ['authorScript:shared/user/heal', '治疗脚本'],
])
const references: ScriptReferenceCatalog = {
  choices: () => [],
  has: (kind, id) => labels.has(`${kind}:${id}`),
  label: (kind, id) => labels.get(`${kind}:${id}`) ?? `⚠未知${kind}:${id}`,
}

type Case = {
  command: Command
  icon: string
  label: string
  detail?: string
}

function assertDescriptions(cases: Case[]) {
  for (const { command, icon, label, detail } of cases) {
    const before = structuredClone(command)
    checkCommands([command], 'tree.command')
    const described = describeScriptCommand(command, {}, undefined, references)
    expect(
      { icon: described.icon, label: described.label, detail: described.detail },
      command.kind,
    ).toEqual({ icon, label, detail })
    expect(command, `${command.kind} was mutated`).toEqual(before)
  }
}

describe('当前脚本树的未覆盖业务摘要', () => {
  test('世界与画面命令保留目标、符号、定位和无参数语义', () => {
    assertDescriptions([
      { command: { kind: 'clearDialog' }, icon: '🧹', label: '清对话框' },
      {
        command: { kind: 'returnScript' },
        icon: '↩',
        label: '返回调用处',
      },
      { command: { kind: 'quitToTitle' }, icon: '🏁', label: '游戏通关退出 → 回标题屏' },
      {
        command: { kind: 'setMultiEntityState', entities: ['guard', 'aunt'], state: 0 },
        icon: '👁',
        label: '批量设置 2 个实体 → 隐藏',
      },
      {
        command: { kind: 'setEntityPosRelParty', entity: 'guard', dcol: -2, drow: 3 },
        icon: '📍',
        label: 'guard 相对队伍定位',
        detail: '队伍±(-2,3)',
      },
      {
        command: { kind: 'setScreenWave', level: 3, progression: -1 },
        icon: '🌊',
        label: '屏波 幅 3 · 推进 -1',
      },
      {
        command: { kind: 'setEntityLayer', entity: 'guard', layer: 2 },
        icon: '📐',
        label: 'guard 图层 → 2',
      },
      {
        command: { kind: 'revivePartyAll', tenths: 6 },
        icon: '✨',
        label: '全队复活(HP=max×6/10)',
      },
      {
        command: { kind: 'toggleDayNight', ms: 800 },
        icon: '🌗',
        label: '昼夜切换(800ms)',
      },
      {
        command: { kind: 'setSceneMapOverride', mapId: 'forest' },
        icon: '🗺',
        label: '换地图 → 树林地图',
        detail: '当前场景',
      },
      { command: { kind: 'halveMoney' }, icon: '💸', label: '金钱减半' },
      {
        command: { kind: 'setEntityFacing', entity: 'guard', facing: 'left' },
        icon: '🧭',
        label: 'guard 转向 left',
      },
      {
        command: { kind: 'setEntityFrame', entity: 'guard', frame: 4 },
        icon: '🎞',
        label: 'guard 定帧 4',
      },
      {
        command: { kind: 'cameraPan', dx: -3, dy: 2, frames: 8 },
        icon: '🎥',
        label: '镜头平移',
        detail: '(-3,2)×8',
      },
      {
        command: { kind: 'cameraSnap', to: { col: 7, row: 4, height: 0 } },
        icon: '🎥',
        label: '镜头定位 (7,4)',
      },
      { command: { kind: 'cameraSnap' }, icon: '🎥', label: '镜头回正' },
    ])
  })

  test('角色条件与资源命令区分毒、状态、临时毒抗及稳定身份', () => {
    assertDescriptions([
      {
        command: {
          kind: 'applyActorCondition',
          actor: 'hero',
          condition: { kind: 'poison', poisonId: 7 },
        },
        icon: '🩺',
        label: '令 李逍遥 中毒：赤毒',
        detail: '剧情施毒保证命中；从首次发作开始',
      },
      {
        command: {
          kind: 'applyActorCondition',
          actor: 'hero',
          condition: { kind: 'status', status: 'protect', turns: 3 },
        },
        icon: '🩺',
        label: '令 李逍遥 获得护体 3 回合',
        detail: '受到的物理与法术伤害减半。',
      },
      {
        command: {
          kind: 'applyActorCondition',
          actor: 'hero',
          condition: { kind: 'poisonResistance', amount: 12 },
        },
        icon: '🩺',
        label: '令 李逍遥 获得临时毒抗 +12',
        detail: '带入下一场战斗',
      },
      {
        command: {
          kind: 'clearActorCondition',
          actor: 'hero',
          condition: { kind: 'poison', poisonId: 7 },
        },
        icon: '🩹',
        label: '清除 李逍遥 的赤毒',
      },
      {
        command: {
          kind: 'clearActorCondition',
          actor: 'hero',
          condition: { kind: 'status', status: 'protect' },
        },
        icon: '🩹',
        label: '清除 李逍遥 的护体',
      },
      {
        command: {
          kind: 'clearActorCondition',
          actor: 'hero',
          condition: { kind: 'poisonResistance' },
        },
        icon: '🩹',
        label: '清除 李逍遥 的全部临时毒抗',
      },
      {
        command: { kind: 'setParty', members: ['hero', 'ally'] },
        icon: '👥',
        label: '队伍变更 → 李逍遥、赵灵儿',
      },
      {
        command: { kind: 'mountParty', entity: 'boat' },
        icon: '🛶',
        label: '挂载 → boat',
      },
      { command: { kind: 'unmountParty' }, icon: '🚶', label: '下载具' },
      {
        command: { kind: 'ride', entity: 'boat', to: { col: 5, row: 7, height: 0 }, speed: 'fast' },
        icon: '⛵',
        label: '骑行 boat',
        detail: '→(5,7)',
      },
      { command: { kind: 'playSound', asset: 'bell' }, icon: '🔊', label: '音效 铃声' },
      { command: { kind: 'playMusic', asset: 'theme' }, icon: '🎵', label: '播放音乐 主题曲' },
      { command: { kind: 'stopMusic' }, icon: '⏹', label: '停止音乐' },
      { command: { kind: 'setAmbience', ambience: 'night' }, icon: '🌗', label: '切氛围 夜晚' },
    ])
  })

  test('预制动作的循环、后台、等待与恢复方式有不同的可见摘要', () => {
    assertDescriptions([
      {
        command: {
          kind: 'playEntityAction',
          entity: 'guard',
          sprite: 'walk',
          action: 'wave',
          loop: true,
        },
        icon: '▶',
        label: 'guard 播放预制动作',
        detail: '行走组 / wave · 循环',
      },
      {
        command: {
          kind: 'playEntityAction',
          entity: 'guard',
          sprite: 'walk',
          action: 'wave',
          loop: false,
          wait: false,
          startAtMs: 120,
        },
        icon: '▶',
        label: 'guard 播放预制动作',
        detail: '行走组 / wave · 单次 · 后台 · 起始 120ms',
      },
      {
        command: {
          kind: 'playEntityAction',
          entity: 'guard',
          sprite: 'walk',
          action: 'wave',
          loop: false,
        },
        icon: '▶',
        label: 'guard 播放预制动作',
        detail: '行走组 / wave · 单次 · 等待完成',
      },
      {
        command: { kind: 'stopEntityAction', entity: 'guard', reset: true },
        icon: '⏹',
        label: 'guard 停止预制动作',
        detail: '页面默认动作从头恢复',
      },
      {
        command: { kind: 'stopEntityAction', entity: 'guard', reset: false },
        icon: '⏹',
        label: 'guard 停止预制动作',
        detail: '恢复冻结的页面默认动作',
      },
      {
        command: { kind: 'stepEntity', entity: 'guard', dir: 'up' },
        icon: '👣',
        label: 'guard 走一步 up',
      },
      {
        command: { kind: 'animEntity', entity: 'guard' },
        icon: '🎞',
        label: 'guard 推进 PAL 兼容实例帧',
      },
    ])
  })

  test('当前运行时脚本绑定区分可复用身份、内部分片、内联段和关闭状态', () => {
    assertDescriptions([
      {
        command: { kind: 'callScript', ref: { chunk: 'shared/c00', id: 'shared/user/heal' } },
        icon: '↪',
        label: '调用可复用脚本',
        detail: '治疗脚本',
      },
      {
        command: { kind: 'jumpScript', ref: { chunk: 'shared/c01', id: 'shared/internal' } },
        icon: '→',
        label: '跳转迁移内部实现',
        detail: 'shared/c01 · shared/internal',
      },
      {
        command: {
          kind: 'setEntityAuto',
          entity: 'guard',
          script: { chunk: 'shared/c00', id: 'shared/user/heal' },
        },
        icon: '🔁',
        label: 'guard 换巡逻脚本',
        detail: '治疗脚本',
      },
      {
        command: { kind: 'setEntityAuto', entity: 'guard', stages: [] },
        icon: '🔁',
        label: 'guard 换巡逻脚本',
        detail: '停用',
      },
      {
        command: { kind: 'setEntityTrigger', entity: 'guard', stages: [{ body: [] }] },
        icon: '🔗',
        label: 'guard 换触发脚本',
        detail: '1 段',
      },
      {
        command: {
          kind: 'setSceneOnEnter',
          scene: 'inn',
          script: { chunk: 'shared/c01', id: 'shared/internal' },
        },
        icon: '📜',
        label: 'inn 换进场脚本',
        detail: '迁移内部实现（shared/internal）',
      },
      {
        command: { kind: 'setSceneOnTeleport', scene: 'inn', stages: [{ body: [] }] },
        icon: '🌀',
        label: 'inn 换传送出口',
        detail: '1 段',
      },
      {
        command: { kind: 'clearSceneScripts', scene: 'inn' },
        icon: '🚫',
        label: 'inn 禁用进场与传送脚本',
      },
      {
        command: { kind: 'setEntityTriggerMode', entity: 'guard', on: 'touch', range: 2 },
        icon: '🔗',
        label: 'guard 触发方式',
        detail: 'touch2',
      },
      {
        command: { kind: 'setEntityTriggerMode', entity: 'guard' },
        icon: '🔗',
        label: 'guard 触发方式',
        detail: '关闭',
      },
    ])
  })
})
