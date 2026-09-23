globalThis.__initializerCalls = {
  both: 0,
  staticOnly: 0,
  instanceOnly: 0,
  nested: 0,
  anonymous: 0,
  plain: 0,
}

function hit(name, value) {
  globalThis.__initializerCalls[name]++
  if (value !== 1) throw new Error('version rejected')
  return name
}

export class Both {
  static limit = 128
  running = false
  runBoth(value) {
    return hit('both', value)
  }
}
export class StaticOnly {
  static limit = 128
  runStatic(value) {
    return hit('staticOnly', value)
  }
}
export class InstanceOnly {
  running = false
  runInstance(value) {
    return hit('instanceOnly', value)
  }
}
function makeNested() {
  return class Nested {
    static limit = 128
    running = false
    runNested(value) {
      return hit('nested', value)
    }
  }
}
export const Nested = makeNested()
export const Anonymous = class {
  static limit = 128
  running = false
  runAnonymous(value) {
    return hit('anonymous', value)
  }
}
export function plain(value) {
  return hit('plain', value)
}
