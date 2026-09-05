import {
  findWorkspaceRecordByHandle,
  loadWorkspaceRecord,
  saveWorkspaceHandleUnderLock,
  type WorkspaceHandleRecord,
  withWorkspaceDiscoveryLock,
  withWorkspaceRegistrationLock,
} from './handle-store.js'
import {
  createLocalWorkspaceContext,
  createSandboxWorkspaceContext,
  fingerprintJsonFiles,
  PAL_DEVELOPMENT_SENTINEL_PATH,
  parsePalDevelopmentSentinel,
  parseSandboxWorkspaceMarker,
  SANDBOX_WORKSPACE_MARKER_PATH,
  sandboxMarkerFor,
  type WorkspaceContext,
} from './workspace-context.js'

declare const authorizedTargetBrand: unique symbol
declare const authorizedMutationBrand: unique symbol

/** Opaque, single-use capability. Runtime authenticity is held in a private WeakMap. */
export type AuthorizedWorkspaceTarget = Readonly<{ [authorizedTargetBrand]: never }>
/** Opaque capability that only exists while one serialized workspace mutation is active. */
export type AuthorizedWorkspaceMutation = Readonly<{ [authorizedMutationBrand]: never }>
export type AuthorizedWorkspaceInput = AuthorizedWorkspaceTarget | AuthorizedWorkspaceMutation

interface AuthorizedTargetState {
  dir: FileSystemDirectoryHandle
  workspace: WorkspaceContext
  phase: 'ready' | 'verifying' | 'active' | 'spent'
  verify: () => Promise<void>
  firstSave: boolean
  prepare?: () => Promise<void>
}

interface AuthorizedMutationState {
  target: AuthorizedTargetState
  active: boolean
  firstMutationStarted: boolean
  firstMutationPromise?: Promise<void>
  /** Exact controlled JSON state expected after this editor operation, not a later live reread. */
  palExpectedValues?: Map<string, unknown>
  pendingRegistration?: { context: WorkspaceContext; name: string }
}

const authorizedTargets = new WeakMap<object, AuthorizedTargetState>()
const authorizedMutations = new WeakMap<object, AuthorizedMutationState>()
const palExpectedFingerprints = new WeakMap<WorkspaceContext, string>()
const localFirstSaveAttempts = new WeakMap<WorkspaceContext, FileSystemDirectoryHandle>()
type SandboxBootstrapTarget = Readonly<{ __sandboxBootstrap?: never }>
const sandboxBootstrapDirs = new WeakMap<object, FileSystemDirectoryHandle>()

export type WorkspaceMetadataState<T> =
  | { kind: 'missing' }
  | { kind: 'valid'; value: T }
  | { kind: 'invalid'; reason: string }

export interface WorkspaceMetadataInspection {
  sandbox: WorkspaceMetadataState<ReturnType<typeof parseSandboxWorkspaceMarker>>
  palDevelopment: WorkspaceMetadataState<ReturnType<typeof parsePalDevelopmentSentinel>>
}

function notFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError'
}

async function readTextFile(
  dir: FileSystemDirectoryHandle,
  rel: string,
): Promise<string | undefined> {
  const segments = rel.split('/')
  const fileName = segments.pop()!
  let current = dir
  try {
    for (const segment of segments) current = await current.getDirectoryHandle(segment)
    return await (await (await current.getFileHandle(fileName)).getFile()).text()
  } catch (error) {
    if (notFound(error)) return undefined
    throw error
  }
}

async function readJsonState<T>(
  dir: FileSystemDirectoryHandle,
  rel: string,
  parse: (value: unknown) => T,
): Promise<WorkspaceMetadataState<T>> {
  const text = await readTextFile(dir, rel)
  if (text === undefined) return { kind: 'missing' }
  try {
    return { kind: 'valid', value: parse(JSON.parse(text) as unknown) }
  } catch (error) {
    return { kind: 'invalid', reason: error instanceof Error ? error.message : String(error) }
  }
}

export async function inspectWorkspaceMetadata(
  dir: FileSystemDirectoryHandle,
): Promise<WorkspaceMetadataInspection> {
  const [sandbox, palDevelopment] = await Promise.all([
    readJsonState(dir, SANDBOX_WORKSPACE_MARKER_PATH, parseSandboxWorkspaceMarker),
    readJsonState(dir, PAL_DEVELOPMENT_SENTINEL_PATH, parsePalDevelopmentSentinel),
  ])
  return { sandbox, palDevelopment }
}

async function writeJsonSidecar(
  target: SandboxBootstrapTarget,
  rel: string,
  value: unknown,
): Promise<void> {
  const dir = sandboxBootstrapDirs.get(target)
  if (!dir) throw new Error('拒绝未经 workspace policy 授权的 marker bootstrap 写入')
  const segments = rel.split('/')
  const fileName = segments.pop()!
  let current = dir
  for (const segment of segments)
    current = await current.getDirectoryHandle(segment, { create: true })
  const writable = await (await current.getFileHandle(fileName, { create: true })).createWritable()
  await writable.write(`${JSON.stringify(value, null, 2)}\n`)
  await writable.close()
}

function authorizeSandboxBootstrap(dir: FileSystemDirectoryHandle): SandboxBootstrapTarget {
  const target = Object.freeze({}) as SandboxBootstrapTarget
  sandboxBootstrapDirs.set(target, dir)
  return target
}

export async function assertDirectoryEmpty(dir: FileSystemDirectoryHandle): Promise<void> {
  const entries = (
    dir as unknown as {
      entries(): AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
    }
  ).entries()
  for await (const [name] of entries) throw new Error(`目标文件夹必须为空（发现 ${name}）`)
}

function authorized(
  workspace: WorkspaceContext,
  dir: FileSystemDirectoryHandle,
  verify: () => Promise<void>,
  options: { firstSave?: boolean; prepare?: () => Promise<void> } = {},
): AuthorizedWorkspaceTarget {
  if (workspace.mode === 'pal-development' && workspace.palProof)
    palExpectedFingerprints.set(
      workspace,
      palExpectedFingerprints.get(workspace) ?? workspace.palProof.expectedFingerprint,
    )
  const target = Object.freeze({}) as AuthorizedWorkspaceTarget
  authorizedTargets.set(target, {
    dir,
    workspace,
    phase: 'ready',
    verify,
    firstSave: options.firstSave ?? false,
    prepare: options.prepare,
  })
  return target
}

export function authorizedDirectory(
  mutation: AuthorizedWorkspaceMutation,
): FileSystemDirectoryHandle {
  const state = mutation && authorizedMutations.get(mutation)
  if (!state?.active) throw new Error('拒绝未经 active workspace mutation 授权的目录访问')
  return state.target.dir
}

/**
 * Consume exactly one target capability and hold the workspace mutation lock for the whole
 * compound operation. Nested sinks receive the private mutation session, never the reusable target.
 */
export async function withAuthorizedWorkspaceMutation<T>(
  input: AuthorizedWorkspaceInput,
  operation: (mutation: AuthorizedWorkspaceMutation) => Promise<T>,
): Promise<T> {
  const existingMutation = input && authorizedMutations.get(input)
  if (existingMutation?.active) return operation(input as AuthorizedWorkspaceMutation)

  const state = input && authorizedTargets.get(input)
  if (!state) throw new Error('拒绝未经 workspace persistence policy 授权的目录写入')
  if (state.phase !== 'ready') throw new Error('workspace 写入授权已消费或正在使用')
  // Synchronous transition closes two concurrent callers racing before the first await.
  state.phase = 'verifying'
  const run = () =>
    withWorkspaceRegistrationLock(state.workspace.workspaceId, async (registrationLock) => {
      try {
        await state.verify()
        await state.prepare?.()
        await state.verify()
        const palExpectedValues =
          state.workspace.mode === 'pal-development'
            ? await readPalDevelopmentTargetValues(state.workspace, state.dir)
            : undefined
        state.phase = 'active'
        const mutation = Object.freeze({}) as AuthorizedWorkspaceMutation
        const mutationState: AuthorizedMutationState = {
          target: state,
          active: true,
          firstMutationStarted: false,
          palExpectedValues,
        }
        authorizedMutations.set(mutation, mutationState)
        try {
          let result: T
          try {
            result = await operation(mutation)
          } catch (operationError) {
            // writeProject updates its disk snapshot after every successful close. Mirror that
            // recovery property for PAL's controlled proof: if the live controlled files exactly
            // equal the writes this editor observed completing, advance only to that partial state
            // so the same handle can retry. Any concurrent external drift keeps the old precondition
            // and therefore remains fail-closed on the next attempt.
            if (state.workspace.mode === 'pal-development' && palExpectedValues) {
              try {
                const expectedPartialFingerprint = await fingerprintPalExpectedValues(
                  state.workspace,
                  palExpectedValues,
                )
                const actualPartialFingerprint = await palDevelopmentTargetFingerprint(
                  state.workspace,
                  state.dir,
                )
                if (actualPartialFingerprint === expectedPartialFingerprint)
                  palExpectedFingerprints.set(state.workspace, expectedPartialFingerprint)
              } catch {
                // Preserve the original operation error. An unreadable or mismatched target is
                // deliberately not adopted and the next authorization will reject it.
              }
            }
            throw operationError
          }
          if (state.workspace.mode === 'pal-development' && palExpectedValues) {
            const expectedPostFingerprint = await fingerprintPalExpectedValues(
              state.workspace,
              palExpectedValues,
            )
            const actualPostFingerprint = await palDevelopmentTargetFingerprint(
              state.workspace,
              state.dir,
            )
            if (actualPostFingerprint !== expectedPostFingerprint)
              throw new Error('PAL 开发基线写入后的关键快照与本次编辑器操作不一致，拒绝推进会话')
            palExpectedFingerprints.set(state.workspace, expectedPostFingerprint)
          }
          const pendingRegistration = mutationState.pendingRegistration
          if (pendingRegistration)
            await saveWorkspaceHandleUnderLock(
              registrationLock,
              pendingRegistration.context,
              pendingRegistration.name,
              state.dir,
            )
          if (state.firstSave && state.workspace.mode === 'local-project')
            localFirstSaveAttempts.delete(state.workspace)
          return result
        } finally {
          mutationState.active = false
          authorizedMutations.delete(mutation)
          state.phase = 'spent'
        }
      } catch (error) {
        state.phase = 'spent'
        throw error
      }
    })
  return state.firstSave ? withWorkspaceDiscoveryLock(run) : run()
}

/** Record one successfully closed write for first-save recovery and PAL's intended post-state. */
export function recordAuthorizedWorkspaceWriteCompleted(
  mutation: AuthorizedWorkspaceMutation,
  path: string,
  value: unknown,
): void {
  const state = mutation && authorizedMutations.get(mutation)
  if (!state?.active) throw new Error('拒绝未经 active workspace mutation 的写入记录')
  if (state.target.firstSave && state.target.workspace.mode === 'local-project')
    localFirstSaveAttempts.set(state.target.workspace, state.target.dir)
  const values = state.palExpectedValues
  if (!values || !state.target.workspace.palProof?.paths.includes(path)) return
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value))
    throw new Error(`PAL 开发基线受控 JSON 不能写入二进制：${path}`)
  const parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value
  values.set(path, structuredClone(parsed))
}

/** Stage recent registration; the compound operation commits it only after every post-check passes. */
export async function registerAuthorizedWorkspaceMutation(
  mutation: AuthorizedWorkspaceMutation,
  context: WorkspaceContext,
  name: string,
): Promise<void> {
  const state = mutation && authorizedMutations.get(mutation)
  if (!state?.active) throw new Error('拒绝未经 workspace mutation 授权的句柄登记')
  const targetContext = state.target.workspace
  if (
    targetContext.workspaceId !== context.workspaceId ||
    targetContext.projectId !== context.projectId ||
    targetContext.mode !== context.mode ||
    targetContext.source !== context.source
  )
    throw new Error('写入会话与待登记 workspace identity 不一致')
  const pending = state.pendingRegistration
  if (pending && (pending.context !== context || pending.name !== name))
    throw new Error('同一 workspace mutation 不能登记多个 recent identity')
  state.pendingRegistration = { context, name }
}

/** Revalidate at the true first destination mutation, after any slow source reads/preparation. */
export async function beginAuthorizedWorkspaceMutation(
  mutation: AuthorizedWorkspaceMutation,
): Promise<void> {
  const state = mutation && authorizedMutations.get(mutation)
  if (!state?.active) throw new Error('拒绝未经 workspace persistence policy 授权的目录写入')
  if (state.firstMutationStarted) return
  state.firstMutationPromise ??= (async () => {
    await state.target.verify()
    state.firstMutationStarted = true
  })()
  await state.firstMutationPromise
}

async function assertSandboxIdentity(
  context: WorkspaceContext,
  metadata: WorkspaceMetadataInspection,
): Promise<void> {
  if (metadata.palDevelopment.kind !== 'missing')
    throw new Error('沙盒目标含 PAL 开发基线 sentinel，拒绝写入')
  if (metadata.sandbox.kind !== 'valid')
    throw new Error(
      metadata.sandbox.kind === 'invalid'
        ? `沙盒 workspace marker 无效：${metadata.sandbox.reason}`
        : '沙盒 workspace marker 缺失',
    )
  const marker = metadata.sandbox.value
  if (
    marker.workspaceId !== context.workspaceId ||
    marker.projectId !== context.projectId ||
    marker.source !== context.source
  )
    throw new Error('沙盒 workspace marker 与当前工作区 identity 不一致')
}

async function assertPalDevelopmentTarget(
  context: WorkspaceContext,
  dir: FileSystemDirectoryHandle,
  metadata: WorkspaceMetadataInspection,
): Promise<void> {
  if (context.mode !== 'pal-development' || !context.palProof)
    throw new Error('当前会话没有 PAL 开发基线目标证明')
  if (metadata.sandbox.kind !== 'missing')
    throw new Error('PAL 开发基线目标含沙盒 marker，拒绝写入')
  if (metadata.palDevelopment.kind !== 'valid')
    throw new Error(
      metadata.palDevelopment.kind === 'invalid'
        ? `PAL 开发基线 sentinel 无效：${metadata.palDevelopment.reason}`
        : '目标不是可信 PAL 开发基线（sentinel 缺失）',
    )
  const sentinel = metadata.palDevelopment.value
  if (sentinel.workspaceId !== context.workspaceId || sentinel.projectId !== context.projectId)
    throw new Error('PAL 开发基线 sentinel 与当前会话不一致')
  const actual = await palDevelopmentTargetFingerprint(context, dir)
  const expected = palExpectedFingerprints.get(context) ?? context.palProof.expectedFingerprint
  if (actual !== expected)
    throw new Error('目标 PAL 开发基线关键快照与本次会话预期不一致，拒绝覆盖')
}

async function palDevelopmentTargetFingerprint(
  context: WorkspaceContext,
  dir: FileSystemDirectoryHandle,
): Promise<string> {
  if (context.mode !== 'pal-development' || !context.palProof)
    throw new Error('当前会话没有 PAL 开发基线目标证明')
  return fingerprintJsonFiles(context.palProof.paths, async (path) => {
    const text = await readTextFile(dir, path)
    if (text === undefined) throw new Error(`PAL 开发基线指纹文件缺失：${path}`)
    try {
      return JSON.parse(text) as unknown
    } catch (error) {
      throw new Error(
        `PAL 开发基线指纹文件无效：${path}（${error instanceof Error ? error.message : String(error)}）`,
      )
    }
  })
}

async function readPalDevelopmentTargetValues(
  context: WorkspaceContext,
  dir: FileSystemDirectoryHandle,
): Promise<Map<string, unknown>> {
  if (context.mode !== 'pal-development' || !context.palProof)
    throw new Error('当前会话没有 PAL 开发基线目标证明')
  const values = new Map<string, unknown>()
  for (const path of context.palProof.paths) {
    const text = await readTextFile(dir, path)
    if (text === undefined) throw new Error(`PAL 开发基线指纹文件缺失：${path}`)
    try {
      values.set(path, JSON.parse(text) as unknown)
    } catch (error) {
      throw new Error(
        `PAL 开发基线指纹文件无效：${path}（${error instanceof Error ? error.message : String(error)}）`,
      )
    }
  }
  const expected = palExpectedFingerprints.get(context) ?? context.palProof.expectedFingerprint
  const actual = await fingerprintJsonFiles(context.palProof.paths, async (path) => {
    if (!values.has(path)) throw new Error(`PAL 开发基线指纹文件缺失：${path}`)
    return values.get(path)
  })
  if (actual !== expected)
    throw new Error('目标 PAL 开发基线关键快照与本次会话预期不一致，拒绝覆盖')
  return values
}

async function fingerprintPalExpectedValues(
  context: WorkspaceContext,
  values: ReadonlyMap<string, unknown>,
): Promise<string> {
  if (context.mode !== 'pal-development' || !context.palProof)
    throw new Error('当前会话没有 PAL 开发基线目标证明')
  return fingerprintJsonFiles(context.palProof.paths, async (path) => {
    if (!values.has(path)) throw new Error(`PAL 开发基线期望快照缺失：${path}`)
    return values.get(path)
  })
}

/** Used by local-open bracketing so target identity/snapshot cannot change during canonical load. */
export async function assertPalDevelopmentDirectory(
  context: WorkspaceContext,
  dir: FileSystemDirectoryHandle,
): Promise<void> {
  await assertPalDevelopmentTarget(context, dir, await inspectWorkspaceMetadata(dir))
}

export function assertSameWorkspaceMetadataInspection(
  before: WorkspaceMetadataInspection,
  after: WorkspaceMetadataInspection,
): void {
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error('工作区 identity 在项目载入期间发生变化，请重新打开')
}

function assertNoInvalidMetadata(metadata: WorkspaceMetadataInspection): void {
  if (metadata.sandbox.kind === 'invalid')
    throw new Error(`工作区 identity 冲突：${metadata.sandbox.reason}`)
  if (metadata.palDevelopment.kind === 'invalid')
    throw new Error(`工作区 identity 冲突：${metadata.palDevelopment.reason}`)
  if (metadata.sandbox.kind === 'valid' && metadata.palDevelopment.kind === 'valid')
    throw new Error('工作区 identity 冲突：目录同时含沙盒 marker 与 PAL 开发 sentinel')
}

async function assertBoundWorkspaceIdentity(
  context: WorkspaceContext,
  requestedDir: FileSystemDirectoryHandle,
): Promise<void> {
  const record = await loadWorkspaceRecord(context.workspaceId)
  if (!record) throw new Error('当前工作区没有已登记的绑定目录')
  if (
    record.projectId !== context.projectId ||
    record.mode !== context.mode ||
    record.source !== context.source
  )
    throw new Error('当前工作区与已登记目录 identity 不一致')
  if (!(await record.handle.isSameEntry(requestedDir)))
    throw new Error('保存目标不是当前工作区已绑定的目录')

  const metadata = await inspectWorkspaceMetadata(requestedDir)
  assertNoInvalidMetadata(metadata)
  if (context.mode === 'sandbox') {
    await assertSandboxIdentity(context, metadata)
    return
  }
  if (context.mode === 'pal-development') {
    await assertPalDevelopmentTarget(context, requestedDir, metadata)
    return
  }
  if (metadata.sandbox.kind !== 'missing' || metadata.palDevelopment.kind !== 'missing')
    throw new Error('普通本地项目的已绑定目录出现受限工作区 identity，拒绝写入')
}

/**
 * A first-save context may already have been bound by an earlier tab/session. In that case the
 * existing registration is authoritative and a duplicate/copy must not be mutated first and
 * rejected only after the write has completed. Random local/sandbox IDs make this rare, but the
 * same fail-closed rule also covers restored markers and deterministic test identities.
 */
async function assertCompatibleExistingBinding(
  context: WorkspaceContext,
  requestedDir: FileSystemDirectoryHandle,
): Promise<void> {
  const entryBinding = await findWorkspaceRecordByHandle(requestedDir)
  if (entryBinding && entryBinding.workspaceId !== context.workspaceId)
    throw new Error('该目录已经绑定到另一个 workspace identity，拒绝首存覆盖')
  const record = await loadWorkspaceRecord(context.workspaceId)
  if (!record) return
  if (
    record.projectId !== context.projectId ||
    record.mode !== context.mode ||
    record.source !== context.source
  )
    throw new Error('当前工作区与既有绑定目录 identity 不一致')
  if (!(await record.handle.isSameEntry(requestedDir)))
    throw new Error('workspace identity 已绑定到另一个目录，拒绝首存覆盖')
}

/** Read-only check run immediately after the picker returns. */
export async function preflightFirstSaveTarget(
  context: WorkspaceContext,
  dir: FileSystemDirectoryHandle,
  opts: { resumesInterruptedAttempt?: boolean } = {},
): Promise<void> {
  await assertCompatibleExistingBinding(context, dir)
  const metadata = await inspectWorkspaceMetadata(dir)
  if (context.mode === 'pal-development') {
    await assertPalDevelopmentTarget(context, dir, metadata)
    return
  }
  if (context.mode === 'sandbox') {
    if (opts.resumesInterruptedAttempt && metadata.sandbox.kind === 'valid') {
      await assertSandboxIdentity(context, metadata)
      return
    }
    if (metadata.sandbox.kind !== 'missing' || metadata.palDevelopment.kind !== 'missing')
      throw new Error('新沙盒只能保存到空文件夹')
    await assertDirectoryEmpty(dir)
    return
  }
  if (metadata.sandbox.kind !== 'missing' || metadata.palDevelopment.kind !== 'missing')
    throw new Error('普通本地项目不能覆盖带工作区身份的目录')
  if (opts.resumesInterruptedAttempt) {
    const previousAttempt = localFirstSaveAttempts.get(context)
    if (previousAttempt && (await previousAttempt.isSameEntry(dir))) {
      const entryBinding = await findWorkspaceRecordByHandle(dir)
      if (entryBinding && entryBinding.workspaceId !== context.workspaceId)
        throw new Error('续写目标已经属于另一个 workspace identity')
      return
    }
    // Merely selecting or preflighting an empty directory does not mint a resume capability.
    // Until this editor has successfully closed its first file, a non-empty target remains unsafe.
    await assertDirectoryEmpty(dir)
    return
  }
  await assertDirectoryEmpty(dir)
}

/** Re-check immediately before the first mutation and mint the only accepted write token. */
export async function authorizeFirstSaveTarget(
  context: WorkspaceContext,
  dir: FileSystemDirectoryHandle,
  opts: {
    resumesInterruptedAttempt?: boolean
    /** Additional operation invariant, rechecked at scope entry and true first mutation. */
    additionalVerify?: () => Promise<void>
  } = {},
): Promise<AuthorizedWorkspaceTarget> {
  await preflightFirstSaveTarget(context, dir, opts)
  const verifyWorkspace = async (): Promise<void> => {
    await assertCompatibleExistingBinding(context, dir)
    if (context.mode === 'pal-development') {
      await assertPalDevelopmentTarget(context, dir, await inspectWorkspaceMetadata(dir))
      return
    }
    if (context.mode === 'sandbox') {
      const metadata = await inspectWorkspaceMetadata(dir)
      if (metadata.sandbox.kind === 'valid') {
        await assertSandboxIdentity(context, metadata)
        return
      }
      if (metadata.sandbox.kind === 'invalid' || metadata.palDevelopment.kind !== 'missing')
        throw new Error('新沙盒目标的 workspace identity 已发生变化')
      await assertDirectoryEmpty(dir)
      return
    }
    // The early picker check is repeated after serialization/hash preparation and immediately
    // before the first actual project mutation.
    await preflightFirstSaveTarget(context, dir, opts)
  }
  const verify = async (): Promise<void> => {
    await verifyWorkspace()
    await opts.additionalVerify?.()
  }
  return authorized(context, dir, verify, {
    firstSave: true,
    prepare:
      context.mode === 'sandbox'
        ? async () => {
            const metadata = await inspectWorkspaceMetadata(dir)
            if (metadata.sandbox.kind === 'missing') {
              if (metadata.palDevelopment.kind !== 'missing')
                throw new Error('新沙盒目标含 PAL 开发基线 sentinel，拒绝写入')
              await assertDirectoryEmpty(dir)
              await opts.additionalVerify?.()
              // Restrictive identity is committed as the first mutation while both the global
              // first-save lock and this workspace identity lock are held. A failed project write
              // can therefore never leave an unrestricted review copy behind.
              await writeJsonSidecar(
                authorizeSandboxBootstrap(dir),
                SANDBOX_WORKSPACE_MARKER_PATH,
                sandboxMarkerFor(context),
              )
            }
            await assertSandboxIdentity(context, await inspectWorkspaceMetadata(dir))
          }
        : undefined,
  })
}

export async function authorizeBoundWorkspaceTarget(
  context: WorkspaceContext,
  requestedDir: FileSystemDirectoryHandle,
): Promise<AuthorizedWorkspaceTarget> {
  await assertBoundWorkspaceIdentity(context, requestedDir)
  return authorized(context, requestedDir, () =>
    assertBoundWorkspaceIdentity(context, requestedDir),
  )
}

export function createSaveAsWorkspaceContext(source: WorkspaceContext): WorkspaceContext {
  return source.mode === 'sandbox'
    ? createSandboxWorkspaceContext(source.projectId, 'sandbox-copy')
    : createLocalWorkspaceContext(source.projectId, 'save-as')
}

export const WORKSPACE_IDENTITY_COPY_EXCLUDES = Object.freeze([
  SANDBOX_WORKSPACE_MARKER_PATH,
  PAL_DEVELOPMENT_SENTINEL_PATH,
])

function contextFromRecord(record: WorkspaceHandleRecord): WorkspaceContext {
  if (record.mode === 'sandbox') {
    if (
      record.source !== 'ui-samples' &&
      record.source !== 'sandbox-copy' &&
      record.source !== 'review-copy'
    )
      throw new Error('最近项目记录的 sandbox 来源无效')
    return createSandboxWorkspaceContext(record.projectId, record.source, record.workspaceId)
  }
  if (record.mode === 'local-project') {
    if (
      record.source !== 'blank-project' &&
      record.source !== 'pal-development-snapshot-clone' &&
      record.source !== 'save-as' &&
      record.source !== 'local-directory'
    )
      throw new Error('最近项目记录的 local-project 来源无效')
    return createLocalWorkspaceContext(record.projectId, record.source, record.workspaceId)
  }
  throw new Error('PAL 开发基线必须重新验证 sentinel 与关键快照')
}

function assertExpectedWorkspaceIdentity(
  context: WorkspaceContext,
  expected: WorkspaceHandleRecord | undefined,
): void {
  if (!expected) return
  if (
    context.workspaceId !== expected.workspaceId ||
    context.projectId !== expected.projectId ||
    context.mode !== expected.mode ||
    context.source !== expected.source
  )
    throw new Error('最近项目记录与目录中的 workspace identity 不一致')
}

export async function resolveOpenedWorkspaceContext(
  dir: FileSystemDirectoryHandle,
  projectId: string,
  options: {
    metadata?: WorkspaceMetadataInspection
    workspaceHint?: WorkspaceContext
    expectedIdentity?: WorkspaceHandleRecord
    forceSandbox?: boolean
    loadTrustedPalContext: () => Promise<WorkspaceContext>
  },
): Promise<WorkspaceContext> {
  const metadata = options.metadata ?? (await inspectWorkspaceMetadata(dir))
  assertNoInvalidMetadata(metadata)

  const hint = options.workspaceHint
  if (hint && hint.projectId !== projectId)
    throw new Error('新工作区 identity 与写入后的 manifest 项目 id 不一致')
  const finalize = (context: WorkspaceContext): WorkspaceContext => {
    assertExpectedWorkspaceIdentity(context, options.expectedIdentity)
    // Review/sample sessions may inspect any valid current project, but never expose its bound
    // directory or PAL authority to the editor. Saving starts a fresh sandbox in an empty folder.
    return options.forceSandbox && context.mode !== 'sandbox'
      ? createSandboxWorkspaceContext(projectId, 'ui-samples')
      : context
  }

  if (metadata.sandbox.kind === 'valid') {
    const marker = metadata.sandbox.value
    if (marker.projectId !== projectId)
      throw new Error('工作区 identity 冲突：沙盒 marker 与 manifest 项目 id 不一致')
    const context =
      hint ?? createSandboxWorkspaceContext(projectId, marker.source, marker.workspaceId)
    if (context.mode !== 'sandbox' || context.workspaceId !== marker.workspaceId)
      throw new Error('工作区 identity 冲突：沙盒 marker 与当前操作不一致')
    const existing = await loadWorkspaceRecord(marker.workspaceId)
    if (existing) {
      if (!(await existing.handle.isSameEntry(dir)))
        throw new Error('工作区 identity 已属于另一个目录；请另存为新的评审副本')
      if (
        existing.mode !== 'sandbox' ||
        existing.projectId !== marker.projectId ||
        existing.source !== marker.source
      )
        throw new Error('工作区 identity 冲突：沙盒 marker 与最近项目记录不一致')
    }
    return finalize(context)
  }

  if (metadata.palDevelopment.kind === 'valid') {
    if (hint && hint.mode !== 'pal-development')
      throw new Error('普通项目操作不能获得 PAL 开发基线写权限')
    const context = await options.loadTrustedPalContext()
    await assertPalDevelopmentTarget(context, dir, metadata)
    const existing = await loadWorkspaceRecord(context.workspaceId)
    if (existing) {
      if (!(await existing.handle.isSameEntry(dir)))
        throw new Error('PAL 开发基线 workspace identity 已绑定到另一个目录')
      if (
        existing.mode !== 'pal-development' ||
        existing.projectId !== context.projectId ||
        existing.source !== 'dev-http'
      )
        throw new Error('工作区 identity 冲突：PAL sentinel 与最近项目记录不一致')
    }
    return finalize(context)
  }

  if (hint) {
    if (hint.mode !== 'local-project')
      throw new Error('工作区 identity marker 缺失，拒绝恢复受限工作区')
    return finalize(hint)
  }

  const existing = await findWorkspaceRecordByHandle(dir)
  if (existing) {
    if (existing.projectId !== projectId) throw new Error('最近项目记录与 manifest 项目 id 不一致')
    if (existing.mode !== 'local-project')
      throw new Error('工作区 marker 缺失，拒绝把受限工作区降级为普通本地项目')
    return finalize(contextFromRecord(existing))
  }
  return finalize(createLocalWorkspaceContext(projectId, 'local-directory'))
}
