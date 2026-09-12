/**
 * Test consumer of the public authorization protocol, not a product save implementation.
 * These policy fixtures intentionally contain partial/non-project JSON; they cannot be sent
 * through the canonical writer. Full writer/recovery contracts are tested separately.
 * No authorization, identity, conflict or snapshot guard is replaced here.
 */
import {
  type AuthorizedWorkspaceInput,
  authorizedDirectory,
  beginAuthorizedWorkspaceMutation,
  planAuthorizedWorkspacePaths,
  recordAuthorizedWorkspaceWriteCompleted,
  withAuthorizedWorkspaceMutation,
} from '../workspace-persistence.js'

export async function performPolicyFixtureWrite(
  target: AuthorizedWorkspaceInput,
  path: string,
  value: unknown,
): Promise<void> {
  const payload =
    value instanceof ArrayBuffer
      ? new Blob([value.slice(0)])
      : typeof value === 'string'
        ? value
        : `${JSON.stringify(value, null, 2)}\n`
  await withAuthorizedWorkspaceMutation(target, async (scope) => {
    await planAuthorizedWorkspacePaths(scope, [path])
    await beginAuthorizedWorkspaceMutation(scope)
    const segments = path.split('/')
    const name = segments.pop()!
    let directory = authorizedDirectory(scope)
    for (const segment of segments)
      directory = await directory.getDirectoryHandle(segment, { create: true })
    const stream = await (await directory.getFileHandle(name, { create: true })).createWritable()
    await stream.write(payload)
    await stream.close()
    await recordAuthorizedWorkspaceWriteCompleted(scope, path, payload)
  })
}
