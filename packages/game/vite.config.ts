import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
    fs: {
      // M5 worktree:public/extracted 经 symlink 链到 main worktree,
      // 需把 main worktree 根目录加进 allow,否则 Vite block 跨目录 → SPA fallback
      // 返 index.html → loadGlyphs JSON.parse "<" 报错。
      allow: ['..', '../..', '/Users/zhangxu/illegal/type-pal'],
    },
  },
})
