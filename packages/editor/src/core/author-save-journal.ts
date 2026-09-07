/** Durable, forward-only author save IO. Disk JSON never mints an author-write capability. */
import { CONTENT_VERSION } from '@type-pal/content'
import {
  assertProjectSaveReadable,
  type FileSource,
  fsaSource,
  PROJECT_SAVE_RECOVERY_PATH,
  PROJECT_SAVE_STATE_PATH,
  type ProjectSaveState,
  parseProjectSaveState,
  projectSaveStateToken,
  readProjectSaveState,
} from '@type-pal/reforge'
import type { AuthorDiskBaseline } from './author-disk-baseline.js'
import {
  type AuthorSavePlan,
  assertSavePath,
  parseAuthorSavePlan,
  parseSaveSignature,
  type SaveIdentity,
  type SaveSignature,
  type SaveStep,
  savePayloadHash,
  savePrefix,
} from './author-save-plan.js'
import {
  AuthorSaveRecoveryConflict,
  reconcileSaveCursor,
  type SaveDiskState,
} from './author-save-prefix.js'
import {
  type AuthorSaveReceipt,
  deleteStagingAuthorSaveReceipt,
  findAuthorSaveReceipt,
  loadAuthorSaveReceipt,
  storeAuthorSaveReceipt,
} from './author-save-store.js'
import { binarySnapshotSignature, sha256Hex } from './binary-signature.js'
import {
  assertWorkspaceRegistrationLock,
  findWorkspaceRecordByHandle,
  loadWorkspaceRecord,
  saveWorkspaceHandleUnderLock,
  type WorkspaceRegistrationLock,
  withWorkspaceDiscoveryLock,
  withWorkspaceRegistrationLock,
} from './handle-store.js'
import {
  PAL_DEVELOPMENT_SENTINEL_PATH,
  SANDBOX_WORKSPACE_MARKER_PATH,
  type WorkspaceContext,
} from './workspace-context.js'
import {
  type AuthorizedWorkspaceMutation,
  allowAuthorizedSavePrivateFile,
  authorizedSaveScope,
  beginAuthorizedWorkspaceMutation,
  completeAuthorizedWorkspaceData,
  planAuthorizedWorkspacePaths,
  recordAuthorizedWorkspaceRemoveCompleted,
  recordAuthorizedWorkspaceWriteCompleted,
  sealAuthorizedSavePlan,
  withAuthorizedSaveJob,
} from './workspace-persistence.js'

export type AuthorSaveInput =
  | { kind: 'write'; path: string; read: () => Promise<Blob> }
  | { kind: 'remove'; path: string }
  | { kind: 'mkdir'; path: string }
export interface AuthorSaveJournalResult {
  kind: 'committed'
  operationId: string
  cleanupWarning?: string
}

export class MissingAuthorSaveReceiptError extends Error {
  constructor() {
    super('缺少原浏览器的恢复凭据，请保留目录并回到原浏览器完成保存')
    this.name = 'MissingAuthorSaveReceiptError'
  }
}
declare const preparedBrand: unique symbol
export type PreparedAuthorSave = Readonly<{ [preparedBrand]: never }>
interface Prepared {
  mutation: AuthorizedWorkspaceMutation
  workspace: WorkspaceContext
  receipt: AuthorSaveReceipt
  plan: AuthorSavePlan
  phase: 'ready' | 'committing' | 'spent'
}
const prepared = new WeakMap<object, Prepared>()
interface OwnedSave {
  scope: ReturnType<typeof authorizedSaveScope>
  operationId: string
  /** The original sealed plan, retained as hash evidence even after another page cleans blobs. */
  plan?: AuthorSavePlan
  planHash?: string
}
const ownedSaves = new WeakMap<WorkspaceContext, OwnedSave>()
const encoder = new TextEncoder(),
  decoder = new TextDecoder()
const metadataPaths = [PAL_DEVELOPMENT_SENTINEL_PATH, SANDBOX_WORKSPACE_MARKER_PATH]

function missing(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError'
}
function rootFor(receipt: AuthorSaveReceipt): string {
  return `${PROJECT_SAVE_RECOVERY_PATH}/${receipt.operationId}`
}
function signature(bytes: ArrayBuffer): Promise<SaveSignature> {
  return binarySnapshotSignature(bytes).then(parseSaveSignature)
}
async function readBytes(
  dir: FileSystemDirectoryHandle,
  path: string,
): Promise<ArrayBuffer | null> {
  try {
    return await fsaSource(dir).readBytes(path)
  } catch (error) {
    if (missing(error)) return null
    throw error
  }
}
async function fileSignature(dir: FileSystemDirectoryHandle, path: string): Promise<SaveSignature> {
  const bytes = await readBytes(dir, path)
  return bytes === null ? null : signature(bytes)
}
async function directory(
  dir: FileSystemDirectoryHandle,
  path: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  let current = dir
  for (const part of path.split('/').filter(Boolean))
    current = await current.getDirectoryHandle(part, { create })
  return current
}
async function directoryExists(dir: FileSystemDirectoryHandle, path: string): Promise<boolean> {
  try {
    await directory(dir, path)
    return true
  } catch (error) {
    if (missing(error)) return false
    throw error
  }
}
/** All callers are private code below, using checked fixed metadata paths or validated plan steps. */
async function writeBytes(
  dir: FileSystemDirectoryHandle,
  path: string,
  bytes: ArrayBuffer,
  privatePath = false,
): Promise<void> {
  const parts = path.split('/'),
    name = parts.pop()!
  const parent = await directory(dir, parts.join('/'), privatePath)
  const stream = await (await parent.getFileHandle(name, { create: true })).createWritable()
  try {
    await stream.write(new Blob([bytes]))
    await stream.close()
  } catch (error) {
    try {
      await stream.abort()
    } catch {
      /* close may already have committed */
    }
    throw error
  }
}
async function removeFile(dir: FileSystemDirectoryHandle, path: string): Promise<void> {
  const parts = path.split('/'),
    name = parts.pop()!
  try {
    await (await directory(dir, parts.join('/'))).removeEntry(name)
  } catch (error) {
    if (!missing(error)) throw error
  }
}
async function diskState(
  dir: FileSystemDirectoryHandle,
  plan: AuthorSavePlan,
): Promise<SaveDiskState> {
  const files = new Map<string, SaveSignature>(),
    dirs = new Map<string, boolean>()
  for (const path of Object.keys(plan.before)) files.set(path, await fileSignature(dir, path))
  for (const path of Object.keys(plan.directories)) dirs.set(path, await directoryExists(dir, path))
  return { files, directories: dirs }
}
async function assertMetadata(receipt: AuthorSaveReceipt): Promise<void> {
  for (const path of metadataPaths)
    if ((await fileSignature(receipt.handle, path)) !== receipt.metadata[path])
      throw new AuthorSaveRecoveryConflict(path)
}
async function assertBinding(
  receipt: AuthorSaveReceipt,
  dir: FileSystemDirectoryHandle,
): Promise<void> {
  if (!(await receipt.handle.isSameEntry(dir))) throw new Error('恢复记录与原目录不符，拒绝重放')
  const [byId, byHandle] = await Promise.all([
    loadWorkspaceRecord(receipt.workspaceId),
    findWorkspaceRecordByHandle(dir),
  ])
  if (byHandle && byHandle.workspaceId !== receipt.workspaceId)
    throw new Error('恢复目录已属于另一个工作区')
  if (
    byId &&
    (byId.projectId !== receipt.identity.projectId ||
      byId.mode !== receipt.identity.mode ||
      byId.source !== receipt.identity.source ||
      !(await byId.handle.isSameEntry(dir)))
  )
    throw new Error('恢复记录与已登记工作区冲突')
  await assertMetadata(receipt)
}
function receiptState(
  receipt: AuthorSaveReceipt,
  phase: ProjectSaveState['phase'],
): ProjectSaveState {
  if (!receipt.planHash) throw new Error('恢复计划尚未封存')
  return {
    kind: 'type-pal-author-save',
    version: 1,
    operationId: receipt.operationId,
    phase,
    planHash: receipt.planHash,
  }
}
async function assertCurrentReceipt(receipt: AuthorSaveReceipt): Promise<void> {
  const current = await loadAuthorSaveReceipt(receipt.workspaceId)
  if (
    !current ||
    !(await current.handle.isSameEntry(receipt.handle)) ||
    JSON.stringify({ ...current, handle: null }) !== JSON.stringify({ ...receipt, handle: null })
  )
    throw new Error('保存恢复凭据在操作期间变化，已停止')
}
async function persist(
  receipt: AuthorSaveReceipt,
  change: Partial<AuthorSaveReceipt>,
): Promise<void> {
  await assertCurrentReceipt(receipt)
  const next = { ...receipt, ...change }
  await storeAuthorSaveReceipt(next)
  Object.assign(receipt, next)
}
async function payload(
  receipt: AuthorSaveReceipt,
  digest: Exclude<SaveSignature, null>,
): Promise<ArrayBuffer> {
  const path = `${rootFor(receipt)}/blobs/${savePayloadHash(digest)}`
  const bytes = await readBytes(receipt.handle, path)
  if (bytes === null || (await signature(bytes)) !== digest)
    throw new Error(`恢复数据缺失或损坏：${path}`)
  return bytes
}
async function loadPlan(receipt: AuthorSaveReceipt): Promise<AuthorSavePlan> {
  const bytes = await readBytes(receipt.handle, `${rootFor(receipt)}/plan.json`)
  if (bytes === null || (await sha256Hex(bytes)) !== receipt.planHash)
    throw new Error('恢复计划缺失或哈希不符；请保留目录')
  const plan = parseAuthorSavePlan(JSON.parse(decoder.decode(bytes)), receipt.identity)
  if (plan.operationId !== receipt.operationId) throw new Error('恢复计划操作标识不符')
  for (const step of plan.steps)
    if (step.kind === 'write') {
      if (receipt.staged[`blobs/${savePayloadHash(step.signature)}`] !== step.signature)
        throw new Error('恢复凭据未登记目标数据')
      await payload(receipt, step.signature)
    }
  return plan
}
function viewOf(receipt: AuthorSaveReceipt, plan: AuthorSavePlan): FileSource {
  const writes = new Map<string, Exclude<SaveSignature, null> | null>()
  for (const step of plan.steps)
    if (step.kind !== 'mkdir') writes.set(step.path, step.kind === 'write' ? step.signature : null)
  const read = async (path: string): Promise<ArrayBuffer> => {
    if (path === PROJECT_SAVE_STATE_PATH) {
      if (receipt.previousState === 'null') throw new DOMException(path, 'NotFoundError')
      return encoder.encode(receipt.previousState).buffer
    }
    if (writes.has(path)) {
      const digest = writes.get(path)
      if (!digest) throw new DOMException(path, 'NotFoundError')
      return payload(receipt, digest)
    }
    const bytes = await readBytes(receipt.handle, path)
    if (bytes === null) throw new DOMException(path, 'NotFoundError')
    if (Object.hasOwn(plan.before, path) && (await signature(bytes)) !== plan.before[path])
      throw new AuthorSaveRecoveryConflict(path)
    return bytes
  }
  return {
    readBytes: read,
    readText: async (path) => decoder.decode(await read(path)),
    readJson: async <T>(path: string) => JSON.parse(decoder.decode(await read(path))) as T,
    urlFor: async () => {
      throw new Error('恢复封存视图不能用于渲染')
    },
  }
}

/** Freeze bytes under a genuine policy mutation; validate receives ONLY the staged read view. */
export function prepareAuthorSave(
  mutation: AuthorizedWorkspaceMutation,
  inputs: readonly AuthorSaveInput[],
  validate: (source: FileSource) => Promise<void>,
  options: {
    catalogPath?: string
    onStaged?: (bytes: number) => void
    beforeSeal?: () => Promise<void>
  } = {},
): Promise<PreparedAuthorSave> {
  return withAuthorizedSaveJob(mutation, () =>
    prepareInsideScope(mutation, inputs, validate, options),
  )
}

async function prepareInsideScope(
  mutation: AuthorizedWorkspaceMutation,
  inputs: readonly AuthorSaveInput[],
  validate: (source: FileSource) => Promise<void>,
  options: {
    catalogPath?: string
    onStaged?: (bytes: number) => void
    beforeSeal?: () => Promise<void>
  } = {},
): Promise<PreparedAuthorSave> {
  const scope = authorizedSaveScope(mutation)
  for (const input of inputs) assertSavePath(input.path)
  await planAuthorizedWorkspacePaths(
    mutation,
    inputs.filter((input) => input.kind !== 'mkdir').map((input) => input.path),
    options.catalogPath,
  )
  const old = await findAuthorSaveReceipt(scope.dir)
  // The marker may have committed while the final receipt transaction failed. This is cleanup
  // only, not an unfinished author write; a new legitimate save must not require the old page.
  if (old?.phase === 'data-complete' && (await stateForReplay(old)) === 'committed') {
    await assertBinding(old, scope.dir)
    await persist(old, { phase: 'committed' })
  }
  if (old && old.phase !== 'committed') throw new Error('项目有未完成的保存，请先完成恢复')
  if (old && Object.keys(old.staged).length) {
    const warning = await cleanup(old)
    if (warning) throw new Error(warning)
  }
  const previous = await readProjectSaveState(fsaSource(scope.dir))
  if (previous?.phase === 'pending') throw new Error('项目有未完成的保存，请先恢复')
  if (
    old &&
    (old.workspaceId !== scope.workspace.workspaceId ||
      previous?.operationId !== old.operationId ||
      previous.planHash !== old.planHash)
  )
    throw new Error('目录保存状态与原恢复凭据不一致')
  const identity: SaveIdentity = {
    workspaceId: scope.workspace.workspaceId,
    projectId: scope.workspace.projectId,
    mode: scope.workspace.mode,
    source: scope.workspace.source,
  }
  const before = Object.fromEntries(
    [...authorizedSaveScope(mutation).signatures].map(([path, digest]) => [
      path,
      parseSaveSignature(digest),
    ]),
  )
  const dirs: Record<string, boolean> = Object.create(null)
  const ensureKnown = async (path: string) => {
    const parts = path.split('/')
    parts.pop()
    for (let i = 1; i <= parts.length; i++) {
      const parent = parts.slice(0, i).join('/')
      if (!Object.hasOwn(dirs, parent)) dirs[parent] = await directoryExists(scope.dir, parent)
    }
  }
  for (const path of Object.keys(before)) await ensureKnown(path)
  for (const input of inputs) {
    await ensureKnown(input.path)
    if (input.kind === 'mkdir') dirs[input.path] = await directoryExists(scope.dir, input.path)
  }
  const steps: SaveStep[] = [],
    known = new Set(Object.keys(dirs).filter((path) => dirs[path]))
  const addDirectories = (path: string) => {
    const parts = path.split('/')
    parts.pop()
    for (let i = 1; i <= parts.length; i++) {
      const parent = parts.slice(0, i).join('/')
      if (!known.has(parent)) {
        steps.push({ kind: 'mkdir', path: parent })
        known.add(parent)
      }
    }
  }
  const receipt: AuthorSaveReceipt = {
    version: 1,
    contentVersion: CONTENT_VERSION,
    workspaceId: identity.workspaceId,
    identity,
    operationId: crypto.randomUUID(),
    ownerNonce: scope.ownerNonce,
    handle: scope.dir,
    phase: 'staging',
    planHash: null,
    previousState: projectSaveStateToken(previous),
    completed: 0,
    issued: false,
    metadata: Object.fromEntries(
      await Promise.all(
        metadataPaths.map(async (path) => [path, await fileSignature(scope.dir, path)]),
      ),
    ),
    staged: {},
    registrationName: scope.registrationName,
  }
  // Baseline/identity are rechecked again at true first author IO, after this private preparation.
  await assertBinding(receipt, scope.dir)
  await storeAuthorSaveReceipt(receipt)
  const owned: OwnedSave = { scope, operationId: receipt.operationId }
  ownedSaves.set(scope.workspace, owned)
  const stage = async (rel: string, bytes: ArrayBuffer): Promise<void> => {
    const digest = (await signature(bytes))!
    const path = `${rootFor(receipt)}/${rel}`
    const existing = await fileSignature(scope.dir, path)
    if (existing !== null && existing !== digest) throw new AuthorSaveRecoveryConflict(path)
    await persist(receipt, { staged: { ...receipt.staged, [rel]: digest } })
    allowAuthorizedSavePrivateFile(mutation, receipt.operationId, path, digest)
    if (existing === null) await writeBytes(scope.dir, path, bytes, true)
    if ((await fileSignature(scope.dir, path)) !== digest)
      throw new AuthorSaveRecoveryConflict(path)
  }
  for (const input of inputs) {
    authorizedSaveScope(mutation)
    addDirectories(input.path)
    if (input.kind === 'mkdir') {
      if (!known.has(input.path)) {
        steps.push(input)
        known.add(input.path)
      }
    } else if (input.kind === 'remove') steps.push(input)
    else {
      const bytes = await (await input.read()).arrayBuffer()
      const digest = (await signature(bytes))!
      await stage(`blobs/${savePayloadHash(digest)}`, bytes)
      steps.push({ kind: 'write', path: input.path, signature: digest })
      options.onStaged?.(bytes.byteLength)
    }
  }
  const plan = parseAuthorSavePlan(
    {
      kind: 'type-pal-author-save-plan',
      version: 1,
      contentVersion: CONTENT_VERSION,
      operationId: receipt.operationId,
      identity,
      before,
      directories: dirs,
      steps,
    },
    identity,
  )
  const view = viewOf(receipt, plan)
  const manifest = await view.readJson<{ id: unknown; contentVersion: unknown }>('manifest.json')
  if (manifest.id !== identity.projectId || manifest.contentVersion !== CONTENT_VERSION)
    throw new Error('保存目标清单与原授权项目身份或当前版本不符')
  await validate(view)
  const bytes = encoder.encode(`${JSON.stringify(plan)}\n`).buffer
  await stage('plan.json', bytes)
  const planHash = await sha256Hex(bytes)
  // Full payload re-read, full authorized pre-state, and identity all precede ready/publication.
  const candidate = { ...receipt, planHash }
  await loadPlan(candidate)
  reconcileSaveCursor(plan, { completed: 0, issued: false }, await diskState(scope.dir, plan))
  await assertMetadata(receipt)
  if (
    projectSaveStateToken(await readProjectSaveState(fsaSource(scope.dir))) !==
    receipt.previousState
  )
    throw new AuthorSaveRecoveryConflict(PROJECT_SAVE_STATE_PATH)
  // Copy inputs have now become durable bytes. Reject source drift BEFORE ready; a
  // later recovery must not depend on a source handle or rerun this page's callback.
  await options.beforeSeal?.()
  sealAuthorizedSavePlan(mutation, plan)
  await persist(receipt, { planHash, phase: 'ready' })
  owned.plan = plan
  owned.planHash = planHash
  const token = Object.freeze({}) as PreparedAuthorSave
  prepared.set(token, { mutation, workspace: scope.workspace, receipt, plan, phase: 'ready' })
  return token
}

async function publishState(
  receipt: AuthorSaveReceipt,
  phase: ProjectSaveState['phase'],
): Promise<void> {
  const bytes = encoder.encode(`${JSON.stringify(receiptState(receipt, phase))}\n`).buffer
  let writeFailure: { error: unknown } | undefined
  try {
    await writeBytes(receipt.handle, PROJECT_SAVE_STATE_PATH, bytes, true)
  } catch (error) {
    writeFailure = { error }
  }
  try {
    if (
      projectSaveStateToken(await readProjectSaveState(fsaSource(receipt.handle))) !==
      projectSaveStateToken(receiptState(receipt, phase))
    )
      throw new AuthorSaveRecoveryConflict(PROJECT_SAVE_STATE_PATH)
  } catch (error) {
    throw writeFailure ? writeFailure.error : error
  }
  // A close can commit and still reject (lost acknowledgement). Exact durable state resolves it.
}
async function stateForReplay(
  receipt: AuthorSaveReceipt,
): Promise<'previous' | 'pending' | 'committed'> {
  const bytes = await readBytes(receipt.handle, PROJECT_SAVE_STATE_PATH)
  if (bytes?.byteLength === 0 && receipt.phase === 'ready' && receipt.previousState === 'null')
    return 'previous'
  const value = bytes === null ? null : parseProjectSaveState(JSON.parse(decoder.decode(bytes)))
  const token = projectSaveStateToken(value)
  if (token === projectSaveStateToken(receiptState(receipt, 'committed'))) {
    if (receipt.phase !== 'data-complete' && receipt.phase !== 'committed')
      throw new Error('未经完成的保存不能采用 committed 状态')
    return 'committed'
  }
  if (token === projectSaveStateToken(receiptState(receipt, 'pending'))) return 'pending'
  if (receipt.phase === 'ready' && token === receipt.previousState) return 'previous'
  throw new AuthorSaveRecoveryConflict(PROJECT_SAVE_STATE_PATH)
}
async function execute(
  receipt: AuthorSaveReceipt,
  plan: AuthorSavePlan,
  hooks: {
    beforeAuthor?: () => Promise<void>
    applied?: (step: SaveStep, bytes?: ArrayBuffer) => Promise<void>
    complete: () => Promise<void>
  },
): Promise<AuthorSaveJournalResult> {
  await assertBinding(receipt, receipt.handle)
  await assertCurrentReceipt(receipt)
  const state = await stateForReplay(receipt)
  if (state !== 'committed') {
    let cursor = reconcileSaveCursor(plan, receipt, await diskState(receipt.handle, plan))
    if (receipt.phase === 'data-complete' && cursor.completed !== plan.steps.length)
      throw new Error('恢复完成游标与计划不一致')
    if (state === 'previous') await publishState(receipt, 'pending')
    await hooks.beforeAuthor?.()
    if (cursor.completed !== receipt.completed || cursor.issued !== receipt.issued)
      await persist(receipt, cursor)
    for (let i = 0; i < cursor.completed; i++) {
      const step = plan.steps[i]!
      await hooks.applied?.(
        step,
        step.kind === 'write' ? await payload(receipt, step.signature) : undefined,
      )
    }
    while (receipt.completed < plan.steps.length) {
      await assertCurrentReceipt(receipt)
      await assertMetadata(receipt)
      if ((await stateForReplay(receipt)) !== 'pending')
        throw new AuthorSaveRecoveryConflict(PROJECT_SAVE_STATE_PATH)
      const step = plan.steps[receipt.completed]!
      const expected = savePrefix(plan, receipt.completed)
      // Full prefix was checked at admission. Before each IO also verify its current target.
      const observed = {
        files: new Map(expected.files),
        directories: new Map(expected.directories),
      }
      if (step.kind === 'mkdir')
        observed.directories.set(step.path, await directoryExists(receipt.handle, step.path))
      else observed.files.set(step.path, await fileSignature(receipt.handle, step.path))
      cursor = reconcileSaveCursor(plan, receipt, observed)
      if (cursor.completed !== receipt.completed) throw new AuthorSaveRecoveryConflict(step.path)
      if (!receipt.issued) await persist(receipt, { phase: 'applying', issued: true })
      let bytes: ArrayBuffer | undefined
      if (step.kind === 'mkdir')
        await directory(receipt.handle, step.path).catch(async (error) => {
          if (!missing(error)) throw error
          const parts = step.path.split('/'),
            name = parts.pop()!
          await (await directory(receipt.handle, parts.join('/'))).getDirectoryHandle(name, {
            create: true,
          })
        })
      else if (step.kind === 'remove') await removeFile(receipt.handle, step.path)
      else {
        bytes = await payload(receipt, step.signature)
        await writeBytes(receipt.handle, step.path, bytes)
      }
      const after =
        step.kind === 'mkdir'
          ? await directoryExists(receipt.handle, step.path)
          : await fileSignature(receipt.handle, step.path)
      if (after !== (step.kind === 'mkdir' ? true : step.kind === 'remove' ? null : step.signature))
        throw new AuthorSaveRecoveryConflict(step.path)
      await hooks.applied?.(step, bytes)
      await persist(receipt, { completed: receipt.completed + 1, issued: false })
    }
    reconcileSaveCursor(plan, receipt, await diskState(receipt.handle, plan))
    await assertMetadata(receipt)
    if (receipt.phase !== 'data-complete') await persist(receipt, { phase: 'data-complete' })
    await hooks.complete()
    await publishState(receipt, 'committed')
  }
  // Once the durable committed marker is present, failures below are cleanup warnings, never replay.
  let cleanupWarning: string | undefined
  try {
    if (receipt.phase !== 'committed') await persist(receipt, { phase: 'committed' })
    cleanupWarning = await cleanup(receipt)
  } catch (error) {
    cleanupWarning = `内容已保存，恢复临时文件待清理：${error instanceof Error ? error.message : String(error)}`
  }
  return {
    kind: 'committed',
    operationId: receipt.operationId,
    ...(cleanupWarning ? { cleanupWarning } : {}),
  }
}

export function commitAuthorSave(
  token: PreparedAuthorSave,
  onApplied?: (step: SaveStep) => unknown,
): Promise<AuthorSaveJournalResult> {
  const state = prepared.get(token)
  if (!state || state.phase !== 'ready')
    return Promise.reject(new Error('恢复计划未准备好或授权已消费'))
  state.phase = 'committing'
  return withAuthorizedSaveJob(state.mutation, () => commitInsideScope(token, onApplied))
}

async function commitInsideScope(
  token: PreparedAuthorSave,
  onApplied?: (step: SaveStep) => unknown,
): Promise<AuthorSaveJournalResult> {
  const state = prepared.get(token)
  if (!state || state.phase !== 'committing') throw new Error('恢复计划未准备好或授权已消费')
  authorizedSaveScope(state.mutation)
  const { receipt, mutation } = state
  const pendingBytes = encoder.encode(
    `${JSON.stringify(receiptState(receipt, 'pending'))}\n`,
  ).buffer
  allowAuthorizedSavePrivateFile(
    mutation,
    receipt.operationId,
    PROJECT_SAVE_STATE_PATH,
    (await signature(pendingBytes))!,
  )
  try {
    const plan = await loadPlan(receipt)
    const result = await execute(receipt, plan, {
      beforeAuthor: () => beginAuthorizedWorkspaceMutation(mutation),
      applied: async (step, bytes) => {
        if (step.kind === 'write')
          await recordAuthorizedWorkspaceWriteCompleted(mutation, step.path, new Blob([bytes!]))
        else if (step.kind === 'remove')
          recordAuthorizedWorkspaceRemoveCompleted(mutation, step.path)
        await onApplied?.(step)
      },
      complete: () => completeAuthorizedWorkspaceData(mutation),
    })
    ownedSaves.delete(state.workspace)
    return result
  } finally {
    state.phase = 'spent'
    prepared.delete(token)
  }
}

async function removeEmpty(
  dir: FileSystemDirectoryHandle,
  path: string,
  allowNonempty = false,
): Promise<void> {
  const parts = path.split('/'),
    name = parts.pop()!
  try {
    await (await directory(dir, parts.join('/'))).removeEntry(name)
  } catch (error) {
    if (
      !missing(error) &&
      !(allowNonempty && error instanceof DOMException && error.name === 'InvalidModificationError')
    )
      throw error
  }
}
async function cleanup(receipt: AuthorSaveReceipt): Promise<string | undefined> {
  try {
    await assertBinding(receipt, receipt.handle)
    await assertCurrentReceipt(receipt)
    if (receipt.phase === 'committed') {
      if ((await stateForReplay(receipt)) !== 'committed') throw new Error('恢复提交标志不符')
    } else if (receipt.phase === 'staging') {
      if (
        projectSaveStateToken(await readProjectSaveState(fsaSource(receipt.handle))) !==
        receipt.previousState
      )
        throw new Error('未封存保存的读取状态发生变化')
    } else throw new Error('不能清理尚未完成的保存')
    for (const [rel, expected] of Object.entries(receipt.staged)) {
      const path = `${rootFor(receipt)}/${rel}`
      const actual = await fileSignature(receipt.handle, path)
      if (actual === null) continue
      const emptyOwnStaging = receipt.phase === 'staging' && actual.startsWith('bin:0:')
      if (actual !== expected && !emptyOwnStaging) throw new AuthorSaveRecoveryConflict(path)
      await removeFile(receipt.handle, path)
    }
    await removeEmpty(receipt.handle, `${rootFor(receipt)}/blobs`)
    await removeEmpty(receipt.handle, rootFor(receipt))
    await removeEmpty(receipt.handle, PROJECT_SAVE_RECOVERY_PATH, true)
    if (receipt.phase === 'staging') {
      await removeEmpty(receipt.handle, '.type-pal', true)
      await deleteStagingAuthorSaveReceipt(receipt)
    } else await persist(receipt, { staged: {} })
    return undefined
  } catch (error) {
    return `内容${receipt.phase === 'committed' ? '已保存' : '尚未写入'}，恢复临时文件待清理：${error instanceof Error ? error.message : String(error)}`
  }
}

/** Explicit editor-open recovery. Runtime readers never call this function. No arbitrary write callback. */
export async function recoverInterruptedAuthorSave(
  dir: FileSystemDirectoryHandle,
  options: { forceSandbox?: boolean } = {},
): Promise<AuthorSaveJournalResult | null> {
  return withWorkspaceDiscoveryLock(async () => {
    const receipt = await findAuthorSaveReceipt(dir)
    if (!receipt) {
      const state = await readProjectSaveState(fsaSource(dir))
      if (state?.phase === 'pending') throw new MissingAuthorSaveReceiptError()
      return null
    }
    return withWorkspaceRegistrationLock(receipt.workspaceId, (lock) =>
      recoverAuthorSaveUnderLock(dir, lock, options),
    )
  })
}

/** A normal open retains the same real lock through recovery, canonical loading and registration. */
export async function recoverAuthorSaveUnderLock(
  dir: FileSystemDirectoryHandle,
  lock: WorkspaceRegistrationLock,
  options: { forceSandbox?: boolean; onRecovering?: () => void } = {},
): Promise<AuthorSaveJournalResult | null> {
  const receipt = await findAuthorSaveReceipt(dir)
  if (!receipt) {
    if ((await readProjectSaveState(fsaSource(dir)))?.phase === 'pending')
      throw new MissingAuthorSaveReceiptError()
    return null
  }
  assertWorkspaceRegistrationLock(lock, receipt.workspaceId)
  await assertCurrentReceipt(receipt)
  await assertBinding(receipt, dir)
  if (options.forceSandbox && receipt.identity.mode !== 'sandbox') {
    if (receipt.phase !== 'committed')
      throw new Error('评审模式不能恢复源项目，请从普通打开项目入口处理')
    return null
  }
  if (receipt.phase !== 'committed') options.onRecovering?.()
  return recoverKnownSave(receipt, dir, lock)
}

/** Only the original page's context AND author baseline can advance its own interrupted save. */
export async function recoverOwnAuthorSave(
  workspace: WorkspaceContext,
  dir: FileSystemDirectoryHandle,
  baseline: AuthorDiskBaseline,
): Promise<AuthorSaveJournalResult | null> {
  const owned = ownedSaves.get(workspace)
  if (!owned) return null
  owned.scope.assertRecoveryReady()
  if (owned.scope.authorBaseline !== baseline || !(await owned.scope.dir.isSameEntry(dir)))
    throw new Error('保存重试与原页面的目录或作者基线不符，请重新打开项目')
  return withWorkspaceDiscoveryLock(() =>
    withWorkspaceRegistrationLock(workspace.workspaceId, async (lock) => {
      const receipt = await findAuthorSaveReceipt(dir)
      if (!receipt && !owned.plan) {
        await assertProjectSaveReadable(fsaSource(dir))
        ownedSaves.delete(workspace)
        return null // another explicit open already cleaned an unsealed attempt; no baseline adoption
      }
      if (
        !receipt ||
        receipt.operationId !== owned.operationId ||
        receipt.workspaceId !== workspace.workspaceId ||
        receipt.ownerNonce !== owned.scope.ownerNonce ||
        (owned.planHash !== undefined && receipt.planHash !== owned.planHash)
      )
        throw new Error('保存重试不属于本页面的原始操作，已停止并保留恢复数据')
      await assertCurrentReceipt(receipt)
      await assertBinding(receipt, dir)
      if (receipt.phase !== 'staging' && !owned.plan)
        throw new Error('原页面未完成计划封存，请通过打开项目恢复')
      const result = await recoverKnownSave(receipt, dir, lock, owned)
      ownedSaves.delete(workspace)
      return result
    }),
  )
}

/** Read only bytes matching the last write of the original sealed plan; never adopt live changes. */
async function reconcileOwnedSave(
  owned: OwnedSave,
  receipt: AuthorSaveReceipt,
  plan: AuthorSavePlan,
  lock: WorkspaceRegistrationLock,
): Promise<void> {
  reconcileSaveCursor(
    plan,
    { completed: plan.steps.length, issued: false },
    await diskState(receipt.handle, plan),
  )
  const final = new Map<string, SaveSignature>()
  for (const step of plan.steps)
    if (step.kind !== 'mkdir') final.set(step.path, step.kind === 'write' ? step.signature : null)
  async function* values(): AsyncIterable<readonly [string, ArrayBuffer | null]> {
    for (const [path, expected] of final) {
      const bytes = await readBytes(receipt.handle, path)
      if ((bytes === null ? null : await signature(bytes)) !== expected)
        throw new AuthorSaveRecoveryConflict(path)
      yield [path, bytes]
    }
  }
  await owned.scope.reconcileRecovery(lock, values())
}

/** Called only after discovery/workspace locks, receipt, handle and metadata have been checked. */
async function recoverKnownSave(
  receipt: AuthorSaveReceipt,
  dir: FileSystemDirectoryHandle,
  lock: WorkspaceRegistrationLock,
  owned?: OwnedSave,
): Promise<AuthorSaveJournalResult | null> {
  if (receipt.phase === 'staging') {
    const warning = await cleanup(receipt)
    if (warning) throw new Error(warning)
    return null
  }
  if (receipt.phase === 'committed') {
    if ((await stateForReplay(receipt)) !== 'committed') throw new Error('已保存状态不符')
    if (owned?.plan) await reconcileOwnedSave(owned, receipt, owned.plan, lock)
    const warning = await cleanup(receipt)
    return {
      kind: 'committed',
      operationId: receipt.operationId,
      ...(warning ? { cleanupWarning: warning } : {}),
    }
  }
  const plan = await loadPlan(receipt)
  if (owned && (await stateForReplay(receipt)) === 'committed')
    await reconcileOwnedSave(owned, receipt, plan, lock)
  return execute(receipt, plan, {
    complete: async () => {
      if (owned) {
        await reconcileOwnedSave(owned, receipt, plan, lock)
        return
      }
      if (receipt.registrationName !== null) {
        const mode = receipt.identity.mode
        const context: WorkspaceContext = {
          ...receipt.identity,
          persistencePolicy:
            mode === 'pal-development'
              ? 'pal-bound'
              : mode === 'sandbox'
                ? 'sandbox-bound'
                : 'local-bound',
        }
        await saveWorkspaceHandleUnderLock(lock, context, receipt.registrationName, dir)
      }
    },
  })
}
