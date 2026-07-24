export interface ScriptV5ShadowCliOptions {
  check: boolean
  through: 'p2' | 'p3'
}

export function parseScriptV5ShadowCliArgs(args: readonly string[]): ScriptV5ShadowCliOptions {
  let check = false
  let throughSeen = false
  let through: ScriptV5ShadowCliOptions['through'] = 'p3'
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!
    if (argument === '--check') {
      if (check) throw new Error('重复参数: --check')
      check = true
      continue
    }
    if (argument === '--through') {
      if (throughSeen) throw new Error('重复参数: --through')
      const value = args[index + 1]
      if (value !== 'p2' && value !== 'p3') throw new Error('--through 只接受 p2 或 p3')
      throughSeen = true
      through = value
      index++
      continue
    }
    if (argument.startsWith('--through=')) {
      if (throughSeen) throw new Error('重复参数: --through')
      const value = argument.slice('--through='.length)
      if (value !== 'p2' && value !== 'p3') throw new Error('--through= 只接受 p2 或 p3')
      throughSeen = true
      through = value
      continue
    }
    throw new Error(`未知参数: ${argument}`)
  }
  return { check, through }
}
