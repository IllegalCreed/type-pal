import type {
  AuthorCommand,
  AuthorItemData,
  AuthorSceneDef,
  AuthorScriptFlow,
} from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadProjectMap,
} from '@type-pal/reforge'
import { DeleteSceneCommand } from '../commands.js'
import { EditSession } from '../edit-session.js'
import { EditorHistoryCoordinator } from '../editor-history-coordinator.js'
import { createEditorDiagnosticsSnapshotCollector } from '../project-diagnostics.js'
import { serializeProjectWithMapCopies, toEditorState } from '../project-io.js'
import { createProjectReferenceIndex, type ProjectReferenceIndex } from '../project-reference.js'
import {
  collectCurrentProjectReferenceIndex,
  createCurrentProjectReferenceIndexProvider,
} from '../project-reference-adapters.js'
import {
  DeleteSceneDefinitionCommand,
  type ScriptCommandOwner,
  ScriptEditSession,
} from '../script-editor.js'
import { mergeEditorProjectionWithCurrentAuthorState } from '../script-editor-projection.js'
import { buildBlankProject } from '../seed.js'
import { memoryAuthorDirectory } from './author-save-fixture.js'

export const targetScene = { kind: 'scene', id: 'target' } as const
export const sourceScene = { kind: 'scene', id: 'start' } as const
export const ownerKinds = ['onEnter', 'onTeleport', 'trigger', 'auto', 'shared', 'item'] as const
export type GuardOwnerKind = (typeof ownerKinds)[number]

export function stageFlow(body: AuthorCommand[] = []): AuthorScriptFlow {
  return { kind: 'stages', initial: 'initial', stages: [{ id: 'initial', body }] }
}

export function transitionFlow(nested = false): AuthorScriptFlow {
  return {
    kind: 'stateMachine',
    machine: {
      id: 'guard-machine',
      label: '引用保护状态机',
      initial: 'one',
      states: {
        one: {
          label: '检查场景',
          body: [],
          next: {
            kind: 'branch',
            cond: nested
              ? {
                  kind: 'all',
                  of: [
                    { kind: 'currentScene', scene: 'target' },
                    {
                      kind: 'any',
                      of: [{ kind: 'not', cond: { kind: 'currentScene', scene: 'target' } }],
                    },
                  ],
                }
              : { kind: 'currentScene', scene: 'target' },
            then: nested
              ? {
                  kind: 'branch',
                  cond: { kind: 'currentScene', scene: 'target' },
                  then: { kind: 'stay' },
                  else: { kind: 'stay' },
                }
              : { kind: 'stay' },
            else: { kind: 'stay' },
          },
        },
      },
    },
  }
}

export function sceneReferences(index: ProjectReferenceIndex) {
  return index.deletionImpact(targetScene, index.deletionScopeFor([targetScene])).references
}

/** Real seed → current loader → author/main sessions. No project or validator mocks. */
export async function sceneGuardFixture(
  flow: AuthorScriptFlow = stageFlow(),
  kind: GuardOwnerKind = 'onEnter',
) {
  const disk = memoryAuthorDirectory(await buildBlankProject('scene-reference-guard'))
  const start: AuthorSceneDef = disk.json('content/scenes/start.json')
  const target: AuthorSceneDef = {
    ...structuredClone(start),
    id: 'target',
    entities: [],
    hooks: {
      onEnter: { variants: { main: { label: '入口方案', order: 0, flow: stageFlow() } } },
      onTeleport: { variants: { main: { label: '出口方案', order: 0, flow: stageFlow() } } },
    },
  }
  let owner: ScriptCommandOwner
  let path: string
  if (kind === 'onEnter' || kind === 'onTeleport') {
    start.hooks = { [kind]: { variants: { main: { label: '来源方案', order: 0, flow } } } }
    owner = { kind: 'scene-hook', sceneId: 'start', slot: kind, hookId: 'main' }
    path = `scenes.start.hooks.${kind}.variants.main.flow`
  } else if (kind === 'trigger' || kind === 'auto') {
    start.entities = [
      {
        id: 'zone',
        zone: true,
        pos: { ...start.entry.pos },
        behaviors: { [kind]: { main: { label: '来源行为', order: 0, flow } } },
      },
    ]
    owner = {
      kind: 'entity-behavior',
      sceneId: 'start',
      entityId: 'zone',
      channel: kind,
      behaviorId: 'main',
    }
    path = `scenes.start.entities.zone.behaviors.${kind}.main.flow`
  } else {
    if (flow.kind !== 'stages') throw new Error('shared/item fixture requires a command body')
    const body = flow.stages[0]!.body
    if (kind === 'shared') {
      disk.set('content/shared-scripts.json', { guard: { name: 'guard', self: 'none', body } })
      owner = { kind: 'shared-script', scriptId: 'guard' }
      path = 'sharedScripts.guard'
    } else {
      disk.set('content/items.json', [
        {
          id: 'guard-item',
          name: 'guard-item',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [{ kind: 'itemPrivateScript', script: { id: 'use', label: '检查', body } }],
          },
        } satisfies AuthorItemData,
      ])
      const locale = disk.json('content/locale.json')
      disk.set('content/locale.json', {
        ...locale,
        'guard-item': '引用测试道具',
        guard: '引用测试',
      })
      owner = { kind: 'item-private-script', itemId: 'guard-item', ability: 'use', scriptId: 'use' }
      path = 'items.guard-item.use.effects[0].script'
    }
  }
  disk.set('content/scenes/start.json', start)
  disk.set('content/scenes/target.json', target)
  const sceneIndex = disk.json('content/scenes/index.json')
  sceneIndex.scenes.push({ id: 'target', name: '目标场景', path: 'content/scenes/target.json' })
  disk.set('content/scenes/index.json', sceneIndex)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const main = new EditSession(toEditorState(project, scenes, {}, {}, []), {
    loadMap: (_id, path) => loadProjectMap(project.assetBase, path),
  })
  const script = new ScriptEditSession({
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  })
  const history = new EditorHistoryCoordinator(main, script)
  const mainReferences = createCurrentProjectReferenceIndexProvider(() => script.getStateSnapshot())
  const collect = createEditorDiagnosticsSnapshotCollector()
  const cold = () => mainReferences(main.getState())
  const warm = () =>
    createProjectReferenceIndex(
      collect(main.getState(), script.getStateSnapshot()).projectReferences,
    )
  const serialize = () =>
    serializeProjectWithMapCopies(
      mergeEditorProjectionWithCurrentAuthorState(script.getStateSnapshot(), main.getState()),
      source,
    )
  const deleteTarget = () =>
    history.dispatch(
      new DeleteSceneDefinitionCommand('target', (canonical) =>
        collectCurrentProjectReferenceIndex(main.getState(), canonical),
      ),
      new DeleteSceneCommand('target', mainReferences),
    )
  // Every normal fixture must pass the same save validation as the real workflow before testing it.
  await serialize()
  return {
    disk,
    source,
    project,
    main,
    script,
    history,
    owner,
    path,
    cold,
    warm,
    serialize,
    deleteTarget,
  }
}
