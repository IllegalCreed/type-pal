## 体系概览

本仓库采用 **pnpm workspace monorepo** 作为 TypeScript 工程的主构建编排层，配合若干 shell 脚本完成 SDL-PAL C 源码的差异化编译与资源提取/迁移流水线。整体分为三层：

1. **TypeScript 包构建** — pnpm-workspace 聚合 `packages/*`，根 `package.json` 提供 `check / typecheck / test / format / lint / extract / bake` 等跨包统一入口；各子包通过各自的 `package.json` 声明 `build / test / typecheck` 脚本，由 `pnpm -r run <script>` 驱动。
2. **SDL-PAL 原生构建** — 通过 `scripts/build-sdlpal.sh`、`scripts/build-sdlpal-classic.sh` 调用 sdlpal 上游的 `unix/Makefile`（或 emscripten/Makefile），产出用于视觉/数值差分测试的基线二进制，并自动应用 `sdlpal-extern-c.patch` 修复 macOS 链接问题。
3. **资源提取与内容烘焙** — `@type-pal/pal-extract` CLI 解析原始 MKF/RPG/AVI 等资源，生成 `data/extracted/` 下的 JSON+二进制产物；`@type-pal/migrate` 执行 `bake` 任务将第一阶段产物转换为第二阶段 content schema 实例与真彩 RGBA 资产。

## 关键文件与职责

| 文件 | 作用 |
|---|---|
| `pnpm-workspace.yaml` | 定义 workspace 包范围 `packages/*` |
| `package.json` | 根脚本入口、全局 devDependencies（biome、tsx、typescript、vitest）、`pnpm.onlyBuiltDependencies` 限定 canvas/esbuild |
| `tsconfig.base.json` | 全仓库共享 TS 编译器选项（ES2022、NodeNext、strict、verbatimModuleSyntax 等） |
| `biome.json` | 格式化与 Lint 规则，对 `packages/reforge/**`、`packages/content/**` 放宽 `noNonNullAssertion`，测试文件额外放开 `noExplicitAny` |
| `scripts/build-sdlpal.sh` | 构建默认 sdlpal（非 classic），输出到 `build/sdlpal/unix/sdlpal` |
| `scripts/build-sdlpal-classic.sh` | 以 `-DPAL_CLASSIC=1` 构建经典回合制版本，供数值类基准对照 |
| `scripts/sdlpal-extern-c.patch` | 为 sdlpal `sdl_compat.h` 补 `extern "C"` 守卫，解决 macOS 下 native_midi.cpp 链接失败 |
| `scripts/extract-tilemap-baseline.sh` / `extract-battle-baseline.sh` | 从 sdlpal 基线二进制导出 tilemap/battle 截图，供像素级差分测试 |
| `scripts/deploy.sh` | 一键部署到阿里云的 shell 流程 |
| `scripts/nginx-type-pal.conf` | 静态站点 nginx 配置 |
| `reference/sdlpal/` | 浅克隆的 sdlpal 上游源码，含其自身 Makefile/CMake/GitHub Actions，仅作为参考与差分基线来源 |

## 架构与约定

- **分层清晰**：TypeScript 引擎（reforge/game/editor）与数据工具（pal-extract/migrate）解耦，前者消费后者产出的 `data/extracted` 与 content schema。
- **双轨 sdlpal 构建**：默认 build 对应 sdlpal 团队“更刺激更难”的修订版战斗；classic build 对应 1995/1998 原版纯回合制。文档决策 D30 强制所有数值类基准走 classic build，视觉类基准两者等价但统一用 classic。
- **幂等可重建**：`rm -rf build/sdlpal && bash scripts/build-sdlpal.sh` 可全量重建；patch 在每次构建前自动应用。
- **只构建必要原生依赖**：`pnpm.onlyBuiltDependencies: [canvas, esbuild]` 避免无关 node-gyp 包触发编译。
- **无 CI/Dockerfile**：仓库未包含 GitHub Actions workflow、Dockerfile 或顶层 Makefile，CI 与容器化尚未落地。

## 开发者应遵循的规则

1. 新增 TypeScript 包时，在 `packages/<name>/package.json` 中声明 `build / test / typecheck` 脚本，确保能被 `pnpm -r run` 驱动。
2. 使用 `pnpm check / typecheck / test / format / lint` 运行全仓库质量门，不要绕过根脚本直接调子包命令。
3. 修改 sdlpal 行为需同步更新 `scripts/build-sdlpal-classic.sh` 并在 `docs/phase1/04-decisions.md` 记录影响面。
4. 资源变更走 `pnpm extract` → `pnpm bake` 两阶段流水线，禁止手动编辑 `data/extracted` 之外的中间产物。
5. 代码风格统一遵循 biome 配置，reforge/content 包允许 `!` 断言，测试文件允许 `any`。
