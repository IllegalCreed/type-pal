import { type ScriptStage, sceneEntryPrepareSafety } from '@type-pal/content'

export type SceneEntryLiftResult =
  | { kind: 'lifted'; stage: ScriptStage; ditherIndex: number }
  | { kind: 'unchanged'; stage: ScriptStage; reason: 'already-entry' | 'no-dither' | 'blocked' }

/**
 * 把 onEnter stage 的“安全同步前缀 + ditherScreen”一次性提升为显式 entry。
 * 这是迁移边界转换，不用于运行时；遇到首个不安全命令立即 fail-closed，不跨分支/调用猜执行路径。
 */
export function liftEarlyDitherSceneEntry(stage: ScriptStage): SceneEntryLiftResult {
  if (stage.entry) return { kind: 'unchanged', stage, reason: 'already-entry' }
  for (let index = 0; index < stage.body.length; index++) {
    const command = stage.body[index]!
    if (command.kind === 'ditherScreen') {
      return {
        kind: 'lifted',
        ditherIndex: index,
        stage: {
          ...stage,
          entry: {
            prepare: stage.body.slice(0, index),
            reveal: {
              kind: 'dither',
              ms: command.ms ?? 720,
              source: 'previousPresentedFrame',
            },
          },
          body: stage.body.slice(index + 1),
        },
      }
    }
    if (sceneEntryPrepareSafety(command) === 'blocked')
      return { kind: 'unchanged', stage, reason: 'blocked' }
  }
  return { kind: 'unchanged', stage, reason: 'no-dither' }
}
