import type { EditorDerivedReply, EditorDerivedRequest } from './editor-derived-contract.js'
import { createEditorDerivedWorkerRuntime } from './editor-derived-core.js'

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<EditorDerivedRequest>) => void) | null
  postMessage(message: EditorDerivedReply): void
}
const runtime = createEditorDerivedWorkerRuntime()

scope.onmessage = (event) => scope.postMessage(runtime.handle(event.data))
