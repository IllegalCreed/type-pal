import type { EditorDerivedStoreSnapshot } from '../core/editor-derived-store.js'
import {
  effectiveEditorDerivedStatus,
  type EditorDerivedStore,
} from '../core/editor-derived-store.js'
import type { EditSession } from '../core/edit-session.js'
import type { ScriptEditSession } from '../core/script-editor.js'
import { DsButton } from './design-system/index.js'
import {
  useEditSessionSelector,
  useEditorDerivedSelector,
  useScriptEditSessionSelector,
} from './session-selector.js'

function lastKnownDerivedData(snapshot: EditorDerivedStoreSnapshot) {
  return snapshot.status === 'current'
    ? snapshot.data
    : snapshot.status === 'stale' || snapshot.status === 'failed'
      ? snapshot.lastKnown?.data
      : undefined
}

export function EditorDiagnosticsBar(props: {
  session: EditSession
  scriptSession: ScriptEditSession
  derivedStore: EditorDerivedStore
  activePageLabel: string
  workspaceLabel: string
  workspaceNotice?: { kind: 'info' | 'error'; message: string }
  saveError?: string
  busy?: boolean
}) {
  const { session, scriptSession, derivedStore } = props
  const mainDirty = useEditSessionSelector(session, (snapshot) => snapshot.dirty)
  const scriptDirty = useScriptEditSessionSelector(scriptSession, (snapshot) => snapshot.dirty)
  const derivedSnapshot = useEditorDerivedSelector(derivedStore, (snapshot) => snapshot)
  const derivedData = lastKnownDerivedData(derivedSnapshot)
  const derivedStatus = effectiveEditorDerivedStatus(derivedSnapshot, {
    mainHistoryVersion: session.getHistoryVersion(),
    scriptHistoryVersion: scriptSession.getHistoryVersion(),
  })
  const statusIssues = derivedData?.statusIssues ?? []

  return (
    <div className="valbar" inert={props.busy ? true : undefined}>
      {derivedStatus === 'current' ? (
        statusIssues.length > 0 ? (
          <>
            <span className="pill warn">⚠ {statusIssues.length} 项待处理</span>
            <span className="msg">
              {statusIssues
                .slice(0, 2)
                .map((issue) => issue.message)
                .join(' · ')}
            </span>
          </>
        ) : (
          <span className="pill is-success">✓ 引用与项目诊断无问题</span>
        )
      ) : derivedStatus === 'failed' ? (
        <>
          <span className="pill warn">⚠ 诊断失败</span>
          <span className="msg">
            {derivedSnapshot.status === 'failed' ? derivedSnapshot.message : '派生诊断失败'}
            {derivedData ? ` · 保留上一版 ${derivedData.statusIssues.length} 项结果` : ''}
          </span>
          <DsButton size="compact" variant="quiet" onClick={() => derivedStore.retry()}>
            重试
          </DsButton>
        </>
      ) : derivedStatus === 'stale' ? (
        <>
          <span className="pill warn">⟳ 正在重新检查</span>
          <span className="msg">
            上一版 {derivedData?.statusIssues.length ?? 0} 项结果仅供查看
          </span>
        </>
      ) : (
        <>
          <span className="pill">⟳ 检查中</span>
          <span className="msg">正在建立当前项目诊断快照…</span>
        </>
      )}
      {props.workspaceNotice ? (
        <span className="valbar-status" role="status" aria-live="polite">
          <span className={`pill${props.workspaceNotice.kind === 'error' ? ' warn' : ''}`}>
            {props.workspaceNotice.kind === 'error' ? '⚠' : 'ⓘ'} {props.activePageLabel}
          </span>
          <span className="msg">{props.workspaceNotice.message}</span>
        </span>
      ) : null}
      <span className="spacer" />
      <span
        role={props.saveError ? 'alert' : undefined}
        style={{
          color: props.saveError ? 'var(--err)' : 'var(--faint)',
          fontSize: 11,
        }}
      >
        {props.saveError
          ? `保存失败: ${props.saveError}`
          : `${props.workspaceLabel} · ${mainDirty || scriptDirty ? '未保存改动' : '已保存'}`}
      </span>
    </div>
  )
}
