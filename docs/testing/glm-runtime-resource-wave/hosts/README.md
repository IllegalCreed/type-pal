# hosts/ · 固定输入视觉取证宿主

rv1 / rv2 / rv3-rv4 为 esbuild 打包的一次性取证页（真实 reforge/migrate 源 + 真实
unifont-cn.bdf + 真实 engine chrome PNG 只读）。**`main.js` 为构建产物不入库**，
重建命令（web 根 = 仓库根，`python3 -m http.server 607x --bind 127.0.0.1`）：

```sh
node -e "
const esbuild = require('./node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js')
esbuild.build({
  entryPoints: ['docs/testing/glm-runtime-resource-wave/hosts/rv2/entry.ts'],
  outfile: 'docs/testing/glm-runtime-resource-wave/hosts/rv2/main.js',
  bundle: true, format: 'iife',
  alias: { '@type-pal/content': './packages/content/src/index.ts' },
  define: { 'import.meta.glob': '__rv2Glob', 'import.meta.url': 'document.baseURI' },
  banner: { js: 'var __rv2Glob = () => () => ({});' },
  resolveExtensions: ['.ts', '.js'], logLevel: 'error',
}).then(() => console.log('bundled'))
"
```

rv3-rv4 同式（entryPoints/outfile 换 `rv3-rv4`）。rv1 为纯静态页（无构建）。
截图与 sha256 见 receipt.md 对应批次；entry 源即取证时代码（biome 格式化等价）。
