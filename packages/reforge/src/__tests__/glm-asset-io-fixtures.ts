/**
 * TEST-REFORGE-ASSET-IO-1 test-only fixture（reforge 包薄数据）。
 * 只放数据/深快照/deferred/WAV 构造；受测载荷先过对应现行守卫
 * （assertWave 的 RIFF/WAVE 标记门、collector 的缺失引用 fail-loud）再进断言；不被生产导入。
 */
import type { ItemData, SpriteDef } from '@type-pal/content'

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

/** 合法最小 WAV：RIFF/WAVE 标记 + 12+ 字节（产品 assertWave 的完整现行合同域）。 */
export function legalWav(size = 24): ArrayBuffer {
  const bytes = new Uint8Array(Math.max(size, 12))
  bytes.set([0x52, 0x49, 0x46, 0x46], 0) // 'RIFF'
  bytes.set([0x57, 0x41, 0x56, 0x45], 8) // 'WAVE'
  return bytes.buffer
}

/** 合法精灵（带一个 pose，步进 cue 是 sound 资源引用）。 */
export const soundSprite = (): SpriteDef => ({
  id: 'sprite.guard',
  label: '守卫',
  asset: 'sprite.guard',
  layout: { kind: 'static' },
  poses: {
    idle: {
      label: '待机',
      steps: [{ frame: 0, durationMs: 100, cues: [{ kind: 'sound', asset: 'sfx.step' }] }],
    },
  },
})

/** 合法物品（use/throw 各带 sound 与非空 effect；throw 呈现 magic 时其动画音也入集）。
 * 正式 validateItems 守卫：throw.effects 不得为空（applyPoison/healHp 均为现行合法 kind）。 */
export const soundItem = (id: string): ItemData => ({
  id,
  name: `item.${id}`,
  desc: [],
  buyPrice: 1,
  sellPrice: 1,
  sellable: true,
  use: {
    target: 'oneAlly',
    consuming: true,
    effects: [{ kind: 'healHp', amount: 1 }],
    sound: 'sfx.use',
  },
  throw: {
    target: 'oneEnemy',
    effects: [{ kind: 'applyPoison', poisonId: 'poison.test' }],
    sound: 'sfx.throw',
    presentation: { kind: 'magic', animation: { sound: 'sfx.throw-magic', effectSprite: 0 } },
  },
})
