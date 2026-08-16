// @ts-nocheck -- Vitest-only Node filesystem audit; the editor bundle intentionally has no Node types.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))

function filesUnder(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

function splitTopLevelSelectors(selectorList: string): string[] {
  const selectors: string[] = []
  let start = 0
  let depth = 0
  for (let index = 0; index < selectorList.length; index += 1) {
    const character = selectorList[index]
    if (character === '(' || character === '[') depth += 1
    else if (character === ')' || character === ']') depth = Math.max(0, depth - 1)
    else if (character === ',' && depth === 0) {
      selectors.push(selectorList.slice(start, index).trim())
      start = index + 1
    }
  }
  selectors.push(selectorList.slice(start).trim())
  return selectors.filter(Boolean)
}

describe('editor design-system static boundary', () => {
  test('keeps the canonical form geometry and typography in one stylesheet', () => {
    const tokens = readFileSync(join(here, 'tokens.css'), 'utf8')
    const primitives = readFileSync(join(here, 'primitives.css'), 'utf8')
    const formScope = readFileSync(join(here, 'form-scope.css'), 'utf8')

    expect(tokens).toMatch(/--ds-control-height:\s*36px;/)
    expect(tokens).toMatch(/--ds-control-height-compact:\s*30px;/)
    expect(tokens).toMatch(/--ds-font-body:\s*[^;]*14px\s*\/\s*20px[^;]*;/)
    expect(tokens).toMatch(/--ds-font-label:\s*[^;]*12px\s*\/\s*18px[^;]*;/)
    expect(primitives).toMatch(
      /\.ds-input,[\s\S]*?min-height:\s*var\(--ds-control-height\);[\s\S]*?font:\s*var\(--ds-font-body\);/,
    )
    expect(primitives).toMatch(
      /\.ds-input--compact,[\s\S]*?min-height:\s*var\(--ds-control-height-compact\);/,
    )
    expect(primitives).toMatch(
      /\.ds-input\[type=['"]number['"]\]\s*\{[\s\S]*?appearance:\s*textfield;/,
    )
    expect(primitives).toMatch(
      /\.ds-input\[type=['"]number['"]\]::-webkit-inner-spin-button,[\s\S]*?\.ds-input\[type=['"]number['"]\]::-webkit-outer-spin-button\s*\{[\s\S]*?appearance:\s*none;/,
    )
    expect(primitives).toMatch(/\.ds-check-label,[\s\S]*?min-height:\s*var\(--ds-control-height\);/)
    expect(primitives).toMatch(
      /\.ds-check-label\s*\{[\s\S]*?border:\s*1px solid var\(--ds-border-control\);/,
    )
    expect(primitives).toMatch(
      /\.ds-check-label:has\(\.ds-check-control:checked\),[\s\S]*?background:\s*var\(--ds-action-primary-soft\);/,
    )
    expect(primitives).toMatch(
      /\.ds-check-control\s*\{[\s\S]*?width:\s*18px;[\s\S]*?height:\s*18px;[\s\S]*?appearance:\s*none;/,
    )
    expect(formScope).toMatch(
      /input\[type="checkbox"\]:not\(\.ds-check-control\):not\(\[role="switch"\]\)\s*\{[\s\S]*?width:\s*18px;[\s\S]*?height:\s*18px;[\s\S]*?appearance:\s*none;/,
    )
    expect(formScope).toMatch(
      /label:not\(\.ds-check-label\)[\s\S]*?:has\([\s\S]*?input\[type="checkbox"\][\s\S]*?\)\s*\{[\s\S]*?border:\s*1px solid var\(--ds-border-control\);/,
    )
  })

  test('keeps the scene shell checkboxes on the shared component', () => {
    const uiRoot = dirname(here)
    for (const file of ['App.tsx', 'MapMode.tsx', 'StampTemplateDialog.tsx']) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, file).toMatch(/<DsCheckbox\b/)
      expect(source, file).not.toMatch(/\btype\s*=\s*["']checkbox["']/)
    }
  })

  test('keeps trailing catalog action tooltips inside narrow scrolling lists', () => {
    const primitives = readFileSync(join(here, 'primitives.css'), 'utf8')
    expect(primitives).toMatch(
      /\.ds-catalog-group-header__actions \.ds-tooltip__bubble\s*\{[\s\S]*?right:\s*0;[\s\S]*?left:\s*auto;[\s\S]*?transform:\s*none;/,
    )
  })

  test('keeps object workspace cards content-sized inside the scrolling grid', () => {
    const recipes = readFileSync(join(here, 'recipes.css'), 'utf8')
    expect(recipes).toMatch(
      /\.ds-object-workspace__content\s*\{[\s\S]*?grid-auto-rows:\s*max-content;/,
    )
  })

  test('keeps every legacy checkbox bridge selector isolated from shared controls', () => {
    const formScope = readFileSync(join(here, 'form-scope.css'), 'utf8')
    const rules = [...formScope.matchAll(/([^{}]+)\{([^{}]*)\}/g)]

    for (const rule of rules) {
      for (const selector of splitTopLevelSelectors(rule[1] ?? '')) {
        if (!selector.includes('input[type="checkbox"]')) continue
        expect(selector, selector).not.toMatch(
          /input\[type="checkbox"\](?!:not\(\.ds-check-control\):not\(\[role="switch"\]\))/,
        )
        if (!selector.includes('label') || !selector.includes(':has(')) continue
        expect(selector, selector).toContain(':not(.ds-check-label)')
        expect(selector, selector).toContain(':not(.ds-radio-label)')
        expect(selector, selector).toContain(':not(.ds-switch-label)')
      }
    }
  })

  test('does not grow legacy native checkboxes while shared checkboxes replace them', () => {
    const uiRoot = dirname(here)
    const sources = filesUnder(uiRoot).filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    const pattern = /\btype\s*=\s*["']checkbox["']/g
    const count = sources.reduce(
      (total, path) => total + (readFileSync(path, 'utf8').match(pattern)?.length ?? 0),
      0,
    )
    expect(count, 'legacy native checkbox occurrences').toBe(23)
  })

  test('does not grow raw form controls while shared primitives replace them', () => {
    const uiRoot = dirname(here)
    const sources = filesUnder(uiRoot).filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    const ceilings = {
      input: 212,
      select: 128,
      textarea: 8,
      label: 211,
    } as const

    for (const [tag, ceiling] of Object.entries(ceilings)) {
      const pattern = new RegExp(`<${tag}\\b`, 'g')
      const count = sources.reduce(
        (total, path) => total + (readFileSync(path, 'utf8').match(pattern)?.length ?? 0),
        0,
      )
      expect(count, `raw <${tag}> occurrences`).toBeLessThanOrEqual(ceiling)
    }
  })

  test('keeps the migrated object workspaces free of raw form primitives', () => {
    const uiRoot = dirname(here)
    const migratedWorkspaces = [
      'SkillTab.tsx',
      'EnemyTab.tsx',
      'PoisonTab.tsx',
      'BattleFieldTab.tsx',
      'ActorMode.tsx',
    ]

    for (const file of migratedWorkspaces) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, file).not.toMatch(/<(?:input|select|textarea|label)\b/)
    }
  })

  test('keeps catalog searches on the focus-safe shared filter shell', () => {
    const uiRoot = dirname(here)
    const catalogFiles = [
      'MapMode.tsx',
      'SkillTab.tsx',
      'EnemyTab.tsx',
      'PoisonTab.tsx',
      'BattleFieldTab.tsx',
    ]

    for (const file of catalogFiles) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, file).toMatch(/<DsCatalogFilter\b/)
      expect(source, file).not.toMatch(/className=["']ds-catalog-filter["']/)
      expect(source, file).not.toMatch(/\bmap-search\b/)
    }

    const recipes = readFileSync(join(here, 'recipes.css'), 'utf8')
    expect(recipes).toMatch(
      /\.ds-catalog-filter\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?box-sizing:\s*border-box;[\s\S]*?padding:/,
    )

    const businessCss = readFileSync(join(uiRoot, 'editor.css'), 'utf8')
    expect(businessCss).not.toMatch(/\.map-search\b/)
  })

  test('keeps shared reference pickers on canonical form controls', () => {
    const uiRoot = dirname(here)
    const pickerContracts = [
      ['SoundPicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['MusicPicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['BattleSpritePicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['BattleFieldPicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['ImageAssetPicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['NamedIdPicker.tsx', /<DsTextInput\b/],
      ['FireEffectPreview.tsx', /<DsSelect\b/, /size="compact"/],
    ] as const

    for (const [file, ...requirements] of pickerContracts) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      for (const requirement of requirements) expect(source, file).toMatch(requirement)
      expect(source, file).not.toMatch(
        /className\s*=\s*["'][^"']*(?:\bin\b|linked-value-open|btn\s+mp-play)/,
      )
    }
  })

  test('keeps standalone sequence markers on the shared sequence index', () => {
    const uiRoot = dirname(here)
    const contracts = [
      ['ShopTab.tsx', 'shop-stock-order'],
      ['ProjectWorkbenchTab.tsx', 'project-party-index|project-flow-number'],
      ['StampLibraryTab.tsx', 'stamp-slot-order'],
      ['CasualtyEditor.tsx', 'casualty-branch-index'],
      ['BattleSpriteLibrary.tsx', 'battle-action-stage-number'],
      ['PoisonTab.tsx', 'poison-tick-index'],
    ] as const

    for (const [file, legacyPattern] of contracts) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, file).toMatch(/<DsSequenceIndex\b/)
      expect(source, file).not.toMatch(new RegExp(legacyPattern))
    }

    const css = readFileSync(join(uiRoot, 'editor.css'), 'utf8')
    expect(css).not.toMatch(
      /\.(?:shop-stock-order|project-party-index|project-flow-number|stamp-slot-order|casualty-branch-index|battle-action-stage-number)\b/,
    )

    const recipesCss = readFileSync(join(uiRoot, 'design-system/recipes.css'), 'utf8')
    const sequenceRule = recipesCss.match(/\.ds-sequence-index\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(sequenceRule).toContain('min-width: var(--ds-control-height-compact)')
    expect(sequenceRule).toContain('height: var(--ds-control-height-compact)')
    expect(sequenceRule).toContain('border-radius: 999px')
    expect(sequenceRule).toContain('font: var(--ds-font-body)')
  })

  test('business styles may lay out shared controls but cannot reskin them', () => {
    const css = readFileSync(join(dirname(here), 'editor.css'), 'utf8')
    const protectedSelectors = [
      '.ds-input',
      '.ds-select',
      '.ds-textarea',
      '.ds-check-control',
      '.ds-check-label',
      '.ds-field__label',
      '.ds-button',
      '.ds-icon-button',
      '.ds-tag',
      '.ds-toolbar-button',
    ]
    const forbiddenProperties = new Set([
      'height',
      'min-height',
      'max-height',
      'padding',
      'padding-block',
      'padding-inline',
      'border',
      'border-width',
      'border-color',
      'border-radius',
      'background',
      'background-color',
      'color',
      'font',
      'font-size',
      'font-family',
      'font-weight',
      'line-height',
      'font-variant',
      'font-variant-numeric',
      'font-feature-settings',
      'letter-spacing',
      'text-transform',
      'text-decoration',
      'accent-color',
      'appearance',
      'box-shadow',
      'outline',
      'outline-offset',
      'opacity',
      'cursor',
    ])

    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const declarations = (match[2] ?? '')
        .split(';')
        .map((declaration) => declaration.trim())
        .filter(Boolean)

      for (const selector of (match[1] ?? '').split(',')) {
        const selectorWithoutExclusions = selector.replace(/:not\([^)]*\)/g, '')
        const targetsSharedControl = protectedSelectors.some((token) =>
          selectorWithoutExclusions.includes(token),
        )
        if (!targetsSharedControl) continue

        for (const declaration of declarations) {
          const property = declaration.split(':', 1)[0]?.trim()
          expect(
            forbiddenProperties.has(property),
            `${selector.trim()} must not set ${property}`,
          ).toBe(false)
        }
      }
    }
  })

  test('does not grow the legacy button-style families while they are being retired', () => {
    const uiRoot = dirname(here)
    const sources = filesUnder(uiRoot).filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    const ceilings = {
      tool: 65,
      btn: 44,
      mini: 36,
      'mini-txt': 39,
      'pv-btn': 16,
      'item-action-button': 13,
      'mini-icon': 3,
      'media-zoom-controls': 0,
    } as const

    for (const [token, ceiling] of Object.entries(ceilings)) {
      let count = 0
      const tokenPattern = new RegExp(`(?<![\\w-])${token.replace('-', '\\-')}(?![\\w-])`, 'g')
      for (const path of sources) {
        const source = readFileSync(path, 'utf8')
        const classNames =
          source.match(/className\s*=\s*(?:"[^"]*"|'[^']*'|\{`[\s\S]*?`\}|\{"[^"]*"\})/g) ?? []
        for (const className of classNames) count += className.match(tokenPattern)?.length ?? 0
      }
      expect(count, `${token} legacy class occurrences`).toBeLessThanOrEqual(ceiling)
    }
  })

  test('keeps the audited action families on shared controls', () => {
    const uiRoot = dirname(here)
    const contracts = [
      {
        file: 'EnemyTab.tsx',
        required: [/<DsButton\b/, /<DsIconButton\b/],
        forbidden: [/\bpv-btn\b/, /\bcmd-ops\b/],
      },
      {
        file: 'PoisonTab.tsx',
        required: [/<DsButton\b/, /<DsIconButton\b/],
        forbidden: [/className\s*=\s*["'][^"']*\b(?:tool|mini)\b/],
      },
      {
        file: 'EnemyAnimPreview.tsx',
        required: [/<DsButton\b/, /<DsTag\b/],
        forbidden: [/\bpv-btn\b/, /\bmini-txt\b/],
      },
      {
        file: 'PreviewCanvas.tsx',
        required: [/<DsToolbar\b/, /<DsSelect\b/, /<DsButton\b/],
        forbidden: [/\bpv-btn\b/, /\bpv-speed\b/, /\bmini-txt\b/],
      },
      {
        file: 'SpriteFrameWorkbench.tsx',
        required: [/<DsButton\b/, /<DsIconButton\b/],
        forbidden: [/className\s*=\s*["'][^"']*\b(?:tool|mini)\b/],
      },
      {
        file: 'ImageTab.tsx',
        required: [/<DsZoomToolbar\b/],
        forbidden: [/media-zoom-controls/],
      },
      {
        file: 'FrameAnimationEditor.tsx',
        required: [/<DsZoomToolbar\b/],
        forbidden: [/media-zoom-controls/],
      },
      {
        file: 'CanonicalSceneScriptWorkspaceV5.tsx',
        required: [/<DsTabs\b/],
        forbidden: [/\bmini-txt\b/],
      },
    ]

    for (const contract of contracts) {
      const source = readFileSync(join(uiRoot, contract.file), 'utf8')
      for (const pattern of contract.required) expect(source, contract.file).toMatch(pattern)
      for (const pattern of contract.forbidden) expect(source, contract.file).not.toMatch(pattern)
    }
  })

  test('keeps all 15 legacy aliases explicit and resolved to semantic tokens', () => {
    const css = readFileSync(join(here, 'tokens.css'), 'utf8')
    const aliases = [
      '--bg',
      '--panel',
      '--panel2',
      '--panel3',
      '--line',
      '--fg',
      '--dim',
      '--faint',
      '--accent',
      '--acc',
      '--warn',
      '--err',
      '--ok',
      '--mono',
      '--sans',
    ]
    for (const alias of aliases) {
      const match = css.match(
        new RegExp(`${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*var\\((--ds-[^)]+)\\)`),
      )
      expect(match, `${alias} must map directly to a semantic token`).not.toBeNull()
      expect(css).toMatch(
        new RegExp(`${match?.[1]?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*[^;]+;`),
      )
    }
  })

  test('does not import editor business core, content or reforge', () => {
    const sources = filesUnder(here).filter(
      (path) => /\.(ts|tsx)$/.test(path) && !path.endsWith('.test.ts'),
    )
    for (const path of sources) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toMatch(
        /from ['"](?:@type-pal\/(?:content|reforge)|\.\.\/\.\.\/core)/,
      )
    }
  })

  test('centralizes literal colors in tokens.css', () => {
    for (const path of filesUnder(here).filter((candidate) => candidate.endsWith('.css'))) {
      if (path.endsWith('tokens.css')) continue
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    }
  })

  test('keeps list-header action markup inside the shared component', () => {
    const uiRoot = dirname(here)
    const sources = filesUnder(uiRoot).filter(
      (path) =>
        path.endsWith('.tsx') &&
        !path.endsWith('.test.tsx') &&
        !path.endsWith('design-system/controls.tsx'),
    )
    for (const path of sources) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toMatch(/ds-list-header__(?:action|menu)/)
      expect(source, path).not.toMatch(/catalog-action-menu/)
    }
  })

  test('keeps object-header status pills on the shared tag primitive', () => {
    const uiRoot = dirname(here)
    const sources = filesUnder(uiRoot).filter(
      (path) =>
        /\.(?:css|tsx)$/.test(path) &&
        !path.endsWith('.test.tsx') &&
        !path.includes('/design-system/'),
    )
    for (const path of sources) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toContain('sprite-resource-frame-count')
    }
  })
})
