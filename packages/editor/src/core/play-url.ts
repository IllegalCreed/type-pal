/** Local workspaces are addressed by workspace identity; project remains the HTTP dev fallback. */
export function playProjectQuery(projectId: string, workspaceId?: string): string {
  return `project=${encodeURIComponent(projectId)}${
    workspaceId ? `&workspace=${encodeURIComponent(workspaceId)}` : ''
  }`
}
