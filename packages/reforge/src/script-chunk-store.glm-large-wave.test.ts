/**
 * TEST-GLM-LARGE-WAVE-4 C04：MemoryScriptResolver（编辑器预览 resolver）公开合同。
 * 去重：ScriptChunkStore 侧已有 on-demand/imports/abort/并发/预算/租约 9 例
 * （script-chunk-store.test + residual + cursor-boundaries）；MemoryScriptResolver 此前
 * 无任何直接测试。本文件只补其 N2 同语义：提示 chunk 命中、错误提示下按稳定 id 重推导、
 * chunk 缺失与 script id 缺失的显式诊断、进入即拒的 AbortError。
 */
import { describe, expect, test } from 'vitest'
import { sceneScriptPair } from './__tests__/script-chunk-fixture.js'
import { MemoryScriptResolver } from './script-chunk-store.js'

describe('MemoryScriptResolver current semantics', () => {
  test('提示 chunk 命中时返回该 chunk 的正文，ref 归一到实际 chunk 且 release 幂等', async () => {
    const { index, chunks, firstId } = sceneScriptPair()
    const resolver = new MemoryScriptResolver(index, chunks)
    const signal = new AbortController().signal
    const resolved = await resolver.resolve({ chunk: 'scene/s001', id: firstId }, signal)
    expect(resolved.body).toEqual([{ kind: 'wait', ms: 1 }])
    expect(resolved.ref).toEqual({ chunk: 'scene/s001', id: firstId })
    expect(() => resolved.release()).not.toThrow()
    expect(() => resolved.release()).not.toThrow()
  })

  test('错误 hint 不掩盖正文：按稳定 id 重推导命中另一 chunk', async () => {
    const { index, chunks, secondId } = sceneScriptPair()
    const resolver = new MemoryScriptResolver(index, chunks)
    const resolved = await resolver.resolve(
      { chunk: 'scene/s001', id: secondId },
      new AbortController().signal,
    )
    expect(resolved.body).toEqual([{ kind: 'wait', ms: 2 }])
    expect(resolved.ref).toEqual({ chunk: 'scene/s002', id: secondId })
  })

  test('chunk 不存在与 script id 不存在分别给出显式诊断', async () => {
    const { index, chunks } = sceneScriptPair()
    const resolver = new MemoryScriptResolver(index, chunks)
    // 提示与重推导均无 chunk 时按「chunk 不存在」拒绝；chunk 在而 body 缺时按 id 拒绝。
    await expect(
      resolver.resolve(
        { chunk: 'scene/missing', id: 'scene/s999/on-enter/0' },
        new AbortController().signal,
      ),
    ).rejects.toThrow('chunk 不存在(ref=scene/missing, derived=scene/s999)')
    await expect(
      resolver.resolve(
        { chunk: 'scene/s001', id: 'scene/s001/on-enter/9' },
        new AbortController().signal,
      ),
    ).rejects.toThrow('script id 不存在 "scene/s001/on-enter/9"')
  })

  test('已中止的 signal 进入即拒，不读取任何 chunk', async () => {
    const { index, chunks, firstId } = sceneScriptPair()
    const resolver = new MemoryScriptResolver(index, chunks)
    const controller = new AbortController()
    controller.abort()
    await expect(
      resolver.resolve({ chunk: 'scene/s001', id: firstId }, controller.signal),
    ).rejects.toThrow('script resolve aborted')
  })

  test('解析输入不携带正文的空 chunks 表时按 chunk 缺失拒绝', async () => {
    const { index, firstId } = sceneScriptPair()
    const resolver = new MemoryScriptResolver(index, {})
    await expect(
      resolver.resolve({ chunk: 'scene/s001', id: firstId }, new AbortController().signal),
    ).rejects.toThrow('chunk 不存在')
  })
})
