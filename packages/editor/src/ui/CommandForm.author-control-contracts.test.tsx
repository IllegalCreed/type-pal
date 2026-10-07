// @vitest-environment jsdom
/**
 * TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 control 对（E4/E6）。
 * 只补既有覆盖的真实缺口，全部走真实 caller（CanonicalScriptBodyEditor aggregate 弹窗）：
 * - E4 openShop 合法空店铺工程的数值降级臂（旧合同只证了有表 Sel 臂，
 *   CommandForm.current-data:45）；
 * - E6 playSound/playMusic 空资产目录下选「没有可用…」占位项时叶子清空守卫零提交
 *   （picker 层 UNSET→undefined 已证于 SoundPicker/MusicPicker.glm-leaf-wave，
 *   glm-large-wave 只列了选项未点选）。
 * E2/E3/E5 既有合同见回执 existing-proof 账，不在此复制。
 */
import { describe, expect, test } from 'vitest'
import {
  authorCommandForm,
  choose,
  input,
  row,
} from './__tests__/author-command-contracts/author-command-form-fixture.js'

describe('当前作者命令 control 表单合同（E4/E6）', () => {
  test('E4 合法空店铺工程：openShop 降级为数值身份输入，改模式不污染店铺号', async () => {
    const f = await authorCommandForm({ kind: 'openShop', shop: 3, mode: 'buy' }, { shops: [] })
    expect(row('店铺').querySelector('[role="combobox"]'), '空表必须降级数值输入').toBeNull()
    expect(row('店铺').querySelector('input')?.value).toBe('3')
    await choose('模式', '卖(当铺收购)')
    await input('店铺', 7)
    await f.finish({ kind: 'openShop', shop: 7, mode: 'sell' })
  })

  test('E6 空音效目录选「项目没有可用音效」占位项不产生任何草稿提交', async () => {
    const f = await authorCommandForm({ kind: 'playSound', asset: 'sound-bell' })
    await choose('音效', '项目没有可用音效')
    expect(row('音效').textContent).toContain('sound-bell')
    f.pending()
  })

  test('E6 空音乐目录选「项目没有可用音乐」占位项不产生任何草稿提交', async () => {
    const f = await authorCommandForm({ kind: 'playMusic', asset: 'music-theme' })
    await choose('音乐', '项目没有可用音乐')
    expect(row('音乐').textContent).toContain('music-theme')
    f.pending()
  })
})
