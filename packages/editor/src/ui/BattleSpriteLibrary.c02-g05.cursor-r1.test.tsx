// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C02-G05：经 EditSession.undo/redo 驱动的 UI 再同步。
 * 排重：glm-ui-wave 已证改名 undo 与删除用途 undo（mock 预览）；kimi K01 已证导入/替换/追加/删帧
 * 的 undo 字节还原；glm-m 已证待机毫秒草稿的 undo/redo。本文件补：改名/特效基帧经 undo/redo 后
 * 输入框与应用按钮的回流、新增用途撤销后的选择与重做、删除用途撤销的列表顺序、草稿遇外部 undo、
 * 线性三步历史逐级快照、新提交清空 redo、替换源文件 undo/redo 的预览重绑、追加帧撤销后源帧选择收紧、
 * 撤销后重新新增得到同一用途 id。
 */
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import { decodeBattleAsset } from '../__tests__/cursor-asset-r1/battle-sprite-fixtures.js'
import {
  A_SHARED,
  applyButton,
  clickButtonByText,
  deleteUsageButton,
  noticeErrors,
  pickImportFile,
  renameUsage,
  selectSourceFrame,
  setupBattleSuite,
  usageNameInput,
  waitProof,
  waitRawMessage,
} from '../__tests__/cursor-asset-r1/battle-sprite-ui.js'
import { atlasColors, pngFileOf, solidAtlasPng } from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  controlByLabel,
  fillAndBlur,
  loadFilesIntoInput,
  typeDraft,
} from '../__tests__/cursor-asset-r1/kit.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'

const suite = setupBattleSuite()

function label(
  state: { battleSprites: ReadonlyArray<{ id: string; label: string }> },
  id: string,
): string | undefined {
  return state.battleSprites.find((entry) => entry.id === id)?.label
}

function castBase(
  state: { battleSprites: ReadonlyArray<{ id: string; profile: unknown }> },
  id: string,
): number {
  return (
    state.battleSprites.find((entry) => entry.id === id)!.profile as { castEffectBase: number }
  ).castEffectBase
}

function choiceTitles(host: HTMLElement): string[] {
  return [...host.querySelectorAll('[aria-label="切换用途"] .ds-catalog-row__title')].map(
    (node) => node.textContent ?? '',
  )
}

test('C02-G05-01 改名提交→undo→redo：输入框与切换用途列表随规范值回流，应用按钮始终回到禁用', async () => {
  const m = await suite.mount('c02-g05-01', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await renameUsage(m.host, '甲·改')
  await act(async () => applyButton(m.host).click())
  expect(label(m.session.getState(), 'shared-fighter-a')).toBe('甲·改')
  expect(choiceTitles(m.host)).toEqual(['甲·改', '乙战士'])
  expect(applyButton(m.host).disabled).toBe(true)

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect(usageNameInput(m.host)?.value).toBe('甲战士')
  expect(choiceTitles(m.host)).toEqual(['甲战士', '乙战士'])
  expect(applyButton(m.host).disabled).toBe(true)

  await act(async () => {
    expect(m.session.redo()).toBe(true)
  })
  expect(usageNameInput(m.host)?.value).toBe('甲·改')
  expect(applyButton(m.host).disabled).toBe(true)
  assertProjectSaveValid(m.session.getState())
})

test('C02-G05-02 玩家施法特效基帧：草稿不动规范值，提交后 undo/redo 在 0↔4 间回流到数字框', async () => {
  const m = await suite.mount('c02-g05-02', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const field = () => controlByLabel<HTMLInputElement>(m.host, '施法特效基帧')
  await fillAndBlur(field(), '4')
  expect(castBase(m.session.getState(), 'shared-fighter-a')).toBe(0)
  expect(m.session.getHistoryVersion()).toBe(0)
  await act(async () => applyButton(m.host).click())
  expect(castBase(m.session.getState(), 'shared-fighter-a')).toBe(4)
  expect(castBase(m.session.getState(), 'shared-fighter-b')).toBe(0)

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect(field().value).toBe('0')
  await act(async () => {
    expect(m.session.redo()).toBe(true)
  })
  expect(field().value).toBe('4')
  assertProjectSaveValid(m.session.getState())
})

test('C02-G05-03 新增用途→undo 回落首个用途并上报宿主；redo 恢复第三个用途', async () => {
  const m = await suite.mount('c02-g05-03', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await clickButtonByText(m.host, '新增用途')
  await clickButtonByText(m.host, '敌人')
  await act(async () => applyButton(m.host).click())
  await vi.waitFor(() => {
    expect(m.session.getState().battleSprites.some((e) => e.id === 'c02-enemy')).toBe(true)
  })
  await waitProof(m.host, 12, 3)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'c02-enemy' })

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  await waitProof(m.host, 12, 2)
  expect(m.session.getState().battleSprites.some((e) => e.id === 'c02-enemy')).toBe(false)
  expect(usageNameInput(m.host)?.value).toBe('甲战士')
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'shared-fighter-a' })

  await act(async () => {
    expect(m.session.redo()).toBe(true)
  })
  await waitProof(m.host, 12, 3)
  expect(m.session.getState().battleSprites.some((e) => e.id === 'c02-enemy')).toBe(true)
  assertProjectSaveValid(m.session.getState())
})

test('C02-G05-04 删除用途→undo：回到原索引顺序，切换用途列表恢复，redo 再次移除', async () => {
  const m = await suite.mount('c02-g05-04', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const order = m.session.getState().battleSprites.map((e) => e.id)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await act(async () => deleteUsageButton(m.host)!.click())
  expect(m.session.getState().battleSprites.map((e) => e.id)).not.toContain('shared-fighter-a')

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect(m.session.getState().battleSprites.map((e) => e.id)).toEqual(order)
  await waitProof(m.host, 12, 2)
  expect(choiceTitles(m.host)).toEqual(['甲战士', '乙战士'])

  await act(async () => {
    expect(m.session.redo()).toBe(true)
  })
  expect(m.session.getState().battleSprites.map((e) => e.id)).not.toContain('shared-fighter-a')
  await waitProof(m.host, 12, 1)
})

test('C02-G05-05 草稿进行中遇外部 undo：规范值回流并覆盖草稿，不残留可应用的陈旧改动', async () => {
  const m = await suite.mount('c02-g05-05', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await renameUsage(m.host, '甲·一')
  await act(async () => applyButton(m.host).click())
  await renameUsage(m.host, '甲·二')
  expect(applyButton(m.host).disabled).toBe(false)

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect(usageNameInput(m.host)?.value).toBe('甲战士')
  expect(applyButton(m.host).disabled).toBe(true)
  expect(label(m.session.getState(), 'shared-fighter-a')).toBe('甲战士')
  expect(noticeErrors(m.notices)).toEqual([])
})

test('C02-G05-06 UI 替换源文件增帧后 undo/redo：预览证明随字节重绑到 12↔13 帧', async () => {
  const m = await suite.mount('c02-g05-06', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await clickButtonByText(m.host, '替换源文件')
  await vi.waitFor(() => {
    expect(m.host.textContent).toContain('替换当前共享帧源')
  })
  await pickImportFile(m.host, pngFileOf('十三.png', solidAtlasPng(8, 8, atlasColors(13)).bytes))
  await vi.waitFor(() => {
    expect(m.host.textContent).toContain('共 13 帧（横排逐行切）')
  })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await clickButtonByText(m.host, '应用外观')
  await waitProof(m.host, 13, 2)

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  await waitProof(m.host, 12, 2)
  expect((await decodeBattleAsset(m.project, m.session.getState(), A_SHARED)).frames).toHaveLength(
    12,
  )
  await act(async () => {
    expect(m.session.redo()).toBe(true)
  })
  await waitProof(m.host, 13, 2)
  expect((await decodeBattleAsset(m.project, m.session.getState(), A_SHARED)).frames).toHaveLength(
    13,
  )
  expect(noticeErrors(m.notices)).toEqual([])
})

test('C02-G05-07 三步历史（改名→特效基帧→删用途）逐级 undo 再逐级 redo，快照逐一对齐', async () => {
  const m = await suite.mount('c02-g05-07', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const snapshots = [structuredClone(m.session.getState().battleSprites)]
  vi.spyOn(window, 'confirm').mockReturnValue(true)

  await renameUsage(m.host, '甲·链')
  await act(async () => applyButton(m.host).click())
  snapshots.push(structuredClone(m.session.getState().battleSprites))
  await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '攻击特效基帧'), '2')
  await act(async () => applyButton(m.host).click())
  snapshots.push(structuredClone(m.session.getState().battleSprites))
  await act(async () => deleteUsageButton(m.host)!.click())
  snapshots.push(structuredClone(m.session.getState().battleSprites))
  expect(m.session.getHistoryVersion()).toBe(3)
  expect(new Set(snapshots.map((s) => JSON.stringify(s))).size).toBe(4)

  for (const expected of [snapshots[2], snapshots[1], snapshots[0]]) {
    await act(async () => {
      expect(m.session.undo()).toBe(true)
    })
    expect(m.session.getState().battleSprites).toEqual(expected)
  }
  expect(m.session.undo()).toBe(false)
  for (const expected of [snapshots[1], snapshots[2], snapshots[3]]) {
    await act(async () => {
      expect(m.session.redo()).toBe(true)
    })
    expect(m.session.getState().battleSprites).toEqual(expected)
  }
  expect(m.session.redo()).toBe(false)
})

test('C02-G05-08 undo 后新的 UI 提交清空 redo 栈，且最终规范值是新提交', async () => {
  const m = await suite.mount('c02-g05-08', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await renameUsage(m.host, '甲·一')
  await act(async () => applyButton(m.host).click())
  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  await renameUsage(m.host, '甲·三')
  await act(async () => applyButton(m.host).click())
  expect(label(m.session.getState(), 'shared-fighter-a')).toBe('甲·三')
  expect(m.session.redo()).toBe(false)
  expect(m.session.getHistoryVersion()).toBe(3)
  expect(usageNameInput(m.host)?.value).toBe('甲·三')
})

test('C02-G05-09 追加两帧后选中新末帧再 undo：源帧选择收紧到新末帧，不留越界索引', async () => {
  const m = await suite.mount('c02-g05-09', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await clickButtonByText(m.host, '追加帧')
  const append = solidAtlasPng(8, 8, atlasColors(2))
  const inputs = [
    ...m.host.querySelectorAll<HTMLInputElement>('input[type="file"].sprite-hidden-file-input'),
  ]
  await loadFilesIntoInput(inputs[1]!, [pngFileOf('追加.png', append.bytes)])
  await vi.waitFor(() => {
    expect(m.host.textContent).toContain('将 16×8 图片切为')
  })
  await typeDraft(m.host.querySelector<HTMLInputElement>('.sprite-raw-append-panel input')!, '2')
  await clickButtonByText(m.host, '确认追加')
  await waitRawMessage(m.host)
  await waitProof(m.host, 14, 2)
  await selectSourceFrame(m.host, 13)
  expect(m.host.querySelector('.sprite-raw-toolbar b')?.textContent).toBe('#13')

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  await waitProof(m.host, 12, 2)
  expect(m.host.querySelector('.sprite-raw-toolbar b')?.textContent).toBe('#11')
  expect(m.host.querySelector('[data-source-frame-index="12"]')).toBeNull()
})

test('C02-G05-10 撤销新增用途后再次新增：id 复用 c02-enemy 而非递增，且 redo 栈随之清空', async () => {
  const m = await suite.mount('c02-g05-10', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const addEnemy = async (): Promise<void> => {
    await clickButtonByText(m.host, '新增用途')
    await clickButtonByText(m.host, '敌人')
    await act(async () => applyButton(m.host).click())
    await vi.waitFor(() => {
      expect(m.session.getState().battleSprites.some((e) => e.id === 'c02-enemy')).toBe(true)
    })
  }
  await addEnemy()
  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  await waitProof(m.host, 12, 2)
  await addEnemy()
  expect(m.session.getState().battleSprites.some((e) => e.id === 'c02-enemy-2')).toBe(false)
  expect(m.session.getHistoryVersion()).toBe(3)
  expect(m.session.redo()).toBe(false)
  assertProjectSaveValid(m.session.getState())
})
