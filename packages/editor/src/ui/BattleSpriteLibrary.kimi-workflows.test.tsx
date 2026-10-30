// @vitest-environment jsdom
/**
 * K01: real PNG/quantization/import and shared raw-frame transactions.
 * Uses the C02 managed host and real cache/notice completion signals.
 * Browser hardware ports remain real PNG adapters; no product core is mocked.
 */
import type { BattleSpriteProfileKind } from '@type-pal/content'
import {
  compressGzip,
  encodeSpriteChunk,
  loadStandardPalette,
  quantizeToRleFrame,
} from '@type-pal/reforge'
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { decodeBattleAsset } from '../__tests__/cursor-asset-r1/battle-sprite-fixtures.js'
import {
  type MountedBattleSpriteLibrary,
  waitForBattleSpriteResources,
} from '../__tests__/cursor-asset-r1/battle-sprite-harness.js'
import {
  applyAppearance,
  applyBattleHistory,
  rawEditorMessage,
  runRawAction,
  selectAssetRow as selectBattleAssetRow,
  setupBattleSuite,
  waitProof as waitBattleProof,
} from '../__tests__/cursor-asset-r1/battle-sprite-ui.js'
import { prepareBattleSpriteImport } from '../core/battle-sprite-import.js'
import { sha256Hex } from '../core/binary-signature.js'
import { AddBattleSpriteCommand } from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  buttonByLabel,
  clickButton,
  loadFilesIntoInput,
  setInputValue,
} from './__tests__/glm-ui-wave-kit.js'
import {
  atlasColors,
  dispatchDragEvent,
  MemoryDataTransfer,
  pngFileOf,
  solidAtlasPng,
  solidRgba,
} from './__tests__/kimi-editor-workflows/kit.js'

const FRAME = 8

type Mounted = MountedBattleSpriteLibrary
const suite = setupBattleSuite()
let host: HTMLDivElement

async function mountLibrary(): Promise<Mounted> {
  const mounted = await suite.mount('kimi-k01-library', {}, [])
  host = mounted.host
  return mounted
}

/** 真实命令播种：独立编码合法帧 → gzip → prepareBattleSpriteImport → AddBattleSpriteCommand。 */
async function seedSprite(
  mounted: Mounted,
  input: { hint: string; label: string; kind: BattleSpriteProfileKind; colors: number },
) {
  const palette = await loadStandardPalette(mounted.project.assetBase)
  const frames = atlasColors(input.colors).map((color) =>
    quantizeToRleFrame(solidRgba(FRAME, FRAME, color), FRAME, FRAME, palette),
  )
  const gzip = await compressGzip(encodeSpriteChunk(frames))
  const bytes = gzip.buffer.slice(gzip.byteOffset, gzip.byteOffset + gzip.byteLength) as ArrayBuffer
  const prepared = await prepareBattleSpriteImport(mounted.session.getState(), {
    hint: input.hint,
    label: input.label,
    kind: input.kind,
    bytes,
    frameCount: frames.length,
    reader: mounted.reader,
  })
  await act(async () => {
    mounted.session.dispatch(
      new AddBattleSpriteCommand(
        prepared.definition,
        prepared.record,
        prepared.bytes,
        prepared.frameCount,
      ),
    )
  })
  await waitForBattleSpriteResources(host)
  return { prepared, frames, palette }
}

/** Shared decoder validates the current catalog, blob/disk bytes, SHA and gzip. */
async function decodeCurrent(mounted: Mounted, asset: string) {
  return decodeBattleAsset(mounted.project, mounted.session.getState(), asset)
}

async function selectAssetRow(asset: string): Promise<void> {
  await selectBattleAssetRow(host, asset)
}

async function waitProof(frames: number, consumers: number): Promise<void> {
  await waitBattleProof(host, frames, consumers)
}

function hiddenImageInputs(): HTMLInputElement[] {
  return [...host.querySelectorAll<HTMLInputElement>('input[type="file"].sprite-hidden-file-input')]
}

describe('K01 BattleSpriteLibrary 真实源帧工作流', () => {
  test('真实 PNG 图集导入：catalog/bytes/定义精确入库且 undo/redo 对称', async () => {
    const mounted = await mountLibrary()
    const atlas = solidAtlasPng(FRAME, FRAME, atlasColors(10))
    const palette = await loadStandardPalette(mounted.project.assetBase)
    const expectedFrames = atlasColors(10).map((color) =>
      quantizeToRleFrame(solidRgba(FRAME, FRAME, color), FRAME, FRAME, palette),
    )
    const expectedBytes = await compressGzip(encodeSpriteChunk(expectedFrames))
    const expectedSha = await sha256Hex(
      expectedBytes.buffer.slice(
        expectedBytes.byteOffset,
        expectedBytes.byteOffset + expectedBytes.byteLength,
      ) as ArrayBuffer,
    )

    await clickButton(host, '导入战斗精灵')
    const picker = host.querySelector<HTMLInputElement>('input[aria-label="选择战斗精灵图片"]')
    expect(picker).not.toBeNull()
    await loadFilesIntoInput(picker!, [pngFileOf('十帧图集.png', atlas.bytes)])
    await vi.waitFor(() => {
      expect(host.textContent).toContain('共 10 帧（横排逐行切）')
    })
    const historyBefore = mounted.session.getHistoryVersion()
    await applyAppearance(mounted)

    const asset = `battle-sprite.authored.${expectedSha}`
    expect(mounted.session.getState().assetCatalog.assets[asset]).toBeDefined()
    const record = mounted.session.getState().assetCatalog.assets[asset]!
    expect(record.kind).toBe('battle-sprite')
    expect(record.path).toBe(`assets/authored/battle-sprites/${expectedSha}.rle`)
    expect(record.sha256).toBe(expectedSha)
    expect(record.bytes).toBe(expectedBytes.byteLength)
    expect(record.origin).toEqual({ kind: 'authored' })
    const blob = mounted.session.getState().assetBlobs[record.path]
    expect(blob).toBeDefined()
    expect(await sha256Hex(blob!.slice(0))).toBe(expectedSha)

    const definition = mounted.session
      .getState()
      .battleSprites.find((entry) => entry.asset === asset)
    expect(definition?.id).toBe('authored-player-fighter')
    expect(definition?.profile.kind).toBe('player-fighter')
    if (definition?.profile.kind === 'player-fighter') {
      expect(definition.profile.frames.idle).toBe(0)
      expect(definition.profile.frames.attackStrike).toBe(9)
    }
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyBefore)
    assertProjectSaveValid(mounted.session.getState())
    const decoded = await decodeCurrent(mounted, asset)
    expect(decoded.frames).toHaveLength(10)
    expect(decoded.frames[5]).toEqual(expectedFrames[5])

    expect(await applyBattleHistory(mounted, 'undo')).toBe(true)
    expect(mounted.session.getState().assetCatalog.assets[asset]).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    expect(mounted.session.getState().battleSprites.some((entry) => entry.asset === asset)).toBe(
      false,
    )
    expect(await applyBattleHistory(mounted, 'redo')).toBe(true)
    expect(mounted.session.getState().assetCatalog.assets[asset]?.sha256).toBe(expectedSha)
    expect(mounted.session.getState().battleSprites.some((entry) => entry.asset === asset)).toBe(
      true,
    )
  })

  test('新增用途过真实解码门入库；替换单帧带双用途 proof，取消侧零提交', async () => {
    const mounted = await mountLibrary()
    const seeded = await seedSprite(mounted, {
      hint: 'k01-shared',
      label: 'shared4',
      kind: 'enemy',
      colors: 4,
    })
    const asset = seeded.prepared.definition.asset
    await selectAssetRow(asset)
    await waitProof(4, 1)

    // Shared replacement setup: create a real summon consumer only after proof is ready.
    await clickButton(host, '新增用途')
    await clickButton(host, '召唤现身')
    await vi.waitFor(() => {
      expect(host.textContent).toContain('新用途尚未写入项目')
    })
    await clickButton(host, '应用修改')
    await vi.waitFor(() => {
      expect(
        mounted.session
          .getState()
          .battleSprites.some((entry) => entry.asset === asset && entry.profile.kind === 'summon'),
      ).toBe(true)
    })
    const summon = mounted.session
      .getState()
      .battleSprites.find((entry) => entry.asset === asset && entry.profile.kind === 'summon')!
    expect(summon.id).toBe('shared4-summon')
    await waitProof(4, 2)

    // 取消侧：confirm=false → 零提交、字节与 catalog 不变。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const pickReplacement = async (file: File, outcome: 'cancel' | 'commit') => {
      const calls = confirm.mock.calls.length
      const notices = mounted.notices.length
      await act(async () => {
        await loadFilesIntoInput(hiddenImageInputs()[0]!, [file])
        await vi.waitFor(() => {
          if (outcome === 'cancel') expect(confirm).toHaveBeenCalledTimes(calls + 1)
          else
            expect(mounted.notices.slice(notices).some((notice) => notice !== undefined)).toBe(true)
        })
      })
      await waitForBattleSpriteResources(host)
    }
    const beforeRecord = mounted.session.getState().assetCatalog.assets[asset]!
    const historyBefore = mounted.session.getHistoryVersion()
    const frameCell = host.querySelector<HTMLElement>('[data-source-frame-index="1"]')
    expect(frameCell).not.toBeNull()
    await act(async () => frameCell!.click())
    await clickButton(host, '替换当前帧')
    const replacement = solidAtlasPng(FRAME, FRAME, [atlasColors(16)[14]!])
    await pickReplacement(pngFileOf('单帧替换.png', replacement.bytes), 'cancel')
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('替换原始帧 #1 会同时影响 2 个用途'),
    )
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(mounted.session.getState().assetCatalog.assets[asset]?.sha256).toBe(beforeRecord.sha256)

    // 放行侧：真实重编码入库，双用途 profile 不动，undo 还原字节与 catalog。
    confirm.mockReturnValue(true)
    await clickButton(host, '替换当前帧')
    await pickReplacement(pngFileOf('单帧替换.png', replacement.bytes), 'commit')
    const message = rawEditorMessage(host)
    expect(message?.classList.contains('error')).toBe(false)
    expect(message?.textContent).toBe('替换战斗精灵原始帧 #1；可使用撤销恢复。')

    const expectedCell = quantizeToRleFrame(
      solidRgba(FRAME, FRAME, atlasColors(16)[14]!),
      FRAME,
      FRAME,
      seeded.palette,
    )
    const decoded = await decodeCurrent(mounted, asset)
    expect(decoded.frames).toHaveLength(4)
    expect(expectedCell).not.toEqual(seeded.frames[1])
    expect(decoded.frames[1]).toEqual(expectedCell)
    expect(decoded.frames[0]).toEqual(seeded.frames[0])
    expect(decoded.frames[3]).toEqual(seeded.frames[3])
    const after = mounted.session.getState()
    const enemy = after.battleSprites.find(
      (entry) => entry.asset === asset && entry.profile.kind === 'enemy',
    )!
    expect(enemy.profile).toEqual(seeded.prepared.definition.profile)
    expect(after.battleSprites.find((entry) => entry.id === summon.id)?.profile.kind).toBe('summon')

    expect(await applyBattleHistory(mounted, 'undo')).toBe(true)
    const restored = await decodeCurrent(mounted, asset)
    expect(restored.frames).toHaveLength(4)
    expect(restored.frames[1]).toEqual(seeded.frames[1])
    expect(mounted.session.getState().assetCatalog.assets[asset]?.sha256).toBe(beforeRecord.sha256)
  })

  test('追加原始帧：真实切格量化入库，共享双用途与 undo 全链一致', async () => {
    const mounted = await mountLibrary()
    const seeded = await seedSprite(mounted, {
      hint: 'k01-append',
      label: '追加四帧',
      kind: 'enemy',
      colors: 4,
    })
    const asset = seeded.prepared.definition.asset
    const second = await prepareBattleSpriteImport(mounted.session.getState(), {
      hint: 'k01-append-summon',
      label: '追加四帧召唤',
      kind: 'summon',
      bytes: seeded.prepared.bytes.slice(0),
      frameCount: seeded.frames.length,
      reader: mounted.reader,
    })
    expect(second.definition.asset).toBe(asset)
    expect(second.record).toEqual(seeded.prepared.record)
    const summonId = second.definition.id
    await act(async () => {
      expect(
        mounted.session.dispatch(
          new AddBattleSpriteCommand(
            second.definition,
            second.record,
            second.bytes,
            second.frameCount,
          ),
        ),
      ).toBe(true)
    })
    await waitForBattleSpriteResources(host)
    await selectAssetRow(asset)
    await waitProof(4, 2)

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await clickButton(host, '追加帧')
    const append = solidAtlasPng(
      FRAME,
      FRAME,
      atlasColors(2).map((_, i) => atlasColors(16)[10 + i]!),
    )
    await loadFilesIntoInput(hiddenImageInputs()[1]!, [pngFileOf('追加两帧.png', append.bytes)])
    await vi.waitFor(() => {
      expect(host.textContent).toContain('将 16×8 图片切为')
    })
    const panel = host.querySelector<HTMLElement>('.sprite-raw-append-panel')!
    const cols = panel.querySelectorAll<HTMLInputElement>('input')[0]!
    await setInputValue(cols, '2')
    await vi.waitFor(() => {
      expect(panel.textContent).toContain('2 帧，每帧 8×8')
    })
    const historyBefore = mounted.session.getHistoryVersion()
    const message = await runRawAction(mounted, '确认追加')
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('追加 2 帧会更新 2 个用途'))
    expect(message?.classList.contains('error')).toBe(false)
    expect(message?.textContent).toBe('追加战斗精灵原始帧 ×2；可使用撤销恢复。')
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyBefore)

    const appendedColors = [atlasColors(16)[10]!, atlasColors(16)[11]!]
    const decoded = await decodeCurrent(mounted, asset)
    expect(decoded.frames).toHaveLength(6)
    expect(decoded.frames[0]).toEqual(seeded.frames[0])
    for (const [offset, color] of appendedColors.entries())
      expect(decoded.frames[4 + offset]).toEqual(
        quantizeToRleFrame(solidRgba(FRAME, FRAME, color), FRAME, FRAME, seeded.palette),
      )
    // 追加不触碰任何用途 profile。
    for (const entry of mounted.session.getState().battleSprites)
      if (entry.asset === asset)
        expect(entry.profile).toEqual(
          entry.id === summonId ? { kind: 'summon' } : seeded.prepared.definition.profile,
        )

    expect(await applyBattleHistory(mounted, 'undo')).toBe(true)
    const restored = await decodeCurrent(mounted, asset)
    expect(restored.frames).toHaveLength(4)
    expect(mounted.session.getState().assetCatalog.assets[asset]?.sha256).toBe(
      seeded.prepared.record.sha256,
    )
  })

  test('删除原始帧走敌人分段 ABI 修复事务；确认取消零提交', async () => {
    const mounted = await mountLibrary()
    const seeded = await seedSprite(mounted, {
      hint: 'k01-shrink',
      label: '缩帧四帧',
      kind: 'enemy',
      colors: 4,
    })
    const asset = seeded.prepared.definition.asset
    await selectAssetRow(asset)
    await waitProof(4, 1)

    // 取消侧：confirm=false → 零提交、零消息。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const historyBefore = mounted.session.getHistoryVersion()
    await clickButton(host, '删除当前帧')
    expect(confirm).toHaveBeenCalledOnce()
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(host.querySelector('.sprite-raw-editor-message')).toBeNull()

    // 放行侧：修复事务同步收紧 idle 分段，消息可撤销。
    confirm.mockReturnValue(true)
    const message = await runRawAction(mounted, '删除当前帧')
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('删除战斗精灵原始帧 #0'))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('动作分段 2/0/2 → 1/0/2'))
    expect(message?.classList.contains('error')).toBe(false)
    expect(message?.textContent).toBe('删除战斗精灵原始帧 #0；可使用撤销恢复。')

    const decoded = await decodeCurrent(mounted, asset)
    expect(decoded.frames).toHaveLength(3)
    expect(decoded.frames[0]).toEqual(seeded.frames[1])
    const enemy = mounted.session
      .getState()
      .battleSprites.find((entry) => entry.asset === asset && entry.profile.kind === 'enemy')!
    expect(enemy.profile.kind).toBe('enemy')
    if (enemy.profile.kind === 'enemy') {
      expect(enemy.profile.idle).toEqual({ start: 0, count: 1 })
      expect(enemy.profile.magic).toEqual({ start: 1, count: 0 })
      expect(enemy.profile.attack).toEqual({ start: 1, count: 2 })
    }

    expect(await applyBattleHistory(mounted, 'undo')).toBe(true)
    const restored = await decodeCurrent(mounted, asset)
    expect(restored.frames).toHaveLength(4)
    const restoredEnemy = mounted.session
      .getState()
      .battleSprites.find((entry) => entry.asset === asset && entry.profile.kind === 'enemy')!
    expect(restoredEnemy.profile).toEqual(seeded.prepared.definition.profile)
  })

  test('替换共享帧源：缩帧 fail-closed 零提交，增帧确认后原子替换可撤销', async () => {
    const mounted = await mountLibrary()
    const seeded = await seedSprite(mounted, {
      hint: 'k01-replace',
      label: '替换四帧',
      kind: 'enemy',
      colors: 4,
    })
    const asset = seeded.prepared.definition.asset
    await selectAssetRow(asset)
    await waitProof(4, 1)

    await clickButton(host, '替换源文件')
    await vi.waitFor(() => {
      expect(host.textContent).toContain('替换当前共享帧源')
    })
    const picker = host.querySelector<HTMLInputElement>('input[aria-label="选择战斗精灵图片"]')
    expect(picker).not.toBeNull()

    // 缩帧侧：2 < 4 → 报错且零提交。
    const shrink = solidAtlasPng(FRAME, FRAME, atlasColors(2))
    await loadFilesIntoInput(picker!, [pngFileOf('两帧.png', shrink.bytes)])
    await vi.waitFor(() => {
      expect(host.textContent).toContain('共 2 帧（横排逐行切）')
    })
    const historyBefore = mounted.session.getHistoryVersion()
    await applyAppearance(mounted, 'error')
    await vi.waitFor(() => {
      expect(
        mounted.notices.some(
          (notice) =>
            notice?.kind === 'error' &&
            notice.message.includes('替换文件只有 2 帧，少于当前 4 帧；默认禁止缩帧'),
        ),
      ).toBe(true)
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(mounted.session.getState().assetCatalog.assets[asset]?.sha256).toBe(
      seeded.prepared.record.sha256,
    )

    // 增帧侧：5 ≥ 4 → 确认后原子替换。
    const grow = solidAtlasPng(
      FRAME,
      FRAME,
      [0, 1, 2, 3, 4].map((i) => atlasColors(16)[i]!),
    )
    await loadFilesIntoInput(picker!, [pngFileOf('五帧.png', grow.bytes)])
    await vi.waitFor(() => {
      expect(host.textContent).toContain('共 5 帧（横排逐行切）')
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await applyAppearance(mounted)
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('替换共享帧源会影响 1 个用途'))
    expect(host.textContent).not.toContain('替换当前共享帧源')
    const decoded = await decodeCurrent(mounted, asset)
    expect(decoded.frames).toHaveLength(5)
    const after = mounted.session.getState().assetCatalog.assets[asset]!
    expect(after.sha256).not.toBe(seeded.prepared.record.sha256)
    expect(after.origin).toEqual({ kind: 'authored' })
    const enemy = mounted.session
      .getState()
      .battleSprites.find((entry) => entry.asset === asset && entry.profile.kind === 'enemy')!
    expect(enemy.profile).toEqual(seeded.prepared.definition.profile)

    expect(await applyBattleHistory(mounted, 'undo')).toBe(true)
    const restored = await decodeCurrent(mounted, asset)
    expect(restored.frames).toHaveLength(4)
    expect(mounted.session.getState().assetCatalog.assets[asset]?.sha256).toBe(
      seeded.prepared.record.sha256,
    )
  })

  test('动作阶段槽拖放：非法载荷零提交，合法帧落槽后真实提交并可撤销', async () => {
    const mounted = await mountLibrary()
    const starter = 'battle-sprite.generated.starter'
    const historyBefore = mounted.session.getHistoryVersion()
    const starterDef = mounted.session
      .getState()
      .battleSprites.find((entry) => entry.asset === starter)!
    expect(starterDef.profile.kind).toBe('player-fighter')
    await waitProof((await decodeCurrent(mounted, starter)).frames.length, 1)

    await act(async () => {
      ;[...host.querySelectorAll<HTMLElement>('.ds-catalog-row')]
        .find((candidate) => candidate.textContent?.includes('普通攻击'))
        ?.click()
    })
    const strikeSlot = () =>
      [...host.querySelectorAll<HTMLLIElement>('.battle-action-stage-list > li')].find((item) =>
        item.textContent?.includes('命中'),
      )!
    await vi.waitFor(() => {
      expect(strikeSlot().textContent).toContain('#9')
    })
    const applyButton = () => buttonByLabel(host, '应用修改')

    // Each untrusted payload is isolated; fractional input distinguishes integer validation.
    const invalidDrops: ReadonlyArray<readonly [string, string]> = [
      ['text/plain', '7'],
      ['application/x-type-pal-battle-raw-frame', '999'],
      ['application/x-type-pal-battle-raw-frame', 'x'],
      ['application/x-type-pal-battle-raw-frame', '1.5'],
    ]
    for (const [type, payload] of invalidDrops) {
      const transfer = new MemoryDataTransfer()
      transfer.setData(type, payload)
      await act(async () => dispatchDragEvent(strikeSlot(), 'drop', transfer))
      expect(strikeSlot().textContent).toContain('#9')
      expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
      expect(applyButton().disabled).toBe(true)
    }

    // 合法侧：真实 dragstart 装载 → drop 落槽 → 应用修改真实提交。
    const legal = new MemoryDataTransfer()
    const sourceCell = host.querySelector<HTMLElement>('[data-source-frame-index="7"]')
    expect(sourceCell).not.toBeNull()
    await act(async () => dispatchDragEvent(sourceCell!, 'dragstart', legal))
    expect(legal.getData('application/x-type-pal-battle-raw-frame')).toBe('7')
    await act(async () => dispatchDragEvent(strikeSlot(), 'drop', legal))
    expect(strikeSlot().textContent).toContain('#7')
    expect(applyButton().disabled).toBe(false)

    await act(async () => applyButton().click())
    await vi.waitFor(() => {
      const current = mounted.session
        .getState()
        .battleSprites.find((entry) => entry.asset === starter)!
      expect(
        current.profile.kind === 'player-fighter' && current.profile.frames.attackStrike === 7,
      ).toBe(true)
    })
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyBefore)
    expect(await applyBattleHistory(mounted, 'undo')).toBe(true)
    const reverted = mounted.session
      .getState()
      .battleSprites.find((entry) => entry.asset === starter)!
    expect(
      reverted.profile.kind === 'player-fighter' && reverted.profile.frames.attackStrike === 9,
    ).toBe(true)
  })
})
