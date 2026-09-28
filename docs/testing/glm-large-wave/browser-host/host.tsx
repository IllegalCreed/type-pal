/**
 * TEST-GLM-LARGE-WAVE-4 A 批隔离功能视觉宿主（端口 6086，严格端口）。
 * 直挂范围：CommandForm（setVar 草稿的清除/取消）与 SoundPicker（缺失资产恢复）。
 * 只证明这两个组件在真实浏览器里的表单/选择行为，不冒充完整 App。
 */
import type { AssetCatalogV1 } from '@type-pal/content'
import { validateWorldVariableRegistryV1 } from '@type-pal/content'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createEditorAssetReader } from '../../../../packages/editor/src/core/editor-asset-reader.js'
import type { FileSource } from '../../../../packages/reforge/src/file-source.js'
import { CommandForm } from '../../../../packages/editor/src/ui/CommandForm.js'
import { CanonicalScriptDialog } from '../../../../packages/editor/src/ui/ScriptEditor.js'
import { SoundPicker } from '../../../../packages/editor/src/ui/SoundPicker.js'
import { DsButton } from '../../../../packages/editor/src/ui/design-system/index.js'
import '../../../../packages/editor/src/ui/design-system/index.css'
import '../../../../packages/editor/src/ui/editor.css'

const worldVariables = validateWorldVariableRegistryV1({
  count: { kind: 'number', name: '背包计数', description: '', initial: 2 },
  opened: { kind: 'flag', name: '开门', description: '', initial: false },
})

const scene = {
  id: 'start',
  mapId: 'start',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
  entities: [],
}

const references = {
  choices: () => [],
  has: () => false,
  label: (_kind: string, id: string) => id,
}

const soundCatalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'sound-bell': {
      kind: 'sound',
      path: 'assets/bell.wav',
      mediaType: 'audio/wav',
      bytes: 44,
      sha256: 'glw-host-bell',
      label: '铃声',
      origin: { kind: 'authored' },
    },
    'sound-drum': {
      kind: 'sound',
      path: 'assets/drum.wav',
      mediaType: 'audio/wav',
      bytes: 44,
      sha256: 'glw-host-drum',
      label: '鼓点',
      origin: { kind: 'authored' },
    },
  },
}

const silence = new ArrayBuffer(44)
const source: FileSource = {
  readBytes: async () => silence.slice(0),
  readText: async (rel) => new TextDecoder().decode(await source.readBytes(rel)),
  readJson: async (rel) => JSON.parse(new TextDecoder().decode(await source.readBytes(rel))),
  urlFor: async (rel) => `/assets/${rel.split('/').at(-1)}`,
}
const reader = createEditorAssetReader(source, {
  manifest: { id: 'glw-host' } as Parameters<typeof createEditorAssetReader>[1]['manifest'],
  assetCatalog: soundCatalog,
  assetBlobs: {},
})

/** 段一：命令表单草稿的清除/取消。 */
function CommandFormSection() {
  const committedCommand = { kind: 'setVar', var: 'count', value: 2 } as const
  const [draft, setDraft] = useState<{ kind: 'setVar'; var: string; value: number }>({
    ...committedCommand,
  })
  const [committed, setCommitted] = useState<string>(JSON.stringify(committedCommand))
  const [open, setOpen] = useState(false)
  // 取消=丢弃草稿回到已保存值；与编辑器聚合弹层的取消语义一致。
  const discardAndClose = (): void => {
    setDraft({ ...committedCommand })
    setOpen(false)
  }
  return (
    <section data-visual="command-form" style={{ display: 'grid', gap: 12 }}>
      <h2>命令表单：清除 / 取消</h2>
      <p>当前已保存值：<output data-committed>{committed}</output></p>
      <DsButton onClick={() => setOpen(true)} data-action="open-form">打开表单</DsButton>
      {open ? (
        <CanonicalScriptDialog
          title="修改变量"
          onClose={discardAndClose}
          footer={
            <>
              <DsButton data-action="cancel" onClick={discardAndClose}>取消</DsButton>
              <DsButton
                variant="primary"
                data-action="commit"
                onClick={() => {
                  setCommitted(JSON.stringify(draft))
                  setOpen(false)
                }}
              >
                完成
              </DsButton>
            </>
          }
        >
          <CommandForm
            cmd={draft}
            scene={scene}
            locale={{}}
            assetCatalog={{ version: 1, assets: {} }}
            audioResolver={reader}
            assetReader={reader}
            battleSprites={[]}
            references={references}
            worldVariables={worldVariables}
            showRawJson={false}
            onChange={setDraft}
          />
        </CanonicalScriptDialog>
      ) : null}
    </section>
  )
}

/** 段二：音效资源选择与缺失恢复。 */
function SoundSection() {
  const [value, setValue] = useState<string | undefined>('sound-ghost')
  return (
    <section data-visual="sound-picker" style={{ display: 'grid', gap: 12 }}>
      <h2>音效选择：缺失恢复</h2>
      <SoundPicker
        value={value}
        catalog={soundCatalog}
        reader={reader}
        onChange={setValue}
      />
      <output data-sound-value>{value ?? '(未选)'}</output>
    </section>
  )
}

function Host() {
  return (
    <main style={{ display: 'grid', gap: 32, padding: 24, maxWidth: 720 }}>
      <CommandFormSection />
      <SoundSection />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Host />)
