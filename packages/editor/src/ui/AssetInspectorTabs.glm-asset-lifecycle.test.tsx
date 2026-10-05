// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-ASSET-LIFECYCLE-1：检查器 Tab 家族资源选择回落残余合同。
 *
 * 旧测去重（只登记，不复制）：
 * - AssetInspectorTabs.test.tsx：四个 Tab 的 canonical Inspector 结构、引用/诊断过滤——已证，
 *   但 focusObjectId 恒指向合法资源，缺失/异类焦点从未测过。
 * - ImageTab.kimi-workflows：图片检查器缺失焦点面板（image-missing-target）——已证（ImageTab 自身）。
 * - AudioAssetWorkbench.kimi-workflows：删除回落/磁盘失败/取消收尾——已证（audio 工作台自身），
 *   缺失焦点面板（“引用目标 AssetId…不在项目 catalog；不会跳到其他资源”）未测。
 * - CutsceneTab.kimi-workflows：帧动画替换/删除/量化——已证；缺失/异类焦点回落首项未测。
 * 本文件只补两条未证明的回落合同：
 * 1) 音乐/音效检查器（AudioAssetWorkbench 家族）：缺失焦点显示缺失面板且不跳到其他资源，
 *    焦点恢复为合法 id 后选择恢复，全程零命令；
 * 2) 过场检查器：异类焦点回落首项不崩溃，焦点切到合法视频后选择跟随，全程零命令。
 * 全部输入为正式 loader 的合法工程 + 真实 UpsertAssetCommand 播种；无强转、无产品 mock。
 */
import type { AssetKind, AssetRecordV1 } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpsertAssetCommand } from '../core/asset-commands.js'
import { collectEditorAssetDiagnostics } from '../core/asset-diagnostics.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { collectEditorAssetReferences } from '../core/editor-asset-references.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { CutsceneTab } from './CutsceneTab.js'
import { MusicTab } from './MusicTab.js'
import { SoundTab } from './SoundTab.js'

function mediaRecord(input: {
  kind: AssetKind
  mediaType: string
  label: string
  extension: string
  sha256: string
}): AssetRecordV1 {
  return {
    kind: input.kind,
    path: `assets/authored/${input.kind}/${input.sha256.slice(0, 8)}.${input.extension}`,
    mediaType: input.mediaType,
    bytes: 8,
    sha256: input.sha256,
    label: input.label,
    origin: { kind: 'authored' },
  }
}

async function mountSession(): Promise<{
  session: EditSession
  reader: ReturnType<typeof createEditorAssetReader>
  assetBase: Awaited<ReturnType<typeof loadLegalUiProject>>['assetBase']
}> {
  const legal = await loadLegalUiProject('glm-asset-lifecycle-tabs')
  const session = new EditSession(legal.state)
  const bytes = new Uint8Array(8).fill(7).buffer
  const upsert = async (id: string, record: AssetRecordV1) => {
    await act(async () => {
      session.dispatch(new UpsertAssetCommand(id, record, bytes))
    })
  }
  await upsert(
    'music.test',
    mediaRecord({
      kind: 'music',
      mediaType: 'audio/midi',
      label: '测试音乐',
      extension: 'mid',
      sha256: '1'.repeat(64),
    }),
  )
  await upsert(
    'sound.test',
    mediaRecord({
      kind: 'sound',
      mediaType: 'audio/wav',
      label: '测试音效',
      extension: 'wav',
      sha256: '2'.repeat(64),
    }),
  )
  await upsert(
    'portrait.test',
    mediaRecord({
      kind: 'portrait',
      mediaType: 'image/png',
      label: '测试立绘',
      extension: 'png',
      sha256: '3'.repeat(64),
    }),
  )
  await upsert(
    'video.test',
    mediaRecord({
      kind: 'video',
      mediaType: 'video/mp4',
      label: '测试视频',
      extension: 'mp4',
      sha256: '4'.repeat(64),
    }),
  )
  await upsert(
    'video.unused',
    mediaRecord({
      kind: 'video',
      mediaType: 'video/mp4',
      label: '未使用视频',
      extension: 'mp4',
      sha256: '5'.repeat(64),
    }),
  )
  return {
    session,
    reader: createEditorAssetReader(legal.source, () => session.getState()),
    assetBase: legal.assetBase,
  }
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  await stubNodeTestHost()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe('检查器 Tab 家族资源选择回落残余合同', () => {
  test('音乐/音效检查器缺失焦点：缺失面板不跳资源，焦点恢复后选择重建，全程零命令', async () => {
    const { session, reader } = await mountSession()
    const state = session.getState()
    const props = {
      referenceIndex: collectCurrentProjectReferenceIndex(state),
      referenceStatus: 'current' as const,
      getCurrentReferenceIndex: collectCurrentProjectReferenceIndex,
      assetDiagnostics: collectEditorAssetDiagnostics(
        state.assetCatalog,
        collectEditorAssetReferences(state),
      ),
    }

    const renderMusic = async (focusObjectId: string): Promise<void> => {
      await act(async () =>
        root.render(
          <MusicTab
            {...props}
            catalog={state.assetCatalog}
            reader={reader}
            session={session}
            focusObjectId={focusObjectId}
          />,
        ),
      )
    }

    await renderMusic('music.gone')
    const missingPanel = host.querySelector('[role="alert"]')
    expect(missingPanel).not.toBeNull()
    expect(missingPanel?.textContent).toContain('引用目标 AssetId“music.gone”不在项目 catalog')
    expect(missingPanel?.textContent).toContain('不会跳到其他资源')
    // 不跳到其他资源：缺失焦点下不渲染任何资源 hero。
    expect(host.querySelector('.ds-object-hero')).toBeNull()

    // 焦点恢复：缺失面板消失、hero 重建。播放器自身的解码提示与本合同无关，不约束。
    await renderMusic('music.test')
    expect(host.textContent).not.toContain('不在项目 catalog')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('测试音乐')

    const renderSound = async (focusObjectId: string): Promise<void> => {
      await act(async () =>
        root.render(
          <SoundTab
            {...props}
            catalog={state.assetCatalog}
            reader={reader}
            session={session}
            focusObjectId={focusObjectId}
          />,
        ),
      )
    }
    await renderSound('sound.gone')
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      '引用目标 AssetId“sound.gone”不在项目 catalog',
    )
    expect(host.querySelector('.ds-object-hero')).toBeNull()
    await renderSound('sound.test')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('测试音效')

    // 纯视图回落：会话零命令（播种后不再增长）。
    const history = session.getHistoryVersion()
    expect(history).toBe(5)
  })

  test('过场检查器异类焦点回落首项视频；焦点切到合法视频后选择跟随，零命令', async () => {
    const { session, reader, assetBase } = await mountSession()
    const state = session.getState()
    const props = {
      referenceIndex: collectCurrentProjectReferenceIndex(state),
      referenceStatus: 'current' as const,
      getCurrentReferenceIndex: collectCurrentProjectReferenceIndex,
      assetDiagnostics: collectEditorAssetDiagnostics(
        state.assetCatalog,
        collectEditorAssetReferences(state),
      ),
    }
    const historyAfterSeed = session.getHistoryVersion()

    const renderCutscene = async (focusObjectId: string): Promise<void> => {
      await act(async () => {
        root.render(
          <CutsceneTab
            {...props}
            assetBase={assetBase}
            catalog={state.assetCatalog}
            reader={reader}
            session={session}
            focusObjectId={focusObjectId}
          />,
        )
        await Promise.resolve()
      })
    }

    // 异类焦点（存在但不是视频/帧动画）：回落到首个视频，不崩溃、不显示缺失 id。
    await renderCutscene('portrait.test')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('测试视频')
    expect(host.textContent).not.toContain('portrait.test')

    // 焦点切到另一条合法视频：选择跟随。
    await renderCutscene('video.unused')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('未使用视频')
    expect(session.getHistoryVersion()).toBe(historyAfterSeed)
  })
})
