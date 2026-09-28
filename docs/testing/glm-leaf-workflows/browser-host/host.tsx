import type { AssetCatalogV1 } from '@type-pal/content'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createEditorAssetReader } from '../../../../packages/editor/src/core/editor-asset-reader.js'
import type { FileSource } from '../../../../packages/reforge/src/file-source.js'
import '../../../../packages/editor/src/ui/design-system/index.css'
import '../../../../packages/editor/src/ui/editor.css'
import { ImageAssetPicker } from '../../../../packages/editor/src/ui/ImageAssetPicker.js'
import { PanelResizeHandle } from '../../../../packages/editor/src/ui/PanelResizeHandle.js'

const iconBytes = await fetch('/assets/leaf-item-icon.png').then((response) =>
  response.arrayBuffer(),
)

const source: FileSource = {
  readBytes: async (rel) => {
    if (rel === 'assets/leaf-item-icon.png') return iconBytes.slice(0)
    throw new DOMException(rel, 'NotFoundError')
  },
  readText: async (rel) => new TextDecoder().decode(await source.readBytes(rel)),
  readJson: async (rel) => JSON.parse(new TextDecoder().decode(await source.readBytes(rel))),
  urlFor: async (rel) => `/assets/${rel.split('/').at(-1)}`,
}

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'item-icon.leaf.001': {
      kind: 'item-icon',
      path: 'assets/leaf-item-icon.png',
      mediaType: 'image/png',
      bytes: iconBytes.byteLength,
      sha256: 'leaf-host-icon-001',
      label: '实验物品图标',
      origin: { kind: 'authored' },
    },
  },
}

const reader = createEditorAssetReader(source, { assetCatalog: catalog, assetBlobs: {} })

function Host() {
  const [selected, setSelected] = useState<string | undefined>('item-icon.leaf.001')
  const [panelWidth, setPanelWidth] = useState(180)
  return (
    <main style={{ display: 'grid', gap: 24, padding: 24, maxWidth: 720 }}>
      <section data-image-block>
        <ImageAssetPicker
          ariaLabel="物品图标"
          kind="item-icon"
          value={selected}
          catalog={catalog}
          reader={reader}
          allowUnset
          onChange={setSelected}
        />
        <output data-selected>{selected ?? '(未选)'}</output>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: `${panelWidth}px 1fr` }}>
        <aside style={{ background: '#2a2d33', minHeight: 160 }} data-side-panel>
          侧栏 {panelWidth}px
        </aside>
        <PanelResizeHandle
          orientation="vertical"
          className="app-inspector-resizer"
          value={panelWidth}
          min={120}
          max={400}
          resizeLabel="调整侧栏"
          onResize={(delta) =>
            setPanelWidth((width) => Math.min(400, Math.max(120, width + delta)))
          }
          onReset={() => setPanelWidth(180)}
        />
        <div style={{ background: '#1f2226', minHeight: 160 }}>主区</div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Host />)
