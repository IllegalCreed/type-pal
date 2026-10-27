import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { posix } from 'node:path'

// Existing JSON/Markdown-only CLI fixtures do not acquire an HTML dependency.
// The declared parser is mandatory when an admitted HTML document is actually read.
const require = createRequire(import.meta.url)
let parse

const digest = (value) => createHash('sha256').update(value).digest('hex')

/** Static HTML syntax only: no browser, script, network or rendering execution. */
export function readHistoricalHtml(bytes) {
  if (!Buffer.isBuffer(bytes)) throw new Error('HTML byte buffer required')
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  const errors = []
  parse ??= require('parse5').parse
  const tree = parse(text, {
    sourceCodeLocationInfo: true,
    onParseError: (error) => errors.push(error.code),
  })
  const result = {
    format: 'static-html-reading/1',
    title: '',
    titleSource: '',
    ids: [],
    canvases: [],
    scripts: [],
    references: [],
    parseErrors: errors,
  }
  const textContent = (node) =>
    node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(textContent).join('')
  function walk(node) {
    const attrs = Object.fromEntries((node.attrs ?? []).map((attr) => [attr.name, attr.value]))
    if (attrs.id !== undefined) result.ids.push({ tag: node.tagName, id: attrs.id })
    if (node.tagName === 'title') {
      result.title = textContent(node)
      const location = node.sourceCodeLocation
      result.titleSource = text.slice(location.startTag.endOffset, location.endTag.startOffset)
    }
    if (node.tagName === 'canvas')
      result.canvases.push({
        id: attrs.id ?? null,
        width: attrs.width ?? null,
        height: attrs.height ?? null,
      })
    if (node.tagName === 'script')
      result.scripts.push({
        src: attrs.src ?? null,
        type: attrs.type ?? null,
        inlineSha256: attrs.src === undefined ? digest(textContent(node)) : null,
      })
    for (const attribute of ['src', 'href'])
      if (attrs[attribute] !== undefined)
        result.references.push({ tag: node.tagName, attribute, value: attrs[attribute] })
    for (const child of node.childNodes ?? []) walk(child)
    if (node.content) walk(node.content)
  }
  walk(tree)
  return result
}

export function readHtmlResources(path, reading, read) {
  return reading.references.map((reference) => {
    const value = reference.value
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/iu.test(value))
      return { ...reference, kind: 'external-or-fragment', resolvedPath: null, present: null }
    const absolute = value.startsWith('/')
    const resolvedPath = absolute
      ? value.slice(1).split(/[?#]/u, 1)[0]
      : posix.normalize(posix.join(posix.dirname(path), value.split(/[?#]/u, 1)[0]))
    if (!resolvedPath.startsWith('docs/') || resolvedPath.split('/').includes('..'))
      return { ...reference, kind: 'outside-document-domain', resolvedPath, present: null }
    return {
      ...reference,
      kind: absolute ? 'root-absolute' : 'relative',
      resolvedPath,
      present: read(resolvedPath) !== undefined,
    }
  })
}
