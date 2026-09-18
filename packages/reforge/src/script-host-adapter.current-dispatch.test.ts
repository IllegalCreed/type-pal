/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 E4-E6：当前 leaf 效果 adapter 派发（script-host-adapter.ts）。
 * 命令载荷经 compileRuntimeCommands（current 守卫）编译后逐 leaf 派发；host 为记录替身，
 * 未实现成员被触碰即失败（非目标 host 零调用的实证）。不测画面/听感/上层取消政策。
 * runtime-script-project.ts:79 已拒退役 vanishEntity；本文件不造旧 chunk resolver/退役叶。
 */

import type { RuntimeCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { deepSnapshot, deferred } from './__tests__/glm-runtime-contract-fixtures.js'
import { compileRuntimeCommands } from './runtime-script-compiler.js'
import { executeScriptHostEffect } from './script-host-adapter.js'
import type { ScriptHost } from './script-runner.js'
import type { ScriptRuntimeContext } from './script-runner-core.js'

interface Call {
  method: string
  args: unknown[]
}

function recorderHost(overrides: Record<string, unknown> = {}): {
  host: ScriptHost
  calls: Call[]
} {
  const calls: Call[] = []
  const base: Record<string, unknown> = {
    // 本组目标成员（E4/E5 全集）；每个都以记录实现，可被 overrides 换成受控异步
    dialog: async () => {},
    clearDialog: () => {},
    wait: async () => {},
    giveItem: async () => {},
    loseItem: () => {},
    giveMoney: () => {},
    playSound: () => {},
    playMusic: () => {},
    stopMusic: () => {},
    setAmbience: () => {},
    openShop: async () => {},
    playVideo: async () => {},
    playFrameAnimation: async () => {},
    cameraPan: async () => {},
    cameraSnap: () => {},
    ...overrides,
  }
  const host: Record<string, unknown> = {}
  for (const [name, impl] of Object.entries(base)) {
    host[name] = (...args: unknown[]) => {
      calls.push({ method: name, args })
      return (impl as (...a: unknown[]) => unknown)(...args)
    }
  }
  // 其余 ScriptHost 成员：触碰即失败（非目标 host 调用的实证哨兵）
  const proxied = new Proxy(host, {
    get(target, prop) {
      if (typeof prop !== 'string' || prop in target) return target[prop as string]
      throw new Error(`unexpected host member access: ${prop}`)
    },
  })
  return { host: proxied as unknown as ScriptHost, calls }
}

/** 经 current 守卫编译并返回 leaf 序列（branch/loop 等控制流不在本文件范围）。 */
function compileLeaves(commands: unknown[]): unknown[] {
  const compiled = compileRuntimeCommands(commands as RuntimeCommand[], 'interactive', 'test')
  return compiled.map((item) => {
    const like = item as { kind?: string; command?: unknown }
    return like.kind === 'leaf' && 'command' in like ? like.command : item
  })
}

const context = {} as Readonly<ScriptRuntimeContext>
const options = { currentSceneId: () => 's1' }

async function runLeaves(
  host: ScriptHost,
  commands: unknown[],
  signal: AbortSignal,
): Promise<void> {
  for (const leaf of compileLeaves(commands))
    await executeScriptHostEffect(host, leaf as never, context, signal, options)
}

describe('E4 立即类分支：完整参数/默认值/非目标零调用', () => {
  test('dialog/clear/wait + give/lose/playSound/music/ambience 全参数与 count 默认 1', async () => {
    const { host, calls } = recorderHost()
    const cue = { identity: { kind: 'narration' }, rows: [{ text: 'line.x' }] }
    const commands = [
      { kind: 'dialog', cue },
      { kind: 'clearDialog' },
      { kind: 'wait', ms: 250 },
      { kind: 'giveItem', itemId: '61', count: 3 },
      { kind: 'giveItem', itemId: '78' },
      { kind: 'loseItem', itemId: '61', count: 2 },
      { kind: 'loseItem', itemId: '78' },
      { kind: 'giveMoney', delta: -120 },
      { kind: 'playSound', asset: 'sfx.hit' },
      { kind: 'playMusic', asset: 'music.m1' },
      { kind: 'stopMusic' },
      { kind: 'setAmbience', ambience: 'night' },
    ]
    const signal = new AbortController().signal
    await runLeaves(host, commands, signal)
    expect(calls).toEqual([
      { method: 'dialog', args: [cue, signal] },
      { method: 'clearDialog', args: [] },
      { method: 'wait', args: [250, signal] },
      { method: 'giveItem', args: ['61', 3, signal] },
      { method: 'giveItem', args: ['78', 1, signal] }, // count 缺省 1
      { method: 'loseItem', args: ['61', 2] },
      { method: 'loseItem', args: ['78', 1] },
      { method: 'giveMoney', args: [-120] },
      { method: 'playSound', args: ['sfx.hit'] },
      { method: 'playMusic', args: ['music.m1'] },
      { method: 'stopMusic', args: [] },
      { method: 'setAmbience', args: ['night'] },
    ])
  })
})

describe('E5 await 类分支：时序/同 signal/错误传播/明确返回', () => {
  test('openShop 挂起时后续 leaf 不执行；resolve 后继续并收到同 signal', async () => {
    const gate = deferred<void>()
    const { host, calls } = recorderHost({
      openShop: (_shop: number, _mode: string, _signal: AbortSignal) => gate.promise,
    })
    const signal = new AbortController().signal
    const done = runLeaves(
      host,
      [
        { kind: 'openShop', shop: 7, mode: 'buy' },
        { kind: 'cameraSnap', to: { row: 1, col: 1, height: 0 } },
      ],
      signal,
    )
    await Promise.resolve()
    expect(calls.map((c) => c.method)).toEqual(['openShop']) // 挂起：cameraSnap 未进
    expect(calls[0]?.args).toEqual([7, 'buy', signal])
    gate.resolve()
    await done
    expect(calls.map((c) => c.method)).toEqual(['openShop', 'cameraSnap'])
  })
  test('playVideo 拒绝 → 派发拒绝且错误原样传播；正常路径明确返回', async () => {
    const boom = new Error('decode failed')
    const failing = recorderHost({
      playVideo: () => Promise.reject(boom),
    })
    await expect(
      runLeaves(
        failing.host,
        [{ kind: 'playVideo', asset: 'video.v1' }],
        new AbortController().signal,
      ),
    ).rejects.toThrow('decode failed')
    const ok = recorderHost()
    await expect(
      runLeaves(ok.host, [{ kind: 'playVideo', asset: 'video.v1' }], new AbortController().signal),
    ).resolves.toBeUndefined() // 明确返回，不悬置
    expect(ok.calls[0]?.args[0]).toBe('video.v1')
  })
  test('playFrameAnimation/cameraPan 全参数派发（帧区间与帧率原样）', async () => {
    const { host, calls } = recorderHost()
    await runLeaves(
      host,
      [
        { kind: 'playFrameAnimation', asset: 'anim.a', startFrame: 1, endFrame: 6, frameRate: 12 },
        { kind: 'cameraPan', dx: -3, dy: 2, frames: 40 },
        { kind: 'cameraSnap' },
      ],
      new AbortController().signal,
    )
    expect(calls[0]?.args[0]).toBe('anim.a')
    expect(calls[0]?.args[1]).toEqual({
      frameRate: 12,
      startFrame: 1,
      endFrame: 6,
    })
    expect(calls[0]?.args[2]).toBeInstanceOf(AbortSignal)
    expect(calls[1]?.args.slice(0, 3)).toEqual([-3, 2, 40])
    expect(calls[2]?.args).toEqual([undefined]) // to 缺席 → undefined
  })
})

describe('E6 跨分支输入保真与可选缺席', () => {
  test('命令对象派发前后保真深快照不变；可选项缺席以显式键形态传递', async () => {
    const { host, calls } = recorderHost()
    const commands = [
      { kind: 'playFrameAnimation', asset: 'anim.b' },
      { kind: 'giveItem', itemId: '78' },
    ]
    const snapshot = deepSnapshot(commands)
    await runLeaves(host, commands, new AbortController().signal)
    expect(commands).toEqual(snapshot)
    // playFrameAnimation 无可选项 → host 收到三键全 undefined 的显式对象（当前形态）
    expect(calls[0]?.args[1]).toEqual({
      frameRate: undefined,
      startFrame: undefined,
      endFrame: undefined,
    })
    expect(calls[1]?.args.slice(0, 2)).toEqual(['78', 1])
  })
})
