import { isDeepStrictEqual as same } from 'node:util'
import { firstNumberDraws } from './battle-presentation.mjs'
import { projectBattleBusinessTrace } from './battle-trace-contract.mjs'

const hero = 'li-xiaoyao'
const linger = 'zhao-linger'
const anu = 'anu'
const foe = 'foe-0'
const confirmKey = (trace) => (trace.engine === 'game' ? 'Space' : 'Enter')
const player = (state, id) => state?.players.find((unit) => unit.id === id)
const status = (unit, key) => unit?.statuses[key] ?? 0
const health = (state) => state?.enemies.filter(Boolean).map(({ hp }) => hp)
const spell = (trace, id) => trace.actions.find(({ skillId }) => skillId === id)
const item = (trace, id, turn) =>
  trace.actions.find(({ itemId, turn: round }) => itemId === id && round === turn)
const actionOf = (trace, turn, actorId) =>
  trace.actions.find((action) => action.turn === turn && action.actorId === actorId)
const mp = (action, id) => [action?.before, action?.after].map((state) => player(state, id)?.mp)
const countItem = (state, id) => state?.inventory.find(({ itemId }) => itemId === id)?.count ?? 0
const roleStates = (action, id, keys) =>
  [action?.before, action?.after].map((state) => {
    const unit = player(state, id)
    return [unit?.hp, ...keys.map((key) => status(unit, key))]
  })
const roundStatus = (trace, id, key) =>
  (trace.rounds ?? []).map(({ after }) => status(player(after, id), key))
const samples = (trace, purpose) =>
  trace.randomDraws.filter((draw) => draw.purpose === purpose).map(({ value }) => value)
const dexterity = (trace, slot) =>
  trace.randomDraws
    .filter(({ queue }) => queue?.side === 'player' && queue.slot === slot)
    .map(({ queue }) => [queue.turn, queue.speed])
const animated = (frames, turn, actor, kind) =>
  frames.filter(
    ({ payload }) =>
      payload.turn === turn &&
      payload.animation?.actorId === actor &&
      payload.animation.kind === kind,
  )
const fighterSprite = (appearance) =>
  typeof appearance === 'string'
    ? Number(/^player-fighter-(\d+)$/u.exec(appearance)?.[1])
    : appearance
const appearances = (frames, slot) => [
  ...new Set(
    frames.flatMap(({ payload }) =>
      payload.players
        .filter((player) => player.slot === slot)
        .map(({ appearance }) => fighterSprite(appearance)),
    ),
  ),
]
function physicalOverlaySequence(frames) {
  const overlays = []
  let previous
  for (const { payload } of frames) {
    const drawings = payload.physicalOverlays ?? []
    if (drawings.length && !same(previous, drawings))
      overlays.push(
        drawings.map(({ x, y, frameIndex }) => [x, y, frameIndex]).sort((a, b) => a[0] - b[0]),
      )
    previous = drawings
  }
  return overlays
}
const amounts = (frames) => firstNumberDraws(frames).map(({ number }) => number.value)
const position = (draw) => draw && [draw.x, draw.y]
const soundId = (event) => Number(event.assetId.split('.').at(-1))
const audioDuring = (trace, frames) => {
  const first = frames[0],
    last = frames.at(-1)
  if (!first || !last) return []
  const requests = (trace.audioEvents ?? []).filter(
    ({ kind, atMs }) => kind === 'sfx-request' && atMs >= first.atMs - 45 && atMs <= last.atMs,
  )
  const starts = (trace.audioEvents ?? []).filter(
    ({ kind, contextState }) => kind === 'sfx-start' && contextState === 'running',
  )
  return requests.map((request) => ({
    cue: soundId(request),
    request: request.atMs,
    starts: starts
      .filter(({ cueId, assetId }) => cueId === request.cueId && assetId === request.assetId)
      .map(({ atMs }) => atMs),
  }))
}

function checkBuffs(trace, id, frames, check) {
  if (id === 'bravery-expires') {
    const magic = spell(trace, '311')
    check(
      '天罡战气真气、回合',
      [mp(magic, hero), status(player(magic?.after, anu), 'bravery')],
      [[100, 87], 7],
    )
    check('勇气逐轮耗尽', roundStatus(trace, anu, 'bravery'), [6, 5, 4, 3, 2, 1, 0, 0])
    check(
      '勇气下两次强制暴击，到期后恢复普通伤害',
      [1, 7, 8].map((turn) => amounts(animated(frames, turn, anu, 'attack'))),
      [[207], [216], [72]],
    )
    return
  }
  if (id === 'haste-and-dual-expire') {
    const haste = spell(trace, '393'),
      dual = spell(trace, '390')
    check(
      '两种增益分别扣真气并写入目标',
      [
        [mp(haste, hero), status(player(haste?.after, anu), 'haste')],
        [mp(dual, hero), status(player(dual?.after, anu), 'dualAttack')],
      ],
      [
        [[100, 92], 9],
        [[92, 70], 5],
      ],
    )
    check('加速逐轮耗尽', roundStatus(trace, anu, 'haste'), [8, 7, 6, 5, 4, 3, 2, 1, 0, 0])
    check('双动逐轮耗尽', roundStatus(trace, anu, 'dualAttack'), [0, 4, 3, 2, 1, 0, 0, 0, 0, 0])
    check(
      '实际入队身法',
      dexterity(trace, 1).filter(([turn]) => [1, 2, 6, 7, 9, 10].includes(turn)),
      [
        [1, 20],
        [2, 60],
        [6, 60],
        [7, 60],
        [9, 60],
        [10, 20],
      ],
    )
    check(
      '连击首轮、最后一轮及到期后的真实飘字',
      [2, 6, 7].map((turn) => amounts(animated(frames, turn, anu, 'attack'))),
      [[44, 42], [44, 46], [130]],
    )
    return
  }
  const dream = spell(trace, '295'),
    attack = actionOf(trace, 2, linger)
  check(
    '梦蛇使用实际绘制的变身资源',
    [
      appearances(
        frames.filter(({ payload }) => payload.turn === 1 && payload.selecting),
        1,
      ),
      appearances(animated(frames, 2, linger, 'attack'), 1),
    ],
    [[1], [5]],
  )
  check('梦蛇实际施法对象与真气', [dream?.targetId, mp(dream, linger)], [linger, [100, 1]])
  check(
    '梦蛇入队身法按裸属性增益',
    dexterity(trace, 1).find(([turn]) => turn === 2),
    [2, 166],
  )
  check('梦蛇武术只叠裸属性', [health(attack?.before), health(attack?.after)], [[1065], [790]])
  check('梦蛇后两次实际伤害', amounts(animated(frames, 2, linger, 'attack')), [138, 137])
  const attackFrames = animated(frames, 2, linger, 'attack')
  check('变身后使用本形象的物理特效并跟随受击位置', physicalOverlaySequence(attackFrames), [
    [[100, 101, 9]],
    [[84, 117, 10]],
    [[68, 133, 11]],
    [[94, 98, 9]],
    [[78, 114, 10]],
    [[62, 130, 11]],
  ])
  check(
    '梦蛇双击数字随实际受击锚',
    firstNumberDraws(attackFrames).map(({ number: { right, y } }) => [right, y]),
    [
      [106, 10],
      [100, 10],
    ],
  )
}

function checkGroupAttack(trace, scenario, frames, inputs, check) {
  const strike = actionOf(trace, 1, anu)
  const critical = scenario.seed === 5
  const swing = animated(frames, 1, anu, 'attack')
  check(
    '装备授予永久连击，群攻保留原敌槽',
    [
      status(player(trace.start.state, anu), 'dualAttack'),
      strike?.targetId,
      strike?.targetSide,
      health(strike?.before),
      health(strike?.after),
    ],
    [32760, null, 'enemy', [540, 540], critical ? [1, 0] : [498, 456]],
  )
  const index = scenario.commands.findIndex(({ targetSide }) => targetSide === 'enemy')
  check(
    '群攻一次确认直接提交',
    inputs.filter(({ commandIndex }) => commandIndex === index).map(({ key }) => key),
    [confirmKey(trace)],
  )
  check(
    '两挥独立暴击抽样',
    samples(trace, 'group-strike-critical').map((value) => Math.floor(value * 6)),
    critical ? [0, 3] : [1, 3],
  )
  const numbers = firstNumberDraws(swing).map(({ number: n }) => [
    n.slot,
    n.value,
    n.right,
    n.y,
    n.tone,
  ])
  check(
    '两次独立命中及当前受击位置',
    numbers,
    critical
      ? [
          [1, 807, 146, 10, 'blue'],
          [0, 404, 76, 15, 'blue'],
          [1, 269, 140, 10, 'blue'],
          [0, 135, 70, 15, 'blue'],
        ]
      : [
          [1, 42, 146, 10, 'blue'],
          [0, 21, 76, 15, 'blue'],
          [1, 42, 140, 10, 'blue'],
          [0, 21, 70, 15, 'blue'],
        ],
  )
  check(
    '每挥三个实际特效帧分别覆盖两敌',
    physicalOverlaySequence(swing),
    [0, 1, 2, 0, 1, 2].map((i) => [
      [70, 130, i],
      [140, 106, i],
    ]),
  )
  const poses = swing.flatMap(({ payload }) => payload.players.filter(({ slot }) => slot === 1))
  check(
    '双挥出剑起点、踏步及归位',
    [
      position(poses.find(({ frameIndex }) => frameIndex === 7)),
      [
        ...new Map(
          poses
            .filter(({ frameIndex }) => frameIndex === 8)
            .map((pose) => [pose.x, position(pose)]),
        ).values(),
      ],
      poses.some(({ x, y, frameIndex }) => x === 250 && y === 149 && frameIndex === 9),
      poses.some(({ x, y, frameIndex }) => x === 238 && y === 141 && frameIndex === 9),
      position(poses.at(-1)),
    ],
    [
      [256, 152],
      [
        [248, 148],
        [236, 140],
      ],
      true,
      true,
      [256, 152],
    ],
  )
  check(
    '两次独立攻击声与武器声',
    audioDuring(trace, swing).map(({ cue, starts }) => [cue, starts.length]),
    [
      [critical ? 8 : 40, 1],
      [4, 1],
      [40, 1],
      [4, 1],
    ],
  )
}

function checkPuppet(trace, id, frames, check) {
  check('自然倒地后才用傀儡虫', roleStates(item(trace, '152', 2), hero, ['puppet']), [
    [0, 0],
    [0, 9],
  ])
  check(
    '倒地后不提交指令，不再抽入队身法',
    [
      trace.commands.filter(({ actorId }) => actorId === hero).map(({ turn }) => turn),
      dexterity(trace, 0).map(([turn]) => turn),
    ],
    [[1], [1]],
  )
  const counter = actionOf(trace, 2, hero)
  if (id === 'puppet-all-dead') {
    check(
      '最后活人倒下，倒地傀儡不补刀',
      [
        counter?.kind ?? null,
        trace.actions.at(-1).after.players.map(({ hp }) => hp),
        health(trace.actions.at(-1).after),
      ],
      [null, [0, 0], [30]],
    )
    return
  }
  check(
    '傀儡队尾实际普攻',
    [
      counter?.kind,
      health(counter?.before),
      health(counter?.after),
      trace.actions.filter(({ turn }) => turn === 2).at(-1)?.actorId,
    ],
    ['attack', [30], [28], hero],
  )
  check(
    '倒地傀儡保留武器声',
    audioDuring(trace, animated(frames, 2, hero, 'attack')).map(({ cue, starts }) => [
      cue,
      starts.length,
    ]),
    [[1, 1]],
  )
  check('还魂香恢复15 HP并清除傀儡', roleStates(item(trace, '95', 3), hero, ['puppet']), [
    [0, 8],
    [15, 0],
  ])
}

function checkTrancePresentation(trace, frames, slot, check) {
  const cast = animated(frames, 1, linger, 'cast')
  const [x, y, rest] = slot === 0 ? [200, 176, 1] : [256, 152, 0]
  const pose = ({ payload }) => {
    const draw = payload.players.find((player) => player.slot === slot)
    return [fighterSprite(draw?.appearance), draw?.frameIndex, draw?.x, draw?.y, draw?.colorShift]
  }
  const firstBlend = cast.findIndex(({ payload }) => payload.appearanceTransition)
  const beforeBlend = cast.slice(0, Math.max(0, firstBlend))
  const changes = beforeBlend.map(pose).filter((draw, index, all) => !same(draw, all[index - 1]))
  check('梦蛇旧形态前移四步，施法姿与六拍闪色依次实绘', changes, [
    [1, rest, x - 4, y - 2, 0],
    [1, rest, x - 7, y - 3, 0],
    [1, rest, x - 9, y - 4, 0],
    [1, rest, x - 10, y - 4, 0],
    ...[0, 2, 4, 6, 8, 10].map((shift) => [1, 5, x - 10, y - 4, shift]),
  ])
  const blends = cast.slice(Math.max(0, firstBlend))
  const steps = blends.map(({ payload }) => payload.appearanceTransition?.step)
  const final = frames.find(
    ({ order }) => order > (blends.at(-1)?.order ?? Number.POSITIVE_INFINITY),
  )
  check(
    '梦蛇由原色末闪错相溶到原站位新施法姿，收招恢复待机姿势',
    [
      steps.length >= 12 &&
        steps[0] <= 4 &&
        steps.at(-1) >= 68 &&
        blends.every(
          ({ payload }, index) =>
            payload.appearanceTransition?.total === 72 &&
            Number.isInteger(steps[index]) &&
            steps[index] >= 1 &&
            steps[index] <= 72 &&
            (index === 0 || steps[index] >= steps[index - 1]),
        ),
      [...new Set(blends.map((frame) => JSON.stringify(pose(frame))))].map(JSON.parse),
      final ? pose(final) : null,
    ],
    [true, [[5, 5, x, y, 0]], [5, rest, x, y, 0]],
  )
  if (trace.engine === 'reforge') {
    const sources = blends.map(({ payload }) => payload.appearanceTransition?.source)
    check(
      'Reforge 溶解源保留旧形态末闪的坐标、姿势和色值',
      [...new Set(sources.map((source) => JSON.stringify(source ?? null)))].map(JSON.parse),
      [
        {
          slot,
          x: x - 10,
          y: y - 4,
          frameIndex: 5,
          colorShift: 10,
          appearance: 'player-fighter-1',
        },
      ],
    )
  }
  const first = cast[0]
  const firstCast = beforeBlend.find((frame) => pose(frame)[1] === 5)
  const firstFade = blends[0]
  const sounds = audioDuring(trace, cast)
  const timing = [
    firstCast?.atMs - first?.atMs,
    firstFade?.atMs - first?.atMs,
    final?.atMs - firstFade?.atMs,
    sounds[0]?.starts[0] - firstCast?.atMs,
  ]
  const windows = [
    [190, 290],
    [895, 1045],
    [1050, 1250],
    [-35, 65],
  ]
  check(
    '梦蛇各边界节拍和唯一实际施法音',
    [
      sounds.map(({ cue, starts }) => [cue, starts.length]),
      timing.map((ms, index) => ms >= windows[index][0] && ms <= windows[index][1]),
    ],
    [[[10, 1]], [true, true, true, true]],
  )
}

function checkTranceRevival(trace, frames, check) {
  const dream = spell(trace, '295')
  const death = actionOf(trace, 1, foe)
  const revive = item(trace, '95', 2)
  check(
    '梦蛇施法后自然阵亡，还魂香保留装备连击',
    [
      [dream?.targetId, mp(dream, linger)],
      [death?.targetId, roleStates(death, linger, ['dualAttack'])],
      [revive?.targetId, roleStates(revive, linger, ['dualAttack'])],
      Boolean(dream && death && revive && dream.order < death.order && death.order < revive.order),
    ],
    [
      [linger, [100, 1]],
      [
        linger,
        [
          [30, 32760],
          [0, 32760],
        ],
      ],
      [
        linger,
        [
          [0, 32760],
          [24, 32760],
        ],
      ],
      true,
    ],
  )
  const fallen = frames.find(
    ({ payload }) => payload.turn === 1 && payload.players[0]?.frameIndex === 2,
  )?.payload.players[0]
  const healed = firstNumberDraws(frames).find(
    ({ number }) => number.side === 'player' && number.slot === 0 && number.value === 24,
  )
  const standing = healed?.frame.payload.players[0]
  check(
    '阵亡与复活首帧仍用梦蛇，黄字随复活出现',
    [
      appearances(
        frames.filter(({ payload }) => payload.turn === 1 && payload.selecting),
        0,
      ),
      [fighterSprite(fallen?.appearance), fallen?.frameIndex],
      [fighterSprite(standing?.appearance), standing?.frameIndex, healed?.number.tone],
    ],
    [[1], [5, 2], [5, 1, 'yellow']],
  )
  check(
    '复活当轮无选招、无入队身法抽样，下轮保留梦蛇身法并计算濒死减半',
    [
      trace.commands.filter(({ actorId }) => actorId === linger).map(({ turn }) => turn),
      dexterity(trace, 0),
      trace.actions.filter(({ turn }) => turn === 2).at(-1)?.actorId,
    ],
    [
      [1, 3],
      [
        [1, 249],
        [3, 163],
      ],
      linger,
    ],
  )
  for (const [turn, before, damage, after] of [
    [2, 1065, [142, 140], 783],
    [3, 783, [142, 137], 504],
  ]) {
    const attack = actionOf(trace, turn, linger)
    const swings = animated(frames, turn, linger, 'attack')
    check(
      `第 ${turn} 轮复活后的梦蛇双击、受击数字与实际音画`,
      [
        [attack?.kind, attack?.targetId, health(attack?.before), health(attack?.after)],
        appearances(swings, 0),
        physicalOverlaySequence(swings).flatMap((drawing) => drawing.map(([, , frame]) => frame)),
        firstNumberDraws(swings).map(({ number }) => [number.value, number.right, number.y]),
        audioDuring(trace, swings).map(({ cue, starts }) => [cue, starts.length]),
      ],
      [
        ['attack', foe, [before], [after]],
        [5],
        [9, 10, 11, 9, 10, 11],
        [
          [damage[0], 106, 10],
          [damage[1], 100, 10],
        ],
        [
          [38, 1],
          [2, 1],
          [38, 1],
          [2, 1],
        ],
      ],
    )
  }
}

function checkRevivalPortraits(trace, frames, trance, expires, check) {
  const deathTurn = trance ? 2 : 3
  // The first four points are opaque in PAL UI frames 48/49. The last two
  // are holes and must retain the destination pixel underneath the portrait.
  const opaque = trance ? [2, 11, 3, 0] : [9, 5, 1, 0]
  const levels = [0, 24, 40, 56, 73, 89, 105, 121, 138, 154, 170, 186]
  const source = trace.engine === 'game' ? 'game:blitPortrait' : 'reforge:drawPlayerInfoBox'
  const portraits = frames.flatMap(({ payload }) =>
    payload.portrait
      ? [{ turn: payload.turn, selecting: payload.selecting, ...payload.portrait }]
      : [],
  )
  const fallen = portraits.find(({ turn }) => turn === deathTurn)
  check(
    '首个倒地选招的实绘头像保持原始明暗档和透明像素',
    [
      [fallen?.source, fallen?.slot, fallen?.hp, fallen?.width, fallen?.height, fallen?.selecting],
      fallen?.samples.map(({ x, y }) => [x, y]),
      fallen?.samples.slice(0, 4).map(({ after }) => after.rgba),
      fallen?.samples.slice(4).map(({ before, after }) => same(before, after)),
      ...(trace.engine === 'game'
        ? [fallen?.samples.slice(0, 4).map(({ after }) => after.index)]
        : []),
    ],
    [
      [source, 0, 0, 36, 35, true],
      [
        [12, 14],
        [20, 14],
        [24, 14],
        [16, 8],
        [0, 0],
        [33, 18],
      ],
      opaque.map((index) => [levels[index], levels[index], levels[index], 255]),
      [true, true],
      ...(trace.engine === 'game' ? [opaque] : []),
    ],
  )
  if (!expires) {
    const firstLiving = portraits.find(({ turn, hp }) => turn > deathTurn && hp > 0)
    const rgb = trance
      ? [
          [60, 40, 24],
          [219, 170, 150],
          [56, 56, 56],
          [20, 12, 8],
        ]
      : [
          [203, 146, 121],
          [174, 101, 77],
          [113, 52, 32],
          [0, 0, 0],
        ]
    check(
      '复活后的实际选招头像恢复原色',
      [
        [firstLiving?.turn, firstLiving?.hp, firstLiving?.selecting],
        firstLiving?.samples.slice(0, 4).map(({ after }) => after.rgba),
      ],
      [[trance ? 3 : 5, trance ? 24 : 18, true], rgb.map((color) => [...color, 255])],
    )
  }
}

function checkBuffedPuppet(trace, expires, frames, check) {
  const tracked = ['bravery', 'dualAttack', 'puppet']
  const bravery = spell(trace, '311')
  const dual = spell(trace, '390')
  const death = actionOf(trace, 2, foe)
  const hp = expires ? 86 : 87
  check(
    '两种临时增益来自实际施法，敌人命中后才用傀儡虫',
    [
      [bravery?.targetId, mp(bravery, hero), roleStates(bravery, hero, tracked)],
      [dual?.targetId, mp(dual, hero), roleStates(dual, hero, tracked)],
      [death?.targetId, roleStates(death, hero, tracked)],
      roleStates(item(trace, '152', 3), hero, tracked),
    ],
    [
      [
        hero,
        [100, 87],
        [
          [180, 0, 0, 0],
          [180, 7, 0, 0],
        ],
      ],
      [
        hero,
        [87, 65],
        [
          [hp, 6, 0, 0],
          [hp, 6, 5, 0],
        ],
      ],
      [
        hero,
        [
          [hp, 6, 5, 0],
          [0, 6, 5, 0],
        ],
      ],
      [
        [0, 5, 4, 0],
        [0, 5, 4, 9],
      ],
    ],
  )
  const selected = expires ? [1, 2] : [1, 2, 5]
  check(
    '逍遥在倒地和复活当轮均无手选指令或队列身法抽样',
    [
      trace.commands.filter(({ actorId }) => actorId === hero).map(({ turn }) => turn),
      dexterity(trace, 0).map(([turn]) => turn),
    ],
    [selected, selected],
  )
  const strikes = expires
    ? [[13, 12], [13, 13], [16, 15], [13, 13], [16], [4], [4], [4], [4]]
    : [[12, 16], [4]]
  let remaining = 900
  for (const [index, hits] of strikes.entries()) {
    const turn = index + 3
    const after = remaining - hits.reduce((sum, damage) => sum + damage, 0)
    const attack = actionOf(trace, turn, hero)
    const swings = animated(frames, turn, hero, 'attack')
    const revived = !expires && turn === 4
    check(
      `第 ${turn} 轮队尾普攻、实际掉血与武器声`,
      [
        [attack?.kind, attack?.targetId, health(attack?.before), health(attack?.after)],
        trace.actions.filter(({ turn: round }) => round === turn).at(-1)?.actorId,
        firstNumberDraws(swings).map(({ number }) => [number.value, number.right, number.y]),
        audioDuring(trace, swings).map(({ cue, starts }) => [cue, starts.length]),
      ],
      [
        ['attack', foe, [remaining], [after]],
        hero,
        hits.map((damage, hit) => [damage, hit === 0 ? 106 : 100, 10]),
        revived
          ? [
              [37, 1],
              [1, 1],
            ]
          : hits.map(() => [1, 1]),
      ],
    )
    remaining = after
  }
  const crit = samples(trace, 'strike-critical')
    .slice(0, 2)
    .map((value) => Math.floor(value * 6))
  const bonus = samples(trace, 'strike-hero-critical')
    .slice(0, 2)
    .map((value) => Math.floor(value * 12))
  check(
    '首轮两击避开随机暴击与逍遥倍击，验证勇气强制暴击',
    [crit, bonus],
    expires
      ? [
          [4, 5],
          [1, 7],
        ]
      : [
          [2, 1],
          [6, 2],
        ],
  )
  if (expires) {
    check(
      '双动、勇气、傀儡依次到期，第十二轮仍倒地且没有逍遥攻击',
      [
        tracked.map((key) => roundStatus(trace, hero, key)),
        actionOf(trace, 12, hero)?.kind ?? null,
        animated(frames, 12, hero, 'attack').length,
        player(trace.actions.at(-1)?.before, hero)?.hp,
      ],
      [
        [
          [6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
          [0, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0],
        ],
        null,
        0,
        0,
      ],
    )
  } else {
    const revive = item(trace, '95', 4)
    check(
      '还魂香当场清除三个临时状态并恢复 18 HP',
      [
        revive?.targetId,
        roleStates(revive, hero, tracked),
        player(trace.actions.at(-1)?.before, hero)?.hp,
      ],
      [
        hero,
        [
          [0, 4, 3, 8],
          [18, 0, 0, 0],
        ],
        18,
      ],
    )
  }
}

function checkConfusion(trace, scenario, frames, check) {
  if (scenario.id === 'confusion-resisted') {
    const use = item(trace, '128', 1)
    check(
      '灯笼抵抗紫罂粟',
      [
        health(use?.before),
        health(use?.after),
        status(use?.after.enemies[0], 'confused'),
        samples(trace, 'status-resistance').map((value) => Math.floor(value * 10)),
      ],
      [[30], [30], 0, [2]],
    )
    return
  }
  if (scenario.id === 'enemy-ghost-curse') {
    const magic = spell(trace, '305')
    check(
      '鬼降实际命中与首轮计数',
      [
        magic?.targetId,
        roleStates(magic, hero, ['confused']),
        roundStatus(trace, hero, 'confused'),
      ],
      [
        hero,
        [
          [800, 0],
          [799, 3],
        ],
        [2],
      ],
    )
    check(
      '鬼降后队友实际被误击',
      [
        actionOf(trace, 2, hero)?.kind,
        actionOf(trace, 2, hero)?.targetId,
        roleStates(actionOf(trace, 2, hero), anu, []),
      ],
      ['attack-mate', anu, [[800], [799]]],
    )
    return
  }
  if (scenario.id === 'confused-party-and-cleanse') {
    const misfire = actionOf(trace, 1, hero)
    check(
      '已排队的防御被混乱改为打友',
      [
        misfire?.kind,
        misfire?.targetId,
        roleStates(item(trace, '128', 1), hero, ['confused']),
        roleStates(misfire, anu, []),
      ],
      [
        'attack-mate',
        anu,
        [
          [150, 0],
          [149, 3],
        ],
        [[150], [149]],
      ],
    )
    check(
      '解混后同回合自动恢复攻击敌方',
      [roleStates(item(trace, '65', 2), hero, ['confused']), actionOf(trace, 2, hero)?.targetId],
      [
        [
          [149, 2],
          [149, 0],
        ],
        foe,
      ],
    )
    check(
      '混乱实抽目标',
      samples(trace, 'player-confusion-target').map((value) => Math.floor(value * 1000)),
      [875],
    )
    const mate = animated(frames, 1, hero, 'attack-mate')
    const draws = firstNumberDraws(frames).filter(
      ({ frame, number }) =>
        frame.payload.animation?.kind === 'attack-mate' &&
        frame.payload.animation.actorId === hero &&
        frame.payload.turn === 1 &&
        number.side === 'player' &&
        number.slot === 2,
    )
    const at = (frame) => frame?.atMs ?? NaN
    const struck = mate.find(
      ({ payload }) =>
        payload.players.some(({ slot, frameIndex }) => slot === 0 && frameIndex === 9) &&
        payload.players.some(({ slot, x }) => slot === 2 && x === 258),
    )
    const flashed = mate.find(({ payload }) =>
      payload.players.some(({ slot, colorShift }) => slot === 2 && colorShift === 6),
    )
    const [{ request, starts, cue }] = audioDuring(trace, mate)
      .filter(({ cue: sound }) => sound === 1)
      .concat([{ request: NaN, starts: [], cue: null }])
    check(
      '混乱打友挥击同时击退并响兵器',
      [
        cue,
        starts.length,
        Math.abs(request - at(struck)) <= 45,
        Math.abs(starts[0] - at(struck)) <= 85,
      ],
      [1, 1, true, true],
    )
    const numbers = draws.map(({ number: n }) => [n.slot, n.value, n.right, n.y, n.tone])
    check('受击位置首次画蓝字', numbers, [[2, 1, 264, 65, 'blue']])
    const drawn = draws[0]?.frame
    const recovered = mate.find(
      (frame) =>
        frame.order > (drawn?.order ?? Infinity) &&
        frame.payload.players.some(({ slot, x, y }) => slot === 2 && x === 270 && y === 146),
    )
    check(
      '击退、闪色、出字、复位的画帧顺序',
      [
        at(flashed) > at(struck),
        at(drawn) > at(flashed),
        at(recovered) - at(drawn) >= 110 && at(recovered) - at(drawn) <= 210,
      ],
      [true, true, true],
    )
    return
  }
  const hit = item(trace, '128', 1),
    confused = actionOf(trace, 1, foe)
  const self = scenario.id === 'confused-enemy-draws-self'
  check(
    '蜜蜂受混乱并逐轮衰减',
    [
      health(hit?.after),
      status(hit?.after.enemies[0], 'confused'),
      (trace.rounds ?? []).map(({ after }) => status(after.enemies[0], 'confused')),
    ],
    [[29, 32], 3, [2]],
  )
  check(
    '混乱抽到自己则跳过，抽到同伴则击中正确原槽',
    [
      confused?.kind,
      confused?.targetId,
      health(confused?.after),
      samples(trace, 'enemy-confusion-target').map((value) => Math.floor(value * 2)),
    ],
    self ? ['pass', null, [29, 32], [0]] : ['attack-mate', 'foe-1', [29, 0], [1]],
  )
  if (!self)
    check(
      '敌方误击实际伤害',
      firstNumberDraws(frames)
        .filter(
          ({ frame, number }) =>
            frame.payload.animation?.kind === 'attack-mate' &&
            frame.payload.animation.actorId === foe &&
            frame.payload.turn === 1 &&
            number.side === 'enemy' &&
            number.slot === 1,
        )
        .map(({ number }) => number.value),
      [48],
    )
}

function checkAttachment(trace, id, frames, check) {
  const hit = actionOf(trace, 1, foe),
    spider = id.startsWith('spider-')
  const resist = id.endsWith('-resisted')
  const key = spider ? 'sleep' : 'silence'
  check(
    '原物攻实际血量、附带状态与抗性抽样',
    [
      roleStates(hit, linger, [key]),
      samples(trace, 'enemy-equivalent-poison-resist').map((value) => 1 + Math.floor(value * 100)),
    ],
    [
      [
        [220, 0],
        [spider && !resist ? 218 : 219, resist ? 0 : 3],
      ],
      [spider ? 28 : resist ? 27 : 56],
    ],
  )
  if (resist) check('实际使用大蒜作抗性对照', item(trace, '84', 1)?.targetId, linger)
  if (spider) {
    check(
      '附带减 HP 保留一次原物理飘字',
      firstNumberDraws(animated(frames, 1, foe, 'attack')).map(({ number: n }) => [
        n.slot,
        n.value,
        n.right,
        n.y,
        n.tone,
      ]),
      [[0, 1, 246, 95, 'blue']],
    )
    check(
      '睡眠时跳过行动，计数结束才可选招',
      [
        trace.actions
          .filter(({ actorId, kind }) => actorId === linger && kind === 'pass')
          .map(({ turn }) => turn),
        roundStatus(trace, linger, 'sleep'),
      ],
      resist
        ? [[], [0]]
        : [
            [2, 3],
            [2, 1, 0],
          ],
    )
    return
  }
  const cast = actionOf(trace, 1, linger)
  const kind =
    id === 'queued-offense-silenced'
      ? 'attack'
      : id === 'queued-support-silenced'
        ? 'defend'
        : 'cast'
  check(
    '已排队仙术在执行时根据封咒降级或施放',
    [cast?.kind, cast?.skillId ?? null, mp(cast, linger)],
    [kind, kind === 'cast' ? '312' : null, kind === 'cast' ? [100, 95] : [100, 100]],
  )
  if (id === 'queued-spell-cleansed')
    check('同回合灵心符解除封咒', roleStates(item(trace, '65', 1), linger, ['silence']), [
      [219, 3],
      [219, 0],
    ])
}

function checkOverlap(trace, id, frames, inputs, menu, check) {
  if (id === 'enemy-sleep-reapply') {
    const first = item(trace, '135', 1),
      second = item(trace, '127', 1)
    check(
      '敌方再施短睡眠覆盖原计数',
      [
        first?.after.enemies[0].hp,
        status(first?.after.enemies[0], 'sleep'),
        second?.after.enemies[0].hp,
        status(second?.after.enemies[0], 'sleep'),
        (trace.rounds ?? []).map(({ after }) => status(after.enemies[0], 'sleep')),
        trace.actions
          .filter(({ actorId, kind }) => actorId === foe && kind === 'pass')
          .map(({ turn }) => turn),
      ],
      [329, 5, 328, 3, [2, 1, 0], [1, 2, 3]],
    )
    return
  }
  const tracked = ['sleep', 'silence', 'dualAttack']
  check(
    '同轮叠加与重施短睡眠，装备连击保持',
    [
      roleStates(item(trace, '127', 1), linger, tracked),
      roleStates(item(trace, '127', 2), linger, tracked),
      roleStates(item(trace, '255', 2), linger, tracked),
    ],
    [
      [
        [220, 0, 3, 32760],
        [219, 3, 3, 32760],
      ],
      [
        [218, 2, 2, 32760],
        [217, 2, 2, 32760],
      ],
      [
        [217, 2, 2, 32760],
        [208, 0, 2, 32760],
      ],
    ],
  )
  check(
    '选择性解除后当轮恢复装备两击',
    [
      actionOf(trace, 1, linger)?.kind,
      actionOf(trace, 2, linger)?.kind,
      amounts(animated(frames, 2, linger, 'attack')),
      mp(actionOf(trace, 2, linger), linger),
    ],
    ['pass', 'attack', [2, 1], [100, 100]],
  )
  check(
    '封咒禁用菜单，实际左键不会进入仙术',
    [menu, inputs.filter(({ commandIndex }) => commandIndex === 5).map(({ key }) => key)],
    [
      {
        turn: 3,
        actorId: linger,
        before: 0,
        after: 0,
        phase: trace.engine === 'game' ? 'main' : 'menu',
      },
      ['ArrowLeft', 'KeyD'],
    ],
  )
  check(
    '封咒自然到期后同一角色可施法',
    [
      roundStatus(trace, linger, 'silence'),
      actionOf(trace, 4, linger)?.skillId,
      mp(actionOf(trace, 4, linger), linger),
    ],
    [[2, 1, 0, 0], '312', [100, 95]],
  )
}

export function checkStatusRules(trace, scenario, configured, inputs, menu) {
  const { id, family } = scenario
  const findings = [],
    facts = []
  const check = (rule, actual, expected) => {
    facts.push({ rule, actual })
    if (!same(actual, expected)) findings.push({ rule, actual, expected })
  }
  const business = projectBattleBusinessTrace(trace)
  check(
    '原生初始阵容、敌槽与库存',
    [
      business.start.players.map(({ id, hp, mp }) => [id, hp, mp]),
      business.start.enemies
        .filter(Boolean)
        .map(({ id, slot, templateId }) => ({ id, slot, templateId })),
      business.start.inventory,
    ],
    [
      scenario.party.map(({ id, hp }) => [id, hp, 100]),
      configured.enemies,
      configured.game.fixture.inventory
        .map(({ itemId, count }) => ({ itemId: String(itemId), count }))
        .sort((a, b) => a.itemId.localeCompare(b.itemId)),
    ],
  )
  check('所有真实选招及顺序', business.commands, scenario.commands)
  check(
    '选招与真实键盘回执配对',
    scenario.commands.every(({ kind }, index) =>
      inputs.some(
        ({ commandIndex, key }) =>
          commandIndex === index && key === (kind === 'defend' ? 'KeyD' : confirmKey(trace)),
      ),
    ),
    true,
  )
  const defeat = id === 'puppet-all-dead'
  check(
    '正常战果结算',
    [trace.terminal.result, trace.terminal.settlementCount],
    defeat ? ['defeat', 0] : ['victory', 1],
  )
  for (const { itemId, order, actorSide, before, after } of trace.actions)
    if (itemId && actorSide !== 'enemy')
      check(
        `道具 ${itemId} @${order} 实际消耗一次`,
        countItem(before, itemId) - countItem(after, itemId),
        1,
      )
  const frames = trace.presentations.filter(({ kind }) => kind === 'battle-frame')
  check(
    '实际画帧、动作和启播均有原件',
    [
      frames.length > 0,
      trace.actions.length > 0,
      (trace.audioEvents ?? []).some(({ kind }) => kind === 'sfx-start'),
    ],
    [true, true, true],
  )
  if (id.startsWith('equipped-dual-all')) checkGroupAttack(trace, scenario, frames, inputs, check)
  else if (family === 'buff') checkBuffs(trace, id, frames, check)
  else if (family === 'puppet') checkPuppet(trace, id, frames, check)
  else if (id === 'trance-after-revival') checkTranceRevival(trace, frames, check)
  else if (family === 'revival')
    checkBuffedPuppet(trace, id === 'puppet-buffs-expire', frames, check)
  else if (family === 'confusion') checkConfusion(trace, scenario, frames, check)
  else if (family === 'silence') checkAttachment(trace, id, frames, check)
  else checkOverlap(trace, id, frames, inputs, menu, check)
  if (id.startsWith('trance-'))
    checkTrancePresentation(trace, frames, id === 'trance-after-revival' ? 0 : 1, check)
  if (family === 'revival')
    checkRevivalPortraits(
      trace,
      frames,
      id === 'trance-after-revival',
      id === 'puppet-buffs-expire',
      check,
    )
  return { facts, findings }
}
