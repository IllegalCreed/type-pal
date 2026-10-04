/**
 * TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 L6：SFX readiness 收集中途 abort（sfx-readiness.ts，
 * 音频家族中唯一的真 AbortSignal 输入；main.ts prepareSceneSounds / battleBase 均经此 seam）。
 * 排重：sfx-readiness.collections.test.ts 只证“signal 预取消 → 进入前即拒”；sfx-readiness.test.ts
 * 各合同用未触发 signal。本文件补“首个 root 已访问后才 abort”的中途取消：后续 root 不再访问，
 * 以 AbortError 收场。roots 为 unknown[]（公开函数签名），无需构造完整 SceneDef。
 */
import { describe, expect, test } from 'vitest'
import { collectScriptSoundAssets } from './sfx-readiness.js'

const firstRoot = { kind: 'playSound', asset: 'sfx.first' }
/** 若被访问，会在缺 spritesById 注册表时 fail-loud —— 用作“后续 root 未被访问”的判别器。 */
const gatedRoot = { kind: 'playEntityAction', sprite: 'sprite.x', action: 'idle' }

describe('L6 收集中途 abort（AbortSignal 轴）', () => {
  test('首 root 访问完成后同步 abort → 后续 root 不访问，以 AbortError 收场', async () => {
    const controller = new AbortController()
    const collected = collectScriptSoundAssets([firstRoot, gatedRoot], undefined, controller.signal)
    // collectScriptSoundAssets 同步执行到首个 await 前，root[0] 的访问已完整发生；
    // 此刻 abort → root[1] 入口 throwIfAborted 先于其内容错误。
    controller.abort()
    const outcome = await collected.then(
      () => undefined,
      (error: unknown) => error,
    )
    expect(outcome).toMatchObject({ name: 'AbortError' })
  })

  test('同输入正控（不 abort）：root[1] 会被访问并以缺 sprites 注册表 fail-loud', async () => {
    const outcome = await collectScriptSoundAssets(
      [firstRoot, gatedRoot],
      undefined,
      new AbortController().signal,
    ).then(
      () => undefined,
      (error: unknown) => error as Error,
    )
    expect(outcome).toBeInstanceOf(Error)
    expect(outcome?.message).toContain('无 sprites 注册表')
  })

  test('双合法 root 正控：多 root 收集不受影响，全部入集', async () => {
    const sounds = await collectScriptSoundAssets(
      [
        { kind: 'playSound', asset: 'sfx.first' },
        { kind: 'playSound', asset: 'sfx.second' },
      ],
      undefined,
      new AbortController().signal,
    )
    expect([...sounds].sort()).toEqual(['sfx.first', 'sfx.second'])
  })
})
