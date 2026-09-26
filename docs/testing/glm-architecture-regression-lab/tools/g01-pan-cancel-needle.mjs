/**
 * ARCH-REGRESSION-LAB-GLM-1 · G01 平移取消反控宿主（vite dev，内存单点破坏，产品源零写盘）。
 *
 * 用法：node docs/testing/glm-architecture-regression-lab/tools/g01-pan-cancel-needle.mjs <port> <ttlSeconds>
 * 必须在仓库检出内运行（需要 packages/editor 的 vite 与 projects/* 资源映射）；
 * VITE_PROJECT_ID 由调用方环境注入（建议 pal 开发快照工程）。
 *
 * 单点破坏：MapMode.cancelPointerInteraction 不再清 panRef（删除 `panRef.current = null`）——
 * pointercancel 后迟到 pointermove 继续平移 → 画布像素在取消后漂移 →
 * 干净宿主上「取消后视图冻结」的业务结果在该宿主上反转为红（可证伪）。
 */
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// 默认脚本所在检出；可用 LAB_REPO_ROOT 指向含 gitignored 生成资源的完整检出
//（两检出的 packages/ 均为冻结零 diff，证据目标是生产行为本身）。
const repoRoot = resolve(process.env.LAB_REPO_ROOT ?? resolve(labRoot, '../../..'))
const port = Number(process.argv[2] ?? 6014)
const ttlSeconds = Number(process.argv[3] ?? 300)

const editorRequire = createRequire(resolve(repoRoot, 'packages/editor/package.json'))
const vite = editorRequire('vite')

const anchor = `    panRef.current = null
    setPaintTick((tick) => tick + 1)
  }
  cancelPointerInteractionRef.current = cancelPointerInteraction`
const replacement = `    /* g01-needle: panRef 故意不清除 —— pointercancel 后平移继续（反控用） */
    setPaintTick((tick) => tick + 1)
  }
  cancelPointerInteractionRef.current = cancelPointerInteraction`

const server = await vite.createServer({
  configFile: resolve(repoRoot, 'packages/editor/vite.config.ts'),
  root: resolve(repoRoot, 'packages/editor'),
  plugins: [
    {
      name: 'lab-g01-pan-cancel-needle',
      enforce: 'pre',
      load(id) {
        const clean = id.split('?')[0]
        if (!clean.endsWith('src/ui/MapMode.tsx')) return undefined
        const { readFileSync } = editorRequire('node:fs')
        const src = readFileSync(clean, 'utf8')
        console.log(`LAB_G01_NEEDLE_LOAD ${clean}`)
        if (src.split(anchor).length !== 2) throw new Error('g01 needle anchor not unique')
        console.log('LAB_G01_NEEDLE_APPLIED cancelPointerInteraction keeps panRef')
        return `${src.replace(anchor, replacement)}\n;window.__G01_NEEDLE_LIVE__ = true;`
      },
    },
  ],
  server: { port, strictPort: true },
})
await server.listen()
console.log(`g01 needle host ready on http://localhost:${port}/ (ttl ${ttlSeconds}s)`)
setTimeout(() => {
  console.log('g01 needle host ttl reached, shutting down')
  void server.close().then(() => process.exit(0))
}, ttlSeconds * 1000)
