/** V8 coverage must not reuse Node's serialized compile cache, including in child workers. */
export function preciseCoverageEnvironment(overrides = {}, inherited = process.env) {
  const environment = { ...inherited, ...overrides, NODE_DISABLE_COMPILE_CACHE: '1' }
  delete environment.NODE_COMPILE_CACHE
  return environment
}
