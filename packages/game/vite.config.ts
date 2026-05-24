import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
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
