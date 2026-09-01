// @ts-nocheck -- static production gate imports the CLI audit module intentionally.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { validateActionGroupAdoption } from '../../../scripts/action-group-audit.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')
const manifest = JSON.parse(readFileSync(join(here, 'action-group-adoption.json'), 'utf8'))
const source = (name: string): string => readFileSync(join(uiRoot, name), 'utf8')
const cloneManifest = () => structuredClone(manifest)

function unwrapActionGroup(value: string, opening: string): string {
  const start = value.indexOf(opening)
  const close = value.indexOf('</DsActionGroup>', start)
  if (start < 0 || close < 0) throw new Error(`missing ActionGroup fixture: ${opening}`)
  return `${value.slice(0, start)}${opening.replace('<DsActionGroup', '<span')}${value.slice(
    start + opening.length,
    close,
  )}</span>${value.slice(close + '</DsActionGroup>'.length)}`
}

describe('action group adoption gate', () => {
  test('closes thirteen adopted groups and classifies every raw move-button surface', () => {
    expect(validateActionGroupAdoption(manifest)).toEqual([])
    expect(manifest.baseline).toEqual({
      groups: 13,
      moveButtons: 44,
      adoptedMoveButtons: 22,
      rawMoveButtons: 22,
      candidateSurfaces: 11,
    })
    expect(manifest.adopted).toHaveLength(13)
    expect(manifest.candidates).toHaveLength(11)
    expect(
      Object.fromEntries(
        ['equivalent-owner', 'deferred', 'N/A'].map((disposition) => [
          disposition,
          manifest.candidates.filter(
            (entry: { disposition: string }) => entry.disposition === disposition,
          ).length,
        ]),
      ),
    ).toEqual({ 'equivalent-owner': 1, deferred: 10, 'N/A': 0 })
    expect(
      manifest.candidates.find(
        (entry: { id: string }) => entry.id === 'project/startup-inventory/actions',
      )?.disposition,
    ).toBe('equivalent-owner')
  })

  test('rejects registry drift and incomplete candidate evidence', () => {
    const stale = cloneManifest()
    stale.adopted[0].fingerprint = 'className="missing-actions"'
    expect(validateActionGroupAdoption(stale).join('\n')).toMatch(/must bind exactly one/)

    const duplicate = cloneManifest()
    duplicate.adopted[1].id = duplicate.adopted[0].id
    expect(validateActionGroupAdoption(duplicate).join('\n')).toMatch(/duplicate action-group id/)

    const noRemovalCondition = cloneManifest()
    delete noRemovalCondition.candidates.find(
      (entry: { disposition: string }) => entry.disposition === 'deferred',
    ).removalCondition
    expect(validateActionGroupAdoption(noRemovalCondition).join('\n')).toMatch(
      /needs a removalCondition|must use exactly/,
    )

    const noEquivalentEvidence = cloneManifest()
    delete noEquivalentEvidence.candidates.find(
      (entry: { disposition: string }) => entry.disposition === 'equivalent-owner',
    ).equivalentEvidence
    expect(validateActionGroupAdoption(noEquivalentEvidence).join('\n')).toMatch(
      /needs structured evidence|must use exactly/,
    )
  })

  test('accepts registered zero-move groups and rejects invalid or drifting counts', () => {
    const zeroMoveGroups = manifest.adopted.filter(
      (entry: { moveButtonCount: number }) => entry.moveButtonCount === 0,
    )
    expect(zeroMoveGroups.map((entry: { id: string }) => entry.id)).toEqual([
      'map/layer-stack/header-actions',
      'map/layer-stack/state-actions',
    ])

    for (const invalid of [-1, 0.5]) {
      const mutated = cloneManifest()
      mutated.adopted.find(
        (entry: { id: string }) => entry.id === 'map/layer-stack/header-actions',
      ).moveButtonCount = invalid
      expect(validateActionGroupAdoption(mutated).join('\n')).toMatch(
        /moveButtonCount must be a non-negative integer/,
      )
    }

    const drift = cloneManifest()
    drift.adopted.find(
      (entry: { id: string }) => entry.id === 'map/layer-stack/header-actions',
    ).moveButtonCount = 1
    expect(validateActionGroupAdoption(drift).join('\n')).toMatch(
      /map\/layer-stack\/header-actions owns 0 move buttons, expected 1/,
    )

    const missing = cloneManifest()
    missing.adopted = missing.adopted.filter(
      (entry: { id: string }) => entry.id !== 'map/layer-stack/header-actions',
    )
    expect(validateActionGroupAdoption(missing).join('\n')).toMatch(
      /unregistered action-group LayerStackControls\.tsx:className="map-layer-header-actions":1/,
    )

    const candidateZero = cloneManifest()
    candidateZero.candidates[0].moveButtonCount = 0
    expect(validateActionGroupAdoption(candidateZero).join('\n')).toMatch(
      /candidate .* must own exactly two move buttons/,
    )
  })

  test.each([
    {
      name: 'dynamic density',
      file: 'ActorMode.tsx',
      mutate: (value: string) =>
        value.replace(
          '<DsActionGroup density="compact" className="actor-initial-magic-actions">',
          '<DsActionGroup density={actionDensity} className="actor-initial-magic-actions">',
        ),
      error: /density must be static/,
    },
    {
      name: 'spread props',
      file: 'EnemyTab.tsx',
      mutate: (value: string) =>
        value.replace(
          '<DsActionGroup density="compact" className="rule-row-actions">',
          '<DsActionGroup {...groupProps} density="compact" className="rule-row-actions">',
        ),
      error: /spread props evade/,
    },
    {
      name: 'non-action child',
      file: 'EnemyTeamTab.tsx',
      mutate: (value: string) =>
        value.replace(
          '<DsActionGroup density="compact" className="enemy-team-slot-actions">',
          '<DsActionGroup density="compact" className="enemy-team-slot-actions"><DsCheckbox label="坏例" />',
        ),
      error: /non-action child/,
    },
    {
      name: 'mixed presentation mode',
      file: 'CommandForm.tsx',
      mutate: (value: string) =>
        value.replace(
          '<DsIconButton\n                              variant="danger"',
          '<DsButton>删除</DsButton><DsIconButton\n                              variant="danger"',
        ),
      error: /one action presentation mode/,
    },
    {
      name: 'direct child size',
      file: 'ShopTab.tsx',
      mutate: (value: string) =>
        value.replace(
          /(label=\{`下架 \$\{itemName\}`\}\s+icon="delete")/,
          '$1\n                                size="compact"',
        ),
      error: /size must be owned/,
    },
    {
      name: 'import alias',
      file: 'CommandForm.tsx',
      mutate: (value: string) => value.replace('DsActionGroup,', 'DsActionGroup as Group,'),
      error: /import aliases evade/,
    },
    {
      name: 'variable alias',
      file: 'ShopTab.tsx',
      mutate: (value: string) => `${value}\nconst HiddenGroup = DsActionGroup\n`,
      error: /variable aliases evade/,
    },
    {
      name: 'namespace tag',
      file: 'ActorMode.tsx',
      mutate: (value: string) =>
        value
          .replace(
            '<DsActionGroup density="compact" className="actor-initial-magic-actions">',
            '<DS.DsActionGroup density="compact" className="actor-initial-magic-actions">',
          )
          .replace('</DsActionGroup>', '</DS.DsActionGroup>'),
      error: /namespace action-group tags evade/,
    },
  ])('fails closed for $name', ({ file, mutate, error }) => {
    expect(
      validateActionGroupAdoption(manifest, { [file]: mutate(source(file)) }).join('\n'),
    ).toMatch(error)
  })

  test('rejects an extra single raw move button instead of counting only complete pairs', () => {
    const file = 'EnemyTab.tsx'
    const mutated = `${source(file)}\nconst ActionGroupSingleMoveFixture = () => (\n  <DsReorderMoveButton itemKey="fixture" direction="backward" />\n)\n`
    const problems = validateActionGroupAdoption(manifest, { [file]: mutated }).join('\n')
    expect(problems).toMatch(/production move buttons 45|raw move buttons 23/)
    expect(problems).toMatch(/raw move button must map to exactly one candidate owner/)
  })

  test.each([
    {
      id: 'poison/ticks/actions',
      file: 'PoisonTab.tsx',
      opening: '<DsActionGroup density="compact" className="ef-ops">',
      fallback: '<span className="ef-ops">',
    },
    {
      id: 'project/entry-points/actions',
      file: 'ProjectWorkbenchTab.tsx',
      opening: '<DsActionGroup density="compact" className="project-entry-row-actions">',
      fallback: '<span className="project-entry-row-actions">',
    },
  ])('rejects $id wrapper regression', ({ id, file, opening, fallback }) => {
    const mutated = source(file).replace(opening, fallback).replace('</DsActionGroup>', '</span>')
    const problems = validateActionGroupAdoption(manifest, { [file]: mutated }).join('\n')
    expect(problems).toMatch(new RegExp(`${id.replaceAll('/', '\\/')} must bind exactly one`))
    expect(problems).toMatch(
      /production action groups 12|adopted move buttons 20|raw move buttons 24/,
    )
    expect(problems).toMatch(/raw move button must map to exactly one candidate owner/)
  })

  test.each([
    {
      id: 'map/layer-stack/header-actions',
      opening: '<DsActionGroup density="compact" className="map-layer-header-actions">',
    },
    {
      id: 'map/layer-stack/state-actions',
      opening: '<DsActionGroup density="compact" className="layer-state-actions">',
    },
    {
      id: 'map/layer-stack/actions',
      opening: '<DsActionGroup density="compact" className="layer-order">',
    },
  ])('rejects $id wrapper regression', ({ id, opening }) => {
    const mutated = unwrapActionGroup(source('LayerStackControls.tsx'), opening)
    expect(
      validateActionGroupAdoption(manifest, { 'LayerStackControls.tsx': mutated }).join('\n'),
    ).toMatch(new RegExp(`${id.replaceAll('/', '\\/')} must bind exactly one`))
  })

  test('rejects moving one adopted move button between groups while the global total stays fixed', () => {
    const actorFile = 'ActorMode.tsx'
    const enemyTeamFile = 'EnemyTeamTab.tsx'
    const actor = source(actorFile).replace(
      /\s*<DsReorderMoveButton\s+itemKey=\{reorderKey\}\s+direction="forward"\s+label=\{`下移 \$\{label\}`\}\s*\/>/,
      '',
    )
    const enemyTeam = source(enemyTeamFile)
    const backward = enemyTeam.match(
      /<DsReorderMoveButton\s+itemKey=\{slotEntries\[index\]!\.key\}\s+direction="backward"\s+label=\{`槽 \$\{index \+ 1\} 上移`\}\s*\/>/,
    )?.[0]
    expect(backward).toBeTruthy()
    const enemyTeamWithExtra = enemyTeam.replace(backward!, `${backward}\n${backward}`)
    const problems = validateActionGroupAdoption(manifest, {
      [actorFile]: actor,
      [enemyTeamFile]: enemyTeamWithExtra,
    }).join('\n')
    expect(problems).toMatch(/actor\/initial-magic\/actions owns 1 move buttons, expected 2/)
    expect(problems).toMatch(/enemy-team\/fixed-slots\/actions owns 3 move buttons, expected 2/)
  })

  test('binds the equivalent inventory owner to its default parent, geometry and responsive evidence', () => {
    const projectFile = 'ProjectWorkbenchTab.tsx'
    const cssFile = 'editor.css'
    const wrongDensity = source(projectFile).replace(
      '<DsRepeatRow density="default" className="project-inventory-row">',
      '<DsRepeatRow density="compact" className="project-inventory-row">',
    )
    expect(
      validateActionGroupAdoption(manifest, { [projectFile]: wrongDensity }).join('\n'),
    ).toMatch(/parent evidence is stale/)

    const wrongGap = source(cssFile).replace(
      /(\.project-inventory-actions\s*\{[^}]*?)gap:\s*var\(--ds-space-2\);/s,
      '$1gap: var(--ds-space-1);',
    )
    expect(validateActionGroupAdoption(manifest, { [cssFile]: wrongGap }).join('\n')).toMatch(
      /requires gap:var\(--ds-space-2\)/,
    )
  })

  test('rejects candidate pairs that lose or gain one move button', () => {
    const file = 'SpriteActionEditor.tsx'
    const mutated = source(file).replace(
      '<DsReorderMoveButton itemKey={reorderKey} direction="forward" />',
      '<DsIconButton label="错误替代" icon="delete" />',
    )
    expect(validateActionGroupAdoption(manifest, { [file]: mutated }).join('\n')).toMatch(
      /candidate asset\/sprite-action-steps\/actions owns 1 move buttons/,
    )
  })
})
