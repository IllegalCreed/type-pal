本仓库是 SDL-PAL《仙剑奇侠传》的浏览器重实现，核心 UI 由 Canvas 2D 以 320x200 像素分辨率绘制，不依赖任何 CSS 框架或组件库。视觉风格通过少量内联 style 与运行时注入的 CSS 片段维持一致性。

### 1. 系统/方法
- 渲染目标：packages/game/index.html 中一个固定尺寸 canvas id=screen width=320 height=200，配合 image-rendering: pixelated 还原 90 年代像素风。
- CSS 方法论：无外部样式表、无 Tailwind/Styled Components；所有样式均为内联 style（启动页）或运行时 document.createElement('style') 注入（开发工具）。
- 主题色板：统一使用暗红/金色调（#8a2a2a、#d8b365、#f0e0b0、#111 背景），模拟原版 DOS 界面氛围。

### 2. 关键文件
- packages/game/index.html — 唯一 HTML 入口，包含 body 重置、Canvas 定位与启动 loading 覆盖层的全部 CSS。
- packages/game/src/dev/dev-panel.ts — 开发面板样式，通过 injectDevPanelCss() 动态注入 tp-dev-* 命名空间 CSS。
- packages/game/src/tools/fps-overlay.ts / speedrun/overlay.ts / tools-panel.ts — 各 overlay 工具各自 createElement('style') 注入自身样式。

### 3. 架构与约定
- 命名空间隔离：开发面板类名全部带 tp-dev- 前缀，避免污染游戏主界面。
- 单例注入：_devPanelCssInjected 标志保证同一页面只注入一次 CSS。
- 运行时构建 DOM：UI 元素通过 document.createElement + className/style.cssText 组合生成，不使用模板字符串或 JSX。
- 像素对齐：所有 overlay 强制 image-rendering: pixelated，确保缩略图与精灵在放大后仍保持锯齿像素外观。

### 4. 开发者应遵循的规则
- 新增 UI 时优先复用 index.html 中的颜色变量（#8a2a2a、#d8b365、#f0e0b0、#111），保持与启动画面一致。
- 开发工具样式一律通过 document.createElement('style') 注入并加 tp-dev- 前缀，禁止直接写全局 class。
- Canvas 输出始终设置 image-rendering: pixelated，避免浏览器平滑缩放破坏像素风。
- 不在项目中引入 .css 文件或第三方样式库；如需复杂样式，仍在运行时注入 style 块。