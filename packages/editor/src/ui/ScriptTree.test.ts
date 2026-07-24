import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { ScriptTree, scriptTreeText } from './ScriptTree.js'

describe('scriptTreeText', () => {
  test('脚本树摘要只显示富文本可见正文', () => {
    expect(
      scriptTreeText('dlg.yellow', {
        'dlg.yellow': '<yellow>好吧．．．</yellow>',
      }),
    ).toBe('好吧．．．')
  })

  test('缺翻译仍明确显示 text id', () => {
    expect(scriptTreeText('dlg.missing', {})).toBe('⟨dlg.missing⟩')
  })
})

describe('ScriptTree stable references', () => {
  test('指令摘要统一显示名称与稳定 id', () => {
    const names = new Map([
      ['item:293', '手卷'],
      ['skill:377', '飞龙探云手'],
      ['actor:li-xiaoyao', '李逍遥'],
      ['sprite:li-training', '李逍遥练武'],
    ])
    const references: ScriptReferenceCatalog = {
      choices: () => [],
      has: (kind, id) => names.has(`${kind}:${id}`),
      label: (kind, id) => {
        const name = names.get(`${kind}:${id}`)
        return name ? `${name}（${id}）` : `⚠ 未知引用（${id}）`
      },
    }
    const html = renderToStaticMarkup(
      createElement(ScriptTree, {
        stages: [
          {
            body: [
              { kind: 'giveItem', itemId: '293' },
              { kind: 'learnSkill', role: 0, skill: '377' },
              {
                kind: 'setActorSprite',
                actor: 'li-xiaoyao',
                sprite: 'li-training',
              },
            ],
          },
        ],
        locale: {},
        references,
      }),
    )

    expect(html).toContain('获得物品 手卷（293）')
    expect(html).toContain('原版角色槽位 0 习得 飞龙探云手（377）')
    expect(html).toContain('李逍遥（li-xiaoyao） 换精灵')
    expect(html).toContain('李逍遥练武（li-training）')
  })
})
