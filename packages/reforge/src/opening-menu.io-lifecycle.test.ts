// TEST-REFORGE-OPENING-IO-LIFECYCLE-1 — 标题读档 IO 与缩略图生命周期（GLM r2）。
// 排重：H2 flows 已证选定/空档 Esc 回退/跨页读档与完成时帧键收尾；observation 已证快照流；
// Q01 已证未处理键、环绕与单次进入逐槽恰读一次；host-lifecycle-1 已证标题读档端到端开局。
// r2 口径（Codex 一审 O-R1-01/02）：重复输入产生的双份 IO/解码与退出后继续解码属产品
// 缺陷面，只在隔离红反例（R4/R5b）中作诊断，不写成绿预期；O4 单次正常读档归
// existing-proof（flows H2 跨页读档），本文件不再为重复输入立绿合同。
// 本文件只保留合法残余合同：在途退出后迟到 IO 不复活退休菜单（O5）、重进消费
// 真实 store 更新后的新数据（O6）、有图/无图槽并存选档（O8）。
// IO 拒绝悬空（D-Q01-1）与位图不 close 同为缺陷面：隔离红反例交付，默认 suite 不留红/skip。
// @vitest-environment jsdom
import { buildWorld } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import { chromePng, installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key, until } from './__tests__/runtime-shell/driver.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import type { OpeningDecision, OpeningMenuObservation } from './opening-menu.js'
import { buildCurrentSavePayload } from './save/ops.js'
import { IndexedDbSaveStore, MemorySaveStore, type SaveStore } from './save/store.js'
import { type SaveMeta, type SlotId, slotKind } from './save/types.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

function metaOf(slotId: SlotId, mapName: string, savedAt = 1000): SaveMeta {
  return {
    slotId,
    kind: slotKind(slotId),
    party: [{ name: 'Hero', level: 1 }],
    mapName,
    savedAt,
  }
}

/** 公开 SaveStore 边界的透明留痕层：真实读链路照跑，只记录调用序。 */
function tracedStore(real: SaveStore, reads: string[]): SaveStore {
  return {
    putSlot: (meta, payload, thumb) => real.putSlot(meta, payload, thumb),
    getPayload: (slotId) => real.getPayload(slotId),
    getThumb: async (slotId) => {
      reads.push(`thumb:${slotId}`)
      return real.getThumb(slotId)
    },
    listMeta: async () => {
      reads.push('meta')
      return real.listMeta()
    },
  }
}

/**
 * 卡内测试自用的公开边界注入（合法值/门控送达），底层读写全部落在真实 store：
 * 产品 SaveStore 合同本身允许 getThumb 返回 null（无缩略图槽）与任意 IO 延迟/拒绝。
 */
type Decorate = (real: SaveStore, reads: string[]) => SaveStore

async function opening(
  options: { metas?: SaveMeta[]; indexedDb?: boolean; decorate?: Decorate } = {},
) {
  host = await installShellHost()
  const fixture = await shellProject()
  const { loadMenuAssets } = await import('./menu/menu-box.js')
  const { projectItemsView } = await import('./runtime-project-view.js')
  const { loadGlyphs } = await import('./text/glyph.js')
  const { runOpeningMenu } = await import('./opening-menu.js')
  const menuAssets = await loadMenuAssets(
    projectItemsView(fixture.project.items),
    fixture.project.imageCache,
  )
  const real: SaveStore = options.indexedDb
    ? new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
    : new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })
  const entry = fixture.project.manifest.entryPoints[0]!
  const payload = buildCurrentSavePayload(
    buildWorld(entry.startWorld, fixture.project.actorsById),
    { sceneId: 'a', pos: { col: 2, row: 2, height: 0 }, facing: 'down' },
    'shell-project',
  )
  const seed = async (meta: SaveMeta): Promise<void> => {
    // 经产品写路径更新真实 store（同 payload 换 meta = 浏览界面可见快照更新）。
    await real.putSlot(meta, payload, new Blob([chromePng().slice().buffer], { type: 'image/png' }))
  }
  for (const meta of options.metas ?? []) await seed(meta)
  const reads: string[] = []
  const store = options.decorate ? options.decorate(real, reads) : tracedStore(real, reads)
  const canvas = document.querySelector('canvas')!
  const ctx = canvas.getContext('2d')!
  const bg = await createImageBitmap(new Blob([chromePng().slice().buffer]))
  const bitmapsBeforeMenu = host.bitmaps.length
  const snapshots: OpeningMenuObservation[] = []
  const done = runOpeningMenu({
    ctx,
    glyphs: await loadGlyphs(),
    bg,
    items: [
      { id: 'first', label: 'A' },
      { id: 'second', label: 'AA' },
    ],
    worldScale: 4,
    locale: {},
    menuAssets,
    saveStore: store,
    observe: (snapshot) => snapshots.push(snapshot),
  })
  const state: { value?: OpeningDecision } = {}
  const consumed = done.then((value) => {
    state.value = value
  })
  host.frame()
  return {
    h: host,
    state,
    done,
    consumed,
    reads,
    snapshots,
    seed,
    /** 宿主 createImageBitmap 记录中的缩略图位图（菜单启动后的增量）。 */
    thumbBitmaps: () => host!.bitmaps.slice(bitmapsBeforeMenu),
    async finish() {
      for (let i = 0; i < 3 && !state.value; i++) {
        await key(host!, 'Escape')
        await key(host!, 'ArrowDown')
        await key(host!, 'Enter')
      }
      if (!state.value) throw new Error('opening menu did not resolve during cleanup')
      await consumed
    },
  }
}

function spanTextsSince(host: ShellHost, mark: number): string[] {
  return host.text.mock.calls.slice(mark).flatMap((call) => call[1].map((span) => span.text))
}

test('O5 读档IO在途时选新局退出：菜单退休后迟到IO不复活帧键与绘制', async () => {
  const gate = { release: (): void => {} }
  // delivered = 门控送达标记（场景前置自证：迟到结果确实到达过），不涉产品资源断言。
  const delivered: string[] = []
  const o = await opening({
    metas: [metaOf('m01', '旧港')],
    // 门控 listMeta 送达（快照已在调用时由真实 store 取好）：模型化慢 IO，产品链路不变。
    decorate: (real, reads) => ({
      putSlot: (meta, payload, thumb) => real.putSlot(meta, payload, thumb),
      getPayload: (slotId) => real.getPayload(slotId),
      getThumb: async (slotId) => {
        reads.push(`thumb:${slotId}`)
        return real.getThumb(slotId)
      },
      listMeta: async () => {
        reads.push('meta')
        const metas = await real.listMeta()
        await new Promise<void>((resolve) => {
          gate.release = resolve
        })
        delivered.push('meta')
        return metas
      },
    }),
  })
  try {
    await key(o.h, 'ArrowUp')
    o.h.key('Enter') // 读取进度：listMeta 已调用、送达被门控
    o.h.frame(100)
    await drain()
    expect(o.reads).toEqual(['meta']) // IO 已真实在途（调用已发出、结果未送达）
    expect(o.snapshots.at(-1)?.phase).toBe('menu') // 在途：菜单仍持有相位/键/帧
    await key(o.h, 'ArrowDown') // 读取进度 → first
    await key(o.h, 'Enter') // 选新局：cleanup + resolve，菜单退休
    expect(await o.done).toEqual({ kind: 'new', entryId: 'first' })
    expect(o.h.frames.size).toBe(0) // rAF 已退休
    const drawsAtExit = o.h.draws.length
    o.h.key('ArrowDown') // 退休键无主：输入无副作用
    o.h.key('Enter')
    await drain()
    gate.release() // 迟到结果送达
    await drain()
    await o.h.settleIO()
    await drain()
    expect(delivered).toEqual(['meta']) // 场景自证：迟到送达确实发生
    expect(o.h.frames.size).toBe(0) // 无 rAF 复活
    expect(o.h.draws).toHaveLength(drawsAtExit) // 无绘制复活
    o.h.frame(100)
    expect(o.h.draws).toHaveLength(drawsAtExit)
    expect(o.state.value).toEqual({ kind: 'new', entryId: 'first' }) // 迟到键/IO不改结果
  } finally {
    // 失败路径也收妥：幂等释放本次 gate，让在途 IO 落定，再把未收口的菜单用真实键收掉。
    gate.release()
    await drain()
    await o.h.settleIO()
    await drain()
    for (let i = 0; i < 3 && !o.state.value; i++) {
      await key(o.h, 'Escape')
      await key(o.h, 'ArrowDown')
      await key(o.h, 'Enter')
    }
  }
})

test('O6 退出读档相位后重新进入：消费真实store更新后的新数据并完成读档', async () => {
  const o = await opening({ metas: [metaOf('m01', '旧港')] })
  try {
    await key(o.h, 'ArrowUp')
    await key(o.h, 'Enter') // 进入读档相位：可见旧快照
    await until(o.h, () => o.snapshots.at(-1)?.phase === 'load')
    o.h.frame(100)
    expect(spanTextsSince(o.h, 0)).toContain('旧港') // 场景前置：第一访看到旧数据
    await key(o.h, 'Escape') // 退回标题（光标仍停在读取进度）
    expect(o.snapshots.at(-1)?.phase).toBe('menu')
    await o.seed(metaOf('m01', '新港', 2000)) // 期间经产品写路径更新真实 store
    const mark = o.h.text.mock.calls.length
    await key(o.h, 'Enter') // 重新进入
    await until(o.h, () => o.snapshots.at(-1)?.phase === 'load')
    o.h.frame(100)
    const late = spanTextsSince(o.h, mark)
    expect(late).toContain('新港') // 重进消费的是当前 store 的新快照，不是首访缓存
    expect(late).not.toContain('旧港')
    await key(o.h, 'ArrowDown')
    await key(o.h, 'ArrowDown')
    await key(o.h, 'Enter')
    expect(await o.done).toEqual({ kind: 'load', slotId: 'm01' })
  } finally {
    await o.finish()
  }
})

test('O8 一槽有图一槽无图：无图占位可渲染可选档，选档独立于缩略图解码', async () => {
  const o = await opening({
    indexedDb: true, // 真实 IndexedDbSaveStore 读写链（宿主 fake-indexeddb）
    metas: [metaOf('m01', '旧港'), metaOf('quick', '新城', 2000)],
    // 公开边界合法值：m01 无缩略图（getThumb 合同允许 null），quick 正常返回。
    decorate: (real, reads) => ({
      putSlot: (meta, payload, thumb) => real.putSlot(meta, payload, thumb),
      getPayload: (slotId) => real.getPayload(slotId),
      getThumb: async (slotId) => {
        reads.push(`thumb:${slotId}`)
        return slotId === 'm01' ? null : real.getThumb(slotId)
      },
      listMeta: async () => {
        reads.push('meta')
        return real.listMeta()
      },
    }),
  })
  // IndexedDB 链跨宏任务：有界推进须带宿主 IO 冲刷（同 main.host-lifecycle-1 的 advance）。
  const advanceUntil = async (predicate: () => boolean): Promise<void> => {
    for (let i = 0; i < 120 && !predicate(); i++) {
      o.h.frame(100)
      await drain()
      await o.h.settleIO()
    }
    expect(predicate()).toBe(true)
  }
  try {
    await key(o.h, 'ArrowUp')
    await key(o.h, 'Enter')
    await advanceUntil(() => o.snapshots.at(-1)?.phase === 'load')
    expect(o.reads).toEqual(['meta', 'thumb:m01', 'thumb:quick'])
    expect(o.thumbBitmaps()).toHaveLength(1) // 场景前置：仅 quick 有图
    o.h.frame(100)
    const texts = o.h.text.mock.calls.flatMap((call) => call[1].map((span) => span.text))
    expect(texts).toContain('旧港') // 无图槽 meta 仍渲染（占位不依赖位图）
    expect(texts).toContain('新城')
    const thumb = o.thumbBitmaps()[0]!
    expect(o.h.draws.some((draw) => draw.method === 'drawImage' && draw.args[0] === thumb)).toBe(
      true,
    ) // 有图槽照画缩略图
    await key(o.h, 'ArrowDown')
    await key(o.h, 'ArrowDown') // auto → quick → m01：选无图槽
    await key(o.h, 'Enter')
    for (let i = 0; i < 120 && o.state.value === undefined; i++) {
      o.h.frame(100)
      await drain()
      await o.h.settleIO()
    }
    expect(o.state.value).toEqual({ kind: 'load', slotId: 'm01' }) // 选档不依赖缩略图
    await o.consumed
  } finally {
    await o.finish()
  }
})
