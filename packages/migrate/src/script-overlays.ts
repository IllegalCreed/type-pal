import type { Command, SceneDef } from '@type-pal/content'

function insertAfter(
  body: Command[],
  predicate: (command: Command) => boolean,
  commands: Command[],
): void {
  const index = body.findIndex(predicate)
  if (index < 0) throw new Error('PAL script overlay: 语义锚点不存在')
  body.splice(index + 1, 0, ...commands)
}

function insertBefore(
  body: Command[],
  start: number,
  predicate: (command: Command) => boolean,
  commands: Command[],
): void {
  const relative = body.slice(start).findIndex(predicate)
  if (relative < 0) throw new Error('PAL script overlay: 语义锚点不存在')
  body.splice(start + relative, 0, ...commands)
}

/**
 * 迁移源之外、已经由用户按一阶段画面拍板的演出。锚点使用语义字段，不依赖数组下标；
 * 输入每次都是新迁移结果，因此函数天然幂等，不读取旧产物。
 */
export function applyPalScriptOverlays(scenes: SceneDef[]): SceneDef[] {
  return scenes.map((scene) => {
    if (scene.id === 's059') {
      const next = structuredClone(scene)
      const body = next.onEnter?.[0]?.body
      if (!body) throw new Error('PAL script overlay: s059 缺 onEnter[0]')
      const call = body.findIndex(
        (command) => command.kind === 'dialog' && command.cue.rows[0]?.text === 'dlg.4348',
      )
      const fadeOut = body.findIndex(
        (command, index) => index > call && command.kind === 'fade' && command.dir === 'out',
      )
      if (call < 0 || fadeOut < 0) throw new Error('PAL script overlay: s059 血池淡出锚点不存在')

      // 原版 0x50 只记 fNeedToFadeIn；随后首个 0x09 在 PAL_MakeScene 中自动 FadeIn(1)。
      // clean 脚本没有隐式全局 flag，故在该首个渲染等待点前显式表达同一 600ms 淡入。
      insertBefore(body, fadeOut + 1, (command) => command.kind === 'wait', [
        { kind: 'fade', dir: 'in', ms: 600 },
      ])
      return next
    }
    if (scene.id !== 's001') return scene
    const next = structuredClone(scene)
    const body = next.onEnter?.[0]?.body
    if (!body) throw new Error('PAL script overlay: s001 缺 onEnter[0]')
    const aunt = next.entities.find((entity) => entity.id === 'e10')
    if (aunt) aunt.pages = undefined // 主时间线全权编排，禁止 auto 并行抢位。

    insertAfter(
      body,
      (command) =>
        command.kind === 'setEntityState' && command.entity === 'e10' && command.state === 2,
      [
        {
          kind: 'moveEntity',
          entity: 'e10',
          to: { col: 60, row: -18.5, height: 0 },
          speed: 'normal',
        },
      ],
    )
    const question = body.findIndex(
      (command) => command.kind === 'dialog' && command.cue.rows[0]?.text === 'dlg.1369',
    )
    const turn = body.findIndex(
      (command, index) =>
        index > question &&
        command.kind === 'setEntityFacing' &&
        command.entity === 'e10' &&
        command.facing === 'up',
    )
    if (question < 0 || turn < 0) throw new Error('PAL script overlay: 李大娘回头锚点不存在')
    body.splice(turn, 0, {
      kind: 'moveEntity',
      entity: 'e10',
      to: { col: 60, row: -17, height: 0 },
      speed: 'normal',
    })

    const reply = body.findIndex(
      (command) => command.kind === 'dialog' && command.cue.rows[0]?.text === 'dlg.1371',
    )
    const partyMove = body.findIndex(
      (command, index) => index > reply && command.kind === 'moveParty',
    )
    if (reply < 0 || partyMove < 0) throw new Error('PAL script overlay: 李大娘退场锚点不存在')
    body.splice(
      partyMove,
      0,
      {
        kind: 'moveEntity',
        entity: 'e10',
        to: { col: 60, row: -12, height: 0 },
        speed: 'normal',
      },
      { kind: 'setEntityState', entity: 'e3', state: 1 },
      { kind: 'setEntityState', entity: 'e10', state: 0 },
    )
    return next
  })
}
