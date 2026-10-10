import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'

const directions = ['down', 'left', 'up', 'right']
const key = (value) => JSON.stringify(value)

function graphBuilder() {
  const nodes = [{ kind: 'done' }]
  const add = (node) => {
    assert(nodes.length < 10000, 'automatic language graph exceeds finite proof budget')
    return nodes.push(node) - 1
  }
  return {
    nodes,
    add,
    delay: (ms, next) => (ms ? add({ kind: 'delay', ms, next }) : next),
    effect: (value, next) => add({ kind: 'effect', value, next }),
  }
}

/** Source automatic calls have a 100ms eligible tick, not trigger-script 40ms frames.
 * This is a language model, not a runtime replacement. Unsupported opcodes fail closed.
 * Movement-slot/native timing and actual draws must be proved separately before acceptance. */
export function sourceAutomaticLanguage(commands, entry, bindings = {}) {
  const g = graphBuilder(),
    cache = new Map()
  const target = (label) => {
    const index = commands.findIndex((command) => command.label === `L_${label}`)
    assert(index >= 0, `automatic source label ${label} missing`)
    return index
  }
  const build = (ip, idle = 0) => {
    const identity = `${ip}/${idle}`
    if (cache.has(identity)) return cache.get(identity)
    const node = g.add({ kind: 'pending' })
    cache.set(identity, node)
    const command = commands[ip]
    assert(command, `automatic source instruction ${ip} missing`)
    let next
    if (command.op === 'end') {
      if (command.advance) next = g.delay(100, build(ip + 1, idle))
      else if (command.reset) {
        const count = command.idleFrames ?? 0,
          done = count && idle + 1 >= count
        next = g.delay(
          100,
          build(done ? ip + 1 : target(command.resetTo), done ? 0 : count ? idle + 1 : idle),
        )
      } else next = 0
    } else if (command.op === 'goto') {
      const count = command.frameDelay ?? 0,
        done = count && idle + 1 >= count
      next = done
        ? g.delay(100, build(ip + 1, 0))
        : build(target(Number(command.to.slice(2))), count ? idle + 1 : idle)
    } else {
      assert.equal(command.op, 'raw', 'unsupported source automatic instruction')
      const [a, b, c] = command.operands,
        op = command.opcode
      if (op === 6) {
        assert(a >= 1 && a <= 101 && b, 'unsupported parked/degenerate random source gate')
        next = g.add({
          kind: 'choice',
          percent: 101 - a,
          then: build(target(b), idle),
          else: g.delay(100, build(ip + 1, idle)),
        })
      } else if (op === 9) {
        next = g.delay(Math.max(1, a) * 100, build(ip + 1, 0))
      } else {
        next = g.delay(100, build(ip + 1, idle))
        if (op === 0x14 || op === 0x0f) {
          const facing = op === 0x14 ? 0 : a,
            frame = op === 0x14 ? a : b
          if (frame !== 65535) next = g.effect({ kind: 'frame', value: frame }, next)
          if (facing !== 65535) next = g.effect({ kind: 'facing', value: directions[facing] }, next)
        } else if (op === 0x87) {
          assert([0, 65535, bindings.self].includes(a), 'cross-target source animation unbound')
          next = g.effect({ kind: 'animate' }, next)
        } else if (op === 0x6c || op === 0x7d) {
          assert([0, 65535, bindings.self].includes(a), 'cross-target source nudge unbound')
          const signed = (value) => (value >= 32768 ? value - 65536 : value)
          if (op === 0x6c) next = g.effect({ kind: 'animate' }, next)
          next = g.effect({ kind: 'nudge', dx: signed(b), dy: signed(c) }, next)
        } else if (op >= 0x0b && op <= 0x0e) {
          next = g.effect({ kind: 'step', direction: directions[op - 0x0b] }, next)
        } else if (op === 0x24) {
          const selected = bindings.selections?.find(
            (value) => value.actor === a - 1 && value.label === b,
          )
          assert(selected, 'source automatic selection lacks explicit canonical binding')
          assert(
            selected.target?.scene && selected.target.entity === `e${a - 1}`,
            'source automatic selection address missing',
          )
          next = g.effect(
            { kind: 'restart', target: selected.target, behavior: selected.behavior },
            next,
          )
        } else assert.fail(`unsupported source automatic opcode ${op} at ${ip}`)
      }
    }
    g.nodes[node] = { kind: 'epsilon', next, ip }
    return node
  }
  return { nodes: g.nodes, entry: build(entry) }
}

/** Slot-based steps wait for the NEXT eligible world tick before their effect. In
 * particular, step;wait100;step is two ticks between commits, not one. This lowering
 * only accepts integral tick waits; no nominal equivalence is claimed for 40ms leftovers. */
export function authoredAutomaticLanguage(body, self, bindings = {}) {
  const g = graphBuilder()
  const list = (commands, continuation, loops = []) => {
    let next = continuation
    for (let i = commands.length - 1; i >= 0; i--) {
      const c = commands[i]
      if (c.kind === 'wait') {
        assert(
          Number.isSafeInteger(c.ms) && c.ms >= 0 && c.ms % 100 === 0,
          'automatic wait is not an integral eligible tick',
        )
        next = g.delay(c.ms, next)
      } else if (
        ['setEntityFacing', 'setEntityFrame', 'animEntity', 'stepEntity', 'nudgeEntity'].includes(
          c.kind,
        )
      ) {
        assert.deepEqual(c.target, self, 'automatic language writes a different entity')
        const effect =
          c.kind === 'setEntityFacing'
            ? { kind: 'facing', value: c.facing }
            : c.kind === 'setEntityFrame'
              ? { kind: 'frame', value: c.frame }
              : c.kind === 'animEntity'
                ? { kind: 'animate' }
                : c.kind === 'nudgeEntity'
                  ? { kind: 'nudge', dx: c.dx, dy: c.dy }
                  : { kind: 'step', direction: c.dir }
        next = g.effect(effect, next)
        if (c.kind === 'stepEntity') next = g.delay(100, next)
      } else if (c.kind === 'branch') {
        const inverted = c.cond.kind === 'not',
          cond = inverted ? c.cond.cond : c.cond
        assert.equal(cond.kind, 'chance', 'nonrandom automatic branch needs a state model')
        assert(Number.isInteger(cond.percent) && cond.percent >= 0 && cond.percent <= 100)
        next = g.add({
          kind: 'choice',
          percent: inverted ? 100 - cond.percent : cond.percent,
          then: list(c.then ?? [], next, loops),
          else: list(c.else ?? [], next, loops),
        })
      } else if (c.kind === 'repeat') {
        assert(
          Number.isSafeInteger(c.count) && c.count >= 1 && c.count <= 128,
          'repeat outside proof budget',
        )
        const exit = next
        for (let n = c.count - 1; n >= 0; n--)
          next = list(c.body, next, [...loops, { id: c.id, head: next, exit }])
      } else if (c.kind === 'loop') {
        assert.equal(c.mode, 'forever', 'unsupported loop mode')
        const head = g.add({ kind: 'pending' })
        g.nodes[head] = {
          kind: 'epsilon',
          next: list(c.body, head, [...loops, { id: c.id, head, exit: next }]),
        }
        next = head
      } else if (c.kind === 'breakLoop' || c.kind === 'continueLoop') {
        const loop = c.loop ? loops.findLast((value) => value.id === c.loop) : loops.at(-1)
        assert(loop, 'automatic loop transfer has no owner')
        next = c.kind === 'breakLoop' ? loop.exit : loop.head
      } else if (c.kind === 'finishStep') {
        assert.equal(c.next.kind, 'complete', 'cross-stage automatic continuation unbound')
        next = 0
      } else if (c.kind === 'selectEntityBehavior') {
        assert.equal(c.channel, 'auto')
        assert.equal(c.selection.kind, 'use')
        const selected = bindings.selections?.find(
          (value) =>
            value.actor === Number(c.target.entity.slice(1)) &&
            value.behavior === c.selection.value,
        )
        assert(selected, 'canonical automatic selection lacks source binding')
        assert.deepEqual(c.target, selected.target, 'canonical automatic selection target differs')
        const previous = commands[i - 1]
        const reset =
          previous?.kind === 'selectEntityBehavior' &&
          previous.channel === c.channel &&
          previous.selection.kind === 'disabled' &&
          isDeepStrictEqual(previous.target, c.target)
        if (reset) i--
        next = g.effect(
          {
            kind: reset ? 'restart' : 'select',
            target: selected.target,
            behavior: selected.behavior,
          },
          next,
        )
      } else assert.fail(`unsupported authored automatic command ${c.kind}`)
    }
    return next
  }
  return { nodes: g.nodes, entry: list(body, 0) }
}

function head(graph, start) {
  let at = start,
    ms = 0
  const visited = new Set()
  for (;;) {
    assert(!visited.has(at), 'unproductive automatic control/delay cycle')
    visited.add(at)
    const node = graph.nodes[at]
    assert(node, 'missing automatic language node')
    if (node.kind === 'epsilon') at = node.next
    else if (node.kind === 'delay') {
      ms += node.ms
      at = node.next
    } else if (node.kind === 'choice' && [0, 100].includes(node.percent)) {
      at = node.percent === 100 ? node.then : node.else
    } else
      return {
        node:
          node.kind === 'choice' && node.percent < 50
            ? { ...node, percent: 100 - node.percent, then: node.else, else: node.then }
            : node,
        ms,
        at,
      }
  }
}

/** Finite-state strong bisimulation after epsilon/adjacent-delay normalization. Keeps
 * probability gates, repeated equal poses and each effect; no cycle-count whitelist. */
export function compareAutomaticLanguages(source, authored) {
  const pending = [[source.entry, authored.entry]],
    visited = new Set(),
    witness = []
  while (pending.length) {
    const pair = pending.shift(),
      identity = key(pair)
    if (visited.has(identity)) continue
    visited.add(identity)
    const left = head(source, pair[0]),
      right = head(authored, pair[1]),
      shape = ({ node, ms }) => ({
        ms,
        kind: node.kind,
        ...(node.kind === 'choice'
          ? { percent: node.percent }
          : node.kind === 'effect'
            ? { value: node.value }
            : {}),
      })
    assert(
      isDeepStrictEqual(shape(left), shape(right)),
      `automatic language mismatch: ${key({ source: shape(left), authored: shape(right), pair })}`,
    )
    witness.push({ source: left.at, authored: right.at, ...shape(left) })
    if (left.node.kind === 'choice') {
      pending.push([left.node.then, right.node.then], [left.node.else, right.node.else])
    } else if (left.node.kind === 'effect') pending.push([left.node.next, right.node.next])
    else assert.equal(left.node.kind, 'done', 'unfinished automatic graph node')
  }
  return { status: 'proved-nominal-language', pairs: visited.size, witness }
}
