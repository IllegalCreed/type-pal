// Test-only fixtures. GLM batch-2 supplied the original cases; no audit code is imported.
import {
  buildEntityLifecycleReferenceIndex,
  buildWorld,
  type RuntimeSceneDef,
  type WorldState,
} from '@type-pal/content'
import ts from 'typescript'
import mainSource from '../main.ts?raw'
import type { ProjectScriptHostOptions } from '../runtime-script-project.js'

export { mainSource }
export const digest = 'c'.repeat(64)
export function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

export const hero = {
  id: 'hero',
  name: 'hero',
  spriteId: 'sprite.hero',
  battler: {
    baseStats: {
      level: 1,
      hp: 10,
      maxHP: 10,
      mp: 5,
      maxMP: 5,
      attack: 1,
      defense: 1,
      magicAttack: 1,
      speed: 1,
      luck: 1,
    },
    initialEquipment: {},
    initialMagic: [],
    battleSprite: 'battle.hero',
  },
}
export function worldFixture(): WorldState {
  return buildWorld({ party: ['hero'], money: 10, inventory: [] }, { hero })
}
export function sceneFixture(id = 'target'): RuntimeSceneDef {
  return {
    id,
    mapId: 'map.old',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'entity',
        zone: true,
        pos: { col: 1, row: 1, height: 0 },
        initialPage: 'first',
        behaviors: {
          trigger: {
            first: {
              label: 'first',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'one',
                stages: [
                  { id: 'one', body: [] },
                  { id: 'two', body: [] },
                ],
              },
            },
            second: {
              label: 'second',
              order: 1,
              flow: { kind: 'stages', initial: 'one', stages: [{ id: 'one', body: [] }] },
            },
          },
        },
        pages: [
          {
            id: 'first',
            label: 'first',
            trigger: 'first',
            triggerActivation: { on: 'interact', range: 1 },
          },
          {
            id: 'second',
            label: 'second',
            trigger: 'second',
            triggerActivation: { on: 'touch', range: 2 },
          },
        ],
      },
    ],
    hooks: {
      onEnter: {
        initial: 'before',
        variants: {
          before: {
            label: 'before',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [
                {
                  id: 'one',
                  body: [],
                  entry: { prepare: [], reveal: { kind: 'fade', outMs: 10, inMs: 10 } },
                },
                { id: 'two', body: [], entry: { prepare: [], reveal: { kind: 'cut' } } },
              ],
            },
          },
          after: {
            label: 'after',
            order: 1,
            flow: {
              kind: 'stateMachine',
              machine: {
                id: 'entry-machine',
                label: 'entry',
                initial: 'one',
                states: {
                  one: {
                    label: 'one',
                    body: [],
                    next: { kind: 'stay' },
                    entry: { prepare: [], reveal: { kind: 'cut' } },
                  },
                  two: {
                    label: 'two',
                    body: [],
                    next: { kind: 'stay' },
                    entry: { prepare: [], reveal: { kind: 'fade', outMs: 20, inMs: 20 } },
                  },
                },
              },
            },
          },
        },
      },
      onTeleport: {
        initial: 'exit',
        variants: {
          exit: {
            label: 'exit',
            order: 0,
            flow: { kind: 'stages', initial: 'one', stages: [{ id: 'one', body: [] }] },
          },
        },
      },
    },
  }
}
export function hostOptions(
  scene: RuntimeSceneDef,
  overrides: Partial<ProjectScriptHostOptions> = {},
): ProjectScriptHostOptions {
  return {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
    scene: () => scene,
    currentSceneId: () => 'source',
    currentSceneSessionId: () => 'session-1',
    executeEffect: () => {},
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 10,
      inParty: () => true,
      entityInScene: () => true,
      facingEntity: () => false,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    ...overrides,
  }
}

/** Extract real production bodies, not copied implementations; fail loudly on missing/ambiguous names. */
export function mainApi<T>(
  names: readonly string[],
  properties: readonly string[],
  env: object,
  source = mainSource,
): T {
  const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const found = new Map<string, string>()
  const save = (name: string, value: string) => {
    if (found.has(name)) throw new Error(`ambiguous main binding ${name}`)
    found.set(name, value)
  }
  function walk(node: ts.Node): void {
    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      names.includes(node.name.text)
    ) {
      save(
        node.name.text,
        ts.isFunctionDeclaration(node) ? node.getText(ast) : `const ${node.getText(ast)};`,
      )
    }
    if (ts.isPropertyAssignment(node) && properties.includes(node.name.getText(ast))) {
      save(
        node.name.getText(ast),
        `const ${node.name.getText(ast)} = ${node.initializer.getText(ast)};`,
      )
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  for (const name of [...names, ...properties])
    if (!found.has(name)) throw new Error(`missing main binding ${name}`)
  const js = ts.transpileModule([...found.values()].join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  return new Function(
    'env',
    `with(env) { ${js}; return {${[...names, ...properties].join(',')}}; }`,
  )(env) as T
}
