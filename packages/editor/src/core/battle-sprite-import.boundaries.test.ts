/**
 * TEST-EDITOR-IMPORT-CODEC-1 C3：battle-sprite-import 边界（battle-sprite-import.ts）。
 * 无既有测试覆盖本模块。覆盖：profile 帧数门（含 player 10 帧下限与精确帧位表）、
 * idStem 规范化、uniqueDefinitionId 递增、新导入 record 字段、同字节哈希复用
 * （record 对象复用 + 存量字节校验 fail-loud）、kind/记录冲突拒绝。
 */
import type { AssetCatalogV1, AssetRecordV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { defaultBattleSpriteProfile, prepareBattleSpriteImport } from './battle-sprite-import.js'
import type { EditorState } from './edit-session.js'

/** 按 shared/rle.ts 容器规范构造 canonical indexed RLE chunk（test-only 字节构造）。 */
function rleFrame(pixels: number[]): Uint8Array {
  const width = 2
  const height = pixels.length / width
  return new Uint8Array([
    width & 0xff,
    width >> 8,
    height & 0xff,
    height >> 8,
    pixels.length, // 单条 literal 指令（< 0x80）
    ...pixels,
  ])
}

function indexedRleChunk(frames: readonly Uint8Array[]): Uint8Array {
  // offset 表 u16 word offset×2=字节偏移；帧间补齐到偶数（word offset 必须可表示）
  const padded = frames.map((frame) =>
    frame.byteLength % 2 === 0 ? frame : new Uint8Array([...frame, 0x00]),
  )
  const tableBytes = padded.length * 2
  const offsets: number[] = []
  let cursor = tableBytes
  for (const frame of padded) {
    offsets.push(cursor)
    cursor += frame.byteLength
  }
  const out = new Uint8Array(cursor)
  const view = new DataView(out.buffer)
  padded.forEach((_frame, index) => view.setUint16(index * 2, offsets[index]! / 2, true))
  padded.forEach((frame, index) => out.set(frame, offsets[index]!))
  return out
}

/** RFC1952 CRC-32（无表位运算，容器构造自足，不引 node:zlib 保持本文件可 typecheck）。 */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** RFC1952 gzip 头 + RFC1951 stored 块（合法可解压容器；payload < 64KiB）。 */
function gzipWrap(payload: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(10 + 5 + payload.byteLength + 8)
  const view = new DataView(out.buffer)
  out[0] = 0x1f
  out[1] = 0x8b
  out[2] = 8 // CM=deflate
  out[8] = 0 // XFL
  out[9] = 0xff // OS=unknown
  out[10] = 1 // BFINAL=1, BTYPE=00(stored)
  view.setUint16(11, payload.byteLength, true)
  view.setUint16(13, ~payload.byteLength & 0xffff, true)
  out.set(payload, 15)
  view.setUint32(15 + payload.byteLength, crc32(payload), true)
  view.setUint32(19 + payload.byteLength, payload.byteLength, true)
  return out.buffer
}

/** gzip 包装（decodeBattleSpriteAssetBytes 要求 .rle 带 gzip 头）。 */
function battleSpriteBytes(): ArrayBuffer {
  return gzipWrap(indexedRleChunk([rleFrame([1, 2, 3, 4]), rleFrame([5, 6, 7, 8])]))
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

/** 最小 EditorState 替身：产品只读 battleSprites[].id 与 assetCatalog.assets。 */
function editorState(assets: Record<string, AssetRecordV1>, ids: string[] = []): EditorState {
  return {
    battleSprites: ids.map((id) => ({ id })),
    assetCatalog: { version: 1, assets } as AssetCatalogV1,
  } as unknown as EditorState
}

function readerReturning(bytes: ArrayBuffer) {
  const calls: Array<[string, string]> = []
  return {
    calls,
    reader: {
      record: () => {
        throw new Error('本测试不触发 record 读取')
      },
      readBytes: (asset: string, _expectedKind?: 'battle-sprite') => {
        calls.push([asset, 'battle-sprite'])
        return Promise.resolve(bytes)
      },
    },
  }
}

const input = (bytes: ArrayBuffer, frameCount = 2) => ({
  hint: 'my sprite',
  label: '',
  kind: 'enemy' as const,
  bytes,
  frameCount,
  // reader 在各用例内单独注入
})

describe('C3 defaultBattleSpriteProfile 帧数门与精确帧位', () => {
  test('非正整数帧数拒绝（0 / -1 / 1.5）', () => {
    for (const bad of [0, -1, 1.5]) {
      expect(() => defaultBattleSpriteProfile('enemy', bad)).toThrow('上传的战斗精灵至少需要 1 帧')
    }
  })
  test('player 9 帧拒绝；10 帧产出完整十帧位表；summon 只带 kind', () => {
    expect(() => defaultBattleSpriteProfile('player-fighter', 9)).toThrow(
      '玩家战斗精灵至少需要 10 帧',
    )
    expect(defaultBattleSpriteProfile('player-fighter', 10)).toEqual({
      kind: 'player-fighter',
      frames: {
        idle: 0,
        dying: 1,
        dead: 2,
        defend: 3,
        hurt: 4,
        preMagic: 5,
        magic: 6,
        attackWindup: 7,
        attackRush: 8,
        attackStrike: 9,
      },
      castEffectBase: 0,
      attackEffectBase: 0,
    })
    expect(defaultBattleSpriteProfile('summon', 3)).toEqual({ kind: 'summon' })
  })
  test('enemy：多帧 idle 2 + 攻击余量；1 帧退化为 idle 1 + 攻击 0', () => {
    expect(defaultBattleSpriteProfile('enemy', 5)).toEqual({
      kind: 'enemy',
      idle: { start: 0, count: 2 },
      magic: { start: 2, count: 0 },
      attack: { start: 2, count: 3 },
      idleTicksPerFrame: 5,
      actTicksPerFrame: 1,
    })
    expect(defaultBattleSpriteProfile('enemy', 1)).toEqual({
      kind: 'enemy',
      idle: { start: 0, count: 1 },
      magic: { start: 1, count: 0 },
      attack: { start: 1, count: 0 },
      idleTicksPerFrame: 5,
      actTicksPerFrame: 1,
    })
  })
})

describe('C3 prepareBattleSpriteImport 命名与 catalog 合同', () => {
  test('新导入：idStem 规范化、record 字段、bytes 为副本、纯 CJK hint 退 authored', async () => {
    const bytes = battleSpriteBytes()
    const { reader } = readerReturning(bytes)
    const prepared = await prepareBattleSpriteImport(editorState({}), {
      ...input(bytes),
      hint: '  My Sprite! ',
      label: '',
      reader,
    })
    const sha = await sha256Hex(bytes)
    expect(prepared.definition.id).toBe('my-sprite-enemy')
    expect(prepared.definition.asset).toBe(`battle-sprite.authored.${sha}`)
    expect(prepared.definition.label).toBe('my-sprite') // label 空时回退 stem
    expect(prepared.frameCount).toBe(2)
    expect(prepared.record).toEqual({
      kind: 'battle-sprite',
      path: `assets/authored/battle-sprites/${sha}.rle`,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256: sha,
      label: '', // record 保存原始输入 label；trim 回退只发生在 definition.label
      origin: { kind: 'authored' },
    })
    // bytes 是副本：改返回值不动输入
    const preparedView = new Uint8Array(prepared.bytes)
    preparedView[0] = (preparedView[0] ?? 0) ^ 0xff
    expect(new Uint8Array(bytes)[0]).not.toBe(preparedView[0])

    const cjk = await prepareBattleSpriteImport(editorState({}), {
      ...input(bytes),
      hint: '魂兽',
      reader: readerReturning(bytes).reader,
    })
    expect(cjk.definition.id).toBe('authored-enemy') // 非 [a-z0-9_-] 全清空 → 'authored'
    expect(cjk.definition.label).toBe('authored')
  })
  test('id 占用后 -2 递增；同字节二次导入复用同一 record 并校验存量字节', async () => {
    const bytes = battleSpriteBytes()
    const sha = await sha256Hex(bytes)
    const asset = `battle-sprite.authored.${sha}`
    const first = await prepareBattleSpriteImport(editorState({}), {
      ...input(bytes),
      reader: readerReturning(bytes).reader,
    })
    // 二次导入：state 已含首次 record + 同 id 定义
    const reuse = readerReturning(bytes)
    const second = await prepareBattleSpriteImport(
      editorState({ [asset]: first.record }, ['my-sprite-enemy']),
      { ...input(bytes), reader: reuse.reader },
    )
    expect(second.definition.id).toBe('my-sprite-enemy-2')
    expect(second.record).toBe(first.record) // 复用 catalog 内同一 record 对象
    expect(reuse.calls).toEqual([[asset, 'battle-sprite']]) // 复用路径真实读取并解码校验
    expect(second.bytes.byteLength).toBe(bytes.byteLength) // 仍是输入副本
    // 首个候选 -2 也被占用时继续递增到 -3
    const third = await prepareBattleSpriteImport(
      editorState({ [asset]: first.record }, ['my-sprite-enemy', 'my-sprite-enemy-2']),
      { ...input(bytes), reader: readerReturning(bytes).reader },
    )
    expect(third.definition.id).toBe('my-sprite-enemy-3')
  })
  test('复用路径存量字节与登记不符时 fail-loud（同长异内容 → sha 不符）', async () => {
    const bytes = battleSpriteBytes()
    const sha = await sha256Hex(bytes)
    const asset = `battle-sprite.authored.${sha}`
    const first = await prepareBattleSpriteImport(editorState({}), {
      ...input(bytes),
      reader: readerReturning(bytes).reader,
    })
    const corruptedBytes = bytes.slice(0) // 独立副本：只污染 reader 读到的存量字节
    const corruptedView = new Uint8Array(corruptedBytes)
    const last = corruptedView.byteLength - 1
    corruptedView[last] = (corruptedView[last] ?? 0) ^ 0xff
    await expect(
      prepareBattleSpriteImport(editorState({ [asset]: first.record }), {
        ...input(bytes),
        reader: readerReturning(corruptedBytes).reader,
      }),
    ).rejects.toThrow('sha256 不符')
  })
  test('同哈希 AssetId 被 portrait 占用或记录字段冲突时拒绝', async () => {
    const bytes = battleSpriteBytes()
    const sha = await sha256Hex(bytes)
    const asset = `battle-sprite.authored.${sha}`
    const occupied: AssetRecordV1 = {
      kind: 'portrait',
      path: `assets/authored/portrait/${sha}.png`,
      mediaType: 'image/png',
      bytes: 1,
      sha256: sha,
      label: 'x',
      origin: { kind: 'authored', ref: 'x.png' },
    }
    await expect(
      prepareBattleSpriteImport(editorState({ [asset]: occupied }), {
        ...input(bytes),
        reader: readerReturning(bytes).reader,
      }),
    ).rejects.toThrow('已被 portrait 占用')

    const mismatched = await prepareBattleSpriteImport(editorState({}), {
      ...input(bytes),
      reader: readerReturning(bytes).reader,
    })
    const wrongPath: AssetRecordV1 = {
      ...mismatched.record,
      path: 'assets/authored/battle-sprites/other.rle',
    }
    await expect(
      prepareBattleSpriteImport(editorState({ [asset]: wrongPath }), {
        ...input(bytes),
        reader: readerReturning(bytes).reader,
      }),
    ).rejects.toThrow('与上传字节冲突')
    const wrongOrigin: AssetRecordV1 = { ...mismatched.record, origin: { kind: 'legacy-migrated' } }
    await expect(
      prepareBattleSpriteImport(editorState({ [asset]: wrongOrigin }), {
        ...input(bytes),
        reader: readerReturning(bytes).reader,
      }),
    ).rejects.toThrow('与上传字节冲突')
  })
})
