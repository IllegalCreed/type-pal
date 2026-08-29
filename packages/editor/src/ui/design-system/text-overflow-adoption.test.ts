// @ts-nocheck -- Vitest-only CSS/route audit; production editor intentionally has no Node types.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  deriveTextOverflowAdoptionSeed,
  deriveTextOverflowCssCensus,
  validateTextOverflowAdoption,
} from '../../../scripts/design-system-audit.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')

function registry() {
  return JSON.parse(readFileSync(join(here, 'text-overflow-adoption.json'), 'utf8'))
}

describe('text-overflow adoption gate', () => {
  test('keeps the CSSOM selector-arm inventory and route-live registry bidirectional', () => {
    const document = registry()
    const census = deriveTextOverflowCssCensus()
    expect(validateTextOverflowAdoption(document)).toEqual([])
    expect(document.entries).toHaveLength(census.length)
    expect(new Set(document.entries.map((entry) => `${entry.source}|${entry.condition}|${entry.selectorText}`)).size)
      .toBe(document.entries.length)
    expect(new Set(census.map((entry) => entry.condition))).toEqual(new Set(['default']))
    expect(
      deriveTextOverflowAdoptionSeed().map(
        (entry) => `${entry.source}|${entry.condition}|${entry.selectorText}`,
      ),
    ).toEqual(
      census.map((entry) => `${entry.source}|${entry.condition}|${entry.selectorText}`),
    )
  }, 30_000)

  test('fails closed for an unregistered arm, stale registry, declaration drift, and duplicate registry', () => {
    const document = registry()
    const removed = { ...document, entries: document.entries.slice(1) }
    expect(validateTextOverflowAdoption(removed).join('\n')).toContain(
      'unregistered text-overflow CSS selector',
    )

    const stale = structuredClone(document)
    stale.entries.push({ ...stale.entries[0], selectorText: '.stale-text-overflow-owner' })
    expect(validateTextOverflowAdoption(stale).join('\n')).toContain('stale text-overflow registry')

    const drift = structuredClone(document)
    drift.entries[0].declarations = ['white-space:nowrap']
    expect(validateTextOverflowAdoption(drift).join('\n')).toContain('declaration signature is stale')

    const duplicate = structuredClone(document)
    duplicate.entries.push(structuredClone(duplicate.entries[0]))
    expect(validateTextOverflowAdoption(duplicate).join('\n')).toContain(
      'duplicate text-overflow registry',
    )
  }, 30_000)

  test('detects duplicate CSS arms instead of silently folding them into a Map', () => {
    const document = registry()
    const primitives = readFileSync(join(here, 'primitives.css'), 'utf8')
    const problems = validateTextOverflowAdoption(document, {
      'design-system/primitives.css': `${primitives}\n.ds-overflow-text { text-overflow: ellipsis; white-space: nowrap; }`,
    })
    expect(problems.join('\n')).toContain('duplicate text-overflow CSS selector')
  })

  test('rejects ellipsis on command labels and fake informational disclosure', () => {
    const document = registry()
    const ellipsis = document.entries.find((entry) =>
      entry.declarations.includes('text-overflow:ellipsis'),
    )
    const command = structuredClone(document)
    const commandEntry = command.entries.find(
      (entry) => entry.source === ellipsis.source && entry.selectorText === ellipsis.selectorText,
    )
    commandEntry.policy = 'command-label'
    commandEntry.contentKind = 'command'
    commandEntry.reveal = 'none'
    expect(validateTextOverflowAdoption(command).join('\n')).toContain(
      'command-label must not use text-overflow:ellipsis',
    )

    const informational = structuredClone(document)
    const overflow = informational.entries.find((entry) => entry.policy === 'informational-truncate')
    overflow.reveal = 'aria-label'
    expect(validateTextOverflowAdoption(informational).join('\n')).toContain('reveal is invalid')
  }, 30_000)

  test('rejects a route-unreachable producer and policies that require CSS removal', () => {
    const unreachable = registry()
    unreachable.entries[0].producer = {
      source: 'Unreachable.tsx',
      component: 'Unreachable',
      callsite: 'class:unreachable',
    }
    expect(validateTextOverflowAdoption(unreachable).join('\n')).toContain(
      'producer is not reachable from a registered editor route',
    )

    for (const policy of ['wrap-required', 'stale-css']) {
      const invalid = registry()
      invalid.entries[0].policy = policy
      expect(validateTextOverflowAdoption(invalid).join('\n')).toContain(
        `${policy} must be fixed in CSS instead of registered`,
      )
    }
  }, 30_000)

  test('accepts compact tokens and structural nowrap without disclosure', () => {
    const document = registry()
    expect(document.entries.some((entry) => entry.policy === 'compact-token')).toBe(true)
    expect(document.entries.some((entry) => entry.policy === 'structural-nowrap')).toBe(true)
    expect(
      document.entries
        .filter((entry) => ['compact-token', 'structural-nowrap'].includes(entry.policy))
        .every((entry) => entry.reveal === 'none'),
    ).toBe(true)
  })

  test('keeps selection summaries disclosure out of per-row observers', () => {
    const document = registry()
    const selectionEntries = document.entries.filter(
      (entry) => entry.policy === 'selection-summary',
    )
    expect(selectionEntries.length).toBeGreaterThan(0)
    expect(selectionEntries.every((entry) => ['lazy', 'selected-detail'].includes(entry.reveal))).toBe(
      true,
    )

    const productionOverflowOwners = [
      'WorldSpriteLibrary.tsx',
      'BattleSpriteLibrary.tsx',
      'ActorMode.tsx',
      'SpriteActionEditor.tsx',
    ].reduce(
      (count, source) =>
        count + (readFileSync(join(uiRoot, source), 'utf8').match(/<DsOverflowText\b/g) ?? []).length,
      0,
    )
    expect(productionOverflowOwners).toBe(8)
    for (const source of ['recipes.tsx', 'add-picker.tsx', 'multi-select.tsx', 'virtual-list.tsx'])
      expect(readFileSync(join(here, source), 'utf8'), source).not.toContain('<DsOverflowText')
    expect(
      (readFileSync(join(here, 'virtual-list.tsx'), 'utf8').match(/new ResizeObserver\b/g) ?? []),
    ).toHaveLength(1)
  })

  test('keeps Design Lab and reforge debug CSS outside the production registry', () => {
    const sources = new Set(registry().entries.map((entry) => entry.source))
    expect([...sources].some((source) => source.includes('design-lab'))).toBe(false)
    expect([...sources].some((source) => source.includes('reforge'))).toBe(false)
  })

  test('keeps RF-06 as the long-text disclosure fixture without displacing RF-14 forms', () => {
    const designLab = readFileSync(join(here, '../../design-lab/DesignLab.tsx'), 'utf8')
    const designLabCss = readFileSync(join(here, '../../design-lab/design-lab.css'), 'utf8')
    const fixtureValues = [
      ['chinese20', 20],
      ['ascii40', 40],
      ['id64', 64],
      ['path120', 120],
    ]

    expect(designLab).toMatch(/case 'RF-06':\s*return <OverflowTextFixture \/>/)
    expect(designLab).toMatch(/case 'RF-14':\s*return <FormMatrix \/>/)
    expect(designLab.match(/<DsOverflowText\b/g)?.length).toBeGreaterThanOrEqual(6)
    for (const [name, length] of fixtureValues) {
      const value = designLab.match(new RegExp(`${name}:\\s*'([^']+)'`))?.[1]
      expect(Array.from(value ?? ''), name).toHaveLength(length)
    }
    expect(designLab).toContain("wide ? 'lab-overflow-value--wide' : 'lab-overflow-value--narrow'")
    expect(designLabCss).toContain('.lab-overflow-value--narrow')
    expect(designLabCss).toContain('.lab-overflow-value--wide')
  })
})
