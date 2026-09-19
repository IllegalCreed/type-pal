/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 test-only fixture（reforge 包薄数据）。
 * 只放数据/深快照/deferred；受测值先过现行守卫再进断言；不被生产导入。
 */
import {
  type AuthorItemCoreMap,
  type BaseSceneDef,
  type RuntimeScriptLibrary,
  validateAuthorItemCore,
  validateAuthorScenes,
  validateRuntimeScenes,
} from '@type-pal/content'

/** 保真深拷贝（不经 JSON 往返）。 */
export function deepSnapshot<T>(value: T): T {
  return clone(value) as T
}

function clone(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node
  if (node instanceof Date) return new Date(node.getTime())
  if (Array.isArray(node)) return node.map(clone)
  if (node instanceof Uint8Array) return new Uint8Array(node)
  if (node instanceof Map) return new Map([...node].map(([k, v]) => [clone(k), clone(v)]))
  if (node instanceof Set) return new Set([...node].map(clone))
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) out[key] = clone(value)
  return out
}

/** 手工控制的异步完成信号（不用固定 sleep 驱动时序）。 */
export function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** 合法 runtime 共享脚本库（过 checkRuntimeScriptLibrary 域）。 */
export const legalSharedLibrary = (): RuntimeScriptLibrary => ({
  'shared/greet': {
    name: '问好',
    self: 'none',
    body: [
      { kind: 'dialog', cue: { rows: [{ text: 'hi' }] } },
      { kind: 'giveItem', itemId: '61', count: 2 },
    ],
  },
})

/** 带两实体（trigger/auto 页）与 onEnter stages 入场的合法场景。 */
export const legalScene = (): BaseSceneDef => ({
  id: 's1',
  mapId: 'map-1',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [
    {
      id: 'e-talk',
      sprite: 'sprite-1',
      pos: { col: 1, row: 2, height: 0 },
      behaviors: {
        trigger: {
          talk: {
            label: '交谈',
            order: 0,
            flow: { kind: 'stages', initial: 'hello', stages: [{ id: 'hello', body: [] }] },
          },
        },
      },
      pages: [
        {
          id: 'idle',
          label: '默认',
          trigger: 'talk',
          triggerActivation: { on: 'interact', range: 2 },
        },
        {
          id: 'anim',
          label: '动画页',
          animation: { sprite: 'sprite-1', action: 'walk', loop: false },
        },
        { id: 'blank', label: '空白页' },
      ],
      initialPage: 'idle',
    },
    {
      id: 'e-auto',
      sprite: 'sprite-2',
      pos: { col: 3, row: 4, height: 0 },
      behaviors: {
        auto: {
          patrol: {
            label: '巡逻',
            order: 0,
            flow: { kind: 'stages', initial: 'walk', stages: [{ id: 'walk', body: [] }] },
          },
        },
      },
      pages: [
        {
          id: 'moving',
          label: '移动',
          auto: 'patrol',
          animation: { sprite: 'sprite-2', action: 'idle', loop: true },
        },
      ],
      initialPage: 'moving',
    },
  ],
  hooks: {
    onEnter: {
      initial: 'default',
      variants: {
        default: {
          label: '入场',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'first',
            stages: [
              { id: 'first', entry: { prepare: [], reveal: { kind: 'cut' } }, body: [] },
              { id: 'second', body: [] },
            ],
          },
        },
      },
    },
    onTeleport: {
      initial: 'tp',
      variants: {
        tp: {
          label: '出场',
          order: 0,
          flow: {
            kind: 'stateMachine',
            machine: {
              id: 'm1',
              label: '状态机',
              initial: 'a',
              states: {
                a: {
                  label: 'A',
                  body: [],
                  next: {
                    kind: 'branch',
                    cond: { kind: 'currentScene', scene: 's1' },
                    then: { kind: 'to', state: 'b', yield: 'worldTick' },
                    else: { kind: 'stay' },
                  },
                },
                b: {
                  label: 'B',
                  body: [],
                  // guard: entry 只允许 onEnter initial state——非 initial 状态不带入场呈现
                  next: { kind: 'stay' },
                },
              },
            },
          },
        },
      },
    },
  },
})

/**
 * 合法作者物品表。guard：外部脚本（runScript/runSceneHook）必须作为唯一效果；
 * 复杂编排放进被引用脚本。故拆成三个合法物品：外部脚本 / 私有脚本 / 裸物品。
 */
export const legalItems = (): AuthorItemCoreMap => ({
  ext: {
    id: 'ext',
    name: '外部脚本物',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    use: {
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'runScript', script: 'shared/greet' }],
    },
    throw: { target: 'oneEnemy', effects: [{ kind: 'fixedDamage', amount: 5 }] },
  },
  priv: {
    id: 'priv',
    name: '私有脚本物',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    use: {
      target: 'scene',
      consuming: false,
      effects: [
        {
          kind: 'itemPrivateScript',
          script: { id: 'use', body: [{ kind: 'setFlag', flag: 'used', value: true }] },
        },
      ],
    },
  },
  bare: {
    id: 'bare',
    name: '裸物品',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  },
})

/** fixture 合法性自证：场景过 author/runtime 两级守卫。 */
export function assertSceneFixtureLegal(scene: BaseSceneDef): void {
  validateAuthorScenes([scene])
  validateRuntimeScenes([scene as never])
}

/** fixture 合法性自证：物品表过现行 author item 守卫。 */
export function assertItemsFixtureLegal(items: AuthorItemCoreMap): void {
  validateAuthorItemCore(Object.values(items))
}
