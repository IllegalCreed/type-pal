// @vitest-environment jsdom
import type { AuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  checkbox,
  choose,
  click,
  commandForm,
  input,
  row,
} from './__tests__/command-form-current-fixture.js'

type Dialog = Extract<AuthorCommand, { kind: 'dialog' }>
const narration = (): Dialog => ({
  kind: 'dialog',
  cue: { identity: { kind: 'narration' }, rows: [{ text: '一行' }, { text: '另一行', speed: 8 }] },
})
describe('Current author dialogue aggregate fields', () => {
  test('narration becomes an unbound identity without leaking runtime cue fields', async () => {
    const cmd = narration(),
      f = await commandForm(cmd)
    await choose('身份', '未绑定称谓 / 旧内容')
    await input('说话人', '路人')
    await f.finish({ ...cmd, cue: { ...cmd.cue, identity: { kind: 'unbound', speaker: '路人' } } })
  })
  test('clearing the final unbound name without portrait returns to narration', async () => {
    const cmd: Dialog = {
      ...narration(),
      cue: { ...narration().cue, identity: { kind: 'unbound', speaker: '路人' } },
    }
    const f = await commandForm(cmd)
    await input('说话人', '')
    await f.finish(narration())
  })
  test('switching narration to a project actor uses an actual actor ID', async () => {
    const cmd = narration(),
      f = await commandForm(cmd)
    await choose('身份', '预制人物')
    await f.finish({ ...cmd, cue: { ...cmd.cue, identity: { kind: 'actor', actor: 'hero' } } })
  })
  test('editing a current actor name uses a literal override and keeps row data', async () => {
    const cmd: Dialog = {
      ...narration(),
      cue: { ...narration().cue, identity: { kind: 'actor', actor: 'hero' } },
    }
    const f = await commandForm(cmd)
    await input('显示称谓', '少侠')
    await choose('人物', '队员2 (ally-2)')
    await f.finish({
      ...cmd,
      cue: { ...cmd.cue, identity: { kind: 'actor', actor: 'ally-2', speakerOverride: '少侠' } },
    })
  })
  test('dialog position and cursor changes preserve the actual rows', async () => {
    const cmd = narration(),
      f = await commandForm(cmd)
    await choose('位置', '上方')
    await choose('光标', '样式 2')
    await f.finish({ ...cmd, cue: { ...cmd.cue, slot: 'top', cursorFrame: 2 } })
  })
  test('returning position and cursor to defaults omits only their optional overrides', async () => {
    const cmd: Dialog = { ...narration(), cue: { ...narration().cue, slot: 'top', cursorFrame: 2 } }
    const f = await commandForm(cmd)
    await choose('位置', '下方')
    await choose('光标', '默认')
    await f.finish({ ...cmd, cue: { ...cmd.cue, slot: undefined, cursorFrame: undefined } })
  })
  test('automatic advance permits zero and a configured delay before one aggregate commit', async () => {
    const cmd = narration(),
      f = await commandForm(cmd)
    await checkbox('自动推进')
    expect(row('自动推进').querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('0')
    await input('自动推进', 120)
    await f.finish({ ...cmd, cue: { ...cmd.cue, autoAdvance: 120 } })
  })
  test('disabling automatic advance removes its delay', async () => {
    const cmd: Dialog = { ...narration(), cue: { ...narration().cue, autoAdvance: 120 } }
    const f = await commandForm(cmd)
    await checkbox('自动推进')
    await f.finish({ ...cmd, cue: { ...cmd.cue, autoAdvance: undefined } })
  })
  test('adding a row and cancelling discards the actual aggregate draft', async () => {
    const f = await commandForm(narration())
    await click('添加一行')
    expect(row('第 3 行').querySelector('textarea')?.value).toBe('(新一行)')
    await input('第 3 行', '临时台词')
    await click('关闭')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    f.pending()
  })
})
