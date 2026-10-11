import type { AuthorSceneDef } from '@type-pal/content'
import type { ScriptPreviewLibrary } from '../script-preview-library.js'

/** Uses the blank project's real map/sprite IDs and legal staged flows. */
export function previewAuthorScene(): AuthorSceneDef {
  return {
    id: 'start',
    mapId: 'start',
    entry: { pos: { col: 1, row: 1, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'host',
        sprite: 'hero',
        pos: { col: 2, row: 3, height: 0 },
        facing: 'left',
        hidden: true,
        collide: true,
        zBias: 4,
        initialPage: 'default',
        pages: [{ id: 'default', label: '默认', trigger: 'greet' }],
        behaviors: {
          trigger: {
            greet: {
              label: '迎客',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'arrival',
                stages: [
                  { id: 'arrival', label: '迎客前', body: [{ kind: 'wait', ms: 1 }] },
                  { id: 'return', label: '返回后', body: [] },
                ],
              },
            },
          },
        },
      },
      { id: 'guest', sprite: 'hero', pos: { col: 4, row: 5, height: 0 }, facing: 'down' },
    ],
  }
}

export function previewLibrary(): ScriptPreviewLibrary {
  return {
    kind: 'type-pal-script-preview',
    version: 1,
    states: [
      {
        id: 'door',
        sceneId: 'start',
        name: '迎客前',
        entities: [
          {
            entityId: 'host',
            pos: { col: 6, row: 7, height: 1 },
            facing: 'up',
            hidden: false,
            collide: false,
            zBias: 0,
          },
          { entityId: 'guest', pos: { col: 8, row: 9, height: 0 } },
        ],
      },
      { id: 'room', sceneId: 'start', name: '返回后', entities: [{ entityId: 'host' }] },
    ],
    bindings: [
      {
        entry: {
          sceneId: 'start',
          entityId: 'host',
          channel: 'trigger',
          schemeId: 'greet',
          stageId: 'arrival',
        },
        stateId: 'door',
      },
    ],
  }
}
