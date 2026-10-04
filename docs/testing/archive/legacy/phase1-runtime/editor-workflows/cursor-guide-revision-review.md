# DOC-GUIDE-REVISION-1 — Codex 独立接收复核

## 正式集成与收口（2026-09-25）

用户确认不需逐次请求接入：Codex 已将获验候选的五份指南以 `51da64a8` / `808e6150` 接入 main，五文件内容与 `a2220ca9` 逐字一致；落地 `node scripts/docs/check.mjs` PASS、`git diff --check` PASS。任务按当前委派模式归档 done。H7/`scene-entry-authoring.md` 未改，仍由独立后续核定；下方“候选未合 main”是集成前历史状态。

## 窄返工接收（2026-09-25）

候选 `a2220ca955dfd0da59ad55a89a9cc65f5f8d760b`：**accept，准予后续集成；本次不合 main、不标 done**。相对原候选 `94fbb844` 仅改 `docs/ops/guides/dev-servers.md:40-48`：`E2E=1` 现在明确为不挂 `basicSsl()` 的 HTTP 开发入口，不再宣称真 Service Worker 或 Playwright 入口；旧 6001/e2e 删除结论与 HTTP 命令保持。`packages/game/vite.config.ts:9,85`、`packages/game/src/main.ts:22,71-75` 与 `packages/game/src/shell/precache-client.ts:50-51` 分别证实插件切换、dev 跳过 SW、预缓存仅生产注册。

`git diff 94fbb844..a2220ca9 --name-status` 仅上述一文件；实施基点 `145791f1..a2220ca9` 恰卡面五份指南，H2–H6/N1/T1 及其余四份未在返工轮修改，H7/`scene-entry-authoring.md` 零改。候选工作树干净且与远端 tip 相同；`node scripts/docs/check.mjs` PASS（556 Markdown / 3023 links / 184 tasks），两段 `git diff --check` 均通过。下方唯一 counter 已由本轮闭合，保留为首轮历史记录；DOC-CURSOR-3 仍后排。

2026-09-25。Cursor 候选 `94fbb844674c1305f00aa7df23b3dd0764f63bbd`，实施基点 `145791f1`；本席复核当前源码与原任务卡 H1–H6/N1/T1，不以 Cursor 回执替代一手证据。结论：**counter，仅余 H1 的 Service Worker 语义；五份候选暂不合 main，卡转 rework，不标 done。**

## 已核通过的范围

`git diff 145791f1..94fbb844 --name-status` 恰 README 与卡面四份指南，共五文件；无 `packages/`、`scripts/`、测试、资产、基线或 H7 的 `scene-entry-authoring.md` 变化。候选 `git diff --check` exit0，`node scripts/docs/check.mjs` exit0（556 Markdown / 3023 links / 184 tasks）。不要用当前已前进的 `origin/main..候选` 求 diff：那会把 main 后续 Gemini/GLM 工作误列为 Cursor 删除/改动。

| 项 | 本席一手核验与当前判断 |
|---|---|
| H1 已闭子项 | `packages/game/package.json:6-11` 无 e2e script；候选 `dev-servers.md:32-48` 已删 6001/Playwright 命令且保留 `E2E=1` 的 HTTP 启动命令。错误的 SW 说明见下方唯一 counter。 |
| H2 | `packages/reforge/src/main.ts:267-268` 拒绝旧 `?skill=`；`:6105-6114` 仍有 debug 面板 `grantSkill`，它只改当前 world，非独立模拟器。两份指南删旧 URL，却保留面板命令并区分存档隔离，方向正确。 |
| H3 | `.gitignore:65-66` 只忽略 `projects/pal/assets/migrated/` 与 `runtime/`；`git ls-files projects/pal/assets/**` 仅有 `index.json`。`pal-assets.ts:396/811/933/999-1027` 物化路径都进 catalog，Reforge 生产资产读取没有 `/extracted` fallback；dev-servers 分述正确。 |
| H4 | 根 `package.json:20` 的 bake 转发到迁移包；`bake-assets.mts:13-16,28-47,177-179` 的写入仅到 Reforge engine-chrome，不写 PAL 工程。根 README 将其移到维护者单独说明，并保留 extract/migrate 短写。 |
| H5 | `packages/editor/src/ui/editor-navigation.ts:75-365` 的 `EDITOR_MODULES` 九项顺序、中文标签及各子页与候选架构表逐项一致。候选只订正模块表/左栏枚举与旧“1–4页”上限，不改对象身份、布局草图核心合同。 |
| H6/T1 | `packages/reforge/src/main.ts:4489` 定义 `runDetachedScriptChain`，`:6081` 注入 `runDetached`；debug-tools 已用现行符号。`?skill` 语义括号删除，常规 debug `skill` 命令仍列出。 |
| N1 | `migrate-content.mts:44-53` 仅接受 `--write`，多余 `--` 会在 recover 前被拒；dev-servers 两处已改为 `pnpm --filter @type-pal/migrate run migrate:content --write`。本席未运行真实迁移写盘。 |

## 唯一 counter：H1 文案把 HTTP 与预缓存 SW 误合并

候选 `docs/ops/guides/dev-servers.md:47-48` 新写“`E2E=1` 只切换上述 **HTTP Service Worker 路径**”，同时保留旧文 `:41`“要测**真 Service Worker**时用 `E2E=1`”。它们与当前产品直接矛盾：

- `packages/game/vite.config.ts:9,82-86`：`E2E=1` 的作用是**不挂 `basicSsl()`**，使 Vite dev 走 HTTP；`server` 端口仍由 `dev` 脚本指定为 6005。
- `packages/game/src/main.ts:22-23,71-75`：dev/e2e（`PROD=false`）跳过 Service Worker/可玩门，采用 fetch 计数进度。
- `packages/game/src/shell/precache-client.ts:50-51`：`!isProd` 直接返回，不注册预缓存 SW。

因此能保留的是“`E2E=1` 提供 HTTP dev 路径”，**不能**声称它验证了真 SW。卡面 H1 验收要求保留 HTTP 用途，并没有授权保留错误的 SW 解释。返工只需在 `dev-servers.md:40-48` 把两句统一改成准确的 HTTP/basicSsl 说明；如果指南要教真 SW，应另有生产预览验证入口，本卡不发明。其余四份文档与 H1 已闭子项不重开。不改 Vite、游戏 SW 或迁移器迁就文案。

通过后由 Codex 再核一眼该段、文档门和五文件白名单，决定是否集成；当前候选不能因 docs 检查 PASS 而被判业务说明正确。无 Kimi/GLM 固定签字门，Cursor 作为实施者自验不充独立复核。
