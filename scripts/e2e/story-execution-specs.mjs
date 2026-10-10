import assert from 'node:assert/strict'
import items from '../../projects/pal/content/items.json' with { type: 'json' }
import s000 from '../../projects/pal/content/scenes/s000.json' with { type: 'json' }
import s001 from '../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import s002 from '../../projects/pal/content/scenes/s002.json' with { type: 'json' }
import s003 from '../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import s004 from '../../projects/pal/content/scenes/s004.json' with { type: 'json' }
import s005 from '../../projects/pal/content/scenes/s005.json' with { type: 'json' }
import s014 from '../../projects/pal/content/scenes/s014.json' with { type: 'json' }

const scenes = { s000, s001, s002, s003, s004, s005, s014 }
const entity = (scene, id, channel, behavior, name, stage) => {
  const flow = scenes[scene].entities.find((e) => e.id === id)?.behaviors?.[channel]?.[behavior]
    ?.flow
  assert(flow, `missing required author behavior ${scene}/${id}/${channel}/${behavior}`)
  return {
    name,
    scene,
    self: { scene, entity: id },
    timing: channel === 'auto' ? 'auto' : 'interactive',
    author: { kind: 'entity-behavior', scene, entity: id, channel, behavior },
    flow,
    stage: stage ?? flow.initial,
  }
}
const hook = (scene, variant, name) => {
  const flow = scenes[scene].hooks.onEnter.variants[variant].flow
  return {
    name,
    scene,
    self: null,
    timing: 'interactive',
    flow,
    author: { kind: 'scene-hook', scene, slot: 'onEnter', hook: variant },
  }
}

/** Required story executions come from the scenario, not from whatever was observed.
 * Transition endings and ambient bounded prefixes have different contracts; they are
 * deliberately named here rather than being silently treated as normal finite endings.
 */
function mainExecutions(fragment) {
  switch (fragment) {
    case '001':
      return [
        { ...hook('s000', 'default', '梦境开场'), terminal: 'scene-transition' },
        hook('s001', 'default', '李大娘叫醒逍遥'),
        entity('s001', 'e10', 'auto', 'leave-bedroom', '李大娘离开卧房'),
      ]
    case '002':
      return [
        {
          ...entity('s003', 'e56', 'trigger', 'default', '李大娘接客'),
          terminal: 'inn-trigger-replacement',
        },
        entity('s003', 'e56', 'auto', 'legacy-006', '李大娘离开柜台'),
        ...[
          ['e59', '苗人头领'],
          ['e60', '开门随从'],
          ['e61', '随行随从'],
        ].map(([id, name]) => entity('s003', id, 'auto', 'legacy-003', `${name}进入客房`)),
      ]
    case '003':
      return [
        entity('s001', 'e19', 'trigger', 'serve-guests', '厨房李大娘交代送菜'),
        entity('s003', 'e47', 'trigger', 'default', '逍遥下楼梯'),
        entity('s003', 'e56', 'trigger', 'greet-after-guests', '李大娘柜台对话'),
        entity('s003', 'e56', 'auto', 'go-to-kitchen', '李大娘回厨房'),
        entity('s003', 'e62', 'trigger', 'beggar-first-talk', '醉道士讨酒'),
      ]
    case '004': {
      const body = items
        .find((item) => item.id === '272')
        .use.effects.find((effect) => effect.kind === 'itemPrivateScript').script.body
      return [
        entity('s001', 'e20', 'trigger', 'take-dishes', '厨房端菜'),
        entity('s001', 'e15', 'trigger', 'default', '客房送酒菜'),
        entity('s003', 'e46', 'trigger', 'default', '逍遥上楼梯'),
        entity('s003', 'e47', 'trigger', 'default', '逍遥下楼梯'),
        {
          name: '面对醉道士使用桂花酒',
          scene: 's003',
          self: null,
          timing: 'interactive',
          scope: 'script',
          author: { kind: 'item-private', item: '272', script: 'use' },
          flow: { initial: '__script', stages: [{ id: '__script', body }] },
          branches: { '["__script",1]': 'else' },
          terminal: 'script',
        },
        entity('s003', 'e62', 'trigger', 'c8-321c0a7d7de1', '醉道士饮酒后约定传剑'),
      ]
    }
    case '005':
      return [
        entity('s001', 'e19', 'trigger', 'c8-74bc98f07f8e', '李大娘吩咐买虾', 'stage-1'),
        entity('s005', 'e127', 'trigger', 'default', '鱼嫂告知风浪大、鲜虾无货', 'initial'),
        entity('s005', 'e124', 'trigger', 'default', '水生叔谈渔获', 'initial'),
        entity('s005', 'e123', 'trigger', 'legacy-001', '张四说明今日没有虾', 'initial'),
        hook('s004', 'default', '离开客栈进入村庄'),
        hook('s004', 'legacy-003', '从码头回村启动香兰报信'),
        entity('s004', 'e83', 'trigger', 'report-aunt-illness', '丁香兰告知李大娘病倒', 'report'),
      ]
    case '006':
      return [
        entity('s002', 'e35', 'trigger', 'default', '洪大夫诊病'),
        ...[
          ['initial', '介绍仙灵岛'],
          ['legacy-002', '继续说明求药'],
          ['legacy-003', '确认求药安排'],
        ].map(([stage, label]) =>
          entity('s002', 'e36', 'trigger', 'default', `王小虎${label}`, stage),
        ),
        entity('s003', 'e59', 'trigger', 'legacy-001', '苗人头领交代求药并赠破天锤'),
        entity('s005', 'e123', 'trigger', 'legacy-002', '张四答应送往仙灵岛'),
        {
          ...entity('s005', 'e116', 'trigger', 'legacy-001', '上船驶向仙灵岛'),
          terminal: 'scene-transition',
        },
        hook('s014', 'default', '上岛后逍遥与张四告别'),
      ]
    default:
      throw new Error(`unknown story fragment ${fragment}`)
  }
}

const entrances = {
  '001': [],
  '002': [['s001', 'e3', '逍遥走出卧房']],
  '003': [['s003', 'e53', '进入厨房找李大娘']],
  '004': [
    ['s001', 'e18', '端菜离开厨房'],
    ['s003', 'e51', '进入苗人随从客房'],
    ['s001', 'e12', '送菜后离开客房'],
  ],
  '005': [
    ['s003', 'e53', '回厨房问李大娘'],
    ['s001', 'e18', '离开厨房去买虾'],
    ['s003', 'e44', '离开客栈'],
    ['s004', 'e95', '前往码头市集'],
    ['s005', 'e115', '从码头返回村庄'],
  ],
  '006': [
    ['s004', 'e94', '赶回客栈'],
    ['s003', 'e49', '进入李大娘病房'],
    ['s002', 'e32', '离开病房'],
    ['s003', 'e44', '离开客栈前往仙灵岛'],
    ['s004', 'e95', '再次前往码头'],
  ],
}

export function storyExecutionSpecifications(fragment) {
  return [
    ...mainExecutions(fragment),
    ...entrances[fragment].map(([scene, id, name]) => ({
      ...entity(scene, id, 'trigger', 'default', name),
      terminal: 'scene-transition',
    })),
  ]
}
