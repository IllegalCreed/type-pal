## 体系概览

本仓库没有统一的“应用级配置中心”，而是按运行环境分层组合三类配置源：

1. Vite 构建期常量注入（import.meta.env.*）— 决定 dev/prod/e2e 行为、是否挂 SW/进度条/调试探针。
2. 浏览器 URL 查询参数（?build=win95|dos、?skip-intro=1、?pal=、?collision、?gallery）— 用户/测试在运行时切换行为，无需重新构建。
3. SDL-PAL 原生 sdlpal.cfg — 作为参考与基线对照，记录原版 C 引擎的音频/视频/GLSL/OPL 等开关，本仓库不直接解析它，但用其字段名做忠实度注释。

此外，开发服务器映射通过 Vite 插件把 /extracted 静态资源目录挂载到 data/extracted，是“部署路径”层面的配置。

## 关键文件与位置

- packages/game/vite.config.ts — 开发/预览服务器配置；E2E=1 环境变量控制是否挂 basic-ssl、端口 5173 vs 5174、/extracted 中间件映射。
- packages/game/playwright.config.ts — E2E 项目配置；webServer.command = 'E2E=1 pnpm dev --port 5174'，baseURL=http://localhost:5174。
- packages/game/src/main.ts — 入口：读取 import.meta.env.PROD 决定是否注册 Service Worker、显示可玩门与两段进度条。
- packages/game/src/shell/bootstrap.ts — 游戏启动引导：解析 ?build=win95|dos、?skip-intro=1，并行加载 soundfont/glyphs/dialog assets，装配 core/present/audio 子系统。
- packages/reforge/src/main.ts — Reforge 重制引擎入口：从 import.meta.env.VITE_PROJECT_ID 读工程 ID，再动态 loadProject(PROJECT_ID) 拉取内容包。
- sdlpal.cfg — 顶层 SDL-PAL 配置文件（参考），包含 KeepAspectRatio、FullScreen、EnableGLSL、MusicVolume、WindowWidth/Height 等键，用于注释与忠实度比对。

## 架构与约定

### 1) 构建期配置（Vite define）

- import.meta.env.DEV：Vite 自动注入，true 时启用 dev-panel、MIDI 调试探针 __tpmidi、state-dump 等。
- import.meta.env.PROD：自定义判断（main.ts），仅 true 时挂 SW 预缓存 + 可玩门 UI。
- import.meta.env.VITE_PROJECT_ID：reforge 自定义 define，缺省 'demo'，指向 projects/demo 内容包。
- process.env.E2E：playwright webServer.command 注入，=== '1' 时关闭 basic-ssl、保持 http。
- process.env.CI：CI 环境，控制 forbidOnly、reuseExistingServer。
- process.env.UPDATE_BASELINES：e2e 脚本传入，更新截图基线。

约定：所有分支条件都写成 (import.meta as unknown as { env?: { X?: boolean } }).env?.X === true/false，避免 Vite 未定义时的类型报错。生产构建下 DEV=false 的分支会被 tree-shake 掉，零体积开销。

### 2) 运行时配置（URL 查询参数）

- ?build=win95|dos（packages/game bootstrap）：选择 WIN95（mp4 AVI）或 DOS（RNG/FBP 回退）开场序列。
- ?skip-intro=1（packages/game bootstrap）：跳过开场梦境，直接进入客栈 scene 1。
- ?pal=<id>（packages/reforge main）：覆盖场景调色板号，本地试色板用。
- ?collision（packages/reforge main）：渲染碰撞格（0x2000）叠加画面，肉眼比对禁入格。
- ?gallery（packages/reforge main）：只渲染精灵速查图，不进场景。

这些参数通过 new URLSearchParams(location.search) 在各自入口解析，不改构建产物，适合快速验证与 e2e 断言。

### 3) 资源路径与服务器映射

- Vite 插件 serveDir('/extracted', resolve(repoRoot, 'data/extracted')) 把 /extracted/* 请求映射到仓库根 data/extracted/*，解决 Windows 上 symlink 失效导致 dev fetch 404 的问题。
- 该中间件同时挂在 configureServer 和 configurePreviewServer，保证 pnpm preview 也能访问 /extracted（SW 离线校验）。
- 端口：dev 固定 5173，e2e webServer 用 5174，互不干扰。

### 4) SDL-PAL 配置文件（参考）

sdlpal.cfg 中的键（如 fIsWIN95、AudioBufferSize、OPLCore、MusicVolume 等）被代码以注释形式引用，用于对齐 sdlpal 真值，但本仓库不解析此文件，也不将其作为运行时配置源。

## 开发者应遵循的规则

1. 新增构建期开关 → 走 import.meta.env.*，在对应包的 Vite config 中 define 注入，或使用 (import.meta as unknown as { env?: { ... } }).env?.X 安全访问。
2. 新增运行时开关 → 走 URL 查询参数，在入口文件（bootstrap / reforge main）用 URLSearchParams 解析，并加注释说明用途。
3. 不要引入新的配置文件格式。当前仓库已用 manifest.json（内容包）、*.json（数据 dump）承载结构化数据；应用级配置仍由 Vite + URL 参数承担。
4. E2E 环境隔离：通过 E2E=1 环境变量区分 dev/e2e server（http vs https、端口 5174），不要在 e2e 里依赖 basic-ssl。UPDATE_BASELINES=1 才允许更新截图基线，CI 中禁止。
5. SDL-PAL 忠实度注释：当行为差异来自 sdlpal 配置项（如 gConfig.fIsWIN95、gConfig.fIsMusicEnabled），在代码注释中写明 sdlpal 源码行号与 cfg 键名，便于回归比对。