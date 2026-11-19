import type {
  AuthorCommand,
  AuthorItemData,
  AuthorSceneDef,
  AuthorStagesFlow,
} from '@type-pal/content'

export function selectBehavior(
  behavior: string,
  scene = 's001',
  channel: 'auto' | 'trigger' = 'auto',
): AuthorCommand {
  return {
    kind: 'selectEntityBehavior',
    target: { scene, entity: 'e1' },
    channel,
    selection: { kind: 'use', value: behavior },
  }
}

export function selectHook(id: string, scene = 's001'): AuthorCommand {
  return {
    kind: 'selectSceneHooks',
    scene,
    selection: { onEnter: { kind: 'use', value: id } },
  }
}

export function stages(body: AuthorCommand[]): AuthorStagesFlow {
  return { kind: 'stages', initial: 'main', stages: [{ id: 'main', body }] }
}

export function scheme(label: string, order: number, body: AuthorCommand[] = []) {
  return { label, order, flow: stages(body) }
}

export function schemeItem(id: string, name: string, body: AuthorCommand[]): AuthorItemData {
  return {
    id,
    name,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'itemPrivateScript', script: { id: 'use', body } }],
    },
  }
}

export function schemeScene(
  id: string,
  behaviors: NonNullable<AuthorSceneDef['entities'][number]['behaviors']>,
  hooks?: AuthorSceneDef['hooks'],
): AuthorSceneDef {
  return {
    id,
    mapId: 'map-1',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [{ id: 'e1', pos: { col: 0, row: 0, height: 0 }, zone: true, behaviors }],
    ...(hooks === undefined ? {} : { hooks }),
  }
}
