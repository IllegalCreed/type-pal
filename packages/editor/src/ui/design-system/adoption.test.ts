// @ts-nocheck -- Vitest-only Node audit; editor production bundle intentionally has no Node types.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { EDITOR_MODULES } from '../editor-navigation.js'
import { evaluateAllowlist } from '../../../scripts/design-system-audit.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(here, '../../..')

describe('design-system adoption gate', () => {
  test('binds every registered subpage to exactly one adoption record', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const registered = EDITOR_MODULES.flatMap((module) =>
      module.subpages.map((subpage) => `${module.id}/${subpage.id}`),
    ).sort()
    const adopted = matrix.pages.map((page) => page.registry).sort()

    expect(matrix.version).toBe(1)
    expect(adopted).toEqual(registered)
    expect(new Set(adopted).size).toBe(adopted.length)
    expect(matrix.pages).toHaveLength(25)
    for (const page of matrix.pages) {
      expect(page.status).toBe('adopted')
      expect(Object.keys(page.owners).sort()).toEqual([
        'action',
        'catalog',
        'field',
        'overlay',
        'scroll',
      ])
    }
  })

  test('passes the registry, DataMode return, allowlist, and source AST closure', () => {
    const output = execFileSync(process.execPath, ['scripts/audit-legacy-controls.mjs', '--gate'], {
      cwd: packageRoot,
      encoding: 'utf8',
    })
    expect(output).toContain('design-system gate passed: 84 files, 3 evidence-bound exceptions')
  })

  test('keeps legitimate native and dynamic geometry behind public boundaries', () => {
    const controls = readFileSync(join(here, 'controls.tsx'), 'utf8')
    const uploader = readFileSync(join(here, '../SpriteUploadWizard.tsx'), 'utf8')
    const allowlist = JSON.parse(readFileSync(join(here, 'design-system-allowlist.json'), 'utf8'))

    expect(controls).toContain('export const DsFileInput')
    expect(controls).toContain('export const DsFilePicker')
    expect(controls).toContain('export const DsPressable')
    expect(uploader).toMatch(
      /style=\{\{ width: frame\.width \* 2, height: frame\.height \* 2, imageRendering: 'pixelated' \}\}/,
    )
    expect(allowlist.entries).toHaveLength(3)
    for (const entry of allowlist.entries)
      expect(Object.keys(entry).sort()).toEqual([
        'file',
        'line',
        'owner',
        'reason',
        'removalCondition',
        'rule',
        'verification',
      ])
  })

  test('distinguishes unapproved violations from invalid or stale exceptions', () => {
    const violation = {
      file: 'Example.tsx',
      line: 7,
      rule: 'native-button',
      found: '<button>',
      recommendation: 'use DsButton',
    }
    const entry = {
      file: violation.file,
      line: violation.line,
      rule: violation.rule,
      owner: 'card:ED-DS-3',
      reason: 'synthetic contract proof',
      verification: 'identity matches the synthetic violation',
      removalCondition: 'remove with the synthetic violation',
    }

    expect(evaluateAllowlist({ version: 1, entries: [] }, [violation]).code).toBe(1)
    expect(evaluateAllowlist({ version: 1, entries: [entry] }, [violation]).code).toBe(0)
    expect(evaluateAllowlist({ version: 1, entries: [entry] }, []).code).toBe(2)
    expect(evaluateAllowlist({ version: 1, entries: [{ file: 'Example.tsx' }] }, []).code).toBe(2)
  })
})
