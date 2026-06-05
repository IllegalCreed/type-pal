import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// e2e(playwright)跑同一份 config 但在 5174 且断言 baseURL=http://localhost:5174 —— 必须保持 HTTP。
// 否则 "server 走 https / baseURL 是 http" 会让全部 e2e 挂掉。playwright webServer.command 里设 E2E=1。
const isE2E = process.env.E2E === '1'

export default defineConfig({
  // 局域网用 http://192.168.x.x:5173 访问时**不是 secure context**(只有 https / http://localhost 才是),
  // → `ctx.audioWorklet` 为 undefined → MIDI BGM 后端初始化失败 → BGM 全哑(SFX 不走 worklet 故仍响)。
  // basic-ssl 生成自签证书让 dev 走 https://192.168.x.x:5173(首次过一次浏览器证书警告)→ secure context
  //   → AudioWorklet 可用 → BGM 正常。e2e 不挂此插件,server.https 保持 undefined → 仍是 http。
  plugins: isE2E ? [] : [basicSsl()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
    // host:true 绑 0.0.0.0,别人用局域网 IP 直接能连(免得每次手敲 --host)。
    host: true,
    // dev 显式 5173;e2e 用 5174(playwright.config.ts webServer)— 互不干扰。
    // strictPort=true 让 dev 占用 5173 时直接报错(不悄悄飘到 5174 撞 e2e)。
    port: 5173,
    strictPort: true,
    fs: {
      // M5 worktree:public/extracted 经 symlink 链到 main worktree,
      // 需把 main worktree 根目录加进 allow,否则 Vite block 跨目录 → SPA fallback
      // 返 index.html → loadGlyphs JSON.parse "<" 报错。
      allow: ['..', '../..', '/Users/zhangxu/illegal/type-pal'],
    },
  },
})
