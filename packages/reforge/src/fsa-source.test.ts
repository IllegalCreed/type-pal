import { describe, expect, test } from 'vitest'
import { fsaSource } from './fsa-source.js'

function gate() {
  let release: () => void = () => {
    throw new Error('Test gate was not initialized')
  }
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function assetDirectory(
  body = '{"caption":"山路"}',
  after: (step: string) => void | Promise<void> = () => {},
) {
  const operations: string[] = []
  async function step(name: string) {
    operations.push(name)
    await after(name)
  }
  const file = new File([body], 'route.json', { type: 'application/json' })
  const readFileText = file.text.bind(file)
  file.text = async () => {
    await step('read text')
    return readFileText()
  }
  const readFileBytes = file.arrayBuffer.bind(file)
  file.arrayBuffer = async () => {
    await step('read bytes')
    return readFileBytes()
  }

  const handle: FileSystemFileHandle = {
    kind: 'file',
    name: file.name,
    async isSameEntry(other) {
      return other === handle
    },
    async getFile() {
      await step('get file')
      return file
    },
    async createWritable() {
      throw new Error('Read fixture cannot write a file')
    },
  }
  function unexpectedListing(): never {
    throw new Error('A direct file read does not list a directory')
  }
  function directory(name: string): FileSystemDirectoryHandle {
    const dir: FileSystemDirectoryHandle = {
      kind: 'directory',
      name,
      async getDirectoryHandle(child) {
        await step(`directory ${child}`)
        if (name === 'project' && child === 'content') return directory(child)
        if (name === 'content' && child === 'maps') return directory(child)
        throw new DOMException(child, 'NotFoundError')
      },
      async getFileHandle(child) {
        await step(`file ${child}`)
        if (name === 'maps' && child === file.name) return handle
        throw new DOMException(child, 'NotFoundError')
      },
      async isSameEntry(other) {
        return other === dir
      },
      async removeEntry() {
        throw new Error('Read fixture cannot remove an entry')
      },
      async resolve() {
        return null
      },
      [Symbol.asyncIterator]: unexpectedListing,
      entries: unexpectedListing,
      keys: unexpectedListing,
      values: unexpectedListing,
    }
    return dir
  }
  return { source: fsaSource(directory('project')), operations }
}

const route = 'content/maps/route.json'
const traverse = ['directory content', 'directory maps', 'file route.json', 'get file']

function pauseAt(operation: string) {
  const entered = gate()
  const resume = gate()
  return {
    entered: entered.promise,
    release: resume.release,
    async after(step: string) {
      if (step !== operation) return
      entered.release()
      await resume.promise
    },
  }
}

function operationOf(
  source: ReturnType<typeof fsaSource>,
  operation: 'text' | 'json' | 'bytes',
  signal: AbortSignal,
) {
  switch (operation) {
    case 'text':
      return source.readText(route, signal)
    case 'json':
      return source.readJson(route, signal)
    case 'bytes':
      return source.readBytes(route, signal)
  }
}

describe('directory file reads', () => {
  test('traverses the registered project path and returns text, parsed JSON and exact bytes', async () => {
    const literal = '{"caption":"山路"}'
    const { source, operations } = assetDirectory(literal)
    await expect(source.readText(route)).resolves.toBe(literal)
    await expect(source.readJson(route)).resolves.toEqual({ caption: '山路' })
    expect(new Uint8Array(await source.readBytes(route))).toEqual(new TextEncoder().encode(literal))
    expect(operations).toEqual([
      ...traverse,
      'read text',
      ...traverse,
      'read text',
      ...traverse,
      'read bytes',
    ])
  })

  test('reports native absence separately from malformed JSON', async () => {
    const { source } = assetDirectory('{incomplete')
    await expect(source.readText('content/maps/absent.json')).rejects.toMatchObject({
      name: 'NotFoundError',
      message: 'absent.json',
    })
    await expect(source.readText(route)).resolves.toBe('{incomplete')
    await expect(source.readJson(route)).rejects.toBeInstanceOf(SyntaxError)
  })

  test('rejects absolute and parent paths without opening any handle', async () => {
    const { source, operations } = assetDirectory()
    await expect(source.readText(`/${route}`)).rejects.toThrow(
      new Error(`fsaSource 路径: 禁止绝对路径 "/${route}"`),
    )
    await expect(source.urlFor('../route.json')).rejects.toThrow(
      new Error('fsaSource 路径: 禁止空段、. 或 .. "../route.json"'),
    )
    expect(operations).toEqual([])
  })
})

describe('directory read cancellation', () => {
  test('a signal already aborted rejects before directory traversal', async () => {
    const { source, operations } = assetDirectory()
    await expect(source.readJson(route, AbortSignal.abort())).rejects.toMatchObject({
      name: 'AbortError',
      message: 'file read aborted',
    })
    expect(operations).toEqual([])
  })

  test.each([
    { interrupted: 'directory content', method: 'text', started: ['directory content'] },
    { interrupted: 'file route.json', method: 'bytes', started: traverse.slice(0, 3) },
    { interrupted: 'get file', method: 'json', started: traverse },
    { interrupted: 'read text', method: 'json', started: [...traverse, 'read text'] },
    { interrupted: 'read bytes', method: 'bytes', started: [...traverse, 'read bytes'] },
  ] satisfies {
    interrupted: string
    method: Parameters<typeof operationOf>[1]
    started: string[]
  }[])('cancels during $interrupted before observing success or starting the next IO', async ({
    interrupted,
    method,
    started,
  }) => {
    // Invalid JSON distinguishes cancellation after the body read from an accidental parse.
    const paused = pauseAt(interrupted)
    const { source, operations } = assetDirectory('{incomplete', paused.after)
    const controller = new AbortController()
    const outcome = operationOf(source, method, controller.signal)
    const rejection = expect(outcome).rejects.toMatchObject({
      name: 'AbortError',
      message: 'file read aborted',
    })
    await paused.entered
    try {
      expect(operations).toEqual(started)
      controller.abort()
    } finally {
      paused.release()
    }
    await rejection
    expect(operations).toEqual(started)
  })
})

describe('local object URL lifetime', () => {
  test('reuses a file URL within a source and revokes it when that source is disposed', async () => {
    const { source, operations } = assetDirectory()
    const url = await source.urlFor(route)
    try {
      expect(await source.urlFor(route)).toBe(url)
      const response = await fetch(url)
      expect(response.ok).toBe(true)
      await expect(response.text()).resolves.toBe('{"caption":"山路"}')
      expect(operations).toEqual(traverse)
      source.dispose?.()
      await expect(fetch(url)).rejects.toBeInstanceOf(TypeError)
    } finally {
      source.dispose?.()
      URL.revokeObjectURL(url)
    }
  })

  test('overlapping callers can share a single readable URL that is revoked on dispose', async () => {
    const paused = pauseAt('get file')
    const { source, operations } = assetDirectory(undefined, paused.after)
    const first = source.urlFor(route)
    await paused.entered
    const second = source.urlFor(route)
    paused.release()
    const urls = await Promise.all([first, second])
    try {
      expect(urls[0]).toBe(urls[1])
      await expect((await fetch(urls[0])).text()).resolves.toBe('{"caption":"山路"}')
      expect(operations).toEqual(traverse)
      source.dispose?.()
      await expect(fetch(urls[0])).rejects.toBeInstanceOf(TypeError)
    } finally {
      source.dispose?.()
      for (const url of urls) URL.revokeObjectURL(url)
    }
  })

  test('disposal cancels an in-flight URL without affecting a fresh read', async () => {
    const paused = pauseAt('get file')
    const { source } = assetDirectory(undefined, paused.after)
    const first = source.urlFor(route).then(
      (url) => ({ url }),
      (error: unknown) => ({ error }),
    )
    await paused.entered
    source.dispose?.()
    const fresh = source.urlFor(route)
    paused.release()
    const [outcome, freshUrl] = await Promise.all([first, fresh])
    try {
      expect(outcome).toEqual({ error: expect.objectContaining({ name: 'AbortError' }) })
      await expect((await fetch(freshUrl)).text()).resolves.toBe('{"caption":"山路"}')
      expect(await source.urlFor(route)).toBe(freshUrl)
    } finally {
      source.dispose?.()
      if ('url' in outcome) URL.revokeObjectURL(outcome.url)
      URL.revokeObjectURL(freshUrl)
    }
  })
})
