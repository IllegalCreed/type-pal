import ts from 'typescript'
import { describe, expect, test } from 'vitest'
import mainSource from './main.ts?raw'
import motionSource from './world-motion-runtime.ts?raw'
import presentationSource from './world-scene-presentation.ts?raw'

const mainAst = ts.createSourceFile('main.ts', mainSource, ts.ScriptTarget.Latest, true)

function nodes(predicate: (node: ts.Node) => boolean): ts.Node[] {
  const found: ts.Node[] = []
  const visit = (node: ts.Node): void => {
    if (predicate(node)) found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(mainAst)
  return found
}

function body(name: string): string {
  const matches = nodes(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  ) as ts.FunctionDeclaration[]
  expect(matches, `unique function ${name}`).toHaveLength(1)
  return matches[0]!.body!.getText(mainAst)
}

function expectOrder(source: string, needles: readonly string[]): void {
  let cursor = -1
  for (const needle of needles) {
    const next = source.indexOf(needle, cursor + 1)
    expect(next, `missing ${needle}`).toBeGreaterThan(cursor)
    cursor = next
  }
}

describe('A3 world runtime ownership', () => {
  test('main constructs one motion and one drawing owner without retaining the displaced state cells', () => {
    expect(mainSource.match(/new WorldMotionRuntime\(/g)).toHaveLength(1)
    expect(mainSource.match(/new WorldScenePresentation\(/g)).toHaveLength(1)
    const declarations = new Set(
      nodes((node) => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)).map((node) =>
        (node as ts.VariableDeclaration).name.getText(mainAst),
      ),
    )
    for (const stale of [
      'worldMoveAcc',
      'worldTickNum',
      'worldTicksThisFrame',
      'nextMotionCommandEpoch',
      'entityWalkPhase',
      'entityGaitOwner',
      'entityLastMovedWorldTick',
      'entityExplicitAnim',
      'motionSideSticks',
      'motionFairnessClock',
      'motionTrace',
      'playerMotionDirection',
      'worldShake',
      'worldWave',
      'waveCanvas',
      'entityFrameOverride',
      'partyGesture',
    ])
      expect(declarations, stale).not.toContain(stale)
  })

  test('the existing coordinator remains the sole slot/authority owner under the aggregate runtime', () => {
    expect(mainSource).not.toContain('new MotionRuntimeCoordinator')
    expect(motionSource.match(/new MotionRuntimeCoordinator</g)).toHaveLength(1)
    expect(motionSource).toContain('readonly coordinator: MotionRuntimeCoordinator')
    expect(mainSource).toContain('const motionRuntime = motion.coordinator')
    expect(mainSource).toContain('const scriptMotionSlots = motionRuntime.scriptSlots')
    expect(mainSource).toContain('const autoMotionSlots = motionRuntime.autoSlots')
    expect(motionSource).not.toContain('RuntimeContext')
    expect(presentationSource).not.toContain('RuntimeContext')
  })

  test('advanceMoves retains sample, plan, atomic commit and queued continuation order', () => {
    const source = body('advanceMoves')
    expectOrder(source, [
      'cameraSession.advance(dt)',
      'drainPendingTouchTrigger()',
      'heldDir()',
      'motion.advanceCadence(dt, locomotionFrozen)',
      'const partyBypassOwnedTick = motion.partyMove !== null',
      'const partyMove = motion.partyMove',
      'const { plan, previousSideSticks } = motion.plan',
      'motion.recordTrace',
      'commitMotionBatch',
      'commitCanonicalEndpoints:',
      'commitLivePositions:',
      'runTouch:',
      'runPostContact:',
      'queueContinuations:',
      'setTimeout',
    ])
  })

  test('render keeps world sampling before overlays and output effects', () => {
    const source = body('render')
    expectOrder(source, [
      'const scriptConfirm = scriptConfirmModal.view',
      'const heldEntryFrame = sceneEntrySession.heldFrame',
      'updateCamera()',
      'deriveFollowers()',
      'worldPresentation.sprites',
      'worldPresentation.renderWorld',
      'drawCollisionOverlay()',
      'drawCinematicLayer()',
      'drawFadeCurtain()',
      'if (shop)',
      'if (dialogBox.active)',
      'if (menus.active)',
      'applyAmbienceTint()',
      'const dither = ditherTransition.active',
      'syncDitherDebugDataset()',
    ])
  })

  test('scene teardown invalidates mutations before slots and resets camera after motion dependants', () => {
    const source = body('stopAutoRunners')
    expectOrder(source, [
      'invalidatePendingScriptMutations()',
      'motion.teardownScene',
      'beforeCancelSlots:',
      'beforeReleaseAllAuthority:',
      'hostileCd.clear()',
      'pendingTouchTrigger.clear()',
      'cameraSession.reset()',
    ])
  })
})
