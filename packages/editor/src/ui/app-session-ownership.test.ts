import ts from 'typescript'
import { describe, expect, test } from 'vitest'
import appSource from './App.tsx?raw'
import trialSource from './use-battle-trial-session.ts?raw'
import projectSource from './use-editor-project-session.ts?raw'

const ast = ts.createSourceFile(
  'App.tsx',
  appSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
)

function nodes(predicate: (node: ts.Node) => boolean): ts.Node[] {
  const found: ts.Node[] = []
  const visit = (node: ts.Node): void => {
    if (predicate(node)) found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return found
}

function hookCalls(name: string): ts.CallExpression[] {
  return nodes(
    (node) =>
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === name,
  ) as ts.CallExpression[]
}

function directStateBindings(hook: 'useState' | 'useRef'): Set<string> {
  const result = new Set<string>()
  for (const call of hookCalls(hook)) {
    const declaration = call.parent
    if (!ts.isVariableDeclaration(declaration)) continue
    const collect = (name: ts.BindingName): void => {
      if (ts.isIdentifier(name)) result.add(name.text)
      else
        for (const element of name.elements) if (ts.isBindingElement(element)) collect(element.name)
    }
    collect(declaration.name)
  }
  return result
}

function inputKeys(name: string): string[] {
  const calls = hookCalls(name)
  expect(calls, `unique ${name}`).toHaveLength(1)
  const input = calls[0]!.arguments[0]
  if (!input) return []
  expect(ts.isObjectLiteralExpression(input), `${name} receives an object port`).toBe(true)
  if (!ts.isObjectLiteralExpression(input)) return []
  return input.properties.map((property) => property.name?.getText(ast) ?? '')
}

describe('editor app session ownership', () => {
  test('the editor shell constructs each extracted owner once through an explicit port', () => {
    expect(inputKeys('useEditorNavigationSession')).toEqual(['workspaceId', 'onPageChanged'])
    expect(inputKeys('useSceneWorkspaceSession')).toEqual([
      'location',
      'applyLocation',
      'scenes',
      'defaultSceneId',
      'actors',
      'sprites',
    ])
    expect(inputKeys('useEditorProjectSession')).toEqual([
      'main',
      'script',
      'projectGuard',
      'projectSource',
      'workspace',
      'initialDirectory',
      'initialWarning',
      'authorBaseline',
      'forceSandbox',
      'onOpened',
      'onBackToPicker',
    ])
    expect(inputKeys('useBattleTrialSession')).toEqual([
      'main',
      'script',
      'projectGuard',
      'projectSource',
      'playIdentity',
      'getLocalDirectory',
      'getAuthorBaseline',
      'onResult',
    ])
  })

  test('the editor shell no longer creates the displaced navigation, scene, project or trial cells', () => {
    const state = directStateBindings('useState')
    const refs = directStateBindings('useRef')
    for (const stale of [
      'location',
      'moduleLocations',
      'selected',
      'sceneLifecycleIntent',
      'placingEntity',
      'scriptChannel',
      'selectedBehavior',
      'selectedPage',
      'canvasLayers',
      'placeSceneId',
      'placeMode',
      'placeActorId',
      'placeSpriteId',
      'placeZoneRanges',
      'trialDraft',
      'trialSubject',
      'trialLeave',
      'saveErr',
      'saveActivity',
    ])
      expect(state, stale).not.toContain(stale)
    for (const stale of [
      'storedNavigationRef',
      'locationRef',
      'moduleLocationsRef',
      'scrollPositionsRef',
      'trialWindows',
      'trialMounted',
      'dirHandleRef',
      'saveAttemptDirRef',
      'snapshotRef',
      'authorBaselineRef',
      'firstSaveAuthorRef',
    ])
      expect(refs, stale).not.toContain(stale)
  })

  test('project and trial implementations own their resource protocols without importing the shell', () => {
    expect(appSource).not.toContain('launchBattleTrial(')
    expect(appSource).not.toContain('withAuthorizedWorkspaceMutation(')
    expect(projectSource).toContain('withAuthorizedWorkspaceMutation(')
    expect(projectSource).toContain("projectGuard.begin('save'")
    expect(projectSource).toContain("projectGuard.begin('save-as'")
    expect(projectSource).toContain("projectGuard.begin('export'")
    expect(trialSource).toContain('launchBattleTrial({')
    expect(trialSource).toContain('for (const trial of windows) trial.close()')
    expect(projectSource).not.toContain("from './App")
    expect(trialSource).not.toContain("from './App")
  })
})
