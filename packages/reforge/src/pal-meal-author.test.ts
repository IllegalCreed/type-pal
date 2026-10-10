import type { AuthorCommand } from '@type-pal/content'
import { validateAuthorItems, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import itemsJson from '../../../projects/pal/content/items.json' with { type: 'json' }
import roomsJson from '../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import innJson from '../../../projects/pal/content/scenes/s003.json' with { type: 'json' }

const scenes = validateAuthorScenes([roomsJson, innJson])
const wine = validateAuthorItems(itemsJson).find((item) => item.id === '272')!
function entity(scene: string, id: string) {
  const value = scenes
    .find((candidate) => candidate.id === scene)
    ?.entities.find((candidate) => candidate.id === id)
  if (!value) throw new Error(`missing canonical ${scene}/${id}`)
  return value
}
function body(scene: string, id: string, behavior: string): AuthorCommand[] {
  const flow = entity(scene, id).behaviors?.trigger?.[behavior]?.flow
  if (!flow || flow.kind !== 'stages')
    throw new Error(`missing canonical flow ${scene}/${id}/${behavior}`)
  const stage = flow.stages.find((candidate) => candidate.id === flow.initial)
  if (!stage) throw new Error('canonical initial step missing')
  return stage.body
}
function privateBody(): AuthorCommand[] {
  const effect = wine.use?.effects.find((candidate) => candidate.kind === 'itemPrivateScript')
  if (!effect || effect.kind !== 'itemPrivateScript') throw new Error('wine private use missing')
  return effect.script.body
}

const giftRows = [
  172, 173, 175, 176, 178, 180, 182, 183, 185, 187, 188, 190, 192, 193, 195, 197, 198, 199, 201,
  202, 203,
]
  .map((id) => `dlg.${id}`)
  .concat(['dlg.204.v-8ce072c3', 'dlg.205', 'dlg.207', 'dlg.209'])

test('wine private use only guards, selects and explicitly awaits the NPC-owned gift', () => {
  expect(wine.use).toMatchObject({ target: 'scene', consuming: false, menuAfterUse: 'close' })
  const commands = privateBody()
  expect(commands[1]).toMatchObject({
    kind: 'branch',
    cond: {
      kind: 'not',
      cond: {
        kind: 'facingEntity',
        target: { scene: 's003', entity: 'e62' },
        range: 1,
      },
    },
    then: [{ kind: 'dialog' }, { kind: 'returnScript' }],
  })
  expect(commands).toHaveLength(4)
  expect(commands.slice(2)).toEqual([
    {
      kind: 'selectEntityBehavior',
      target: { scene: 's003', entity: 'e62' },
      channel: 'trigger',
      selection: { kind: 'use', value: 'c8-321c0a7d7de1' },
    },
    { kind: 'runEntityTrigger', target: { scene: 's003', entity: 'e62' } },
  ])
  const gift = body('s003', 'e62', 'c8-321c0a7d7de1')
  expect(
    gift.flatMap((command) =>
      command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
    ),
  ).toEqual(giftRows)
  expect(gift.filter((command) => command.kind === 'loseItem')).toEqual([
    { kind: 'loseItem', itemId: '272' },
  ])
  expect(
    commands.filter((command) => command.kind === 'dialog' || command.kind === 'loseItem'),
  ).toEqual([])
  expect(JSON.stringify(commands)).not.toContain('setEntityTriggerActivation')
  expect(entity('s003', 'e62').behaviors?.trigger).toHaveProperty('c8-321c0a7d7de1')
})

test('drinking freezes only the beggar pose loop before changing its pose or dithering', () => {
  const commands = body('s003', 'e62', 'c8-321c0a7d7de1')
  const disable = commands.findIndex(
    (command) => command.kind === 'selectEntityBehavior' && command.channel === 'auto',
  )
  const pose = commands.findIndex(
    (command) => command.kind === 'setEntityFrame' && command.frame === 2,
  )
  expect(disable).toBeGreaterThanOrEqual(0)
  expect(disable).toBeLessThan(pose)
  expect(commands[disable]).toEqual({
    kind: 'selectEntityBehavior',
    channel: 'auto',
    target: { scene: 's003', entity: 'e62' },
    selection: { kind: 'disabled' },
  })
  expect(commands.filter((command) => command.kind === 'ditherScreen')).toEqual([
    { kind: 'ditherScreen', ms: 720 },
    { kind: 'ditherScreen', ms: 720 },
  ])
})

test('every kitchen-aunt interaction explicitly faces the party for dialogue then restores her work pose', () => {
  const aunt = entity('s001', 'e19')
  for (const behavior of Object.values(aunt.behaviors?.trigger ?? {})) {
    for (const stage of behavior.flow.stages) {
      const target = { scene: 's001', entity: 'e19' }
      expect(stage.body.slice(0, 2), `${behavior.label}/${stage.id}`).toEqual([
        { kind: 'faceEntityToParty', target },
        { kind: 'setEntityFrame', target, frame: 0 },
      ])
      expect(stage.body.slice(-2), `${behavior.label}/${stage.id}`).toEqual([
        { kind: 'setEntityFacing', target, facing: 'up' },
        { kind: 'setEntityFrame', target, frame: 0 },
      ])
    }
  }
})

test('kitchen idle is static; taking dishes turns the aunt back up after her complete instruction', () => {
  const aunt = entity('s001', 'e19')
  expect(aunt.facing).toBe('up')
  expect(aunt.behaviors?.auto).toBeUndefined()
  expect(aunt.pages?.every((page) => page.auto === undefined)).toBe(true)
  const commands = body('s001', 'e20', 'take-dishes')
  expect(commands.slice(0, 2)).toEqual([
    { kind: 'setEntityFacing', target: { scene: 's001', entity: 'e19' }, facing: 'down' },
    { kind: 'setEntityFrame', target: { scene: 's001', entity: 'e19' }, frame: 0 },
  ])
  const instruction = commands.findIndex(
    (command) =>
      command.kind === 'dialog' && command.cue.rows.some((row) => row.text === 'dlg.142'),
  )
  expect(commands.slice(instruction + 1, instruction + 4)).toEqual([
    { kind: 'clearDialog' },
    { kind: 'setEntityFacing', target: { scene: 's001', entity: 'e19' }, facing: 'up' },
    { kind: 'setEntityFrame', target: { scene: 's001', entity: 'e19' }, frame: 0 },
  ])
})

test('the carried meal uses existing persistent appearance, retaining the detailed serving choreography', () => {
  const take = body('s001', 'e20', 'take-dishes')
  const serve = body('s001', 'e15', 'default')
  expect(serve[0]).toEqual({
    kind: 'takeEntity',
    target: { scene: 's001', entity: 'e26' },
  })
  const returnWalk = serve.findIndex(
    (command) =>
      command.kind === 'selectEntityBehavior' &&
      command.channel === 'auto' &&
      command.target.entity === 'e26',
  )
  expect(returnWalk).toBeGreaterThan(0)
  expect(serve[returnWalk - 1]).toEqual({
    kind: 'releaseEntity',
    target: { scene: 's001', entity: 'e26' },
  })
  expect(take).toContainEqual({
    kind: 'setActorAppearance',
    actor: 'li-xiaoyao',
    spriteId: 'sprite-208',
  })
  expect(serve).toContainEqual({
    kind: 'setActorAppearance',
    actor: 'li-xiaoyao',
    spriteId: 'li-xiaoyao',
  })
  expect(serve.find((command) => command.kind === 'repeat')).toEqual({
    kind: 'repeat',
    count: 6,
    body: [
      { kind: 'clearDialog' },
      {
        kind: 'nudgeEntity',
        dx: 8,
        dy: 4,
        target: { scene: 's001', entity: 'e26' },
      },
      { kind: 'animEntity', target: { scene: 's001', entity: 'e26' } },
      { kind: 'wait', ms: 100 },
    ],
  })
  expect(
    serve.flatMap((command) =>
      command.kind === 'setPartyFacing' && command.gesture !== undefined ? [command.gesture] : [],
    ),
  ).toEqual([12, 13, 14, 15])
  expect(serve.filter((command) => command.kind === 'giveItem')).toEqual([
    { kind: 'giveItem', itemId: '272' },
  ])
})

test('the traversed meal entities and script owners explain their actual purpose', () => {
  for (const [id, name] of [
    ['e15', '送酒菜触发区'],
    ['e16', '苗人客房酒菜'],
    ['e20', '厨房待端酒菜'],
  ])
    expect(entity('s001', id!).label).toBe(name)
  for (const [id, behavior] of [
    ['e15', 'default'],
    ['e20', 'take-dishes'],
  ]) {
    const flow = entity('s001', id!).behaviors!.trigger![behavior!]!.flow
    if (flow.kind !== 'stages') throw new Error('meal author expects ordinary steps')
    expect(flow.stages.every((stage) => Boolean(stage.label?.trim()))).toBe(true)
  }
})
