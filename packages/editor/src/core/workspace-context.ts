import type { CurrentManifest } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'

export const WORKSPACE_IDENTITY_DIRECTORY = '.type-pal'
export const SANDBOX_WORKSPACE_MARKER_PATH = `${WORKSPACE_IDENTITY_DIRECTORY}/workspace.json`
export const PAL_DEVELOPMENT_SENTINEL_PATH = `${WORKSPACE_IDENTITY_DIRECTORY}/pal-development.json`

/**
 * Reserve the whole sidecar namespace, including aliases on case-insensitive filesystems.
 * Windows also strips trailing spaces/dots from path segments, so reject those aliases too.
 */
export function isWorkspaceIdentityPath(path: string): boolean {
  const first = path
    .split('/')[0]
    ?.toLowerCase()
    .replace(/[ .]+$/u, '')
  return first === WORKSPACE_IDENTITY_DIRECTORY
}

export type WorkspaceMode = 'pal-development' | 'sandbox' | 'local-project'
export type WorkspacePersistencePolicy = 'pal-bound' | 'sandbox-bound' | 'local-bound'
export type WorkspaceSource =
  | 'dev-http'
  | 'ui-samples'
  | 'local-directory'
  | 'blank-project'
  | 'pal-development-snapshot-clone'
  | 'save-as'
  | 'sandbox-copy'
  | 'review-copy'

export type SandboxWorkspaceSource = 'ui-samples' | 'sandbox-copy' | 'review-copy'

export interface SandboxWorkspaceMarkerV1 {
  kind: 'type-pal-editor-workspace'
  version: 1
  mode: 'sandbox'
  workspaceId: string
  projectId: string
  source: SandboxWorkspaceSource
}

export interface PalDevelopmentSentinelV1 {
  kind: 'type-pal-editor-pal-development'
  version: 1
  workspaceId: string
  projectId: string
}

export interface PalDevelopmentProof {
  sentinel: PalDevelopmentSentinelV1
  /** Paths come from the trusted boot manifest, never from the selected target. */
  paths: readonly string[]
  expectedFingerprint: string
}

export interface WorkspaceContext {
  workspaceId: string
  projectId: string
  mode: WorkspaceMode
  source: WorkspaceSource
  persistencePolicy: WorkspacePersistencePolicy
  seedStage?: 'development-snapshot'
  palProof?: PalDevelopmentProof
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isWorkspaceId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

function persistencePolicy(mode: WorkspaceMode): WorkspacePersistencePolicy {
  if (mode === 'pal-development') return 'pal-bound'
  if (mode === 'sandbox') return 'sandbox-bound'
  return 'local-bound'
}

function freezeWorkspace(context: WorkspaceContext): WorkspaceContext {
  if (context.palProof) {
    Object.freeze(context.palProof.paths)
    Object.freeze(context.palProof.sentinel)
    Object.freeze(context.palProof)
  }
  return Object.freeze(context)
}

export function createLocalWorkspaceContext(
  projectId: string,
  source: Extract<
    WorkspaceSource,
    'local-directory' | 'blank-project' | 'pal-development-snapshot-clone' | 'save-as'
  >,
  workspaceId: string = crypto.randomUUID(),
): WorkspaceContext {
  if (!isWorkspaceId(workspaceId)) throw new Error('工作区 identity 无效')
  return freezeWorkspace({
    workspaceId,
    projectId,
    mode: 'local-project',
    source,
    persistencePolicy: persistencePolicy('local-project'),
  })
}

export function createSandboxWorkspaceContext(
  projectId: string,
  source: SandboxWorkspaceSource,
  workspaceId: string = crypto.randomUUID(),
): WorkspaceContext {
  if (!isWorkspaceId(workspaceId)) throw new Error('工作区 identity 无效')
  return freezeWorkspace({
    workspaceId,
    projectId,
    mode: 'sandbox',
    source,
    persistencePolicy: persistencePolicy('sandbox'),
  })
}

export function sandboxMarkerFor(context: WorkspaceContext): SandboxWorkspaceMarkerV1 {
  if (context.mode !== 'sandbox') throw new Error('只有评审沙盒可以生成沙盒 marker')
  if (
    context.source !== 'ui-samples' &&
    context.source !== 'sandbox-copy' &&
    context.source !== 'review-copy'
  )
    throw new Error('沙盒来源无效')
  return {
    kind: 'type-pal-editor-workspace',
    version: 1,
    mode: 'sandbox',
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    source: context.source,
  }
}

export function parseSandboxWorkspaceMarker(value: unknown): SandboxWorkspaceMarkerV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('沙盒 workspace marker 不是对象')
  const marker = value as Record<string, unknown>
  const keys = Object.keys(marker).sort()
  const expected = ['kind', 'mode', 'projectId', 'source', 'version', 'workspaceId']
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index]))
    throw new Error('沙盒 workspace marker 字段不符合 current schema')
  if (
    marker.kind !== 'type-pal-editor-workspace' ||
    marker.version !== 1 ||
    marker.mode !== 'sandbox' ||
    !isWorkspaceId(marker.workspaceId) ||
    typeof marker.projectId !== 'string' ||
    typeof marker.source !== 'string' ||
    !['ui-samples', 'sandbox-copy', 'review-copy'].includes(marker.source)
  )
    throw new Error('沙盒 workspace marker 内容无效')
  return marker as unknown as SandboxWorkspaceMarkerV1
}

export function parsePalDevelopmentSentinel(value: unknown): PalDevelopmentSentinelV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('PAL 开发基线 sentinel 不是对象')
  const sentinel = value as Record<string, unknown>
  const keys = Object.keys(sentinel).sort()
  const expected = ['kind', 'projectId', 'version', 'workspaceId']
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index]))
    throw new Error('PAL 开发基线 sentinel 字段不符合 current schema')
  if (
    sentinel.kind !== 'type-pal-editor-pal-development' ||
    sentinel.version !== 1 ||
    !isWorkspaceId(sentinel.workspaceId) ||
    typeof sentinel.projectId !== 'string'
  )
    throw new Error('PAL 开发基线 sentinel 内容无效')
  return sentinel as unknown as PalDevelopmentSentinelV1
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('PAL 指纹 JSON 含非有限数值')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(',')}}`
  }
  throw new Error('PAL 指纹只接受 JSON 值')
}

async function hashCanonicalJson(value: unknown): Promise<string> {
  return sha256Hex(new TextEncoder().encode(canonicalJson(value)))
}

export function palFingerprintPaths(manifest: CurrentManifest): readonly string[] {
  const scenes = manifest.content.scenes ?? 'content/scenes/'
  const scenesIndex = `${scenes.endsWith('/') ? scenes : `${scenes}/`}index.json`
  return [
    PAL_DEVELOPMENT_SENTINEL_PATH,
    'manifest.json',
    manifest.assets.catalog,
    scenesIndex,
    ...(manifest.content.maps ? [manifest.content.maps] : []),
  ].sort()
}

export async function fingerprintJsonFiles(
  paths: readonly string[],
  readJson: (path: string) => Promise<unknown>,
): Promise<string> {
  const entries: string[] = []
  for (const path of [...paths].sort()) {
    const hash = await hashCanonicalJson(await readJson(path))
    entries.push(`${path}\0${hash}`)
  }
  return sha256Hex(
    new TextEncoder().encode(`type-pal-pal-development-fingerprint-v1\0${entries.join('\0')}`),
  )
}

export async function createPalDevelopmentWorkspaceContext(
  source: FileSource,
  trustedManifest?: CurrentManifest,
): Promise<WorkspaceContext> {
  const manifest = trustedManifest ?? (await source.readJson<CurrentManifest>('manifest.json'))
  const sentinel = parsePalDevelopmentSentinel(await source.readJson(PAL_DEVELOPMENT_SENTINEL_PATH))
  if (sentinel.projectId !== manifest.id)
    throw new Error('PAL 开发基线 sentinel 与可信 manifest 项目 id 不一致')
  const paths = palFingerprintPaths(manifest)
  const expectedFingerprint = await fingerprintJsonFiles(paths, (path) => source.readJson(path))
  return freezeWorkspace({
    workspaceId: sentinel.workspaceId,
    projectId: manifest.id,
    mode: 'pal-development',
    source: 'dev-http',
    persistencePolicy: persistencePolicy('pal-development'),
    seedStage: 'development-snapshot',
    palProof: Object.freeze({ sentinel, paths: Object.freeze([...paths]), expectedFingerprint }),
  })
}

/** Bind an independently loaded project snapshot between two PAL proof reads. */
export function assertSamePalDevelopmentProof(
  before: WorkspaceContext,
  after: WorkspaceContext,
): void {
  if (
    before.mode !== 'pal-development' ||
    after.mode !== 'pal-development' ||
    !before.palProof ||
    !after.palProof ||
    before.workspaceId !== after.workspaceId ||
    before.projectId !== after.projectId ||
    before.palProof.expectedFingerprint !== after.palProof.expectedFingerprint ||
    before.palProof.paths.length !== after.palProof.paths.length ||
    before.palProof.paths.some((path, index) => path !== after.palProof?.paths[index])
  )
    throw new Error('PAL 开发基线 HTTP 快照在载入期间发生变化，请刷新后重试')
}

export function workspaceModeLabel(context: Pick<WorkspaceContext, 'mode'>): string {
  if (context.mode === 'pal-development') return 'PAL 开发基线'
  if (context.mode === 'sandbox') return '评审沙盒'
  return '本地项目'
}
