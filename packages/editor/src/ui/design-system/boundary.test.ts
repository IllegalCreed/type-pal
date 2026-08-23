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
    const recipes = readFileSync(join(here, 'recipes.css'), 'utf8')
    const editor = readFileSync(join(here, '..', 'editor.css'), 'utf8')

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
    expect(primitives).toMatch(/\.ds-dialog\s*\{[\s\S]*?margin:\s*auto;/)
    expect(primitives).toMatch(
      /\.ds-dialog\[open\],[\s\S]*?\.ds-drawer\[open\]\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto;[\s\S]*?overflow:\s*hidden;/,
    )
    expect(primitives).toMatch(
      /\.ds-overlay__body\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*auto;[\s\S]*?overscroll-behavior:\s*contain;/,
    )
    const canonicalScriptBody = editor.match(/\.canonical-script-modal-body\s*\{([^}]*)\}/)?.[1]
    expect(canonicalScriptBody).toBeDefined()
    expect(canonicalScriptBody).not.toMatch(/\boverflow\s*:/)
    expect(canonicalScriptBody).not.toMatch(/\boverscroll-behavior\s*:/)
    expect(formScope).toMatch(
      /input\[type="checkbox"\]:not\(\.ds-check-control\):not\(\[role="switch"\]\)\s*\{[\s\S]*?width:\s*18px;[\s\S]*?height:\s*18px;[\s\S]*?appearance:\s*none;/,
    )
    expect(formScope).toMatch(
      /label:not\(\.ds-check-label\)[\s\S]*?:has\([\s\S]*?input\[type="checkbox"\][\s\S]*?\)\s*\{[\s\S]*?border:\s*1px solid var\(--ds-border-control\);/,
    )
    expect(recipes).toMatch(
      /\.ds-workbench-section__content\s*\{[\s\S]*?display:\s*grid;[\s\S]*?align-content:\s*start;[\s\S]*?gap:\s*var\(--ds-space-5\);/,
    )
    expect(recipes).toMatch(
      /\.ds-workbench-section__content\s*>\s*\.ds-button\s*\{[\s\S]*?justify-self:\s*start;/,
    )
    expect(recipes).toMatch(
      /\.ds-property-grid\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*var\(--ds-space-4\);/,
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
    const businessCss = readFileSync(join(dirname(here), 'editor.css'), 'utf8')
    expect(primitives).toMatch(
      /\.ds-catalog-group-header__actions \.ds-tooltip__bubble\s*\{[\s\S]*?right:\s*0;[\s\S]*?left:\s*auto;[\s\S]*?transform:\s*none;/,
    )
    expect(businessCss).toMatch(
      /\.map-layer-panel__header > \.ds-tooltip \.ds-tooltip__bubble,[\s\S]*?\.map-layer-row \.layer-order \.ds-tooltip__bubble\s*\{[\s\S]*?right:\s*0;[\s\S]*?left:\s*auto;[\s\S]*?transform:\s*none;/,
    )
    expect(businessCss).toMatch(
      /\.map-layer-row > \.ds-tooltip \.ds-tooltip__bubble\s*\{[\s\S]*?right:\s*auto;[\s\S]*?left:\s*0;[\s\S]*?transform:\s*none;/,
    )
  })

  test('keeps layer header actions visually separated', () => {
    const businessCss = readFileSync(join(dirname(here), 'editor.css'), 'utf8')
    expect(businessCss).toMatch(/\.map-layer-panel__header\s*\{[\s\S]*?gap:\s*var\(--ds-space-3\);/)
  })

  test('keeps map and stamp on the shared tileset selector and scrolling tile grid', () => {
    const uiRoot = dirname(here)
    const businessCss = readFileSync(join(dirname(here), 'editor.css'), 'utf8')
    expect(businessCss).toMatch(
      /\.tile-palette-picker\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\);[\s\S]*?overflow:\s*hidden;/,
    )
    for (const file of ['MapMode.tsx', 'StampContentEditor.tsx']) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, file).toMatch(/<TilePalettePicker\b/)
      expect(source, file).not.toMatch(/<TilePickerGrid\b/)
    }
  })

  test('keeps object workspace cards content-sized inside the scrolling grid', () => {
    const recipes = readFileSync(join(here, 'recipes.css'), 'utf8')
    expect(recipes).toMatch(
      /\.ds-object-workspace__content\s*\{[\s\S]*?grid-auto-rows:\s*max-content;/,
    )
  })

  test('keeps canonical script headings content-sized above the scrolling body', () => {
    const businessCss = readFileSync(join(dirname(here), 'editor.css'), 'utf8')
    expect(businessCss).toMatch(
      /\.canonical-script-editor\s*\{[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\);/,
    )
    expect(businessCss).toMatch(/container:\s*canonical-script-editor \/ inline-size;/)
    expect(businessCss).toMatch(
      /@container canonical-script-editor \(max-width:\s*460px\)[\s\S]*?\.canonical-script-row-actions\s*\{[\s\S]*?position:\s*static;[\s\S]*?flex:\s*0 0 100%;/,
    )
  })

  test('owns conceptual help geometry and overlay behavior in the design system', () => {
    const primitives = readFileSync(join(here, 'primitives.css'), 'utf8')
    expect(primitives).toMatch(
      /\.ds-help-tip\s*>\s*button\s*\{[\s\S]*?width:\s*var\(--ds-hit-target-compact\);[\s\S]*?height:\s*var\(--ds-hit-target-compact\);[\s\S]*?min-width:\s*var\(--ds-hit-target-compact\);[\s\S]*?min-height:\s*var\(--ds-hit-target-compact\);[\s\S]*?border:\s*0;/,
    )
    expect(primitives).toMatch(
      /\.ds-help-tip\s*>\s*button::before\s*\{[\s\S]*?width:\s*18px;[\s\S]*?height:\s*18px;[\s\S]*?border-radius:\s*50%;/,
    )
    expect(primitives).toMatch(
      /\.ds-help-tip\s*>\s*button:focus-visible::before\s*\{[\s\S]*?outline:\s*2px solid var\(--ds-focus-ring\);/,
    )
    expect(primitives).toMatch(
      /\.ds-help-tooltip\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*var\(--ds-z-popover\);/,
    )
    expect(primitives).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.ds-help-tooltip,[\s\S]*?transition:\s*none;/,
    )
  })

  test('keeps stamp and tileset workspaces on shared object and map editing surfaces', () => {
    const uiRoot = dirname(here)
    const stampEditor = readFileSync(join(uiRoot, 'StampContentEditor.tsx'), 'utf8')
    const stampLibrary = readFileSync(join(uiRoot, 'StampLibraryTab.tsx'), 'utf8')
    const tileset = readFileSync(join(uiRoot, 'TilesetTab.tsx'), 'utf8')
    const mapMode = readFileSync(join(uiRoot, 'MapMode.tsx'), 'utf8')

    expect(stampEditor).not.toMatch(/<DsObjectHero\b/)
    expect(tileset).toMatch(/<DsObjectHero\b/)
    expect(stampLibrary).not.toMatch(/stamp-workspace-head|编辑组合内容|退出内容编辑/)
    expect(tileset).not.toMatch(/tileset-workspace-head/)
    for (const source of [stampEditor, mapMode]) {
      expect(source).toMatch(/<LayerStackControls\b/)
      expect(source).toMatch(/<IsometricEditorCanvas\b/)
      expect(source).toMatch(/<IsometricEditorSurface\b/)
      expect(source).toMatch(/<IsometricEditorToolbar\b/)
    }
    const sharedCanvas = readFileSync(join(uiRoot, 'IsometricEditorCanvas.tsx'), 'utf8')
    expect(sharedCanvas).toMatch(/drawIsometricMapBase/)
    expect(stampEditor).not.toMatch(/drawIsometricMapBase/)
    expect(stampEditor).not.toMatch(/latticePoints\.some|for \(const point of latticePoints\)/)
    expect(mapMode).not.toMatch(/>\s*◆\s*放置组合\s*</)
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
    expect(count, 'legacy native checkbox occurrences').toBe(9)
  })

  test('does not grow remaining raw form controls while shared primitives replace them', () => {
    const uiRoot = dirname(here)
    const sources = filesUnder(uiRoot).filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    const ceilings = {
      input: 120,
      textarea: 2,
      label: 76,
    } as const

    for (const [tag, ceiling] of Object.entries(ceilings)) {
      const pattern = new RegExp(`<${tag}\\b`, 'g')
      const count = sources.reduce(
        (total, path) => total + (readFileSync(path, 'utf8').match(pattern)?.length ?? 0),
        0,
      )
      expect(count, `raw <${tag}> occurrences`).toBe(ceiling)
    }
  })

  test('keeps native browser selection controls out of production editor code', () => {
    const srcRoot = dirname(dirname(here))
    const sources = filesUnder(srcRoot).filter(
      (path) =>
        (path.endsWith('.ts') || path.endsWith('.tsx')) &&
        !path.endsWith('.test.ts') &&
        !path.endsWith('.test.tsx'),
    )

    for (const path of sources) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toMatch(/<select\b/)
      expect(source, path).not.toMatch(/<datalist\b/)
      expect(source, path).not.toMatch(/<input\b[^>]*\blist\s*=/s)
      expect(source, path).not.toMatch(/createElement\(\s*['"](?:select|datalist)['"]/)
    }
  })

  test('keeps handcrafted choice popups limited to named visual or canvas interactions', () => {
    const srcRoot = dirname(dirname(here))
    const choicePattern =
      /role=["'](?:combobox|listbox|option)["']|aria-haspopup=["'](?:listbox|dialog)["']/
    const files = filesUnder(srcRoot).filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    const handcrafted = files
      .filter((path) => choicePattern.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(srcRoot.length + 1))
      .sort()

    expect(handcrafted).toEqual([
      'ui/IsometricEditorToolbar.tsx',
      'ui/ItemTab.tsx',
      'ui/MapMode.tsx',
    ])
  })

  test('keeps all general-purpose choice controls on the shared floating layer', () => {
    const index = readFileSync(join(here, 'index.ts'), 'utf8')
    const primitives = readFileSync(join(here, 'primitives.css'), 'utf8')
    const formScope = readFileSync(join(here, 'form-scope.css'), 'utf8')
    const multiSelect = readFileSync(join(here, 'multi-select.tsx'), 'utf8')
    expect(index).not.toContain("'./selection.js'")
    expect(index).toContain("'./multi-select.js'")
    expect(`${primitives}\n${formScope}`).not.toMatch(/\.ds-combobox\b/)
    expect(multiSelect).toContain('<DsFloatingLayer')
  })

  test('keeps the canonical script workbench on design-system controls', () => {
    const uiRoot = dirname(here)
    for (const file of ['SharedScriptTab.tsx', 'ScriptEditor.tsx', 'CommandForm.tsx']) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, file).not.toMatch(/<(?:button|input|select|textarea)\b/)
      expect(source, `${file} legacy control token`).not.toMatch(
        /className\s*=\s*["'][^"']*(?:\bin\b|\bbtn\b|\bmini\b|mini-txt|pv-btn)[^"']*["']/,
      )
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
      'ShopTab.tsx',
    ]

    for (const file of migratedWorkspaces) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, file).not.toMatch(/<(?:input|select|textarea|label)\b/)
    }
  })

  test('keeps every canonical catalog on the shared controls recipe', () => {
    const uiRoot = dirname(here)
    const catalogFiles = [
      'MapMode.tsx',
      'TilesetTab.tsx',
      'StampLibraryTab.tsx',
      'SharedScriptTab.tsx',
      'VarsTab.tsx',
      'EventLibTab.tsx',
      'ItemTab.tsx',
      'SkillTab.tsx',
      'EnemyTab.tsx',
      'EnemyTeamTab.tsx',
      'PoisonTab.tsx',
      'BattleFieldTab.tsx',
      'WorldSpriteLibrary.tsx',
      'BattleSpriteLibrary.tsx',
      'ImageTab.tsx',
      'MusicTab.tsx',
      'SoundTab.tsx',
      'CutsceneTab.tsx',
      'VarsTab.tsx',
    ]

    for (const file of catalogFiles) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, file).toMatch(/<DsCatalogControls\b/)
      expect(source, file).not.toMatch(/<DsCatalogFilter\b/)
      expect(source, file).not.toMatch(/<DsListHeader\b/)
      expect(source, file).not.toMatch(/className=["']ds-catalog-filter["']/)
      expect(source, file).not.toMatch(/\bmap-search\b/)
      expect(source, file).not.toMatch(/type=["']search["']/)

      const start = source.indexOf('<DsCatalogControls')
      const lineStart = source.lastIndexOf('\n', start) + 1
      const indent = source.slice(lineStart, start)
      const closing = source
        .slice(start)
        .match(new RegExp(`^${indent.replace(/ /g, '\\s')}\\/>`, 'm'))
      expect(closing, `${file} DsCatalogControls closing boundary`).not.toBeNull()
      const controlsSource = source.slice(start, start + (closing?.index ?? 0) + closing![0].length)
      expect(controlsSource, `${file} raw catalog control`).not.toMatch(/<(?:input|select)\b/)
    }

    const recipes = readFileSync(join(here, 'recipes.css'), 'utf8')
    expect(recipes).toMatch(
      /\.ds-catalog-controls__body\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?box-sizing:\s*border-box;[\s\S]*?padding:/,
    )
    expect(recipes).toMatch(
      /\.ds-catalog-controls__filters\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*9rem\),\s*1fr\)\);/,
    )

    const businessCss = readFileSync(join(uiRoot, 'editor.css'), 'utf8')
    expect(businessCss).not.toMatch(/\.map-search\b/)
    for (const selector of [
      'tileset-library-tools',
      'tileset-search-field',
      'tileset-search-icon',
      'tileset-category-filter',
      'stamp-library-tools',
      'stamp-search-field',
      'stamp-search-icon',
      'stamp-filter-grid',
      'battle-sprite-filter',
      'kind-filter',
      'kchip',
      'sprite-domain-switch',
      'music-library-tools',
      'music-search-field',
      'music-search-icon',
      'cutscene-search',
      'image-kind-tabs',
      'item-catalog-tools',
      'item-filter-chips',
    ])
      expect(businessCss, selector).not.toContain(`.${selector}`)
  })

  test('keeps every migrated inspector on the canonical shared tab contract', () => {
    const uiRoot = dirname(here)
    const migratedInspectors = [
      'ItemTab.tsx',
      'MapMode.tsx',
      'WorldSpriteLibrary.tsx',
      'BattleSpriteLibrary.tsx',
      'SkillTab.tsx',
      'EnemyTab.tsx',
      'PoisonTab.tsx',
      'ImageTab.tsx',
      'MusicTab.tsx',
      'SoundTab.tsx',
      'CutsceneTab.tsx',
      'ActorMode.tsx',
      'ShopTab.tsx',
      'TilesetTab.tsx',
      'StampLibraryTab.tsx',
      'App.tsx',
    ]

    for (const file of migratedInspectors) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, file).toMatch(/<DsInspectorTabs\b/)
      expect(source, `${file} private inspector key handler`).not.toMatch(
        /onInspectorTabKeyDown|inspectorTabRefs/,
      )
      expect(source, `${file} manual inspector tablist`).not.toMatch(
        /role=["']tablist["'][^>]*aria-label=["'][^"']*(?:检查器|右侧面板)/,
      )
      expect(source, `${file} manual inspector tab id`).not.toMatch(
        /id=(?:["'][^"']*inspector-tab-|\{`[^`]*inspector-tab-)/,
      )
      expect(source, `${file} count embedded in inspector tab label`).not.toMatch(
        /label:\s*`(?:引用|问题|诊断)\s+\$\{/,
      )
    }

    const allUiSource = filesUnder(uiRoot)
      .filter((path) => /\.(?:css|ts|tsx)$/.test(path))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    expect(allUiSource).not.toMatch(
      /\.(?:item-inspector-tabs|map-inspector-tabs|battle-inspector-tabs)\b/,
    )
  })

  test('keeps top-level object lifecycle actions out of Inspector content', () => {
    const uiRoot = dirname(here)
    const legacyInspectorActions: Record<string, readonly string[]> = {
      'WorldSpriteLibrary.tsx': [
        '<DsInspectorSection title="资源操作">',
        '删除用途定义（保留源资源）',
        '删除未使用源资源',
      ],
      'BattleSpriteLibrary.tsx': [
        '<DsInspectorSection title="资源操作">',
        '删除用途（保留源文件）',
        '删除未使用源文件',
      ],
      'ImageTab.tsx': ['image-resource-actions'],
      'CutsceneTab.tsx': ['cutscene-actions-section'],
      'TilesetTab.tsx': ['tileset-danger-action'],
      'SharedScriptTab.tsx': ['canonical-shared-danger-zone'],
      'App.tsx': ['删除此实体', '删除此落点'],
    }

    for (const [file, markers] of Object.entries(legacyInspectorActions)) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      for (const marker of markers)
        expect(source, `${file} Inspector lifecycle marker: ${marker}`).not.toContain(marker)
    }

    const expectedOwners: Record<string, RegExp> = {
      'WorldSpriteLibrary.tsx': /headerActions=\{/,
      'BattleSpriteLibrary.tsx': /<DsObjectHero[\s\S]*?actions=\{/,
      'ImageTab.tsx': /<DsCatalogControls[\s\S]*?overflowActions=\{/,
      'CutsceneTab.tsx': /<DsCatalogControls[\s\S]*?overflowActions=\{/,
      'TilesetTab.tsx': /<TilesetPreview[\s\S]*?actions=\{/,
      'SharedScriptTab.tsx': /<DsObjectHero[\s\S]*?deleteSelectedScript/,
      'App.tsx': /className="scene-outline-row-actions"[\s\S]*?deleteEntity/,
    }
    for (const [file, owner] of Object.entries(expectedOwners))
      expect(readFileSync(join(uiRoot, file), 'utf8'), `${file} lifecycle owner`).toMatch(owner)
  })

  test('keeps Inspector content on one shared section, property, choice, and action grammar', () => {
    const uiRoot = dirname(here)
    const explicitContentInspectors = [
      'ActorMode.tsx',
      'BattleSpriteLibrary.tsx',
      'ItemTab.tsx',
      'ShopTab.tsx',
      'SpriteActionEditor.tsx',
      'WorldSpriteLibrary.tsx',
    ]

    for (const file of explicitContentInspectors) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, `${file} shared section`).toMatch(/<DsInspectorSection\b/)
    }

    for (const file of [
      'ActorMode.tsx',
      'BattleSpriteLibrary.tsx',
      'ItemTab.tsx',
      'ShopTab.tsx',
      'WorldSpriteLibrary.tsx',
    ]) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, `${file} shared property rows`).toMatch(/<DsPropertyGrid\b/)
      expect(source, `${file} shared property rows`).toMatch(/<DsPropertyRow\b/)
    }

    const productionSource = explicitContentInspectors
      .map((file) => readFileSync(join(uiRoot, file), 'utf8'))
      .join('\n')
    expect(productionSource).not.toMatch(
      /\b(?:actor-side-nav|battle-usage-switch|battle-new-usage-menu|item-inspector-section|shop-inspector-card|sprite-action-switch)\b/,
    )

    const recipes = readFileSync(join(here, 'recipes.css'), 'utf8')
    for (const selector of [
      'ds-inspector-choice-list',
      'ds-inspector-option-row',
      'ds-inspector-actions',
      'ds-inspector-inline-empty',
      'ds-inspector-readonly',
    ])
      expect(recipes, selector).toContain(`.${selector}`)

    expect(recipes).toMatch(
      /\.ds-property-row__value > :is\(\.ds-input, \.in, \.ds-check-label\)\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;/,
    )

    const businessCss = readFileSync(join(uiRoot, 'editor.css'), 'utf8')
    expect(businessCss).toContain('Canonical Inspector content bridge')
    expect(businessCss).toMatch(
      /:is\(\.inspector, \.scene-entity-inspector\) \.section\s*\{[\s\S]*?padding:\s*var\(--ds-space-6\);/,
    )
    expect(businessCss).toMatch(
      /:is\(\.inspector, \.scene-entity-inspector\)[\s\S]*?:where\(\.field, \.music-meta-row\)\s*\{[\s\S]*?grid-template-columns:\s*60px minmax\(0, 1fr\);/,
    )
    expect(businessCss).toMatch(
      /:is\(\.inspector, \.scene-entity-inspector\) :is\(\.tool, \.btn, \.mini-txt\)\s*\{[\s\S]*?min-height:\s*var\(--ds-control-height-compact\);/,
    )

    const pageAnimationEditor = readFileSync(join(uiRoot, 'EntityPageAnimationEditor.tsx'), 'utf8')
    for (const component of [
      'DsPropertyGrid',
      'DsPropertyRow',
      'DsCheckbox',
      'DsNumberInput',
      'DsButton',
    ])
      expect(pageAnimationEditor, `EntityPageAnimationEditor shared ${component}`).toContain(
        `<${component}`,
      )
    expect(pageAnimationEditor).not.toMatch(/<(?:button|label|input)\b/)
  })

  test('keeps all audited Inspector reference faces on the canonical panel, list, and row contract', () => {
    const uiRoot = dirname(here)
    const referenceFaces = [
      'App.tsx',
      'MapMode.tsx',
      'TilesetTab.tsx',
      'StampLibraryTab.tsx',
      'ActorMode.tsx',
      'ItemTab.tsx',
      'SkillTab.tsx',
      'EnemyTab.tsx',
      'EnemyTeamTab.tsx',
      'PoisonTab.tsx',
      'BattleFieldTab.tsx',
      'WorldSpriteLibrary.tsx',
      'BattleSpriteLibrary.tsx',
      'ImageTab.tsx',
      'MusicTab.tsx',
      'SoundTab.tsx',
      'CutsceneTab.tsx',
    ]

    for (const file of referenceFaces) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, `${file} reference panel`).toMatch(/<DsReferencePanel\b/)
      expect(source, `${file} reference row`).toMatch(/<DsReferenceRow\b/)
      for (const row of source.match(/<DsReferenceRow\b[\s\S]*?\/>/g) ?? [])
        expect(row, `${file} disabled fake reference action`).not.toMatch(/\bdisabled\s*=/)
    }

    const productionSource = referenceFaces
      .map((file) => readFileSync(join(uiRoot, file), 'utf8'))
      .join('\n')
    expect(productionSource).not.toMatch(
      /\b(?:actor-reference-list|battle-data-reference-list|item-reference-card|tileset-removal-refs|stamp-usage-maps|sprite-reference-link|world-sprite-reference-link|music-reference-item|entry-reference-list|bf-reference-list|map-reference-list)\b/,
    )

    const businessCss = readFileSync(join(uiRoot, 'editor.css'), 'utf8')
    expect(businessCss).not.toMatch(
      /\.(?:actor-reference-list|item-reference-card|tileset-removal-refs|stamp-usage-maps|sprite-reference-link|world-sprite-reference-link|music-reference-item|entry-reference-list|bf-reference-list|map-reference-list)\b/,
    )

    const vars = readFileSync(join(uiRoot, 'VarsTab.tsx'), 'utf8')
    expect(vars).toMatch(/<DsCatalogRow\b/)
    expect(vars).toMatch(/<DsObjectHero\b/)
    expect(vars).toMatch(/<DsReferencePanel\b/)
    expect(vars).not.toMatch(/\b(?:var-head|ref-row|className="rw)\b/)

    const recipes = readFileSync(join(here, 'recipes.tsx'), 'utf8')
    expect(recipes).not.toMatch(/from ['"]\.\.\/core\//)
    expect(recipes).not.toMatch(/EditorState|EditorLocation|collector|Command/)
  })

  test('keeps all six diagnostic faces on the public diagnostic contract', () => {
    const uiRoot = dirname(here)
    const diagnosticFaces = [
      'ProjectWorkbenchTab.tsx',
      'CutsceneTab.tsx',
      'ImageTab.tsx',
      'SoundTab.tsx',
      'ItemTab.tsx',
      'StampPlacementInspector.tsx',
    ]

    for (const file of diagnosticFaces) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, `${file} diagnostic panel`).toMatch(/<DsDiagnosticPanel\b/)
      expect(source, `${file} diagnostic list`).toMatch(/<DsDiagnosticList\b/)
      expect(source, `${file} diagnostic row`).toMatch(/<DsDiagnosticRow\b/)
    }

    const recipes = readFileSync(join(here, 'recipes.tsx'), 'utf8')
    expect(recipes).not.toMatch(
      /ProjectIssue|MigrationDiagnostic|StampPlacementIssue|EditorLocation|AssetClosureIssue/,
    )
    expect(recipes.match(/function DsLocatorRowFrame\b/g)).toHaveLength(1)
    expect(recipes.match(/<DsLocatorRowFrame\b/g)).toHaveLength(2)
    expect(recipes).not.toMatch(/<DsReference(?:Panel|Row)[^>]*\bvariant=["']diagnostic["']/)
    const diagnosticRowSource = recipes.match(
      /export function DsDiagnosticRow\b[\s\S]*?export function DsDiagnosticList\b/,
    )?.[0]
    expect(diagnosticRowSource).not.toMatch(/role=["']alert["']/)

    const businessCss = readFileSync(join(uiRoot, 'editor.css'), 'utf8')
    expect(businessCss).not.toMatch(
      /\.(?:project-issue|cutscene-diagnostic|item-diagnostic|stamp-placement-problems)\b/,
    )
    const projectWorkbench = readFileSync(join(uiRoot, 'ProjectWorkbenchTab.tsx'), 'utf8')
    expect(projectWorkbench).toMatch(/<DsCatalogGroupList\b/)
    expect(projectWorkbench).toMatch(/<DsCatalogGroupHeader\b/)
    expect(projectWorkbench).not.toMatch(/className=["']project-issue/)
    expect(businessCss).toMatch(/\.cf-err\b/)

    for (const file of ['ImageTab.tsx', 'SoundTab.tsx']) {
      const source = readFileSync(join(uiRoot, file), 'utf8')
      expect(source, `${file} inline diagnostic`).toMatch(
        /id:\s*['"]references['"][\s\S]*?<DsReferencePanel\b[\s\S]*?<DsDiagnosticPanel\b/,
      )
      expect(source, `${file} no diagnostic tab`).not.toMatch(/id:\s*['"]diagnostics['"]/)
      expect(source, `${file} closure issue is not cf-err`).not.toMatch(
        /selectedIssues\.map\([\s\S]{0,200}<div className=["']cf-err["']/,
      )
    }
  })

  test('keeps shared reference pickers on canonical form controls', () => {
    const uiRoot = dirname(here)
    const pickerContracts = [
      ['SoundPicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['MusicPicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['BattleSpritePicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['BattleFieldPicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['ImageAssetPicker.tsx', /<DsSelect\b/, /<DsControlGroup\b/],
      ['NamedIdPicker.tsx', /<DsSelect\b/, /\bsearchable\b/],
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

  test('script editor summary styles do not leak into the shared add-command button label', () => {
    const css = readFileSync(join(dirname(here), 'editor.css'), 'utf8')
    const scriptTree = readFileSync(join(dirname(here), 'ScriptTree.tsx'), 'utf8')

    expect(css).not.toMatch(/\.canonical-script-editor-heading\s+span\s*\{/)
    expect(css).toMatch(/\.canonical-script-editor-summary\s*\{[^}]*color:\s*var\(--dim\)/s)
    expect(css).not.toMatch(/\.canonical-script-empty-add\s*\{[^}]*(?:border|background|color):/s)
    expect(scriptTree).not.toMatch(/className="tool scene-entry-add"/)
    expect(scriptTree).toMatch(/<DsButton[\s\S]*?className="scene-entry-add"/)
  })

  test('does not grow the legacy button-style families while they are being retired', () => {
    const uiRoot = dirname(here)
    const sources = filesUnder(uiRoot).filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    const ceilings = {
      tool: 48,
      btn: 23,
      mini: 14,
      'mini-txt': 23,
      'pv-btn': 5,
      'item-action-button': 0,
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

  test('keeps every ItemUseEffectEditor action on shared button controls', () => {
    const source = readFileSync(join(dirname(here), 'ItemUseEffectEditor.tsx'), 'utf8')

    expect(source).toMatch(/import\s*\{[^}]*DsButton[^}]*DsIconButton[^}]*\}/s)
    expect(source).toMatch(/<DsButton\b/)
    expect(source).toMatch(/<DsIconButton\b/)
    expect(source).not.toMatch(/<button\b/)
    expect(source).not.toMatch(/\bitem-action-button\b/)
    expect(source).not.toMatch(/className\s*=\s*["'][^"']*\bmini\b/)
  })

  test('keeps MapStampPalette chrome on shared controls without catalog-shell creep', () => {
    const source = readFileSync(join(dirname(here), 'MapStampPalette.tsx'), 'utf8')
    expect(source).toMatch(
      /import\s*\{[^}]*DsButton[^}]*DsSelect[^}]*DsTextInput[^}]*\}\s*from ['"]\.\/design-system\/index\.js['"]/s,
    )
    expect(source).not.toMatch(/<(?:input|select)\b/)
    expect(source).not.toMatch(/className\s*=\s*["'][^"']*(?:^|\s)(?:in|mini)(?:\s|$)/m)
    expect(source.match(/<button\b/g)).toHaveLength(1)
    expect(source).toMatch(/<button[\s\S]*?className=\{`map-stamp-card/)
    expect(source).not.toMatch(/<(?:DsCatalogControls|DsListHeader)\b/)
  })

  test('keeps the audited action families on shared controls', () => {
    const uiRoot = dirname(here)
    const contracts = [
      {
        file: 'ItemTab.tsx',
        required: [/<DsButton\b/, /<DsIconButton\b/],
        forbidden: [/\bitem-action-button\b/, /className\s*=\s*["'][^"']*\bmini\b/],
      },
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
        file: 'SceneScriptWorkspace.tsx',
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

  test('keeps the stamp content draft outside persistent map and session state', () => {
    const uiRoot = dirname(here)
    const surface = readFileSync(join(uiRoot, 'StampContentEditor.tsx'), 'utf8')
    const draft = readFileSync(join(uiRoot, '../core/stamp-draft.ts'), 'utf8')
    for (const [name, source] of [
      ['StampContentEditor.tsx', surface],
      ['stamp-draft.ts', draft],
    ] as const) {
      expect(source, name).not.toMatch(/\b(?:EditSession|MapMode|MapIndexV1|ProjectMap)\b/)
      expect(source, name).not.toMatch(/\bsession\.(?:dispatch|getState|ensureMapLoaded)\b/)
    }
    expect(surface).toMatch(/<IsometricEditorCanvas\b/)
    expect(surface).toMatch(/canonicalizeStampDraft/)
  })

  test('keeps map and stamp inspector properties on one compact row recipe', () => {
    const uiRoot = dirname(here)
    const mapMode = readFileSync(join(uiRoot, 'MapMode.tsx'), 'utf8')
    const stampEditor = readFileSync(join(uiRoot, 'StampContentEditor.tsx'), 'utf8')
    const recipesCss = readFileSync(join(uiRoot, 'design-system/recipes.css'), 'utf8')
    expect(mapMode).toMatch(/className="map-properties-section" data-ds-density="compact"/)
    expect(mapMode).toContain('<DsPropertyGrid>')
    expect(stampEditor).toContain('<DsPropertyGrid>')
    expect(stampEditor).not.toContain('stamp-template-facts')
    expect(recipesCss).toMatch(
      /\.ds-property-row\s*\{[\s\S]*?min-height:\s*var\(--ds-control-height-compact\);[\s\S]*?grid-template-columns:\s*60px minmax\(0, 1fr\);/,
    )
  })

  test('uses 项目 as the single product term for editor projects', () => {
    const srcRoot = dirname(dirname(here))
    const sources = filesUnder(srcRoot).filter(
      (path) =>
        (path.endsWith('.ts') || path.endsWith('.tsx')) &&
        !path.endsWith('.test.ts') &&
        !path.endsWith('.test.tsx'),
    )

    for (const path of sources) {
      expect(readFileSync(path, 'utf8'), path).not.toContain('工程')
    }
  })

  test('keeps editor authoring on the current command dialect without a lifecycle side editor', () => {
    const srcRoot = dirname(dirname(here))
    const production = filesUnder(srcRoot).filter(
      (path) =>
        (path.endsWith('.ts') || path.endsWith('.tsx')) &&
        !path.endsWith('.test.ts') &&
        !path.endsWith('.test.tsx'),
    )
    const source = production.map((path) => readFileSync(path, 'utf8')).join('\n')

    expect(
      production.some(
        (path) =>
          path.endsWith('/core/lifecycle-command-editor.ts') ||
          path.endsWith('/ui/LifecycleCommandPanel.tsx'),
      ),
    ).toBe(false)
    expect(source).not.toMatch(/\bLifecycleCommandPanel\b|lifecycle-command-editor/)
    expect(source).not.toMatch(/\bBaseAuthorCommand\b/)
  })
})
