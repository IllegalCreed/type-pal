/**
 * TEST-NONVISUAL-COVERAGE-2 W2-A 薄 fixture：A01 派发记录宿主（wave2 未测 leaf 全集）。
 * 与 current-dispatch 既有 recorderHost 同型：记录实参/signal，未注册成员触碰即抛
 * （非目标调用的实证哨兵）；ScriptHost 可选成员缺席时返回 undefined 而非抛（可选链合同）。
 * fixture 不构造业务数据，合法性由消费方编译器守卫保证。
 */
import type { RuntimeCommand } from '@type-pal/content'
import type { ScriptHost } from '../../script-runner.js'

export interface RecordedCall {
  method: string
  args: unknown[]
}

export interface Wave2RecorderHost {
  host: ScriptHost
  calls: RecordedCall[]
}

/** ScriptHost 可选成员（adapter 以 ?. 调用；缺席=合法形态）。 */
export const WAVE2_OPTIONAL_HOST_MEMBERS: ReadonlySet<string> = new Set([
  'setEntityPos',
  'setEntityPosRelParty',
  'setActorAppearance',
  'shakeScreen',
  'toggleDayNight',
  'quitToTitle',
  'holdScreen',
  'revealScreen',
  'report',
])

/** 覆盖 W2-A 目标 leaf 的记录宿主；omit 删除可选成员验证缺席形态。 */
export function wave2RecorderHost(omit: readonly string[] = []): Wave2RecorderHost {
  const calls: RecordedCall[] = []
  const base: Record<string, unknown> = {
    fade: async () => {},
    chaseStep: async () => {},
    loadLastSave: async () => {},
    gameOver: async () => {},
    teleportParty: () => {},
    setPartyFacing: () => {},
    setActorSprite: async () => {},
    setActorAppearance: async () => {},
    fleeBattle: () => {},
    setEntityState: () => {},
    setEntityPos: () => {},
    setEntityPosRelParty: () => {},
    shakeScreen: () => {},
    toggleDayNight: () => {},
    setFollowers: async () => {},
    halveMoney: () => {},
    setEntityFacing: () => {},
    setEntityFrame: () => {},
    playEntityAction: async () => {},
    stopEntityAction: () => {},
    takeEntity: () => {},
    releaseEntity: () => {},
    mountParty: () => {},
    unmountParty: () => {},
    ride: async () => {},
    setParty: async () => {},
    applyActorCondition: async () => {},
    clearActorCondition: async () => {},
    quitToTitle: async () => {},
    moveEntity: async () => {},
    stepEntity: () => {},
    animEntity: () => {},
    nudgeEntity: () => {},
    moveParty: async () => {},
    nudgeParty: () => {},
    report: () => {},
  }
  const host: Record<string, unknown> = {
    query: { money: () => 512 },
    giveMoney: (delta: number) => {
      calls.push({ method: 'giveMoney', args: [delta] })
    },
  }
  for (const [name, impl] of Object.entries(base)) {
    if (omit.includes(name)) continue
    host[name] = (...args: unknown[]) => {
      calls.push({ method: name, args })
      return (impl as (...a: unknown[]) => unknown)(...args)
    }
  }
  const proxied = new Proxy(host, {
    get(target, prop) {
      if (typeof prop !== 'string' || prop in target) return target[prop as string]
      if (WAVE2_OPTIONAL_HOST_MEMBERS.has(prop)) return undefined // 可选成员缺席合同
      throw new Error(`unexpected host member access: ${prop}`)
    },
  })
  return { host: proxied as unknown as ScriptHost, calls }
}

/** 受控异步覆盖：返回 promise 由 gate 控制的记录宿主（用于错误传播）。 */
export function wave2RecorderHostWithAsync(
  member: string,
  impl: (...args: unknown[]) => Promise<unknown>,
): Wave2RecorderHost {
  const calls: RecordedCall[] = []
  const host: Record<string, unknown> = {
    [member]: (...args: unknown[]) => {
      calls.push({ method: member, args })
      return impl(...args)
    },
  }
  const proxied = new Proxy(host, {
    get(target, prop) {
      if (typeof prop !== 'string' || prop in target) return target[prop as string]
      if (WAVE2_OPTIONAL_HOST_MEMBERS.has(prop)) return undefined
      throw new Error(`unexpected host member access: ${prop}`)
    },
  })
  return { host: proxied as unknown as ScriptHost, calls }
}

/** 断言本 fixture 导出的记录成员与 ScriptHost 接口成员一致存在（防接口漂移失测）。 */
export function assertWave2AdapterHostFixtureLegal(): void {
  const { host } = wave2RecorderHost()
  const members = [
    'fade',
    'chaseStep',
    'loadLastSave',
    'gameOver',
    'teleportParty',
    'setPartyFacing',
    'setActorSprite',
    'setActorAppearance',
    'fleeBattle',
    'setEntityState',
    'setEntityPos',
    'setEntityPosRelParty',
    'shakeScreen',
    'toggleDayNight',
    'setFollowers',
    'halveMoney',
    'setEntityFacing',
    'setEntityFrame',
    'playEntityAction',
    'stopEntityAction',
    'takeEntity',
    'releaseEntity',
    'mountParty',
    'unmountParty',
    'ride',
    'setParty',
    'applyActorCondition',
    'clearActorCondition',
    'quitToTitle',
    'moveEntity',
    'stepEntity',
    'animEntity',
    'nudgeEntity',
    'moveParty',
    'nudgeParty',
    'report',
  ]
  for (const member of members)
    if (typeof (host as unknown as Record<string, unknown>)[member] !== 'function')
      throw new Error(`wave2 adapter host fixture 缺成员 ${member}`)
}

/** W2-A 派发用的最小命令集构造器（经 compileRuntimeCommands 守卫编译）。 */
export const wave2DispatchCommands = (): RuntimeCommand[] =>
  [
    { kind: 'fade', dir: 'in', ms: 250 },
    { kind: 'fade', dir: 'out' },
    { kind: 'chasePlayer', target: { scene: 's1', entity: 'chaser' }, range: 6, speed: 2 },
    { kind: 'loadLastSave' },
    { kind: 'gameOver' },
    { kind: 'teleportParty', pos: { col: 3, row: 4 }, facing: 'down' },
    { kind: 'setPartyFacing', facing: 'left' },
    { kind: 'setActorSprite', actor: 'a1', sprite: 'spr.x' },
    {
      kind: 'setActorAppearance',
      actor: 'a1',
      spriteId: 'spr.y',
      portrait: 'pic.z',
      battleSprite: 'bs.w',
    },
    { kind: 'fleeBattle' },
    { kind: 'setEntityState', target: { scene: 's1', entity: 'e1' }, state: 7 },
    {
      kind: 'setMultiEntityState',
      targets: [
        { scene: 's1', entity: 'e1' },
        { scene: 's1', entity: 'e2' },
      ],
      state: 3,
    },
    { kind: 'setEntityPos', target: { scene: 's1', entity: 'e1' }, pos: { col: 1, row: 2 } },
    { kind: 'setEntityPosRelParty', target: { scene: 's1', entity: 'e1' }, dcol: -1, drow: 2 },
    { kind: 'shakeScreen', frames: 12, level: 3 },
    { kind: 'toggleDayNight' },
    { kind: 'setFollowers', sprites: ['f1', 'f2'] },
    { kind: 'halveMoney' },
    { kind: 'setEntityFacing', target: { scene: 's1', entity: 'e1' }, facing: 'up' },
    { kind: 'setEntityFrame', target: { scene: 's1', entity: 'e1' }, frame: 5 },
    {
      kind: 'playEntityAction',
      target: { scene: 's1', entity: 'e1' },
      sprite: 'spr.npc',
      action: 'talk',
      loop: true,
      wait: true,
    },
    { kind: 'stopEntityAction', target: { scene: 's1', entity: 'e1' }, reset: true },
    { kind: 'takeEntity', target: { scene: 's1', entity: 'e1' } },
    { kind: 'releaseEntity' },
    { kind: 'mountParty', target: { scene: 's1', entity: 'horse' }, dx: 1 },
    { kind: 'unmountParty' },
    { kind: 'ride', target: { scene: 's1', entity: 'boat' }, to: { col: 9, row: 8 }, speed: 3 },
    { kind: 'setParty', members: ['a1', 'a2'] },
    {
      kind: 'applyActorCondition',
      actor: 'a1',
      condition: { kind: 'status', status: 'protect', turns: 7 },
    },
    { kind: 'clearActorCondition', actor: 'a1', condition: { kind: 'status', status: 'protect' } },
    { kind: 'moveEntity', target: { scene: 's1', entity: 'e1' }, to: { col: 2, row: 3 }, speed: 4 },
    { kind: 'stepEntity', target: { scene: 's1', entity: 'e1' }, dir: 'down' },
    { kind: 'animEntity', target: { scene: 's1', entity: 'e1' } },
    { kind: 'nudgeEntity', target: { scene: 's1', entity: 'e1' }, dx: 1, dy: -1 },
    { kind: 'moveParty', to: { col: 5, row: 5 }, speed: 2 },
    { kind: 'nudgeParty', dx: 0, dy: 1 },
  ] as unknown as RuntimeCommand[]
