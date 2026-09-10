// @ts-nocheck -- Node-only audit checks; no Node types are added to the product bundle.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import {
  validateAdoption,
  validateWorkspaceConnectors,
} from '../../../scripts/design-system-audit.mjs'

const here = dirname(fileURLToPath(import.meta.url))

test('same source override object stays live through valid → invalid → restored content', () => {
  const original = readFileSync(join(here, '../ConnectedEditorPages.tsx'), 'utf8')
  const overrides = { 'ConnectedEditorPages.tsx': original }
  expect(validateWorkspaceConnectors(overrides)).toEqual([])
  overrides['ConnectedEditorPages.tsx'] = original.replace('<ProjectWorkbenchTab', '<ActorMode')
  expect(overrides['ConnectedEditorPages.tsx']).not.toBe(original)
  expect(validateWorkspaceConnectors(overrides)).toContain(
    'ConnectedEditorPages.tsx@ConnectedProjectWorkbench must directly render exactly one canonical project dispatcher ProjectWorkbenchTab.tsx@ProjectWorkbenchTab; received 0',
  )
  overrides['ConnectedEditorPages.tsx'] = original
  expect(validateWorkspaceConnectors(overrides)).toEqual([])
})

test('CSS-only edits invalidate scroll evidence without changing source or registry', () => {
  const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
  const original = readFileSync(join(here, '../editor.css'), 'utf8')
  const overrides = { 'editor.css': original }
  expect(validateAdoption(matrix, overrides)).toEqual([])
  overrides['editor.css'] = `${original}\n.shop-stock-list { overflow-y: auto; }`
  expect(validateAdoption(matrix, overrides)).toContain(
    'item/shop renders unregistered live custom scroll owner ShopTab.tsx@ShopTab#shop-stock-list@1',
  )
  overrides['editor.css'] = original
  expect(validateAdoption(matrix, overrides)).toEqual([])
}, 15_000)
