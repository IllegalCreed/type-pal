// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C02-G01：共享帧源 ABI 迟到保护。
 * 排重：BattleSpriteLibrary.test.tsx 已证引用 fail-closed / 缩短帧收紧（mock 预览）；
 * kimi-workflows K01 已证单资产 PNG 导入、替换/追加/删帧、敌人分段修复、增帧/缩帧替换；
 * commands.test.ts / glm-boundaries 已证命令级证明过期。本文件只补：真实 EditSession 上
 * 「外部迟到操作者」与 UI 草稿/证明/消费者快照的交错——proof 重绑、草稿保留/丢弃、
 * 确认窗口期内消费者漂移 fail-closed、玩家共享用途同事务重排。
 */
import type { BattleSpriteProfile, PlayerFighterBattleSpriteProfile } from '@type-pal/content'
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  buildExternalReplace,
  buildExternalSharedSummon,
  decodeBattleAsset,
  loadCursorBattleProject,
} from '../__tests__/cursor-asset-r1/battle-sprite-fixtures.js'
import {
  A_SHARED,
  applyButton,
  chooseActionRow,
  clickButtonByText,
  noticeErrors,
  pickImportFile,
  rawEditorMessage,
  renameUsage,
  STANDARD_SPECS,
  selectSourceFrame,
  setupBattleSuite,
  usageNameInput,
  waitProof,
  waitRawMessage,
} from '../__tests__/cursor-asset-r1/battle-sprite-ui.js'
import { atlasColors, pngFileOf, solidAtlasPng } from '../__tests__/cursor-asset-r1/image-ports.js'
import { UpdateBattleSpriteDefinitionCommand } from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'

const suite = setupBattleSuite()

function profileOf(
  state: { battleSprites: ReadonlyArray<{ id: string; profile: BattleSpriteProfile }> },
  id: string,
): PlayerFighterBattleSpriteProfile {
  const profile = state.battleSprites.find((entry) => entry.id === id)?.profile
  if (profile?.kind !== 'player-fighter') throw new Error(`${id} 不是玩家战斗精灵`)
  return profile
}

test('C02-G01-01 草稿未提交时外部增帧替换：证明失效窗口内应用禁用，重解码后重绑并可提交', async () => {
  const m = await suite.mount('c02-g01-01', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await renameUsage(m.host, '甲·草稿')
  expect(applyButton(m.host).disabled).toBe(false)

  const { command } = await buildExternalReplace(
    m.session,
    m.reader,
    m.project.palette,
    A_SHARED,
    13,
    5,
  )
  await act(async () => {
    m.session.dispatch(command)
  })
  expect(applyButton(m.host).disabled).toBe(true)
  await waitProof(m.host, 13, 2)
  expect(applyButton(m.host).disabled).toBe(false)
  expect(usageNameInput(m.host)?.value).toBe('甲·草稿')

  await act(async () => applyButton(m.host).click())
  expect(m.session.getState().battleSprites.find((e) => e.id === 'shared-fighter-a')?.label).toBe(
    '甲·草稿',
  )
  expect(noticeErrors(m.notices)).toEqual([])
  expect(m.session.getHistoryVersion()).toBe(2)
  assertProjectSaveValid(m.session.getState())
})

test('C02-G01-02 外部缩帧替换改写消费者对象：未提交的改名草稿回落到规范值且不可应用', async () => {
  const m = await suite.mount('c02-g01-02', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await renameUsage(m.host, '甲·将被丢弃')
  expect(applyButton(m.host).disabled).toBe(false)

  const { command } = await buildExternalReplace(
    m.session,
    m.reader,
    m.project.palette,
    A_SHARED,
    10,
    5,
  )
  await act(async () => {
    m.session.dispatch(command)
  })
  await waitProof(m.host, 10, 2)
  expect(usageNameInput(m.host)?.value).toBe('甲战士')
  expect(applyButton(m.host).disabled).toBe(true)
  expect(m.session.getHistoryVersion()).toBe(1)
})

test('C02-G01-03 偷窃槽草稿指向第 11 帧，外部缩到 10 帧后草稿不携带越界帧', async () => {
  const m = await suite.mount('c02-g01-03', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await chooseActionRow(m.host, '偷窃')
  await selectSourceFrame(m.host, 11)
  await act(async () => {
    m.host.querySelector<HTMLButtonElement>('button[aria-label="用已选 #11 替换偷窃动作"]')!.click()
  })
  expect(m.host.querySelector('[aria-label="动作列表"]')?.textContent).toContain('#11 → #0')
  expect(applyButton(m.host).disabled).toBe(false)

  const { command } = await buildExternalReplace(
    m.session,
    m.reader,
    m.project.palette,
    A_SHARED,
    10,
    7,
  )
  await act(async () => {
    m.session.dispatch(command)
  })
  await waitProof(m.host, 10, 2)
  expect(m.host.querySelector('[aria-label="动作列表"]')?.textContent).not.toContain('#11')
  expect(applyButton(m.host).disabled).toBe(true)
  const profile = profileOf(m.session.getState(), 'shared-fighter-a')
  expect(profile.frames.steal).toBeUndefined()
})

test('C02-G01-04 外部新增共享消费者使替换面板关闭且零提交；重开后确认文案按最新 3 个用途重算', async () => {
  const m = await suite.mount('c02-g01-04', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const grow = solidAtlasPng(8, 8, atlasColors(13))
  const openAndPick = async (): Promise<void> => {
    await clickButtonByText(m.host, '替换源文件')
    await vi.waitFor(() => {
      expect(m.host.textContent).toContain('替换当前共享帧源')
    })
    await pickImportFile(m.host, pngFileOf('十三帧.png', grow.bytes))
    await vi.waitFor(() => {
      expect(m.host.textContent).toContain('共 13 帧（横排逐行切）')
    })
  }
  await openAndPick()
  const summon = await buildExternalSharedSummon(
    m.session,
    m.reader,
    A_SHARED,
    'late-fox',
    '迟到狐火',
  )
  await act(async () => {
    m.session.dispatch(summon)
  })
  expect(m.host.textContent).not.toContain('替换当前共享帧源')
  expect(m.session.getHistoryVersion()).toBe(1)
  expect(m.session.getState().assetCatalog.assets[A_SHARED]?.sha256).toBe(
    m.project.seeded.get(A_SHARED)!.sha256,
  )

  await waitProof(m.host, 12, 3)
  await openAndPick()
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  await clickButtonByText(m.host, '应用外观')
  await vi.waitFor(() => {
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('替换共享帧源会影响 3 个用途'))
  })
  await vi.waitFor(() => {
    expect(m.host.textContent).not.toContain('替换当前共享帧源')
  })
  expect(noticeErrors(m.notices)).toEqual([])
  const decoded = await decodeBattleAsset(m.project, m.session.getState(), A_SHARED)
  expect(decoded.frames).toHaveLength(13)
  expect(
    m.session
      .getState()
      .battleSprites.filter((e) => e.asset === A_SHARED)
      .map((e) => e.id),
  ).toEqual(['shared-fighter-a', 'shared-fighter-b', 'late-fox'])
})

test('C02-G01-05 删帧确认窗口内外部新增共享消费者：缩帧事务拒绝，字节与 catalog 不变', async () => {
  const m = await suite.mount('c02-g01-05', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await selectSourceFrame(m.host, 11)
  const seededSha = m.project.seeded.get(A_SHARED)!.sha256
  const late = await buildExternalSharedSummon(
    m.session,
    m.reader,
    A_SHARED,
    'late-fox',
    '迟到狐火',
  )
  const confirm = vi.spyOn(window, 'confirm').mockImplementation(() => {
    m.session.dispatch(late)
    return true
  })
  await clickButtonByText(m.host, '删除当前帧')
  const message = await waitRawMessage(m.host)
  expect(confirm).toHaveBeenCalledOnce()
  expect(message.classList.contains('error')).toBe(true)
  expect(message.textContent).toBe('缩帧事务必须显式修复全部共享战斗精灵消费者')
  expect(m.session.getState().assetCatalog.assets[A_SHARED]?.sha256).toBe(seededSha)
  expect(m.session.getHistoryVersion()).toBe(1)
  expect((await decodeBattleAsset(m.project, m.session.getState(), A_SHARED)).frames).toHaveLength(
    12,
  )
})

test('C02-G01-06 删帧确认窗口内外部改了消费者 profile：快照不符拒绝且保留外部改动', async () => {
  const m = await suite.mount('c02-g01-06', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await selectSourceFrame(m.host, 11)
  const record = m.session.getState().assetCatalog.assets[A_SHARED]!
  const current = profileOf(m.session.getState(), 'shared-fighter-a')
  const drift = new UpdateBattleSpriteDefinitionCommand(
    'shared-fighter-a',
    { profile: { ...current, castEffectBase: 3 } },
    { asset: A_SHARED, sha256: record.sha256, actualFrameCount: 12 },
  )
  vi.spyOn(window, 'confirm').mockImplementation(() => {
    m.session.dispatch(drift)
    return true
  })
  await clickButtonByText(m.host, '删除当前帧')
  const message = await waitRawMessage(m.host)
  expect(message.classList.contains('error')).toBe(true)
  expect(message.textContent).toBe('缩帧消费者 shared-fighter-a 的 profile 已变化，请重新确认')
  expect(m.session.getHistoryVersion()).toBe(1)
  expect(profileOf(m.session.getState(), 'shared-fighter-a').castEffectBase).toBe(3)
  expect(m.session.getState().assetCatalog.assets[A_SHARED]?.sha256).toBe(record.sha256)
})

test('C02-G01-07 会话层：外部替换后沿用旧证明的 ABI 更新被拒且零污染，新证明可提交', async () => {
  const project = await loadCursorBattleProject('c02-g01-07', STANDARD_SPECS)
  const mounted = await suite.mountProject(project)
  const record = mounted.session.getState().assetCatalog.assets[A_SHARED]!
  const staleProof = { asset: A_SHARED, sha256: record.sha256, actualFrameCount: 12 }
  const { command } = await buildExternalReplace(
    mounted.session,
    mounted.reader,
    project.palette,
    A_SHARED,
    13,
    4,
  )
  expect(mounted.session.dispatch(command)).toBe(true)
  const nextProfile: PlayerFighterBattleSpriteProfile = {
    ...profileOf(mounted.session.getState(), 'shared-fighter-a'),
    attackEffectBase: 2,
  }
  const before = mounted.session.getState()
  const history = mounted.session.getHistoryVersion()
  expect(() =>
    mounted.session.dispatch(
      new UpdateBattleSpriteDefinitionCommand(
        'shared-fighter-a',
        { profile: nextProfile },
        staleProof,
      ),
    ),
  ).toThrow('战斗精灵 ABI 证明缺失或已过期，请等待资源重新载入')
  expect(mounted.session.getState()).toBe(before)
  expect(mounted.session.getHistoryVersion()).toBe(history)
  const fresh = mounted.session.getState().assetCatalog.assets[A_SHARED]!
  expect(
    mounted.session.dispatch(
      new UpdateBattleSpriteDefinitionCommand(
        'shared-fighter-a',
        { profile: nextProfile },
        { asset: A_SHARED, sha256: fresh.sha256, actualFrameCount: 13 },
      ),
    ),
  ).toBe(true)
  expect(mounted.session.getHistoryVersion()).toBe(history + 1)
  expect(profileOf(mounted.session.getState(), 'shared-fighter-a').attackEffectBase).toBe(2)
})

test('C02-G01-08 外部替换后 undo：证明回绑旧字节，未提交草稿保留并可正常应用', async () => {
  const m = await suite.mount('c02-g01-08', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const { command } = await buildExternalReplace(
    m.session,
    m.reader,
    m.project.palette,
    A_SHARED,
    13,
    5,
  )
  await act(async () => {
    m.session.dispatch(command)
  })
  await waitProof(m.host, 13, 2)
  await renameUsage(m.host, '甲·撤销后')
  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect(applyButton(m.host).disabled).toBe(true)
  await waitProof(m.host, 12, 2)
  expect(usageNameInput(m.host)?.value).toBe('甲·撤销后')
  expect(applyButton(m.host).disabled).toBe(false)
  await act(async () => applyButton(m.host).click())
  expect(noticeErrors(m.notices)).toEqual([])
  expect(m.session.getState().battleSprites.find((e) => e.id === 'shared-fighter-a')?.label).toBe(
    '甲·撤销后',
  )
  expect(m.session.getState().assetCatalog.assets[A_SHARED]?.sha256).toBe(
    m.project.seeded.get(A_SHARED)!.sha256,
  )
})

test('C02-G01-09 删除玩家共享帧 #3：两个用途在同一事务内重排槽位，撤销整体还原', async () => {
  const m = await suite.mount('c02-g01-09', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const before = structuredClone(m.session.getState().battleSprites)
  const seeded = m.project.seeded.get(A_SHARED)!
  await selectSourceFrame(m.host, 3)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  await clickButtonByText(m.host, '删除当前帧')
  const message = await waitRawMessage(m.host)
  expect(message.classList.contains('error')).toBe(false)
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('甲战士：重排 7 个动作槽位'))
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('乙战士：重排 7 个动作槽位'))
  const frames = (id: string) => profileOf(m.session.getState(), id).frames
  for (const id of ['shared-fighter-a', 'shared-fighter-b'])
    expect(frames(id)).toEqual({
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 3,
      preMagic: 4,
      magic: 5,
      attackWindup: 6,
      attackRush: 7,
      attackStrike: 8,
    })
  await waitProof(m.host, 11, 2)
  const decoded = await decodeBattleAsset(m.project, m.session.getState(), A_SHARED)
  expect(decoded.frames).toHaveLength(11)
  expect(decoded.frames[3]).toEqual(seeded.encoded.frames[4])
  assertProjectSaveValid(m.session.getState())

  expect(m.session.undo()).toBe(true)
  expect(m.session.getState().battleSprites).toEqual(before)
  expect(m.session.getState().assetCatalog.assets[A_SHARED]?.sha256).toBe(seeded.sha256)
  expect(rawEditorMessage(m.host)).not.toBeNull()
})

test('C02-G01-10 召唤用途删帧无需槽位重排：全帧语义随实际帧数收缩，undo 回到 5 帧', async () => {
  const m = await suite.mount('c02-g01-10', { focus: 'summon-fox' })
  await waitProof(m.host, 5, 1)
  await selectSourceFrame(m.host, 2)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await clickButtonByText(m.host, '删除当前帧')
  const message = await waitRawMessage(m.host)
  expect(message.textContent).toBe('删除战斗精灵原始帧 #2；可使用撤销恢复。')
  await waitProof(m.host, 4, 1)
  expect(m.session.getState().battleSprites.find((d) => d.id === 'summon-fox')?.profile).toEqual({
    kind: 'summon',
  })
  const decoded = await decodeBattleAsset(
    m.project,
    m.session.getState(),
    'battle-sprite.authored.c02-summon',
  )
  expect(decoded.frames).toHaveLength(4)
  expect(m.session.undo()).toBe(true)
  await waitProof(m.host, 5, 1)
})
