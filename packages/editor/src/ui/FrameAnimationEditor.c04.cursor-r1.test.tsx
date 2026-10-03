// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C04-G01–G06：FrameAnimationEditor 时长/插删换排/undo-redo 选择归属。
 * 排重：codex-frame-editor 六套已证载入/基础编辑/播放/视口/保存/异步归属；reorder.test 三项
 * existing-proof。本文件只补 duration 与结构编辑后的 metadata、选择 id 跟随与历史对称空隙。
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  C04_MAIN,
  frameId,
  type MountedFrameEditor,
  mountFrameEditor,
  px,
} from '../__tests__/cursor-asset-r1/frame-editor-harness.js'

let f: MountedFrameEditor | undefined
afterEach(async () => {
  await f?.cleanup()
  f = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function mount(): Promise<MountedFrameEditor> {
  f = await mountFrameEditor()
  await f.ready()
  return f
}

describe('C04-G01 总时长 metadata', () => {
  test('C04-G01-01 初始三帧总时长 150ms 且 defaultFrameMs=40', async () => {
    const h = await mount()
    expect(h.latest()).toMatchObject({ frameCount: 3, durationMs: 150, defaultFrameMs: 40 })
  })

  test('C04-G01-02 改当前帧 override 后 metadata 总时长即时更新', async () => {
    const h = await mount()
    await h.select(0)
    await h.number('当前帧时长（ms）', '100')
    expect(h.latest()?.durationMs).toBe(210)
  })

  test('C04-G01-03 全局帧率 blur 后只抬默认帧时长，override 帧不变', async () => {
    const h = await mount()
    await h.number('全局帧率', '20', true)
    expect(h.latest()?.defaultFrameMs).toBe(50)
    expect(h.latest()?.durationMs).toBe(170)
  })

  test('C04-G01-04 清空 override 后该帧回到 default 计入总时长', async () => {
    const h = await mount()
    await h.select(1)
    await h.number('当前帧时长（ms）', '')
    expect(h.latest()?.durationMs).toBe(120)
  })

  test('C04-G01-05 仅改时长 frameCount 保持 3', async () => {
    const h = await mount()
    await h.select(2)
    await h.number('当前帧时长（ms）', '33')
    expect(h.latest()?.frameCount).toBe(3)
  })

  test('C04-G01-06 两帧 override 后总时长为逐项相加', async () => {
    const h = await mount()
    await h.select(0)
    await h.number('当前帧时长（ms）', '10')
    await h.select(2)
    await h.number('当前帧时长（ms）', '20')
    expect(h.latest()?.durationMs).toBe(100)
  })

  test('C04-G01-07 保存重开后 index.frames 保留 override 槽', async () => {
    const h = await mount()
    h.withoutWorker()
    await h.select(1)
    await h.number('当前帧时长（ms）', '88')
    await h.click('保存动画')
    const { index } = await h.saved()
    expect(index.frames).toEqual([{}, { durationMs: 88 }, {}])
    expect(h.latest()?.durationMs).toBe(168)
  })

  test('C04-G01-08 撤销时长编辑 metadata 回到 150', async () => {
    const h = await mount()
    await h.select(0)
    await h.number('当前帧时长（ms）', '200')
    await h.click('撤销帧编辑')
    expect(h.latest()?.durationMs).toBe(150)
  })

  test('C04-G01-09 重做时长编辑 metadata 回到 310', async () => {
    const h = await mount()
    await h.select(0)
    await h.number('当前帧时长（ms）', '200')
    await h.click('撤销帧编辑')
    await h.click('重做帧编辑')
    expect(h.latest()?.durationMs).toBe(310)
  })

  test('C04-G01-10 非法全局帧率 blur 不改变 default 与总时长', async () => {
    const h = await mount()
    await h.number('全局帧率', '0', true)
    expect(h.latest()).toMatchObject({ defaultFrameMs: 40, durationMs: 150 })
  })
})

describe('C04-G02 当前帧时长字段', () => {
  test('C04-G02-01 选中 override 帧时字段值为 70', async () => {
    const h = await mount()
    await h.select(1)
    expect(h.field('当前帧时长（ms）').value).toBe('70')
  })

  test('C04-G02-02 选中默认帧时字段为空且 placeholder 含 40', async () => {
    const h = await mount()
    await h.select(0)
    const input = h.field('当前帧时长（ms）')
    expect(input.value).toBe('')
    expect(input.placeholder).toContain('40')
  })

  test('C04-G02-03 输入合法正数立即 commit 且 dirty', async () => {
    const h = await mount()
    await h.select(0)
    await h.number('当前帧时长（ms）', '55')
    expect(h.latest()?.durationMs).toBe(165)
    expect(h.dirty.mock.lastCall).toEqual([true])
  })

  test('C04-G02-04 输入非正数不改动总时长', async () => {
    const h = await mount()
    await h.select(0)
    await h.number('当前帧时长（ms）', '-5')
    expect(h.latest()?.durationMs).toBe(150)
  })

  test('C04-G02-05 切换选中帧字段跟随当前 override', async () => {
    const h = await mount()
    await h.select(1)
    await h.select(0)
    expect(h.field('当前帧时长（ms）').value).toBe('')
    await h.select(1)
    expect(h.field('当前帧时长（ms）').value).toBe('70')
  })

  test('C04-G02-06 改时长后 counter 仍显示当前序号', async () => {
    const h = await mount()
    await h.select(2)
    await h.number('当前帧时长（ms）', '99')
    expect(h.counter()).toBe('3 / 3')
  })

  test('C04-G02-07 全局 default 变更后无 override 帧 placeholder 更新', async () => {
    const h = await mount()
    await h.number('全局帧率', '25', true)
    await h.select(0)
    expect(h.field('当前帧时长（ms）').placeholder).toContain('40')
  })

  test('C04-G02-08 连续两次改同一帧 override 以最后一次为准', async () => {
    const h = await mount()
    await h.select(1)
    await h.number('当前帧时长（ms）', '80')
    await h.number('当前帧时长（ms）', '90')
    expect(h.latest()?.durationMs).toBe(170)
  })

  test('C04-G02-09 撤销单帧 override 字段回到空', async () => {
    const h = await mount()
    await h.select(0)
    await h.number('当前帧时长（ms）', '60')
    await h.click('撤销帧编辑')
    await h.select(0)
    expect(h.field('当前帧时长（ms）').value).toBe('')
  })

  test('C04-G02-10 全局帧率 input 未 blur 时不 commit defaultFrameMs', async () => {
    const h = await mount()
    await h.number('全局帧率', '10')
    expect(h.latest()?.defaultFrameMs).toBe(40)
    expect(h.latest()?.durationMs).toBe(150)
  })
})

describe('C04-G03 插入与复制', () => {
  test('C04-G03-01 PNG 插入后 frameCount+1 且选中新帧', async () => {
    const h = await mount()
    await h.select(0)
    await h.chooseFiles('insert', [h.png('ins.png', 9)])
    await h.ready()
    expect(h.latest()?.frameCount).toBe(4)
    expect(h.counter()).toBe('2 / 4')
    expect(h.mainPixels()).toEqual(h.solid(9))
  })

  test('C04-G03-02 插入后总时长增加 default 一帧', async () => {
    const h = await mount()
    await h.select(0)
    await h.chooseFiles('insert', [h.png('ins.png', 9)])
    await h.ready()
    expect(h.latest()?.durationMs).toBe(190)
  })

  test('C04-G03-03 复制 override 帧保留 durationMs', async () => {
    const h = await mount()
    await h.select(1)
    await h.click('复制选中帧')
    await h.ready()
    expect(h.latest()?.frameCount).toBe(4)
    expect(h.latest()?.durationMs).toBe(220)
  })

  test('C04-G03-04 复制后选区仅新 id 且 counter 指向复制帧', async () => {
    const h = await mount()
    await h.select(1)
    await h.click('复制选中帧')
    await h.ready()
    expect(h.selectedIds()).toHaveLength(1)
    expect(h.selectedIds()[0]).not.toBe(frameId(C04_MAIN, 1))
    expect(h.counter()).toBe('3 / 4')
    expect(h.cardPixels()[2]).toEqual(h.cardPixels()[1])
  })

  test('C04-G03-05 多选复制插入到最大索引之后', async () => {
    const h = await mount()
    await h.select(0)
    await h.select(2, { shiftKey: true })
    await h.click('复制选中帧')
    await h.ready()
    expect(h.latest()?.frameCount).toBe(6)
    expect(h.counter()).toBe('4 / 6 · 已选 3')
  })

  test('C04-G03-06 末帧插入 PNG 追加到尾部', async () => {
    const h = await mount()
    await h.select(2)
    await h.chooseFiles('insert', [h.png('tail.png', 4)])
    await h.ready()
    expect(h.counter()).toBe('4 / 4')
    expect(h.ids()[3]).toBeDefined()
  })

  test('C04-G03-07 插入后撤销恢复 frameCount 与总时长', async () => {
    const h = await mount()
    await h.select(0)
    await h.chooseFiles('insert', [h.png('ins.png', 9)])
    await h.ready()
    await h.click('撤销帧编辑')
    expect(h.latest()).toMatchObject({ frameCount: 3, durationMs: 150 })
  })

  test('C04-G03-08 复制默认帧不携带 override', async () => {
    const h = await mount()
    await h.select(0)
    await h.click('复制选中帧')
    await h.ready()
    expect(h.latest()?.durationMs).toBe(190)
  })

  test('C04-G03-09 插入两文件一次增加两帧', async () => {
    const h = await mount()
    await h.select(1)
    await h.chooseFiles('insert', [h.png('a.png', 10), h.png('b.png', 11)])
    await h.ready()
    expect(h.latest()?.frameCount).toBe(5)
    expect(h.counter()).toBe('3 / 5')
  })

  test('C04-G03-10 插入后 stable 旧帧 id 不变', async () => {
    const h = await mount()
    const before = h.ids()
    await h.select(0)
    await h.chooseFiles('insert', [h.png('ins.png', 9)])
    await h.ready()
    expect(h.ids().slice(2)).toEqual(before.slice(1))
    expect(h.ids()[0]).toBe(frameId(C04_MAIN, 0))
  })
})

describe('C04-G04 删除与选区', () => {
  test('C04-G04-01 删单帧后选区落到同索引位置的下一帧 id', async () => {
    const h = await mount()
    const victim = h.ids()[1]
    await h.select(1)
    await h.click('删除选中帧')
    await h.ready()
    expect(h.ids()).not.toContain(victim)
    expect(h.latest()?.frameCount).toBe(2)
    expect(h.selectedIds()).toEqual([h.ids()[1]])
  })

  test('C04-G04-02 删 override 帧后总时长减少 70', async () => {
    const h = await mount()
    await h.select(1)
    await h.click('删除选中帧')
    expect(h.latest()?.durationMs).toBe(80)
  })

  test('C04-G04-03 多选删除后 counter 显示剩余帧数', async () => {
    const h = await mount()
    await h.select(0)
    await h.select(1, { shiftKey: true })
    await h.click('删除选中帧')
    expect(h.counter()).toBe('1 / 1')
  })

  test('C04-G04-04 全选时删除按钮 disabled', async () => {
    const h = await mount()
    await h.select(0)
    await h.select(2, { shiftKey: true })
    expect(h.button('删除选中帧').disabled).toBe(true)
  })

  test('C04-G04-05 删除首帧后 currentIndex 为 0', async () => {
    const h = await mount()
    await h.select(0)
    await h.click('删除选中帧')
    expect(h.currentIndex()).toBe(0)
    expect(h.mainPixels()).toEqual([...px(1)])
  })

  test('C04-G04-06 删除后撤销恢复像素顺序与 frameCount', async () => {
    const h = await mount()
    await h.select(1)
    await h.click('删除选中帧')
    await h.click('撤销帧编辑')
    expect(h.latest()?.frameCount).toBe(3)
    expect(h.ids()).toContain(frameId(C04_MAIN, 1))
    expect(h.mainPixels()).toEqual([...px(2)])
  })

  test('C04-G04-07 删除末帧后仍选中新的末帧', async () => {
    const h = await mount()
    await h.select(2)
    await h.click('删除选中帧')
    expect(h.currentIndex()).toBe(1)
    expect(h.counter()).toBe('2 / 2')
  })

  test('C04-G04-09 单选删除后 selectedIds 长度为 1', async () => {
    const h = await mount()
    await h.select(1)
    await h.click('删除选中帧')
    expect(h.selectedIds()).toHaveLength(1)
  })

  test('C04-G04-10 删除后 redo 栈清空', async () => {
    const h = await mount()
    await h.select(0)
    await h.number('当前帧时长（ms）', '50')
    await h.click('撤销帧编辑')
    await h.select(1)
    await h.click('删除选中帧')
    expect(h.button('重做帧编辑').disabled).toBe(true)
  })
})

describe('C04-G05 重排与选择归属', () => {
  test('C04-G05-01 拖拽来源不在选区时折叠为仅来源 id', async () => {
    const h = await mount()
    await h.select(1)
    await h.select(2, { shiftKey: true })
    const sourceId = h.ids()[0]!
    await h.dragFrame(0, 2)
    expect(h.selectedIds()).toEqual([sourceId])
    expect(h.currentIndex()).toBe(2)
  })

  test('C04-G05-02 拖拽来源在 multi 选区内保留全集', async () => {
    const h = await mount()
    await h.select(0)
    await h.select(2, { shiftKey: true })
    const selected = new Set(h.selectedIds())
    await h.dragFrame(0, 2)
    expect(new Set(h.selectedIds())).toEqual(selected)
  })

  test('C04-G05-03 重排后像素顺序随 cards 变化', async () => {
    const h = await mount()
    await h.dragFrame(0, 2)
    expect(h.cardPixels()[0]).toEqual([...px(1)])
    expect(h.cardPixels()[2]).toEqual([...px(0)])
  })

  test('C04-G05-04 重排 override 帧总时长不变', async () => {
    const h = await mount()
    await h.dragFrame(1, 0)
    expect(h.latest()?.durationMs).toBe(150)
  })

  test('C04-G05-05 重排后 anchor 与 current 对齐来源索引', async () => {
    const h = await mount()
    await h.select(1)
    await h.dragFrame(1, 0)
    expect(h.currentIndex()).toBe(0)
    expect(h.selectedIds()).toEqual([h.ids()[0]])
  })

  test('C04-G05-06 重排 undo 恢复 id 顺序', async () => {
    const h = await mount()
    const before = h.ids()
    await h.dragFrame(0, 2)
    await h.click('撤销帧编辑')
    expect(h.ids()).toEqual(before)
  })

  test('C04-G05-07 重排 redo 再次应用顺序', async () => {
    const h = await mount()
    await h.dragFrame(0, 1)
    const after = h.ids()
    await h.click('撤销帧编辑')
    await h.click('重做帧编辑')
    expect(h.ids()).toEqual(after)
  })

  test('C04-G05-08 同位 drop 不改变 ids', async () => {
    const h = await mount()
    const before = h.ids()
    await h.dragFrame(1, 1)
    expect(h.ids()).toEqual(before)
  })

  test('C04-G05-09 重排后选中 id 仍存在于 cards', async () => {
    const h = await mount()
    const picked = h.ids()[1]!
    await h.select(1)
    await h.dragFrame(1, 2)
    expect(h.ids()).toContain(picked)
    expect(h.selectedIds()).toContain(picked)
  })

  test('C04-G05-10 重排后 metadata frameCount 不变', async () => {
    const h = await mount()
    await h.dragFrame(2, 0)
    expect(h.latest()?.frameCount).toBe(3)
  })
})

describe('C04-G06 undo/redo 选择 id 归属', () => {
  test('C04-G06-01 撤销 PNG 插入后 frameCount 恢复且原 catalog id 仍在时间轴', async () => {
    const h = await mount()
    const anchor = h.ids()[0]!
    await h.select(0)
    await h.chooseFiles('insert', [h.png('ins.png', 9)])
    await h.ready()
    await h.click('撤销帧编辑')
    expect(h.latest()?.frameCount).toBe(3)
    expect(h.ids()).toContain(anchor)
  })

  test('C04-G06-02 重做 PNG 插入恢复像素与帧数且选中新 uuid', async () => {
    const h = await mount()
    await h.select(0)
    await h.chooseFiles('insert', [h.png('ins.png', 9)])
    await h.ready()
    await h.click('撤销帧编辑')
    await h.click('重做帧编辑')
    await h.ready()
    expect(h.latest()?.frameCount).toBe(4)
    expect(h.cardPixels().some((pixels) => pixels.join() === h.solid(9).join())).toBe(true)
    expect(h.button('重做帧编辑').disabled).toBe(true)
  })

  test('C04-G06-03 撤销删除恢复被删 id 且 active id 仍指向原存活帧', async () => {
    const h = await mount()
    const victim = h.ids()[1]!
    const survivor = h.ids()[2]!
    await h.select(1)
    await h.click('删除选中帧')
    await h.click('撤销帧编辑')
    expect(h.ids()).toContain(victim)
    expect(h.selectedIds()).toEqual([survivor])
    expect(h.currentIndex()).toBe(2)
  })

  test('C04-G06-04 撤销重排后 current 跟随原 active id', async () => {
    const h = await mount()
    const active = h.ids()[1]!
    await h.select(1)
    await h.dragFrame(1, 0)
    await h.click('撤销帧编辑')
    expect(h.selectedIds()).toEqual([active])
    expect(h.currentIndex()).toBe(1)
  })

  test('C04-G06-05 多选 anchor 在 undo 后仍指向存在 id', async () => {
    const h = await mount()
    await h.select(0)
    await h.select(2, { shiftKey: true })
    await h.click('复制选中帧')
    await h.ready()
    await h.click('撤销帧编辑')
    expect(h.ids()).toHaveLength(3)
    expect(h.selectedIds().every((id) => h.ids().includes(id))).toBe(true)
  })

  test('C04-G06-06 时长编辑 undo 不改变当前选中 id', async () => {
    const h = await mount()
    const id = h.ids()[1]!
    await h.select(1)
    await h.number('当前帧时长（ms）', '120')
    await h.click('撤销帧编辑')
    expect(h.selectedIds()).toEqual([id])
  })

  test('C04-G06-07 新编辑清空 redo 后 undo 仍可用', async () => {
    const h = await mount()
    await h.select(0)
    await h.number('当前帧时长（ms）', '50')
    await h.click('撤销帧编辑')
    await h.select(1)
    await h.number('当前帧时长（ms）', '80')
    expect(h.button('重做帧编辑').disabled).toBe(true)
    await h.click('撤销帧编辑')
    expect(h.latest()?.durationMs).toBe(150)
  })

  test('C04-G06-08 撤销末帧复制后 active id 仍指向来源 catalog 帧', async () => {
    const h = await mount()
    const source = h.ids()[2]!
    await h.select(2)
    await h.click('复制选中帧')
    await h.ready()
    await h.click('撤销帧编辑')
    expect(h.selectedIds()[0]).toBe(source)
    expect(h.latest()?.frameCount).toBe(3)
  })

  test('C04-G06-09 redo 链恢复最后一次结构编辑选区', async () => {
    const h = await mount()
    await h.select(1)
    await h.click('删除选中帧')
    const survivor = h.selectedIds()[0]!
    await h.click('撤销帧编辑')
    await h.click('重做帧编辑')
    expect(h.selectedIds()).toEqual([survivor])
  })

  test('C04-G06-10 撤销到 baseline 后 dirty 为 false', async () => {
    const h = await mount()
    await h.select(1)
    await h.number('当前帧时长（ms）', '99')
    await h.click('撤销帧编辑')
    expect(h.dirty.mock.lastCall).toEqual([false])
    expect(h.button('保存动画').disabled).toBe(true)
  })
})
