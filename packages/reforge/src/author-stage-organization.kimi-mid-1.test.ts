import type { AuthorScriptFlow } from '@type-pal/content'
import { organizeFlowAsStages } from '@type-pal/content'
import { expect, test } from 'vitest'

type MachineFlow = Extract<AuthorScriptFlow, { kind: 'stateMachine' }>
type StagesFlow = Extract<AuthorScriptFlow, { kind: 'stages' }>

function organize(flow: AuthorScriptFlow): StagesFlow {
  const organized = organizeFlowAsStages(flow)
  if (!organized) throw new Error('expected an organizable author flow')
  return organized
}

// K5 组织边界:stay 轴产出的 stage 不带 next 键(精确形状,不是 toEqual 的 undefined 宽松等价)。
test('K5 a stay state organizes to a stage with no next key while an advance state keeps its target id', () => {
  const flow: MachineFlow = {
    kind: 'stateMachine',
    machine: {
      id: 'talk',
      label: '交谈',
      initial: 'open',
      states: {
        open: {
          label: '开场',
          body: [{ kind: 'giveMoney', delta: 1 }],
          next: { kind: 'advance', state: 'talk' },
        },
        talk: {
          label: '叙旧',
          body: [{ kind: 'giveMoney', delta: 2 }],
          next: { kind: 'stay' },
        },
      },
    },
  }
  expect(organize(flow)).toStrictEqual({
    kind: 'stages',
    initial: 'open',
    stages: [
      { id: 'open', label: '开场', body: [{ kind: 'giveMoney', delta: 1 }], next: 'talk' },
      { id: 'talk', label: '叙旧', body: [{ kind: 'giveMoney', delta: 2 }] },
    ],
  })
})

// K6 深拷贝与不可达尾部:多节点 restart 环按可达序排列,不可达尾部按插入序保持自身稳定 ID 与映射。
test('K6 a multi-state restart cycle stays in reachable order and the unreachable tail keeps its own id and stay mapping', () => {
  const flow: MachineFlow = {
    kind: 'stateMachine',
    machine: {
      id: 'route',
      label: '巡线',
      initial: 'a',
      states: {
        ghost: { label: '闲置', body: [{ kind: 'giveMoney', delta: 9 }], next: { kind: 'stay' } },
        a: {
          label: '甲',
          body: [{ kind: 'giveMoney', delta: 1 }],
          next: { kind: 'advance', state: 'b' },
        },
        b: {
          label: '乙',
          body: [{ kind: 'giveMoney', delta: 2 }],
          next: { kind: 'advance', state: 'c' },
        },
        c: { label: '丙', body: [{ kind: 'giveMoney', delta: 3 }], next: { kind: 'restart' } },
      },
    },
  }
  expect(organize(flow)).toStrictEqual({
    kind: 'stages',
    initial: 'a',
    stages: [
      { id: 'a', label: '甲', body: [{ kind: 'giveMoney', delta: 1 }], next: 'b' },
      { id: 'b', label: '乙', body: [{ kind: 'giveMoney', delta: 2 }], next: 'c' },
      { id: 'c', label: '丙', body: [{ kind: 'giveMoney', delta: 3 }], next: 'a' },
      { id: 'ghost', label: '闲置', body: [{ kind: 'giveMoney', delta: 9 }] },
    ],
  })
})

test('K6 editing the source machine after organizing never leaks into the organized stages', () => {
  const flow: MachineFlow = {
    kind: 'stateMachine',
    machine: {
      id: 'talk',
      label: '交谈',
      initial: 'first',
      states: {
        first: {
          label: '首次',
          entry: {
            prepare: [{ kind: 'playMusic', asset: 'music.pal.001' }],
            reveal: { kind: 'cut' },
          },
          body: [
            {
              kind: 'branch',
              cond: { kind: 'flag', flag: 'met', is: true },
              then: [{ kind: 'giveMoney', delta: 1 }],
              else: [{ kind: 'giveMoney', delta: 2 }],
            },
          ],
          next: { kind: 'advance', state: 'repeat' },
        },
        repeat: { label: '复读', body: [{ kind: 'giveMoney', delta: 7 }], next: { kind: 'stay' } },
      },
    },
  }
  const organized = organize(flow)
  const pristine = structuredClone(organized)
  const first = flow.machine.states.first!
  first.body.push({ kind: 'giveMoney', delta: 99 })
  first.entry!.prepare!.push({ kind: 'wait', ms: 1 })
  const branch = first.body[0]
  if (branch?.kind !== 'branch') throw new Error('expected author branch')
  branch.then.push({ kind: 'giveMoney', delta: 98 })
  flow.machine.states.repeat!.body.push({ kind: 'giveMoney', delta: 97 })
  expect(organized).toStrictEqual(pristine)
})

test('K6 editing an organized second stage entry or a nested branch arm never leaks back into the source machine', () => {
  const flow: MachineFlow = {
    kind: 'stateMachine',
    machine: {
      id: 'route',
      label: '巡线',
      initial: 'a',
      states: {
        a: {
          label: '甲',
          body: [{ kind: 'giveMoney', delta: 1 }],
          next: { kind: 'advance', state: 'b' },
        },
        b: {
          label: '乙',
          entry: {
            prepare: [{ kind: 'playMusic', asset: 'music.pal.002' }],
            reveal: { kind: 'cut' },
          },
          body: [
            {
              kind: 'branch',
              cond: { kind: 'flag', flag: 'met', is: true },
              then: [{ kind: 'giveMoney', delta: 4 }],
            },
          ],
          next: { kind: 'stay' },
        },
      },
    },
  }
  const pristine = structuredClone(flow)
  const organized = organize(flow)
  expect(organized.stages.map((stage) => stage.id)).toEqual(['a', 'b'])
  const second = organized.stages[1]!
  second.entry!.prepare!.push({ kind: 'wait', ms: 1 })
  const nested = second.body[0]
  if (nested?.kind !== 'branch') throw new Error('expected organized branch')
  nested.then.push({ kind: 'giveMoney', delta: 95 })
  expect(flow).toStrictEqual(pristine)
})
