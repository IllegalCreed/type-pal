/**
 * ProjectPicker —— 启动屏(P4)。真实用户入口:从 pal 克隆 / 打开本地 / 新建空白 / 最近工程。
 * 动作逻辑在 core/open-actions(与编辑器内「工程」菜单共享);此处只管 UI + 进度/错误态。
 * FSA 选夹是浏览器原生弹窗(须用户手势);非 Chromium 无 showDirectoryPicker → 提示换浏览器。
 */
import {
  type ProjectScriptV4V5MigrationReport,
  type ProjectScriptV4V5Resolution,
  type ProjectScriptV4V5ResolutionPlan,
  ProjectScriptV4V5UpgradeError,
} from '@type-pal/content'
import { useEffect, useState } from 'react'
import { currentDirectoryPickerAvailability } from '../core/file-system-access.js'
import { ensurePermission, listRecent, loadHandle } from '../core/handle-store.js'
import {
  finishOpen,
  newBlankProject,
  newFromPal,
  type Opened,
  pickDir,
} from '../core/open-actions.js'
import type { SoundUpgradeProgress } from '../core/upgrade-local-v2.js'
import {
  type LocalProjectV4V5MigrationPreview,
  LocalProjectV4V5PreviewRequiredError,
} from '../core/upgrade-local-v4-script-v5.js'

const mb = (n: number): string => (n / 1024 / 1024).toFixed(1)

function splitAddress(value: string): { scene: string; entity: string } {
  const slash = value.lastIndexOf('/')
  if (slash <= 0 || slash === value.length - 1) throw new Error(`实体地址候选无效：${value}`)
  return { scene: value.slice(0, slash), entity: value.slice(slash + 1) }
}

function defaultResolution(
  report: ProjectScriptV4V5MigrationReport,
): ProjectScriptV4V5Resolution | null {
  const issue = report.issues[0]
  if (!issue) return null
  if (issue.resolution === 'name-pages') {
    const pages = (issue.slots ?? []).map((slot) => ({
      pageId: slot.suggestedId,
      label: `页面 ${slot.index + 1}`,
      ...(slot.hasTrigger
        ? {
            triggerBehaviorId: `${slot.suggestedId}-trigger`,
            triggerLabel: `页面 ${slot.index + 1} 触发行为`,
          }
        : {}),
      ...(slot.hasAuto
        ? {
            autoBehaviorId: `${slot.suggestedId}-auto`,
            autoLabel: `页面 ${slot.index + 1} 自动行为`,
          }
        : {}),
    }))
    return {
      kind: 'name-pages',
      path: issue.path,
      initialPageId: pages[0]?.pageId ?? '',
      pages,
    }
  }
  if (issue.resolution === 'name-stages')
    return {
      kind: 'name-stages',
      path: issue.path,
      stages: (issue.slots ?? []).map((slot) => ({ stageId: slot.suggestedId })),
    }
  if (issue.resolution === 'select-entity-address') {
    const candidate = issue.candidates?.[0]
    return candidate
      ? { kind: 'select-entity-address', path: issue.path, target: splitAddress(candidate) }
      : null
  }
  if (issue.resolution === 'resolve-legacy-entity-alias') {
    return {
      kind: 'resolve-legacy-entity-alias',
      path: issue.path,
      mode: 'broadcast-v4',
    }
  }
  if (issue.resolution === 'resolve-legacy-cursor-alias') {
    return {
      kind: 'resolve-legacy-cursor-alias',
      path: issue.path,
      mode: 'broadcast-v4',
    }
  }
  if (issue.resolution === 'replace-dynamic-binding')
    return {
      kind: 'replace-dynamic-binding',
      path: issue.path,
      id: 'migrated-behavior',
      label: '迁移行为',
    }
  return null
}

export function ProjectPicker(props: { onOpened: (o: Opened) => void; seedBaseUrl?: string }) {
  const { onOpened, seedBaseUrl = 'projects/pal' } = props
  const [recent, setRecent] = useState<{ id: string; name: string }[]>([])
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState<{
    done: number
    total: number
    detail?: string
  } | null>(null)
  const [err, setErr] = useState('')
  const [migrationReport, setMigrationReport] = useState<ProjectScriptV4V5MigrationReport | null>(
    null,
  )
  const [migrationDir, setMigrationDir] = useState<FileSystemDirectoryHandle | null>(null)
  const [migrationResolutions, setMigrationResolutions] = useState<ProjectScriptV4V5Resolution[]>(
    [],
  )
  const [migrationDraft, setMigrationDraft] = useState<ProjectScriptV4V5Resolution | null>(null)
  const [migrationPreview, setMigrationPreview] = useState<LocalProjectV4V5MigrationPreview | null>(
    null,
  )

  useEffect(() => {
    listRecent()
      .then(setRecent)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setMigrationDraft(migrationReport ? defaultResolution(migrationReport) : null)
  }, [migrationReport])

  const pickerAvailability = currentDirectoryPickerAvailability()

  const run = (label: string, fn: () => Promise<Opened | null>) => async (): Promise<void> => {
    setErr('')
    setMigrationReport(null)
    setMigrationPreview(null)
    setBusy(label)
    try {
      const o = await fn()
      if (o) onOpened(o)
    } catch (e) {
      if (e instanceof ProjectScriptV4V5UpgradeError) {
        if (
          migrationResolutions.length > 0 &&
          e.report.inputDigest !== migrationReport?.inputDigest
        )
          setMigrationResolutions([])
        setMigrationReport(structuredClone(e.report))
      } else if (e instanceof LocalProjectV4V5PreviewRequiredError)
        setMigrationPreview(structuredClone(e.preview))
      else setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
      setProgress(null)
    }
  }

  const onSoundUpgradeProgress = (value: SoundUpgradeProgress): void =>
    setProgress({
      done: value.completed,
      total: value.total,
      detail: value.phase === 'read' ? '校验旧音效' : '写入升级工程',
    })
  const onCloneFromPal = run('从 pal 克隆', () =>
    newFromPal(seedBaseUrl, (done, total) => setProgress({ done, total, detail: '下载工程' })),
  )
  const onNewBlank = run('创建空白工程', newBlankProject)
  const onOpen = run('打开工程', async () => {
    const dir = await pickDir()
    if (!dir) return null
    setMigrationDir(dir)
    setMigrationResolutions([])
    return finishOpen(dir, onSoundUpgradeProgress)
  })
  const onRecent = (id: string) =>
    run('打开最近工程', async () => {
      const dir = await loadHandle(id)
      if (!dir) throw new Error('句柄已失效,请「打开工程」重新选文件夹')
      const perm = await ensurePermission(dir, { withRequest: true })
      if (perm !== 'granted') throw new Error('未授权访问该文件夹')
      setMigrationDir(dir)
      setMigrationResolutions([])
      return finishOpen(dir, onSoundUpgradeProgress)
    })()

  const retryMigration = (
    resolutions: ProjectScriptV4V5Resolution[],
    confirmInputDigest?: string,
  ): void => {
    const inputDigest = migrationPreview?.inputDigest ?? migrationReport?.inputDigest
    if (!migrationDir || !inputDigest) return
    const resolutionPlan: ProjectScriptV4V5ResolutionPlan = {
      inputDigest,
      resolutions,
    }
    void run(confirmInputDigest ? '发布脚本迁移' : '预检脚本迁移', () =>
      finishOpen(migrationDir, onSoundUpgradeProgress, {
        resolutionPlan,
        ...(confirmInputDigest ? { confirmInputDigest } : {}),
      }),
    )()
  }

  const continueMigration = (): void => {
    if (!migrationDraft) return
    const next = [
      ...migrationResolutions.filter((resolution) => resolution.path !== migrationDraft.path),
      structuredClone(migrationDraft),
    ]
    setMigrationResolutions(next)
    retryMigration(next)
  }

  if (!pickerAvailability.available) {
    return (
      <div className="picker">
        <div className="picker-card">
          <h1 className="picker-title">type-pal 编辑器</h1>
          <div className="picker-err">{pickerAvailability.message}</div>
        </div>
      </div>
    )
  }

  const pct =
    progress && progress.total > 0 ? Math.floor((progress.done / progress.total) * 100) : 0

  return (
    <div className="picker">
      <div className="picker-card">
        <h1 className="picker-title">type-pal 编辑器</h1>
        <p className="picker-sub">
          选一个工程开始 —— 改版仙剑,或从头做个新游戏。工程存在你本地文件夹。
        </p>

        {busy ? (
          <div className="picker-busy">
            <div className="picker-busy-label">{busy}…</div>
            {progress ? (
              <>
                <div className="picker-bar">
                  <div className="picker-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="picker-busy-sub">
                  {progress.detail ? `${progress.detail} · ` : ''}
                  {pct}% · {mb(progress.done)}/{mb(progress.total)} MB
                </div>
              </>
            ) : (
              <div className="picker-busy-sub">选择文件夹并授权…</div>
            )}
          </div>
        ) : (
          <>
            <div className="picker-actions">
              <button type="button" className="picker-act primary" onClick={onCloneFromPal}>
                <span className="picker-act-t">🗡 从仙剑(pal)克隆</span>
                <span className="picker-act-d">
                  下载整套原版到本地工程,直接改版(约 200MB,一次性)
                </span>
              </button>
              <button type="button" className="picker-act" onClick={onOpen}>
                <span className="picker-act-t">📂 打开工程</span>
                <span className="picker-act-d">选一个已有的本地工程文件夹继续编辑</span>
              </button>
              <button type="button" className="picker-act" onClick={onNewBlank}>
                <span className="picker-act-t">✨ 新建空白工程</span>
                <span className="picker-act-d">
                  从零做新游戏;自带一间起始草地房和占位主角,开箱即玩,素材逐步换成你自己的
                </span>
              </button>
            </div>

            {recent.length > 0 && (
              <div className="picker-recent">
                <div className="picker-recent-h">最近工程</div>
                {recent.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    className="picker-recent-item"
                    onClick={() => onRecent(r.id)}
                  >
                    <span className="mono">{r.id}</span>
                    <span className="picker-recent-name">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {migrationReport && (
          <section
            className="picker-migration-workbench"
            aria-labelledby="migration-workbench-title"
          >
            <h2 id="migration-workbench-title">脚本迁移工作台</h2>
            <p>
              这个 v4
              工程含不能唯一自动结构化的作者内容。逐项命名或消歧后会先生成只读预览；最终确认前工程保持原样。
            </p>
            {migrationReport.inputDigest && (
              <div className="mono">输入摘要：{migrationReport.inputDigest}</div>
            )}
            <ol>
              {migrationReport.issues.map((issue) => (
                <li key={`${issue.path}:${issue.resolution}`}>
                  <div className="mono">{issue.path}</div>
                  <div>{issue.message}</div>
                  <div>
                    需要：<code>{issue.resolution}</code>
                  </div>
                  {issue.candidates?.length ? <div>候选：{issue.candidates.join('、')}</div> : null}
                </li>
              ))}
            </ol>
            {migrationDraft?.kind === 'name-pages' && (
              <div className="picker-migration-resolution">
                {migrationDraft.pages.map((page, index) => (
                  <fieldset key={index}>
                    <legend>旧 Page {index + 1}</legend>
                    <label>
                      Page ID
                      <input
                        value={page.pageId}
                        onChange={(event) =>
                          setMigrationDraft({
                            ...migrationDraft,
                            pages: migrationDraft.pages.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, pageId: event.target.value }
                                : entry,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      显示名称
                      <input
                        value={page.label}
                        onChange={(event) =>
                          setMigrationDraft({
                            ...migrationDraft,
                            pages: migrationDraft.pages.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, label: event.target.value }
                                : entry,
                            ),
                          })
                        }
                      />
                    </label>
                    {page.triggerBehaviorId !== undefined && (
                      <>
                        <label>
                          Trigger Behavior ID
                          <input
                            value={page.triggerBehaviorId}
                            onChange={(event) =>
                              setMigrationDraft({
                                ...migrationDraft,
                                pages: migrationDraft.pages.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, triggerBehaviorId: event.target.value }
                                    : entry,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Trigger 名称
                          <input
                            value={page.triggerLabel ?? ''}
                            onChange={(event) =>
                              setMigrationDraft({
                                ...migrationDraft,
                                pages: migrationDraft.pages.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, triggerLabel: event.target.value }
                                    : entry,
                                ),
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                    {page.autoBehaviorId !== undefined && (
                      <>
                        <label>
                          Auto Behavior ID
                          <input
                            value={page.autoBehaviorId}
                            onChange={(event) =>
                              setMigrationDraft({
                                ...migrationDraft,
                                pages: migrationDraft.pages.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, autoBehaviorId: event.target.value }
                                    : entry,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Auto 名称
                          <input
                            value={page.autoLabel ?? ''}
                            onChange={(event) =>
                              setMigrationDraft({
                                ...migrationDraft,
                                pages: migrationDraft.pages.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, autoLabel: event.target.value }
                                    : entry,
                                ),
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                  </fieldset>
                ))}
                <label>
                  初始 Page
                  <select
                    value={migrationDraft.initialPageId}
                    onChange={(event) =>
                      setMigrationDraft({
                        ...migrationDraft,
                        initialPageId: event.target.value,
                      })
                    }
                  >
                    {migrationDraft.pages.map((page) => (
                      <option key={page.pageId} value={page.pageId}>
                        {page.label || page.pageId}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {migrationDraft?.kind === 'name-stages' && (
              <div className="picker-migration-resolution">
                {migrationDraft.stages.map((stage, index) => (
                  <label key={index}>
                    Stage {index + 1} ID
                    <input
                      value={stage.stageId}
                      onChange={(event) =>
                        setMigrationDraft({
                          ...migrationDraft,
                          stages: migrationDraft.stages.map((entry, entryIndex) =>
                            entryIndex === index ? { stageId: event.target.value } : entry,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            {migrationDraft?.kind === 'select-entity-address' && (
              <label className="picker-migration-choice">
                实体地址
                <select
                  value={`${migrationDraft.target.scene}/${migrationDraft.target.entity}`}
                  onChange={(event) =>
                    setMigrationDraft({
                      ...migrationDraft,
                      target: splitAddress(event.target.value),
                    })
                  }
                >
                  {migrationReport.issues[0]?.candidates?.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {candidate}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {migrationDraft?.kind === 'resolve-legacy-entity-alias' && (
              <div className="picker-migration-resolution">
                <label>
                  旧存档值处理
                  <select
                    value={migrationDraft.mode}
                    onChange={(event) => {
                      const mode = event.target.value as 'broadcast-v4' | 'single'
                      const candidate = migrationReport.issues[0]?.candidates?.[0]
                      setMigrationDraft({
                        kind: 'resolve-legacy-entity-alias',
                        path: migrationDraft.path,
                        mode,
                        ...(mode === 'single' && candidate
                          ? { target: splitAddress(candidate) }
                          : {}),
                      })
                    }}
                  >
                    <option value="broadcast-v4">忠实广播到全部候选</option>
                    <option value="single">只保留一个目标（行为变化）</option>
                  </select>
                </label>
                {migrationDraft.mode === 'single' && (
                  <label>
                    单一目标
                    <select
                      value={
                        migrationDraft.target
                          ? `${migrationDraft.target.scene}/${migrationDraft.target.entity}`
                          : ''
                      }
                      onChange={(event) =>
                        setMigrationDraft({
                          ...migrationDraft,
                          target: splitAddress(event.target.value),
                        })
                      }
                    >
                      {migrationReport.issues[0]?.candidates?.map((candidate) => (
                        <option key={candidate} value={candidate}>
                          {candidate}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {migrationDraft?.kind === 'resolve-legacy-cursor-alias' && (
              <div className="picker-migration-resolution">
                <label>
                  旧 cursor 处理
                  <select
                    value={migrationDraft.mode}
                    onChange={(event) => {
                      const mode = event.target.value as 'broadcast-v4' | 'single'
                      setMigrationDraft({
                        kind: 'resolve-legacy-cursor-alias',
                        path: migrationDraft.path,
                        mode,
                        ...(mode === 'single'
                          ? { targetKey: migrationReport.issues[0]?.candidates?.[0] ?? '' }
                          : {}),
                      })
                    }}
                  >
                    <option value="broadcast-v4">忠实广播到全部行为</option>
                    <option value="single">只保留一个行为（行为变化）</option>
                  </select>
                </label>
                {migrationDraft.mode === 'single' && (
                  <label>
                    单一行为
                    <select
                      value={migrationDraft.targetKey ?? ''}
                      onChange={(event) =>
                        setMigrationDraft({
                          ...migrationDraft,
                          targetKey: event.target.value,
                        })
                      }
                    >
                      {migrationReport.issues[0]?.candidates?.map((candidate) => (
                        <option key={candidate} value={candidate}>
                          {candidate}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {migrationDraft?.kind === 'replace-dynamic-binding' && (
              <div className="picker-migration-resolution">
                <label>
                  Behavior / Hook ID
                  <input
                    value={migrationDraft.id}
                    onChange={(event) =>
                      setMigrationDraft({
                        ...migrationDraft,
                        id: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  显示名称
                  <input
                    value={migrationDraft.label}
                    onChange={(event) =>
                      setMigrationDraft({
                        ...migrationDraft,
                        label: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            )}
            {migrationDraft ? (
              <button
                type="button"
                className="picker-migration-continue"
                onClick={continueMigration}
              >
                应用本项并继续预检
              </button>
            ) : (
              <p>
                这一项涉及控制流重组，当前不能靠猜测自动修复；工程仍保持零写。请根据路径整理旧脚本后重新打开。
              </p>
            )}
            <p>若输入摘要发生变化，已有选择会作废并重新预检。</p>
          </section>
        )}
        {migrationPreview && (
          <section className="picker-migration-workbench" aria-labelledby="migration-preview-title">
            <h2 id="migration-preview-title">脚本迁移发布预览</h2>
            <div className="mono">输入摘要：{migrationPreview.inputDigest}</div>
            <dl className="picker-migration-preview-grid">
              <div>
                <dt>场景</dt>
                <dd>{migrationPreview.scenes}</dd>
              </div>
              <div>
                <dt>物品</dt>
                <dd>{migrationPreview.items}</dd>
              </div>
              <div>
                <dt>共享脚本</dt>
                <dd>{migrationPreview.sharedScripts}</dd>
              </div>
              <div>
                <dt>Page 分配</dt>
                <dd>{migrationPreview.pageAllocations}</dd>
              </div>
              <div>
                <dt>Stage 分配</dt>
                <dd>{migrationPreview.stageAllocations}</dd>
              </div>
              <div>
                <dt>存档别名</dt>
                <dd>
                  {migrationPreview.legacyEntityAliases + migrationPreview.legacyCursorAliases}
                </dd>
              </div>
            </dl>
            {migrationPreview.behaviorChangeSelections > 0 && (
              <p className="picker-migration-warning">
                你选择了 {migrationPreview.behaviorChangeSelections}{' '}
                个单一目标；这些选择会改变旧版广播语义。
              </p>
            )}
            <p>
              确认后将建立 staging 与恢复 journal，写入 canonical v5 内容、兼容 sidecar，最后提交
              manifest。
            </p>
            <button
              type="button"
              className="picker-migration-continue"
              onClick={() => retryMigration(migrationResolutions, migrationPreview.inputDigest)}
            >
              确认并发布 v5
            </button>
          </section>
        )}
        {err && <div className="picker-err">{err}</div>}
      </div>
    </div>
  )
}
