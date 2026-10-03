import { createHash } from 'node:crypto'
import {
  JUMP_TARGET_OPERAND,
  RANDOM_JUMP_OPCODE,
} from '../../packages/pal-extract/src/events/opcodes.ts'

export const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export const addressOf = (label) => (/^L_\d+$/.test(label ?? '') ? Number(label.slice(2)) : null)
export const sceneId = (id) => `s${String(id).padStart(3, '0')}`

// The extraction label table does not include trigger confirmation (0x0a).
// A conservative source graph must still follow its refusal arm and stop linear fingerprints.
const jumpOperand = (opcode) => (opcode === 0x0a ? 0 : JUMP_TARGET_OPERAND[opcode])

export function indexSource(events, scenes, externalTables = []) {
  if (events.segments?.length !== 1 || events.segments[0].name !== 'all') {
    throw new Error('Census requires the single global all segment, not scene slices')
  }
  const commands = events.segments[0].commands
  commands.forEach((command, address) => {
    if (command.label && addressOf(command.label) !== address) {
      throw new Error(`Source address mismatch at ${address}`)
    }
  })
  const entities = new Map()
  const sceneIds = new Set()
  const roots = []
  const addRoot = (id, entry, owner = null) => {
    if (Number.isInteger(entry) && entry > 0 && entry < commands.length) {
      roots.push({ id, entry, owner })
    }
  }
  for (const scene of scenes) {
    if (!Number.isInteger(scene.sceneId)) throw new Error('Scene missing explicit sceneId')
    if (sceneIds.has(scene.sceneId)) throw new Error(`Duplicate source scene: ${scene.sceneId}`)
    sceneIds.add(scene.sceneId)
    for (const key of ['onEnterLabel', 'onTeleportLabel']) {
      addRoot(`${sceneId(scene.sceneId)}/${key}`, addressOf(scene[key]))
    }
    for (const entity of scene.eventObjects ?? []) {
      if (!Number.isInteger(entity.id) || entities.has(entity.id)) {
        throw new Error(`Missing or duplicate explicit event-object identity: ${entity.id}`)
      }
      entities.set(entity.id, { scene: sceneId(scene.sceneId), entity: `e${entity.id}` })
      for (const channel of ['trigger', 'auto']) {
        addRoot(
          `${sceneId(scene.sceneId)}/e${entity.id}/${channel}`,
          addressOf(entity[`${channel}Label`]),
          entity.id,
        )
      }
    }
  }
  for (const { name, rows } of externalTables) {
    for (const row of rows) {
      const identity = row.id ?? row.objectIndex
      if (!Number.isInteger(identity)) throw new Error(`${name} root lacks explicit identity`)
      for (const [key, entry] of Object.entries(row)) {
        // Item/skill/battle owners are not world-entity identities, even if the integers coincide.
        if (/^script/.test(key)) addRoot(`${name}/${identity}/${key}`, entry)
      }
    }
  }
  const edges = commands.flatMap((command, address) => {
    if (command.op !== 'raw' || ![0x24, 0x25].includes(command.opcode)) return []
    const [operand, target] = command.operands
    return [
      {
        address,
        opcode: command.opcode,
        channel: command.opcode === 0x24 ? 'auto' : 'trigger',
        operand,
        target,
        effect: operand === 0 ? 'no-op' : target === 0 ? 'clear' : 'install',
      },
    ]
  })
  return { commands, entities, roots, edges }
}

/** Structural reachability, not a gameplay feasibility proof. Branch predicates are not evaluated. */
export function callerContexts(source) {
  const { commands, entities } = source
  const roots = new Map(source.roots.map((root) => [root.id, root]))
  // Every physical installation remains a root candidate, including unreachable ones. Its
  // caller reachability is recorded independently and never promoted by this synthetic root.
  for (const edge of source.edges) {
    if (edge.effect === 'install' && edge.operand !== 65535 && entities.has(edge.operand - 1)) {
      roots.set(`install@${edge.address}`, {
        id: `install@${edge.address}`,
        entry: edge.target,
        owner: edge.operand - 1,
      })
    }
  }
  // Dynamic scene entry hooks are roots with no event-object self.
  commands.forEach((command, address) => {
    if (command.op === 'raw' && command.opcode === 0x6d) {
      for (const target of command.operands.slice(1)) {
        if (target > 0)
          roots.set(`scene-hook@${address}:${target}`, {
            id: `scene-hook@${address}:${target}`,
            entry: target,
            owner: null,
          })
      }
    }
  })
  const contexts = new Map(source.edges.map((edge) => [edge.address, new Map()]))
  commands.forEach((command, address) => {
    if (command.op === 'raw' && command.opcode === 0x6d) contexts.set(address, new Map())
  })
  const addContext = (address, root, owner) => {
    const record = contexts.get(address)
    if (record)
      record.set(`${root.id}:${owner ?? 'unknown'}`, { root: root.id, entry: root.entry, owner })
  }
  for (const root of roots.values()) {
    const pending = [[root.entry, root.owner]]
    const seen = new Set()
    while (pending.length) {
      const [address, owner] = pending.pop()
      const key = `${address}:${owner ?? 'unknown'}`
      if (seen.has(key) || address < 0 || address >= commands.length) continue
      seen.add(key)
      const command = commands[address]
      addContext(address, root, owner)
      const follow = (target, nextOwner = owner) => {
        if (Number.isInteger(target) && target > 0 && target < commands.length)
          pending.push([target, nextOwner])
      }
      if (command.op === 'end') {
        if (command.advance) follow(address + 1)
        if (command.reset) {
          follow(command.resetTo)
          if (command.idleFrames > 0) follow(address + 1)
        }
        continue
      }
      if (command.op === 'goto') {
        follow(addressOf(command.to))
        if (command.frameDelay > 0) follow(address + 1)
        continue
      }
      follow(address + 1)
      if (command.op !== 'raw') continue
      const [a, b, c] = command.operands
      if (command.opcode === 0x04) {
        // PAL call operand1=0 inherits; 65535 is NOT self here.
        follow(a, b === 0 ? owner : entities.has(b - 1) ? b - 1 : null)
      } else if ([0x24, 0x25].includes(command.opcode)) {
        // Only self installations need propagation here: explicit targets have individual roots.
        if (a === 65535 && b > 0) follow(b)
      } else if (command.opcode === 0x07) {
        follow(b)
        follow(c)
      } else if (command.opcode === RANDOM_JUMP_OPCODE) {
        for (let offset = 1; offset <= a; offset++) follow(address + offset)
      } else if (jumpOperand(command.opcode) !== undefined) {
        follow(command.operands[jumpOperand(command.opcode)])
      }
    }
  }
  return new Map(
    [...contexts].map(([address, entries]) => [
      address,
      [...entries.values()].sort(
        (a, b) => a.root.localeCompare(b.root) || (a.owner ?? -1) - (b.owner ?? -1),
      ),
    ]),
  )
}

const isSpeaker = (text) => /^[^\r\n]{1,30}[∶：:]\s*$/.test(text ?? '')
const hasControl = (command) =>
  command.op === 'raw' &&
  ([0x04, 0x07, RANDOM_JUMP_OPCODE].includes(command.opcode) ||
    (jumpOperand(command.opcode) !== undefined && ![0x24, 0x25].includes(command.opcode)))

/** A deliberately small fingerprint, not a bytecode converter or an interpreter. */
export function sourceSegment(commands, entry, owner) {
  const tokens = []
  const addresses = []
  const unknown = new Set()
  let terminal = { kind: 'unknown' }
  for (let address = entry; address < commands.length; address++) {
    const command = commands[address]
    addresses.push(address)
    if (command.op === 'end') {
      terminal = command.advance
        ? { kind: 'advance', address, successor: address + 1 }
        : command.reset
          ? { kind: 'reset', address, successor: command.resetTo, idleFrames: command.idleFrames }
          : { kind: 'end', address }
      break
    }
    if (command.op === 'goto' || hasControl(command)) {
      terminal = { kind: 'nonlinear', address }
      break
    }
    if (command.op === 'showDialog' && !isSpeaker(command.text))
      tokens.push(`dialog:${command.messageIndex}`)
    else if (command.op === 'giveItem') tokens.push(`item:${command.itemId}:${command.count || 1}`)
    else if (command.op === 'loadScene') tokens.push(`scene:${sceneId(command.sceneId - 1)}`)
    else if (command.op === 'raw' && command.opcode === 0x14)
      tokens.push(`frame:${owner}:${command.operands[0]}`)
    else if (command.op === 'raw' && command.opcode > 0xa7) unknown.add(command.opcode)
  }
  return {
    entry,
    terminal,
    tokens,
    addresses,
    unknownOpcodes: [...unknown],
    sourceHash: digest(addresses.map((address) => commands[address])),
  }
}
