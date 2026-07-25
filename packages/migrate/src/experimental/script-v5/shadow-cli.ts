export interface ScriptV5ShadowCliOptions {
  check: boolean
  publish: boolean
  rebuildPublished: boolean
  through: 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7'
}

export function parseScriptV5ShadowCliArgs(args: readonly string[]): ScriptV5ShadowCliOptions {
  let check = false
  let publish = false
  let rebuildPublished = false
  let throughSeen = false
  let through: ScriptV5ShadowCliOptions['through'] = 'p7'
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!
    if (argument === '--check') {
      if (check) throw new Error('重复参数: --check')
      check = true
      continue
    }
    if (argument === '--publish') {
      if (publish) throw new Error('重复参数: --publish')
      publish = true
      continue
    }
    if (argument === '--rebuild-published') {
      if (rebuildPublished) throw new Error('重复参数: --rebuild-published')
      rebuildPublished = true
      continue
    }
    if (argument === '--through') {
      if (throughSeen) throw new Error('重复参数: --through')
      const value = args[index + 1]
      if (
        value !== 'p2' &&
        value !== 'p3' &&
        value !== 'p4' &&
        value !== 'p5' &&
        value !== 'p6' &&
        value !== 'p7'
      )
        throw new Error('--through 只接受 p2、p3、p4、p5、p6 或 p7')
      throughSeen = true
      through = value
      index++
      continue
    }
    if (argument.startsWith('--through=')) {
      if (throughSeen) throw new Error('重复参数: --through')
      const value = argument.slice('--through='.length)
      if (
        value !== 'p2' &&
        value !== 'p3' &&
        value !== 'p4' &&
        value !== 'p5' &&
        value !== 'p6' &&
        value !== 'p7'
      )
        throw new Error('--through= 只接受 p2、p3、p4、p5、p6 或 p7')
      throughSeen = true
      through = value
      continue
    }
    throw new Error(`未知参数: ${argument}`)
  }
  if (publish && check) throw new Error('--publish 与 --check 不能同时使用')
  if (publish && through !== 'p7') throw new Error('--publish 只允许 --through p7')
  if (rebuildPublished && through !== 'p7')
    throw new Error('--rebuild-published 只允许 --through p7')
  return { check, publish, rebuildPublished, through }
}
