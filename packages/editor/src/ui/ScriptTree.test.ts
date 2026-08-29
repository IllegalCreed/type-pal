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
      ['poison:7', '赤毒'],
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
              {
                kind: 'applyActorCondition',
                actor: 'li-xiaoyao',
                condition: { kind: 'poison', poisonId: 7 },
              },
              {
                kind: 'applyActorCondition',
                actor: 'li-xiaoyao',
                condition: { kind: 'status', status: 'protect', turns: 7 },
              },
              {
                kind: 'clearActorCondition',
                actor: 'li-xiaoyao',
                condition: { kind: 'poisonResistance' },
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
    expect(html).toContain('令 李逍遥（li-xiaoyao） 中毒：赤毒（7）')
    expect(html).toContain('令 李逍遥（li-xiaoyao） 获得护体 7 回合')
    expect(html).toContain('受到的物理与法术伤害减半')
    expect(html).toContain('清除 李逍遥（li-xiaoyao） 的全部临时毒抗')
  })

  test('实体状态摘要使用中文语义并明确保留的非常规原值', () => {
    const references: ScriptReferenceCatalog = {
      choices: () => [],
      has: () => false,
      label: (_kind, id) => id,
    }
    const html = renderToStaticMarkup(
      createElement(ScriptTree, {
        stages: [
          {
            body: [
              { kind: 'setEntityState', entity: 'e1', state: 0 },
              { kind: 'setMultiEntityState', entities: ['e2', 'e3'], state: 3 },
            ],
          },
        ],
        locale: {},
        references,
      }),
    )

    expect(html).toContain('e1 → 隐藏')
    expect(html).toContain('批量设置 2 个实体 → 显示，阻挡通行（原值 3）')
    expect(html).not.toContain('状态 → 0')
  })
})
