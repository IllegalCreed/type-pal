/**
 * TEST-GLM-NEW-F-1 隔离功能视觉宿主（端口 6091，严格端口）。
 * 直挂两个真实编辑器面：CanonicalScriptBodyEditor（导航/编辑回显与取消）
 * 与 BattleSpriteUploader（合法小图集上传、切不开失败回显与恢复）。
 * 只证明这两个公开组件在真实浏览器里的行为，不冒充完整 App/E2E。
 */
import type { AuthorCommand } from '@type-pal/content'
import { fsaSource } from '@type-pal/reforge'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { memoryAuthorDirectory } from '../../../../../../../../packages/editor/src/core/__tests__/author-save-fixture.js'
import { buildBlankProject } from '../../../../../../../../packages/editor/src/core/seed.js'
import { BattleSpriteUploader } from '../../../../../../../../packages/editor/src/ui/BattleSpriteUploader.js'
import { CanonicalScriptBodyEditor } from '../../../../../../../../packages/editor/src/ui/ScriptEditor.js'
import { loadCurrentProjectFrom } from '../../../../../../../../packages/reforge/src/project-loader.js'
import '../../../../../../../../packages/editor/src/ui/design-system/index.css'
import '../../../../../../../../packages/editor/src/ui/editor.css'

async function boot(): Promise<void> {
  // 与测试 kit 同一合法装载路径：blank seed → 内存目录 → loader（Chrome 原生 gzip）。
  const disk = memoryAuthorDirectory(await buildBlankProject('glm-new-f-host'))
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const assetBase = project.assetBase

  function Host(): React.ReactElement {
    const [body, setBody] = useState<AuthorCommand[]>([{ kind: 'wait', ms: 17 }])
    const [applied, setApplied] = useState('尚未应用')
    return (
      <main style={{ display: 'grid', gap: 24, padding: 24, maxWidth: 1080 }}>
        <h1 style={{ fontSize: 20 }}>GLM New Wave F 隔离功能视觉宿主</h1>
        <section data-surface="script-editor" style={{ border: '1px solid #bbb', padding: 16 }}>
          <h2 style={{ fontSize: 16 }}>共享脚本正文（离开测试）</h2>
          <CanonicalScriptBodyEditor
            label="离开测试"
            body={body}
            onChange={(next) => {
              setBody(next)
              const wait = next.find((command) => command.kind === 'wait')
              document
                .querySelector('[data-committed]')
                ?.setAttribute('data-committed-value', wait && 'ms' in wait ? String(wait.ms) : '')
            }}
          />
          <p>
            已提交正文：
            <code data-committed data-committed-value="17">
              {JSON.stringify(body)}
            </code>
          </p>
        </section>
        <section data-surface="uploader" style={{ border: '1px solid #bbb', padding: 16 }}>
          <h2 style={{ fontSize: 16 }}>战斗外观上传器</h2>
          <BattleSpriteUploader
            assetBase={assetBase}
            onApply={async (blob, frameCount) => {
              setApplied(`已应用 ${frameCount} 帧（${blob.byteLength} 字节 gzip）`)
            }}
            onCancel={() => setApplied('已取消，零提交')}
          />
          <p data-apply-status>{applied}</p>
        </section>
      </main>
    )
  }

  const host = document.createElement('div')
  document.body.append(host)
  createRoot(host).render(<Host />)
}

void boot()
