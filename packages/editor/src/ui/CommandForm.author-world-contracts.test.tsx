// @vitest-environment jsdom
/**
 * TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 world 对（E9）。
 * 只补既有覆盖的真实缺口，全部走真实 caller（CanonicalScriptBodyEditor aggregate 弹窗）：
 * setActorAppearance 对话立绘（portrait）两臂——从真实 portrait 目录选择与 (无) 清空，
 * 均不得抹除 actor/spriteId/battleSprite（CommandForm.current-identity 只证了
 * spriteId/battleSprite 互不抹除，portrait 臂无任何 UI 级合同）。
 * E7/E8/E10/E11/E12 既有合同见回执 existing-proof 账，不在此复制。
 */
import { describe, test } from 'vitest'
import {
  authorCommandForm,
  choose,
} from './__tests__/author-command-contracts/author-command-form-fixture.js'

const portraitAssets = [
  ['author-portrait-calm', '沉静'],
  ['author-portrait-firm', '坚毅'],
] as const

describe('当前作者命令 world 表单合同（E9）', () => {
  test('选择真实 portrait 资产保留角色、世界精灵与战斗形象', async () => {
    const f = await authorCommandForm(
      {
        kind: 'setActorAppearance',
        actor: 'hero',
        spriteId: 'hero',
        battleSprite: 'starter-fighter',
      },
      { portraitAssets },
    )
    await choose('对话立绘', '坚毅 (author-portrait-firm)')
    await f.finish({
      kind: 'setActorAppearance',
      actor: 'hero',
      spriteId: 'hero',
      battleSprite: 'starter-fighter',
      portrait: 'author-portrait-firm',
    })
  })

  test('用 (无) 清空 portrait 保留其余三个身份字段', async () => {
    const f = await authorCommandForm(
      {
        kind: 'setActorAppearance',
        actor: 'hero',
        spriteId: 'hero',
        battleSprite: 'starter-fighter',
        portrait: 'author-portrait-calm',
      },
      { portraitAssets },
    )
    await choose('对话立绘', '(无)')
    await f.finish({
      kind: 'setActorAppearance',
      actor: 'hero',
      spriteId: 'hero',
      battleSprite: 'starter-fighter',
      portrait: undefined,
    })
  })
})
