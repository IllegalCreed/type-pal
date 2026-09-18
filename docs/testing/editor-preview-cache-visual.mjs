// Memory-only browser harness: real components, Canvas, gzip-RLE and catalog. No project writes.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = join(root, 'packages/editor/build')
mkdirSync(output, { recursive: true })
writeFileSync(
  join(output, 'preview-cache-verify.html'),
  `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>预览缓存隔离验证</title></head><body><div id="root"></div><script type="module" src="/build/preview-cache-verify.tsx"></script></body></html>`,
)
writeFileSync(
  join(output, 'preview-cache-verify.tsx'),
  `
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { previewCacheFixture } from '../src/ui/__tests__/preview-cache-fixture.js'
import { loadEditorSprite } from '../src/core/sprite-assets.js'
import { FireEffectPreview } from '../src/ui/FireEffectPreview.js'
import { SpriteThumb } from '../src/ui/SpriteThumb.js'
import '../src/ui/design-system/index.css'
import '../src/ui/editor.css'
import '../src/ui/design-system/form-scope.css'
const a = await previewCacheFixture('same-project', 9, [240,20,20])
const b = await previewCacheFixture('same-project', 9, [20,90,240])
const failed = await previewCacheFixture('same-project', 9, [20,90,240])
failed.faults.add(failed.firePath)
failed.faults.add(failed.spritePath)
function App() {
  const [current, setCurrent] = useState(a)
  const [caption, setCaption] = useState('工程 A · 红色')
  const [generation, setGeneration] = useState(0)
  const [, refresh] = useState(0)
  return <main style={{padding:24,overflow:'auto',height:'100vh'}}>
    <h1>预览缓存 · 隔离功能验证</h1>
    <p>以下按钮仅驱动内存测试场景，不是产品新增界面。两个预览使用正式组件与原有样式。</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'20px 0'}}>
      <button onClick={()=>{setCurrent(b);setCaption('工程 B · 蓝色（同项目 ID、同特效号）')}}>切换到工程 B</button>
      <button onClick={async()=>{await current.replacePalette([20,200,40]);setCaption('当前色表更新 · 绿色');refresh(x=>x+1)}}>更新当前色表为绿色</button>
      <button onClick={()=>{setCurrent(failed);setCaption('首次读取失败（注入两次）')}}>模拟首次读取失败</button>
      <button onClick={async()=>{await loadEditorSprite(failed.reader,failed.spriteAsset);setCaption('同修订恢复重试 · 蓝色，缩略底层已预热');setGeneration(x=>x+1)}}>恢复资源并重试</button>
    </div>
    <h2>{caption}</h2>
    <section key={generation} style={{display:'flex',gap:40,alignItems:'flex-start'}}>
      <div><h3>技能特效预览</h3><FireEffectPreview assetBase={current.base} assetReader={current.reader} anim={{effectSprite:current.chunk}} /></div>
      <div><h3>精灵缩略图</h3><SpriteThumb assetBase={current.base} assetReader={current.reader} asset={current.spriteAsset} revision={current.revision()} label="验证精灵" /></div>
    </section>
    <button onClick={()=>refresh(x=>x+1)}>读取故障计数</button>
    <output>已注入读取故障：{failed.injected()}</output>
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
`,
)
console.log(
  'Open http://localhost:6010/build/preview-cache-verify.html on the existing editor dev server.',
)
