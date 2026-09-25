import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkCurrentSection } from '../../../../scripts/docs/check.mjs'

const rule = { start: /^## 现行/m, end: /^## 历史/m }
const expected = { content: 20, save: 8 }

test('a bounded current section accepts content and SAVE while ignoring map and catalog axes', () => {
  assert.deepEqual(
    checkCurrentSection(
      [
        '## 现行',
        'contentVersion: 20',
        'SAVE 8',
        'mapVersion: 3',
        'catalog 9',
        '## 历史',
        'content19 SAVE7',
      ].join('\n'),
      rule,
      expected,
    ),
    [],
  )
})

test('a missing start marker is reported once and does not scan the rest of the document', () => {
  assert.deepEqual(checkCurrentSection('没有起点\n## 历史\ncontent19', rule, expected), [
    '现行合同起点不存在，请更新检查规则并核对文档分界',
  ])
})

test('repeated current-section version mismatches are reported once per distinct message', () => {
  assert.deepEqual(
    checkCurrentSection(
      [
        '## 现行',
        'content19',
        'content19',
        'SAVE7',
        'SAVE7',
        'mapVersion: 4',
        '## 历史',
        'contentVersion: 20',
      ].join('\n'),
      rule,
      expected,
    ),
    [
      'content19 与源码 content=20 不一致',
      'SAVE7 与源码 save=8 不一致',
      '现行合同缺少明确的 content 版本声明',
    ],
  )
})
