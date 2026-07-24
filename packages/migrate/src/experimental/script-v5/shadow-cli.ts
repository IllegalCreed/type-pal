export interface P2ShadowCliOptions {
  check: boolean
  through: 'p2'
}

export function parseP2ShadowCliArgs(args: readonly string[]): P2ShadowCliOptions {
  let check = false
  let throughSeen = false
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
      if (value !== 'p2') throw new Error('目前只实现 --through p2')
      throughSeen = true
      index++
      continue
    }
    if (argument.startsWith('--through=')) {
      if (throughSeen) throw new Error('重复参数: --through')
      if (argument !== '--through=p2') throw new Error('目前只实现 --through=p2')
      throughSeen = true
      continue
    }
    throw new Error(`未知参数: ${argument}`)
  }
  return { check, through: 'p2' }
}
