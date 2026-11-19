import { readFileSync } from 'node:fs'
import { validateActors } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { translateCasualtyScript } from './pal-casualty-scripts.js'
import type { SourceCmd } from './source-facts.js'

const palActors = validateActors(
  JSON.parse(
    readFileSync(new URL('../../../projects/pal/content/actors.json', import.meta.url), 'utf8'),
  ),
)

test('preserves a real casualty page portrait, row boundary and automatic tail', () => {
  const raw = JSON.parse(
    readFileSync(new URL('../../../data/extracted/events/all.json', import.meta.url), 'utf8'),
  ) as {
    segments: { commands: SourceCmd[] }[]
  }
  const [global] = raw.segments
  if (!global) throw new Error('PAL global command segment is missing')
  const commands = global.commands
  const locale: Record<string, string> = {}
  const script = translateCasualtyScript(commands, 43374, locale)
  expect(script.gates[0]?.branch.lines).toEqual([
    {
      text: 'dlg.13471',
      style: 'bottom',
      portrait: { asset: 'portrait.pal.002', side: 'right' },
      autoAdvance: 685,
    },
    { text: 'dlg.13472', style: 'top', portrait: { asset: 'portrait.pal.015', side: 'left' } },
    { text: 'dlg.13473', style: 'top', sameCue: true, autoAdvance: 685 },
  ])
  expect(locale['dlg.13471']).toBe('灵儿～你还好吧？')
  expect(locale['dlg.13473']).toBe('这点伤．．我还捱得了')
})

describe('PAL canonical casualty actors', () => {
  const byId = new Map(palActors.map((entry) => [entry.id, entry]))

  test('the six named actors retain their canonical cover assignments', () => {
    expect(byId.get('li-xiaoyao')!.battler!.coveredBy).toBe('lin-yueru')
    expect(byId.get('zhao-linger')!.battler!.coveredBy).toBe('li-xiaoyao')
    expect(byId.get('lin-yueru')!.battler!.coveredBy).toBe('li-xiaoyao')
    expect(byId.get('wu-hou')!.battler!.coveredBy).toBe('li-xiaoyao')
    expect(byId.get('anu')!.battler!.coveredBy).toBe('li-xiaoyao')
    expect(byId.get('gai-luojiao')!.battler!.coveredBy).toBe('anu')
  })

  test('the four translated scripts occupy their canonical actor slots in probability order', () => {
    const li = byId.get('li-xiaoyao')!.battler!.casualty!
    const zhao = byId.get('zhao-linger')!.battler!.casualty!
    const yue = byId.get('lin-yueru')!.battler!.casualty!
    expect(li.friendDeath?.gates.map((gate) => gate.chance)).toEqual([75, 66, 50])
    expect(li.dying).toBeUndefined()
    expect(zhao.dying?.gates.map((gate) => gate.chance)).toEqual([75, 66, 50])
    expect(zhao.friendDeath).toBeUndefined()
    expect(yue.friendDeath?.gates.map((gate) => gate.chance)).toEqual([75, 66, 50])
    expect(yue.dying?.gates.map((gate) => gate.chance)).toEqual([75, 66, 50])
  })
})
