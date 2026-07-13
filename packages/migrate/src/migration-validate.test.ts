import { describe, expect, test } from 'vitest'
import { findMissingDialogLocaleRefs } from './migration-validate.js'
import type { MigrationJson } from './pal-migration.js'

describe('迁移合并后 locale 引用门禁', () => {
  test('遍历嵌套脚本的 text/speaker 且去重', () => {
    const files = new Map<string, MigrationJson>([
      [
        'content/scripts/chunks/a.json',
        {
          scripts: {
            a: [
              { kind: 'dialog', line: { text: 'dlg.ok', speaker: 'spk.missing' } },
              // biome-ignore lint/suspicious/noThenProperty: Script command schema uses "then".
              { kind: 'branch', then: [{ kind: 'dialog', line: { text: 'dlg.missing' } }] },
            ],
          },
        },
      ],
    ])
    expect(findMissingDialogLocaleRefs(files, { 'dlg.ok': '已有' })).toEqual([
      'dlg.missing',
      'spk.missing',
    ])
  })
})
