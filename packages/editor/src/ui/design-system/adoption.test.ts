// @ts-nocheck -- Vitest-only Node audit; editor production bundle intentionally has no Node types.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  deriveFieldAdoptionTruth,
  deriveOverlayAdoptionTruth,
  evaluateAllowlist,
  findEmbeddedNavigationGlyphActions,
  isEmbeddedNavigationGlyphAction,
  validateAdoption,
  validateWorkspaceConnectors,
} from '../../../scripts/design-system-audit.mjs'
import { EDITOR_MODULES } from '../editor-navigation.js'

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(here, '../../..')

describe('design-system adoption gate', () => {
  test('binds every registered subpage to exactly one adoption record', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const registered = EDITOR_MODULES.flatMap((module) =>
      module.subpages.map((subpage) => `${module.id}/${subpage.id}`),
    ).sort()
    const adopted = matrix.pages.map((page) => page.registry).sort()

    expect(matrix.version).toBe(4)
    expect(matrix.catalogScrollOwners).toHaveLength(27)
    expect(matrix.overlayExceptions).toHaveLength(7)
    expect(matrix.workspaceLegacyExceptions).toHaveLength(0)
    expect(adopted).toEqual(registered)
    expect(new Set(adopted).size).toBe(adopted.length)
    expect(matrix.pages).toHaveLength(27)
    const scrollRecords = matrix.catalogScrollOwners.flatMap((page) => page.scroll)
    expect(scrollRecords).toHaveLength(102)
    expect(
      scrollRecords.filter((record) => record.owner === 'DsObjectWorkspaceContent'),
    ).toHaveLength(20)
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

  test('closes every raw object workspace debt behind one real owner per source', () => {
    for (const source of [
      'ProjectWorkbenchTab.tsx',
      'BattleSpriteLibrary.tsx',
      'VarsTab.tsx',
      'SpriteResourceViewer.tsx',
      'EnemyTeamTab.tsx',
      'BattleFieldTab.tsx',
    ]) {
      const text = readFileSync(join(here, '..', source), 'utf8')
      expect(text, source).not.toMatch(/['"`]ds-object-workspace(?:__content)?\b/)
      expect(text.match(/<DsObjectWorkspace\b/g), source).toHaveLength(1)
    }
  })

  test('derives every field and overlay owner from the live route graph', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const fieldTruth = deriveFieldAdoptionTruth()
    const overlayTruth = deriveOverlayAdoptionTruth()
    for (const page of matrix.pages) {
      const expected = fieldTruth[page.registry]
      const expectedOverlay = overlayTruth[page.registry]
      expect(expected, page.registry).toBeDefined()
      expect(expectedOverlay, `${page.registry} overlay truth`).toBeDefined()
      expect(page.components, `${page.registry} component closure`).toEqual(
        [...new Set([...expected.components, ...expectedOverlay.components])].sort(),
      )
      const owners = page.owners.field.startsWith('N/A:')
        ? []
        : page.owners.field
            .split('+')
            .map((owner) => owner.trim())
            .filter(Boolean)
            .sort()
      expect(owners, `${page.registry} field owners`).toEqual(expected.owners)
      expect(page.ownerEvidence.field, `${page.registry} routed evidence`).toEqual(
        expected.evidence,
      )
      expect(page.ownerEvidence.overlay, `${page.registry} overlay routed evidence`).toEqual(
        expectedOverlay.evidence,
      )
      expect(page.owners.overlay, `${page.registry} overlay owners`).toBe(
        expectedOverlay.owners.length
          ? expectedOverlay.owners.join(' + ')
          : 'N/A: no route-live anchored popup or modal',
      )
    }
  }, 15_000)

  test('fails loud for private popups, forged owners, and stale overlay exceptions', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    expect(validateAdoption(matrix)).toEqual([])

    const toolbarSource = readFileSync(join(here, '../IsometricEditorToolbar.tsx'), 'utf8')
    const privateListbox = toolbarSource
      .replace('<DsFloatingLayer', '<div')
      .replace('</DsFloatingLayer>', '</div>')
    expect(privateListbox).not.toBe(toolbarSource)
    expect(validateAdoption(matrix, { 'IsometricEditorToolbar.tsx': privateListbox })).toContain(
      'IsometricEditorToolbar.tsx@ToolOptionTray renders private listbox without DsFloatingLayer or an evidence-bound exception',
    )

    const forgedOwner = structuredClone(matrix)
    forgedOwner.pages.find((page) => page.registry === 'map/tileset').owners.overlay =
      'DsDialog + DsFloatingLayer'
    expect(validateAdoption(forgedOwner)).toContain(
      'map/tileset overlay owner must be DsFloatingLayer; received DsDialog + DsFloatingLayer',
    )

    const staleException = structuredClone(matrix)
    staleException.overlayExceptions.find(
      (entry) => entry.id === 'map-canvas-context-menu',
    ).callsite = 'class:missing-canvas-menu'
    expect(validateAdoption(staleException)).toContain(
      'stale overlay exception map-canvas-context-menu: MapMode.tsx@MapMode#class:missing-canvas-menu@1',
    )
  }, 30_000)

  test('requires App connectors to render the canonical workspace dispatchers', () => {
    expect(validateWorkspaceConnectors()).toEqual([])
    const connectorSource = readFileSync(join(here, '../ConnectedEditorPages.tsx'), 'utf8')
    const appSource = readFileSync(join(here, '../App.tsx'), 'utf8')
    const brokenProjectConnector = connectorSource.replace('<ProjectWorkbenchTab', '<ActorMode')
    expect(brokenProjectConnector).not.toBe(connectorSource)
    expect(
      validateWorkspaceConnectors({
        'ConnectedEditorPages.tsx': brokenProjectConnector,
      }),
    ).toContain(
      'ConnectedEditorPages.tsx@ConnectedProjectWorkbench must directly render exactly one canonical project dispatcher ProjectWorkbenchTab.tsx@ProjectWorkbenchTab; received 0',
    )

    const shadowedProjectDispatcher = connectorSource.replace(
      'export function ConnectedProjectWorkbench(props: ConnectedProjectWorkbenchProps) {',
      'export function ConnectedProjectWorkbench(props: ConnectedProjectWorkbenchProps) {\n  const ProjectWorkbenchTab = () => <div />',
    )
    expect(
      validateWorkspaceConnectors({
        'ConnectedEditorPages.tsx': shadowedProjectDispatcher,
      }),
    ).toContain(
      'ConnectedEditorPages.tsx@ConnectedProjectWorkbench must directly render exactly one canonical project dispatcher ProjectWorkbenchTab.tsx@ProjectWorkbenchTab; received 0',
    )

    const shadowedAppDispatcher = appSource.replace(
      '}) {\n  const { session, project } = props',
      '}) {\n  const ConnectedDataMode = () => <div />\n  const { session, project } = props',
    )
    expect(shadowedAppDispatcher).not.toBe(appSource)
    expect(validateWorkspaceConnectors({ 'App.tsx': shadowedAppDispatcher })).toContain(
      'App.tsx has no canonical map/actor/project/data route chain',
    )

    const forgedActiveSubpage = appSource.replace(
      'const activeSubpage = editorSubpage(location)',
      "const activeSubpage = { kind: 'project', projectPage: 'overview' } as const",
    )
    expect(validateWorkspaceConnectors({ 'App.tsx': forgedActiveSubpage })).toContain(
      'App.tsx activeSubpage must come from canonical editorSubpage(location)',
    )

    const forgedMissingTarget = appSource.replace(
      'const objectTargetMissing = editorObjectTargetMissing(state, location, scriptState?.sharedScripts)',
      'const objectTargetMissing = true',
    )
    expect(validateWorkspaceConnectors({ 'App.tsx': forgedMissingTarget })).toContain(
      'App.tsx objectTargetMissing must come from canonical editorObjectTargetMissing inputs',
    )

    const forgedProjectPage = connectorSource.replace(
      'const { derivedStore, scriptSession, session, page, ...staticProps } = props',
      "const { derivedStore, scriptSession, session, ...staticProps } = props\n  const page = 'overview'",
    )
    expect(
      validateWorkspaceConnectors({
        'ConnectedEditorPages.tsx': forgedProjectPage,
      }),
    ).toContain(
      'ConnectedEditorPages.tsx@ConnectedProjectWorkbench must derive staticProps and page from one canonical props destructure',
    )

    const forgedStaticProps = connectorSource.replace(
      'const { derivedStore, scriptSession, session, tab, ...staticProps } = props',
      'const { derivedStore, scriptSession, session, tab } = props\n  const staticProps = {}',
    )
    expect(
      validateWorkspaceConnectors({
        'ConnectedEditorPages.tsx': forgedStaticProps,
      }),
    ).toContain(
      'ConnectedEditorPages.tsx@ConnectedDataMode must derive staticProps and tab from one canonical props destructure',
    )

    const hardcodedProjectPage = connectorSource.replace('page={page}', 'page="overview"')
    expect(hardcodedProjectPage).not.toBe(connectorSource)
    expect(
      validateWorkspaceConnectors({
        'ConnectedEditorPages.tsx': hardcodedProjectPage,
      }),
    ).toContain(
      'ConnectedEditorPages.tsx@ConnectedProjectWorkbench must forward page={page} to ProjectWorkbenchTab',
    )

    const decoyProjectPage = brokenProjectConnector.replace(
      'return (\n    <ActorMode',
      'const decoy = false ? <ProjectWorkbenchTab {...staticProps} page={props.page} /> : null\n  return (\n    <ActorMode',
    )
    expect(decoyProjectPage).not.toBe(brokenProjectConnector)
    expect(
      validateWorkspaceConnectors({
        'ConnectedEditorPages.tsx': decoyProjectPage,
      }),
    ).toContain(
      'ConnectedEditorPages.tsx@ConnectedProjectWorkbench must directly render exactly one canonical project dispatcher ProjectWorkbenchTab.tsx@ProjectWorkbenchTab; received 0',
    )

    const hardcodedDataTab = connectorSource.replace('tab={tab}', 'tab="item"')
    expect(hardcodedDataTab).not.toBe(connectorSource)
    expect(
      validateWorkspaceConnectors({
        'ConnectedEditorPages.tsx': hardcodedDataTab,
      }),
    ).toContain('ConnectedEditorPages.tsx@ConnectedDataMode must forward tab={tab} to DataMode')

    const decoyDataTab = hardcodedDataTab.replace(
      'return (\n    <DataMode',
      'const decoy = false ? <DataMode {...staticProps} tab={tab} /> : null\n  return (\n    <DataMode',
    )
    expect(decoyDataTab).not.toBe(hardcodedDataTab)
    expect(
      validateWorkspaceConnectors({
        'ConnectedEditorPages.tsx': decoyDataTab,
      }),
    ).toContain('ConnectedEditorPages.tsx@ConnectedDataMode must forward tab={tab} to DataMode')

    const wrongAppProjectPage = appSource.replace(
      'page={activeSubpage.projectPage}',
      'page="overview"',
    )
    expect(wrongAppProjectPage).not.toBe(appSource)
    expect(validateWorkspaceConnectors({ 'App.tsx': wrongAppProjectPage })).toContain(
      'App must pass page={activeSubpage.projectPage} to ConnectedProjectWorkbench',
    )

    const decoyProjectForward = wrongAppProjectPage.replace(
      '</section>\n  )',
      '{false ? <ConnectedProjectWorkbench page={activeSubpage.projectPage} /> : null}</section>\n  )',
    )
    expect(decoyProjectForward).not.toBe(wrongAppProjectPage)
    expect(validateWorkspaceConnectors({ 'App.tsx': decoyProjectForward })).toContain(
      'App must pass page={activeSubpage.projectPage} to ConnectedProjectWorkbench',
    )

    const wrongAppDataTab = appSource.replace('tab={activeSubpage.dataPage}', 'tab="item"')
    expect(wrongAppDataTab).not.toBe(appSource)
    expect(validateWorkspaceConnectors({ 'App.tsx': wrongAppDataTab })).toContain(
      'App must pass tab={activeSubpage.dataPage} to ConnectedDataMode',
    )

    const brokenLiveRoute = appSource.replace(
      "activeSubpage.kind === 'map'",
      "activeSubpage.kind.startsWith('map')",
    )
    const deadRouteChain = brokenLiveRoute.replace(
      '\n  return (\n    <div className="editor ds-form-scope"',
      `\n  const deadWorkspaceRoute = activeSubpage.kind === 'map'
    ? <MapMode />
    : activeSubpage.kind === 'actor'
      ? <ConnectedActorMode />
      : activeSubpage.kind === 'project' && activeSubpage.projectPage
        ? <ConnectedProjectWorkbench page={activeSubpage.projectPage} />
        : activeSubpage.kind === 'data' && activeSubpage.dataPage
          ? <ConnectedDataMode tab={activeSubpage.dataPage} />
          : <div />
  void deadWorkspaceRoute

  return (
    <div className="editor ds-form-scope"`,
    )
    expect(deadRouteChain).not.toBe(brokenLiveRoute)
    expect(validateWorkspaceConnectors({ 'App.tsx': deadRouteChain })).toContain(
      'App.tsx has no canonical map/actor/project/data route chain',
    )

    const returnedDeadRoute = brokenLiveRoute.replace(
      '\n      <section\n        ref={bodyRef}',
      `\n      {false ? (
        activeSubpage.kind === 'map' ? <MapMode />
          : activeSubpage.kind === 'actor' ? <ConnectedActorMode />
            : activeSubpage.kind === 'project' && activeSubpage.projectPage
              ? <ConnectedProjectWorkbench page={activeSubpage.projectPage} />
              : activeSubpage.kind === 'data' && activeSubpage.dataPage
                ? <ConnectedDataMode tab={activeSubpage.dataPage} /> : <div />
      ) : null}

      <section
        ref={bodyRef}`,
    )
    expect(returnedDeadRoute).not.toBe(brokenLiveRoute)
    expect(validateWorkspaceConnectors({ 'App.tsx': returnedDeadRoute })).toContain(
      'App.tsx has no canonical map/actor/project/data route chain',
    )

    const deadBodySection = appSource
      .replace(
        '\n      <section\n        ref={bodyRef}',
        '\n      {false && (\n      <section\n        ref={bodyRef}',
      )
      .replace(
        '\n      </section>\n\n      <EditorDiagnosticsBar',
        '\n      </section>\n      )}\n\n      <EditorDiagnosticsBar',
      )
    expect(deadBodySection).not.toBe(appSource)
    expect(validateWorkspaceConnectors({ 'App.tsx': deadBodySection })).toContain(
      'App.tsx must render exactly one bodyRef workspace section; received 0',
    )

    const earlyAppReturn = appSource.replace(
      '}) {\n  const { session, project } = props',
      '}) {\n  if (true) return <div />\n  const { session, project } = props',
    )
    expect(earlyAppReturn).not.toBe(appSource)
    expect(validateWorkspaceConnectors({ 'App.tsx': earlyAppReturn })).toContain(
      'App.tsx has a non-continuing path before its canonical rendered root',
    )

    const blockedByCalledHelper = appSource.replace(
      '  const { session, project } = props',
      '  const block = () => { while (true) {} }\n  block()\n  const { session, project } = props',
    )
    expect(blockedByCalledHelper).not.toBe(appSource)
    expect(validateWorkspaceConnectors({ 'App.tsx': blockedByCalledHelper })).toContain(
      'App.tsx has a non-continuing path before its canonical rendered root',
    )

    const blockedByAliasedHelper = appSource.replace(
      '  const { session, project } = props',
      '  const block = () => { while (true) {} }\n  const run = block\n  run()\n  const { session, project } = props',
    )
    expect(blockedByAliasedHelper).not.toBe(appSource)
    expect(validateWorkspaceConnectors({ 'App.tsx': blockedByAliasedHelper })).toContain(
      'App.tsx has a non-continuing path before its canonical rendered root',
    )

    const blockedByCapturedAlias = appSource.replace(
      '  const { session, project } = props',
      '  const block = () => { while (true) {} }\n  const run = block\n  { const block = () => {}; run() }\n  const { session, project } = props',
    )
    expect(validateWorkspaceConnectors({ 'App.tsx': blockedByCapturedAlias })).toContain(
      'App.tsx has a non-continuing path before its canonical rendered root',
    )

    const safeCapturedAlias = appSource.replace(
      '  const { session, project } = props',
      '  const block = () => {}\n  const run = block\n  { const block = () => { while (true) {} }; run() }\n  const { session, project } = props',
    )
    expect(validateWorkspaceConnectors({ 'App.tsx': safeCapturedAlias })).toEqual([])

    for (const delegatedBlock of [
      '  const block = () => { while (true) {} }\n  const run = () => block()\n  run()',
      '  const block = () => { while (true) {} }\n  const run = () => { return block() }\n  run()',
      '  const block = () => { while (true) {} }\n  const value = block()',
      '  const block = () => { while (true) {} }\n  if (block()) {}',
      '  (() => { while (true) {} })()',
      '  const state = { blocked: false }\n  const mutate = () => { state.blocked = true }\n  mutate()\n  while (state.blocked) {}',
    ]) {
      const blockedExpression = appSource.replace(
        '  const { session, project } = props',
        `${delegatedBlock}\n  const { session, project } = props`,
      )
      expect(validateWorkspaceConnectors({ 'App.tsx': blockedExpression })).toContain(
        'App.tsx has a non-continuing path before its canonical rendered root',
      )
    }

    for (const higherOrderBlock of [
      '  const block = () => { while (true) {} }\n  const invoke = (fn: () => void) => fn()\n  invoke(block)',
      '  const block = () => { while (true) {} }\n  const invoke = (fn: () => void) => { const run = fn; run() }\n  invoke(block)',
    ]) {
      const blockedCallback = appSource.replace(
        '  const { session, project } = props',
        `${higherOrderBlock}\n  const { session, project } = props`,
      )
      expect(validateWorkspaceConnectors({ 'App.tsx': blockedCallback })).toContain(
        'App.tsx has a non-continuing path before its canonical rendered root',
      )
    }

    const safeHigherOrderCall = appSource.replace(
      '  const { session, project } = props',
      '  const noop = () => {}\n  const invoke = (fn: () => void) => fn()\n  invoke(noop)\n  const { session, project } = props',
    )
    expect(validateWorkspaceConnectors({ 'App.tsx': safeHigherOrderCall })).toEqual([])

    const safeBareReturn = appSource.replace(
      '  const { session, project } = props',
      '  const run = () => { return }\n  run()\n  const { session, project } = props',
    )
    expect(validateWorkspaceConnectors({ 'App.tsx': safeBareReturn })).toEqual([])

    const deadShortCircuitCall = appSource.replace(
      '  const { session, project } = props',
      '  const block = () => { while (true) {} }\n  false && block()\n  const { session, project } = props',
    )
    expect(validateWorkspaceConnectors({ 'App.tsx': deadShortCircuitCall })).toEqual([])

    const missingSceneElseReturn = appSource.replace(
      '\n  }\n\n  const moveEntity =',
      '\n  } else return <div />\n\n  const moveEntity =',
    )
    expect(missingSceneElseReturn).not.toBe(appSource)
    expect(validateWorkspaceConnectors({ 'App.tsx': missingSceneElseReturn })).toContain(
      'App.tsx has a non-continuing path before its canonical rendered root',
    )

    const conditionalProjectConnector = connectorSource.replace(
      /export function ConnectedProjectWorkbench\(props: ConnectedProjectWorkbenchProps\) \{[\s\S]*?\n\}\n\ntype DataStateProps/,
      `export function ConnectedProjectWorkbench(props: ConnectedProjectWorkbenchProps) {
  const { page, ...staticProps } = props
  return false
    ? <ProjectWorkbenchTab {...staticProps} page={page} />
    : <ActorMode {...staticProps} />
}

type DataStateProps`,
    )
    expect(conditionalProjectConnector).not.toBe(connectorSource)
    expect(
      validateWorkspaceConnectors({
        'ConnectedEditorPages.tsx': conditionalProjectConnector,
      }),
    ).toContain(
      'ConnectedEditorPages.tsx@ConnectedProjectWorkbench must directly render exactly one canonical project dispatcher ProjectWorkbenchTab.tsx@ProjectWorkbenchTab; received 0',
    )

    const earlyProjectConnector = connectorSource.replace(
      'export function ConnectedProjectWorkbench(props: ConnectedProjectWorkbenchProps) {',
      'export function ConnectedProjectWorkbench(props: ConnectedProjectWorkbenchProps) {\n  if (true) return <ActorMode {...props} />',
    )
    expect(earlyProjectConnector).not.toBe(connectorSource)
    expect(
      validateWorkspaceConnectors({ 'ConnectedEditorPages.tsx': earlyProjectConnector }),
    ).toContain(
      'ConnectedEditorPages.tsx@ConnectedProjectWorkbench has a non-continuing path before its canonical rendered root',
    )
  })

  test('rejects dead helpers used to impersonate a live DataMode route', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const dataModeSource = readFileSync(join(here, '../DataMode.tsx'), 'utf8')

    const shadowedMusicDispatcher = dataModeSource.replace(
      '  const variableReferences =',
      '  const MusicTab = () => <div />\n  const variableReferences =',
    )
    expect(validateAdoption(matrix, { 'DataMode.tsx': shadowedMusicDispatcher })).toContain(
      'DataMode.tsx route music/default must have 1 reachable return(s) and exactly one imported dispatcher',
    )

    const forgedTab = dataModeSource
      .replace('    tab,\n', '')
      .replace(
        '  const variableReferences =',
        "  const tab = 'item' as const\n  const variableReferences =",
      )
    expect(validateAdoption(matrix, { 'DataMode.tsx': forgedTab })).toContain(
      'DataMode.tsx tab and spriteDomain must come from canonical props/state bindings',
    )

    const forgedSpriteDomain = dataModeSource.replace(
      "  const [spriteDomain, setSpriteDomain] = useState<'world' | 'battle'>(",
      "  const spriteDomain: 'world' | 'battle' = 'world'\n  const [, setSpriteDomain] = useState<'world' | 'battle'>(",
    )
    expect(forgedSpriteDomain).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': forgedSpriteDomain })).toContain(
      'DataMode.tsx tab and spriteDomain must come from canonical props/state bindings',
    )

    const helperMutatesTab = dataModeSource.replace(
      '  const variableReferences =',
      "  const forceItem = () => { tab = 'item' }\n  forceItem()\n  const variableReferences =",
    )
    expect(helperMutatesTab).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': helperMutatesTab })).toContain(
      'DataMode.tsx mutates a route discriminator before canonical routes',
    )
    const liveBranch =
      /\n {2}if \(tab === 'music'\) \{[\s\S]*?\n {2}\}\n\n {2}if \(tab === 'image'\)/
    const match = dataModeSource.match(liveBranch)
    expect(match).not.toBeNull()
    const deadHelper = match![0]
      .replace(/^\n {2}if/, '\n  const deadMusicRoute = () => {\n    if')
      .replace(/\n {2}\}\n\n {2}if \(tab === 'image'\)$/, "\n    }\n  }\n\n  if (tab === 'image')")
    const withoutLiveMusic = dataModeSource.replace(liveBranch, deadHelper)
    expect(withoutLiveMusic).not.toBe(dataModeSource)

    expect(validateAdoption(matrix, { 'DataMode.tsx': withoutLiveMusic })).toContain(
      'DataMode.tsx route appears after fallback control flow',
    )

    const deadMusicCondition = dataModeSource
      .replace("if (tab === 'music') {", "if (false && tab === 'music') {")
      .replace(
        "\n  if (tab === 'image') {",
        "\n  if (tab === 'music') { return <div /> }\n\n  if (tab === 'image') {",
      )
    expect(deadMusicCondition).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': deadMusicCondition })).toContain(
      'DataMode.tsx route appears after fallback control flow',
    )

    const deadCanonicalMusicReturn = dataModeSource.replace(
      "if (tab === 'music') {\n    return (",
      "if (tab === 'music') {\n    if (false) return (",
    )
    expect(deadCanonicalMusicReturn).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': deadCanonicalMusicReturn })).toContain(
      'DataMode.tsx route music/default must have 1 reachable return(s) and exactly one imported dispatcher',
    )

    const thrownMusicRoute = dataModeSource.replace(
      "if (tab === 'music') {\n    return (",
      "if (tab === 'music') {\n    throw new Error('blocked route')\n    return (",
    )
    expect(thrownMusicRoute).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': thrownMusicRoute })).toContain(
      'DataMode.tsx route music/default must have 1 reachable return(s) and exactly one imported dispatcher',
    )

    const blockedMusicRoute = dataModeSource.replace(
      "if (tab === 'music') {\n    return (",
      "if (tab === 'music') {\n    const block = () => { while (true) {} }\n    block()\n    return (",
    )
    expect(blockedMusicRoute).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': blockedMusicRoute })).toContain(
      'DataMode.tsx route music/default must have 1 reachable return(s) and exactly one imported dispatcher',
    )

    const partialMusicRoute = dataModeSource.replace(
      "if (tab === 'music') {\n    return (",
      "if (tab === 'music') {\n    if (Math.random() > 0.5) return (",
    )
    expect(partialMusicRoute).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': partialMusicRoute })).toContain(
      'DataMode.tsx route music/default must have 1 reachable return(s) and exactly one imported dispatcher',
    )

    const deadCanonicalScriptReturn = dataModeSource.replace(
      '    if (script) {',
      '    if (false && script) {',
    )
    expect(deadCanonicalScriptReturn).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': deadCanonicalScriptReturn })).toContain(
      'DataMode.tsx route scripts/default must have 2 reachable return(s) and exactly one imported dispatcher',
    )

    const earlyDataReturn = dataModeSource.replace(
      "\n  if (tab === 'enemy') {",
      "\n  if (true) return <div />\n\n  if (tab === 'enemy') {",
    )
    expect(earlyDataReturn).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': earlyDataReturn })).toContain(
      'DataMode.tsx has non-continuing setup before canonical routes',
    )

    const dominatedMusicReturn = dataModeSource.replace(
      "if (tab === 'music') {\n    return (",
      "if (tab === 'music') {\n    return <div />\n    return (",
    )
    expect(dominatedMusicReturn).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': dominatedMusicReturn })).toContain(
      'DataMode.tsx route music/default must have 1 reachable return(s) and exactly one imported dispatcher',
    )

    const blockedFallbackSetup = dataModeSource.replace(
      '  const unavailable =',
      '  const blockFallback = () => { while (true) {} }\n  blockFallback()\n  const unavailable =',
    )
    expect(blockedFallbackSetup).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': blockedFallbackSetup })).toContain(
      'DataMode.tsx has non-continuing fallback setup',
    )

    const blockedAliasedFallbackSetup = dataModeSource.replace(
      '  const unavailable =',
      '  const blockFallback = () => { while (true) {} }\n  const runFallback = blockFallback\n  runFallback()\n  const unavailable =',
    )
    expect(blockedAliasedFallbackSetup).not.toBe(dataModeSource)
    expect(validateAdoption(matrix, { 'DataMode.tsx': blockedAliasedFallbackSetup })).toContain(
      'DataMode.tsx has non-continuing fallback setup',
    )

    const projectSource = readFileSync(join(here, '../ProjectWorkbenchTab.tsx'), 'utf8')
    const duplicateProjectRoute = projectSource.replace(
      "if (props.page === 'startup') return <ProjectStartupPage {...props} />",
      "if (props.page === 'startup') return <ProjectStartupPage {...props} />\n  if (props.page === 'startup') return <ProjectStartupPage {...props} />",
    )
    expect(duplicateProjectRoute).not.toBe(projectSource)
    expect(
      validateAdoption(matrix, { 'ProjectWorkbenchTab.tsx': duplicateProjectRoute }),
    ).toContain('ProjectWorkbenchTab.tsx has multiple top-level routes for startup')

    const earlyProjectReturn = projectSource.replace(
      'export function ProjectWorkbenchTab(props: ProjectWorkbenchTabProps) {',
      'export function ProjectWorkbenchTab(props: ProjectWorkbenchTabProps) {\n  if (true) return <ProjectOverviewPage {...props} />',
    )
    expect(earlyProjectReturn).not.toBe(projectSource)
    expect(validateAdoption(matrix, { 'ProjectWorkbenchTab.tsx': earlyProjectReturn })).toContain(
      'ProjectWorkbenchTab.tsx has non-canonical top-level dispatcher statements',
    )
  }, 15_000)

  test('rejects field owners that are not rendered by the registered page scope', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const synthetic = structuredClone(matrix)
    synthetic.pages[0].owners.field = 'DsImaginaryFieldOwner'

    expect(validateAdoption(synthetic)).toEqual(
      expect.arrayContaining([
        'scene/workspace field owner DsImaginaryFieldOwner is not a governed field/control owner',
        'scene/workspace field owner DsImaginaryFieldOwner is not rendered by its routed field root',
      ]),
    )

    const missingReverseOwner = structuredClone(matrix)
    const reverseShop = missingReverseOwner.catalogScrollOwners.find(
      (page) => page.registry === 'item/shop',
    )
    reverseShop.catalog = []
    reverseShop.scroll = reverseShop.scroll.filter(
      (record) => record.owner !== 'DsCatalogWorkspace',
    )
    expect(validateAdoption(missingReverseOwner)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('item/shop renders unregistered catalog owner DsCatalogWorkspace'),
      ]),
    )
  })

  test('rejects catalog and scroll owners without live routed callsites', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const synthetic = structuredClone(matrix)
    const shop = synthetic.catalogScrollOwners.find((page) => page.registry === 'item/shop')
    shop.catalog[0].owner = 'DsImaginaryCatalogOwner'
    shop.catalog[0].callsite = 'tag:DsImaginaryCatalogOwner'
    shop.scroll[0].owner = 'DsImaginaryScrollOwner'
    shop.scroll[0].callsite = 'tag:DsImaginaryScrollOwner'

    expect(validateAdoption(synthetic)).toEqual(
      expect.arrayContaining([
        'item/shop catalog owner DsImaginaryCatalogOwner is not rendered by its routed root',
        'item/shop scroll owner DsImaginaryScrollOwner is not rendered by its routed root',
      ]),
    )

    const itemSource = readFileSync(join(here, '../ItemTab.tsx'), 'utf8')
    const missingContent = itemSource
      .replace(
        '<DsObjectWorkspaceContent className="et-scroll item-workbench-scroll">',
        '<div className="et-scroll item-workbench-scroll">',
      )
      .replace('</DsObjectWorkspaceContent>', '</div>')
    expect(missingContent).not.toBe(itemSource)
    expect(validateAdoption(matrix, { 'ItemTab.tsx': missingContent })).toContain(
      'item/item scroll owner DsObjectWorkspaceContent is not rendered by its routed root',
    )
  })

  test('rejects duplicate live owner occurrences and owner-role impersonation', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const shopSource = readFileSync(join(here, '../ShopTab.tsx'), 'utf8')
    const duplicateWorkspace = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      <DsCatalogWorkspace label="重复目录" header={<div />}><div /></DsCatalogWorkspace>\n      <DsCatalogWorkspace',
    )
    expect(duplicateWorkspace).not.toBe(shopSource)
    expect(validateAdoption(matrix, { 'ShopTab.tsx': duplicateWorkspace })).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item/shop renders unregistered catalog owner DsCatalogWorkspace at ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@2',
        ),
        expect.stringContaining(
          'item/shop renders unregistered scroll owner DsCatalogWorkspace at ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@2',
        ),
      ]),
    )

    const deadDuplicate = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {false && <DsCatalogWorkspace label="死分支" header={<div />}><div /></DsCatalogWorkspace>}\n      <DsCatalogWorkspace',
    )
    expect(deadDuplicate).not.toBe(shopSource)
    expect(validateAdoption(matrix, { 'ShopTab.tsx': deadDuplicate })).toEqual([])

    const repeatedOwner = shopSource.replace(
      '  return (\n    <>',
      `  const repeatedOwner = (
    <DsCatalogWorkspace label="重复目录" header={<div />}>
      <div />
    </DsCatalogWorkspace>
  )
  return (
    <>
      {repeatedOwner}
      {repeatedOwner}`,
    )
    expect(repeatedOwner).not.toBe(shopSource)
    expect(validateAdoption(matrix, { 'ShopTab.tsx': repeatedOwner })).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item/shop renders unregistered catalog owner DsCatalogWorkspace at ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@3',
        ),
        expect.stringContaining(
          'item/shop renders unregistered scroll owner DsCatalogWorkspace at ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@3',
        ),
      ]),
    )

    const emptyMap = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {[].map(() => <DsCatalogWorkspace label="空映射" header={<div />}><div /></DsCatalogWorkspace>)}\n      <DsCatalogWorkspace',
    )
    expect(emptyMap).not.toBe(shopSource)
    expect(validateAdoption(matrix, { 'ShopTab.tsx': emptyMap })).toEqual([])

    const repeatedMap = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {[1, 2].map((value) => <DsCatalogWorkspace key={value} label="重复映射" header={<div />}><div /></DsCatalogWorkspace>)}\n      <DsCatalogWorkspace',
    )
    const repeatedMapProblems = validateAdoption(matrix, { 'ShopTab.tsx': repeatedMap })
    expect(repeatedMapProblems).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item/shop renders unregistered catalog owner DsCatalogWorkspace at ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@2',
        ),
        expect.stringContaining(
          'item/shop renders unregistered catalog owner DsCatalogWorkspace at ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@3',
        ),
      ]),
    )

    const spreadMap = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {[...([1, 2] as const)].map((value) => <DsCatalogWorkspace key={value} label="展开映射" header={<div />}><div /></DsCatalogWorkspace>)}\n      <DsCatalogWorkspace',
    )
    const spreadMapProblems = validateAdoption(matrix, { 'ShopTab.tsx': spreadMap })
    expect(spreadMapProblems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@2'),
        expect.stringContaining('ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@3'),
      ]),
    )

    const moduleTupleMap = shopSource
      .replace(
        'export function ShopTab',
        'const STATIC_OWNER_ITEMS = [1, 2] as const\n\nexport function ShopTab',
      )
      .replace(
        '    <>\n      <DsCatalogWorkspace',
        '    <>\n      {STATIC_OWNER_ITEMS.map((value) => <DsCatalogWorkspace key={value} label="常量映射" header={<div />}><div /></DsCatalogWorkspace>)}\n      <DsCatalogWorkspace',
      )
    const moduleTupleProblems = validateAdoption(matrix, { 'ShopTab.tsx': moduleTupleMap })
    expect(moduleTupleProblems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@2'),
        expect.stringContaining('ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@3'),
      ]),
    )

    const conditionalMap = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {[false, true].map((show) => show ? <DsCatalogWorkspace label="条件映射" header={<div />}><div /></DsCatalogWorkspace> : null)}\n      <DsCatalogWorkspace',
    )
    const conditionalMapProblems = validateAdoption(matrix, { 'ShopTab.tsx': conditionalMap })
    expect(conditionalMapProblems).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item/shop renders unregistered catalog owner DsCatalogWorkspace at ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@2',
        ),
      ]),
    )
    expect(conditionalMapProblems.join('\n')).not.toContain(
      'ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@3',
    )

    const sparseMap = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {([, 1] as const).map((_value, index) => index === 1 ? <DsCatalogWorkspace label="稀疏映射" header={<div />}><div /></DsCatalogWorkspace> : null)}\n      <DsCatalogWorkspace',
    )
    const sparseMapProblems = validateAdoption(matrix, { 'ShopTab.tsx': sparseMap })
    expect(sparseMapProblems).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item/shop renders unregistered catalog owner DsCatalogWorkspace at ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@2',
        ),
      ]),
    )
    expect(sparseMapProblems.join('\n')).not.toContain(
      'ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@3',
    )

    const ignoredThisArg = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {[1].map(() => null, () => <DsCatalogWorkspace label="thisArg" header={<div />}><div /></DsCatalogWorkspace>)}\n      <DsCatalogWorkspace',
    )
    expect(validateAdoption(matrix, { 'ShopTab.tsx': ignoredThisArg })).toEqual([])

    const callbackArrayArgument = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {[1, 2].map((_value, _index, all) => all === undefined ? null : <DsCatalogWorkspace label="数组参数" header={<div />}><div /></DsCatalogWorkspace>)}\n      <DsCatalogWorkspace',
    )
    const callbackArrayProblems = validateAdoption(matrix, {
      'ShopTab.tsx': callbackArrayArgument,
    })
    expect(callbackArrayProblems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@2'),
        expect.stringContaining('ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@3'),
      ]),
    )

    const dynamicMap = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {shops.map((candidate) => <DsCatalogWorkspace key={candidate.id} label="动态映射" header={<div />}><div /></DsCatalogWorkspace>)}\n      <DsCatalogWorkspace',
    )
    expect(validateAdoption(matrix, { 'ShopTab.tsx': dynamicMap })).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item/shop cannot prove catalog/scroll owner cardinality for dynamic map at ShopTab.tsx@ShopTab:',
        ),
      ]),
    )

    const dynamicFlatMap = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {shops.flatMap((candidate) => [<DsCatalogWorkspace key={candidate.id} label="动态平铺" header={<div />}><div /></DsCatalogWorkspace>])}\n      <DsCatalogWorkspace',
    )
    expect(validateAdoption(matrix, { 'ShopTab.tsx': dynamicFlatMap })).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item/shop cannot prove catalog/scroll owner cardinality for dynamic flatMap at ShopTab.tsx@ShopTab:',
        ),
      ]),
    )

    const branchOwner = shopSource.replace(
      '  return (\n    <>',
      `  const branchOwner = (
    <DsCatalogWorkspace label="互斥目录" header={<div />}><div /></DsCatalogWorkspace>
  )
  return (
    <>
      {shop ? branchOwner : branchOwner}`,
    )
    const branchProblems = validateAdoption(matrix, { 'ShopTab.tsx': branchOwner })
    expect(branchProblems).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item/shop renders unregistered catalog owner DsCatalogWorkspace at ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@2',
        ),
      ]),
    )
    expect(branchProblems.join('\n')).not.toContain('ShopTab.tsx@ShopTab#tag:DsCatalogWorkspace@3')

    const recursiveOwner = shopSource.replace(
      '  return (\n    <>',
      `  const RecursiveOwner = () => (
    <>{shop ? <DsCatalogWorkspace label="递归目录" header={<div />}><div /></DsCatalogWorkspace> : <RecursiveOwner />}</>
  )
  return (
    <>
      <RecursiveOwner />`,
    )
    expect(validateAdoption(matrix, { 'ShopTab.tsx': recursiveOwner })).toContain(
      'item/shop cannot prove catalog/scroll owner cardinality through recursive render ShopTab.tsx@RecursiveOwner',
    )

    const twelveMap = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((value) => <DsCatalogWorkspace key={value} label="十二项" header={<div />}><div /></DsCatalogWorkspace>)}\n      <DsCatalogWorkspace',
    )
    const twelveOccurrences = validateAdoption(matrix, { 'ShopTab.tsx': twelveMap })
      .filter((problem) => problem.includes('unregistered catalog owner DsCatalogWorkspace'))
      .map((problem) => Number(problem.match(/#tag:DsCatalogWorkspace@(\d+)/)?.[1]))
    expect(twelveOccurrences).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])

    const notApplicable = structuredClone(matrix)
    const naShop = notApplicable.catalogScrollOwners.find((page) => page.registry === 'item/shop')
    naShop.catalog[0].owner = 'N/A: 伪装成没有目录。'
    expect(validateAdoption(notApplicable)).toEqual(
      expect.arrayContaining([
        'item/shop catalog N/A owner must bind a non-governed intrinsic evidence callsite',
        expect.stringContaining('item/shop renders unregistered catalog owner DsCatalogWorkspace'),
      ]),
    )

    const fakeCustomScroll = structuredClone(matrix)
    const customShop = fakeCustomScroll.catalogScrollOwners.find(
      (page) => page.registry === 'item/shop',
    )
    const catalogScroll = customShop.scroll.find((record) => record.region === 'catalog')
    Object.assign(catalogScroll, {
      owner: 'custom:.shop-workbench',
      source: 'ShopTab.tsx',
      component: 'ShopTab',
      callsite: 'class:shop-workbench',
    })
    expect(validateAdoption(fakeCustomScroll)).toEqual(
      expect.arrayContaining([
        'item/shop scroll custom owner custom:.shop-workbench has no live vertical overflow contract',
        expect.stringContaining('item/shop renders unregistered scroll owner DsCatalogWorkspace'),
      ]),
    )

    const globallyKnownCustomOwner = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      <div className="tree" />\n      <DsCatalogWorkspace',
    )
    expect(globallyKnownCustomOwner).not.toBe(shopSource)
    expect(validateAdoption(matrix, { 'ShopTab.tsx': globallyKnownCustomOwner })).toContain(
      'item/shop renders unregistered live custom scroll owner ShopTab.tsx@ShopTab#tree@1',
    )

    const editorCss = readFileSync(join(here, '../editor.css'), 'utf8')
    const previouslyUnknownCustomOwner = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      '    <>\n      <div className="future-scroll-owner" />\n      <DsCatalogWorkspace',
    )
    expect(previouslyUnknownCustomOwner).not.toBe(shopSource)
    expect(
      validateAdoption(matrix, {
        'ShopTab.tsx': previouslyUnknownCustomOwner,
        'editor.css': `${editorCss}\n.future-scroll-owner { overflow-y: auto; }\n`,
      }),
    ).toContain(
      'item/shop renders unregistered live custom scroll owner ShopTab.tsx@ShopTab#future-scroll-owner@1',
    )

    const wrongRole = structuredClone(matrix)
    const wrongRoleShop = wrongRole.catalogScrollOwners.find(
      (page) => page.registry === 'item/shop',
    )
    Object.assign(wrongRoleShop.catalog[0], {
      owner: 'DsObjectWorkspaceContent',
      source: 'ShopTab.tsx',
      component: 'ShopTab',
      callsite: 'tag:DsObjectWorkspaceContent',
    })
    expect(validateAdoption(wrongRole)).toContain(
      'item/shop catalog owner DsObjectWorkspaceContent does not support the catalog role',
    )
  }, 30_000)

  test('checks effective CSS cascade, responsive conditions, axes, and bounded nesting', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const shopSource = readFileSync(join(here, '../ShopTab.tsx'), 'utf8')
    const editorCss = readFileSync(join(here, '../editor.css'), 'utf8')
    const record = (token, region, extra = {}) => ({
      region,
      axis: 'y',
      owner: `custom:.${token}`,
      source: 'ShopTab.tsx',
      component: 'ShopTab',
      callsite: `class:${token}`,
      reason: '滚动合同反例测试。',
      verification: '由本测试注入的 route-live DOM 与 CSS 证明。',
      ...extra,
    })
    const shopScroll = (candidate) =>
      candidate.catalogScrollOwners.find((page) => page.registry === 'item/shop').scroll

    const itemSource = readFileSync(join(here, '../ItemTab.tsx'), 'utf8')
    const forgedInlineDialog = itemSource
      .replace('<DsDialog', '<div')
      .replace('</DsDialog>', '</div>')
    expect(forgedInlineDialog).not.toBe(itemSource)
    expect(validateAdoption(matrix, { 'ItemTab.tsx': forgedInlineDialog })).toContain(
      'item/item scroll owner custom:.item-icon-browser-grid at overlay.icon-browser.options is nested on axis y inside DsObjectWorkspaceContent at main without a bounded subviewport',
    )

    const missingWideCondition = structuredClone(matrix)
    const casualtyOwners = missingWideCondition.catalogScrollOwners.find(
      (page) => page.registry === 'actor/workspace',
    ).scroll
    for (const owner of casualtyOwners.filter((candidate) => candidate.variant === 'casualty-wide'))
      delete owner.condition
    expect(validateAdoption(missingWideCondition)).toEqual(
      expect.arrayContaining([
        'actor/workspace scroll custom owner custom:.casualty-branch-panel has no live vertical overflow contract',
        'actor/workspace scroll custom owner custom:.casualty-branch-editor has no live vertical overflow contract',
      ]),
    )

    const missingNarrowOwner = structuredClone(matrix)
    const missingNarrowPage = missingNarrowOwner.catalogScrollOwners.find(
      (page) => page.registry === 'actor/workspace',
    )
    missingNarrowPage.scroll = missingNarrowPage.scroll.filter(
      (owner) => owner.variant !== 'casualty-narrow',
    )
    expect(validateAdoption(missingNarrowOwner)).toContain(
      'actor/workspace renders unregistered live custom scroll owner CasualtyEditor.tsx@CasualtyEditor#casualty-workbench@1 under @media (max-width: 1120px)',
    )

    const invalidCondition = structuredClone(matrix)
    invalidCondition.catalogScrollOwners
      .find((page) => page.registry === 'actor/workspace')
      .scroll.find((owner) => owner.variant === 'casualty-wide').condition = 'wide viewport'
    expect(validateAdoption(invalidCondition)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('.condition must be default or a CSS at-rule condition'),
      ]),
    )

    const invalidSource = shopSource
      .replace(
        '    <>\n      <DsCatalogWorkspace',
        `    <>
      <div className="future-ancestor-owner" />
      <div className="future-pseudo-owner" />
      <div className="future-media-owner" />
      <div className="future-media-list-hole" />
      <div className="future-implied-media-owner" />
      <div className="future-partial-media-owner" />
      <div
        className={
          shop
            ? 'future-conditional-hole active'
            : 'future-conditional-hole inactive'
        }
      />
      <div className="future-inline-owner" style={{ overflowY: 'hidden' }} />
      <div
        className="future-dynamic-inline-owner"
        style={{ overflowY: shop ? 'auto' : 'hidden' }}
      />
      <div className={shop ? 'future-cap-1-a' : 'future-cap-1-b'}>
        <div className={shop ? 'future-cap-2-a' : 'future-cap-2-b'}>
          <div className={shop ? 'future-cap-3-a' : 'future-cap-3-b'}>
            <div className={shop ? 'future-cap-4-a' : 'future-cap-4-b'}>
              <div className={shop ? 'future-cap-5-a' : 'future-cap-5-b'}>
                <div className={shop ? 'future-cap-6-a' : 'future-cap-6-b'}>
                  <div className={shop ? 'future-cap-7-a' : 'future-cap-7-b'}>
                    <div className={shop ? 'future-cap-8-a' : 'future-cap-8-b'}>
                      <div className={shop ? 'future-cap-9-a' : 'future-cap-9-b'}>
                        <div className="future-cap-owner" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={
          \`future-single-cap-owner \${shop ? 'future-single-1-a' : 'future-single-1-b'} \${shop ? 'future-single-2-a' : 'future-single-2-b'} \${shop ? 'future-single-3-a' : 'future-single-3-b'} \${shop ? 'future-single-4-a' : 'future-single-4-b'} \${shop ? 'future-single-5-a' : 'future-single-5-b'} \${shop ? 'future-single-6-a' : 'future-single-6-b'}\`
        }
      />
      <div className={shop ? 'future-parent-a' : 'future-parent-b'}>
        <div className="future-union-owner" />
      </div>
      <div className={shop ? 'future-correlated-parent-a' : 'future-correlated-parent-b'}>
        <div className={shop ? 'future-correlated-child-x' : 'future-correlated-child-y'} />
      </div>
      <div className="future-overlap-parent">
        <div className="future-overlap-child" />
      </div>
      <DsCatalogWorkspace`,
      )
      .replace(
        '          >\n            <div ref={stockSectionRef} tabIndex={-1}>',
        `          >
            <div className="future-nested-owner" />
            <div className="future-fake-bounded-owner" />
            <div className="future-percent-bounded-owner" />
            <div ref={stockSectionRef} tabIndex={-1}>`,
      )
    expect(invalidSource).not.toBe(shopSource)
    const invalid = structuredClone(matrix)
    shopScroll(invalid).push(
      record('future-ancestor-owner', 'main.ancestor-probe'),
      record('future-pseudo-owner', 'main.pseudo-probe'),
      record('future-media-owner', 'main.media-probe'),
      record('future-media-list-hole', 'main.media-list-probe'),
      record('future-implied-media-owner', 'main.media-implied-probe', {
        condition: '@media (min-width: 600px)',
      }),
      record('future-partial-media-owner', 'main.media-partial-probe', {
        condition: '@media (min-width: 600px)',
      }),
      record('future-conditional-hole', 'main.media-variant-hole-probe', {
        condition: '@media (min-width: 600px)',
      }),
      record('future-inline-owner', 'main.inline-probe'),
      record('future-dynamic-inline-owner', 'main.dynamic-inline-probe'),
      record('future-cap-owner', 'main.variant-cap-probe'),
      record('future-single-cap-owner', 'main.single-variant-cap-probe'),
      record('future-union-owner', 'main.union-probe'),
      record('future-correlated-child-y', 'main.correlated-probe'),
      record('future-overlap-parent', 'main.overlap', {
        condition: '@media (min-width: 600px)',
      }),
      record('future-overlap-child', 'main.overlap.child', {
        condition: '@media (max-width: 1000px)',
      }),
      record('future-nested-owner', 'main.nested', { variant: 'forged-independent' }),
      record('future-fake-bounded-owner', 'main.fake-boundary', {
        nestedWithin: 'main',
        boundaryKind: 'bounded-subviewport',
      }),
      record('future-percent-bounded-owner', 'main.percent-boundary', {
        nestedWithin: 'main',
        boundaryKind: 'bounded-subviewport',
      }),
    )
    const invalidImage = invalid.catalogScrollOwners
      .find((page) => page.registry === 'asset/image')
      .scroll.find((candidate) => candidate.owner === 'custom:.image-preview-stage')
    expect(invalidImage.axis).toBe('both')
    const invalidGoverned = shopScroll(invalid).find(
      (candidate) => candidate.owner === 'DsCatalogWorkspace',
    )
    invalidGoverned.axis = 'both'
    invalidGoverned.condition = '@media (max-width: 1px)'
    const invalidProblems = validateAdoption(invalid, {
      'ShopTab.tsx': invalidSource,
      'editor.css': `${editorCss}
.never-present-ancestor .future-ancestor-owner { overflow-y: auto; }
.future-pseudo-owner { overflow-y: auto; }
.future-pseudo-owner:not(.active) { overflow-y: hidden; }
.future-media-owner { overflow-y: hidden; }
@media (max-width: 711px) { .future-media-owner { overflow-y: auto; } }
.future-media-list-hole { overflow-y: auto; }
@media (max-width: 500px), (min-width: 1000px) {
  .future-media-list-hole { overflow-y: hidden; }
}
.future-implied-media-owner, .future-partial-media-owner { overflow-y: hidden; }
@media (min-width: 600px) {
  .future-implied-media-owner, .future-partial-media-owner { overflow-y: auto; }
}
@media (min-width: 500px) { .future-implied-media-owner { overflow-y: hidden; } }
@media (max-width: 1000px) { .future-partial-media-owner { overflow-y: hidden; } }
.future-conditional-hole { overflow-y: hidden; }
@media (min-width: 600px) { .future-conditional-hole.active { overflow-y: auto; } }
.future-inline-owner, .future-dynamic-inline-owner { overflow-y: auto; }
.future-cap-owner { overflow-y: auto; }
.future-single-cap-owner { overflow-y: auto; }
.future-parent-a.future-parent-b .future-union-owner { overflow-y: auto; }
.future-correlated-parent-a .future-correlated-child-y { overflow-y: auto; }
.future-overlap-parent, .future-overlap-child { overflow-y: hidden; }
@media (min-width: 600px) { .future-overlap-parent { overflow-y: auto; } }
@media (max-width: 1000px) { .future-overlap-child { overflow-y: auto; } }
.future-nested-owner { overflow-y: auto; }
.future-fake-bounded-owner { max-height: var(--unknown); overflow-y: auto; }
.future-percent-bounded-owner { max-height: calc(100% - 1rem); overflow-y: auto; }
.image-preview-stage { overflow-x: hidden; overflow-y: auto; }
`,
    })
    expect(invalidProblems).toEqual(
      expect.arrayContaining([
        'item/shop scroll custom owner custom:.future-ancestor-owner has no live vertical overflow contract',
        'item/shop scroll custom owner custom:.future-pseudo-owner has no live vertical overflow contract',
        'item/shop scroll custom owner custom:.future-media-owner has no live vertical overflow contract',
        'item/shop scroll custom owner custom:.future-media-list-hole has no live vertical overflow contract',
        'item/shop scroll custom owner custom:.future-implied-media-owner has no live vertical overflow contract under @media (min-width: 600px)',
        'item/shop scroll custom owner custom:.future-partial-media-owner has no live vertical overflow contract under @media (min-width: 600px)',
        'item/shop scroll custom owner custom:.future-conditional-hole has no live vertical overflow contract under @media (min-width: 600px)',
        'item/shop scroll custom owner custom:.future-inline-owner has no live vertical overflow contract',
        'item/shop scroll custom owner custom:.future-dynamic-inline-owner has a dynamic inline style that can override its scroll contract',
        'item/shop scroll custom owner custom:.future-cap-owner cannot prove CSS class variants because its routed element path exceeds 256 combinations',
        'item/shop scroll custom owner custom:.future-single-cap-owner cannot prove CSS class variants because its routed element path exceeds 256 combinations',
        'item/shop scroll custom owner custom:.future-union-owner has no live vertical overflow contract',
        'item/shop scroll custom owner custom:.future-correlated-child-y relies on an unprovable cross-element class variant correlation',
        'item/shop renders unregistered live custom scroll owner ShopTab.tsx@ShopTab#future-media-owner@1 under @media (max-width: 711px)',
        'item/shop governed scroll owner DsCatalogWorkspace declares unsupported axis both',
        expect.stringContaining('.condition is only supported for custom CSS owners'),
        'item/shop scroll owner custom:.future-overlap-child at main.overlap.child is nested on axis y inside custom:.future-overlap-parent at main.overlap without a bounded subviewport',
        'item/shop scroll owner custom:.future-nested-owner at main.nested is nested on axis y inside DsObjectWorkspaceContent at main without a bounded subviewport',
        'item/shop scroll owner custom:.future-fake-bounded-owner declares a bounded subviewport without a finite block-size contract',
        'item/shop scroll owner custom:.future-percent-bounded-owner declares a bounded subviewport without a finite block-size contract',
        'asset/image scroll custom owner custom:.image-preview-stage declares axis both without a live horizontal overflow contract',
      ]),
    )

    const validSource = shopSource
      .replace(
        '    <>\n      <DsCatalogWorkspace',
        `    <>
      <div className="future-media-owner" />
      <div className="future-real-ancestor">
        <div className="future-real-descendant-owner" />
      </div>
      <div className="future-active-owner active" />
      <DsCatalogWorkspace`,
      )
      .replace(
        '          >\n            <div ref={stockSectionRef} tabIndex={-1}>',
        '          >\n            <div className="future-bounded-owner" />\n            <div ref={stockSectionRef} tabIndex={-1}>',
      )
    const valid = structuredClone(matrix)
    shopScroll(valid).push(
      record('future-media-owner', 'main.media-probe', {
        condition: '@media (max-width: 711px)',
      }),
      record('future-real-descendant-owner', 'main.ancestor-positive'),
      record('future-active-owner', 'main.pseudo-positive'),
      record('future-bounded-owner', 'main.bounded', {
        nestedWithin: 'main',
        boundaryKind: 'bounded-subviewport',
      }),
    )
    expect(
      validateAdoption(valid, {
        'ShopTab.tsx': validSource,
        'editor.css': `${editorCss}
.future-media-owner { overflow-y: hidden; }
@media (max-width: 711px) { .future-media-owner { overflow-y: auto; } }
.future-real-ancestor .future-real-descendant-owner { overflow-y: auto; }
.future-active-owner { overflow-y: auto; }
.future-active-owner:not(.active) { overflow-y: hidden; }
.future-bounded-owner { max-height: 10rem; height: auto; overflow-y: auto; }
`,
      }),
    ).toEqual([])
  }, 60_000)

  test('requires every Inspector and canonical object workspace owner to be explicitly linked', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const missingInspector = structuredClone(matrix)
    const shop = missingInspector.catalogScrollOwners.find((page) => page.registry === 'item/shop')
    shop.scroll = shop.scroll.filter((record) => record.owner !== 'DsInspectorTabs')
    expect(validateAdoption(missingInspector)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('item/shop renders unregistered scroll owner DsInspectorTabs'),
      ]),
    )

    const missingProjectOwner = structuredClone(matrix)
    const overview = missingProjectOwner.catalogScrollOwners.find(
      (page) => page.registry === 'project/overview',
    )
    overview.scroll = overview.scroll.filter(
      (record) => record.owner !== 'DsObjectWorkspaceContent',
    )
    expect(validateAdoption(missingProjectOwner)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'project/overview renders unregistered scroll owner DsObjectWorkspaceContent',
        ),
      ]),
    )

    const fakeException = structuredClone(matrix)
    fakeException.pages.find((page) => page.registry === 'story/vars').status = 'exception'
    expect(validateAdoption(fakeException)).toContain('story/vars status must be adopted')
  }, 15_000)

  test('rejects prose-only adoption truth, forged reserved markers, and legacy drift', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const proseOnly = structuredClone(matrix)
    delete proseOnly.catalogScrollOwners
    expect(validateAdoption(proseOnly)).toEqual([
      'design-system-adoption.json must contain { version: 4, catalogScrollOwners: [], overlayExceptions: [], workspaceLegacyExceptions: [], pages: [] }',
    ])

    const shopSource = readFileSync(join(here, '../ShopTab.tsx'), 'utf8')
    const forgedWorkspace = shopSource.replace(
      'className="outliner data-outliner shop-outliner"',
      'className="outliner data-outliner shop-outliner ds-object-workspace"',
    )
    expect(forgedWorkspace).not.toBe(shopSource)
    expect(validateAdoption(matrix, { 'ShopTab.tsx': forgedWorkspace })).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unregistered raw workspace marker ShopTab.tsx#'),
      ]),
    )

    const forgedConcatenatedWorkspace = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      "    <>\n      <div className={'ds-' + 'object-workspace'} />\n      <DsCatalogWorkspace",
    )
    expect(validateAdoption(matrix, { 'ShopTab.tsx': forgedConcatenatedWorkspace })).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unregistered raw workspace marker ShopTab.tsx#'),
      ]),
    )

    const forgedConcatenatedCatalog = shopSource.replace(
      '    <>\n      <DsCatalogWorkspace',
      "    <>\n      <div className={'ds-' + 'catalog-workspace'} />\n      <DsCatalogWorkspace",
    )
    expect(validateAdoption(matrix, { 'ShopTab.tsx': forgedConcatenatedCatalog })).toContain(
      'ShopTab.tsx uses reserved raw class ds-catalog-workspace',
    )

    const forgedSpread = shopSource.replace(
      '  return (\n    <>',
      "  const forgedProps = { className: 'ds-object-workspace', 'data-ds-scroll-owner': 'catalog' }\n  return (\n    <>\n      <div {...forgedProps} />",
    )
    const spreadProblems = validateAdoption(matrix, { 'ShopTab.tsx': forgedSpread })
    expect(spreadProblems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unregistered raw workspace marker ShopTab.tsx#'),
        'ShopTab.tsx uses reserved raw marker data-ds-scroll-owner',
      ]),
    )

    const unknownSpread = shopSource.replace(
      '  return (\n    <>',
      '  const runtimeProps = getRuntimeProps()\n  return (\n    <>\n      <div {...runtimeProps} />',
    )
    expect(unknownSpread).not.toBe(shopSource)
    expect(validateAdoption(matrix, { 'ShopTab.tsx': unknownSpread })).toContain(
      'ShopTab.tsx uses an unverified intrinsic JSX spread; reserved design-system classes and markers must be statically auditable',
    )

    const dynamicClassName = shopSource.replace(
      '  return (\n    <>',
      "  const forgedClass = () => 'ds-catalog-workspace'\n  return (\n    <>\n      <div className={forgedClass()} />",
    )
    expect(dynamicClassName).not.toBe(shopSource)
    expect(validateAdoption(matrix, { 'ShopTab.tsx': dynamicClassName })).toContain(
      'ShopTab.tsx uses an unverified dynamic intrinsic className; reserved design-system classes must be statically auditable',
    )

    const dynamicKnownSpread = shopSource.replace(
      '  return (\n    <>',
      "  const forgedClass = () => 'ds-catalog-workspace'\n  const forgedProps = { className: forgedClass() }\n  return (\n    <>\n      <div {...forgedProps} />",
    )
    expect(dynamicKnownSpread).not.toBe(shopSource)
    expect(validateAdoption(matrix, { 'ShopTab.tsx': dynamicKnownSpread })).toContain(
      'ShopTab.tsx uses an unverified dynamic intrinsic className; reserved design-system classes must be statically auditable',
    )

    const staleLegacy = structuredClone(matrix)
    staleLegacy.workspaceLegacyExceptions.push({
      id: 'stale-workspace-vars',
      source: 'VarsTab.tsx',
      selectors: [{ selector: 'main.ds-object-workspace', count: 1 }],
      registries: ['story/vars'],
      reason: '用于证明已清零 legacy 记录不能回流。',
      verification: '静态 AST 必须发现 selector 已不存在。',
      removalCondition: '本记录必须保持不存在。',
      debtCard: 'docs/ops/tasks/ED-WORKSPACE-ADOPTION-DEBT-1-editor-workspace-owner-adoption.md',
    })
    expect(validateAdoption(staleLegacy)).toContain(
      'workspace legacy selector VarsTab.tsx#main.ds-object-workspace expected 1, rendered 0',
    )
  })

  test('keeps the editor root outside every focus-driven scroll chain', () => {
    const css = readFileSync(join(here, '../editor.css'), 'utf8')
    const editorRule = css.match(/\.editor\s*\{[\s\S]*?\n\}/)?.[0]
    expect(editorRule).toContain('overflow: clip')
    expect(editorRule).not.toContain('overflow: hidden')
  })

  test('counts only field owners that reach a component render result', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const projectSource = readFileSync(join(here, '../ProjectWorkbenchTab.tsx'), 'utf8')
    const overviewMarker = 'function ProjectOverviewPage(props: ProjectWorkbenchTabProps) {'
    const overviewReturn = '  return (\n    <>\n      <div className="outliner project-outliner">'
    const withTextOwner = structuredClone(matrix)
    withTextOwner.pages.find((page) => page.registry === 'project/overview').owners.field +=
      ' + DsTextInput'
    const mutateOverview = (transform: (source: string) => string): string => {
      const start = projectSource.indexOf(overviewMarker)
      expect(start).toBeGreaterThanOrEqual(0)
      return projectSource.slice(0, start) + transform(projectSource.slice(start))
    }

    const deadLocalOwner = mutateOverview((source) =>
      source.replace(
        overviewMarker,
        `${overviewMarker}\n  const deadOwner = <DsTextInput value="#fff" onChange={() => {}} />\n  void deadOwner`,
      ),
    )
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': deadLocalOwner }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const deadReturnedOwner = mutateOverview((source) =>
      source.replace(
        overviewReturn,
        '  return (\n    <>\n      {false && <DsTextInput value="#fff" onChange={() => {}} />}\n      <div className="outliner project-outliner">',
      ),
    )
    expect(deadReturnedOwner).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': deadReturnedOwner }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const deadEarlyOwner = mutateOverview((source) =>
      source.replace(
        overviewMarker,
        `${overviewMarker}\n  if (false) return <DsTextInput value="#fff" onChange={() => {}} />`,
      ),
    )
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': deadEarlyOwner }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    for (const blockingPrefix of [
      '  const blockRender = () => { while (true) {} }\n  blockRender()',
      '  (() => { while (true) {} })()',
      '  try { return null } finally {}',
      "  switch (props.page) { case 'startup': return null; default: return null }",
    ]) {
      const blockedRenderedOwner = mutateOverview((source) =>
        source
          .replace(overviewMarker, `${overviewMarker}\n${blockingPrefix}`)
          .replace(
            overviewReturn,
            '  return (\n    <>\n      <DsTextInput value="#fff" onChange={() => {}} />\n      <div className="outliner project-outliner">',
          ),
      )
      expect(
        validateAdoption(withTextOwner, {
          'ProjectWorkbenchTab.tsx': blockedRenderedOwner,
        }),
      ).toContain(
        'project/overview field owner DsTextInput is not rendered by its routed field root',
      )
    }

    const liveBoundOwner = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const liveOwner = <DsTextInput value="#fff" onChange={() => {}} />`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      {liveOwner}\n      <div className="outliner project-outliner">',
        ),
    )
    expect(liveBoundOwner).not.toBe(projectSource)
    expect(validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': liveBoundOwner })).toEqual(
      [],
    )

    const liveHelperOwner = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const LiveOwner = () => <DsTextInput value="#fff" onChange={() => {}} />`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <LiveOwner />\n      <div className="outliner project-outliner">',
        ),
    )
    expect(validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': liveHelperOwner })).toEqual(
      [],
    )

    const liveMemoOwner = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const memoOwner = useMemo(() => <DsTextInput value="#fff" onChange={() => {}} />, [])`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      {memoOwner}\n      <div className="outliner project-outliner">',
        ),
    )
    expect(validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': liveMemoOwner })).toEqual(
      [],
    )

    const reboundOwner = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  let rebound = <DsTextInput value="#fff" onChange={() => {}} />\n  rebound = <div />`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      {rebound}\n      <div className="outliner project-outliner">',
        ),
    )
    expect(reboundOwner).not.toBe(projectSource)
    expect(validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': reboundOwner })).toContain(
      'project/overview field owner DsTextInput is not rendered by its routed field root',
    )

    const deadBranchBinding = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  if (false) { var branchOwner = <DsTextInput value="#fff" onChange={() => {}} /> }`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      {branchOwner}\n      <div className="outliner project-outliner">',
        ),
    )
    expect(deadBranchBinding).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': deadBranchBinding }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const staticFalseBinding = mutateOverview((source) =>
      source
        .replace(overviewMarker, `${overviewMarker}\n  const OFF = false`)
        .replace(
          overviewReturn,
          '  return (\n    <>\n      {OFF && <DsTextInput value="#fff" onChange={() => {}} />}\n      <div className="outliner project-outliner">',
        ),
    )
    expect(staticFalseBinding).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': staticFalseBinding }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const staticFalseHelperArgument = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const renderMaybe = (show: boolean) =>\n    show && <DsTextInput value="#fff" onChange={() => {}} />`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      {renderMaybe(false)}\n      <div className="outliner project-outliner">',
        ),
    )
    expect(staticFalseHelperArgument).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': staticFalseHelperArgument,
      }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const staticFalseComponentProp = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const MaybeOwner = (candidate: { show: boolean }) =>\n    candidate.show && <DsTextInput value="#fff" onChange={() => {}} />`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <MaybeOwner show={false} />\n      <div className="outliner project-outliner">',
        ),
    )
    expect(staticFalseComponentProp).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': staticFalseComponentProp,
      }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const destructuredComponentProp = (show: boolean) =>
      mutateOverview((source) =>
        source
          .replace(
            overviewMarker,
            `${overviewMarker}\n  const MaybeOwner = (candidate: { show: boolean }) => {\n    const { show } = candidate\n    return show && <DsTextInput value="#fff" onChange={() => {}} />\n  }`,
          )
          .replace(
            overviewReturn,
            `  return (\n    <>\n      <MaybeOwner show={${show}} />\n      <div className="outliner project-outliner">`,
          ),
      )
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': destructuredComponentProp(false),
      }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': destructuredComponentProp(true),
      }),
    ).toEqual([])

    const nestedDestructuredProp = (show: boolean) =>
      mutateOverview((source) =>
        source
          .replace(
            overviewMarker,
            `${overviewMarker}\n  const MaybeOwner = (candidate: { config: { show: boolean } }) => {\n    const { config: { show } } = candidate\n    return show && <DsTextInput value="#fff" onChange={() => {}} />\n  }`,
          )
          .replace(
            overviewReturn,
            `  return (\n    <>\n      <MaybeOwner config={{ show: ${show} }} />\n      <div className="outliner project-outliner">`,
          ),
      )
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': nestedDestructuredProp(false),
      }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': nestedDestructuredProp(true),
      }),
    ).toEqual([])

    const switchedComponentProp = (mode: 'hide' | 'show') =>
      mutateOverview((source) =>
        source
          .replace(
            overviewMarker,
            `${overviewMarker}\n  const MaybeOwner = (candidate: { mode: string }) => {\n    switch (candidate.mode) {\n      case 'show': return <DsTextInput value="#fff" onChange={() => {}} />\n      default: return null\n    }\n  }`,
          )
          .replace(
            overviewReturn,
            `  return (\n    <>\n      <MaybeOwner mode="${mode}" />\n      <div className="outliner project-outliner">`,
          ),
      )
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': switchedComponentProp('hide'),
      }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': switchedComponentProp('show'),
      }),
    ).toEqual([])

    const nullishComponentProp = (fallback: 'fixed' | 'null') =>
      mutateOverview((source) =>
        source
          .replace(
            overviewMarker,
            `${overviewMarker}\n  const MaybeOwner = (candidate: { fallback: ReactNode }) =>\n    candidate.fallback ?? <DsTextInput value="#fff" onChange={() => {}} />`,
          )
          .replace(
            overviewReturn,
            `  return (\n    <>\n      <MaybeOwner fallback={${fallback === 'null' ? 'null' : "'fixed'"}} />\n      <div className="outliner project-outliner">`,
          ),
      )
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': nullishComponentProp('fixed'),
      }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': nullishComponentProp('null'),
      }),
    ).toEqual([])

    const optionalComponentProp = (config: 'null' | 'show') =>
      mutateOverview((source) =>
        source
          .replace(
            overviewMarker,
            `${overviewMarker}\n  const MaybeOwner = (candidate: { config: { show: boolean } | null }) =>\n    candidate.config?.show && <DsTextInput value="#fff" onChange={() => {}} />`,
          )
          .replace(
            overviewReturn,
            `  return (\n    <>\n      <MaybeOwner config={${config === 'null' ? 'null' : '{ show: true }'}} />\n      <div className="outliner project-outliner">`,
          ),
      )
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': optionalComponentProp('null'),
      }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')
    expect(
      validateAdoption(withTextOwner, {
        'ProjectWorkbenchTab.tsx': optionalComponentProp('show'),
      }),
    ).toEqual([])

    const missingOptionalProp = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const MaybeOwner = (candidate: { show?: boolean }) =>\n    candidate.show && <DsTextInput value="#fff" onChange={() => {}} />`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <MaybeOwner />\n      <div className="outliner project-outliner">',
        ),
    )
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': missingOptionalProp }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const shadowedOwner = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const DsTextInput = (_props: unknown) => null`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <DsTextInput value="#fff" onChange={() => {}} />\n      <div className="outliner project-outliner">',
        ),
    )
    expect(validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': shadowedOwner })).toContain(
      'project/overview field owner DsTextInput is not rendered by its routed field root',
    )

    const hoistedVarShadow = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  if (false) { var DsTextInput = (_props: unknown) => null }`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <DsTextInput value="#fff" onChange={() => {}} />\n      <div className="outliner project-outliner">',
        ),
    )
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': hoistedVarShadow }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const shadowedConsumer = mutateOverview((source) =>
      source
        .replace(overviewMarker, `${overviewMarker}\n  const DsCard = (_props: unknown) => null`)
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <DsCard><DsTextInput value="#fff" onChange={() => {}} /></DsCard>\n      <div className="outliner project-outliner">',
        ),
    )
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': shadowedConsumer }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const shadowedFragment = mutateOverview((source) =>
      source
        .replace(overviewMarker, `${overviewMarker}\n  const Fragment = (_props: unknown) => null`)
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <Fragment><DsTextInput value="#fff" onChange={() => {}} /></Fragment>\n      <div className="outliner project-outliner">',
        ),
    )
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': shadowedFragment }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const parameterShadow = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const MaybeOwner = ({ DsTextInput }: { DsTextInput: unknown }) =>\n    <DsTextInput value="#fff" onChange={() => {}} />`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <MaybeOwner DsTextInput="div" />\n      <div className="outliner project-outliner">',
        ),
    )
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': parameterShadow }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const nestedLiveBinding = mutateOverview((source) =>
      source.replace(
        overviewMarker,
        `${overviewMarker}\n  if (Math.random() > 0.5) {\n    const nestedOwner = <DsTextInput value="#fff" onChange={() => {}} />\n    return nestedOwner\n  }`,
      ),
    )
    expect(nestedLiveBinding).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': nestedLiveBinding }),
    ).toEqual([])

    const nativeFunctionChild = mutateOverview((source) =>
      source.replace(
        overviewReturn,
        '  return (\n    <>\n      <div>{() => <DsTextInput value="#fff" onChange={() => {}} />}</div>\n      <div className="outliner project-outliner">',
      ),
    )
    expect(nativeFunctionChild).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': nativeFunctionChild }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const ignoredComponentProp = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const Sink = (_props: { decoy?: unknown }) => <div />`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <Sink decoy={<DsTextInput value="#fff" onChange={() => {}} />} />\n      <div className="outliner project-outliner">',
        ),
    )
    expect(ignoredComponentProp).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': ignoredComponentProp }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const ignoredFunctionChild = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const EffectField = (_props: { children: () => unknown }) => <div />`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <EffectField>{() => <DsTextInput value="#fff" onChange={() => {}} />}</EffectField>\n      <div className="outliner project-outliner">',
        ),
    )
    expect(ignoredFunctionChild).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': ignoredFunctionChild }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const consumedFunctionChild = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const RenderField = (candidate: { children: () => unknown }) => (\n    <div>{candidate.children()}</div>\n  )`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      <RenderField>{() => <DsTextInput value="#fff" onChange={() => {}} />}</RenderField>\n      <div className="outliner project-outliner">',
        ),
    )
    expect(consumedFunctionChild).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': consumedFunctionChild }),
    ).toEqual([])

    const objectSiblingDecoy = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const panels = { shown: null, dead: <DsTextInput value="#fff" onChange={() => {}} /> }`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      {panels.shown}\n      <div className="outliner project-outliner">',
        ),
    )
    expect(objectSiblingDecoy).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': objectSiblingDecoy }),
    ).toContain('project/overview field owner DsTextInput is not rendered by its routed field root')

    const selectedObjectMember = mutateOverview((source) =>
      source
        .replace(
          overviewMarker,
          `${overviewMarker}\n  const panels = { shown: <DsTextInput value="#fff" onChange={() => {}} />, dead: null }`,
        )
        .replace(
          overviewReturn,
          '  return (\n    <>\n      {panels.shown}\n      <div className="outliner project-outliner">',
        ),
    )
    expect(selectedObjectMember).not.toBe(projectSource)
    expect(
      validateAdoption(withTextOwner, { 'ProjectWorkbenchTab.tsx': selectedObjectMember }),
    ).toEqual([])
  }, 60_000)

  test('keeps project field ownership route-aware inside the shared workbench file', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const startup = matrix.pages.find((page) => page.registry === 'project/startup')
    const entrypoint = matrix.pages.find((page) => page.registry === 'project/entrypoint')

    expect(validateAdoption(matrix)).toEqual([])
    expect(entrypoint.owners.field).toContain('DsAddPickerDialog')

    const borrowedOwner = structuredClone(matrix)
    borrowedOwner.pages.find((page) => page.registry === 'project/startup').owners.field =
      'DsFieldGroup + DsAddPickerDialog'
    expect(validateAdoption(borrowedOwner)).toContain(
      'project/startup field owner DsAddPickerDialog is not rendered by its routed field root',
    )

    const omittedOwner = structuredClone(matrix)
    omittedOwner.pages.find((page) => page.registry === 'project/entrypoint').owners.field =
      'DsFieldGroup + DsDraftTextField + DsSelectField'
    expect(validateAdoption(omittedOwner)).toContain(
      'project/entrypoint renders unregistered field/control owner DsAddPickerDialog',
    )

    const wrongRoute = structuredClone(matrix)
    wrongRoute.pages.find((page) => page.registry === 'project/startup').ownerEvidence.field = [
      { source: 'ProjectWorkbenchTab.tsx', component: 'EntryPointEditor' },
    ]
    expect(validateAdoption(wrongRoute)).toContain(
      'project/startup field evidence must exactly match routed roots ProjectWorkbenchTab.tsx@ProjectStartupPage',
    )

    const missingScope = structuredClone(matrix)
    missingScope.pages.find((page) => page.registry === 'project/startup').ownerEvidence.field = [
      { source: 'ProjectWorkbenchTab.tsx', component: 'MissingStartupPage' },
    ]
    expect(validateAdoption(missingScope)).toContain(
      'project/startup field evidence must exactly match routed roots ProjectWorkbenchTab.tsx@ProjectStartupPage',
    )
    expect(startup.ownerEvidence.field).toEqual([
      { source: 'ProjectWorkbenchTab.tsx', component: 'ProjectStartupPage' },
    ])
  }, 15_000)

  test('follows registered cross-file components and rejects page wrappers as field owners', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))

    const hiddenAudioOwners = structuredClone(matrix)
    const music = hiddenAudioOwners.pages.find((page) => page.registry === 'asset/music')
    music.ownerEvidence.field = [{ source: 'MusicTab.tsx', component: 'MusicTab' }]
    music.owners.field = 'AudioAssetWorkbench'
    expect(validateAdoption(hiddenAudioOwners)).toContain(
      'asset/music field owner AudioAssetWorkbench is not a governed field/control owner',
    )

    const omittedCrossFileOwner = structuredClone(matrix)
    omittedCrossFileOwner.pages.find((page) => page.registry === 'asset/music').owners.field =
      'MediaAssetNameField'
    expect(validateAdoption(omittedCrossFileOwner)).toContain(
      'asset/music renders unregistered field/control owner DsReadoutList',
    )

    const pageWrapper = structuredClone(matrix)
    const entrypoint = pageWrapper.pages.find((page) => page.registry === 'project/entrypoint')
    entrypoint.ownerEvidence.field.push({
      source: 'EntryPointTab.tsx',
      component: 'EntryPointTab',
    })
    entrypoint.owners.field = 'ProjectWorkbenchTab'
    expect(validateAdoption(pageWrapper)).toContain(
      'project/entrypoint field owner ProjectWorkbenchTab is not a governed field/control owner',
    )
  })

  test('rejects borrowed owners, omitted route branches, and N/A used to hide live fields', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))

    const startupBorrow = structuredClone(matrix)
    const startup = startupBorrow.pages.find((page) => page.registry === 'project/startup')
    startup.ownerEvidence.field.push({
      source: 'ProjectWorkbenchTab.tsx',
      component: 'EntryPointEditor',
    })
    startup.owners.field += ' + DsAddPickerDialog'
    expect(validateAdoption(startupBorrow)).toEqual(
      expect.arrayContaining([
        'project/startup field evidence must exactly match routed roots ProjectWorkbenchTab.tsx@ProjectStartupPage',
        'project/startup field owner DsAddPickerDialog is not rendered by its routed field root',
      ]),
    )

    const hiddenMusic = structuredClone(matrix)
    const music = hiddenMusic.pages.find((page) => page.registry === 'asset/music')
    music.components = music.components.filter((source) => source !== 'AudioAssetWorkbench.tsx')
    music.owners.field = 'N/A: pretend the routed workbench is read-only'
    expect(validateAdoption(hiddenMusic)).toEqual(
      expect.arrayContaining([
        'asset/music routed field source is not registered: AudioAssetWorkbench.tsx',
        expect.stringMatching(/^asset\/music field owner is N\/A but renders /),
      ]),
    )

    const borrowedStampDialog = structuredClone(matrix)
    borrowedStampDialog.pages.find((page) => page.registry === 'map/stamp').owners.field +=
      ' + DsFieldGroup'
    expect(validateAdoption(borrowedStampDialog)).toContain(
      'map/stamp field owner DsFieldGroup is not rendered by its routed field root',
    )

    const missingSpriteBranch = structuredClone(matrix)
    missingSpriteBranch.pages.find((page) => page.registry === 'asset/sprite').ownerEvidence.field =
      [{ source: 'WorldSpriteLibrary.tsx', component: 'WorldSpriteLibrary' }]
    expect(validateAdoption(missingSpriteBranch)).toContain(
      'asset/sprite field evidence must exactly match routed roots BattleSpriteLibrary.tsx@BattleSpriteLibrary, WorldSpriteLibrary.tsx@WorldSpriteLibrary',
    )

    const borrowedSceneSource = structuredClone(matrix)
    borrowedSceneSource.pages.find(
      (page) => page.registry === 'scene/workspace',
    ).ownerEvidence.field = [{ source: 'ScriptDrawer.tsx', component: 'ScriptDrawer' }]
    expect(validateAdoption(borrowedSceneSource)).toContain(
      'scene/workspace field evidence must exactly match routed roots App.tsx@App',
    )

    const borrowedProjectOwner = structuredClone(matrix)
    borrowedProjectOwner.pages.find((page) => page.registry === 'scene/workspace').owners.field +=
      ' + DsFieldGroup'
    expect(validateAdoption(borrowedProjectOwner)).toContain(
      'scene/workspace field owner DsFieldGroup is not rendered by its routed field root',
    )

    const dataEntrypoint = structuredClone(matrix)
    dataEntrypoint.pages.find(
      (page) => page.registry === 'project/entrypoint',
    ).ownerEvidence.field = [{ source: 'EntryPointTab.tsx', component: 'EntryPointTab' }]
    expect(validateAdoption(dataEntrypoint)).toContain(
      'project/entrypoint field evidence must exactly match routed roots ProjectWorkbenchTab.tsx@EntryPointEditor',
    )
  }, 15_000)

  test('requires an explanation when field ownership is not applicable', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'design-system-adoption.json'), 'utf8'))
    const synthetic = structuredClone(matrix)
    synthetic.pages.find((page) => page.registry === 'story/events').owners.field = 'N/A:'
    expect(validateAdoption(synthetic)).toContain(
      'story/events field owner N/A must include an explanation',
    )
  })

  test('passes the registry, DataMode return, allowlist, and source AST closure', () => {
    const output = execFileSync(process.execPath, ['scripts/audit-legacy-controls.mjs', '--gate'], {
      cwd: packageRoot,
      encoding: 'utf8',
    })
    expect(output).toContain('design-system gate passed: 92 files, 2 evidence-bound exceptions')
  }, 15_000)

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
    expect(allowlist.entries).toHaveLength(2)
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

  test('rejects navigation glyphs embedded in standard action labels without blocking direction controls', () => {
    expect(isEmbeddedNavigationGlyphAction('DsButton', '<DsButton>前往预览 ↗</DsButton>')).toBe(
      true,
    )
    expect(
      isEmbeddedNavigationGlyphAction(
        'DsButton',
        '<DsButton aria-label="沿地图坐标向右上移动">↗</DsButton>',
      ),
    ).toBe(false)
    expect(isEmbeddedNavigationGlyphAction('DsReferenceRow', '打开 ↗')).toBe(true)
    expect(isEmbeddedNavigationGlyphAction('DsButton', '← 返回')).toBe(true)
    expect(isEmbeddedNavigationGlyphAction('DsButton', '跳转 →')).toBe(true)
    expect(
      findEmbeddedNavigationGlyphActions(
        `<DsDiagnosticRow action={{ label: '跳转 ↗', onActivate }} />`,
      ),
    ).toEqual([{ line: 1, tag: 'DsDiagnosticRow' }])
  })
})
