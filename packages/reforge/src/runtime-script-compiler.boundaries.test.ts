/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 B1-B3：当前编译器入口边界（runtime-script-compiler.ts）。
 * runtime-script-project.test.ts:105/150/263 已覆盖 actor 条件叶/lifecycle/闭门；
 * 本文件补共享脚本解析缓存隔离、缺失/非法 digest、编译产物不污染实际输入。
 */

import {
  checkRuntimeScriptLibrary,
  type RuntimeCommand,
  type RuntimeScriptLibrary,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { deepSnapshot, legalSharedLibrary } from './__tests__/glm-state-boundary-fixtures.js'
import { compileRuntimeCommands, RuntimeSharedScriptResolver } from './runtime-script-compiler.js'

const DIGEST = 'a'.repeat(64)

describe('B1 同 id 的 timing×boundary 缓存隔离', () => {
  test('auto/interactive × perCommand/transition 四键互不复用；元数据与产物逐项精确', () => {
    const resolver = new RuntimeSharedScriptResolver(legalSharedLibrary(), DIGEST)
    const combos = [
      { timing: 'auto', boundary: 'perCommand' },
      { timing: 'auto', boundary: 'transition' },
      { timing: 'interactive', boundary: 'perCommand' },
      { timing: 'interactive', boundary: 'transition' },
    ] as const
    const compiled = combos.map(({ timing, boundary }) =>
      resolver.resolve('shared/greet', timing, boundary),
    )
    // 同组合二次 resolve 命中缓存（同引用）；跨组合互不相同引用
    for (const [i, { timing, boundary }] of combos.entries()) {
      expect(resolver.resolve('shared/greet', timing, boundary)).toBe(compiled[i])
      expect(compiled[i]?.timing).toBe(timing)
      expect(compiled[i]?.boundaryPolicy).toBe(boundary)
      expect(compiled[i]?.id).toBe('shared/greet')
      expect(compiled[i]?.name).toBe('问好')
      expect(compiled[i]?.canonicalContentDigest).toBe(DIGEST)
    }
    const unique = new Set(compiled.map((entry) => entry as unknown))
    expect(unique.size).toBe(4)
    // 正文完整编译：leaf 包装 + 每条 after 按组合精确（auto/perCommand 有 100ms wait 边界）
    const expectedAfter = (timing: string, policy: string): unknown[] =>
      timing === 'auto' && policy === 'perCommand' ? [{ kind: 'wait', ms: 100 }] : []
    for (const [i, { timing, boundary }] of combos.entries()) {
      expect(compiled[i]!.body.map((item) => item.kind)).toEqual(['leaf', 'leaf'])
      expect(
        compiled[i]!.body.map((item) => (item as { command: { kind: string } }).command.kind),
      ).toEqual(['dialog', 'giveItem'])
      expect(compiled[i]!.body.map((item) => item.after)).toEqual([
        expectedAfter(timing, boundary),
        expectedAfter(timing, boundary),
      ])
    }
  })
})

describe('B2 缺失脚本与非法 digest', () => {
  test('缺 id 精确拒绝；非法 digest 拒绝；两独立 resolver 同 id 各自正文', () => {
    const resolver = new RuntimeSharedScriptResolver(legalSharedLibrary(), DIGEST)
    expect(() => resolver.resolve('shared/missing', 'auto')).toThrow(
      'shared script 不存在: shared/missing',
    )
    expect(() => new RuntimeSharedScriptResolver(legalSharedLibrary(), 'XYZ')).toThrow(
      'canonicalContentDigest: 期望小写 SHA-256',
    )
    const other = new RuntimeSharedScriptResolver(
      {
        'shared/greet': {
          name: '另一个问好',
          self: 'none',
          body: [{ kind: 'stopMusic' }],
        },
      },
      'b'.repeat(64),
    )
    const a = resolver.resolve('shared/greet', 'auto')
    const b = other.resolve('shared/greet', 'auto')
    expect(a.body.map((item) => (item as { command: { kind: string } }).command.kind)).toEqual([
      'dialog',
      'giveItem',
    ])
    expect(b.body.map((item) => (item as { command: { kind: string } }).command.kind)).toEqual([
      'stopMusic',
    ])
    expect(b.name).toBe('另一个问好')
  })
})

describe('B3 编译产物不污染真正传入的输入', () => {
  test('命令数组编译后逐值不变（深快照同一输入对象）', () => {
    const commands: RuntimeCommand[] = [
      { kind: 'dialog', cue: { rows: [{ text: 'x' }] } },
      { kind: 'giveItem', itemId: '61', count: 2 },
      { kind: 'wait', ms: 100 },
    ]
    const snapshot = deepSnapshot(commands)
    const compiled = compileRuntimeCommands(commands, 'interactive', 'test')
    expect(compiled.map((item) => (item as { command?: { kind: string } }).command?.kind)).toEqual([
      'dialog',
      'giveItem',
      'wait',
    ])
    expect(commands).toEqual(snapshot)
  })
  test('共享脚本库经 resolver 编译后原库逐值不变（库对象就是实际传入对象）', () => {
    const library = legalSharedLibrary()
    const snapshot = deepSnapshot(library)
    const resolver = new RuntimeSharedScriptResolver(library, DIGEST)
    const product = resolver.resolve('shared/greet', 'auto')
    resolver.resolve('shared/greet', 'interactive', 'transition')
    expect(library).toEqual(snapshot)
    // 库先过现行守卫（合法性自证）
    expect(() => checkRuntimeScriptLibrary(library)).not.toThrow()
    // 修改编译产物不污染真正传入的库（同一输入对象，非另一份 fixture）
    for (const item of product.body) {
      item.after = []
      if ('command' in item) {
        const command = item.command as { kind?: string; itemId?: string; count?: number }
        command.kind = 'stopMusic'
        command.itemId = 'polluted'
        command.count = 99
      }
    }
    expect(library).toEqual(snapshot)
  })
  test('编译产物修改后嵌套 cue/参数仍与实际输入隔离（cond/entry 别名试验）', () => {
    const library: RuntimeScriptLibrary = {
      'shared/tree': {
        name: '嵌套树',
        self: 'none',
        body: [
          {
            kind: 'branch',
            cond: { kind: 'currentScene', scene: 's-origin' },
            then: [{ kind: 'giveItem', itemId: '61', count: 1 }],
            else: [],
          },
        ],
      },
    }
    expect(() => checkRuntimeScriptLibrary(library)).not.toThrow()
    const snapshot = deepSnapshot(library)
    const resolver = new RuntimeSharedScriptResolver(library, DIGEST)
    const product = resolver.resolve('shared/tree', 'interactive')
    // 深入产物改嵌套条件与 payload
    const mutate = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const child of node) mutate(child)
        return
      }
      if (!node || typeof node !== 'object') return
      const record = node as Record<string, unknown>
      if (record.kind === 'currentScene') record.scene = 'polluted'
      if (record.kind === 'giveItem') {
        record.itemId = 'polluted'
        record.count = 99
      }
      for (const value of Object.values(record)) mutate(value)
    }
    mutate(product.body)
    expect(library).toEqual(snapshot) // 实际输入的嵌套树逐值不变
  })
})
