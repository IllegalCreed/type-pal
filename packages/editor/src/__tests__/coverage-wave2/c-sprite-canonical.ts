/** Current guarded author source; shell comes from the real project loader, never hand-made old scripts. */
import {
  type AuthorCommand,
  type AuthorSceneDef,
  type AuthorScriptFlow,
  type AuthorScriptLibrary,
  checkAuthorScriptFlow,
  checkAuthorScriptLibrary,
  validateAuthorScenes,
} from '@type-pal/content'
import { loadCurrentProjectFrom } from '@type-pal/reforge'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../../core/__tests__/battle-trial-project.js'
import { toEditorState } from '../../core/project-io.js'

export function currentFlow(body: AuthorCommand[]): AuthorScriptFlow {
  const flow: AuthorScriptFlow = { kind: 'stages', initial: 'main', stages: [{ id: 'main', body }] }
  checkAuthorScriptFlow(flow, 'fixture.flow')
  return flow
}
export function guardedLibrary(library: AuthorScriptLibrary): AuthorScriptLibrary {
  checkAuthorScriptLibrary(library, 'fixture.library')
  return library
}
export async function spriteFixture() {
  const project = await loadCurrentProjectFrom(fixtureSource(await battleTrialProjectFiles()))
  const shell = toEditorState(project, [project.authorContent.entryScene], {}, {}, [])
  const scene: AuthorSceneDef = {
    id: 's1',
    mapId: 'map.root',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: ['a', 'b'].map((id) => ({
      id,
      sprite: 'sprite.same',
      pos: { col: 0, row: 0, height: 0 },
      initialPage: 'main',
      pages: [{ id: 'main', label: 'Main', auto: 'idle' }],
      behaviors: {
        auto: {
          idle: {
            label: 'Idle',
            order: 0,
            flow: currentFlow([
              {
                kind: 'setEntityFrame',
                target: { scene: 's1', entity: id },
                frame: id === 'a' ? 1 : 2,
              },
            ]),
          },
        },
      },
    })),
  }
  validateAuthorScenes([scene])
  shell.scenes = [
    {
      id: scene.id,
      mapId: scene.mapId,
      entry: scene.entry,
      entities: scene.entities.map((entity) => ({
        id: entity.id,
        sprite: 'sprite.same',
        pos: entity.pos,
      })),
    },
  ]
  return { shell, canonical: { scenes: [scene], sharedScripts: guardedLibrary({}) } }
}
